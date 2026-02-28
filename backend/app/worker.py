from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ── Try to import Celery (optional dependency) ────────────────────────────────
try:
    from celery import Celery
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    Celery = None
    logger.debug(
        "Celery not installed; scan jobs will use in-process fallback."
    )

from app.core.config import settings


def _redis_reachable(url: str, timeout: float = 2.0) -> bool:
    """Return True if Redis at url is reachable (e.g. ping)."""
    if not url or url.startswith("memory://"):
        return False
    try:
        import redis  # optional; Celery often installs it
        r = redis.from_url(url, socket_connect_timeout=timeout)
        r.ping()
        r.close()
        return True
    except ImportError:
        # redis package not installed — cannot ping; use in-process to avoid later errors
        return False
    except Exception:
        return False


def _resolve_broker() -> str:
    """
    Priority order:
      1. REDIS_URL env var (if set and non-empty)
      2. Built from REDIS_HOST + REDIS_PORT
      3. Falls back to 'memory://' if neither is configured

    If Redis is configured but unreachable at startup, falls back to 'memory://'
    so scan jobs run in-process without "Retry limit exceeded" errors.
    """
    redis_url = (getattr(settings, "REDIS_URL", "") or "").strip()
    if redis_url:
        pass
    else:
        host = (getattr(settings, "REDIS_HOST", "") or "").strip()
        port = getattr(settings, "REDIS_PORT", 6379)
        if host:
            redis_url = f"redis://{host}:{port}/0"
        else:
            redis_url = ""

    if not redis_url:
        logger.warning(
            "No REDIS_URL or REDIS_HOST configured. "
            "Celery will use in-memory broker (tasks run synchronously)."
        )
        return "memory://"

    if not _redis_reachable(redis_url):
        logger.warning(
            "Redis not reachable at %s. Using in-process tasks (no Redis required). "
            "Start Redis and restart the app to use Celery workers.",
            redis_url.split("@")[-1] if "@" in redis_url else redis_url,
        )
        return "memory://"

    return redis_url


def _build_celery_app() -> "Celery | None":
    """
    Build and configure the Celery app.
    Returns None if Celery is not installed.
    """
    if not CELERY_AVAILABLE or Celery is None:
        return None

    broker = _resolve_broker()
    in_memory = broker.startswith("memory://")

    # For in-memory broker Celery needs 'cache+memory://' as backend
    backend = "cache+memory://" if in_memory else broker

    app = Celery(
        "worker",
        broker=broker,
        backend=backend,
    )

    conf: dict = dict(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        # Don't crash worker startup when Redis is temporarily unavailable
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
        broker_connection_max_retries=5,
    )
    # Prefork pool uses semaphores that often cause PermissionError on Windows; use solo.
    import sys
    if sys.platform == "win32":
        conf["worker_pool"] = "solo"
        logger.info("Windows detected: using solo pool (avoid prefork PermissionError).")

    if in_memory:
        # Keep tasks synchronous when there is no real broker
        conf.update(
            task_always_eager=True,       # run tasks inline (no worker needed)
            task_eager_propagates=True,   # surface exceptions immediately
        )
        logger.info("Celery running in EAGER / in-process mode (no Redis).")
    else:
        logger.info("Celery broker: %s", broker)

    app.conf.update(**conf)
    return app


# ── Module-level singleton ────────────────────────────────────────────────────
celery_app = _build_celery_app()


# ── Graceful task decorator that works with or without Celery ─────────────────
def celery_task(*args, **kwargs):
    """
    Drop-in replacement for @celery_app.task that degrades gracefully when
    Celery is not installed or no broker is configured.

    Usage (same as normal Celery):
        @celery_task(bind=True)
        def my_task(self, x, y):
            return x + y

        # Calling always works whether Celery is present or not:
        my_task.delay(1, 2)
        my_task.apply_async(args=[1, 2])
    """
    if celery_app is not None:
        # Real Celery task
        return celery_app.task(*args, **kwargs)

    # ── Fallback: wrap function so .delay() / .apply_async() run in-process ──
    def decorator(func):
        class _SyncTask:
            """Mimics the minimal Celery task API synchronously."""

            def __call__(self, *a, **kw):
                return func(*a, **kw)

            def delay(self, *a, **kw):
                logger.debug(
                    "Celery unavailable — running %s synchronously.", func.__name__
                )
                return func(*a, **kw)

            def apply_async(self, args=None, kwargs=None, **_options):
                logger.debug(
                    "Celery unavailable — running %s synchronously.", func.__name__
                )
                return func(*(args or []), **(kwargs or {}))

            @property
            def __name__(self):
                return func.__name__

        return _SyncTask()

    # Support both @celery_task and @celery_task(bind=True, ...)
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return decorator(args[0])
    return decorator