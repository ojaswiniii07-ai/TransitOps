# TransitOps

**TransitOps** is a comprehensive logistics and fleet management platform designed to streamline transport operations, enforce compliance, automate workflows, and maintain transparent action histories. The application consists of a responsive, role-based React frontend and a FastAPI backend with background scheduling and database integrations.

---

## 🚀 Key Features

### 1. Dedicated Dashboards & Views
- **Omni-Dashboard**: Visualize real-time KPIs, vehicle utilization, active trip states, pending approvals, and active notifications.
- **Vehicle Registry**: Track vehicle profiles, license plates, models, and maintenance health indicators.
- **Driver Management**: Manage drivers, track safety violations, and license status.
- **Trip Scheduler**: Monitor real-time trip states (Scheduled, Dispatched, Completed, Cancelled).
- **Report Engine**: Deep financial and operational analytics for fleet resource optimization.

### 2. Notification & Alert Engine
- Automatically triggers alerts for critical fleet events.
- **Trigger Events:**
  - Driver license expiration alerts (30, 15, 7 days, and today).
  - Vehicle document expiration (Insurance, fitness certificates).
  - Delayed or cancelled trips.
  - Expenses exceeding pre-configured limits.
- Background service (powered by APScheduler) queries status hourly and automatically archives notifications after 30 days.

### 3. Role-Based Access Control (RBAC)
Supports granular console interfaces for distinct roles:
- **Fleet Manager**: Full administrative access to all configurations, actions, and reports.
- **Dispatcher**: Responsible for scheduling, updating, and coordinating trip logs.
- **Safety Officer**: Focuses on compliance, document validation, and driver licensing.
- **Financial Analyst**: Monitors operational expenses, threshold overrides, and profit margins.

### 4. Approval Workflow Engine
Enforces multi-signature actions on high-risk operations:
- Vehicle retirement or sale.
- Driver suspension.
- Trips or maintenance exceeding limit thresholds.
- Integrates decision-making flows (Pending ➔ Approved / Rejected).

### 5. Document Management Module
- Enables secure upload, storage, and retrieval of vehicle and driver compliance files (RC, Insurance, Pollution, Driving Licenses).
- File size control (up to 10MB) and format validation (`.pdf`, `.jpg`, `.png`).

### 6. Predictive Maintenance Scheduler
- Tracks vehicle odometers and maintenance schedules.
- Computes vehicle health statuses: `Healthy`, `Upcoming`, or `Overdue` based on mileage intervals and daily use.

### 7. Audit Log System
- High-fidelity system action logger capturing changes for accountability.
- Restricts deletion capabilities to Administrators and blocks modifications to preserve integrity.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Vanilla HSL-tailored CSS with custom dark/light theme systems
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **ORM & Database:** SQLAlchemy with SQLite (extends easily to PostgreSQL)
- **Background Tasks:** APScheduler (hourly automated tasks)
- **API Standards:** RESTful API with automated OpenAPI / Swagger documentation (`/docs`)

---

## 📂 Project Directory Structure

```text
TransitOps/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── routers/         # FastAPI Endpoint routers/endpoints
│   │   ├── utils/           # Database setup, mailing, and notification schedulers
│   │   ├── config.py        # Environmental settings and configs
│   │   └── main.py          # Backend entrypoint, CORS, and Lifespan managers
│   ├── requirements.txt     # Backend dependency list
│   └── tests/               # Test suites
├── src/
│   ├── components/          # React JSX Component views 
│   ├── context/             # React State & App Context (RBAC logic)
│   ├── App.tsx              # Application layout and router
│   ├── main.tsx             # JS DOM entry pointer
│   └── index.css            # Custom CSS themes & CSS design tokens
├── package.json             # Frontend dependency package
└── README.md                # Project README documentation
```

---

## ⚙️ Development Setup & Running Guide

Ensure you have **Node.js** and **Python 3** installed on your system.

### 1. Run the Frontend Server
From the root directory:
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
The React frontend will be available at **`http://localhost:5173/`**.

### 2. Run the Backend Server
From the root directory:
```bash
# Move into backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install python dependencies
pip install -r requirements.txt

# Run the FastAPI server via Uvicorn
python -m uvicorn app.main:app --reload --port 8000
```
- The API backend will run at **`http://localhost:8000/`**.
- View the interactive Swagger API documentation at **`http://localhost:8000/docs`**.
