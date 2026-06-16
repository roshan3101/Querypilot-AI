import json
from typing import Optional, AsyncGenerator
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

# Approximate cost per 1K tokens (input, output) in USD
_COST_TABLE: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.00015, 0.0006),
    "gpt-4o": (0.0025, 0.010),
    "gpt-4-turbo": (0.01, 0.03),
    "gemini-2.5-flash": (0.0000075, 0.00003),
    "gemini-1.5-pro": (0.00125, 0.005),
}


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = _COST_TABLE.get(model, (0.001, 0.002))
    return round(rates[0] * prompt_tokens / 1000 + rates[1] * completion_tokens / 1000, 6)


class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL

    def _build_schema_context(self, schema: list[dict]) -> str:
        lines = []
        for table in schema:
            cols = ", ".join(
                f"{c['name']} ({c['type']})" + (" PK" if c.get("primary_key") else "")
                for c in table["columns"]
            )
            lines.append(f"Table: {table['table_name']} | Columns: {cols}")
            if table.get("foreign_keys"):
                for fk in table["foreign_keys"]:
                    lines.append(f"  FK: {table['table_name']}.{fk['column']} -> {fk['ref_table']}.{fk['ref_column']}")
        return "\n".join(lines)

    def _make_sql_prompt(
        self,
        natural_language: str,
        schema_context: str,
        previous_question: Optional[str] = None,
        previous_sql: Optional[str] = None,
    ) -> str:
        followup_section = ""
        if previous_question and previous_sql:
            followup_section = f"""
PREVIOUS QUESTION: {previous_question}
PREVIOUS SQL:
{previous_sql}

The user is asking a follow-up. Build upon or refine the previous query where appropriate.
"""
        return f"""You are an expert PostgreSQL query generator. Given the database schema and a natural language question, generate a safe SELECT query.

DATABASE SCHEMA:
{schema_context}
{followup_section}
RULES:
- Only generate SELECT or WITH (CTE) queries
- Never use DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, TRUNCATE
- Use proper JOINs based on foreign keys
- Use aliases for readability
- Add LIMIT 1000 if no limit is specified
- For date/time grouping, use DATE_TRUNC
- Return valid PostgreSQL syntax

USER QUESTION: {natural_language}

Respond with a JSON object:
{{
  "sql": "<the SQL query>",
  "explanation": "<plain English explanation of what the query does>",
  "tables_used": ["table1", "table2"],
  "optimization_notes": "<optional performance tips>"
}}"""

    def _make_optimize_prompt(self, sql: str, schema_context: str) -> str:
        return f"""You are a PostgreSQL performance expert. Analyze and optimize this SQL query.

DATABASE SCHEMA:
{schema_context}

ORIGINAL QUERY:
{sql}

Respond with JSON:
{{
  "optimized_sql": "<optimized query or same if already optimal>",
  "notes": "<explanation of optimizations made>"
}}"""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def generate_sql(
        self,
        natural_language: str,
        schema: list[dict],
        previous_question: Optional[str] = None,
        previous_sql: Optional[str] = None,
    ) -> dict:
        schema_context = self._build_schema_context(schema)
        prompt = self._make_sql_prompt(natural_language, schema_context, previous_question, previous_sql)
        response_text, usage = await self._call_llm(prompt)
        result = self._parse_json_response(response_text)
        result["token_usage"] = usage
        return result

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def optimize_sql(self, sql: str, schema: list[dict]) -> dict:
        schema_context = self._build_schema_context(schema)
        prompt = self._make_optimize_prompt(sql, schema_context)
        response_text, _ = await self._call_llm(prompt)
        return self._parse_json_response(response_text)

    async def generate_sql_stream(
        self,
        natural_language: str,
        schema: list[dict],
        previous_question: Optional[str] = None,
        previous_sql: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Yields SSE-formatted strings. Final event contains full parsed result."""
        schema_context = self._build_schema_context(schema)
        prompt = self._make_sql_prompt(natural_language, schema_context, previous_question, previous_sql)

        yield f"data: {json.dumps({'type': 'status', 'message': 'Generating SQL...'})}\n\n"

        full_text = ""
        usage: dict = {}

        if self.provider == "openai":
            async for chunk, u in self._stream_openai(prompt):
                full_text += chunk
                usage = u
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        else:
            # Non-streaming providers: call normally, then emit full text at once
            full_text, usage = await self._call_llm(prompt)
            yield f"data: {json.dumps({'type': 'token', 'content': full_text})}\n\n"

        try:
            result = self._parse_json_response(full_text)
            result["token_usage"] = usage
            yield f"data: {json.dumps({'type': 'done', 'data': result})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    async def _call_llm(self, prompt: str) -> tuple[str, dict]:
        """Returns (response_text, token_usage_dict)."""
        if self.provider == "openai":
            return await self._call_openai(prompt)
        elif self.provider == "gemini":
            return await self._call_gemini(prompt)
        elif self.provider == "openrouter":
            return await self._call_openrouter(prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    async def _call_openai(self, prompt: str) -> tuple[str, dict]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content
        usage = {}
        if response.usage:
            pt = response.usage.prompt_tokens
            ct = response.usage.completion_tokens
            usage = {
                "prompt_tokens": pt,
                "completion_tokens": ct,
                "total_tokens": pt + ct,
                "estimated_cost_usd": _estimate_cost(self.model, pt, ct),
            }
        return text, usage

    async def _stream_openai(self, prompt: str):
        """Async generator yielding (chunk_text, usage_dict) tuples. usage is only populated on last chunk."""
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        stream = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
            stream=True,
            stream_options={"include_usage": True},
        )
        usage: dict = {}
        async for chunk in stream:
            if chunk.usage:
                pt = chunk.usage.prompt_tokens
                ct = chunk.usage.completion_tokens
                usage = {
                    "prompt_tokens": pt,
                    "completion_tokens": ct,
                    "total_tokens": pt + ct,
                    "estimated_cost_usd": _estimate_cost(self.model, pt, ct),
                }
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta, usage

    async def _call_gemini(self, prompt: str) -> tuple[str, dict]:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            self.model or "gemini-2.5-flash",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        response = await model.generate_content_async(prompt)
        usage: dict = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            pt = response.usage_metadata.prompt_token_count or 0
            ct = response.usage_metadata.candidates_token_count or 0
            usage = {
                "prompt_tokens": pt,
                "completion_tokens": ct,
                "total_tokens": pt + ct,
                "estimated_cost_usd": _estimate_cost(self.model or "gemini-2.5-flash", pt, ct),
            }
        return response.text, usage

    async def _call_openrouter(self, prompt: str) -> tuple[str, dict]:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model or "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                },
                timeout=60.0,
            )
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            usage: dict = {}
            if "usage" in data:
                pt = data["usage"].get("prompt_tokens", 0)
                ct = data["usage"].get("completion_tokens", 0)
                usage = {
                    "prompt_tokens": pt,
                    "completion_tokens": ct,
                    "total_tokens": pt + ct,
                    "estimated_cost_usd": _estimate_cost(self.model or "openai/gpt-4o-mini", pt, ct),
                }
            return text, usage

    def _parse_json_response(self, text: str) -> dict:
        try:
            text = text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1])
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}\nResponse: {text}")
            raise ValueError(f"LLM returned invalid JSON: {str(e)}")


llm_service = LLMService()
