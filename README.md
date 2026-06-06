# Antigravity HRMS - Workforce Attendance System

A production-ready, modular Human Resource Management System (HRMS) focused on shift tracking, attendance audits, and corporate diagnostics. The application integrates Supabase authentication, FastAPIs, and a React + Vite responsive frontend.

---

## Features

*   **Workforce Punch Portal**: Check-in and check-out tracking with IP and location metadata logs.
*   **Live Shift Timer**: Live duration tracking during active working shifts.
*   **Interactive Analytics**: Admin and Super Admin dashboards mapping working hours, lost hours, and attendance efficiency.
*   **Audit Correction Log**: Employees can submit attendance correction requests, and Admins can approve/reject changes with mandatory reason logging.
*   **Spreadsheet & Document Export**: Export filtered logs into CSV, XLSX (Excel), or PDF formats.
*   **Robust Security**: Role-Based Access Control (RBAC) and JWT verification supporting Supabase's modern asymmetric ECC/ES256 signing keys.

---

## Tech Stack

### Frontend
*   **Core**: React (TypeScript) + Vite
*   **Styling**: Vanilla CSS + TailwindCSS (for specific utility configurations)
*   **Icons**: Lucide React
*   **Charts**: Recharts (responsive data rendering)
*   **State & API Client**: Axios (configured with automated JWT insertion interceptors)

### Backend
*   **Framework**: FastAPI (Python 3.12+)
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy 2.0 (asyncio-driven engine mapping)
*   **Database Migrations**: Alembic
*   **Authentication**: Supabase Auth (local token validation using JWKS)

---

## Local Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (3.12+)
*   PostgreSQL Database instance

### 1. Database Setup
Create a PostgreSQL database named `hrms_db`.

### 2. Backend Configuration
1. Navigate to the backend directory:
    ```bash
    cd hrms-backend
    ```
2. Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```
3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4. Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
    Configure the variables in `.env`:
    *   `DATABASE_URL`: Connection string (e.g. `postgresql+asyncpg://<user>:<password>@localhost:5432/hrms_db`)
    *   `SUPABASE_URL`: Your Supabase project API gateway url.
    *   `SUPABASE_JWT_SECRET`: Local verification fallback secret.
5. Run Alembic migrations to construct the database schema:
    ```bash
    alembic upgrade head
    ```
6. Start the API server:
    ```bash
    uvicorn app.main:app --reload
    ```

### 3. Frontend Configuration
1. Navigate to the frontend directory:
    ```bash
    cd hrms-frontend
    ```
2. Install npm packages:
    ```bash
    npm install
    ```
3. Create a `.env` file:
    ```bash
    cp .env.example .env
    # Add your Supabase project URL and anon keys
    ```
4. Start the development server:
    ```bash
    npm run dev
    ```

---

## Deployment Notes

### Backend Deployment (Render)
1. Link your GitHub repository to **Render** and create a **Web Service**.
2. Select Python as the environment and specify:
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add the required Environment Variables in the Render Dashboard (matching your `.env` values, including your PostgreSQL database connection).
4. Run migrations on the active database during deployment.

### Frontend Deployment (Vercel)
1. Import your repository into **Vercel** and select the root directory as the `hrms-frontend` subfolder.
2. Specify build configuration details:
    *   **Framework Preset**: Vite
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3. Define your environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel Settings.
4. Deploy.
