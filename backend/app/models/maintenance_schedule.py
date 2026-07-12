from sqlalchemy import Integer, String, Date, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
import datetime
from app.database import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class MaintenanceSchedule(Base):
    __tablename__ = "maintenance_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=False, unique=True
    )
    next_service_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    next_service_odometer: Mapped[float] = mapped_column(Float, nullable=False)
    last_service_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    current_status: Mapped[str] = mapped_column(String, default="Healthy")
    last_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )
