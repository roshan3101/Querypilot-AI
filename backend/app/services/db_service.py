import time
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from loguru import logger
from app.utils.encryption import decrypt_password
from app.utils.sql_safety import validate_sql_safety


def _build_connection_url(host: str, port: int, database: str, username: str, password: str) -> str:
    return f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{database}"


async def test_connection(host: str, port: int, database: str, username: str, password: str) -> bool:
    url = _build_connection_url(host, port, database, username, password)
    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False
    finally:
        await engine.dispose()


async def fetch_schema(host: str, port: int, database: str, username: str, password: str) -> list[dict]:
    url = _build_connection_url(host, port, database, username, password)
    engine = create_async_engine(url)
    tables = []
    try:
        async with engine.connect() as conn:
            table_rows = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            ))
            table_names = [row[0] for row in table_rows]

            for tname in table_names:
                col_rows = await conn.execute(text(
                    "SELECT column_name, data_type, is_nullable, column_default, "
                    "(SELECT COUNT(*) FROM information_schema.key_column_usage kcu "
                    " JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name "
                    " WHERE tc.constraint_type = 'PRIMARY KEY' AND kcu.table_name = :tname AND kcu.column_name = c.column_name) as is_pk "
                    "FROM information_schema.columns c WHERE table_name = :tname AND table_schema = 'public' "
                    "ORDER BY ordinal_position"
                ), {"tname": tname})

                columns = [
                    {
                        "name": row[0],
                        "type": row[1],
                        "nullable": row[2] == "YES",
                        "default": row[3],
                        "primary_key": int(row[4]) > 0,
                    }
                    for row in col_rows
                ]

                fk_rows = await conn.execute(text(
                    "SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column "
                    "FROM information_schema.table_constraints tc "
                    "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
                    "JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name "
                    "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = :tname"
                ), {"tname": tname})

                foreign_keys = [
                    {"column": row[0], "ref_table": row[1], "ref_column": row[2]}
                    for row in fk_rows
                ]

                count_row = await conn.execute(text(f'SELECT COUNT(*) FROM "{tname}"'))
                row_count = count_row.scalar()

                tables.append({
                    "table_name": tname,
                    "columns": columns,
                    "foreign_keys": foreign_keys,
                    "row_count": row_count,
                })
    finally:
        await engine.dispose()
    return tables


async def execute_query(
    host: str, port: int, database: str, username: str, password: str, sql: str
) -> dict:
    is_safe, reason = validate_sql_safety(sql)
    if not is_safe:
        raise ValueError(f"Safety check failed: {reason}")

    url = _build_connection_url(host, port, database, username, password)
    engine = create_async_engine(url)
    start = time.monotonic()
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text(sql))
            columns = list(result.keys())
            rows = [list(row) for row in result.fetchall()]
            elapsed_ms = (time.monotonic() - start) * 1000
            return {
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "execution_time_ms": round(elapsed_ms, 2),
            }
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        raise
    finally:
        await engine.dispose()
