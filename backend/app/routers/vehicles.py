"""
Vehicles Router
CRUD endpoints for fleet vehicle management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.core import Vehicle
from app.utils.audit import log_action

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


class VehicleCreate(BaseModel):
    license_plate: str
    make: str
    model: str
    vehicle_type: str
    year: Optional[int] = None
    odometer: float = 0.0
    last_service_odometer: float = 0.0
    max_capacity: float = 0.0
    acquisition_cost: float = 0.0
    region: Optional[str] = None
    insurance_expiry: Optional[datetime.date] = None
    fitness_expiry: Optional[datetime.date] = None
    pollution_expiry: Optional[datetime.date] = None
    rc_expiry: Optional[datetime.date] = None
    maintenance_interval: float = 10000.0
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    vehicle_type: Optional[str] = None
    year: Optional[int] = None
    odometer: Optional[float] = None
    last_service_odometer: Optional[float] = None
    max_capacity: Optional[float] = None
    acquisition_cost: Optional[float] = None
    region: Optional[str] = None
    status: Optional[str] = None
    insurance_expiry: Optional[datetime.date] = None
    fitness_expiry: Optional[datetime.date] = None
    pollution_expiry: Optional[datetime.date] = None
    rc_expiry: Optional[datetime.date] = None
    maintenance_interval: Optional[float] = None
    notes: Optional[str] = None


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    license_plate: str
    make: str
    model: str
    vehicle_type: str
    year: Optional[int]
    odometer: float
    last_service_odometer: float
    max_capacity: float
    acquisition_cost: float
    region: Optional[str]
    status: str
    insurance_expiry: Optional[datetime.date]
    fitness_expiry: Optional[datetime.date]
    pollution_expiry: Optional[datetime.date]
    rc_expiry: Optional[datetime.date]
    maintenance_interval: float
    notes: Optional[str]
    created_at: datetime.datetime


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[VehicleOut], summary="List all vehicles")
def list_vehicles(
    status: Optional[str] = Query(None),
    vehicle_type: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    if region:
        query = query.filter(Vehicle.region == region)
    return query.order_by(Vehicle.created_at.desc()).offset(offset).limit(limit).all()


# ── Create ────────────────────────────────────────────────────────────────────
@router.post("/", response_model=VehicleOut, summary="Register a new vehicle")
def create_vehicle(
    req: VehicleCreate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    # Check for duplicate license plate
    existing = db.query(Vehicle).filter(Vehicle.license_plate == req.license_plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="License plate already registered.")

    vehicle = Vehicle(
        license_plate=req.license_plate,
        make=req.make,
        model=req.model,
        vehicle_type=req.vehicle_type,
        year=req.year,
        odometer=req.odometer,
        last_service_odometer=req.last_service_odometer,
        max_capacity=req.max_capacity,
        acquisition_cost=req.acquisition_cost,
        region=req.region,
        status="Healthy",
        insurance_expiry=req.insurance_expiry,
        fitness_expiry=req.fitness_expiry,
        pollution_expiry=req.pollution_expiry,
        rc_expiry=req.rc_expiry,
        maintenance_interval=req.maintenance_interval,
        notes=req.notes,
    )
    db.add(vehicle)
    db.flush()

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Vehicle",
        entity_id=vehicle.id,
        action="Created",
        new_value=f"Plate: {req.license_plate}, Type: {req.vehicle_type}",
    )
    db.commit()
    db.refresh(vehicle)
    return vehicle


# ── Get by ID ─────────────────────────────────────────────────────────────────
@router.get("/{vehicle_id}", response_model=VehicleOut, summary="Get vehicle details")
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return vehicle


# ── Update ────────────────────────────────────────────────────────────────────
@router.put("/{vehicle_id}", response_model=VehicleOut, summary="Update vehicle")
def update_vehicle(
    vehicle_id: int,
    req: VehicleUpdate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    old_values = []
    new_values = []
    update_data = req.model_dump(exclude_unset=True)

    if "license_plate" in update_data and update_data["license_plate"] != vehicle.license_plate:
        existing = db.query(Vehicle).filter(
            Vehicle.license_plate == update_data["license_plate"],
            Vehicle.id != vehicle_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="License plate already in use.")

    for field, value in update_data.items():
        old_val = getattr(vehicle, field)
        if old_val != value:
            old_values.append(f"{field}: {old_val}")
            new_values.append(f"{field}: {value}")
        setattr(vehicle, field, value)

    if old_values:
        log_action(
            db=db,
            user_id=user_id,
            entity_type="Vehicle",
            entity_id=vehicle.id,
            action="Updated",
            old_value=", ".join(old_values),
            new_value=", ".join(new_values),
        )

    db.commit()
    db.refresh(vehicle)
    return vehicle


# ── Delete (Retire) ───────────────────────────────────────────────────────────
@router.delete("/{vehicle_id}", summary="Retire/delete a vehicle")
def delete_vehicle(
    vehicle_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    old_status = vehicle.status
    vehicle.status = "Retired"

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Vehicle",
        entity_id=vehicle.id,
        action="Retired",
        old_value=f"Status: {old_status}",
        new_value="Status: Retired",
    )
    db.commit()
    return {"message": f"Vehicle {vehicle.license_plate} has been retired."}
