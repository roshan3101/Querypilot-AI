from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from app.db.base import Base


class CSVTable(Base):
    __tablename__ = "csv_tables"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String, nullable=False)
    table_name = Column(String, nullable=False, unique=True)
    schema_info = Column(JSON, nullable=True)
    row_count = Column(Integer, nullable=True)
    cloudinary_url = Column(String, nullable=True)
    cloudinary_public_id = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
