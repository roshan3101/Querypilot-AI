from app.db.base import engine, Base
from app.models import user, db_connection, query_history, csv_table  # noqa: F401


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
