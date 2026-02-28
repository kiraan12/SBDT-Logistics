
import uuid
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import datetime

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OPERATOR = "OPERATOR"
    OWNER = "OWNER"

class DeliveryStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR)
    is_active = Column(Boolean(), default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lr_no = Column(String, unique=True, index=True, nullable=False)
    branch_name = Column(String, index=True)
    
    # Invoice Details
    inv_no = Column(String, index=True)
    invoice_value = Column(Float)
    boxes = Column(Integer)
    weight = Column(Float)
    shipment_type = Column(String) # Packing Type
    
    # Parties
    consignor_name = Column(String)
    consignor_address = Column(Text)
    consignor_gstin = Column(String)
    consignee_name = Column(String)
    consignee_address = Column(Text)
    consignee_gstin = Column(String)
    
    # Route
    source = Column(String)
    destination = Column(String)
    vehicle_no = Column(String)
    
    # Dates
    booking_date = Column(Date)
    ship_date = Column(Date)
    expected_delivery_date = Column(Date)
    eta = Column(DateTime(timezone=True))
    actual_delivery_date = Column(DateTime(timezone=True))
    
    # Status
    delivery_status = Column(Enum(DeliveryStatus), default=DeliveryStatus.BOOKED)
    remarks = Column(Text)
    
    # Meta: who created the record; owner = which company (manager) this shipment belongs to for tracking
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User", foreign_keys=[created_by_id])
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Manager/company who can track this shipment
    owner = relationship("User", foreign_keys=[owner_id])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    files = relationship("ShipmentFile", back_populates="shipment")

class ShipmentFile(Base):
    __tablename__ = "shipment_files"
    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"))
    file_type = Column(String) # E.g., "POD", "INVOICE"
    file_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    shipment = relationship("Shipment", back_populates="files")

class Notification(Base):
    """In-app notification. Used e.g. to notify admin/owner when a manager creates a booking."""
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    for_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    for_user = relationship("User", foreign_keys=[for_user_id])
    shipment = relationship("Shipment", foreign_keys=[shipment_id])


class ScanJob(Base):
    __tablename__ = "scan_jobs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default="PENDING") # PENDING, PROCESSING, COMPLETED, FAILED
    input_file_path = Column(String)
    extracted_data = Column(Text) # JSON string
    confidence_scores = Column(Text) # JSON string
    raw_text = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # user who created the scan
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
