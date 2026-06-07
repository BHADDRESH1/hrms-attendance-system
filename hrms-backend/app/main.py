from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import time
from contextlib import asynccontextmanager

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.employees.router import router as employees_router
from app.modules.attendance.router import router as attendance_router

import collections

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    force=True,
)
logger = logging.getLogger("uvicorn.error")

class InMemoryLogHandler(logging.Handler):
    def __init__(self, capacity=500):
        super().__init__()
        self.capacity = capacity
        self.buffer = collections.deque(maxlen=capacity)

    def emit(self, record):
        try:
            msg = self.format(record)
            self.buffer.append(msg)
        except Exception:
            self.handleError(record)

    def get_logs(self):
        return list(self.buffer)

in_memory_log_handler = InMemoryLogHandler()
in_memory_log_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
in_memory_log_handler.setLevel(logging.INFO)

logging.getLogger().addHandler(in_memory_log_handler)
logging.getLogger("uvicorn").addHandler(in_memory_log_handler)
logging.getLogger("uvicorn.error").addHandler(in_memory_log_handler)
logging.getLogger("uvicorn.access").addHandler(in_memory_log_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database seeding
    from app.database import AsyncSessionLocal
    from sqlalchemy import text
    import uuid
    from datetime import date
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Seed Roles
            roles = [
                {"id": "6f307a09-ab0b-474d-bb66-42bf25472f3a", "name": "Super Admin", "description": "Full system access"},
                {"id": "94d206da-6182-4f8a-8d68-8557a43d29eb", "name": "Admin", "description": "Administrative access"},
                {"id": "b98208d4-cdc4-491a-9a9d-39c7b44caedb", "name": "Employee", "description": "Employee access"}
            ]
            for r in roles:
                res = await session.execute(text("SELECT 1 FROM roles WHERE name = :name"), {"name": r["name"]})
                if not res.scalar():
                    await session.execute(
                        text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :description)"),
                        {"id": uuid.UUID(r["id"]), "name": r["name"], "description": r["description"]}
                    )
            
            # 2. Seed Users
            users = [
                {"id": "08549059-6def-4d84-a70d-aea56cf4757f", "email": "amudalahari65@gmail.com", "role_id": "6f307a09-ab0b-474d-bb66-42bf25472f3a"},
                {"id": "d3e5453e-a897-48ea-a925-d284ed7f6f91", "email": "bhaddreshamudala@gmail.com", "role_id": "94d206da-6182-4f8a-8d68-8557a43d29eb"},
                {"id": "9cfec8a8-1761-4173-82ba-4851ee56c975", "email": "gmaheshbabu2009@gmail.com", "role_id": "b98208d4-cdc4-491a-9a9d-39c7b44caedb"}
            ]
            for u in users:
                res = await session.execute(text("SELECT 1 FROM users WHERE email = :email"), {"email": u["email"]})
                if not res.scalar():
                    await session.execute(
                        text("INSERT INTO users (id, email, role_id, is_active) VALUES (:id, :email, :role_id, true)"),
                        {"id": uuid.UUID(u["id"]), "email": u["email"], "role_id": uuid.UUID(u["role_id"])}
                    )
            
            # 3. Seed Employees
            employees = [
                {"id": "f3b9313d-a742-45a1-8c5b-cebbcc454ac9", "user_id": "08549059-6def-4d84-a70d-aea56cf4757f", "employee_id_code": "SA001", "first_name": "Hari", "last_name": "Admin"},
                {"id": "affe8ea4-0fc6-48f8-9326-399592ab5c28", "user_id": "d3e5453e-a897-48ea-a925-d284ed7f6f91", "employee_id_code": "AD001", "first_name": "Bhaddresh", "last_name": "Admin"},
                {"id": "5e8a3da4-f645-4f63-bcb6-fceb7e53aa8f", "user_id": "9cfec8a8-1761-4173-82ba-4851ee56c975", "employee_id_code": "EMP001", "first_name": "Mahesh", "last_name": "Employee"}
            ]
            for e in employees:
                res = await session.execute(text("SELECT 1 FROM employees WHERE employee_id_code = :code"), {"code": e["employee_id_code"]})
                if not res.scalar():
                    await session.execute(
                        text("INSERT INTO employees (id, user_id, employee_id_code, first_name, last_name, joined_date) VALUES (:id, :user_id, :code, :first_name, :last_name, :joined_date)"),
                        {
                            "id": uuid.UUID(e["id"]),
                            "user_id": uuid.UUID(e["user_id"]),
                            "code": e["employee_id_code"],
                            "first_name": e["first_name"],
                            "last_name": e["last_name"],
                            "joined_date": date(2026, 6, 7)
                        }
                    )
            await session.commit()
            logger.info("Database seeding completed successfully.")
        except Exception as err:
            await session.rollback()
            logger.error(f"Error during database seeding: {err}")
            
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready HRMS Attendance System API REST backend with Supabase Auth integration.",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan
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

@app.get("/api/v1/debug/logs", tags=["Debug"])
async def get_debug_logs():
    return {
        "status": "active",
        "latest_commit": "CORS-Diagnostics",
        "logs": in_memory_log_handler.get_logs()
    }
