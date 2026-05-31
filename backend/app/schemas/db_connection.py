from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DBConnectionCreate(BaseModel):
    name: str
    host: str
    port: int = 5432
    database: str
    username: str
    password: str


class DBConnectionOut(BaseModel):
    id: int
    name: str
    host: str
    port: int
    database: str
    username: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SchemaTable(BaseModel):
    table_name: str
    columns: list[dict]
    foreign_keys: list[dict] = []
    row_count: Optional[int] = None


class SchemaResponse(BaseModel):
    connection_id: int
    tables: list[SchemaTable]
