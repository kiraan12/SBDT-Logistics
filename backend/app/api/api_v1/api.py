from fastapi import APIRouter
from app.api.api_v1.endpoints import login, shipments, scan, analytics, notifications
from app.core.config import settings

api_router = APIRouter()


@api_router.get("/health", summary="API health")
def api_health() -> dict:
    """Health check under /api/v1 for frontend or load balancers."""
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "celery_enabled": settings.celery_enabled,
    }


# ✅ Clean: prefix added here
api_router.include_router(login.router, prefix="/login", tags=["login"])

api_router.include_router(shipments.router, prefix="/shipments", tags=["shipments"])
api_router.include_router(scan.router, prefix="/scan", tags=["scan"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])