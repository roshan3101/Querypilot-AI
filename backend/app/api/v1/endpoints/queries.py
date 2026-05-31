from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.db_connection import DBConnection
from app.models.query_history import QueryHistory
from app.schemas.query import (
    QueryRequest, SQLGenerateResponse, QueryExecuteRequest,
    QueryResult, QueryHistoryOut
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


@router.post("/generate", response_model=SQLGenerateResponse)
async def generate_sql(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = await _get_connection(payload.connection_id, current_user.id, db)
    cache_key = f"{conn.id}:{payload.natural_language}"
    cached = await cache_service.get("sql_gen", cache_key)
    if cached:
        return SQLGenerateResponse(**cached)

    password = decrypt_password(conn.encrypted_password)
    schema = await fetch_schema(conn.host, conn.port, conn.database, conn.username, password)

    try:
        result = await llm_service.generate_sql(payload.natural_language, schema)
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")

    sql = result.get("sql", "")
    explanation = result.get("explanation", "")
    tables_used = result.get("tables_used", [])

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
    )
    await cache_service.set("sql_gen", cache_key, response.model_dump(), ttl=1800)
    return response


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
