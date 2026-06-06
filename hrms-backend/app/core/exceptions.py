from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger("hrms_api")

class HRMSException(Exception):
    """Base exception class for application-specific errors."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

def register_exception_handlers(app: FastAPI):
    """
    Registers custom global exception handlers.
    """
    @app.exception_handler(HRMSException)
    async def hrms_exception_handler(request: Request, exc: HRMSException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "Validation error",
                "details": exc.errors()
            }
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"Database error occurred: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Internal database error occurred."}
        )
