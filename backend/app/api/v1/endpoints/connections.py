from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.db_connection import DBConnection
from app.schemas.db_connection import DBConnectionCreate, DBConnectionOut, SchemaResponse
from app.services.db_service import test_connection, fetch_schema
from app.utils.encryption import encrypt_password, decrypt_password

router = APIRouter(prefix="/connections", tags=["Database Connections"])


@router.post("", response_model=DBConnectionOut, status_code=201)
async def create_connection(
    payload: DBConnectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = await test_connection(payload.host, payload.port, payload.database, payload.username, payload.password)
    if not ok:
        raise HTTPException(status_code=400, detail="Could not connect to the database. Check credentials.")

    conn = DBConnection(
        user_id=current_user.id,
        name=payload.name,
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        encrypted_password=encrypt_password(payload.password),
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("", response_model=list[DBConnectionOut])
async def list_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.user_id == current_user.id)
    )
    return result.scalars().all()


@router.delete("/{connection_id}", status_code=204)
async def delete_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == connection_id, DBConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()


@router.get("/{connection_id}/schema", response_model=SchemaResponse)
async def get_schema(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == connection_id, DBConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    password = decrypt_password(conn.encrypted_password)
    tables = await fetch_schema(conn.host, conn.port, conn.database, conn.username, password)
    return SchemaResponse(connection_id=connection_id, tables=tables)


@router.post("/{connection_id}/test")
async def test_connection_endpoint(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DBConnection).where(DBConnection.id == connection_id, DBConnection.user_id == current_user.id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    password = decrypt_password(conn.encrypted_password)
    ok = await test_connection(conn.host, conn.port, conn.database, conn.username, password)
    return {"status": "ok" if ok else "failed", "connection_id": connection_id}
