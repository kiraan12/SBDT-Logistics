# Gunicorn config for production (~100 concurrent users).
# Run from backend: gunicorn app.main:app -c gunicorn_conf.py
# On Windows use: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

import multiprocessing
import os

bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:8000")
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
