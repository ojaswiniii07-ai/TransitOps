from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.audit import AuditLog
from app.models.core import User

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    entity_type: str
    entity_id: int
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    timestamp: datetime.datetime
    ip_address: Optional[str]


# ── GET with full filtering (PRD: filter by User, Action, Entity, Date Range) ─
@router.get("/", response_model=List[AuditLogOut], summary="Get audit logs with filters")
def get_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by acting user"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity: Optional[str] = Query(None, description="Filter by entity type (Vehicle, Driver, etc.)"),
    entity_id: Optional[int] = Query(None, description="Filter by specific entity ID"),
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity_type == entity)
    if entity_id is not None:
        query = query.filter(AuditLog.entity_id == entity_id)
    if start_date:
        query = query.filter(
            AuditLog.timestamp >= datetime.datetime.combine(start_date, datetime.time.min)
        )
    if end_date:
        query = query.filter(
            AuditLog.timestamp <= datetime.datetime.combine(end_date, datetime.time.max)
        )
    return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()


# ── PRD: Audit logs cannot be edited; only Admin can delete ──────────────────
@router.delete("/{id}", summary="Delete an audit log entry (Admin only)")
def delete_audit_log(id: int, request_user_id: int = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request_user_id).first()
    if not user or user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete audit logs.")
    audit = db.query(AuditLog).filter(AuditLog.id == id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit log not found.")
    db.delete(audit)
    db.commit()
    return {"message": "Audit log deleted successfully."}
