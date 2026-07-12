"""
Drivers Router
CRUD endpoints for driver management + suspend/activate workflows.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.core import Driver
from app.utils.audit import log_action
from app.utils.notifications import create_notification

router = APIRouter(prefix="/drivers", tags=["Drivers"])


class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    license_number: str
    license_category: Optional[str] = None
    license_expiry: datetime.date
    medical_expiry: Optional[datetime.date] = None
    safety_score: float = 100.0
    notes: Optional[str] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[datetime.date] = None
    medical_expiry: Optional[datetime.date] = None
    safety_score: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: Optional[str]
    license_number: str
    license_category: Optional[str]
    license_expiry: datetime.date
    medical_expiry: Optional[datetime.date]
    safety_score: float
    status: str
    notes: Optional[str]
    created_at: datetime.datetime


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[DriverOut], summary="List all drivers")
def list_drivers(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Driver)
    if status:
        query = query.filter(Driver.status == status)
    return query.order_by(Driver.created_at.desc()).offset(offset).limit(limit).all()


# ── Create ────────────────────────────────────────────────────────────────────
@router.post("/", response_model=DriverOut, summary="Register a new driver")
def create_driver(
    req: DriverCreate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    existing = db.query(Driver).filter(Driver.license_number == req.license_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="License number already registered.")

    driver = Driver(
        name=req.name,
        phone=req.phone,
        license_number=req.license_number,
        license_category=req.license_category,
        license_expiry=req.license_expiry,
        medical_expiry=req.medical_expiry,
        safety_score=req.safety_score,
        status="Active",
        notes=req.notes,
    )
    db.add(driver)
    db.flush()

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Driver",
        entity_id=driver.id,
        action="Added",
        new_value=f"Name: {req.name}, License: {req.license_number}",
    )
    db.commit()
    db.refresh(driver)
    return driver


# ── Get by ID ─────────────────────────────────────────────────────────────────
@router.get("/{driver_id}", response_model=DriverOut, summary="Get driver details")
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return driver


# ── Update ────────────────────────────────────────────────────────────────────
@router.put("/{driver_id}", response_model=DriverOut, summary="Update driver details")
def update_driver(
    driver_id: int,
    req: DriverUpdate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    old_values = []
    new_values = []
    update_data = req.model_dump(exclude_unset=True)

    if "license_number" in update_data and update_data["license_number"] != driver.license_number:
        existing = db.query(Driver).filter(
            Driver.license_number == update_data["license_number"],
            Driver.id != driver_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="License number already in use.")

    for field, value in update_data.items():
        old_val = getattr(driver, field)
        if old_val != value:
            old_values.append(f"{field}: {old_val}")
            new_values.append(f"{field}: {value}")
        setattr(driver, field, value)

    # Auto-suspend if safety score drops below 50
    if driver.safety_score < 50 and driver.status != "Suspended":
        driver.status = "Suspended"
        new_values.append("Auto-suspended: safety_score < 50")

    if old_values:
        log_action(
            db=db,
            user_id=user_id,
            entity_type="Driver",
            entity_id=driver.id,
            action="Updated",
            old_value=", ".join(old_values),
            new_value=", ".join(new_values),
        )

    db.commit()
    db.refresh(driver)
    return driver


# ── Suspend ───────────────────────────────────────────────────────────────────
@router.patch("/{driver_id}/suspend", response_model=DriverOut, summary="Suspend a driver")
def suspend_driver(
    driver_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver.status == "Suspended":
        raise HTTPException(status_code=400, detail="Driver is already suspended.")

    old_status = driver.status
    driver.status = "Suspended"

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Driver",
        entity_id=driver.id,
        action="Suspended",
        old_value=f"Status: {old_status}",
        new_value="Status: Suspended",
    )
    create_notification(
        db=db,
        title="Driver Suspended",
        description=f"Driver '{driver.name}' (ID: {driver.id}) has been suspended.",
        notification_type="Driver Suspended",
        priority="High",
        role="Safety Officer",
    )
    db.commit()
    db.refresh(driver)
    return driver


# ── Activate ──────────────────────────────────────────────────────────────────
@router.patch("/{driver_id}/activate", response_model=DriverOut, summary="Activate a suspended driver")
def activate_driver(
    driver_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver.status != "Suspended":
        raise HTTPException(status_code=400, detail="Driver is not suspended.")
    if driver.safety_score < 50:
        raise HTTPException(
            status_code=400,
            detail="Cannot activate: safety score is below 50. Audit score first.",
        )

    driver.status = "Active"

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Driver",
        entity_id=driver.id,
        action="Activated",
        old_value="Status: Suspended",
        new_value="Status: Active",
    )
    db.commit()
    db.refresh(driver)
    return driver


# ── Delete (soft) ─────────────────────────────────────────────────────────────
@router.delete("/{driver_id}", summary="Remove a driver from active records")
def delete_driver(
    driver_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Driver",
        entity_id=driver.id,
        action="Deleted",
        old_value=f"Name: {driver.name}, Status: {driver.status}",
    )
    db.delete(driver)
    db.commit()
    return {"message": f"Driver '{driver.name}' has been removed."}
