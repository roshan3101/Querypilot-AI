from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.router import api_router

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting QueryPilot AI backend (migrations managed by Alembic)")
    yield
    logger.info("Shutting down QueryPilot AI backend")


app = FastAPI(
    title="QueryPilot AI",
    description="AI-powered SQL assistant — natural language to SQL with schema understanding",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "QueryPilot AI", "version": "1.0.0"}
