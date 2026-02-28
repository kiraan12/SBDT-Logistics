# SBDT Logistics – Deployment for ~100 Concurrent Users

This document describes the changes and steps to run the application so it can handle around **100 users at the same time**. No code is run here; follow the steps when you deploy.

---

## 1. Changes Already in the Project

### Database connection pool (`app/db/session.py` + `app/core/config.py`)

- **Pool size**: Default `DB_POOL_SIZE=10` connections per process.
- **Max overflow**: Default `DB_POOL_MAX_OVERFLOW=10` extra connections under load.
- **Pool recycle**: Connections recycled after `DB_POOL_RECYCLE_SEC=3600` (1 hour).

You can override in `.env`:

```env
DB_POOL_SIZE=15
DB_POOL_MAX_OVERFLOW=15
DB_POOL_RECYCLE_SEC=3600
```

**Rule of thumb:** Total DB connections ≈ `(DB_POOL_SIZE + DB_POOL_MAX_OVERFLOW) × number of app workers`. Keep this below PostgreSQL `max_connections` (e.g. 100–200).

### Gunicorn config (`gunicorn_conf.py`)

- Uses **Uvicorn workers** (async) for FastAPI.
- Worker count defaults to `CPU_COUNT * 2 + 1`; override with `GUNICORN_WORKERS`.
- Timeout 120 s for slow requests (e.g. PDF generation).

### Dependency

- **gunicorn** added to `requirements.txt` for production multi-worker runs on Linux.

---

## 2. How to Run for Production (~100 Users)

### Option A: Linux / macOS (Gunicorn + Uvicorn workers)

From the **backend** directory (where `app/` and `gunicorn_conf.py` are):

```bash
# Install dependencies first (if not already)
pip install -r requirements.txt

# Run with config (worker count from gunicorn_conf.py or env)
gunicorn app.main:app -c gunicorn_conf.py
```

Override workers and bind via env:

```bash
export GUNICORN_WORKERS=6
export GUNICORN_BIND=0.0.0.0:8000
gunicorn app.main:app -c gunicorn_conf.py
```

### Option B: Windows (Uvicorn with multiple workers)

Gunicorn is not supported on Windows. Use Uvicorn with workers:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Adjust `--workers` (e.g. 4–8) based on CPU cores.

### Option C: Single process (development only)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

This is **not** suitable for 100 concurrent users; use Option A or B for that.

---

## 3. PostgreSQL Settings

Ensure PostgreSQL can accept enough connections:

- **max_connections** in `postgresql.conf` (e.g. 100–200).
- Example: 6 workers × (15 + 15) = 180 connections at peak; set `max_connections` ≥ 200 and leave headroom for admin tools and migrations.

---

## 4. Frontend (React)

- Build: `npm run build` in the frontend directory.
- Serve the built files (e.g. `dist/`) with **Nginx** or another web server; do not use the Vite dev server for 100 users.
- Point the frontend’s API base URL to your backend (e.g. `https://api.yourdomain.com`).

---

## 5. Optional: Reverse proxy (Nginx)

In front of the app (Gunicorn or Uvicorn), use Nginx to:

- Terminate SSL (HTTPS).
- Serve static files (React build).
- Proxy `/api` (or your API prefix) to the backend.
- Buffer client requests and protect against slow clients.

---

## 6. Checklist for ~100 Users

| Item | Done |
|------|------|
| Multiple app workers (Gunicorn or `uvicorn --workers`) | |
| DB pool configured (`DB_POOL_SIZE`, `DB_POOL_MAX_OVERFLOW`) | |
| PostgreSQL `max_connections` ≥ total app connections | |
| Frontend built and served by Nginx (or similar) | |
| SECRET_KEY and other secrets set in production `.env` | |
| CORS `BACKEND_CORS_ORIGINS` set for production frontend URL | |

---

## 7. Tuning

- **More workers** → more concurrent requests; ensure DB pool and `max_connections` are increased accordingly.
- **Heavy PDF/export usage** → consider moving those to a background queue (e.g. Celery + Redis) so the web workers stay responsive.
- **Rate limiting** → add per-user or per-IP limits in production to avoid abuse.

These changes in the project (pool, Gunicorn config, and this guide) give you the basis to run the application for ~100 users at a time when you follow the steps above.
