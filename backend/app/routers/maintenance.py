from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.core import Vehicle, Trip
from app.utils.maintenance import calculate_vehicle_maintenance
from app.utils.audit import log_action
from app.utils.notifications import create_notification

router = APIRouter(prefix="/maintenance", tags=["Predictive Maintenance"])


class MaintenanceScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    next_service_date: Optional[datetime.date]
    next_service_odometer: float
    last_service_date: Optional[datetime.date]
    current_status: str
    last_updated: datetime.datetime


# ── GET all schedules ─────────────────────────────────────────────────────────
@router.get("/schedule", response_model=List[MaintenanceScheduleOut], summary="Get all maintenance schedules")
def get_schedules(
    status: Optional[str] = Query(None, description="Healthy, Upcoming, Overdue"),
    db: Session = Depends(get_db),
):
    query = db.query(MaintenanceSchedule)
    if status:
        query = query.filter(MaintenanceSchedule.current_status == status)
    return query.all()


# ── GET upcoming / overdue ────────────────────────────────────────────────────
@router.get("/upcoming", response_model=List[MaintenanceScheduleOut], summary="Get upcoming and overdue schedules")
def get_upcoming_schedules(db: Session = Depends(get_db)):
    return db.query(MaintenanceSchedule).filter(
        MaintenanceSchedule.current_status.in_(["Upcoming", "Overdue"])
    ).all()


# ── Recalculate all ───────────────────────────────────────────────────────────
@router.post("/recalculate", response_model=List[MaintenanceScheduleOut], summary="Recalculate schedules for all active vehicles")
def recalculate_all_schedules(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).filter(Vehicle.status != "Retired").all()
    schedules = []
    for vehicle in vehicles:
        sched = calculate_vehicle_maintenance(db, vehicle.id)
        if sched:
            schedules.append(sched)
    db.commit()
    return schedules


# ── GET single vehicle schedule ───────────────────────────────────────────────
@router.get("/schedule/{vehicle_id}", response_model=MaintenanceScheduleOut, summary="Get schedule for a specific vehicle")
def get_vehicle_schedule(vehicle_id: int, db: Session = Depends(get_db)):
    sched = db.query(MaintenanceSchedule).filter(
        MaintenanceSchedule.vehicle_id == vehicle_id
    ).first()
    if not sched:
        raise HTTPException(status_code=404, detail="No maintenance schedule found for this vehicle.")
    return sched


# ── Trip Completion (PRD: schedule recalculates after every completed trip) ───
@router.post("/trips/{trip_id}/complete", summary="Complete a trip and update odometer + maintenance schedule")
def complete_trip(
    trip_id: int,
    odometer_reading: float = Query(..., description="Final odometer reading at trip end"),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.status == "Completed":
        raise HTTPException(status_code=400, detail="Trip is already completed.")
    if trip.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled trip.")

    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Associated vehicle not found.")
    if odometer_reading < vehicle.odometer:
        raise HTTPException(
            status_code=400,
            detail=f"Odometer reading {odometer_reading} cannot be less than current {vehicle.odometer}."
        )

    old_status = trip.status
    old_odometer = vehicle.odometer

    trip.status = "Completed"
    trip.completed_at = datetime.datetime.now(datetime.timezone.utc)
    vehicle.odometer = odometer_reading
    db.flush()

    log_action(db=db, user_id=user_id, entity_type="Trip", entity_id=trip.id,
               action="Completed", old_value=f"Status: {old_status}", new_value="Status: Completed")
    log_action(db=db, user_id=user_id, entity_type="Vehicle", entity_id=vehicle.id,
               action="Updated", old_value=f"Odometer: {old_odometer}", new_value=f"Odometer: {odometer_reading}")

    # Notify dispatcher
    create_notification(
        db=db,
        title="Trip Completed",
        description=f"Trip #{trip.id} ({trip.route}) has been marked as completed.",
        notification_type="Trip Completed",
        priority="Low",
        role="Dispatcher",
    )

    # Recalculate maintenance after trip (PRD requirement)
    calculate_vehicle_maintenance(db, vehicle.id)
    db.commit()

    return {"message": "Trip completed. Odometer updated and maintenance schedule recalculated."}
