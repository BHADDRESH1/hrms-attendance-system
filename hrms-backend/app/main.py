from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.employees.router import router as employees_router
from app.modules.attendance.router import router as attendance_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hrms_api")

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready HRMS Attendance System API REST backend with Supabase Auth integration.",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS Policy configuration matching Vercel domains (including any branch/preview deployments) and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost(:\d+)?$|^http://127\.0\.0\.1(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled exception during request: {request.method} {request.url.path} - Error: {str(e)}", exc_info=True)
        raise e
    finally:
        process_time = (time.time() - start_time) * 1000
        status_code = response.status_code if response else 500
        logger.info(f"{request.method} {request.url.path} - Status: {status_code} - Duration: {process_time:.2f}ms")

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
