from __future__ import annotations

import logging
import os
import time
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown logic."""
    logger.info("Starting %s …", settings.PROJECT_NAME)

    # Ensure upload directory exists at startup
    try:
        os.makedirs(settings.upload_dir_abs, exist_ok=True)
        logger.info("Upload directory: %s", settings.upload_dir_abs)
    except Exception as e:
        logger.warning("Could not create upload directory: %s", e)

    # Create default users if DB has none (dev/first-run only)
    if settings.SECRET_KEY == "changethis_secret_key_for_dev_only":
        try:
            from app.initial_data import ensure_initial_users_if_empty

            if ensure_initial_users_if_empty():
                logger.info(
                    "Default sign-in: admin@sbdt.com / admin123 (and operator, manager, owner)."
                )
        except Exception as e:
            logger.warning("Could not ensure initial users: %s", e)

    # Celery info
    if not settings.celery_enabled:
        logger.info(
            "Scan jobs will run in-process. Set REDIS_URL in .env for async Celery workers."
        )
    else:
        try:
            logger.info("Celery broker: %s", settings.effective_redis_url)
        except Exception as e:
            logger.warning("Could not access Celery broker info: %s", e)

    yield

    logger.info("%s shutting down.", settings.PROJECT_NAME)


# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


# ── Middleware: request ID + timing ─────────────────────────────────────────
@app.middleware("http")
async def request_id_and_timing(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error("Middleware error processing request: %s", e)
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s → %s  (%.1f ms)  request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    return response


# ── CORS ────────────────────────────────────────────────────────────────────
_cors_origins: list[str] = (
    [str(o) for o in settings.BACKEND_CORS_ORIGINS]
    if settings.BACKEND_CORS_ORIGINS
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Request-ID"],
)


# ── Exception handler ───────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for unhandled exceptions.
    - Logs full traceback server-side.
    - Returns traceback in response ONLY in dev (when SECRET_KEY is default).
    - Returns a safe generic message in production.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    error_trace = traceback.format_exc()

    logger.error(
        "Unhandled exception on %s %s (request_id=%s): %s\n%s",
        request.method,
        request.url.path,
        request_id,
        exc,
        error_trace,
    )

    is_dev = settings.SECRET_KEY == "changethis_secret_key_for_dev_only"

    content: dict = {
        "detail": str(exc) if is_dev else "An internal server error occurred.",
        "type": type(exc).__name__,
        "path": request.url.path,
        "request_id": request_id,
    }

    if is_dev:
        content["traceback"] = error_trace

    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=content)


# ── Docs (explicit routes) ───────────────────────────────────────────────────
def _swagger_html() -> HTMLResponse:
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.PROJECT_NAME} - Swagger UI",
    )


def _redoc_html() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{settings.PROJECT_NAME} - ReDoc",
    )


@app.get("/docs", include_in_schema=False)
def swagger_ui_html() -> HTMLResponse:
    return _swagger_html()


@app.get("/api-docs", include_in_schema=False)
def swagger_ui_alt() -> HTMLResponse:
    return _swagger_html()


@app.get("/redoc", include_in_schema=False)
def redoc_html() -> HTMLResponse:
    return _redoc_html()


# ── Health + Root ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check")
async def health_check() -> dict:
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "celery_enabled": settings.celery_enabled,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Health"], summary="Root")
async def read_root() -> dict:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "http://localhost:8000/api-docs",
        "health": "http://localhost:8000/health",
    }


# ── Routers ─────────────────────────────────────────────────────────────────
# Import after app creation to avoid circular imports
try:
    from app.api.api_v1.api import api_router  # noqa: E402
    from app.api.api_v1.endpoints.login import login_access_token  # noqa: E402
    app.include_router(api_router, prefix=settings.API_V1_STR)
    # Explicit route so POST /api/v1/login/access-token always works (proxy/path issues)
    app.add_api_route(
        f"{settings.API_V1_STR}/login/access-token",
        login_access_token,
        methods=["POST"],
        include_in_schema=True,
        tags=["login"],
    )
    # In case proxy forwards without /api prefix (path becomes /v1/login/access-token)
    app.add_api_route(
        "/v1/login/access-token",
        login_access_token,
        methods=["POST"],
        include_in_schema=False,
        tags=["login"],
    )
    logger.info("API routes registered successfully")
except ImportError as e:
    logger.error("Failed to import API router: %s", e)
    raise
except Exception as e:
    logger.error("Failed to register API routes: %s", e)
    raise