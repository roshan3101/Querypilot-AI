import json
from typing import Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings


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

    def _make_sql_prompt(self, natural_language: str, schema_context: str) -> str:
        return f"""You are an expert PostgreSQL query generator. Given the database schema and a natural language question, generate a safe SELECT query.

DATABASE SCHEMA:
{schema_context}

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
    async def generate_sql(self, natural_language: str, schema: list[dict]) -> dict:
        schema_context = self._build_schema_context(schema)
        prompt = self._make_sql_prompt(natural_language, schema_context)
        response_text = await self._call_llm(prompt)
        return self._parse_json_response(response_text)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def optimize_sql(self, sql: str, schema: list[dict]) -> dict:
        schema_context = self._build_schema_context(schema)
        prompt = self._make_optimize_prompt(sql, schema_context)
        response_text = await self._call_llm(prompt)
        return self._parse_json_response(response_text)

    async def _call_llm(self, prompt: str) -> str:
        if self.provider == "openai":
            return await self._call_openai(prompt)
        elif self.provider == "gemini":
            return await self._call_gemini(prompt)
        elif self.provider == "openrouter":
            return await self._call_openrouter(prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    async def _call_openai(self, prompt: str) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content

    async def _call_gemini(self, prompt: str) -> str:
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
        return response.text

    async def _call_openrouter(self, prompt: str) -> str:
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
            return data["choices"][0]["message"]["content"]

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
