from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class QueryRequest(BaseModel):
    connection_id: int
    natural_language: str
    auto_execute: bool = False


class SQLGenerateResponse(BaseModel):
    generated_sql: str
    explanation: str
    tables_used: list[str]
    optimized_sql: Optional[str] = None
    optimization_notes: Optional[str] = None


class QueryExecuteRequest(BaseModel):
    connection_id: int
    sql: str
    history_id: Optional[int] = None


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    execution_time_ms: float
    suggested_chart: Optional[str] = None


class QueryHistoryOut(BaseModel):
    id: int
    natural_language: str
    generated_sql: Optional[str]
    explanation: Optional[str]
    optimized_sql: Optional[str]
    execution_time_ms: Optional[float]
    row_count: Optional[int]
    is_successful: bool
    error_message: Optional[str]
    chart_type: Optional[str]
    tables_used: Optional[list]
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_queries: int
    successful_queries: int
    failed_queries: int
    avg_execution_time_ms: float
    most_queried_tables: list[dict]
    queries_by_day: list[dict]
    total_connections: int
