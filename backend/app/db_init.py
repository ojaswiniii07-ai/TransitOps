import datetime
from app.database import engine, Base, SessionLocal
from app.models.core import User, Vehicle, Driver, Trip, Maintenance, Expense
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.document import Document
from app.models.approval import Approval
from app.models.maintenance_schedule import MaintenanceSchedule
from app.utils.maintenance import calculate_vehicle_maintenance


def init_db():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if we already have users
        if db.query(User).count() == 0:
            # Seed Users
            users = [
                User(username="admin", role="Admin", email="admin@transitops.com"),
                User(username="fleet_mgr", role="Fleet Manager", email="manager@transitops.com"),
                User(username="safety_officer", role="Safety Officer", email="safety@transitops.com"),
                User(username="dispatcher", role="Dispatcher", email="dispatch@transitops.com"),
            ]
            db.add_all(users)
            
            # Seed Vehicles
            vehicles = [
                Vehicle(
                    license_plate="NY-1234", make="Ford", model="Transit Van", 
                    vehicle_type="Van", odometer=25000.0, last_service_odometer=24000.0, 
                    status="Healthy", insurance_expiry=datetime.date.today() + datetime.timedelta(days=45),
                    fitness_expiry=datetime.date.today() + datetime.timedelta(days=120)
                ),
                Vehicle(
                    license_plate="CA-5678", make="Volvo", model="VNL Truck", 
                    vehicle_type="Truck", odometer=80000.0, last_service_odometer=70000.0, 
                    status="Healthy", insurance_expiry=datetime.date.today() + datetime.timedelta(days=10), # Alert category (within 15 days)
                    fitness_expiry=datetime.date.today() + datetime.timedelta(days=5) # Alert category (within 7 days)
                ),
            ]
            db.add_all(vehicles)
            
            # Seed Drivers
            drivers = [
                Driver(
                    name="John Doe", license_number="DL-998877", 
                    license_expiry=datetime.date.today() + datetime.timedelta(days=12), # Alert category (within 15 days)
                    status="Active"
                ),
                Driver(
                    name="Jane Smith", license_number="DL-112233", 
                    license_expiry=datetime.date.today() + datetime.timedelta(days=2), # Alert category (within 7 days)
                    status="Active"
                ),
                Driver(
                    name="Bob Johnson", license_number="DL-445566", 
                    license_expiry=datetime.date.today() - datetime.timedelta(days=1), # Expired / Suspended
                    status="Suspended"
                ),
            ]
            db.add_all(drivers)
            db.commit()

            # Seed Trips after IDs are generated
            trip = Trip(
                vehicle_id=vehicles[0].id,
                driver_id=drivers[0].id,
                route="New York to Philadelphia",
                distance=100.0,
                status="Dispatched"
            )
            db.add(trip)
            db.commit()
            
            # PRD: Run predictive maintenance initial calculations for seeded vehicles
            for v in vehicles:
                calculate_vehicle_maintenance(db, v.id)
            db.commit()
    finally:
        db.close()
