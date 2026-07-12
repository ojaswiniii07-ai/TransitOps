import os

class Settings:
    PROJECT_NAME: str = "TransitOps Backend"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./transitops.db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Thresholds for Approvals (PRD: Expense threshold, Maintenance threshold)
    EXPENSE_APPROVAL_THRESHOLD: float = float(os.getenv("EXPENSE_APPROVAL_THRESHOLD", 1000.0))
    MAINTENANCE_APPROVAL_THRESHOLD: float = float(os.getenv("MAINTENANCE_APPROVAL_THRESHOLD", 5000.0))

settings = Settings()
