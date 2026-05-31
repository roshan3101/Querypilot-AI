from fastapi import APIRouter
from app.api.v1.endpoints import auth, connections, queries, dashboard, csv_upload

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(connections.router)
api_router.include_router(queries.router)
api_router.include_router(dashboard.router)
api_router.include_router(csv_upload.router)
