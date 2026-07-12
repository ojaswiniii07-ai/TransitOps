"""
Dashboard Router
PRD: Dashboard KPIs (Notifications, Predictive Maintenance).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.database import get_db
from app.models.core import Vehicle, Driver, Trip, Expense
from app.models.notification import Notification
from app.models.approval import Approval

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class KPIDashboard(BaseModel):
    # Fleet Stats
    total_vehicles: int
    active_vehicles: int
    total_drivers: int
    active_drivers: int

    # Trip Stats
    active_trips: int  # Scheduled, Dispatched, Delayed
    completed_trips: int

    # Maintenance Stats (Predictive Maintenance KPIs)
    healthy_vehicles: int
    upcoming_maintenance: int
    overdue_maintenance: int

    # Notification & Approval Stats
    unread_notifications: int
    pending_approvals: int

    # Financial Stats (Simple)
    total_expenses_pending: float


@router.get(
    "/kpis",
    response_model=KPIDashboard,
    summary="Get dashboard key performance indicators",
)
def get_kpis(db: Session = Depends(get_db)):
    # Vehicles
    total_vehicles = db.query(Vehicle).count()
    active_vehicles = db.query(Vehicle).filter(Vehicle.status != "Retired").count()

    # Drivers
    total_drivers = db.query(Driver).count()
    active_drivers = db.query(Driver).filter(Driver.status == "Active").count()

    # Trips
    active_trips = (
        db.query(Trip)
        .filter(Trip.status.in_(["Scheduled", "Dispatched", "Delayed"]))
        .count()
    )
    completed_trips = db.query(Trip).filter(Trip.status == "Completed").count()

    # Maintenance (using Vehicle status directly for accuracy before schedules exist)
    healthy_vehicles = db.query(Vehicle).filter(Vehicle.status == "Healthy").count()
    upcoming_maintenance = db.query(Vehicle).filter(Vehicle.status == "Upcoming").count()
    overdue_maintenance = db.query(Vehicle).filter(Vehicle.status == "Overdue").count()

    # Notifications & Approvals
    unread_notifications = (
        db.query(Notification).filter(Notification.status == "Unread").count()
    )
    pending_approvals = db.query(Approval).filter(Approval.status == "Pending").count()

    # Financials
    total_expenses_pending_query = (
        db.query(func.sum(Expense.amount)).filter(Expense.status == "Pending").scalar()
    )
    total_expenses_pending = float(total_expenses_pending_query or 0.0)

    return KPIDashboard(
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        total_drivers=total_drivers,
        active_drivers=active_drivers,
        active_trips=active_trips,
        completed_trips=completed_trips,
        healthy_vehicles=healthy_vehicles,
        upcoming_maintenance=upcoming_maintenance,
        overdue_maintenance=overdue_maintenance,
        unread_notifications=unread_notifications,
        pending_approvals=pending_approvals,
        total_expenses_pending=total_expenses_pending,
    )
