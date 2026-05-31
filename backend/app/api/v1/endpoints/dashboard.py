from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, Date
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
    total = await db.execute(
        select(func.count(QueryHistory.id)).where(QueryHistory.user_id == current_user.id)
    )
    total_queries = total.scalar() or 0

    successful = await db.execute(
        select(func.count(QueryHistory.id)).where(
            QueryHistory.user_id == current_user.id, QueryHistory.is_successful == True
        )
    )
    successful_queries = successful.scalar() or 0

    avg_time = await db.execute(
        select(func.avg(QueryHistory.execution_time_ms)).where(
            QueryHistory.user_id == current_user.id, QueryHistory.execution_time_ms.isnot(None)
        )
    )
    avg_exec = round(avg_time.scalar() or 0, 2)

    conns = await db.execute(
        select(func.count(DBConnection.id)).where(DBConnection.user_id == current_user.id)
    )
    total_connections = conns.scalar() or 0

    daily = await db.execute(
        select(
            cast(QueryHistory.created_at, Date).label("date"),
            func.count(QueryHistory.id).label("count"),
        )
        .where(QueryHistory.user_id == current_user.id)
        .group_by(cast(QueryHistory.created_at, Date))
        .order_by(cast(QueryHistory.created_at, Date).desc())
        .limit(30)
    )
    queries_by_day = [{"date": str(row.date), "count": row.count} for row in daily]

    tables_result = await db.execute(
        select(QueryHistory.tables_used, func.count(QueryHistory.id).label("count"))
        .where(QueryHistory.user_id == current_user.id, QueryHistory.tables_used.isnot(None))
        .group_by(QueryHistory.tables_used)
        .order_by(desc("count"))
        .limit(20)
    )
    table_counts: dict[str, int] = {}
    for row in tables_result:
        if isinstance(row.tables_used, list):
            for t in row.tables_used:
                table_counts[t] = table_counts.get(t, 0) + row.count
    most_queried = sorted(
        [{"table": k, "count": v} for k, v in table_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return DashboardStats(
        total_queries=total_queries,
        successful_queries=successful_queries,
        failed_queries=total_queries - successful_queries,
        avg_execution_time_ms=avg_exec,
        most_queried_tables=most_queried,
        queries_by_day=queries_by_day,
        total_connections=total_connections,
    )
