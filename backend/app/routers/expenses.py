"""
Expenses Router
PRD: Expense threshold auto-trigger for Notifications + Approvals.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.core import Expense, Vehicle, Driver, Trip, User
from app.models.approval import Approval
from app.config import settings
from app.utils.audit import log_action
from app.utils.notifications import create_notification

router = APIRouter(prefix="/expenses", tags=["Expenses"])


class ExpenseCreate(BaseModel):
    vehicle_id: int
    driver_id: Optional[int] = None
    trip_id: Optional[int] = None
    category: str  # Fuel, Toll, Food, Miscellaneous
    amount: float
    date: Optional[datetime.date] = None
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    driver_id: Optional[int]
    trip_id: Optional[int]
    category: str
    amount: float
    date: datetime.date
    status: str
    notes: Optional[str]
    submitted_by: Optional[int]
    created_at: datetime.datetime


# ── Create (with Threshold logic) ─────────────────────────────────────────────
@router.post("/", response_model=ExpenseOut, summary="Submit a new expense")
def create_expense(
    req: ExpenseCreate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    if req.driver_id:
        driver = db.query(Driver).filter(Driver.id == req.driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found.")

    if req.trip_id:
        trip = db.query(Trip).filter(Trip.id == req.trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found.")

    # PRD Threshold Logic
    exceeds_threshold = req.amount > settings.EXPENSE_APPROVAL_THRESHOLD
    initial_status = "Pending" if exceeds_threshold else "Approved"

    expense = Expense(
        vehicle_id=req.vehicle_id,
        driver_id=req.driver_id,
        trip_id=req.trip_id,
        category=req.category,
        amount=req.amount,
        date=req.date or datetime.date.today(),
        status=initial_status,
        notes=req.notes,
        submitted_by=user_id,
    )
    db.add(expense)
    db.flush()  # get ID for audit and approval

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Expense",
        entity_id=expense.id,
        action="Created",
        new_value=f"Amount: {req.amount}, Status: {initial_status}",
    )

    if exceeds_threshold:
        # PRD: Generate Approval Request automatically
        approval = Approval(
            request_type="Expense Amount",
            entity_id=expense.id,
            entity_type="Expense",
            requested_by=user_id or 1,  # fallback to admin if no user context
            status="Pending",
            comments=f"Auto-generated: Expense amount ({req.amount}) exceeds threshold ({settings.EXPENSE_APPROVAL_THRESHOLD}).",
        )
        db.add(approval)
        db.flush()

        # PRD: Generate Notification automatically
        create_notification(
            db=db,
            title="High Expense Approval Required",
            description=f"Expense #{expense.id} for {req.amount} exceeds the auto-approval threshold. Approval request #{approval.id} created.",
            notification_type="Approval Pending",
            priority="High",
            role="Fleet Manager",
        )
    else:
        # Auto-approved, just notify lightly
        create_notification(
            db=db,
            title="Expense Auto-Approved",
            description=f"Expense #{expense.id} for {req.amount} was auto-approved (below threshold).",
            notification_type="Expense Auto-Approved",
            priority="Low",
            role="Fleet Manager",
        )

    db.commit()
    db.refresh(expense)
    return expense


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[ExpenseOut], summary="List all expenses")
def list_expenses(
    vehicle_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    trip_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    if vehicle_id is not None:
        query = query.filter(Expense.vehicle_id == vehicle_id)
    if driver_id is not None:
        query = query.filter(Expense.driver_id == driver_id)
    if trip_id is not None:
        query = query.filter(Expense.trip_id == trip_id)
    if status:
        query = query.filter(Expense.status == status)
    if category:
        query = query.filter(Expense.category == category)

    return query.order_by(Expense.created_at.desc()).offset(offset).limit(limit).all()


# ── Get by ID ─────────────────────────────────────────────────────────────────
@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    return expense


# ── Delete ────────────────────────────────────────────────────────────────────
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    # Also clean up any pending approvals for this expense
    approvals = (
        db.query(Approval)
        .filter(
            Approval.entity_type == "Expense",
            Approval.entity_id == expense.id,
            Approval.status == "Pending",
        )
        .all()
    )
    for app in approvals:
        db.delete(app)

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Expense",
        entity_id=expense.id,
        action="Deleted",
        old_value=f"Amount: {expense.amount}, Status: {expense.status}",
    )

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully."}
