# -- Auth & Scan Job Schemas --
import json
import uuid
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, date


class TokenPayload(BaseModel):
    """JWT token payload (e.g. sub=user_id, exp=expiry)."""
    sub: Optional[int] = None
    exp: Optional[int] = None


class Token(BaseModel):
    """OAuth2 access token response."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Current user / me response."""
    id: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: str
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    """Update current user profile (full_name, phone)."""
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(BaseModel):
    """User registration/creation."""
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None


class ManagerOption(BaseModel):
    """Manager dropdown option (id, full_name, email)."""
    id: int
    full_name: Optional[str] = None
    email: str


class ManagerCreate(BaseModel):
    """Create manager (admin/owner only)."""
    full_name: str
    email: str
    phone: Optional[str] = None
    password: str


class ManagerResponse(BaseModel):
    """Manager list item (id, full_name, phone, email, is_active, created_at)."""
    id: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OperatorCreate(BaseModel):
    """Create operator (admin/owner only)."""
    full_name: str
    email: str
    phone: Optional[str] = None
    password: str


class OperatorResponse(BaseModel):
    """Operator list item (id, full_name, phone, email, is_active, created_at)."""
    id: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SetPasswordRequest(BaseModel):
    """Set/reset operator password (admin/owner only)."""
    new_password: str


class NotificationResponse(BaseModel):
    """In-app notification (e.g. manager created booking)."""
    id: int
    for_user_id: int
    message: str
    shipment_id: Optional[uuid.UUID] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -- Shipment Schemas (match Shipment model) --
class BulkPdfRequest(BaseModel):
    """Request body for bulk LR PDF download (zip of multiple shipment PDFs)."""
    ids: List[str]
    copy_type: str = Field(default="all", alias="copy")  # all | booking | pod | office


class ShipmentBase(BaseModel):
    lr_no: str
    branch_name: Optional[str] = None
    inv_no: Optional[str] = None
    invoice_value: Optional[float] = None
    boxes: Optional[int] = None
    weight: Optional[float] = None
    shipment_type: Optional[str] = None
    consignor_name: Optional[str] = None
    consignor_address: Optional[str] = None
    consignor_gstin: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_gstin: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    vehicle_no: Optional[str] = None
    booking_date: Optional[date] = None
    ship_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    remarks: Optional[str] = None
    owner_id: Optional[int] = None


class ShipmentCreate(ShipmentBase):
    """Create shipment request."""
    pass


class ShipmentUpdate(BaseModel):
    """Update shipment (all fields optional)."""
    lr_no: Optional[str] = None
    branch_name: Optional[str] = None
    inv_no: Optional[str] = None
    invoice_value: Optional[float] = None
    boxes: Optional[int] = None
    weight: Optional[float] = None
    shipment_type: Optional[str] = None
    consignor_name: Optional[str] = None
    consignor_address: Optional[str] = None
    consignor_gstin: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_gstin: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    vehicle_no: Optional[str] = None
    booking_date: Optional[date] = None
    ship_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    delivery_status: Optional[str] = None
    remarks: Optional[str] = None


class ShipmentFileResponse(BaseModel):
    """Minimal file info for shipment response (e.g. to check if POD exists)."""
    id: int
    file_type: str
    model_config = ConfigDict(from_attributes=True)


class ShipmentResponse(BaseModel):
    """Shipment API response."""
    id: uuid.UUID
    lr_no: str
    branch_name: Optional[str] = None
    inv_no: Optional[str] = None
    invoice_value: Optional[float] = None
    boxes: Optional[int] = None
    weight: Optional[float] = None
    shipment_type: Optional[str] = None
    consignor_name: Optional[str] = None
    consignor_address: Optional[str] = None
    consignor_gstin: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_gstin: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    vehicle_no: Optional[str] = None
    booking_date: Optional[date] = None
    ship_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    delivery_status: Optional[str] = None
    remarks: Optional[str] = None
    created_by_id: Optional[int] = None
    owner_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    files: Optional[List[ShipmentFileResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class ScanJobResponse(BaseModel):
    id: str
    status: str

    # ✅ API will return proper JSON objects (dict), not JSON strings
    extracted_data: Optional[Dict[str, Any]] = None
    confidence_scores: Optional[Dict[str, Any]] = None

    raw_text: Optional[str] = None
    created_at: datetime

    @field_validator("extracted_data", "confidence_scores", mode="before")
    def _parse_json_text(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return None

    model_config = ConfigDict(from_attributes=True)