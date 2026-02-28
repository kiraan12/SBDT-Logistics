# app/tasks.py

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.all_models import ScanJob
from app.services.ocr_service import OCRService

logger = logging.getLogger(__name__)


def _get_db() -> Session:
    return SessionLocal()


def _json_dumps_safe(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return "{}"


def _update_job(
    db: Session,
    job_id: str,
    *,
    status: Optional[str] = None,
    extracted_data: Optional[Dict[str, Any]] = None,
    confidence_scores: Optional[Dict[str, Any]] = None,
    raw_text: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    if not job:
        logger.error("ScanJob not found: %s", job_id)
        return
    if status is not None:
        job.status = status
    if extracted_data is not None:
        job.extracted_data = _json_dumps_safe(extracted_data)
    if confidence_scores is not None:
        job.confidence_scores = _json_dumps_safe(confidence_scores)
    if raw_text is not None:
        job.raw_text = raw_text
    if error_message is not None and status == "FAILED":
        job.extracted_data = _json_dumps_safe({"error": error_message})
    db.add(job)
    db.commit()


def _clean_source(address: str) -> str:
    """Extract just the city name from a full address. e.g. '...Anekal Taluk Bengaluru, Karnataka-562106' → 'Bengaluru'"""
    if not address:
        return ""
    # Try to find city before state-pincode pattern
    m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", address)
    if m:
        return m.group(1).strip()
    # Try last word before Karnataka/Tamil Nadu etc
    m = re.search(r"([A-Za-z]+)\s*,\s*(?:Karnataka|Tamil Nadu|Maharashtra|Telangana|Andhra)", address, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Fallback: last meaningful word
    parts = [p.strip() for p in address.replace("-", ",").split(",") if p.strip()]
    for part in reversed(parts):
        if part and not re.search(r"\d{6}", part) and len(part) > 3:
            return part.strip()
    return address[:40].strip()


def _clean_destination(raw: str) -> str:
    """Extract just the city from consignee address. e.g. 'HOSUR-635109, Tamil Nadu' → 'Hosur'"""
    if not raw:
        return ""
    # Remove GSTIN junk
    raw = re.sub(r"GSTIN\s*[:\-]?\s*[0-9A-Z]{15}", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\d{5}\s*FAX.*?(?=\n|$)", "", raw, flags=re.IGNORECASE)
    # Find city like HOSUR or Chennai
    m = re.search(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[\-,]\s*\d{6}", raw)
    if m:
        return m.group(1).strip()
    # Try pincode pattern: word before 6 digits
    m = re.search(r"([A-Za-z]+)\s*-\s*\d{6}", raw)
    if m:
        return m.group(1).strip().title()
    # Fallback: first clean word
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    for part in parts:
        clean = re.sub(r"\d+", "", part).strip()
        if clean and len(clean) > 3:
            return clean.strip().title()
    return raw[:30].strip()


def _clean_address(raw: str) -> str:
    """Remove GSTIN numbers and junk from address."""
    if not raw:
        return ""
    # Remove GSTIN label + value
    s = re.sub(r"GSTIN\s*[:\-]?\s*[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]", "", raw, flags=re.IGNORECASE)
    # Remove standalone 15-char GSTIN
    s = re.sub(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b", "", s)
    # Remove FAX numbers like "22048 FAX (04344)"
    s = re.sub(r"\d+\s*FAX\s*\(\d+\)", "", s, flags=re.IGNORECASE)
    # Clean double commas and extra spaces
    s = re.sub(r",\s*,+", ", ", s)
    s = re.sub(r"\s+", " ", s).strip().strip(",").strip()
    return s


def _extract_sender_receiver(file_path: str) -> Dict[str, Any]:
    """
    Uses OCRService.process_document(file_path) and returns ALL extracted fields
    with keys matching exactly what ShipmentForm.tsx expects.
    """
    result = OCRService.process_document(file_path) or {}
    extracted = result.get("extracted_data", {}) or {}

    # ── Raw values from OCR ──────────────────────────────────────────────
    consignor_address_raw = (extracted.get("consignor_address") or "").strip()
    consignee_address_raw = (extracted.get("consignee_address") or "").strip()
    source_raw            = (extracted.get("source")            or "").strip()
    destination_raw       = (extracted.get("destination")       or "").strip()

    # ── Fix Source: extract just city name ───────────────────────────────
    source = _clean_source(source_raw or consignor_address_raw)

    # ── Fix Destination: extract just city name ──────────────────────────
    destination = _clean_destination(destination_raw or consignee_address_raw)

    # ── Fix Consignee Address: remove GSTIN junk ─────────────────────────
    consignee_address = _clean_address(consignee_address_raw)

    # ── LR No: prefer e-way bill number (12 digits) ──────────────────────
    lr_no = (extracted.get("lr_no") or "").strip()

    payload = {
        # Consignor (Sender)
        "consignor_name":         (extracted.get("consignor_name")    or "").strip(),
        "consignor_address":      consignor_address_raw,
        "sender_address":         consignor_address_raw,  # fallback for NewScan.tsx

        # Consignee (Receiver)
        "consignee_name":         (extracted.get("consignee_name")    or "").strip(),
        "consignee_address":      consignee_address,
        "receiver_address":       consignee_address,      # fallback for NewScan.tsx

        # Dates
        "booking_date":           (extracted.get("booking_date")       or "").strip(),
        "expected_delivery_date": (extracted.get("valid_upto") or extracted.get("expected_delivery_date") or "").strip(),

        # Route — cleaned city names only
        "source":                 source,
        "destination":            destination,

        # Transport
        "vehicle_no":             (extracted.get("vehicle_no")         or "").strip(),
        "transporter_name":       (extracted.get("transporter_name")   or "").strip(),

        # Invoice
        "inv_no":                 (extracted.get("inv_no")             or "").strip(),
        "lr_no":                  lr_no,
        "invoice_value":          str(extracted.get("invoice_value")   or "").strip(),
        "hsn_code":               (extracted.get("hsn_code")           or "").strip(),
        "boxes":                  str(extracted.get("boxes")           or "").strip(),
        "weight":                 str(extracted.get("weight")          or "").strip(),
    }

    # Remove empty fields
    payload = {k: v for k, v in payload.items() if v}

    confidence = result.get("confidence_scores") or {}
    raw_text   = result.get("raw_text") or ""

    logger.info("Extracted fields: %s", {k: v for k, v in payload.items()})
    return {"payload": payload, "confidence": confidence, "raw_text": raw_text}


def run_scan_job_sync(job_id: str, file_path: str) -> None:
    db = _get_db()
    try:
        _update_job(db, job_id, status="PROCESSING")
        out = _extract_sender_receiver(file_path)
        _update_job(
            db,
            job_id,
            status="COMPLETED",
            extracted_data=out["payload"],
            confidence_scores=out["confidence"],
            raw_text=out["raw_text"],
        )
        logger.info("ScanJob %s COMPLETED", job_id)
    except Exception as exc:
        logger.exception("ScanJob %s FAILED: %s", job_id, exc)
        _update_job(db, job_id, status="FAILED", error_message=str(exc))
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Celery task (optional)
# ─────────────────────────────────────────────────────────────────────────────
try:
    from app.worker import celery_app

    @celery_app.task(name="process_scan_job")
    def process_scan_job(job_id: str, file_path: str) -> None:
        run_scan_job_sync(job_id=job_id, file_path=file_path)

except Exception:
    process_scan_job = None