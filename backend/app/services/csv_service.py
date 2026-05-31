import re
import asyncio
import pandas as pd
from io import BytesIO
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from loguru import logger
from app.core.config import settings


def _sanitize_table_name(filename: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_]", "_", filename.replace(".csv", "").lower())
    return f"csv_{name[:40]}"


def _infer_pg_type(dtype) -> str:
    dtype_str = str(dtype)
    if "int" in dtype_str:
        return "BIGINT"
    if "float" in dtype_str:
        return "DOUBLE PRECISION"
    if "bool" in dtype_str:
        return "BOOLEAN"
    if "datetime" in dtype_str:
        return "TIMESTAMP"
    return "TEXT"


async def _upload_to_cloudinary(content: bytes, filename: str) -> dict:
    """Upload raw CSV bytes to Cloudinary as a raw file. Returns url and public_id."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return {"url": None, "public_id": None}

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

    # Run blocking cloudinary upload in a thread so we don't block the event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: cloudinary.uploader.upload(
            BytesIO(content),
            resource_type="raw",
            folder="querypilot/csv",
            public_id=f"querypilot/csv/{filename}",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
        ),
    )
    return {"url": result.get("secure_url"), "public_id": result.get("public_id")}


async def ingest_csv(content: bytes, filename: str, user_id: int) -> dict:
    df = pd.read_csv(BytesIO(content))
    df.columns = [re.sub(r"[^a-zA-Z0-9_]", "_", c.lower().strip()) for c in df.columns]

    table_name = _sanitize_table_name(filename)
    schema_info = [
        {"name": col, "type": _infer_pg_type(df[col].dtype)}
        for col in df.columns
    ]

    col_defs = ", ".join(f'"{c["name"]}" {c["type"]}' for c in schema_info)
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (id SERIAL PRIMARY KEY, {col_defs})'

    # Upload to Cloudinary and insert into DB concurrently
    cloudinary_task = asyncio.create_task(_upload_to_cloudinary(content, filename))

    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.begin() as conn:
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
            await conn.execute(text(create_sql))

            rows = df.where(pd.notna(df), None).values.tolist()
            if rows:
                placeholders = ", ".join([f":{c['name']}" for c in schema_info])
                col_names = ", ".join([f'"{c["name"]}"' for c in schema_info])
                insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
                data = [dict(zip([c["name"] for c in schema_info], row)) for row in rows]
                await conn.execute(text(insert_sql), data)
    finally:
        await engine.dispose()

    # Wait for Cloudinary upload (it ran in parallel with DB insert)
    try:
        cloudinary_result = await cloudinary_task
    except Exception as e:
        logger.warning(f"Cloudinary upload failed (non-fatal): {e}")
        cloudinary_result = {"url": None, "public_id": None}

    return {
        "table_name": table_name,
        "schema_info": schema_info,
        "row_count": len(df),
        "cloudinary_url": cloudinary_result["url"],
        "cloudinary_public_id": cloudinary_result["public_id"],
        "file_size_bytes": len(content),
    }
