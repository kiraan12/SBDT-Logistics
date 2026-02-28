from __future__ import annotations

import logging
import os
import shutil
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core import deps
from app.db.session import get_db
from app.models.all_models import ScanJob, User
from app.schemas.all_schemas import ScanJobResponse
from app.tasks import process_scan_job, run_scan_job_sync

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Upload directory ──────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file extensions (add more as needed)
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_extension(filename: str | None) -> str:
    """Return lowercased extension without leading dot, or 'bin' if unknown."""
    if not filename or "." not in filename:
        return "bin"
    return filename.rsplit(".", 1)[-1].lower()


def _dispatch_task(
    background_tasks: BackgroundTasks,
    job_id: str,
    file_path: str,
) -> str:
    """
    Dispatch the scan job via Celery if available, otherwise via FastAPI
    BackgroundTasks (in-process thread).

    Returns a string describing which mode was used (for logging).
    """
    # _SyncTaskWrapper always has .delay but runs synchronously — check for
    # real Celery by inspecting whether celery_app is the backing object.
    try:
        from app.worker import celery_app as _celery_app  # noqa: F401
        celery_live = _celery_app is not None
    except Exception:
        celery_live = False

    if celery_live:
        try:
            process_scan_job.delay(job_id=job_id, file_path=file_path)
            return "celery"
        except Exception as exc:
            logger.warning(
                "Celery dispatch failed (%s) — falling back to background thread.", exc
            )

    background_tasks.add_task(run_scan_job_sync, job_id, file_path)
    return "background_thread"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/extract", response_model=ScanJobResponse, status_code=202)
def extract_data(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload a document (PDF or image) to start OCR extraction.

    - Returns **202 Accepted** with a `job_id` to poll.
    - Uses Celery worker when Redis is available; falls back to an in-process
      background thread otherwise.
    """
    # ── Validate extension ────────────────────────────────────────────────
    ext = _safe_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # ── Validate file size (read into memory check via seek) ──────────────
    file.file.seek(0, 2)                  # seek to end
    file_size = file.file.tell()
    file.file.seek(0)                     # rewind for saving
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size // (1024*1024)} MB). Max {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        )

    # ── Persist uploaded file ─────────────────────────────────────────────
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.{ext}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as exc:
        logger.exception("Failed to save uploaded file for job %s", job_id)
        raise HTTPException(status_code=500, detail=f"Could not save file: {exc}") from exc
    finally:
        file.file.close()   # always release the upload file handle

    # ── Create DB job record ──────────────────────────────────────────────
    job = ScanJob(
        id=job_id,
        status="PENDING",
        input_file_path=file_path,
        user_id=getattr(current_user, "id", None),  # store owner if model supports it
    )
    db.add(job)
    try:
        db.commit()
        db.refresh(job)
    except Exception as exc:
        logger.exception("DB error creating ScanJob %s", job_id)
        # Clean up saved file so we don't leave orphans on disk
        _safe_remove(file_path)
        raise HTTPException(status_code=500, detail="Database error creating job.") from exc

    # ── Dispatch scan task ────────────────────────────────────────────────
    mode = _dispatch_task(background_tasks, job_id, file_path)
    logger.info("Job %s dispatched via %s (file=%s).", job_id, mode, file_path)

    return job


@router.get("/jobs/{job_id}", response_model=ScanJobResponse)
def get_scan_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Poll the status of a scan job.

    Possible statuses: ``PENDING`` → ``PROCESSING`` → ``COMPLETED`` / ``FAILED``
    """
    job: ScanJob | None = (
        db.query(ScanJob).filter(ScanJob.id == job_id).first()
    )
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Ownership check — prevent users from reading each other's jobs
    owner_id = getattr(job, "user_id", None)
    current_id = getattr(current_user, "id", None)
    if owner_id is not None and current_id is not None and owner_id != current_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return job


# ── Internal utility ──────────────────────────────────────────────────────────

def _safe_remove(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError as exc:
        logger.debug("Could not remove file %s: %s", path, exc)