import re


def _date_ddmmyyyy(s: str):
    if not s:
        return None
    s = s.replace("/", "-")
    m = re.search(r"\b(\d{1,2}-\d{1,2}-\d{2,4})\b", s)
    return m.group(1) if m else None


def _value_after_label(line: str, label_regex: str):
    if not line:
        return None
    m = re.search(rf"(?:{label_regex})\s*[:\-]\s*(.+)$", line, flags=re.IGNORECASE)
    return m.group(1).strip() if m else None


def _line_starts_with(line: str, keys) -> bool:
    """
    Strict match: line must START with one of the keys (not just contain it).
    Prevents "Transaction Type : Bill to - Ship To" from matching "bill to".
    """
    stripped = line.strip().lower()
    for k in keys:
        if re.match(rf"^\s*{re.escape(k)}\s*[:\-]?\s*", stripped, re.IGNORECASE):
            return True
    return False


def _capture_block(lines, start_keys, stop_keys, max_lines=8):
    """
    Collect lines after a section header.
    Uses strict START-OF-LINE matching to avoid false triggers from
    mid-line label text (e.g. 'Transaction Type : Bill to - Ship To').
    """
    start_idx = None
    for i, line in enumerate(lines):
        if _line_starts_with(line, start_keys):
            start_idx = i
            break

    if start_idx is None:
        return None, None

    block = []
    for j in range(start_idx + 1, min(start_idx + 1 + max_lines, len(lines))):
        if _line_starts_with(lines[j], stop_keys):
            break
        if re.match(r"^\s*gstin\s*[:\-]", lines[j], re.IGNORECASE):
            continue
        cleaned = re.sub(
            r"\bGSTIN\s*[:\-]?\s*[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b",
            "", lines[j], flags=re.IGNORECASE
        ).strip()
        if cleaned:
            block.append(cleaned)

    if not block:
        return None, None

    name = block[0].strip()
    address = " ".join(b.strip() for b in block[1:]) if len(block) > 1 else None
    return name, address


def parse_invoice_text(text: str) -> dict:
    """
    Extract required invoice parameters from e-Way Bill / Tax Invoice text.

    Field mapping (e-Way Bill label -> system field):
        Bill From       -> consignor_name
        Dispatch From   -> consignor_address
        Bill To         -> consignee_name
        Ship To         -> consignee_address
        Generated Date  -> booking_date
        Valid Upto      -> expected_delivery_date (fallback)
        Vehicle No      -> vehicle_no
    """

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    joined = "\n".join(lines)

    inv_no            = None
    booking_date      = None
    vehicle_no        = None
    source            = None
    destination       = None
    expected_delivery = None

    # -- Invoice No ----------------------------------------------------------
    for line in lines:
        val = _value_after_label(line, r"(tax\s*)?invoice\s*(no|number)\.?")
        if val:
            inv_no = val
            break
    if not inv_no:
        m = re.search(r"document\s*detail.*?-\s*([A-Z0-9\-/]+)\s*-\s*\d", joined, re.IGNORECASE)
        if m:
            inv_no = m.group(1).strip()
    if not inv_no:
        m = re.search(r"\b(BGW[A-Z0-9\-]+)\b", joined)
        if m:
            inv_no = m.group(1)

    # -- Booking Date --------------------------------------------------------
    # e-Way Bills use "Generated Date"; fallback to "Invoice Date"
    for label in (
        r"generated\s*date\.?",
        r"(tax\s*)?invoice\s*date\.?",
        r"doc(?:ument)?\s*date\.?",
        r"bill\s*date\.?",
    ):
        for line in lines:
            val = _value_after_label(line, label)
            if val:
                booking_date = _date_ddmmyyyy(val)
                if booking_date:
                    break
        if booking_date:
            break

    # -- Vehicle No ----------------------------------------------------------
    m = re.search(
        r"vehicle\s*(no|number)\.?\s*[:\-]\s*([A-Z]{2}[\s]?\d{2}[\s]?[A-Z]{1,3}[\s]?\d{4})",
        joined, flags=re.IGNORECASE,
    )
    if m:
        vehicle_no = re.sub(r"\s+", "", m.group(2)).upper()
    else:
        m = re.search(r"\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b", joined)
        if m:
            vehicle_no = m.group(1).upper()

    # -- Expected Delivery ---------------------------------------------------
    for label in (
        r"(expected\s*delivery|edd|delivery\s*date)\.?",
        r"valid\s*upto\.?",   # e-Way Bill proxy for expected delivery
    ):
        for line in lines:
            val = _value_after_label(line, label)
            if val:
                expected_delivery = _date_ddmmyyyy(val)
                if expected_delivery:
                    break
        if expected_delivery:
            break

    # -- Source (city from Dispatch From) ------------------------------------
    _reject = {"bill to", "bill from", "ship to", "dispatch from", "gstin"}
    for line in lines:
        if not source:
            v = _value_after_label(line, r"dispatch\s*from|place\s*of\s*dispatch")
            if v and v.strip().lower() not in _reject:
                city_m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", v)
                source = city_m.group(1).strip() if city_m else v.split(",")[0].strip()

    # -- Destination (city from Ship To) -------------------------------------
    for line in lines:
        if not destination:
            v = _value_after_label(line, r"ship\s*to|place\s*of\s*delivery|delivery\s*at")
            if v and v.strip().lower() not in _reject:
                v = re.sub(r"C/F\s*[:\-]?\s*.+", "", v, flags=re.IGNORECASE).strip()
                v = re.sub(r"\s*GSTIN\s*:.*$", "", v, flags=re.IGNORECASE).strip()
                if v:
                    city_m = re.search(r",\s*([A-Za-z\s]+)[,\-]\s*[A-Za-z]+[\s\-]\d{6}", v)
                    destination = city_m.group(1).strip() if city_m else v.split(",")[0].strip()

    # -- Consignor Name (Bill From) ------------------------------------------
    # FIX: e-Way Bill uses "Bill From" for name, "Dispatch From" for address.
    # Old code only checked "billed from" which never matched.
    consignor_name, _ = _capture_block(
        lines,
        start_keys=["bill from", "billed from", "consignor", "sender"],
        stop_keys=["dispatch from", "bill to", "billed to", "ship to", "total", "hsn"],
    )

    # -- Consignor Address (Dispatch From) -----------------------------------
    _, consignor_address = _capture_block(
        lines,
        start_keys=["dispatch from", "place of dispatch"],
        stop_keys=["bill to", "billed to", "ship to", "gstin", "total", "hsn"],
    )
    if not consignor_name and consignor_address:
        # Only "Dispatch From" found; use it for both
        consignor_name, consignor_address = _capture_block(
            lines,
            start_keys=["bill from", "billed from", "dispatch from", "consignor", "sender"],
            stop_keys=["bill to", "billed to", "ship to", "total", "hsn"],
        )

    # -- Consignee Name (Bill To) --------------------------------------------
    # FIX: e-Way Bill uses "Bill To" for name, "Ship To" for address.
    # Old code only checked "billed to" which never matched.
    consignee_name, _ = _capture_block(
        lines,
        start_keys=["bill to", "billed to", "consignee", "receiver"],
        stop_keys=["ship to", "gstin", "total", "hsn", "vehicle"],
    )

    # -- Consignee Address (Ship To) -----------------------------------------
    _, consignee_address = _capture_block(
        lines,
        start_keys=["ship to", "place of delivery"],
        stop_keys=["gstin", "total", "hsn", "vehicle", "transporter"],
    )
    # C/F lines = carrier/freight forwarder; text after C/F is actual address
    if consignee_address:
        cf = re.search(r"C/F\s*[:\-]?\s*(.+)", consignee_address, re.IGNORECASE)
        if cf:
            consignee_address = cf.group(1).strip()

    return {
        "inv_no":                 inv_no,
        "booking_date":           booking_date,
        "vehicle_no":             vehicle_no,
        "source":                 source,
        "destination":            destination,
        "expected_delivery_date": expected_delivery,
        "consignor_name":         consignor_name,
        "consignor_address":      consignor_address,
        "consignee_name":         consignee_name,
        "consignee_address":      consignee_address,
    }