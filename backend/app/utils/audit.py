from sqlalchemy.orm import Session
from typing import Optional
from app.models.audit import AuditLog
import datetime


def log_action(
    db: Session,
    user_id: Optional[int],
    entity_type: str,
    entity_id: int,
    action: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Record an auditable action to the audit_logs table."""
    audit = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address
    )
    db.add(audit)
    # Do NOT commit here — let the calling code commit so we can batch
    # with other changes in the same transaction.
    db.flush()
    return audit
