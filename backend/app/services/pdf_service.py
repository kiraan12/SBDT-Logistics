"""
Production-ready LR (Lorry Receipt) PDF service for SBDT LOGISTICS.
Table-based A4 layout with BOOKING COPY, PROOF OF DELIVERY, and OFFICE COPY (3 copies per sheet),
dotted line between sections. Uses reportlab platypus (Table, TableStyle, Paragraph, Spacer).
"""
from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path
from datetime import datetime, date
from typing import Any, Dict, List, Optional

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
    PageBreak,
)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────
COMPANY_NAME = "SBDT LOGISTICS"
COMPANY_NAME_SHORT = "SBDT"
COMPANY_ADDRESS = "Venkateshappa Building, Mutturayappa Estate, Bommasandra Indl. Area, Hosur Road, Bangalore - 560 099"
QR_LABEL = "(Scan QR for Terms & Conditions)"
COPY_NAMES = ["BOOKING COPY", "PROOF OF DELIVERY", "OFFICE COPY"]  # 3 copies per sheet
FONT_HEADER = "Helvetica-Bold"
FONT_BODY = "Helvetica"
SIZE_HEADER = 10
SIZE_BODY = 8
PAGE_MARGIN = 4 * mm  # extra-tight margins so 3 copies fit on 1 A4 sheet
CONTENT_WIDTH = 210 * mm - 2 * PAGE_MARGIN  # A4 minus margins
GRID_COLOR = colors.black
QR_SIZE_MM = 14
LOGO_HEIGHT_MM = 10
SIZE_HEADER_SMALL = 9
SIZE_BODY_SMALL = 7
SIZE_ADDRESS_GST = 6
SPACER_AFTER_TITLE = 1 * mm
SPACER_AFTER_HEADER = 1.5 * mm
SPACER_AFTER_BODY = 1.0 * mm
SPACER_BETWEEN_COPIES = 0.6 * mm  # minimal so 3 copies fit on 1 page
SPACER_SIGNATURE = 0.5 * mm
SIGNATURE_ROW_MM_ONE_PAGE = 14  # signature height when all 3 copies on one page (compact)
SIGNATURE_ROW_MM_SINGLE = 38     # more space for Receiver's Signature & Stamp (single copy)
# Logo/QR in header (compact for 3 copies per page)
LOGO_PATH: Optional[str] = None
LOGO_HEIGHT_POD_MM = 16  # logo size in header (compact for one page)
QR_SIZE_POD_MM = 18     # QR size in header (compact for one page)
BORDER_FRAME_PT = 0.5
HEADER_BG = colors.HexColor("#f5f5f5")  # subtle header background

# Reusable styles/flowables for signature section (built once for speed)
_SIGNATURE_HEADER_STYLE = ParagraphStyle(
    name="SigHeader", fontName=FONT_BODY, fontSize=SIZE_BODY
)
_SIGNATURE_BLANK_HTML = "<br/><br/>"
_SIGNATURE_TABLE_STYLE = TableStyle([
    ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
    ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
    ("LEFTPADDING", (0, 0), (-1, -1), 3),
    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fafafa")),
])


def _safe_val(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%d-%m-%Y")
    return str(v).strip()


def _truncate_html_lines(html: str, max_lines: int) -> str:
    """
    Truncate a <br/>-separated string to at most max_lines, adding "..." if truncated.
    Used only in compact (3-copies-per-page) mode to keep rows from growing too tall.
    """
    parts = html.split("<br/>")
    if len(parts) <= max_lines:
        return html
    kept = parts[:max_lines]
    if kept:
        kept[-1] = kept[-1] + " ..."
    return "<br/>".join(kept)


def _bold_first_line(html: str) -> str:
    """Make the main company line bold.
    - Splits on <br/> and finds the first line that looks like a name
      (skips lines like 'GSTIN: 32AAAC6463J1Z7', etc.).
    - Strips common prefixes like 'Bill To', 'Consignee', etc.
    """
    if not html or not html.strip():
        return html

    lines = [part.strip() for part in html.split("<br/>")]
    if not any(lines):
        return html

    prefixes = (
        "bill to", "billed to", "bill from", "dispatch from",
        "consignee", "receiver", "ship to",
    )

    def clean_label(s: str) -> str:
        """Remove leading labels and trailing GSTIN-like codes from a line."""
        lower = s.lower()
        for p in prefixes:
            if lower.startswith(p):
                s = s[len(p):].lstrip(" :.-")
                lower = s.lower()
                break
        s = s.strip()
        if not s:
            return s
        # If line contains a GSTIN-like token (e.g. '32AAAC6463J1Z7'), keep only text before it.
        parts = s.split()
        cut_index = len(parts)
        for i, part in enumerate(parts):
            token = part.strip(":-")
            if len(token) >= 12 and token.replace(" ", "").isalnum():
                cut_index = i
                break
        if cut_index < len(parts):
            s = " ".join(parts[:cut_index]).strip(" ,;-")
        return s.strip()

    bold_idx = None
    for idx, raw in enumerate(lines):
        if not raw:
            continue
        lower = raw.lower()
        # Skip GST/ID-like lines
        if "gstin" in lower or "gst in" in lower:
            continue
        cleaned = clean_label(raw)
        if not cleaned:
            continue
        # Skip pure codes like '32AAAC6463J1Z7' (no spaces, long alnum)
        if cleaned.replace(" ", "").isalnum() and " " not in cleaned and len(cleaned) >= 10:
            continue
        bold_idx = idx
        lines[idx] = f"<b>{cleaned}</b>"
        break

    if bold_idx is None:
        return html

    return "<br/>".join(lines)


def _normalize_shipment_data(shipment_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Map API/DB keys to the LR PDF field names.
    Accepts both the spec structure and the existing shipment model keys.
    """
    d = shipment_data or {}
    get = lambda *keys: next((_safe_val(d.get(k)) for k in keys if _safe_val(d.get(k))), "")

    # Dates
    pickup = get("pickup_date", "booking_date")
    ship = get("ship_date")
    if not pickup and ship:
        pickup = ship

    # Always prefer "name + address" for LR display instead of name-only
    consignor_name = get("consigner", "consignor_name")
    consignor_addr = get("consignor_address")
    consigner_parts = [p for p in (consignor_name, consignor_addr) if p]
    consigner = "\n".join(consigner_parts)

    consignee_name = get("consignee", "consignee_name")
    consignee_addr = get("consignee_address")
    consignee_parts = [p for p in (consignee_name, consignee_addr) if p]
    consignee = "\n".join(consignee_parts)
    origin = get("source", "service_lane", "booking_branch")
    destination = get("destination", "dest_pincode")
    expected_delivery = get("expected_delivery_date")
    if not expected_delivery and ship:
        expected_delivery = ship

    return {
        "lr_no": get("lr_no"),
        "booking_branch": get("booking_branch", "branch_name"),
        "pickup_date": pickup,
        "ship_date": ship,
        "vehicle_no": get("vehicle_no"),
        "service_lane": get("service_lane", "source", "remarks"),
        "consigner": consigner,
        "consignee": consignee,
        "origin": origin,
        "destination": destination,
        "expected_delivery": expected_delivery,
        "remarks": get("remarks"),
        "dest_pincode": get("dest_pincode", "destination"),
        "no_packages": get("no_packages", "boxes"),
        "actual_weight": get("actual_weight", "weight"),
        "packing_type": get("packing_type", "shipment_type"),
        "invoice_value": get("invoice_value"),
        "invoice_list": get("invoice_list", "inv_no"),
        "tracking_url": get("tracking_url", "qr_payload"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POD-style layout (Proof of Delivery format: title, SBDT, address, table, signature)
# ─────────────────────────────────────────────────────────────────────────────

def _pod_style_table(compact: bool = False) -> TableStyle:
    """Clean table style for LR (compact for 3 copies per page)."""
    font_size = max(SIZE_BODY_SMALL - (2 if compact else 0), 5)
    top_pad = 2 if compact else 3
    bottom_pad = 2 if compact else 3
    style = TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cccccc")),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 if compact else 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 if compact else 4),
        ("TOPPADDING", (0, 0), (-1, -1), top_pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), bottom_pad),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
    ])
    if compact:
        # Make the first row (LR No / Date) extra thin in compact mode.
        style.add("TOPPADDING", (0, 0), (-1, 0), 1)
        style.add("BOTTOMPADDING", (0, 0), (-1, 0), 1)
        style.add("FONTSIZE", (0, 0), (-1, 0), max(font_size - 1, 5))
    return style


def _resolve_logo_path(logo_path: Optional[str]) -> Optional[str]:
    """Resolve relative logo/QR path to an absolute path that exists. Returns None if not found."""
    if not logo_path or not logo_path.strip():
        return None
    logo_path = logo_path.strip()
    if os.path.isabs(logo_path) and os.path.isfile(logo_path):
        return logo_path
    # Backend dir: pdf_service.py -> app/services -> app -> backend
    _backend_dir = Path(__file__).resolve().parent.parent.parent
    base_name = Path(logo_path).stem  # e.g. qr_code or logo
    # Strip leading "backend/" so backend/static/qr_code.png -> static/qr_code.png
    path_without_backend = logo_path.replace("backend/", "").replace("backend\\", "")
    candidates = [
        Path(logo_path),
        Path(os.getcwd()) / logo_path,
        _backend_dir / logo_path,
        _backend_dir / path_without_backend,
        _backend_dir / "static" / Path(logo_path).name,
        _backend_dir / "static" / (base_name + ".jpeg"),
        _backend_dir / "static" / (base_name + ".jpg"),
        _backend_dir / "static" / (base_name + ".png"),
    ]
    for p in candidates:
        if p.is_file():
            return str(p)
    return None


def _load_logo_flowable(logo_path: Optional[str]) -> Optional[Image]:
    """Load logo image as a flowable if path exists. Returns None if not found or invalid."""
    resolved = _resolve_logo_path(logo_path) if logo_path else None
    if not resolved or not os.path.isfile(resolved):
        return None
    try:
        from reportlab.lib.utils import ImageReader
        w, h = ImageReader(resolved).getSize()
        if not w or not h:
            return None
        height_pt = LOGO_HEIGHT_POD_MM * (72 / 25.4)
        width_pt = (w / h) * height_pt
        return Image(resolved, width=width_pt, height=height_pt)
    except Exception:
        return None


def _load_qr_image_flowable(qr_path: Optional[str]) -> Optional[Image]:
    """Load QR code image as a flowable if path exists. Returns None if not found or invalid."""
    resolved = _resolve_logo_path(qr_path) if qr_path else None
    if not resolved or not os.path.isfile(resolved):
        return None
    try:
        from reportlab.lib.utils import ImageReader
        w, h = ImageReader(resolved).getSize()
        if not w or not h:
            return None
        height_pt = QR_SIZE_POD_MM * (72 / 25.4)
        width_pt = (w / h) * height_pt
        return Image(resolved, width=width_pt, height=height_pt)
    except Exception:
        return None


def _build_pod_header(
    copy_name: str,
    logo_path: Optional[str] = None,
    qr_path: Optional[str] = None,
    lr_no: Optional[str] = None,
    ship_date: Optional[str] = None,
    company_address: Optional[str] = None,
    gst_number: Optional[str] = None,
    one_page: bool = False,
) -> List:
    """Header: copy title, then [Logo | Address + GST (small)] (left) | LR No (center) | QR (right)."""
    story = []
    title_font = 10 if one_page else 13
    title_style = ParagraphStyle(
        name="PodTitle",
        fontName=FONT_HEADER,
        fontSize=title_font,
        alignment=1,
        spaceAfter=2 if one_page else 3,
        textColor=colors.HexColor("#1a1a1a"),
    )
    story.append(Paragraph(copy_name, title_style))
    logo_img = _load_logo_flowable(logo_path)
    qr_img = _load_qr_image_flowable(qr_path)
    # Address + GST in small font (beside logo)
    address = (company_address or COMPANY_ADDRESS).strip()
    gst = (gst_number or "").strip().upper()
    address_gst_parts = []
    if address:
        address_gst_parts.append(address)
    if gst:
        address_gst_parts.append(f"GST: {gst}")
    address_gst_text = "<br/>".join(address_gst_parts) if address_gst_parts else ""
    address_gst_para = Paragraph(
        address_gst_text,
        ParagraphStyle(
            name="AddressGst",
            fontName=FONT_BODY,
            fontSize=SIZE_ADDRESS_GST,
            alignment=2,
            textColor=colors.HexColor("#333333"),
        ),
    ) if address_gst_text else None
    # Left cell: logo beside address+GST; logo has enough width to avoid overlap with address
    w_left = CONTENT_WIDTH * 0.35
    w_center = CONTENT_WIDTH * 0.3
    w_right = CONTENT_WIDTH * 0.35
    logo_w = 32 * mm  # enough for logo; gap so address does not overlap
    gap_pt = 8
    if logo_img is not None and address_gst_para is not None:
        left_inner = Table(
            [[logo_img, address_gst_para]],
            colWidths=[logo_w, w_left - logo_w - gap_pt],
        )
        left_inner.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (0, 0), 0),
            ("RIGHTPADDING", (0, 0), (0, 0), gap_pt),
            ("LEFTPADDING", (1, 0), (1, 0), gap_pt),
            ("RIGHTPADDING", (1, 0), (1, 0), 4),
        ]))
        left_cell = left_inner
    elif logo_img is not None:
        left_cell = logo_img
    elif address_gst_para is not None:
        left_cell = address_gst_para
    else:
        left_cell = Paragraph("SBDT LOGISTICS", ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=14, alignment=0))
    # Center: LR No (bold) with Ship date below
    lr_font = 11 if one_page else 14
    if ship_date:
        ship_font = max(lr_font - 3, 7)
        lr_text = f"<b>LR No: {lr_no or '—'}</b><br/><font size='{ship_font}'><b>Ship date: {ship_date}</b></font>"
    else:
        lr_text = f"<b>LR No: {lr_no or '—'}</b>"
    lr_para = Paragraph(
        lr_text,
        ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=lr_font, alignment=1, leading=lr_font + 2),
    )
    # Header row: [Logo | Address+GST] (left) | LR No (center) | QR + "Scan for T&C" (right)
    if qr_img is not None:
        scan_label = Paragraph(
            "Scan for T&C",
            ParagraphStyle(
                name="QRScanLabel",
                fontName=FONT_BODY,
                fontSize=6,
                alignment=1,
                textColor=colors.HexColor("#555555"),
                spaceBefore=1,
                spaceAfter=0,
            ),
        )
        qr_cell = Table([[qr_img], [scan_label]], colWidths=[w_right])
        qr_cell.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        row0 = [left_cell, lr_para, qr_cell]
        col_widths = [w_left, w_center, w_right]
    else:
        row0 = [left_cell, lr_para]
        col_widths = [w_left, CONTENT_WIDTH - w_left]
    header_box = Table([row0], colWidths=col_widths)
    pad_x = 6 if one_page else 8
    pad_y = 4 if one_page else 6
    style_commands = [
        ("BOX", (0, 0), (-1, -1), 0.75, GRID_COLOR),
        ("BACKGROUND", (0, 0), (-1, -1), HEADER_BG),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), pad_x),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad_x),
        ("TOPPADDING", (0, 0), (-1, -1), pad_y),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad_y),
    ]
    if qr_img is not None:
        style_commands.append(("ALIGN", (2, 0), (2, 0), "RIGHT"))
    header_box.setStyle(TableStyle(style_commands))
    story.append(header_box)
    story.append(Spacer(1, (1.5 if one_page else 3) * mm))
    return story


def _build_pod_main_table(data: Dict[str, str], compact: bool = False) -> Table:
    """Main info table (compact for 3 copies per page)."""
    base_size = max(SIZE_BODY_SMALL - (2 if compact else 0), 5)
    style_b = ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=base_size)
    style_v = ParagraphStyle(name="", fontName=FONT_BODY, fontSize=base_size)
    consigner = (data.get("consigner") or "—").replace("\n", "<br/>")
    consignee = (data.get("consignee") or "—").replace("\n", "<br/>")
    origin = data.get("origin") or "—"
    destination = data.get("destination") or "—"
    # Bold the main company name (first line) in both Consignor and Consignee
    consigner = _bold_first_line(consigner)
    consignee = _bold_first_line(consignee)
    # One column: Consignor + Origin (no sub-labels); one column: Consignee + Destination
    consignor_origin = f"{consigner}<br/>{origin}"
    consignee_dest = f"{consignee}<br/>{destination}"
    if compact:
        # In 3-copy (one_page) layout, cap lines so very long addresses don't push to 2 pages.
        # Consignor: allow more lines so it doesn't look too short; consignee often the longest.
        consignor_origin = _truncate_html_lines(consignor_origin, max_lines=7)
        consignee_dest = _truncate_html_lines(consignee_dest, max_lines=5)
    date_val = data.get("ship_date") or data.get("pickup_date") or "—"
    inv_val = data.get("invoice_value") or "—"
    if inv_val != "—" and str(inv_val).replace(".", "").isdigit():
        inv_val = str(inv_val)
    rows = [
        [
            Paragraph("<b>LR No</b>", style_b), Paragraph(data.get("lr_no") or "—", style_v),
            Paragraph("<b>Date</b>", style_b), Paragraph(date_val, style_v),
        ],
        [
            Paragraph("<b>Consignor / Origin</b>", style_b), Paragraph(consignor_origin, style_v),
            Paragraph("<b>Consignee / Destination</b>", style_b), Paragraph(consignee_dest, style_v),
        ],
        [
            Paragraph("<b>Boxes</b>", style_b), Paragraph(data.get("no_packages") or "—", style_v),
            Paragraph("<b>Weight (Kg)</b>", style_b), Paragraph(data.get("actual_weight") or "—", style_v),
        ],
        [
            Paragraph("<b>Invoice No</b>", style_b), Paragraph(data.get("invoice_list") or "—", style_v),
            Paragraph("<b>Inv Value</b>", style_b), Paragraph(inv_val, style_v),
        ],
        [
            Paragraph("<b>Type</b>", style_b), Paragraph(data.get("packing_type") or "—", style_v),
            Paragraph("<b>Vehicle No</b>", style_b), Paragraph(data.get("vehicle_no") or "—", style_v),
        ],
        [
            Paragraph("<b>Exp. Delivery</b>", style_b), Paragraph(data.get("expected_delivery") or "—", style_v),
            Paragraph("<b>Remarks</b>", style_b), Paragraph(data.get("remarks") or "—", style_v),
        ],
    ]
    # For the 3-copies-on-one-page layout, LR No and Date are already shown
    # prominently in the header, so we drop the first row to save vertical space.
    if compact:
        rows = rows[1:]
    w1, w2 = CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.3  # label, value (each half = 50%)
    t = Table(rows, colWidths=[w1, w2, w1, w2])
    t.setStyle(_pod_style_table(compact=compact))
    return t


def _build_pod_signature_footer(row_space_mm: float = 28, compact: bool = False) -> Table:
    """Footer: space for Receiver's Signature & Stamp | Date & Time (POD and Office copy)."""
    style = ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=6 if compact else 8)
    blank_left = Paragraph(" ", ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY))
    blank_right = Paragraph(" ", ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY))
    data = [
        [Paragraph("<b>Receiver's Signature & Stamp</b>", style), Paragraph("<b>Date & Time</b>", style)],
        [blank_left, blank_right],
    ]
    col_w = CONTENT_WIDTH / 2
    row_heading_pt = 7 if compact else 9   # smaller heading row
    row_space_pt = row_space_mm * mm
    t = Table(data, colWidths=[col_w, col_w], rowHeights=[row_heading_pt, row_space_pt])
    pad = 4 if compact else 6
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, GRID_COLOR),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, GRID_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), 2 if compact else 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 if compact else 6),
        ("TOPPADDING", (0, 0), (-1, 0), 1),   # thinner heading row
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fafafa")),
    ]))
    return t


def _build_one_copy_pod_style(
    data: Dict[str, str],
    copy_name: str,
    is_pod: bool,
    logo_path: Optional[str] = None,
    qr_path: Optional[str] = None,
    company_address: Optional[str] = None,
    gst_number: Optional[str] = None,
    one_page: bool = False,
) -> List:
    """Build one LR copy: header, main table, and Receiver's Signature & Stamp for POD and Office copy."""
    story = []
    lr_no = data.get("lr_no") or ""
    story.extend(_build_pod_header(
        copy_name,
        logo_path=logo_path,
        qr_path=qr_path,
        lr_no=lr_no,
        ship_date=data.get("ship_date") or data.get("pickup_date") or "",
        company_address=company_address,
        gst_number=gst_number,
        one_page=one_page,
    ))
    story.append(_build_pod_main_table(data, compact=one_page))
    is_office = copy_name == "OFFICE COPY"
    if is_pod or is_office:
        story.append(Spacer(1, SPACER_SIGNATURE))
        sig_height = SIGNATURE_ROW_MM_ONE_PAGE if one_page else SIGNATURE_ROW_MM_SINGLE
        story.append(_build_pod_signature_footer(row_space_mm=sig_height, compact=one_page))
    else:
        signatory = (data.get("signatory_name") or "").strip()
        if signatory:
            story.append(Spacer(1, SPACER_SIGNATURE))
            story.append(_build_digital_signatory_line(signatory))
    return story


def _make_qr_image_flowable(tracking_url: str, size_mm: float = QR_SIZE_MM):
    """
    Generate QR code and return a reportlab Image flowable.
    size_mm: side length in mm.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=1,
    )
    qr.add_data(tracking_url or "SBDT")
    qr.make(fit=True)
    img_pil = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    buf.seek(0)
    size_pt = size_mm * (72 / 25.4)  # mm to points
    return Image(buf, width=size_pt, height=size_pt)


def _build_header_left(tracking_url: str) -> Table:
    """Left block: SBDT LOGO (text), QR, and label."""
    qr_img = _make_qr_image_flowable(tracking_url)
    logo_style = ParagraphStyle(
        name="LRLogo",
        fontName=FONT_HEADER,
        fontSize=12,
        alignment=1,  # center
        spaceAfter=2,
    )
    label_style = ParagraphStyle(
        name="QRLabel",
        fontName=FONT_BODY,
        fontSize=7,
        alignment=1,
    )
    logo_para = Paragraph(COMPANY_NAME, logo_style)
    label_para = Paragraph(QR_LABEL, label_style)
    # Single column table: logo, qr, label
    data = [[logo_para], [qr_img], [label_para]]
    t = Table(data, colWidths=[QR_SIZE_MM * mm * 1.2])
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _build_header_right(data: Dict[str, str]) -> Table:
    """Right header grid: LR.NO, then Branch|PickUp|Ship|Vehicle, then Service Lane."""
    style = ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY)
    full_data = [
        [Paragraph("<b>LR.NO</b>", style), data["lr_no"], "", ""],
        [
            Paragraph("<b>Booking Branch</b><br/>" + data["booking_branch"], style),
            Paragraph("<b>PickUp Date</b><br/>" + data["pickup_date"], style),
            Paragraph("<b>Ship Date</b><br/>" + data["ship_date"], style),
            Paragraph("<b>Vehicle No</b><br/>" + data["vehicle_no"], style),
        ],
        [Paragraph("<b>Service Lane</b><br/>" + data["service_lane"], style), "", "", ""],
    ]
    tw = (CONTENT_WIDTH - QR_SIZE_MM * mm * 1.4) / 4  # right grid width / 4 cols
    t = Table(full_data, colWidths=[tw, tw, tw, tw])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("FONTSIZE", (0, 0), (-1, -1), SIZE_BODY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _build_header_row(data: Dict[str, str], tracking_url: str) -> Table:
    """Full header: left block (logo+QR) and right grid side by side."""
    left = _build_header_left(tracking_url)
    right = _build_header_right(data)
    # One row, two cells
    t = Table([[left, right]], colWidths=[QR_SIZE_MM * mm * 1.4, CONTENT_WIDTH - QR_SIZE_MM * mm * 1.4])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("LEFTPADDING", (1, 0), (1, -1), 4),
    ]))
    return t


def _build_main_body(data: Dict[str, str]) -> Table:
    """Two large columns: Consigner (left), Consignee (right)."""
    style = ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY)
    consigner_html = _bold_first_line((data.get("consigner") or "—").replace("\n", "<br/>"))
    consignee_html = _bold_first_line((data.get("consignee") or "—").replace("\n", "<br/>"))
    consigner = Paragraph(consigner_html, style)
    consignee = Paragraph(consignee_html, style)
    body_width = CONTENT_WIDTH - 72 * mm  # leave room for right panel
    half = body_width / 2
    t = Table([
        [Paragraph("<b>CONSIGNER</b>", ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=SIZE_HEADER)), Paragraph("<b>CONSIGNEE</b>", ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=SIZE_HEADER))],
        [consigner, consignee],
    ], colWidths=[half, half])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#e8e8e8")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#e8e8e8")),
    ]))
    return t


def _build_right_panel(data: Dict[str, str]) -> Table:
    """Stacked: Dest.Pincode, No.OfPackages, Actual Weight, Packing Type."""
    style_lab = ParagraphStyle(name="", fontName=FONT_HEADER, fontSize=SIZE_BODY)
    style_val = ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY)
    rows = [
        [Paragraph("Dest.Pincode", style_lab), Paragraph(data["dest_pincode"], style_val)],
        [Paragraph("No.OfPackages", style_lab), Paragraph(data["no_packages"], style_val)],
        [Paragraph("Actual Weight", style_lab), Paragraph(data["actual_weight"], style_val)],
        [Paragraph("Packing Type", style_lab), Paragraph(data["packing_type"], style_val)],
    ]
    t = Table(rows, colWidths=[35 * mm, 35 * mm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _build_bottom_row(data: Dict[str, str]) -> Table:
    """Value / No Of Invoice ₹ and Invoices List."""
    style = ParagraphStyle(name="", fontName=FONT_BODY, fontSize=SIZE_BODY)
    val_inv = data["invoice_value"] or ""
    if data["invoice_list"]:
        val_inv = f"₹ {val_inv} / {data['invoice_list']}" if val_inv else data["invoice_list"]
    elif val_inv:
        val_inv = f"₹ {val_inv}"
    val_para = Paragraph(f"<b>Value / No Of Invoice</b><br/>₹ {data['invoice_value'] or '—'}", style)
    inv_para = Paragraph(f"<b>Invoices List</b><br/>{data['invoice_list'] or '—'}", style)
    bw = CONTENT_WIDTH / 2
    t = Table([[val_para, inv_para]], colWidths=[bw, bw])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _build_signature_section() -> Table:
    """POD copy: Sign | Name | Stamp | Date and blank area for manual signing."""
    header = [
        Paragraph("<b>Sign</b>", _SIGNATURE_HEADER_STYLE),
        Paragraph("<b>Name</b>", _SIGNATURE_HEADER_STYLE),
        Paragraph("<b>Stamp</b>", _SIGNATURE_HEADER_STYLE),
        Paragraph("<b>Date</b>", _SIGNATURE_HEADER_STYLE),
    ]
    blanks = [Paragraph(_SIGNATURE_BLANK_HTML, _SIGNATURE_HEADER_STYLE) for _ in range(4)]
    t = Table(
        [header, blanks],
        colWidths=[45 * mm, 45 * mm, 45 * mm, 45 * mm],
    )
    t.setStyle(_SIGNATURE_TABLE_STYLE)
    return t


def _build_digital_signatory_line(signatory_name: str) -> Table:
    """Digital LR sign: Authorised Signatory name and date (for booking/office copies)."""
    from datetime import date as date_type
    today = date_type.today().strftime("%d-%m-%Y")
    style = ParagraphStyle(name="DigSign", fontName=FONT_BODY, fontSize=SIZE_BODY)
    left = Paragraph(f"<b>Authorised Signatory</b><br/>{signatory_name}", style)
    right = Paragraph(f"<b>Date</b><br/>{today}", style)
    t = Table([[left, right]], colWidths=[CONTENT_WIDTH * 0.7, CONTENT_WIDTH * 0.3])
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOX", (0, 0), (-1, -1), 0.5, GRID_COLOR),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
    ]))
    return t


def _build_one_copy(
    data: Dict[str, str],
    copy_name: str,
    tracking_url: str,
    is_pod: bool,
) -> List:
    """Build flowables for one LR copy section (compact for 3 copies on 1 sheet)."""
    story = []
    # Copy title – compact
    title_style = ParagraphStyle(
        name="CopyTitle",
        fontName=FONT_HEADER,
        fontSize=SIZE_HEADER_SMALL,
        alignment=1,
        spaceAfter=0,
    )
    story.append(Paragraph(copy_name, title_style))
    story.append(Spacer(1, SPACER_AFTER_TITLE))

    # Header row (logo+QR | right grid)
    story.append(_build_header_row(data, tracking_url))
    story.append(Spacer(1, SPACER_AFTER_HEADER))

    # Main body (Consigner | Consignee) and right panel side by side
    body = _build_main_body(data)
    panel = _build_right_panel(data)
    panel_width = 72 * mm
    body_width = CONTENT_WIDTH - panel_width
    row_table = Table([[body, panel]], colWidths=[body_width, panel_width])
    row_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, -1), 4),
    ]))
    story.append(row_table)
    story.append(Spacer(1, SPACER_AFTER_BODY))

    # Bottom row
    story.append(_build_bottom_row(data))

    if is_pod:
        story.append(Spacer(1, SPACER_SIGNATURE))
        story.append(_build_signature_section())

    return story


# Copy type for single-copy PDFs (must match COPY_NAMES order)
COPY_TYPE_BOOKING = "booking"
COPY_TYPE_POD = "pod"
COPY_TYPE_OFFICE = "office"
COPY_TYPE_MAP = {
    COPY_TYPE_BOOKING: COPY_NAMES[0],   # BOOKING COPY
    COPY_TYPE_POD: COPY_NAMES[1],       # PROOF OF DELIVERY
    COPY_TYPE_OFFICE: COPY_NAMES[2],    # OFFICE COPY
}


def generate_lr_pdf(shipment_data: Dict[str, Any], output_path: str, copy: str = "all") -> str:
    """
    Generate a production-ready LR PDF with BOOKING COPY, PROOF OF DELIVERY, and OFFICE COPY
    (3 copies per sheet), dotted line between sections. Table-based layout, print optimized.

    Parameters
    ----------
    shipment_data : dict
        Keys (all optional): lr_no, booking_branch, pickup_date, ship_date,
        vehicle_no, service_lane, consigner, consignee, dest_pincode,
        no_packages, actual_weight, packing_type, invoice_value, invoice_list,
        tracking_url. Also accepts API keys: branch_name, consignor_name,
        consignor_address, consignee_name, consignee_address, destination,
        boxes, weight, inv_no, shipment_type, booking_date, etc.
    output_path : str
        Path where the PDF will be saved.
    copy : str
        "all" (default) = all 3 copies; "booking" | "pod" | "office" = single copy only.

    Returns
    -------
    str
        Absolute path of the generated PDF file.
    """
    data = _normalize_shipment_data(shipment_data)
    try:
        from app.core.config import settings
        if getattr(settings, "DEFAULT_LR_SIGNATORY", None):
            data["signatory_name"] = (settings.DEFAULT_LR_SIGNATORY or "").strip()
    except Exception:
        pass
    lr_no = data["lr_no"] or "SBDT"
    tracking_url = data["tracking_url"]
    if not tracking_url and lr_no:
        tracking_url = lr_no
    data["tracking_url"] = tracking_url

    # Logo path: from shipment_data or module constant; resolve to absolute path
    logo_path = shipment_data.get("logo_path") if isinstance(shipment_data, dict) else None
    if not logo_path and LOGO_PATH:
        logo_path = LOGO_PATH
    logo_path = _resolve_logo_path(logo_path)

    # QR code path: from shipment_data (API sets from settings.QR_CODE_PATH); resolve to absolute path
    qr_path = shipment_data.get("qr_path") if isinstance(shipment_data, dict) else None
    qr_path = _resolve_logo_path(qr_path) if qr_path else None

    # Address and GST for row 0 (small font) on each LR copy
    company_address = COMPANY_ADDRESS
    gst_number = getattr(settings, "SBDT_GST_NUMBER", None) or "29JRTPS8965K1Z3"

    Path(output_path).resolve().parent.mkdir(parents=True, exist_ok=True)

    def _draw_frame_border(canvas, doc):
        """Draw a box around the content area so all copies appear inside one connected frame."""
        canvas.saveState()
        canvas.setStrokeColor(GRID_COLOR)
        canvas.setLineWidth(BORDER_FRAME_PT)
        canvas.rect(doc.leftMargin, doc.bottomMargin, doc.width, doc.height)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        onFirstPage=_draw_frame_border,
        onLaterPages=_draw_frame_border,
    )

    story = []
    one_page = copy not in COPY_TYPE_MAP  # all 3 copies on one page
    if copy in COPY_TYPE_MAP:
        copy_name = COPY_TYPE_MAP[copy]
        is_pod = copy_name == "PROOF OF DELIVERY"
        story.extend(_build_one_copy_pod_style(
            data, copy_name, is_pod,
            logo_path=logo_path, qr_path=qr_path,
            company_address=company_address, gst_number=gst_number,
            one_page=False,
        ))
    else:
        for i, copy_name in enumerate(COPY_NAMES):
            is_pod = copy_name == "PROOF OF DELIVERY"
            story.extend(_build_one_copy_pod_style(
                data, copy_name, is_pod,
                logo_path=logo_path, qr_path=qr_path,
                company_address=company_address, gst_number=gst_number,
                one_page=True,
            ))
            if i < len(COPY_NAMES) - 1:
                story.append(Spacer(1, SPACER_BETWEEN_COPIES))
                dotted = "·  " * 45
                sep_style = ParagraphStyle(name="Sep", fontName=FONT_BODY, fontSize=8, alignment=1)
                story.append(Paragraph(dotted.strip(), sep_style))
                story.append(Spacer(1, SPACER_BETWEEN_COPIES))

    doc.build(story)

    if not os.path.exists(output_path):
        raise RuntimeError(f"PDF was not created at {output_path}")
    return str(Path(output_path).resolve())


# ─────────────────────────────────────────────────────────────────────────────
# API compatibility: PDFService for existing shipment download
# ─────────────────────────────────────────────────────────────────────────────

class PDFService:
    """
    LR PDF generator. Produces A4 PDF with BOOKING COPY, PROOF OF DELIVERY, and OFFICE COPY
    (3 copies per sheet, dotted separator). Table-based layout. No template image required.
    """

    TERMS_URL: Optional[str] = None

    @classmethod
    def generate_shipment_pdf(
        cls,
        shipment_data: Dict[str, Any],
        output_path: str,
        copy: str = "all",
        terms_url: Optional[str] = None,
        qr_size_pt: float = 60.0,
        template_img_path: Optional[str] = None,
    ) -> str:
        """
        Generate the LR PDF and save it to output_path.
        copy: "all" (3 copies), or "booking" | "pod" | "office" for a single copy.
        """
        lr_no = _safe_val(shipment_data.get("lr_no"))
        qr_payload = _safe_val(shipment_data.get("qr_payload"))
        effective_url = terms_url or cls.TERMS_URL
        if not qr_payload:
            if effective_url and lr_no:
                joiner = "&" if "?" in effective_url else "?"
                shipment_data = {**shipment_data, "tracking_url": f"{effective_url}{joiner}lr={lr_no}"}
            else:
                shipment_data = {**shipment_data, "tracking_url": lr_no or "SBDT"}
        else:
            shipment_data = {**shipment_data, "tracking_url": qr_payload}

        return generate_lr_pdf(shipment_data, output_path, copy=copy)


class PDFServiceExactLR:
    """Backwards-compat: delegates to PDFService.generate_shipment_pdf()."""

    @staticmethod
    def generate_lr_pdf_exact(
        shipment_data: Dict[str, Any],
        output_path: str,
        template_img_path: str,
        terms_url: Optional[str] = None,
        qr_size_pt: float = 60.0,
        qr_positions_img_px: Optional[List] = None,
    ) -> str:
        return PDFService.generate_shipment_pdf(
            shipment_data=shipment_data,
            output_path=output_path,
            terms_url=terms_url,
            qr_size_pt=qr_size_pt,
            template_img_path=template_img_path,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Local test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = {
        "lr_no": "LR123456",
        "booking_branch": "Chennai HQ",
        "pickup_date": "01-06-2025",
        "ship_date": "02-06-2025",
        "vehicle_no": "TN01AB1234",
        "service_lane": "Chennai – Mumbai",
        "consigner": "ABC Exports Pvt Ltd\n12 Industrial Area\nChennai 600001",
        "consignee": "XYZ Distributors\n45 Warehouse Road\nMumbai 400001",
        "dest_pincode": "400001",
        "no_packages": "10",
        "actual_weight": "250 kg",
        "packing_type": "Box",
        "invoice_value": "45000",
        "invoice_list": "INV-2025-001",
        "tracking_url": "https://sbdtlogistics.com/terms?lr=LR123456",
    }
    out_path = generate_lr_pdf(sample, "lr_output_table.pdf")
    print("Generated:", out_path)
