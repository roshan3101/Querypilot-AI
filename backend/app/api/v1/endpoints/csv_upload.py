from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.csv_table import CSVTable
from app.services.csv_service import ingest_csv

router = APIRouter(prefix="/csv", tags=["CSV Upload"])


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    try:
        result = await ingest_csv(content, file.filename, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV processing failed: {str(e)}")

    csv_table = CSVTable(
        user_id=current_user.id,
        original_filename=file.filename,
        table_name=result["table_name"],
        schema_info=result["schema_info"],
        row_count=result["row_count"],
        cloudinary_url=result.get("cloudinary_url"),
        cloudinary_public_id=result.get("cloudinary_public_id"),
        file_size_bytes=result.get("file_size_bytes"),
    )
    db.add(csv_table)
    await db.commit()
    await db.refresh(csv_table)

    return {
        "message": "CSV uploaded and table created successfully",
        "table_name": result["table_name"],
        "row_count": result["row_count"],
        "schema": result["schema_info"],
        "cloudinary_url": result.get("cloudinary_url"),
    }


@router.get("/tables")
async def list_csv_tables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CSVTable)
        .where(CSVTable.user_id == current_user.id)
        .order_by(CSVTable.created_at.desc())
    )
    tables = result.scalars().all()
    return [
        {
            "id": t.id,
            "original_filename": t.original_filename,
            "table_name": t.table_name,
            "row_count": t.row_count,
            "file_size_bytes": t.file_size_bytes,
            "cloudinary_url": t.cloudinary_url,
            "schema_info": t.schema_info,
            "created_at": t.created_at,
        }
        for t in tables
    ]


@router.delete("/tables/{table_id}", status_code=204)
async def delete_csv_table(
    table_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CSVTable).where(CSVTable.id == table_id, CSVTable.user_id == current_user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")

    # Delete from Cloudinary if stored
    if t.cloudinary_public_id:
        try:
            import cloudinary.uploader
            from app.core.config import settings
            import cloudinary
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
            )
            cloudinary.uploader.destroy(t.cloudinary_public_id, resource_type="raw")
        except Exception:
            pass  # non-fatal

    await db.delete(t)
    await db.commit()
