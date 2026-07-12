from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.notification import Notification
from app.models.core import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    role: Optional[str]
    title: str
    description: str
    notification_type: str
    priority: str
    status: str
    created_at: datetime.datetime
    read_at: Optional[datetime.datetime]


class NotificationCount(BaseModel):
    total: int
    unread: int
    read: int
    archived: int


# ── GET all / filtered ────────────────────────────────────────────────────────
@router.get("/", response_model=List[NotificationOut], summary="Get notifications for a user or role")
def get_notifications(
    user_id: Optional[int] = Query(None, description="Filter by specific user ID"),
    role: Optional[str] = Query(None, description="Filter by role (e.g. 'Fleet Manager')"),
    status: Optional[str] = Query(None, description="Filter by status: Unread, Read, Archived"),
    priority: Optional[str] = Query(None, description="Filter by priority: Low, Medium, High, Critical"),
    notification_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Notification)

    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            query = query.filter(
                (Notification.user_id == user_id) | (Notification.role == user.role)
            )
        else:
            query = query.filter(Notification.user_id == user_id)
    elif role:
        query = query.filter(Notification.role == role)

    if status:
        query = query.filter(Notification.status == status)
    else:
        # Default: exclude archived
        query = query.filter(Notification.status != "Archived")

    if priority:
        query = query.filter(Notification.priority == priority)
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)

    return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()


# ── Unread count endpoint — PRD: notification bell with unread count ──────────
@router.get("/count", response_model=NotificationCount, summary="Get notification counts by status")
def get_notification_counts(
    user_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    base = db.query(Notification)
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            base = base.filter(
                (Notification.user_id == user_id) | (Notification.role == user.role)
            )
    elif role:
        base = base.filter(Notification.role == role)

    total = base.count()
    unread = base.filter(Notification.status == "Unread").count()
    read = base.filter(Notification.status == "Read").count()
    archived = base.filter(Notification.status == "Archived").count()
    return NotificationCount(total=total, unread=unread, read=read, archived=archived)


# ── FIX: read-all MUST come before /{id}/read to avoid route shadowing ────────
@router.patch("/read-all", summary="Mark all notifications as read")
def read_all_notifications(
    user_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.status == "Unread")
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            query = query.filter(
                (Notification.user_id == user_id) | (Notification.role == user.role)
            )
        else:
            query = query.filter(Notification.user_id == user_id)
    elif role:
        query = query.filter(Notification.role == role)

    notifications = query.all()
    now = datetime.datetime.now(datetime.timezone.utc)
    for notif in notifications:
        notif.status = "Read"
        notif.read_at = now
    db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read."}


@router.patch("/{id}/read", response_model=NotificationOut, summary="Mark a single notification as read")
def read_notification(id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.status = "Read"
    notification.read_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(notification)
    return notification


@router.delete("/{id}", summary="Delete a notification")
def delete_notification(id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted successfully."}


# ── Manual trigger endpoints (useful for testing / admin panel) ───────────────
@router.post("/trigger-scan", summary="Manually trigger expiry alert scan")
def trigger_scan(db: Session = Depends(get_db)):
    from app.utils.notifications import scan_and_generate_alerts
    created = scan_and_generate_alerts(db)
    return {"message": f"Scan complete. Generated {created} new notification(s)."}


@router.post("/trigger-archive", summary="Manually trigger archival of old notifications")
def trigger_archive(db: Session = Depends(get_db)):
    from app.utils.notifications import archive_old_notifications
    archived = archive_old_notifications(db)
    return {"message": f"Archive complete. Archived {archived} old notification(s)."}
