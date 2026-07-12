from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.approval import Approval
from app.models.core import User, Vehicle, Driver, Maintenance, Expense
from app.utils.audit import log_action
from app.utils.notifications import create_notification

router = APIRouter(prefix="/approvals", tags=["Approvals"])

AUTHORIZED_APPROVER_ROLES = {"Admin", "Fleet Manager"}


class ApprovalCreate(BaseModel):
    request_type: str           # Vehicle Retirement, Driver Suspension, Maintenance Cost, Expense Amount, Vehicle Purchase
    entity_id: Optional[int] = None
    entity_type: Optional[str] = None
    requested_by: int
    comments: Optional[str] = None


class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_type: str
    entity_id: Optional[int]
    entity_type: Optional[str]
    requested_by: int
    approver_id: Optional[int]
    status: str
    comments: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ── Create approval request ───────────────────────────────────────────────────
@router.post("/", response_model=ApprovalOut, summary="Submit an approval request")
def create_approval_request(req: ApprovalCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.requested_by).first()
    if not user:
        raise HTTPException(status_code=400, detail="Requesting user not found.")

    approval = Approval(
        request_type=req.request_type,
        entity_id=req.entity_id,
        entity_type=req.entity_type,
        requested_by=req.requested_by,
        status="Pending",
        comments=req.comments,
    )
    db.add(approval)
    db.flush()

    create_notification(
        db=db,
        title="New Approval Request Pending",
        description=f"User '{user.username}' submitted a '{req.request_type}' approval request.",
        notification_type="Approval Pending",
        priority="High",
        role="Fleet Manager",
    )
    log_action(
        db=db,
        user_id=req.requested_by,
        entity_type="Approval",
        entity_id=approval.id,
        action="Request Created",
        new_value=f"Type: {req.request_type}, EntityType: {req.entity_type}, EntityID: {req.entity_id}",
    )
    db.commit()
    db.refresh(approval)
    return approval


# ── Get all approvals (with filters) ─────────────────────────────────────────
@router.get("/", response_model=List[ApprovalOut], summary="List all approval requests")
def get_approvals(
    status: Optional[str] = Query(None, description="Pending, Approved, Rejected"),
    request_type: Optional[str] = Query(None),
    requested_by: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Approval)
    if status:
        query = query.filter(Approval.status == status)
    if request_type:
        query = query.filter(Approval.request_type == request_type)
    if requested_by is not None:
        query = query.filter(Approval.requested_by == requested_by)
    return query.order_by(Approval.created_at.desc()).offset(offset).limit(limit).all()


# ── Pending only ──────────────────────────────────────────────────────────────
@router.get("/pending", response_model=List[ApprovalOut], summary="Get pending approval requests")
def get_pending_approvals(db: Session = Depends(get_db)):
    return db.query(Approval).filter(Approval.status == "Pending").order_by(Approval.created_at).all()


# ── Approve ───────────────────────────────────────────────────────────────────
@router.patch("/{id}/approve", response_model=ApprovalOut, summary="Approve a pending request")
def approve_request(
    id: int,
    approver_id: int = Query(...),
    comments: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    approver = db.query(User).filter(User.id == approver_id).first()
    if not approver or approver.role not in AUTHORIZED_APPROVER_ROLES:
        raise HTTPException(status_code=403, detail="Only Admins or Fleet Managers can approve requests.")

    approval = db.query(Approval).filter(Approval.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    if approval.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Request already processed ({approval.status}).")

    # PRD: "Approved requests execute automatically"
    executed_action = "none"
    if approval.entity_id:
        if approval.request_type == "Vehicle Retirement":
            v = db.query(Vehicle).filter(Vehicle.id == approval.entity_id).first()
            if v:
                v.status = "Retired"
                executed_action = f"Vehicle#{v.id} set to Retired"
        elif approval.request_type == "Driver Suspension":
            d = db.query(Driver).filter(Driver.id == approval.entity_id).first()
            if d:
                d.status = "Suspended"
                executed_action = f"Driver#{d.id} set to Suspended"
        elif approval.request_type == "Maintenance Cost":
            m = db.query(Maintenance).filter(Maintenance.id == approval.entity_id).first()
            if m:
                m.status = "Approved"
                executed_action = f"Maintenance#{m.id} set to Approved"
        elif approval.request_type == "Expense Amount":
            e = db.query(Expense).filter(Expense.id == approval.entity_id).first()
            if e:
                e.status = "Approved"
                executed_action = f"Expense#{e.id} set to Approved"

    approval.status = "Approved"
    approval.approver_id = approver_id
    if comments:
        approval.comments = comments

    log_action(
        db=db,
        user_id=approver_id,
        entity_type="Approval",
        entity_id=approval.id,
        action="Approved",
        new_value=f"Executed: {executed_action}",
    )
    create_notification(
        db=db,
        title="Approval Request Approved",
        description=f"Your '{approval.request_type}' request was APPROVED by {approver.username}.",
        notification_type="Approval Decision",
        priority="Medium",
        user_id=approval.requested_by,
    )
    db.commit()
    db.refresh(approval)
    return approval


# ── Reject ────────────────────────────────────────────────────────────────────
@router.patch("/{id}/reject", response_model=ApprovalOut, summary="Reject a pending request")
def reject_request(
    id: int,
    approver_id: int = Query(...),
    comments: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    approver = db.query(User).filter(User.id == approver_id).first()
    if not approver or approver.role not in AUTHORIZED_APPROVER_ROLES:
        raise HTTPException(status_code=403, detail="Only Admins or Fleet Managers can reject requests.")

    approval = db.query(Approval).filter(Approval.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    if approval.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Request already processed ({approval.status}).")

    # PRD FIX: "Rejected requests cannot modify data" — do NOT touch the target entity
    approval.status = "Rejected"
    approval.approver_id = approver_id
    if comments:
        approval.comments = comments

    log_action(
        db=db,
        user_id=approver_id,
        entity_type="Approval",
        entity_id=approval.id,
        action="Rejected",
        new_value=f"Comments: {comments}",
    )
    create_notification(
        db=db,
        title="Approval Request Rejected",
        description=f"Your '{approval.request_type}' request was REJECTED by {approver.username}.",
        notification_type="Approval Decision",
        priority="Medium",
        user_id=approval.requested_by,
    )
    db.commit()
    db.refresh(approval)
    return approval
