from __future__ import annotations

import base64
import json
import logging
import os
import re
import tempfile
import warnings
from typing import Any, Dict, List, Optional, Tuple

# ── Load .env FIRST before anything else ─────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

# ── Claude API (lazy init so .env is always loaded first) ────────────────────
try:
    import anthropic as _anthropic_module
    CLAUDE_AVAILABLE = True
except ImportError:
    _anthropic_module = None
    CLAUDE_AVAILABLE = False
    logger.warning("anthropic not available. Run: pip install anthropic")

_claude_client: Optional[Any] = None

def _get_claude_client():
    """Lazy singleton — created on first use so .env is always loaded first."""
    global _claude_client
    if _claude_client is not None:
        return _claude_client
    if not CLAUDE_AVAILABLE or _anthropic_module is None:
        raise RuntimeError("anthropic not installed. Run: pip install anthropic")
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY not found. Add it to your .env file:\n"
            "ANTHROPIC_API_KEY=sk-ant-xxxx"
        )
    _claude_client = _anthropic_module.Anthropic(api_key=api_key)
    logger.info("Claude client initialized successfully.")
    return _claude_client

# ── Optional: OpenCV (for QR code reading only) ───────────────────────────────
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    cv2 = None
    OPENCV_AVAILABLE = False

# ── Optional: PyMuPDF ─────────────────────────────────────────────────────────
try:
    import fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    fitz = None
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF not available. Run: pip install pymupdf")

# ── Constants ─────────────────────────────────────────────────────────────────
OCR_MAX_PAGES = 1
OCR_PDF_SCALE = 2.0


def _claude_extract(image_path: str) -> Tuple[str, Dict[str, float]]:
    """
    Extract raw text from an image using Claude Haiku (vision).
    Returns (raw_text, confidence_map).
    confidence_map is always {} since Claude doesn't return per-word scores.
    """
    if not CLAUDE_AVAILABLE:
        raise RuntimeError("anthropic not installed. Run: pip install anthropic")
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    ext = image_path.rsplit(".", 1)[-1].lower()
    media_type_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "bmp": "image/png",
        "tiff": "image/png", "tif": "image/png", "webp": "image/webp",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    prompt = (
        "You are a document OCR engine. Read ALL text from this shipping document "
        "(e-Way Bill / Invoice / LR) exactly as it appears, preserving the layout. "
        "Output only the raw extracted text — no commentary, no JSON, no formatting. "
        "Preserve line breaks so label: value pairs are on separate lines."
    )

    client = _get_claude_client()
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )

    raw_text = response.content[0].text.strip() if response.content else ""
    logger.info("Claude extracted %d chars from %s", len(raw_text), os.path.basename(image_path))
    return raw_text, {}  # Claude doesn't give per-word confidence scores


def _safe_remove(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError as exc:
        logger.debug("Could not remove %s: %s", path, exc)


class OCRService:
    """
    Invoice / E-Way Bill OCR service.

    Tuned for SuperTax / NIC e-way bill + tax invoice PDFs.
    Handles both text PDFs (fast path) and scanned/image PDFs (OCR path).
    Section headers and date/label synonyms are aligned with
    app.services.extraction_spec (Document Intelligence AI). For LLM-based
    extraction, use EXTRACTION_PROMPT + raw text, then parse_spec_json()
    and merge_spec_into_flat() into extracted_data.

    Install: pip install easyocr pymupdf opencv-python-headless
    """

    # =========================================================================
    # Section headers – aligned with extraction_spec (Document Intelligence AI)
    # =========================================================================
    # NOTE: Order matters – the first entry is used as the *name* anchor; later entries for address.
    # Synonyms from spec: Consignor (Sender), Bill From, Dispatch From, Shipper, From Party, Pickup From.
    # Consignee (Receiver), Bill To, Ship To, Delivery To, Destination Party.
    HEADERS_CONSIGNOR = ("Bill From", "Billed From", "Dispatch From", "Consignor", "Sender", "Shipper", "From Party", "Pickup From")
    HEADERS_CONSIGNEE = ("Bill To", "Billed To", "Ship To", "Consignee", "Receiver", "Delivery To", "Destination Party")
    HEADERS_STOP_NEXT_SECTION = ("Total Goods", "Total Taxable", "HSN Code", "Vehicle No", "Invoice No")
    HEADERS_REJECT_AS_VALUE = ("bill to", "bill from", "ship to", "dispatch from", "gstin", "invoice no", "invoice number")
    # Stop markers when reading consignor block (next section / end)
    STOP_CONSIGNOR_BLOCK = tuple(h.lower() for h in HEADERS_CONSIGNEE) + ("total goods", "invoice no", "hsn", "hsn code")
    # Stop markers when reading consignee block
    STOP_CONSIGNEE_BLOCK = tuple(h.lower() for h in HEADERS_CONSIGNOR) + ("total goods", "total taxable", "hsn", "vehicle no", "invoice no")

    # The 4 pieces of information we extract from the image (6 keys):
    # 1. source  2. destination  3. consignor_name + consignor_address  4. consignee_name + consignee_address
    PRIMARY_EXTRACTED_KEYS = ("source", "destination", "consignor_name", "consignor_address", "consignee_name", "consignee_address")

    # =========================================================================
    # QR helpers
    # =========================================================================
    QR_KEY_MAP: Dict[str, str] = {
        "vehicleNo":     "vehicle_no",
        "vehicle_no":    "vehicle_no",
        "invoiceNo":     "inv_no",
        "invNo":         "inv_no",
        "docNo":         "inv_no",
        "inv_no":        "inv_no",
        "docDate":       "booking_date",
        "invoiceDate":   "booking_date",
        "fromPlace":     "source",
        "fromAddr":      "consignor_address",
        "fromGstin":     "consignor_gstin",
        "toPlace":       "destination",
        "toAddr":        "consignee_address",
        "toGstin":       "consignee_gstin",
        "consignorName": "consignor_name",
        "consigneeName": "consignee_name",
        "invoiceValue":  "invoice_value",
        "totalValue":    "invoice_value",
        "lrNo":          "lr_no",
        "ewayBillNo":    "lr_no",
        "weight":        "weight",
        "quantity":      "boxes",
    }

    @staticmethod
    def _parse_qr_payload(data: str) -> Dict[str, Any]:
        extracted: Dict[str, Any] = {}
        if not data or not data.strip():
            return extracted
        try:
            payload = json.loads(data)
            if isinstance(payload, dict):
                for k, v in payload.items():
                    if v is None or (isinstance(v, str) and not v.strip()):
                        continue
                    key = OCRService.QR_KEY_MAP.get(k)
                    extracted[key if key else re.sub(r"\s+", "_", str(k)).lower()] = v
        except (json.JSONDecodeError, TypeError):
            extracted["raw_qr"] = data.strip()
        return extracted

    @staticmethod
    def _extract_qr_opencv(image_path: str) -> Dict[str, Any]:
        if not OPENCV_AVAILABLE or cv2 is None:
            return {}
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {}
            detector = cv2.QRCodeDetector()
            data, _, _ = detector.detectAndDecode(img)
            if data and data.strip():
                return OCRService._parse_qr_payload(data)
            if hasattr(detector, "detectAndDecodeMulti"):
                ret, data_list, _, _ = detector.detectAndDecodeMulti(img)
                if ret and data_list:
                    out: Dict[str, Any] = {}
                    for d in data_list:
                        if d and d.strip():
                            out.update(OCRService._parse_qr_payload(d))
                    return out
        except Exception as exc:
            logger.debug("QR decode error: %s", exc)
        return {}

    @staticmethod
    def extract_qr(image_path: str) -> Dict[str, Any]:
        return OCRService._extract_qr_opencv(image_path)

    # =========================================================================
    # PDF helpers
    # =========================================================================
    @staticmethod
    def _extract_pdf_text(pdf_path: str, max_pages: int = 4) -> str:
        """
        Extract text from PDF using PyMuPDF in reading order.
        Then normalize so labels and values are on separate lines where needed.
        """
        if not PYMUPDF_AVAILABLE or fitz is None:
            return ""
        try:
            doc = fitz.open(pdf_path)
            try:
                parts: List[str] = []
                for i in range(min(len(doc), max_pages)):
                    page = doc[i]
                    # Blocks preserve layout; sort by (y0, x0) for reading order
                    blocks = page.get_text("blocks", sort=True)
                    page_parts: List[str] = []
                    for block in blocks:
                        if len(block) > 4 and block[4].strip():
                            page_parts.append(block[4].strip())
                    if not page_parts:
                        text = page.get_text("text", sort=True)
                        if text and text.strip():
                            page_parts.append(text.strip())
                    parts.extend(page_parts)
                raw = "\n\n".join(parts)
                return OCRService._normalize_raw_text(raw) if raw else ""
            finally:
                doc.close()
        except Exception as exc:
            logger.warning("PDF text extraction failed: %s", exc)
            return ""

    @staticmethod
    def _pdf_to_images(pdf_path: str, pages: int = None) -> List[str]:
        if not PYMUPDF_AVAILABLE or fitz is None:
            raise RuntimeError("PyMuPDF required. pip install pymupdf")
        if pages is None:
            pages = OCR_MAX_PAGES
        scale = OCR_PDF_SCALE
        doc = fitz.open(pdf_path)
        out: List[str] = []
        try:
            for i in range(min(len(doc), pages)):
                pix = doc[i].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                with tempfile.NamedTemporaryFile(suffix=f"_p{i}.png", delete=False) as tmp:
                    img_path = tmp.name
                pix.save(img_path)
                out.append(img_path)
            return out
        except Exception as exc:
            for p in out:
                _safe_remove(p)
            raise RuntimeError(f"PDF rasterisation failed: {exc}") from exc
        finally:
            doc.close()

    # =========================================================================
    # Low-level parsing utilities
    # =========================================================================
    @staticmethod
    def _clean(s: str) -> str:
        """Single line: collapse all whitespace to one space, strip."""
        return re.sub(r"\s+", " ", (s or "").strip())

    @staticmethod
    def _normalize_raw_text(text: str) -> str:
        """
        Normalize raw extracted text for parsing: consistent newlines and spaces.
        Insert line breaks before known labels so 'Invoice No : XGenerated Date' becomes two lines.
        """
        if not text or not text.strip():
            return ""
        # Collapse multiple spaces/newlines to single space first
        s = re.sub(r"[ \t]+", " ", text)
        s = re.sub(r"\n+", "\n", s)
        # Insert newline before common labels (so value and next label are on separate lines)
        labels = (
            r"Generated\s+Date\s*",
            r"Valid\s+Upto\s*",
            r"E[\s\-]?Way\s+Bill\s+No\s*",
            r"Bill\s+From\s*",
            r"Dispatch\s+From\s*",
            r"Bill\s+To\s*",
            r"Ship\s+To\s*",
            r"Vehicle\s+No\s*",
            r"GSTIN\s*",
            r"Total\s+Goods\s+Value\s*",
            r"Invoice\s+No\s*",
            r"Transporter\s*",
            r"HSN\s+Code\s*",
            r"Quantity\s*",
        )
        for pat in labels:
            s = re.sub(r"(\S)(\s*" + pat + r")", r"\1\n\2", s, flags=re.IGNORECASE)
        return re.sub(r"\n+", "\n", s).strip()

    @staticmethod
    def _parse_date(s: str) -> str:
        """Normalise DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD → DD-MM-YYYY."""
        if not s:
            return ""
        s = s.strip()
        # DD/MM/YYYY or DD-MM-YYYY
        m = re.search(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b", s)
        if m:
            d, mo, y = m.group(1), m.group(2), m.group(3)
            if len(y) == 2:
                y = "20" + y
            return f"{d.zfill(2)}-{mo.zfill(2)}-{y}"
        # YYYY-MM-DD
        m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", s)
        if m:
            return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        return ""

    @staticmethod
    def _after_colon(line: str) -> str:
        """Return text after the last colon on a line, stripped."""
        if ":" not in line:
            return ""
        return OCRService._clean(line.split(":", 1)[-1])

    @staticmethod
    def _strip_gstin_from_text(text: str) -> str:
        """Remove 15-char GSTIN and 'GSTIN :' labels from address/name text."""
        if not text or not text.strip():
            return ""
        s = OCRService._clean(text)
        # Remove GSTIN : 29AAACS0684H1Z8 style (with optional spaces)
        s = re.sub(r"GSTIN\s*[:\-]?\s*[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\s*", " ", s, flags=re.IGNORECASE)
        # Remove standalone 15-char GSTIN
        s = re.sub(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b", "", s)
        return OCRService._clean(re.sub(r"\s+", " ", s))

    @staticmethod
    def _is_header_or_reject(s: str) -> bool:
        """True if s should not be used as consignor/consignee name (section labels, too short)."""
        if not s or not isinstance(s, str):
            return True
        t = s.strip().lower()
        if len(t) <= 3:
            return True
        if t in OCRService.HEADERS_REJECT_AS_VALUE:
            return True
        if re.match(r"^(bill\s+from|bill\s+to|ship\s+to|dispatch\s+from)\s*[:\-]?\s*$", t):
            return True
        return False

    @staticmethod
    def _normalize_address(s: str) -> str:
        """Clean address: fix double commas, N0 -> No., spaces around commas, Tamil nadu -> Tamil Nadu."""
        if not s or not s.strip():
            return ""
        s = OCRService._clean(s)
        s = re.sub(r",\s*,+", ", ", s)   # double/multiple commas -> single comma+space
        s = re.sub(r"\s+,", ",", s)       # " ," -> ","
        s = re.sub(r"\bN0\.?", "No. ", s, flags=re.IGNORECASE)  # N0 -> No.
        s = re.sub(r",\s*", ", ", s)      # normalize comma spacing
        s = re.sub(r"\s+", " ", s).strip()
        if "nadu" in s and "Tamil" in s:
            s = re.sub(r"Tamil\s+nadu", "Tamil Nadu", s, flags=re.IGNORECASE)
        return s[:500]

    @staticmethod
    def _value_for_label(lines: List[str], label_regex: str,
                         same_line: bool = True,
                         next_lines: int = 2) -> str:
        """
        Find a label by regex and return its value.
        Checks same-line colon pattern first, then next N lines.
        """
        pat = re.compile(label_regex, re.IGNORECASE)
        for i, line in enumerate(lines):
            if not pat.search(line):
                continue
            # Same-line: "Label : Value" or "Label: Value"
            if same_line:
                m = re.search(
                    rf"(?:{label_regex})\s*[:\-]\s*(.+)$",
                    line, re.IGNORECASE,
                )
                if m:
                    val = OCRService._clean(m.group(1))
                    if val:
                        return val
            # Value on next line(s)
            for j in range(i + 1, min(i + 1 + next_lines, len(lines))):
                v = lines[j].strip()
                if v and not v.endswith(":"):
                    return OCRService._clean(v)
        return ""

    # =========================================================================
    # Main invoice / e-way bill parser (real-time: no per-document training)
    #
    # PRIMARY EXTRACTION (4 pieces of information from the image):
    #   1. SOURCE                    – origin place (e.g. from Vehicle "From" or Dispatch From city)
    #   2. DESTINATION                – delivery place (e.g. from Ship To location)
    #   3. CONSIGNOR (Sender/Bill From) + their address (Dispatch From)
    #      → consignor_name, consignor_address
    #   4. CONSIGNEE (Receiver/Bill To) + their address (Ship To)
    #      → consignee_name, consignee_address
    #
    # Document labels we look for:
    #   Bill From / Billed From / Sender     → consignor_name
    #   Dispatch From / Sender address      → consignor_address (+ source when needed)
    #   Bill To / Billed To / Receiver      → consignee_name
    #   Ship To / Receiver address          → consignee_address (+ destination when needed)
    #
    # Other fields (lr_no, inv_no, vehicle_no, dates, etc.) are extracted when present.
    # =========================================================================
    @staticmethod
    def parse_invoice_text(text: str) -> Dict[str, Any]:
        text = text or ""
        # Normalize so labels and values separate cleanly
        text = OCRService._normalize_raw_text(text)
        lines: List[str] = [l.strip() for l in text.splitlines() if l.strip()]
        joined = "\n".join(lines)
        # Initialize the 4 pieces we extract: source, destination, consignor (name+address), consignee (name+address)
        R: Dict[str, Any] = {k: "" for k in OCRService.PRIMARY_EXTRACTED_KEYS}

        # ── Helper: search joined text with regex, return first group ─────
        def find(pattern: str, flags: int = re.IGNORECASE) -> str:
            m = re.search(pattern, joined, flags)
            return OCRService._clean(m.group(1)) if m else ""

        # ── Same-line value after label (e.g. "Bill From : / GSTIN : 29.../ SKF India Ltd.") ─────
        def find_after_label(label: str, allow_gstin_between: bool = True) -> str:
            # Pattern: Label : optional / GSTIN : 15chars / then capture rest as value
            if allow_gstin_between:
                m = re.search(
                    rf"{label}\s*[:\-]?\s*(?:/\s*)?(?:GSTIN\s*[:\-]\s*[0-9A-Z]{{15}}\s*/?\s*)?(.+?)(?=\n|$)",
                    joined, re.IGNORECASE | re.DOTALL
                )
            else:
                m = re.search(rf"{label}\s*[:\-]\s*(.+?)(?=\n|$)", joined, re.IGNORECASE | re.DOTALL)
            if not m:
                return ""
            return OCRService._strip_gstin_from_text(OCRService._clean(m.group(1)))

        # ─────────────────────────────────────────────────────────────────
        # 1. E-Way Bill / LR number  (12-digit EWB number)
        #    Layout often has "E-Way Bill No.: Generated Date: ..." on one line,
        #    then "122352128684 02:23 PM ..." on next line – capture number on next line.
        # ─────────────────────────────────────────────────────────────────
        R["lr_no"] = (
            find(r"e[\s\-]?way\s*bill\s*no[:\s]+([0-9]{10,15})")
            or find(r"ewb\s*no[:\s]+([0-9]{10,15})")
            or find(r"\bLR\s*No[:\s]+(\S+)")
        )
        if not R["lr_no"]:
            m = re.search(r"e[\s\-]?way\s*bill\s*no[:\s]*\s*(?:Generated\s+Date|.*?)\n\s*([0-9]{10,15})", joined, re.IGNORECASE)
            if m:
                R["lr_no"] = m.group(1).strip()

        # ─────────────────────────────────────────────────────────────────
        # 2. Invoice number
        #    "Invoice No.: 29250000035059" or "TAX INVOICE - Invoice No.: 29250000035059"
        #    "Document Detail: TAX INVOICE - BGWSBD003802"
        # ─────────────────────────────────────────────────────────────────
        R["inv_no"] = (
            find(r"invoice\s*no\s*[:\-]\s*([A-Z0-9\-/]+)")
            or find(r"invoice\s*no\.?\s*[:\-]\s*(\d{10,20})")
            or find(r"tax\s*invoice\s*no\s*[:\-]\s*([A-Z0-9\-/]+)")
            or find(r"document\s*detail.*?tax\s*invoice.*?invoice\s*no\.?\s*[:\-]\s*([A-Z0-9\-/]+)", re.IGNORECASE)
            or find(r"document\s*detail.*?-\s*([A-Z0-9\-/]+)\s*-\s*\d")
            or find(r"\b(292\d{11})\b")   # 292-prefixed long invoice numbers (e-Way style)
            or find(r"(BGW[A-Z0-9\-]+)")   # BGW-prefixed invoice numbers
        )

        # ─────────────────────────────────────────────────────────────────
        # 3. Booking / invoice date
        #    "Generated Date: 19/02/2026" or "Invoice Date: 19-02-2026"
        # ─────────────────────────────────────────────────────────────────
        raw_date = (
            find(r"generated\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"invoice\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"doc(?:ument)?\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"bill\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"booking\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"shipment\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"lr\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"consignment\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            # Last resort: first date found in doc
            or find(r"\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b")
        )
        R["booking_date"] = OCRService._parse_date(raw_date)

        # ─────────────────────────────────────────────────────────────────
        # 4. Valid upto + Expected delivery
        # ─────────────────────────────────────────────────────────────────
        raw_valid = find(r"valid\s*upto[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
        R["valid_upto"] = OCRService._parse_date(raw_valid)
        raw_expected = (
            find(r"expected\s*delivery[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"edd[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"delivery\s*date[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"eta[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
            or find(r"delivery\s*expected\s*on[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})")
        )
        R["expected_delivery_date"] = OCRService._parse_date(raw_expected)

        # ─────────────────────────────────────────────────────────────────
        # 5. Vehicle number
        #    "Vehicle No: TN52C9587" or "5. Vehicle Details" section: "ROAD KA51AA3421 Bengaluru"
        #    Indian plate: 2 letters + 2 digits + 1-3 letters + 4 digits
        # ─────────────────────────────────────────────────────────────────
        R["vehicle_no"] = (
            find(r"vehicle\s*no[:\s]+([A-Z]{2}[\s]?\d{2}[\s]?[A-Z]{1,3}[\s]?\d{4})")
            or find(r"\b(?:ROAD|CAR|BUS)\s+([A-Z]{2}[\s]?\d{2}[\s]?[A-Z]{1,3}[\s]?\d{4})\b", re.IGNORECASE)
            or find(r"\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b")  # compact: TN52C9587, KA51AA3421
        )
        if R["vehicle_no"]:
            R["vehicle_no"] = re.sub(r"\s+", "", str(R["vehicle_no"])).upper()
        # Vehicle Details "From" column: "ROAD KA51AA3421 Bengaluru 20-02-2026"
        if not R.get("source"):
            m = re.search(r"(?:ROAD|CAR|BUS)\s+[A-Z]{2}\d{2}[A-Z0-9]+\s+([A-Za-z]+)\s+\d{2}-\d{2}-\d{4}", joined, re.IGNORECASE)
            if m and m.group(1).lower() not in ("vehicle", "no", "from", "entered", "by"):
                R["source"] = m.group(1).strip()[:50]

        # ─────────────────────────────────────────────────────────────────
        # 6. Source + Consignor address (Dispatch From)
        #    "Dispatch From : Plot No 2, Bommasandra ... Banglore, Karnataka"
        #    Consignor (Sender) address = full Dispatch From text, GST excluded.
        #    IMPORTANT: "bill to" also appears in "Transaction Type : Bill to - Ship To"
        #    so we must NOT stop at "bill to" mid-text; use "Bill To :" (colon) as stop.
        # ─────────────────────────────────────────────────────────────────
        dispatch_from_raw = (
            find(r"dispatch\s*from\s*[:\-]\s*(.+?)(?=bill\s*to\s*[:\-]|ship\s*to\s*[:\-]|gstin\s*[:\-]\s*[0-9]{2}[A-Z]|\n\n)", re.IGNORECASE | re.DOTALL)
            or find(r"place\s*of\s*dispatch[:\s]+(.+?)(?=bill\s*to\s*[:\-]|ship\s*to\s*[:\-]|\n\n)", re.IGNORECASE | re.DOTALL)
            or find(r"(?:consignor|sender)\s*address\s*[:\-]\s*(.+?)(?=consignee|bill\s*to\s*[:\-]|ship\s*to\s*[:\-]|\n\n)", re.IGNORECASE | re.DOTALL)
        )
        R["consignor_address"] = OCRService._normalize_address(
            OCRService._strip_gstin_from_text(dispatch_from_raw)
        ) if dispatch_from_raw else ""
        source_candidate = (
            dispatch_from_raw
            or find(r"\bfrom\b\s+([A-Za-z]+(?:\s[A-Za-z]+)?)\b")   # "From  Banglore"
        )
        # Never use section headers as source (e.g. "Bill To" matched by "from ..." pattern)
        if source_candidate and source_candidate.strip().lower() not in OCRService.HEADERS_REJECT_AS_VALUE:
            R["source"] = source_candidate
        elif dispatch_from_raw:
            R["source"] = dispatch_from_raw
        # Trim source to city/place if very long (short place set later after consignor_name is known)
        if R.get("source") and len(R["source"]) > 40:
            m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", R["source"])
            R["source"] = OCRService._clean(m.group(1)) if m else OCRService._clean(R["source"][:40])

        # ─────────────────────────────────────────────────────────────────
        # 7. Destination + Consignee address (Ship To)
        #    Can be one line "Ship To : SKF INDIA LTD - Chennai DC" or multi-line with C/F: address.
        #    If "C/F:" present, consignee_address = text after C/F (delivery address only).
        # ─────────────────────────────────────────────────────────────────
        ship_to_raw = (
            find(r"ship\s*to\s*[:\-]\s*(.+?)(?=\d\s*Goods\s+Details|HSN\s+Code|Total\s+Taxable|Product\s+Name)", re.IGNORECASE | re.DOTALL)
            or find(r"ship\s*to\s*[:\-]\s*(.+?)(?=total\s+goods|total\s+taxable|vehicle\s+no|hsn\s+code|\n\n)", re.IGNORECASE | re.DOTALL)
            or find(r"place\s*of\s*delivery[:\s]+(.+?)(?=total|hsn|\n\n)", re.IGNORECASE | re.DOTALL)
            or find(r"delivery\s*at[:\s]+(.+?)(?=vehicle|total|\n\n)", re.IGNORECASE | re.DOTALL)
            or find(r"(?:consignee|receiver)\s*address\s*[:\-]\s*(.+?)(?=total|hsn|vehicle|\n\n)", re.IGNORECASE | re.DOTALL)
        )
        if ship_to_raw:
            ship_cleaned = OCRService._strip_gstin_from_text(ship_to_raw)
            # If block has C/F: then address is the delivery part after C/F (not the company line)
            c_f = re.search(r"C/F\s*[:\-]?\s*(.+)", ship_cleaned, re.IGNORECASE | re.DOTALL)
            if c_f:
                R["consignee_address"] = OCRService._normalize_address(c_f.group(1))
            else:
                R["consignee_address"] = OCRService._normalize_address(ship_cleaned)
            # Destination: first line = company/place only (strip any trailing "GSTIN :" / "C/F:")
            first_line = ship_cleaned.split("\n")[0].strip() if "\n" in ship_cleaned else ship_cleaned
            first_line = re.sub(r"\s*GSTIN\s*:.*$", "", first_line, flags=re.IGNORECASE)
            first_line = re.sub(r"\s*C/F\s*:.*$", "", first_line, flags=re.IGNORECASE)
            first_line = OCRService._clean(first_line)
            if first_line and not re.match(r"^(C/F|GSTIN)\s*", first_line, re.IGNORECASE):
                R["destination"] = first_line[:80]
            else:
                for ln in ship_cleaned.split("\n"):
                    ln = re.sub(r"\s*GSTIN\s*:.*$", "", ln, flags=re.IGNORECASE)
                    ln = re.sub(r"\s*C/F\s*:.*$", "", ln, flags=re.IGNORECASE)
                    ln = OCRService._clean(ln)
                    if ln and not re.match(r"^(C/F|GSTIN)\s*", ln, re.IGNORECASE):
                        R["destination"] = ln[:80]
                        break
                else:
                    R["destination"] = OCRService._clean(ship_cleaned)[:80]
            # If consignee name is wrong (e.g. "Ship" from fragment), use first Ship To line as name only
            first_ship_line = None
            for ln in ship_cleaned.split("\n"):
                ln = OCRService._clean(ln)
                if ln and not re.match(r"^(C/F|GSTIN)\s*", ln, re.IGNORECASE) and len(ln) > 4:
                    # Take only up to "GSTIN" or "C/F" in case they're on same line
                    ln = re.sub(r"\s*GSTIN\s*:.*$", "", ln, flags=re.IGNORECASE)
                    ln = re.sub(r"\s*C/F\s*:.*$", "", ln, flags=re.IGNORECASE)
                    first_ship_line = OCRService._clean(ln)[:200]
                    break
            if first_ship_line and (not R.get("consignee_name") or R.get("consignee_name", "").strip().lower() in ("ship", "to") or len((R.get("consignee_name") or "").strip()) <= 4):
                R["consignee_name"] = first_ship_line
        else:
            R["consignee_address"] = ""
            R["destination"] = ""
        if R["destination"] and len(R["destination"]) > 40:
            m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", R["destination"])
            R["destination"] = OCRService._clean(m.group(1)) if m else OCRService._clean(R["destination"][:40])

        # ─────────────────────────────────────────────────────────────────
        # 8. Consignor (Sender) – name only from Bill From
        #    Same line: "Bill From : / GSTIN : 29.../ SKF India Ltd." or next-line name.
        # ─────────────────────────────────────────────────────────────────
        if "consignor_name" not in R or not R.get("consignor_name"):
            same_line_name = (
                find_after_label(r"Bill\s+From")
                or OCRService._value_for_label(lines, r"Billed\s+From", same_line=True, next_lines=3)
                or OCRService._value_for_label(lines, r"Consignor|Sender", same_line=True, next_lines=3)
            )
            if same_line_name and not re.search(r"dispatch\s*from|bill\s*to|ship\s*to", str(same_line_name), re.IGNORECASE):
                cand = OCRService._strip_gstin_from_text(str(same_line_name))[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignor_name"] = cand
        for i, line in enumerate(lines):
            if re.search(r"^\s*bill\s+from\s*:\s*$", line, re.IGNORECASE):
                for j in range(i + 1, min(i + 6, len(lines))):
                    candidate = lines[j].strip()
                    if not candidate:
                        continue
                    if re.match(r"gstin\s*:", candidate, re.IGNORECASE):
                        g = re.search(r"gstin\s*[:\-]\s*([0-9A-Z]{15})", candidate, re.IGNORECASE)
                        if g and "consignor_gstin" not in R:
                            R["consignor_gstin"] = g.group(1).upper()
                        continue
                    if re.search(r"dispatch\s*from|bill\s*to|ship\s*to", candidate, re.IGNORECASE):
                        break
                    if "consignor_name" not in R or not R.get("consignor_name"):
                        cand = OCRService._strip_gstin_from_text(candidate)[:200]
                        if cand and not OCRService._is_header_or_reject(cand):
                            R["consignor_name"] = cand
                        break
                break

        # ─────────────────────────────────────────────────────────────────
        # 9. Consignee (Receiver) – name only from Bill To
        #    Same line: "Bill To : / GSTIN : 33.../ SKF INDIA LTD - Chennai DC" or next-line name.
        # ─────────────────────────────────────────────────────────────────
        if "consignee_name" not in R or not R.get("consignee_name"):
            same_line_name = (
                find_after_label(r"Bill\s+To")
                or OCRService._value_for_label(lines, r"Billed\s+To", same_line=True, next_lines=3)
                or OCRService._value_for_label(lines, r"Consignee|Receiver", same_line=True, next_lines=3)
            )
            if same_line_name and not re.search(r"ship\s*to|dispatch|total|vehicle", str(same_line_name), re.IGNORECASE):
                cand = OCRService._strip_gstin_from_text(str(same_line_name))[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignee_name"] = cand
        for i, line in enumerate(lines):
            # Match only "Bill To :" as its own line (not "Transaction Type : Bill to -" or similar)
            line_stripped = line.strip()
            if not re.search(r"^\s*bill\s+to\s*:\s*$", line, re.IGNORECASE):
                continue
            if re.search(r"bill\s+to\s+[-–—]\s*$", line_stripped, re.IGNORECASE) or "transaction" in line.lower() or "type" in line.lower():
                continue
            for j in range(i + 1, min(i + 8, len(lines))):
                    candidate = lines[j].strip()
                    if not candidate:
                        continue
                    if re.match(r"gstin\s*:", candidate, re.IGNORECASE):
                        g = re.search(r"gstin\s*[:\-]\s*([0-9A-Z]{15})", candidate, re.IGNORECASE)
                        if g and "consignee_gstin" not in R:
                            R["consignee_gstin"] = g.group(1).upper()
                        continue
                    if re.search(r"ship\s*to|dispatch|total|vehicle|hsn", candidate, re.IGNORECASE):
                        break
                    # Skip fragment lines like "Ship", "To" (from "Ship To" split across lines)
                    if candidate.lower() in ("ship", "to") or len(candidate) <= 3:
                        continue
                    if "consignee_name" not in R or not R.get("consignee_name"):
                        cand = OCRService._strip_gstin_from_text(candidate)[:200]
                        if cand and not OCRService._is_header_or_reject(cand):
                            R["consignee_name"] = cand
                        break
            break

        # ─────────────────────────────────────────────────────────────────
        # 9b. Section-based extraction on full text (works regardless of line order)
        #     Capture text between "Bill From"/"Dispatch From" and "Bill To"/"Ship To", etc.
        # ─────────────────────────────────────────────────────────────────
        def _section_between(joined_text: str, after: str, before: str, max_len: int = 600) -> str:
            """Get text after first 'after' and before first 'before' (case-insensitive)."""
            a = re.escape(after)
            b = re.escape(before)
            pat = re.compile(r"(" + a + r")\s*[:\-]?\s*(.+?)(?=" + b + r"|\d\s*Goods\s+Details|Total\s+Goods|Total\s+Taxable|HSN\s+Code|$)", re.IGNORECASE | re.DOTALL)
            m = re.search(pat, joined_text)
            if not m:
                return ""
            return OCRService._strip_gstin_from_text(OCRService._clean(m.group(2)))[:max_len]

        # Consignor block: Bill From → name; Dispatch From → address
        # Use "Bill From" → "Dispatch From" to get the name-only block first.
        H = OCRService.HEADERS_CONSIGNOR
        E = OCRService.HEADERS_CONSIGNEE
        # Name block: between "Bill From" and "Dispatch From"
        consignor_name_block = _section_between(joined, H[0], H[2]) or _section_between(joined, H[1], H[2])
        # Address block: between "Dispatch From" and "Bill To"
        consignor_addr_block = _section_between(joined, H[2], E[0]) or _section_between(joined, H[2], E[2])
        # Fallback: whole consignor section
        consignor_block = consignor_name_block or consignor_addr_block or _section_between(joined, H[0], E[0])
        if consignor_name_block:
            name_parts = [p.strip() for p in re.split(r"[\n,]+", consignor_name_block) if p.strip() and not re.match(r"^GSTIN\s*[:\-]?\s*[0-9A-Z]{15}", p, re.I)]
            if name_parts and not R.get("consignor_name"):
                cand = OCRService._strip_gstin_from_text(name_parts[0])[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignor_name"] = cand
        if consignor_addr_block and not R.get("consignor_address"):
            R["consignor_address"] = OCRService._normalize_address(consignor_addr_block)
        elif consignor_block and not R.get("consignor_name"):
            parts = [p.strip() for p in re.split(r"[\n,]+", consignor_block) if p.strip() and not re.match(r"^GSTIN\s*[:\-]?\s*[0-9A-Z]{15}", p, re.I)]
            if parts and not R.get("consignor_name"):
                cand = OCRService._strip_gstin_from_text(parts[0])[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignor_name"] = cand
            if len(parts) > 1 and not R.get("consignor_address"):
                R["consignor_address"] = OCRService._normalize_address(consignor_block)
        if consignor_block and not R.get("source"):
            first = consignor_block.split(",")[0].strip() if "," in consignor_block else consignor_block.split()[0].strip()
            if first and first.lower() not in OCRService.HEADERS_REJECT_AS_VALUE:
                R["source"] = first[:50]

        # Consignee block: Bill To → name; Ship To → address
        S = OCRService.HEADERS_STOP_NEXT_SECTION
        # Name block: between "Bill To" and "Ship To"
        consignee_name_block = _section_between(joined, E[0], E[2]) or _section_between(joined, E[1], E[2])
        # Address block: between "Ship To" and next section
        consignee_addr_block = _section_between(joined, E[2], S[0]) or _section_between(joined, E[2], "Total")
        consignee_block = consignee_name_block or consignee_addr_block or _section_between(joined, E[0], S[0])
        if consignee_name_block:
            lines_ce = [OCRService._strip_gstin_from_text(l.strip()) for l in consignee_name_block.split("\n") if l.strip() and not re.match(r"^\s*GSTIN\s*[:\-]", l, re.I)]
            lines_ce = [l for l in lines_ce if l and l.lower() not in ("ship", "to") and len(l) > 2]
            if lines_ce and not R.get("consignee_name"):
                cand = re.sub(r"\s*GSTIN\s*:.*$", "", lines_ce[0], flags=re.IGNORECASE).strip()[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignee_name"] = cand
        if consignee_addr_block and not R.get("consignee_address"):
            c_f = re.search(r"C/F\s*[:\-]?\s*(.+)", consignee_addr_block, re.IGNORECASE | re.DOTALL)
            if c_f:
                R["consignee_address"] = OCRService._normalize_address(c_f.group(1))
            else:
                R["consignee_address"] = OCRService._normalize_address(consignee_addr_block)
        elif consignee_block:
            c_f = re.search(r"C/F\s*[:\-]?\s*(.+)", consignee_block, re.IGNORECASE | re.DOTALL)
            if c_f and not R.get("consignee_address"):
                R["consignee_address"] = OCRService._normalize_address(c_f.group(1))
            lines_ce = [OCRService._strip_gstin_from_text(l.strip()) for l in consignee_block.split("\n") if l.strip() and not re.match(r"^\s*GSTIN\s*[:\-]", l, re.I)]
            lines_ce = [l for l in lines_ce if l and l.lower() not in ("ship", "to") and len(l) > 2]
            if lines_ce and not R.get("consignee_name"):
                cand = re.sub(r"\s*GSTIN\s*:.*$", "", lines_ce[0], flags=re.IGNORECASE).strip()[:200]
                if cand and not OCRService._is_header_or_reject(cand):
                    R["consignee_name"] = cand
        if (R.get("consignee_name") or R.get("consignee_address")) and not R.get("destination"):
            R["destination"] = (R.get("consignee_name") or R.get("consignee_address") or "")[:80]

        # Line-based block fallback when still empty (line must *start* with section label)
        def _collect_block_after(lines: List[str], start_pattern: str, stop_markers: List[str], max_lines: int = 10) -> Tuple[str, str]:
            start_pat = re.compile(start_pattern, re.IGNORECASE)
            start_idx = None
            for i, line in enumerate(lines):
                if start_pat.match(line.strip()):
                    start_idx = i
                    break
            if start_idx is None:
                return "", ""
            block = []
            for j in range(start_idx + 1, min(start_idx + 1 + max_lines, len(lines))):
                lower = lines[j].lower()
                if any(m in lower for m in stop_markers):
                    break
                if re.match(r"^\s*gstin\s*[:\-]", lines[j], re.IGNORECASE):
                    continue
                b = OCRService._strip_gstin_from_text(lines[j].strip())
                if b and len(b) > 1 and b.lower() not in ("ship", "to"):
                    block.append(b)
            if not block:
                return "", ""
            name = block[0][:200]
            address = OCRService._normalize_address(" ".join(block[1:])) if len(block) > 1 else ""
            return name, address

        _consignor_pat = r"^\s*(" + "|".join(h.lower().replace(" ", r"\s+") for h in OCRService.HEADERS_CONSIGNOR) + r")\s*[:\-]?\s*$"
        _consignee_pat = r"^\s*(" + "|".join(h.lower().replace(" ", r"\s+") for h in OCRService.HEADERS_CONSIGNEE) + r")\s*[:\-]?\s*$"
        if not R.get("consignor_name") or not R.get("consignor_address"):
            c_name, c_addr = _collect_block_after(lines, _consignor_pat, list(OCRService.STOP_CONSIGNOR_BLOCK))
            if c_name and not R.get("consignor_name") and not OCRService._is_header_or_reject(c_name):
                R["consignor_name"] = c_name
            if c_addr and not R.get("consignor_address"):
                R["consignor_address"] = c_addr
        if not R.get("consignee_name") or not R.get("consignee_address"):
            e_name, e_addr = _collect_block_after(lines, _consignee_pat, list(OCRService.STOP_CONSIGNEE_BLOCK))
            if e_name and not R.get("consignee_name") and not OCRService._is_header_or_reject(e_name):
                R["consignee_name"] = e_name
            if e_addr and not R.get("consignee_address"):
                R["consignee_address"] = e_addr

        # e-Way two-column layout: "Bill From: Bill To:" then "GSTIN ... GSTIN ..." then one line "Name1  Name2"
        if ("bill from" in joined.lower() and "bill to" in joined.lower()) and (
            not R.get("consignor_name") or not R.get("consignee_name")
        ):
            for line in lines:
                line = line.strip()
                if not line or re.match(r"^\s*(Bill From|Bill To|GSTIN)\s*", line, re.IGNORECASE):
                    continue
                if re.search(r"dispatch|ship\s+to\s*:|total\s+goods|hsn|vehicle", line, re.IGNORECASE):
                    break
                # Two names on one line: split by 2+ spaces or by " ALL_CAPS_NAME LIMITED/LTD"
                parts = re.split(r"\s{2,}", line, maxsplit=1)
                if len(parts) == 2:
                    p1, p2 = [OCRService._strip_gstin_from_text(p).strip() for p in parts]
                    if len(p1) > 2 and len(p2) > 2 and not OCRService._is_header_or_reject(p1) and not OCRService._is_header_or_reject(p2):
                        if not R.get("consignor_name"):
                            R["consignor_name"] = p1[:200]
                        if not R.get("consignee_name"):
                            R["consignee_name"] = p2[:200]
                        break
                m = re.match(r"^(.+?)\s+([A-Z][A-Z0-9\s&\.]+(?:LIMITED|LTD|PVT|LLP|PRIVATE)\s*)$", line)
                if m:
                    p1 = OCRService._strip_gstin_from_text(m.group(1)).strip()
                    p2 = OCRService._strip_gstin_from_text(m.group(2)).strip()
                    if len(p1) > 2 and len(p2) > 2 and not OCRService._is_header_or_reject(p1) and not OCRService._is_header_or_reject(p2):
                        if not R.get("consignor_name"):
                            R["consignor_name"] = p1[:200]
                        if not R.get("consignee_name"):
                            R["consignee_name"] = p2[:200]
                        break
            if not R.get("destination") and (R.get("consignee_name") or R.get("consignee_address")):
                R["destination"] = (R.get("consignee_name") or R.get("consignee_address") or "")[:80]

        # Derive short source from consignor when source is very long (real-time: no doc-specific rules)
        if R.get("consignor_address") and R.get("source") and len(R["source"]) > 35:
            # Use first locality (text before first comma) or city from "City, State-PIN"
            addr = R["consignor_address"]
            first_part = addr.split(",")[0].strip() if "," in addr else addr[:30]
            if first_part and len(first_part) < len(R["source"]):
                R["source"] = first_part[:50]
            elif re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", addr):
                m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", addr)
                if m:
                    R["source"] = OCRService._clean(m.group(1))[:50]

        # ─────────────────────────────────────────────────────────────────
        # 10. GSTIN fallback (sweep for all 15-char GSTINs)
        # ─────────────────────────────────────────────────────────────────
        gstins = re.findall(
            r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b",
            joined,
        )
        if gstins and "consignor_gstin" not in R:
            R["consignor_gstin"] = gstins[0]
        if len(gstins) > 1 and "consignee_gstin" not in R:
            R["consignee_gstin"] = gstins[1]

        # ─────────────────────────────────────────────────────────────────
        # 11. Financial fields
        #    "Total Goods Value  ₹868,478.12"
        #    "Total Taxable Amount  ₹735,998.40"
        #    "IGST Amount  ₹132,479.72"
        # ─────────────────────────────────────────────────────────────────
        def parse_amount(pattern: str) -> str:
            m = re.search(pattern, joined, re.IGNORECASE)
            if not m:
                return ""
            raw = m.group(1).replace(",", "").replace("₹", "").replace("Rs", "").replace("INR", "").strip()
            raw = re.sub(r"\s+", "", raw)
            try:
                return f"{float(raw):.2f}"
            except ValueError:
                return raw

        R["invoice_value"] = parse_amount(
            r"total\s*goods\s*value\s*[₹\sRs\.INR]*([\d,\s]+\.?\d*)"
        ) or parse_amount(r"invoice\s*value\s*[:\-]?\s*[₹\sRs\.INR]*([\d,\s]+\.?\d*)")
        # e-Way layout: "Total Other Charges Total Goods Value" then next line "₹0.00 ₹23,442.16" – take last amount
        if not R["invoice_value"]:
            m = re.search(r"total\s*goods\s*value.*?\n.*?₹\s*[\d,]+\.?\d*\s+₹\s*([\d,]+\.?\d*)", joined, re.IGNORECASE | re.DOTALL)
            if m:
                try:
                    R["invoice_value"] = f"{float(m.group(1).replace(',', '')):.2f}"
                except ValueError:
                    pass
        R["taxable_value"] = parse_amount(
            r"total\s*taxable\s*amount\s*[₹\s]*([\d,]+\.?\d*)"
        )
        R["cgst"] = parse_amount(r"cgst\s*amount\s*[₹\s]*([\d,]+\.?\d*)")
        R["sgst"] = parse_amount(r"sgst\s*amount\s*[₹\s]*([\d,]+\.?\d*)")
        R["igst"] = parse_amount(r"igst\s*amount\s*[₹\s]*([\d,]+\.?\d*)")

        # ─────────────────────────────────────────────────────────────────
        # 12. Goods details
        #    "HSN Code  84821020"
        #    "23328.00 NOS" → boxes
        # ─────────────────────────────────────────────────────────────────
        R["hsn_code"] = find(r"(?:hsn\s*code\s+|hsn\s*[:\-]\s*)(\d{4,8})")
        R["boxes"]    = find(r"([\d,]+(?:\.\d+)?)\s*NOS\b")  # "23328.00 NOS"
        if not R["boxes"]:
            R["boxes"] = find(r"quantity\s*[:\-]\s*([\d,]+(?:\.\d+)?)")
        if not R["boxes"]:
            R["boxes"] = find(r"(\d+)\s*(?:boxes|pcs|pieces)\b")
        R["weight"]   = find(r"weight\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*(?:kg|kgs)?") or find(r"(\d+(?:\.\d+)?)\s*kg\b")

        # ─────────────────────────────────────────────────────────────────
        # 13. Transporter
        #    "Transporter ID & Name : 29JRTPS8965K1Z3 & Shree Bhanashankari Devi Transport"
        # ─────────────────────────────────────────────────────────────────
        R["transporter_name"] = find(
            r"transporter\s*(?:id\s*&\s*name|name)\s*[:\-]\s*[A-Z0-9]+\s*&\s*(.+?)(?:\n|$)"
        ) or find(r"transporter\s*name\s*[:\-]\s*(.+?)(?:\n|$)")

        R["transporter_doc_no"] = find(
            r"transporter\s*doc\.?\s*no\s*[&\s]*date\s*[:\-]\s*(\S+)"
        )

        # ─────────────────────────────────────────────────────────────────
        # 14. Transport mode & distance
        # ─────────────────────────────────────────────────────────────────
        R["transport_mode"] = find(r"mode\s*[:\-]\s*([A-Z]+)")
        R["distance_km"]    = find(r"approx\s*distance\s*[:\-]\s*([\d.]+)")

        # ─────────────────────────────────────────────────────────────────
        # Cleanup: never leave section headers as names (wrong data in fields)
        # ─────────────────────────────────────────────────────────────────
        if R.get("consignor_name") and OCRService._is_header_or_reject(R["consignor_name"]):
            R["consignor_name"] = ""
        if R.get("consignee_name") and OCRService._is_header_or_reject(R["consignee_name"]):
            R["consignee_name"] = ""

        # ─────────────────────────────────────────────────────────────────
        # Final: normalize formats and strip empty values
        # ─────────────────────────────────────────────────────────────────
        out: Dict[str, Any] = {}
        for k, v in R.items():
            if v is None or v == "" or v == "0.00":
                continue
            if isinstance(v, str):
                v = OCRService._clean(v)
                if not v:
                    continue
                # Dates: ensure DD-MM-YYYY for display/forms
                if k in ("booking_date", "valid_upto", "ship_date", "expected_delivery_date") and v:
                    parsed = OCRService._parse_date(v)
                    if parsed:
                        v = parsed
                # Addresses: single line, no extra newlines
                if k in ("consignor_address", "consignee_address", "source", "destination"):
                    v = re.sub(r"\s+", " ", v).strip()[:500]
            out[k] = v
        # Real-time fallback: always run generic invoice_parser and merge any missing field
        def _ok_value(fk: str, fv: Any) -> bool:
            if fv is None or fv == "":
                return False
            s = str(fv).strip().lower()
            if fk in ("source", "destination") and s in OCRService.HEADERS_REJECT_AS_VALUE:
                return False
            return True
        try:
            from app.services.invoice_parser import parse_invoice_text as fallback_parse
            fallback = fallback_parse(joined)
            date_keys = ("booking_date", "expected_delivery_date")
            for fk, fv in fallback.items():
                if not _ok_value(fk, fv):
                    continue
                if fk not in out or not out.get(fk):
                    if fk in date_keys:
                        out[fk] = OCRService._parse_date(str(fv))
                    else:
                        out[fk] = OCRService._clean(str(fv)) if isinstance(fv, str) else fv
        except Exception as exc:
            logger.debug("Invoice parser fallback skipped: %s", exc)

        # ─────────────────────────────────────────────────────────────────
        # FIELD ALIAS NORMALIZATION
        # Maps e-Way Bill document terminology → system field names.
        # "Bill From" → consignor_name, "Dispatch From" → consignor_address
        # "Bill To"   → consignee_name, "Ship To"       → consignee_address
        # This ensures downstream systems always receive consistent keys
        # regardless of what label the source PDF used.
        # ─────────────────────────────────────────────────────────────────
        SYSTEM_KEY_ALIASES = {
            "bill_from":        "consignor_name",
            "billed_from":      "consignor_name",
            "dispatch_from":    "consignor_address",
            "sender":           "consignor_name",
            "sender_name":      "consignor_name",
            "sender_address":   "consignor_address",
            "bill_to":          "consignee_name",
            "billed_to":        "consignee_name",
            "ship_to":          "consignee_address",
            "receiver":         "consignee_name",
            "receiver_name":    "consignee_name",
            "receiver_address": "consignee_address",
            "generated_date":   "booking_date",
            "invoice_date":     "booking_date",
            "doc_date":         "booking_date",
        }
        for alias, canonical in SYSTEM_KEY_ALIASES.items():
            if alias in out and canonical not in out:
                out[canonical] = out.pop(alias)
            elif alias in out:
                out.pop(alias)  # drop duplicate

        # If expected_delivery_date still empty, fall back to valid_upto
        if not out.get("expected_delivery_date") and out.get("valid_upto"):
            out["expected_delivery_date"] = out["valid_upto"]

        return out

    # =========================================================================
    # OCR entry point (single image) — now powered by Claude Haiku
    # =========================================================================
    @staticmethod
    def extract_text(image_path: str) -> Dict[str, Any]:
        """OCR a single image using Claude Haiku vision and parse invoice fields. Never raises."""
        if not CLAUDE_AVAILABLE:
            return {"extracted": {}, "confidence": {}, "raw": "anthropic not installed. Run: pip install anthropic"}
        if not os.path.isfile(image_path):
            return {"extracted": {}, "confidence": {}, "raw": f"File not found: {image_path}"}
        try:
            raw_text, conf_map = _claude_extract(image_path)
        except Exception as exc:
            logger.warning("Claude extraction failed for %s: %s", image_path, exc)
            return {"extracted": {}, "confidence": {}, "raw": f"OCR failed: {exc}"}

        if not raw_text or not raw_text.strip():
            return {"extracted": {}, "confidence": {}, "raw": ""}

        raw_text = OCRService._normalize_raw_text(raw_text)
        parsed = OCRService.parse_invoice_text(raw_text)
        found = len([v for v in parsed.values() if v])
        logger.info("Claude OCR: %s → %d fields extracted", os.path.basename(image_path), found)
        if found == 0:
            logger.warning("No fields found. Raw text sample:\n%s", raw_text[:400])
        return {"extracted": parsed, "confidence": conf_map, "raw": raw_text}

    # =========================================================================
    # Main public entry point
    # =========================================================================
    @staticmethod
    def process_document(path: str) -> Dict[str, Any]:
        """
        Process a PDF or image invoice/e-way-bill file.
        Returns { extracted_data, confidence_scores, raw_text }.
        Never raises.
        """
        path = os.path.abspath(path)
        if not os.path.isfile(path):
            return {"extracted_data": {}, "confidence_scores": {}, "raw_text": f"File not found: {path}"}

        # ── PDF: text extraction (fast path) ─────────────────────────────
        if path.lower().endswith(".pdf"):
            pdf_text = OCRService._extract_pdf_text(path, max_pages=4)
            if pdf_text and len(re.sub(r"\s+", "", pdf_text)) > 100:
                parsed = OCRService.parse_invoice_text(pdf_text)
                found = len([v for v in parsed.values() if v])
                logger.info("PDF text path: %d fields for %s", found, os.path.basename(path))
                if found == 0:
                    logger.warning("PDF text extracted but no fields parsed.\nRaw:\n%s", pdf_text[:600])
                return {"extracted_data": parsed, "confidence_scores": {}, "raw_text": pdf_text}

            # Scanned PDF → rasterise → OCR
            logger.info("Scanned PDF, using OCR path: %s", os.path.basename(path))
            temp_images: List[str] = []
            try:
                temp_images = OCRService._pdf_to_images(path)
                merged: Dict[str, Any] = {}
                raw_parts: List[str] = []
                for img_path in temp_images:
                    qr: Dict[str, Any] = {}
                    try:
                        qr = OCRService.extract_qr(img_path)
                    except Exception:
                        pass
                    ocr_result = OCRService.extract_text(img_path)
                    page_fields = dict(ocr_result.get("extracted") or {})
                    page_fields.update(qr)
                    for k, v in page_fields.items():
                        if v is not None and v != "":
                            merged[k] = v
                    raw_parts.append(ocr_result.get("raw") or "")
                return {
                    "extracted_data": merged,
                    "confidence_scores": {},
                    "raw_text": "\n\n--- page ---\n\n".join(p for p in raw_parts if p),
                }
            except Exception as exc:
                logger.exception("PDF OCR pipeline failed for %s", path)
                return {"extracted_data": {}, "confidence_scores": {}, "raw_text": f"PDF OCR failed: {exc}"}
            finally:
                for img_path in temp_images:
                    _safe_remove(img_path)

        # ── Image file ────────────────────────────────────────────────────
        if not CLAUDE_AVAILABLE:
            return {"extracted_data": {}, "confidence_scores": {}, "raw_text": "anthropic not installed. Run: pip install anthropic"}
        qr: Dict[str, Any] = {}
        try:
            qr = OCRService.extract_qr(path)
        except Exception:
            pass
        try:
            ocr_result = OCRService.extract_text(path)
        except Exception as exc:
            return {"extracted_data": {}, "confidence_scores": {}, "raw_text": f"OCR failed: {exc}"}

        extracted = dict(ocr_result.get("extracted") or {})
        extracted.update(qr)
        return {
            "extracted_data": extracted,
            "confidence_scores": ocr_result.get("confidence") or {},
            "raw_text": ocr_result.get("raw") or "",
        }


# ── CLI test: python ocr_service.py invoice.pdf ──────────────────────────────
if __name__ == "__main__":
    import sys, pprint
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) < 2:
        print("Usage: python ocr_service.py <invoice.pdf>")
        sys.exit(1)
    res = OCRService.process_document(sys.argv[1])
    found = {k: v for k, v in res["extracted_data"].items() if v}
    print(f"\n{'='*55}")
    print(f"  Fields extracted: {len(found)}")
    print("="*55)
    pprint.pprint(found)
    print(f"\n--- Raw text (first 800 chars) ---")
    print(res["raw_text"][:800])