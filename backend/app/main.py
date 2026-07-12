from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import logging
from contextlib import asynccontextmanager

from app.config import settings
from app.db_init import init_db
from app.database import SessionLocal
from app.utils.notifications import (
    scan_and_generate_alerts,
    archive_old_notifications,
)

from app.routers import (
    notifications,
    audit,
    documents,
    approvals,
    maintenance,
    trips,
    expenses,
    dashboard,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Background Scheduler ─────────────────────────────────────────────────────
scheduler = BackgroundScheduler()


def run_daily_scans() -> None:
    """Run expiry scans and archive old notifications — called by APScheduler."""
    db = SessionLocal()
    try:
        logger.info("Running daily expiry scan and archive...")
        alerts_created = scan_and_generate_alerts(db)
        archived = archive_old_notifications(db)
        logger.info(
            "Scan done. Alerts generated: %d, Archived: %d",
            alerts_created,
            archived,
        )
    finally:
        db.close()


# ─── Lifespan (startup / shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):  # use _app to avoid shadowing the module-level `app`
    logger.info("Initializing database...")
    init_db()

    logger.info("Starting background scheduler (daily scan every 24 h)...")
    scheduler.add_job(
        run_daily_scans,
        "interval",
        hours=24,
        id="daily_scan_job",
        replace_existing=True,
    )
    scheduler.start()

    yield  # app is running

    logger.info("Shutting down scheduler...")
    scheduler.shutdown()


# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend services for TransitOps logistics and fleet management.",
    version="1.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(documents.router)
app.include_router(approvals.router)
app.include_router(maintenance.router)
app.include_router(trips.router)
app.include_router(expenses.router)


@app.get("/")
def read_root() -> dict:
    return {
        "project": settings.PROJECT_NAME,
        "status": "healthy",
        "version": "1.1",
    }
