from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.employees.router import router as employees_router
from app.modules.attendance.router import router as attendance_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready HRMS Attendance System API REST backend with Supabase Auth integration.",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS Policy configuration
origins = [
    "https://hrms-attendance-system.vercel.app",
    "https://hrms-attendance-system-git-main-bhaddresh1s-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
register_exception_handlers(app)

# Include Modular Routers
app.include_router(employees_router, prefix=f"{settings.API_V1_STR}/employees")
app.include_router(attendance_router, prefix=f"{settings.API_V1_STR}/attendance")

@app.get("/health", tags=["System Health"])
async def health_check():
    """
    Standard health check endpoint.
    """
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": "development" if settings.DEBUG else "production"
    }
