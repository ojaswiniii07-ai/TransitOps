"""
Trips Router
PRD: Trip Delayed / Trip Cancelled trigger notifications to Dispatcher.
Exposes CRUD endpoints + PATCH /trips/{id}/status for state transitions.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.core import Trip, Vehicle, Driver
from app.utils.audit import log_action
from app.utils.notifications import create_notification

router = APIRouter(prefix="/trips", tags=["Trips"])

VALID_STATUSES = {"Scheduled", "Dispatched", "Completed", "Cancelled", "Delayed"}


class TripCreate(BaseModel):
    vehicle_id: int
    driver_id: int
    route: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    distance: float = 0.0
    scheduled_at: Optional[datetime.datetime] = None


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    driver_id: int
    route: str
    origin: Optional[str]
    destination: Optional[str]
    distance: float
    status: str
    scheduled_at: Optional[datetime.datetime]
    dispatched_at: Optional[datetime.datetime]
    completed_at: Optional[datetime.datetime]
    cancelled_at: Optional[datetime.datetime]
    delay_reason: Optional[str]
    created_at: datetime.datetime


class TripStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None  # for Delayed / Cancelled
    odometer_reading: Optional[float] = None  # for Completed


# ── Create ────────────────────────────────────────────────────────────────────
@router.post("/", response_model=TripOut, summary="Create a new trip")
def create_trip(
    req: TripCreate, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if vehicle.status == "Retired":
        raise HTTPException(
            status_code=400, detail="Cannot dispatch a retired vehicle."
        )
    # PRD: Vehicles marked Overdue cannot be dispatched (configurable)
    if vehicle.status == "Overdue":
        raise HTTPException(
            status_code=400,
            detail="Vehicle is overdue for maintenance and cannot be dispatched.",
        )

    driver = db.query(Driver).filter(Driver.id == req.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver.status == "Suspended":
        raise HTTPException(status_code=400, detail="Cannot assign a suspended driver.")

    trip = Trip(
        vehicle_id=req.vehicle_id,
        driver_id=req.driver_id,
        route=req.route,
        origin=req.origin,
        destination=req.destination,
        distance=req.distance,
        status="Scheduled",
        scheduled_at=req.scheduled_at,
    )
    db.add(trip)
    db.flush()
    log_action(
        db=db,
        user_id=user_id,
        entity_type="Trip",
        entity_id=trip.id,
        action="Created",
        new_value=f"Route: {req.route}",
    )
    db.commit()
    db.refresh(trip)
    return trip


# ── List ──────────────────────────────────────────────────────────────────────
@router.get(
    "/", response_model=List[TripOut], summary="List trips with optional filters"
)
def list_trips(
    status: Optional[str] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Trip)
    if status:
        query = query.filter(Trip.status == status)
    if vehicle_id is not None:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if driver_id is not None:
        query = query.filter(Trip.driver_id == driver_id)
    return query.order_by(Trip.created_at.desc()).offset(offset).limit(limit).all()


# ── Get by ID ─────────────────────────────────────────────────────────────────
@router.get("/{trip_id}", response_model=TripOut, summary="Get trip details")
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


# ── Update status (PRD: Delayed / Cancelled → notify Dispatcher) ──────────────
@router.patch("/{trip_id}/status", response_model=TripOut, summary="Update trip status")
def update_trip_status(
    trip_id: int,
    payload: TripStatusUpdate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Allowed: {VALID_STATUSES}"
        )

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status == "Completed":
        raise HTTPException(
            status_code=400, detail="Cannot change status of a completed trip."
        )
    if trip.status == "Cancelled":
        raise HTTPException(
            status_code=400, detail="Cannot change status of a cancelled trip."
        )

    old_status = trip.status
    now = datetime.datetime.now(datetime.timezone.utc)

    if payload.status == "Dispatched":
        trip.dispatched_at = now
        create_notification(
            db=db,
            title="Trip Dispatched",
            description=f"Trip #{trip.id} ({trip.route}) has been dispatched.",
            notification_type="Trip Dispatched",
            priority="Low",
            role="Dispatcher",
        )

    elif payload.status == "Delayed":
        # PRD: "Trip delayed" → notify Dispatcher
        trip.delay_reason = payload.reason
        create_notification(
            db=db,
            title="Trip Delayed",
            description=f"Trip #{trip.id} ({trip.route}) is delayed. Reason: {payload.reason or 'Not specified'}.",
            notification_type="Trip Delay",
            priority="High",
            role="Dispatcher",
        )

    elif payload.status == "Cancelled":
        # PRD: "Trip cancelled" → notify Dispatcher
        trip.cancelled_at = now
        trip.delay_reason = payload.reason
        create_notification(
            db=db,
            title="Trip Cancelled",
            description=f"Trip #{trip.id} ({trip.route}) has been cancelled. Reason: {payload.reason or 'Not specified'}.",
            notification_type="Trip Cancelled",
            priority="High",
            role="Dispatcher",
        )

    elif payload.status == "Completed":
        if payload.odometer_reading is None:
            raise HTTPException(
                status_code=400,
                detail="odometer_reading is required to complete a trip.",
            )
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        if vehicle and payload.odometer_reading < vehicle.odometer:
            raise HTTPException(
                status_code=400,
                detail=f"Odometer {payload.odometer_reading} cannot be less than vehicle current {vehicle.odometer}.",
            )
        trip.completed_at = now
        if vehicle:
            vehicle.odometer = payload.odometer_reading
            from app.utils.maintenance import calculate_vehicle_maintenance

            calculate_vehicle_maintenance(db, vehicle.id)
        create_notification(
            db=db,
            title="Trip Completed",
            description=f"Trip #{trip.id} ({trip.route}) has been completed.",
            notification_type="Trip Completed",
            priority="Low",
            role="Dispatcher",
        )

    trip.status = payload.status
    log_action(
        db=db,
        user_id=user_id,
        entity_type="Trip",
        entity_id=trip.id,
        action=payload.status,
        old_value=f"Status: {old_status}",
        new_value=f"Status: {payload.status}",
    )
    db.commit()
    db.refresh(trip)
    return trip
