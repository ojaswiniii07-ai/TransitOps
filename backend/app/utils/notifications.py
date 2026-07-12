from sqlalchemy.orm import Session
import datetime
from typing import Optional
from app.models.notification import Notification


# ─── Core Notification Helper ────────────────────────────────────────────────

def create_notification(
    db: Session,
    title: str,
    description: str,
    notification_type: str,
    priority: str = "Medium",
    role: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Notification:
    """
    Create a notification, skipping duplicates (same title+description still Unread).
    Does NOT commit — flushes so callers can batch with other operations.
    """
    duplicate = db.query(Notification).filter(
        Notification.title == title,
        Notification.description == description,
        Notification.status == "Unread",
    ).first()
    if duplicate:
        return duplicate

    notification = Notification(
        user_id=user_id,
        role=role,
        title=title,
        description=description,
        notification_type=notification_type,
        priority=priority,
        status="Unread",
    )
    db.add(notification)
    db.flush()
    return notification


# ─── Auto-Archive ────────────────────────────────────────────────────────────

def archive_old_notifications(db: Session) -> int:
    """Archive all non-archived notifications older than 30 days (PRD requirement)."""
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
    old = db.query(Notification).filter(
        Notification.created_at < cutoff,
        Notification.status != "Archived",
    ).all()
    for n in old:
        n.status = "Archived"
    db.commit()
    return len(old)


# ─── Alert Scanner ───────────────────────────────────────────────────────────

def scan_and_generate_alerts(db: Session) -> int:
    """
    Scan all active drivers and vehicles for upcoming expiries and generate
    role-specific notifications per the PRD trigger matrix.

    PRD trigger thresholds: 30 days, 15 days, 7 days, today (0 days).
    FIX: use range checks (<=) not exact-day matches so an alert isn't missed
    if the scheduler fires slightly late.
    """
    from app.models.core import Driver, Vehicle

    today = datetime.date.today()
    created_count = 0

    def _priority(days: int) -> str:
        if days <= 0:
            return "Critical"
        if days <= 7:
            return "High"
        if days <= 15:
            return "Medium"
        return "Low"

    def _within_threshold(days: int) -> bool:
        return days <= 30  # PRD: alert within 30 days

    # ── Driver License ──────────────────────────────────────────────────────
    drivers = db.query(Driver).filter(Driver.status == "Active").all()
    for driver in drivers:
        diff = (driver.license_expiry - today).days
        if _within_threshold(diff):
            if diff <= 0:
                desc = f"Driver {driver.name}'s license has EXPIRED ({driver.license_number})."
            else:
                desc = f"Driver {driver.name}'s license expires in {diff} day(s) ({driver.license_number})."
            notif = create_notification(
                db=db,
                title="Driver License Expiry Alert",
                description=desc,
                notification_type="Driver Expiry",
                priority=_priority(diff),
                role="Safety Officer",
            )
            if notif:
                created_count += 1

    # ── Driver Medical Certificate ──────────────────────────────────────────
    for driver in drivers:
        if driver.medical_expiry is None:
            continue
        diff = (driver.medical_expiry - today).days
        if _within_threshold(diff):
            if diff <= 0:
                desc = f"Driver {driver.name}'s medical certificate has EXPIRED."
            else:
                desc = f"Driver {driver.name}'s medical certificate expires in {diff} day(s)."
            notif = create_notification(
                db=db,
                title="Driver Medical Certificate Expiry Alert",
                description=desc,
                notification_type="Driver Expiry",
                priority=_priority(diff),
                role="Safety Officer",
            )
            if notif:
                created_count += 1

    # ── Vehicle Documents ───────────────────────────────────────────────────
    vehicles = db.query(Vehicle).filter(Vehicle.status != "Retired").all()
    doc_checks = [
        ("insurance_expiry", "Insurance", "Vehicle Insurance Expiry Alert"),
        ("fitness_expiry", "Fitness Certificate", "Vehicle Fitness Certificate Expiry Alert"),
        ("pollution_expiry", "Pollution Certificate", "Vehicle Pollution Certificate Expiry Alert"),
        ("rc_expiry", "RC", "Vehicle RC Expiry Alert"),
    ]
    for vehicle in vehicles:
        for attr, doc_name, title in doc_checks:
            expiry = getattr(vehicle, attr)
            if expiry is None:
                continue
            diff = (expiry - today).days
            if _within_threshold(diff):
                if diff <= 0:
                    desc = f"Vehicle {vehicle.license_plate} {doc_name} has EXPIRED."
                else:
                    desc = f"Vehicle {vehicle.license_plate} {doc_name} expires in {diff} day(s)."
                notif = create_notification(
                    db=db,
                    title=title,
                    description=desc,
                    notification_type="Vehicle Expiry",
                    priority=_priority(diff),
                    role="Fleet Manager",
                )
                if notif:
                    created_count += 1

    db.commit()
    return created_count
