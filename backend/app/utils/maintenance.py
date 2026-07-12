from sqlalchemy.orm import Session
import datetime
from typing import Optional
from app.models.core import Vehicle
from app.models.maintenance_schedule import MaintenanceSchedule
from app.utils.notifications import create_notification


def calculate_vehicle_maintenance(db: Session, vehicle_id: int) -> Optional[MaintenanceSchedule]:
    """
    Recalculate predictive maintenance schedule for a vehicle based on the PRD logic:

      If current_odometer >= (last_service_odometer + maintenance_interval):
          status = Overdue
      elif current_odometer >= (last_service_odometer + maintenance_interval - 1000):
          status = Upcoming
      else:
          status = Healthy

    Also generates Fleet Manager notifications and updates the vehicle status field.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        return None

    next_service_odom = vehicle.last_service_odometer + vehicle.maintenance_interval
    today = datetime.date.today()

    # Determine status
    if vehicle.odometer >= next_service_odom:
        status = "Overdue"
    elif vehicle.odometer >= (next_service_odom - 1000.0):
        status = "Upcoming"
    else:
        status = "Healthy"

    # Estimate next service date from remaining distance and assumed 500km/day avg
    remaining = max(next_service_odom - vehicle.odometer, 0)
    avg_daily = 500.0   # configurable default
    days_until = int(remaining / avg_daily) if avg_daily > 0 else 90
    next_service_date = today + datetime.timedelta(days=days_until) if status == "Healthy" else (
        today + datetime.timedelta(days=max(days_until, 1)) if status == "Upcoming" else today
    )

    # Upsert maintenance schedule record
    sched = db.query(MaintenanceSchedule).filter(
        MaintenanceSchedule.vehicle_id == vehicle_id
    ).first()

    if not sched:
        sched = MaintenanceSchedule(
            vehicle_id=vehicle_id,
            next_service_date=next_service_date,
            next_service_odometer=next_service_odom,
            current_status=status,
        )
        db.add(sched)
    else:
        sched.next_service_date = next_service_date
        sched.next_service_odometer = next_service_odom
        sched.current_status = status

    # Mirror maintenance status onto vehicle (unless retired)
    if vehicle.status != "Retired":
        vehicle.status = status

    db.flush()

    # Fire maintenance notifications
    if status == "Overdue":
        create_notification(
            db=db,
            title="Vehicle Maintenance Overdue",
            description=(
                f"Vehicle {vehicle.license_plate} is OVERDUE for maintenance! "
                f"Current odometer: {vehicle.odometer:.0f}, Service limit: {next_service_odom:.0f}."
            ),
            notification_type="Maintenance Due",
            priority="High",
            role="Fleet Manager",
        )
    elif status == "Upcoming":
        create_notification(
            db=db,
            title="Vehicle Maintenance Due Soon",
            description=(
                f"Vehicle {vehicle.license_plate} is approaching its maintenance limit. "
                f"Current odometer: {vehicle.odometer:.0f}, Service limit: {next_service_odom:.0f}."
            ),
            notification_type="Maintenance Due",
            priority="Medium",
            role="Fleet Manager",
        )

    return sched
