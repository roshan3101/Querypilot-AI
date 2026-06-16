from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.db.base import Base


class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sql = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
