"""
Document Intelligence AI – structured extraction spec for logistics documents.

This module defines the canonical extraction prompts and output format for
invoices, consignment notes, transport receipts, and shipment PDFs/images.

Prompts:
- EXTRACTION_PROMPT_SHORT: concise document extraction engine (synonyms + JSON only).
- EXTRACTION_PROMPT: full expert prompt with detailed rules.

Output: strict JSON with booking_date, source, destination, expected_delivery,
consignor { company_name, name, address }, consignee { company_name, name, address }.
Use parse_spec_json() and spec_to_flat() to consume LLM output.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict

# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION PROMPTS (for LLM / Document Intelligence)
# ─────────────────────────────────────────────────────────────────────────────

# Concise prompt – use for document extraction engine (short context).
EXTRACTION_PROMPT_SHORT = r"""You are a document extraction engine.

Extract ONLY these fields from the given text. Use synonyms:
- booking date = booking/date/LR date/consignment date
- expected delivery = ETA/expected delivery/delivery expected
- consignor = consignor/sender/bill from/dispatch from/shipper
- consignee = consignee/receiver/bill to/ship to/delivery to

Rules:
- Output JSON only.
- Dates must be dd-mm-yyyy.
- If missing, set null.
- Do not guess.

JSON schema:
{
  "booking_date": null,
  "source": null,
  "destination": null,
  "expected_delivery": null,
  "consignor": {"company_name": null, "name": null, "address": null},
  "consignee": {"company_name": null, "name": null, "address": null}
}
"""

# Full prompt – use when more guidance is needed.
EXTRACTION_PROMPT = r"""You are an expert Document Intelligence AI specializing in structured data extraction from logistics documents, invoices, consignment notes, transport receipts, and shipment PDFs or images.

Your task is to accurately extract ONLY the required shipment details from the provided document text or OCR output.

----------------------------------
OBJECTIVE
----------------------------------
Extract structured logistics information even when field names vary, synonyms are used, or layout formatting differs across documents.

The AI must understand semantic meaning instead of relying only on exact keyword matching.

----------------------------------
REQUIRED FIELDS TO EXTRACT
----------------------------------

1. Booking Date
   - Format strictly as: dd-mm-yyyy

2. Source
   - Shipment origin location

3. Destination
   - Shipment delivery location

4. Expected Delivery
   - Format strictly as: dd-mm-yyyy

5. Consignor (Sender)
   - Company Name
   - Person Name (if available)
   - Company Address

6. Consignee (Receiver)
   - Company Name
   - Person Name (if available)
   - Company Address

----------------------------------
SEMANTIC UNDERSTANDING RULES
----------------------------------

The document may use different labels. Interpret meaning intelligently.

Consignor (Sender) may appear as:
- Consignor
- Sender
- Dispatch From
- Bill From
- Shipper
- From Party
- Pickup From

Consignee (Receiver) may appear as:
- Consignee
- Receiver
- Bill To
- Ship To
- Delivery To
- Destination Party

Booking Date may appear as:
- Booking Date
- Date
- Shipment Date
- LR Date
- Consignment Date

Expected Delivery may appear as:
- Delivery Date
- Expected Delivery
- ETA
- Delivery Expected On

----------------------------------
EXTRACTION RULES
----------------------------------

- Ignore unrelated information.
- Do NOT guess missing values.
- If data is not found, return null.
- Normalize dates strictly into dd-mm-yyyy format.
- Preserve address formatting as readable text.
- Remove extra spaces, symbols, or OCR noise.
- Extract company names separately from addresses whenever possible.

----------------------------------
IMPORTANT CONSTRAINTS
----------------------------------

- Do NOT hallucinate data.
- Do NOT infer values not present in text.
- Only extract explicitly available information.
- Handle OCR errors intelligently (e.g., minor spelling variations).

----------------------------------
OUTPUT FORMAT (STRICT JSON)
----------------------------------

Return ONLY valid JSON:

{
  "booking_date": "",
  "source": "",
  "destination": "",
  "expected_delivery": "",
  "consignor": {
    "company_name": "",
    "name": "",
    "address": ""
  },
  "consignee": {
    "company_name": "",
    "name": "",
    "address": ""
  }
}

----------------------------------
OUTPUT REQUIREMENTS
----------------------------------

- No explanations.
- No extra text.
- JSON only.
- Keys must always exist.
- Use null if value missing.
"""

# Output keys from the spec (for validation / normalizer)
SPEC_JSON_KEYS = {
    "booking_date",
    "source",
    "destination",
    "expected_delivery",
    "consignor",
    "consignee",
}


def _clean_value(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, str):
        s = re.sub(r"\s+", " ", v).strip()
        return s if s else None
    return v


def _empty_spec_output() -> Dict[str, Any]:
    """Return the canonical empty output structure."""
    return {
        "booking_date": None,
        "source": None,
        "destination": None,
        "expected_delivery": None,
        "consignor": {
            "company_name": None,
            "name": None,
            "address": None,
        },
        "consignee": {
            "company_name": None,
            "name": None,
            "address": None,
        },
    }


def parse_spec_json(text: str) -> Dict[str, Any] | None:
    """
    Parse LLM/output text that should be the strict JSON from the spec.
    Returns the parsed dict or None if invalid. Fills missing keys with null.
    """
    if not text or not text.strip():
        return None
    text = text.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            return None
        out = _empty_spec_output()
        for k in list(out.keys()):
            if k in data:
                v = data[k]
                if k in ("consignor", "consignee") and isinstance(v, dict):
                    for sub in ("company_name", "name", "address"):
                        out[k][sub] = _clean_value(v.get(sub))
                else:
                    out[k] = _clean_value(v)
        return out
    except (json.JSONDecodeError, TypeError):
        return None


def spec_to_flat(spec: Dict[str, Any]) -> Dict[str, str]:
    """
    Convert the Document Intelligence spec JSON format to the flat field names
    used by the rest of the app (ShipmentForm, API, DB).

    Maps:
      booking_date     -> booking_date
      source           -> source
      destination      -> destination
      expected_delivery -> expected_delivery_date
      consignor.company_name / .name -> consignor_name (company or name)
      consignor.address               -> consignor_address
      consignee.company_name / .name  -> consignee_name
      consignee.address               -> consignee_address
    """
    flat: Dict[str, str] = {}
    if not spec:
        return flat

    def str_or_empty(v: Any) -> str:
        if v is None:
            return ""
        return (v if isinstance(v, str) else str(v)).strip()

    flat["booking_date"] = str_or_empty(spec.get("booking_date"))
    flat["source"] = str_or_empty(spec.get("source"))
    flat["destination"] = str_or_empty(spec.get("destination"))
    flat["expected_delivery_date"] = str_or_empty(spec.get("expected_delivery"))

    for party_key, name_key, addr_key in (
        ("consignor", "consignor_name", "consignor_address"),
        ("consignee", "consignee_name", "consignee_address"),
    ):
        party = spec.get(party_key)
        if isinstance(party, dict):
            company = str_or_empty(party.get("company_name"))
            name = str_or_empty(party.get("name"))
            addr = str_or_empty(party.get("address"))
            flat[name_key] = company or name or ""
            flat[addr_key] = addr
        else:
            flat[name_key] = ""
            flat[addr_key] = ""

    return {k: v for k, v in flat.items() if v}


def merge_spec_into_flat(flat: Dict[str, Any], spec: Dict[str, Any]) -> None:
    """
    Merge Document Intelligence spec output into an existing flat extracted dict.
    Only fills keys that are missing or empty (spec does not overwrite existing).
    Modifies `flat` in place.
    """
    filled = spec_to_flat(spec)
    for k, v in filled.items():
        if not v:
            continue
        cur = flat.get(k)
        if cur is None or (isinstance(cur, str) and not cur.strip()):
            flat[k] = v
