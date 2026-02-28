
from typing import Any, List, Optional, Tuple
from datetime import datetime, date, timedelta
import zipfile
import io
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.core import deps
from app.core.config import settings
from app.models.all_models import User, Shipment, ShipmentFile, DeliveryStatus, UserRole, Notification
from app.schemas.all_schemas import ShipmentCreate, ShipmentUpdate, ShipmentResponse, BulkPdfRequest
import uuid
import os
import shutil
import subprocess
import sys
import urllib.parse
import re

# Periods for exports and analytics: month, 3months, half_yearly, 2years, 3years
MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _period_to_date_range(
    period: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> Tuple[datetime, datetime, str]:
    """
    Return (start_dt, end_dt, filename_base) for the given period.
    For 'month', year and month must be provided; otherwise uses current month.
    """
    today = date.today()
    start_d = today
    end_d = today
    filename_base = "shipments_export"

    if period == "month":
        y = year or today.year
        m = month or today.month
        start_d = date(y, m, 1)
        if m == 12:
            end_d = date(y, 12, 31)
        else:
            end_d = date(y, m + 1, 1) - timedelta(days=1)
        filename_base = f"{MONTH_NAMES[m - 1]}_{y}"
    elif period == "3months":
        end_d = today
        start_d = today - timedelta(days=90)
        filename_base = f"shipments_3months_{today.isoformat()}"
    elif period == "half_yearly":
        end_d = today
        start_d = today - timedelta(days=182)
        filename_base = f"shipments_half_yearly_{today.isoformat()}"
    elif period == "2years":
        end_d = today
        start_d = today - timedelta(days=730)
        filename_base = f"shipments_2years_{today.isoformat()}"
    elif period == "3years":
        end_d = today
        start_d = today - timedelta(days=1095)
        filename_base = f"shipments_3years_{today.isoformat()}"
    # else: all time, no date filter

    start_dt = datetime.combine(start_d, datetime.min.time())
    end_dt = datetime.combine(end_d, datetime.max.time())
    return start_dt, end_dt, filename_base

# Lazy import PDFService to avoid startup errors if ReportLab is not available
def get_pdf_service():
    try:
        from app.services.pdf_service import PDFService
        # Verify the class is actually available
        if PDFService is None:
            return None
        return PDFService
    except ImportError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to import PDFService (ImportError): {e}", exc_info=True)
        return None
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to import PDFService (Unexpected error): {e}", exc_info=True)
        return None

router = APIRouter()


def _ensure_can_access_shipment(shipment: Shipment, current_user: User) -> None:
    """Managers and owners can view any shipment. Operators only their own."""
    if current_user.role in (UserRole.MANAGER, UserRole.OWNER):
        return  # Managers/owners can view any shipment (track by LR / invoice)
    elif current_user.role == UserRole.OPERATOR:
        if shipment.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only access your own shipments")


@router.post("/", response_model=ShipmentResponse)
def create_shipment(
    *,
    db: Session = Depends(get_db),
    shipment_in: ShipmentCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new shipment. Only accepts SBDT's GST number.
    """
    # Check if LR No exists
    if db.query(Shipment).filter(Shipment.lr_no == shipment_in.lr_no).first():
        raise HTTPException(status_code=400, detail="LR Number already exists")

    # Validate GST numbers - only accept SBDT's GST number
    sbdt_gst = settings.SBDT_GST_NUMBER.upper().strip()
    
    # Normalize GST numbers (remove spaces, convert to uppercase)
    def normalize_gst(gst: Optional[str]) -> Optional[str]:
        if not gst:
            return None
        return re.sub(r'\s+', '', gst.upper().strip())
    
    consignor_gst = normalize_gst(shipment_in.consignor_gstin)
    consignee_gst = normalize_gst(shipment_in.consignee_gstin)
    
    # Validate that any provided GST number matches SBDT's GST
    if consignor_gst and consignor_gst != sbdt_gst:
        raise HTTPException(
            status_code=400, 
            detail=f"Only SBDT's GST number ({sbdt_gst}) is accepted. Consignor GST provided: {consignor_gst}"
        )
    
    if consignee_gst and consignee_gst != sbdt_gst:
        raise HTTPException(
            status_code=400, 
            detail=f"Only SBDT's GST number ({sbdt_gst}) is accepted. Consignee GST provided: {consignee_gst}"
        )

    # Who can track: manager sees shipments they own or created; owner/admin no owner_id; operator-created need owner_id set
    owner_id: Optional[int] = None
    if current_user.role == UserRole.MANAGER:
        owner_id = current_user.id
    elif current_user.role == UserRole.OWNER:
        pass  # Owner creates without owner_id (like admin)
    elif getattr(shipment_in, "owner_id", None) is not None:
        owner_user = db.query(User).filter(User.id == shipment_in.owner_id).first()
        if not owner_user or owner_user.role != UserRole.MANAGER:
            raise HTTPException(status_code=400, detail="owner_id must be a valid manager (company) user")
        owner_id = shipment_in.owner_id

    data = {k: v for k, v in shipment_in.model_dump().items() if k != "owner_id"}
    data["created_by_id"] = current_user.id
    if owner_id is not None:
        data["owner_id"] = owner_id
    shipment = Shipment(**data)
    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    # When a manager creates a booking, notify admin and owner so they can see it
    if current_user.role == UserRole.MANAGER:
        admin_owners = db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.OWNER]),
            User.is_active == True,
        ).all()
        manager_name = current_user.full_name or current_user.email or "A manager"
        message = f"{manager_name} created booking {shipment.lr_no}"
        for u in admin_owners:
            db.add(Notification(
                for_user_id=u.id,
                message=message,
                shipment_id=shipment.id,
            ))
        db.commit()

    return shipment

@router.get("/", response_model=List[ShipmentResponse])
def read_shipments(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    my_only: bool = False,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve shipments with filtering.
    - Admin: sees all shipments.
    - Manager: when searching by LR/invoice, sees any matching shipment (incl. delivered).
                When not searching, sees only their own (created by them).
    - Operator: sees only their own shipments. my_only=True also restricts to own.
    """
    query = db.query(Shipment)
    if my_only:
        query = query.filter(Shipment.created_by_id == current_user.id)
    elif current_user.role == UserRole.OPERATOR:
        query = query.filter(Shipment.created_by_id == current_user.id)
    elif current_user.role == UserRole.OWNER:
        # Owner sees all shipments (like admin)
        pass
    elif current_user.role == UserRole.MANAGER and not search:
        # No search: show only their bookings
        query = query.filter(
            or_(Shipment.owner_id == current_user.id, Shipment.created_by_id == current_user.id)
        )
    # When MANAGER and search is set: no owner filter — they can look up any LR/invoice (incl. delivered)
    if search:
        # Normalize: strip and remove spaces/dashes so "LR 123" and "LR123" both match
        raw = search.strip()
        search_term = f"%{raw}%"
        compact = raw.replace(" ", "").replace("-", "")
        search_compact = f"%{compact}%" if compact else search_term
        query = query.filter(
            or_(
                Shipment.lr_no.ilike(search_term),
                Shipment.lr_no.ilike(search_compact),
                Shipment.inv_no.ilike(search_term),
                Shipment.inv_no.ilike(search_compact),
                Shipment.consignor_name.ilike(search_term),
                Shipment.consignee_name.ilike(search_term),
                Shipment.source.ilike(search_term),
                Shipment.destination.ilike(search_term),
            )
        )
    # Cap limit for safety; search results can request more (e.g. 200)
    effective_limit = min(limit, 500)
    shipments = query.order_by(Shipment.created_at.desc()).offset(skip).limit(effective_limit).all()
    return shipments


@router.post("/bulk/pdf")
def bulk_pdf(
    body: BulkPdfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Generate LR PDFs for multiple shipments and return as a zip file.
    Body: { "ids": ["uuid1", "uuid2", ...], "copy": "all" | "booking" | "pod" | "office" }.
    """
    import logging
    logger = logging.getLogger(__name__)
    valid_copy = ("all", "booking", "pod", "office")
    copy = body.copy_type if body.copy_type in valid_copy else "all"
    ids = body.ids or []
    if len(ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 shipments per bulk download")
    if not ids:
        raise HTTPException(status_code=400, detail="At least one shipment id is required")

    PDFService = get_pdf_service()
    if PDFService is None:
        raise HTTPException(status_code=503, detail="PDF generation is not available")

    output_dir = os.path.abspath("generated_pdfs")
    os.makedirs(output_dir, exist_ok=True)
    temp_dir = tempfile.mkdtemp(prefix="bulk_pdf_")
    generated = []
    try:
        for sid in ids:
            try:
                uid = uuid.UUID(sid)
            except (ValueError, TypeError):
                continue
            shipment = db.query(Shipment).filter(Shipment.id == uid).first()
            if not shipment:
                continue
            try:
                _ensure_can_access_shipment(shipment, current_user)
            except HTTPException:
                continue
            safe_lr = str(shipment.lr_no).replace("/", "_").replace("\\", "_").replace(":", "_").replace("*", "_").replace("?", "_").replace('"', "_").replace("<", "_").replace(">", "_").replace("|", "_")
            suffix = "" if copy == "all" else f"_{copy}"
            file_path = os.path.join(temp_dir, f"{safe_lr}{suffix}.pdf")
            shipment_data = {}
            for c in shipment.__table__.columns:
                value = getattr(shipment, c.name, None)
                shipment_data[c.name] = value if value is not None else ""
            for date_field in ["booking_date", "ship_date", "expected_delivery_date"]:
                if shipment_data.get(date_field) and hasattr(shipment_data[date_field], "strftime"):
                    shipment_data[date_field] = shipment_data[date_field].strftime("%d-%m-%Y")
            if getattr(settings, "LR_LOGO_PATH", None):
                shipment_data["logo_path"] = settings.LR_LOGO_PATH
            if getattr(settings, "QR_CODE_PATH", None):
                shipment_data["qr_path"] = settings.QR_CODE_PATH
            try:
                PDFService.generate_shipment_pdf(shipment_data, file_path, copy=copy)
                if os.path.isfile(file_path):
                    generated.append((file_path, f"{safe_lr}{suffix}.pdf"))
            except Exception as e:
                logger.warning("Bulk PDF skip shipment %s: %s", sid, e)
        if not generated:
            raise HTTPException(status_code=400, detail="No PDFs could be generated for the given ids")

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for path, name in generated:
                zf.write(path, name)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="lr_bulk.zip"'},
        )
    finally:
        for path, _ in generated:
            try:
                if os.path.isfile(path):
                    os.remove(path)
            except OSError:
                pass
        try:
            os.rmdir(temp_dir)
        except OSError:
            pass


@router.get("/{id}", response_model=ShipmentResponse)
def read_shipment(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get shipment by ID.
    """
    shipment = db.query(Shipment).filter(Shipment.id == id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    _ensure_can_access_shipment(shipment, current_user)
    return shipment

@router.put("/{id}", response_model=ShipmentResponse)
def update_shipment(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    shipment_in: ShipmentUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update shipment (details or delivery status). Cannot mark as DELIVERED without a POD file.
    """
    shipment = db.query(Shipment).filter(Shipment.id == id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    _ensure_can_access_shipment(shipment, current_user)
    update_data = shipment_in.dict(exclude_unset=True)

    # Require proof of delivery before marking as delivered
    if update_data.get("delivery_status") == "DELIVERED":
        pod_file = db.query(ShipmentFile).filter(
            ShipmentFile.shipment_id == id,
            ShipmentFile.file_type == "POD",
        ).first()
        if not pod_file:
            raise HTTPException(
                status_code=400,
                detail="Proof of delivery (POD) must be uploaded before marking the shipment as delivered.",
            )

    # If LR number is being changed, ensure it doesn't already exist on another shipment
    if "lr_no" in update_data and update_data["lr_no"] != shipment.lr_no:
        if db.query(Shipment).filter(Shipment.lr_no == update_data["lr_no"]).first():
            raise HTTPException(status_code=400, detail="LR Number already exists")

    if "owner_id" in update_data and update_data["owner_id"] is not None:
        owner_user = db.query(User).filter(User.id == update_data["owner_id"]).first()
        if not owner_user or owner_user.role != UserRole.MANAGER:
            raise HTTPException(status_code=400, detail="owner_id must be a valid manager (company) user")
    for field, value in update_data.items():
        setattr(shipment, field, value)
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/{id}/pdf")
def generate_pdf(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    copy: str = Query(
        "all",
        description="PDF copy: all (3 copies), booking, pod, or office",
    ),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Generate and stream PDF for shipment.
    copy: all | booking | pod | office (booking/pod/office = single LR copy).
    """
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"PDF request for shipment {id}, copy={copy}")
        shipment = db.query(Shipment).filter(Shipment.id == id).first()
        if not shipment:
            logger.warning(f"Shipment {id} not found")
            raise HTTPException(status_code=404, detail="Shipment not found")
        _ensure_can_access_shipment(shipment, current_user)
        logger.info(f"Found shipment: {shipment.lr_no}")
        valid_copy = ("all", "booking", "pod", "office")
        if copy not in valid_copy:
            copy = "all"

        # Sanitize LR number for filename (remove invalid characters)
        safe_lr_no = str(shipment.lr_no).replace("/", "_").replace("\\", "_").replace(":", "_").replace("*", "_").replace("?", "_").replace('"', "_").replace("<", "_").replace(">", "_").replace("|", "_")

        output_dir = os.path.abspath("generated_pdfs")
        os.makedirs(output_dir, exist_ok=True)
        # Delete existing LR copies for this shipment so we don't keep old copies
        for old_suffix in ["", "_booking", "_pod", "_office"]:
            old_path = os.path.join(output_dir, f"{safe_lr_no}{old_suffix}.pdf")
            if os.path.isfile(old_path):
                try:
                    os.remove(old_path)
                    logger.info(f"Removed existing LR copy: {old_path}")
                except OSError as e:
                    logger.warning(f"Could not remove {old_path}: {e}")
        suffix = "" if copy == "all" else f"_{copy}"
        file_path = os.path.join(output_dir, f"{safe_lr_no}{suffix}.pdf")
        logger.info(f"PDF will be saved to: {file_path}")
        
        # Prepare shipment data, handling None values
        shipment_data = {}
        for c in shipment.__table__.columns:
            value = getattr(shipment, c.name, None)
            # Convert None to empty string for template rendering
            shipment_data[c.name] = value if value is not None else ""
        
        # Format date fields
        for date_field in ['booking_date', 'ship_date', 'expected_delivery_date']:
            if shipment_data.get(date_field):
                try:
                    if hasattr(shipment_data[date_field], 'strftime'):
                        shipment_data[date_field] = shipment_data[date_field].strftime("%d-%m-%Y")
                except Exception as date_err:
                    logger.warning(f"Error formatting date {date_field}: {date_err}")
                    shipment_data[date_field] = str(shipment_data[date_field])

        # Optional logo and QR code for LR copies (paths from settings)
        if getattr(settings, "LR_LOGO_PATH", None):
            shipment_data["logo_path"] = settings.LR_LOGO_PATH
        if getattr(settings, "QR_CODE_PATH", None):
            shipment_data["qr_path"] = settings.QR_CODE_PATH

        PDFService = get_pdf_service()
        if PDFService is None:
            logger.error("PDFService is None - ReportLab not available or import failed")
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. ReportLab is required. Please install with: pip install reportlab"
            )
        
        logger.info(f"Generating PDF for shipment {id}, copy={copy}, file_path={file_path}")
        try:
            PDFService.generate_shipment_pdf(shipment_data, file_path, copy=copy)
        except Exception as pdf_err:
            logger.error(f"PDFService.generate_shipment_pdf failed: {pdf_err}")
            raise
        
        # Verify file was created
        if not os.path.exists(file_path):
            logger.error(f"PDF file was not created at {file_path}")
            raise HTTPException(status_code=500, detail=f"PDF file was not created at {file_path}")
        
        logger.info(f"PDF generated successfully: {file_path}")
        # Use original LR number for download filename (browser will handle sanitization)
        download_filename = f"{shipment.lr_no}{suffix}.pdf"
        # Ensure filename always has .pdf extension
        if not download_filename.lower().endswith(".pdf"):
            download_filename = download_filename + ".pdf"
        
        # Sanitize filename for header (replace invalid chars but keep original for download)
        safe_header_filename = download_filename.replace('"', '\\"').replace('\n', '').replace('\r', '')
        # URL encode the filename for RFC 5987 format
        encoded_filename = urllib.parse.quote(download_filename, safe='')
        
        # FastAPI FileResponse will automatically set Content-Disposition with the filename parameter
        # But we also set it explicitly in headers for maximum compatibility
        content_disposition = f'attachment; filename="{safe_header_filename}"; filename*=UTF-8\'\'{encoded_filename}'
        
        logger.info(f"Setting download filename: {download_filename}")
        return FileResponse(
            file_path, 
            media_type='application/pdf',
            filename=download_filename,  # FastAPI will use this to set Content-Disposition
            headers={
                "Content-Disposition": content_disposition,
                "Content-Type": "application/pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error generating PDF for shipment {id}: {e}\n{error_trace}")
        error_msg = f"Failed to generate PDF: {str(e)}"
        # Include more details in development
        import sys
        if hasattr(sys, '_getframe'):
            error_msg += f" | Type: {type(e).__name__}"
        raise HTTPException(status_code=500, detail=error_msg)


def _windows_print_pdf(file_path: str) -> None:
    """
    Send a PDF to the default printer on Windows.
    Tries: (1) shell print verb, (2) long path + print, (3) SumatraPDF, (4) Adobe Reader.
    Raises OSError on failure.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"PDF not found: {file_path}")
    path = os.path.abspath(file_path)

    def try_startfile_print(p: str) -> bool:
        try:
            os.startfile(p, "print")
            return True
        except OSError as e:
            if getattr(e, "winerror", None) == 1155:
                return False
            raise

    if try_startfile_print(path):
        return
    # Try long path in case short path (8.3) broke association
    try:
        import ctypes
        buf = ctypes.create_unicode_buffer(500)
        if ctypes.windll.kernel32.GetLongPathNameW(path, buf, len(buf)):
            long_path = buf.value
            if long_path and try_startfile_print(long_path):
                return
    except Exception:
        pass
    # Fallback: known apps with command-line print
    candidates = [
        (os.path.expandvars(r"%ProgramFiles%\SumatraPDF\SumatraPDF.exe"), ["-print-to-default", path]),
        (os.path.expandvars(r"%ProgramFiles(x86)%\SumatraPDF\SumatraPDF.exe"), ["-print-to-default", path]),
        (os.path.expandvars(r"%ProgramFiles(x86)%\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe"), ["/p", "/h", path]),
        (os.path.expandvars(r"%ProgramFiles(x86)%\Adobe\Reader 11.0\Reader\AcroRd32.exe"), ["/p", "/h", path]),
    ]
    for exe, args in candidates:
        if exe and os.path.isfile(exe):
            try:
                subprocess.run([exe] + args, check=True, timeout=60, capture_output=True)
                return
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                continue
    raise OSError(
        1155,
        "No application is associated with PDF for printing. "
        "Install SumatraPDF (https://www.sumatrapdfreader.org) or Adobe Reader, "
        "or set a default app for .pdf and use 'Print' from that app.",
    )


def _send_file_to_system_printer(file_path: str) -> None:
    """
    Send a PDF file to the default system printer.
    Windows: shell print verb, then fallbacks (SumatraPDF, Adobe).
    Linux/macOS: lp (CUPS).
    Raises OSError/Exception on failure.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"PDF not found: {file_path}")
    if sys.platform == "win32":
        _windows_print_pdf(file_path)
    else:
        subprocess.run(["lp", file_path], check=True, capture_output=True, timeout=30)


@router.post("/{id}/print-direct")
def print_direct(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    copy: str = Query(
        "all",
        description="PDF copy: all, booking, pod, or office",
    ),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Generate the LR PDF and send it directly to the default system printer.
    The backend must run on the machine that has the printer (e.g. office PC).
    """
    import logging
    import traceback
    logger = logging.getLogger(__name__)

    try:
        shipment = db.query(Shipment).filter(Shipment.id == id).first()
        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")
        _ensure_can_access_shipment(shipment, current_user)
        valid_copy = ("all", "booking", "pod", "office")
        copy = copy if copy in valid_copy else "all"

        safe_lr_no = str(shipment.lr_no).replace("/", "_").replace("\\", "_").replace(":", "_").replace("*", "_").replace("?", "_").replace('"', "_").replace("<", "_").replace(">", "_").replace("|", "_")
        suffix = "" if copy == "all" else f"_{copy}"

        shipment_data = {}
        for c in shipment.__table__.columns:
            value = getattr(shipment, c.name, None)
            shipment_data[c.name] = value if value is not None else ""
        for date_field in ["booking_date", "ship_date", "expected_delivery_date"]:
            if shipment_data.get(date_field) and hasattr(shipment_data[date_field], "strftime"):
                shipment_data[date_field] = shipment_data[date_field].strftime("%d-%m-%Y")
        if getattr(settings, "LR_LOGO_PATH", None):
            shipment_data["logo_path"] = settings.LR_LOGO_PATH
        if getattr(settings, "QR_CODE_PATH", None):
            shipment_data["qr_path"] = settings.QR_CODE_PATH

        PDFService = get_pdf_service()
        if PDFService is None:
            raise HTTPException(status_code=503, detail="PDF generation is not available")

        fd, file_path = tempfile.mkstemp(suffix=".pdf", prefix="lr_print_")
        try:
            os.close(fd)
            PDFService.generate_shipment_pdf(shipment_data, file_path, copy=copy)
            if not os.path.isfile(file_path):
                raise HTTPException(status_code=500, detail="PDF was not created")
            _send_file_to_system_printer(file_path)
            logger.info("Print sent for shipment %s copy=%s", id, copy)
        finally:
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except OSError:
                pass

        return {"ok": True, "message": "Sent to printer"}
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except subprocess.CalledProcessError as e:
        logger.error("Print command failed: %s", e.stderr or e)
        raise HTTPException(
            status_code=500,
            detail="Print command failed. On Linux/macOS ensure 'lp' (CUPS) is installed and a printer is set.",
        )
    except OSError as e:
        logger.error("Print failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Print failed: {e}")
    except Exception as e:
        logger.error("Print direct error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Print failed: {str(e)}")


POD_UPLOAD_DIR = os.path.abspath("pod_uploads")
os.makedirs(POD_UPLOAD_DIR, exist_ok=True)


@router.post("/{id}/pod", response_model=ShipmentResponse)
def upload_pod(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload up to 15 proof of delivery (POD) documents for a shipment in one request.
    Re-upload overwrites any existing POD files for this shipment.
    """
    shipment = db.query(Shipment).filter(Shipment.id == id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    _ensure_can_access_shipment(shipment, current_user)

    if not files:
        raise HTTPException(status_code=400, detail="At least one POD file is required")
    if len(files) > 15:
        raise HTTPException(status_code=400, detail="You can upload a maximum of 15 POD files at a time")

    # Remove existing POD records and files
    existing_files = db.query(ShipmentFile).filter(
        ShipmentFile.shipment_id == id, ShipmentFile.file_type == "POD"
    ).all()
    for sf in existing_files:
        try:
            if sf.file_path and os.path.exists(sf.file_path):
                os.remove(sf.file_path)
        except OSError:
            pass
        db.delete(sf)

    # Save new files
    lr_safe = (shipment.lr_no or "").replace("/", "_").replace("\\", "_")
    for idx, uf in enumerate(files, start=1):
        if not uf.filename:
            continue
        ext = uf.filename.split(".")[-1] or "bin"
        safe_name = f"{shipment.id}_{lr_safe}_pod_{idx}.{ext}"
        file_path = os.path.join(POD_UPLOAD_DIR, safe_name)
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(uf.file, buf)
        sf = ShipmentFile(shipment_id=id, file_type="POD", file_path=file_path)
        db.add(sf)

    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/{id}/pod/download")
def download_pod(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Download POD (Proof of Delivery) document for a shipment.
    Admin/Manager/Owner: any shipment they can access. Operator: own shipments only.
    """
    import logging
    logger = logging.getLogger(__name__)

    shipment = db.query(Shipment).filter(Shipment.id == id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    _ensure_can_access_shipment(shipment, current_user)
    pod_file = db.query(ShipmentFile).filter(
        ShipmentFile.shipment_id == id,
        ShipmentFile.file_type == "POD"
    ).first()
    
    if not pod_file:
        raise HTTPException(status_code=404, detail="POD document not found for this shipment")
    
    # Check if file exists
    if not os.path.exists(pod_file.file_path):
        logger.error(f"POD file path does not exist: {pod_file.file_path}")
        raise HTTPException(status_code=404, detail=f"POD file not found at: {pod_file.file_path}")
    
    # Check file size
    file_size = os.path.getsize(pod_file.file_path)
    if file_size == 0:
        logger.error(f"POD file is empty: {pod_file.file_path}")
        raise HTTPException(status_code=500, detail="POD file is empty or corrupted")
    
    # Detect file type from extension and content
    filename = os.path.basename(pod_file.file_path)
    file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    # Determine MIME type based on extension
    mime_types = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'webp': 'image/webp',
    }
    
    media_type = mime_types.get(file_ext, 'application/octet-stream')
    
    # Verify file type by checking first few bytes
    try:
        with open(pod_file.file_path, "rb") as f:
            first_bytes = f.read(8)
            
            # PDF files start with %PDF
            if first_bytes[:4] == b'%PDF':
                media_type = 'application/pdf'
                if not filename.lower().endswith('.pdf'):
                    filename = f"{shipment.lr_no.replace('/', '_')}_pod.pdf"
            # PNG files start with PNG signature
            elif first_bytes[:8] == b'\x89PNG\r\n\x1a\n':
                media_type = 'image/png'
                if not filename.lower().endswith('.png'):
                    filename = f"{shipment.lr_no.replace('/', '_')}_pod.png"
            # JPEG files start with FF D8
            elif first_bytes[:2] == b'\xff\xd8':
                media_type = 'image/jpeg'
                if not filename.lower().endswith(('.jpg', '.jpeg')):
                    filename = f"{shipment.lr_no.replace('/', '_')}_pod.jpg"
            else:
                logger.warning(f"Unknown file type for POD: {pod_file.file_path}. First bytes: {first_bytes[:8]}")
                # Use detected MIME type from extension or default
    except Exception as e:
        logger.error(f"Error reading POD file: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading POD file: {str(e)}")
    
    # URL encode filename for Content-Disposition header (RFC 5987)
    encoded_filename = urllib.parse.quote(filename, safe='')
    
    logger.info(f"Serving POD file: {pod_file.file_path} (size: {file_size} bytes, type: {media_type})")
    
    return FileResponse(
        pod_file.file_path,
        media_type=media_type,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "Content-Length": str(file_size)
        }
    )


@router.get("/{id}/pod/download-all")
def download_all_pods(
    *,
    db: Session = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Download all POD documents for a shipment as a single ZIP file.
    """
    import logging
    logger = logging.getLogger(__name__)

    shipment = db.query(Shipment).filter(Shipment.id == id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    _ensure_can_access_shipment(shipment, current_user)

    pod_files = db.query(ShipmentFile).filter(
        ShipmentFile.shipment_id == id,
        ShipmentFile.file_type == "POD",
    ).all()

    if not pod_files:
        raise HTTPException(status_code=404, detail="No POD documents found for this shipment")

    buf = io.BytesIO()
    lr_safe = (shipment.lr_no or str(shipment.id)).replace("/", "_").replace("\\", "_")
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for sf in pod_files:
            if not sf.file_path or not os.path.exists(sf.file_path):
                continue
            arc_name = os.path.basename(sf.file_path)
            # Prefix with LR no for clarity inside the zip
            arc_name = f"{lr_safe}_{arc_name}"
            zf.write(sf.file_path, arc_name)
    buf.seek(0)

    zip_name = f"{lr_safe}_pods.zip"
    encoded = urllib.parse.quote(zip_name, safe="")
    logger.info(f"Serving POD ZIP for shipment {shipment.id}: {zip_name}")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_name}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@router.get("/export/excel")
def export_shipments(
    db: Session = Depends(get_db),
    my_only: bool = False,
    period: Optional[str] = Query(None, description="month, 3months, half_yearly, 2years, 3years"),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Export shipments to Excel. Use my_only=True for user portal (own shipments only).
    Optional period filter: month (use year+month), 3months, half_yearly, 2years, 3years.
    Monthly export filename is e.g. January_2026.xlsx.
    """
    from app.services.excel_service import ExcelService

    query = db.query(Shipment)
    if my_only or current_user.role == UserRole.OPERATOR:
        query = query.filter(Shipment.created_by_id == current_user.id)

    filename_base = "my_shipments_export" if (my_only or current_user.role == UserRole.OPERATOR) else "shipments_export"
    if period:
        start_dt, end_dt, period_name = _period_to_date_range(period, year=year, month=month)
        query = query.filter(Shipment.created_at >= start_dt, Shipment.created_at <= end_dt)
        filename_base = period_name if (not my_only and current_user.role != UserRole.OPERATOR) else f"my_{period_name}"

    shipments = query.order_by(Shipment.created_at.desc()).all()

    data = []
    for s in shipments:
        row = {c.name: getattr(s, c.name) for c in s.__table__.columns}
        for date_field in ['booking_date', 'ship_date', 'expected_delivery_date', 'eta', 'actual_delivery_date', 'created_at', 'updated_at']:
            if row.get(date_field):
                row[date_field] = str(row[date_field])
        data.append(row)

    try:
        excel_buffer = ExcelService.generate_shipment_excel(data)
        filename = filename_base + ".xlsx" if not filename_base.lower().endswith(".xlsx") else filename_base
        
        # Sanitize filename for header
        safe_header_filename = filename.replace('"', '\\"').replace('\n', '').replace('\r', '')
        # URL encode the filename for RFC 5987 format
        encoded_filename = urllib.parse.quote(filename, safe='')
        
        # Set Content-Disposition header with both standard and RFC 5987 formats
        content_disposition = f'attachment; filename="{safe_header_filename}"; filename*=UTF-8\'\'{encoded_filename}'
        
        # Ensure .xlsx extension and correct MIME type for Excel 2007+ format
        return Response(
            content=excel_buffer.read(),
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                "Content-Disposition": content_disposition,
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
def export_shipments_csv(
    db: Session = Depends(get_db),
    my_only: bool = False,
    period: Optional[str] = Query(None, description="month, 3months, half_yearly, 2years, 3years"),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Export shipments to CSV. Optional period filter: month (year+month), 3months, half_yearly, 2years, 3years.
    """
    from app.services.excel_service import ExcelService

    query = db.query(Shipment)
    if my_only or current_user.role == UserRole.OPERATOR:
        query = query.filter(Shipment.created_by_id == current_user.id)

    filename_base = "my_shipments_export" if (my_only or current_user.role == UserRole.OPERATOR) else "shipments_export"
    if period:
        start_dt, end_dt, period_name = _period_to_date_range(period, year=year, month=month)
        query = query.filter(Shipment.created_at >= start_dt, Shipment.created_at <= end_dt)
        filename_base = period_name if (not my_only and current_user.role != UserRole.OPERATOR) else f"my_{period_name}"

    shipments = query.order_by(Shipment.created_at.desc()).all()

    data = []
    for s in shipments:
        row = {c.name: getattr(s, c.name) for c in s.__table__.columns}
        for date_field in ['booking_date', 'ship_date', 'expected_delivery_date', 'eta', 'actual_delivery_date', 'created_at', 'updated_at']:
            if row.get(date_field):
                row[date_field] = str(row[date_field])
        data.append(row)

    try:
        csv_buffer = ExcelService.generate_shipment_csv(data)
        filename = filename_base + ".csv" if not filename_base.lower().endswith(".csv") else filename_base
        
        # Sanitize filename for header
        safe_header_filename = filename.replace('"', '\\"').replace('\n', '').replace('\r', '')
        # URL encode the filename for RFC 5987 format
        encoded_filename = urllib.parse.quote(filename, safe='')
        
        # Set Content-Disposition header with both standard and RFC 5987 formats
        content_disposition = f'attachment; filename="{safe_header_filename}"; filename*=UTF-8\'\'{encoded_filename}'
        
        # CSV MIME type
        return Response(
            content=csv_buffer.read(),
            media_type='text/csv',
            headers={
                "Content-Disposition": content_disposition,
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
