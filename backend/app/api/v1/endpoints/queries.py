import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.db_connection import DBConnection
from app.models.query_history import QueryHistory
from app.models.saved_query import SavedQuery
from app.schemas.query import (
    QueryRequest, SQLGenerateResponse, QueryExecuteRequest,
    QueryResult, QueryHistoryOut, SavedQueryCreate, SavedQueryOut,
)
from app.services.llm_service import llm_service
from app.services.db_service import fetch_schema, execute_query
from app.services.cache_service import cache_service
from app.utils.encryption import decrypt_password
from app.utils.chart_suggester import suggest_chart_type
from loguru import logger

router = APIRouter(prefix="/queries", tags=["Queries"])


async def _get_connection(connection_id: int, user_id: int, db: AsyncSession) -> DBConnection:
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == connection_id, DBConnection.user_id == user_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


async def _resolve_schema(conn: DBConnection, password: str) -> list:
    """Return cached schema or fetch and cache it."""
    cached = cache_service.get_schema(conn.id)
    if cached is not None:
        return cached
    schema = await fetch_schema(conn.host, conn.port, conn.database, conn.username, password)
    cache_service.set_schema(conn.id, schema)
    return schema


@router.post("/generate", response_model=SQLGenerateResponse)
async def generate_sql(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = await _get_connection(payload.connection_id, current_user.id, db)
    cache_key = f"{conn.id}:{payload.natural_language}"
    password = decrypt_password(conn.encrypted_password)

    # Parallel: check SQL result cache AND start schema lookup simultaneously
    sql_cached_task = asyncio.create_task(cache_service.get("sql_gen", cache_key))
    schema_task = asyncio.create_task(_resolve_schema(conn, password))

    sql_cached = await sql_cached_task
    if sql_cached:
        schema_task.cancel()
        return SQLGenerateResponse(**sql_cached)

    schema = await schema_task

    try:
        result = await llm_service.generate_sql(
            payload.natural_language,
            schema,
            previous_question=payload.previous_question,
            previous_sql=payload.previous_sql,
        )
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")

    sql = result.get("sql", "")
    explanation = result.get("explanation", "")
    tables_used = result.get("tables_used", [])
    token_usage = result.get("token_usage")

    opt_result = None
    try:
        opt_result = await llm_service.optimize_sql(sql, schema)
    except Exception:
        pass

    history = QueryHistory(
        user_id=current_user.id,
        connection_id=conn.id,
        natural_language=payload.natural_language,
        generated_sql=sql,
        explanation=explanation,
        optimized_sql=opt_result.get("optimized_sql") if opt_result else None,
        tables_used=tables_used,
        token_usage=token_usage,
        is_successful=True,
    )
    db.add(history)
    await db.commit()

    response = SQLGenerateResponse(
        generated_sql=sql,
        explanation=explanation,
        tables_used=tables_used,
        optimized_sql=opt_result.get("optimized_sql") if opt_result else None,
        optimization_notes=opt_result.get("notes") if opt_result else None,
        token_usage=token_usage,
    )
    await cache_service.set("sql_gen", cache_key, response.model_dump(), ttl=1800)
    return response


@router.post("/generate/stream")
async def generate_sql_stream(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = await _get_connection(payload.connection_id, current_user.id, db)
    password = decrypt_password(conn.encrypted_password)
    schema = await _resolve_schema(conn, password)

    async def event_stream():
        try:
            async for event in llm_service.generate_sql_stream(
                payload.natural_language,
                schema,
                previous_question=payload.previous_question,
                previous_sql=payload.previous_sql,
            ):
                yield event
        except Exception as e:
            import json
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/execute", response_model=QueryResult)
async def execute_sql(
    payload: QueryExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = await _get_connection(payload.connection_id, current_user.id, db)
    password = decrypt_password(conn.encrypted_password)

    try:
        result = await execute_query(conn.host, conn.port, conn.database, conn.username, password, payload.sql)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        if payload.history_id:
            hist = await db.get(QueryHistory, payload.history_id)
            if hist and hist.user_id == current_user.id:
                hist.is_successful = False
                hist.error_message = str(e)
                await db.commit()
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    chart_type = suggest_chart_type(result["columns"], result["rows"], payload.sql)

    if payload.history_id:
        hist = await db.get(QueryHistory, payload.history_id)
        if hist and hist.user_id == current_user.id:
            hist.execution_time_ms = result["execution_time_ms"]
            hist.row_count = result["row_count"]
            hist.chart_type = chart_type
            hist.result_preview = {"columns": result["columns"], "rows": result["rows"][:5]}
            await db.commit()

    return QueryResult(
        columns=result["columns"],
        rows=result["rows"],
        row_count=result["row_count"],
        execution_time_ms=result["execution_time_ms"],
        suggested_chart=chart_type,
    )


@router.get("/history", response_model=list[QueryHistoryOut])
async def get_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QueryHistory)
        .where(QueryHistory.user_id == current_user.id)
        .order_by(desc(QueryHistory.created_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.delete("/history/{history_id}", status_code=204)
async def delete_history(
    history_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hist = await db.get(QueryHistory, history_id)
    if not hist or hist.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="History item not found")
    await db.delete(hist)
    await db.commit()


# --- Saved Queries ---

@router.post("/saved", response_model=SavedQueryOut, status_code=201)
async def save_query(
    payload: SavedQueryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sq = SavedQuery(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        sql=payload.sql,
    )
    db.add(sq)
    await db.commit()
    await db.refresh(sq)
    return sq


@router.get("/saved", response_model=list[SavedQueryOut])
async def list_saved_queries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedQuery)
        .where(SavedQuery.user_id == current_user.id)
        .order_by(desc(SavedQuery.created_at))
    )
    return result.scalars().all()


@router.delete("/saved/{saved_id}", status_code=204)
async def delete_saved_query(
    saved_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sq = await db.get(SavedQuery, saved_id)
    if not sq or sq.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saved query not found")
    await db.delete(sq)
    await db.commit()
