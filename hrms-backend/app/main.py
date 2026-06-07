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
    force=True,
)
logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready HRMS Attendance System API REST backend with Supabase Auth integration.",
    version="1.0.0",
    debug=settings.DEBUG
)

class ASGILoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            method = scope["method"]
            path = scope["path"]
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"").decode("utf-8") or None
            
            print(f"CORS Debug: incoming request method={method} path={path} origin={origin}", flush=True)
            logger.info(f"CORS Debug: incoming request method={method} path={path} origin={origin}")
            
            start_time = time.time()
            
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    status = message["status"]
                    duration = (time.time() - start_time) * 1000
                    print(f"CORS Debug: completed request method={method} path={path} - Status: {status} - Duration: {duration:.2f}ms", flush=True)
                    logger.info(f"CORS Debug: completed request method={method} path={path} - Status: {status} - Duration: {duration:.2f}ms")
                await send(message)
                
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)

# Register middlewares
# CORS Policy configuration matching Vercel domains (including any branch/preview deployments) and localhost
# (added first, so it ends up as the inner layer compared to ASGILoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost(:\d+)?$|^http://127\.0\.0\.1(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ASGI logging middleware is added last, so it inserts at index 0 and wraps CORSMiddleware, executing outermost
app.add_middleware(ASGILoggingMiddleware)

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
