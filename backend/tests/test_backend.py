import pytest
from fastapi.testclient import TestClient
import os
import shutil
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.models.core import User, Vehicle, Driver, Trip, Maintenance, Expense
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.document import Document
from app.models.approval import Approval
from app.models.maintenance_schedule import MaintenanceSchedule

# Use a shared in-memory SQLite database for testing via StaticPool
from sqlalchemy.pool import StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed basic users and entities
        admin = User(username="admin", role="Admin", email="admin@test.com")
        manager = User(username="manager", role="Fleet Manager", email="mgr@test.com")
        officer = User(username="officer", role="Safety Officer", email="officer@test.com")
        db.add_all([admin, manager, officer])
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)



@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- TESTS ---

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_notifications_flow(client, db_session):
    # 1. Create a notification directly or via trigger
    # First, let's create a driver and vehicle that are close to expiry
    import datetime
    today = datetime.date.today()
    
    driver = Driver(name="Jane Expiring", license_number="DL-123", license_expiry=today + datetime.timedelta(days=7), status="Active")
    db_session.add(driver)
    db_session.commit()

    # Trigger scan
    resp = client.post("/notifications/trigger-scan")
    assert resp.status_code == 200
    assert "Generated" in resp.json()["message"]

    # 2. Get notifications
    resp = client.get("/notifications/?role=Safety Officer")
    assert resp.status_code == 200
    notifs = resp.json()
    assert len(notifs) >= 1
    assert any("Jane Expiring" in n["description"] for n in notifs)

    # 3. Read notification
    notif_id = notifs[0]["id"]
    resp = client.patch(f"/notifications/{notif_id}/read")
    assert resp.status_code == 200
    assert resp.json()["status"] == "Read"

    # 4. Delete notification
    resp = client.delete(f"/notifications/{notif_id}")
    assert resp.status_code == 200


def test_audit_log_flow(client, db_session):
    # Log an action manually
    from app.utils.audit import log_action
    log_action(db_session, user_id=1, entity_type="Vehicle", entity_id=10, action="Created", new_value="Ford Transit")
    
    resp = client.get("/audit-logs/?entity=Vehicle")
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) == 1
    assert logs[0]["action"] == "Created"

    # Try deleting it as non-admin (role Fleet Manager, id 2)
    resp = client.delete(f"/audit-logs/{logs[0]['id']}?request_user_id=2")
    assert resp.status_code == 403

    # Delete as admin (role Admin, id 1)
    resp = client.delete(f"/audit-logs/{logs[0]['id']}?request_user_id=1")
    assert resp.status_code == 200


def test_documents_flow(client, db_session):
    # Test file uploading
    file_content = b"fake pdf file content"
    resp = client.post(
        "/documents/upload",
        data={
            "owner_type": "Vehicle",
            "owner_id": 99,
            "document_type": "Insurance",
            "issue_date": "2026-01-01",
            "expiry_date": "2027-01-01",
            "user_id": 1
        },
        files={"file": ("test_insurance.pdf", file_content, "application/pdf")}
    )
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["document_type"] == "Insurance"
    
    # Verify file is stored
    assert os.path.exists(doc["file_url"])

    # Clean up file after test
    document_id = doc["id"]
    client.delete(f"/documents/{document_id}?user_id=1")
    assert not os.path.exists(doc["file_url"])


def test_approvals_flow(client, db_session):
    # Create vehicle to retire
    vehicle = Vehicle(license_plate="TX-001", make="Toyota", model="Tacoma", vehicle_type="Truck", status="Healthy")
    db_session.add(vehicle)
    db_session.commit()

    # 1. Create approval request for retirement
    resp = client.post(
        "/approvals/",
        json={
            "request_type": "Vehicle Retirement",
            "entity_id": vehicle.id,
            "requested_by": 2, # fleet manager
            "comments": "Retiring vehicle due to age"
        }
    )
    assert resp.status_code == 200
    approval = resp.json()
    assert approval["status"] == "Pending"

    # 2. Get pending approvals
    resp = client.get("/approvals/pending")
    assert len(resp.json()) == 1

    # 3. Approve request as Fleet Manager (user_id 2)
    resp = client.patch(f"/approvals/{approval['id']}/approve?approver_id=2&comments=Approved retirement")
    assert resp.status_code == 200
    assert resp.json()["status"] == "Approved"

    # 4. Check that vehicle is now Retired
    db_session.refresh(vehicle)
    assert vehicle.status == "Retired"


def test_predictive_maintenance_flow(client, db_session):
    # Create vehicle, driver, and trip
    vehicle = Vehicle(
        license_plate="TX-100", make="Volvo", model="Truck", 
        vehicle_type="Truck", odometer=1000.0, last_service_odometer=0.0, 
        maintenance_interval=5000.0, status="Healthy"
    )
    driver = Driver(name="Jack", license_number="DL-jack", license_expiry=datetime.date.today(), status="Active")
    db_session.add_all([vehicle, driver])
    db_session.commit()

    trip = Trip(vehicle_id=vehicle.id, driver_id=driver.id, route="Route A", distance=4500.0, status="Dispatched")
    db_session.add(trip)
    db_session.commit()

    # Recalculate initially
    client.post("/maintenance/recalculate")
    scheds = client.get("/maintenance/schedule").json()
    assert len(scheds) == 1
    assert scheds[0]["current_status"] == "Healthy"

    # Complete the trip and report odometer reading close to limit (4900) -> should trigger "Upcoming"
    resp = client.post(f"/maintenance/trips/{trip.id}/complete?odometer_reading=4900&user_id=1")
    assert resp.status_code == 200

    scheds = client.get("/maintenance/schedule").json()
    assert scheds[0]["current_status"] == "Upcoming"

    # Complete another trip (pretend we dispatch another trip and complete it at 5200) -> should trigger "Overdue"
    trip2 = Trip(vehicle_id=vehicle.id, driver_id=driver.id, route="Route B", distance=500.0, status="Dispatched")
    db_session.add(trip2)
    db_session.commit()

    resp = client.post(f"/maintenance/trips/{trip2.id}/complete?odometer_reading=5200&user_id=1")
    assert resp.status_code == 200

    scheds = client.get("/maintenance/schedule").json()
    assert scheds[0]["current_status"] == "Overdue"
