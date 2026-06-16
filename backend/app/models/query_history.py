from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, func, JSON
from app.db.base import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(Integer, ForeignKey("db_connections.id", ondelete="SET NULL"), nullable=True)
    natural_language = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    optimized_sql = Column(Text, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    row_count = Column(Integer, nullable=True)
    is_successful = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    chart_type = Column(String, nullable=True)
    result_preview = Column(JSON, nullable=True)
    tables_used = Column(JSON, nullable=True)
    token_usage = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
