from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, Date, text
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.db_connection import DBConnection
from app.models.query_history import QueryHistory
from app.schemas.query import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    total = await db.execute(
        select(func.count(QueryHistory.id)).where(QueryHistory.user_id == uid)
    )
    total_queries = total.scalar() or 0

    successful = await db.execute(
        select(func.count(QueryHistory.id)).where(
            QueryHistory.user_id == uid, QueryHistory.is_successful == True  # noqa: E712
        )
    )
    successful_queries = successful.scalar() or 0

    avg_time = await db.execute(
        select(func.avg(QueryHistory.execution_time_ms)).where(
            QueryHistory.user_id == uid, QueryHistory.execution_time_ms.isnot(None)
        )
    )
    avg_exec = round(avg_time.scalar() or 0, 2)

    conns = await db.execute(
        select(func.count(DBConnection.id)).where(DBConnection.user_id == uid)
    )
    total_connections = conns.scalar() or 0

    daily = await db.execute(
        select(
            cast(QueryHistory.created_at, Date).label("date"),
            func.count(QueryHistory.id).label("count"),
        )
        .where(QueryHistory.user_id == uid)
        .group_by(cast(QueryHistory.created_at, Date))
        .order_by(cast(QueryHistory.created_at, Date).desc())
        .limit(30)
    )
    queries_by_day = [{"date": str(row.date), "count": row.count} for row in daily]

    # json type has no equality operator in PostgreSQL — use jsonb_array_elements_text
    # to unnest the tables_used array and count individual table names.
    tables_sql = text("""
        SELECT t.table_name, COUNT(*) AS cnt
        FROM query_history qh,
             jsonb_array_elements_text(qh.tables_used::jsonb) AS t(table_name)
        WHERE qh.user_id = :uid
          AND qh.tables_used IS NOT NULL
          AND qh.tables_used != 'null'
          AND qh.tables_used != '[]'
        GROUP BY t.table_name
        ORDER BY cnt DESC
        LIMIT 10
    """)
    try:
        tables_result = await db.execute(tables_sql, {"uid": uid})
        most_queried = [{"table": row.table_name, "count": row.cnt} for row in tables_result]
    except Exception:
        most_queried = []

    return DashboardStats(
        total_queries=total_queries,
        successful_queries=successful_queries,
        failed_queries=total_queries - successful_queries,
        avg_execution_time_ms=avg_exec,
        most_queried_tables=most_queried,
        queries_by_day=queries_by_day,
        total_connections=total_connections,
    )
