"""Notifications API: list and mark as read. Admin and owner receive notifications when a manager creates a booking."""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core import deps
from app.models.all_models import User, UserRole, Notification
from app.schemas.all_schemas import NotificationResponse

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def list_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List notifications for the current user (admin/owner get 'manager created booking' notifications)."""
    notifications = (
        db.query(Notification)
        .filter(Notification.for_user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return notifications


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark a notification as read. Only the recipient can mark it."""
    from datetime import datetime, timezone

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.for_user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    return notification
