from typing import AsyncGenerator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import AsyncSessionLocal
from app.core.security import verify_supabase_jwt
from app.modules.employees.models import Employee

# Security scheme for extract authorization token
security_scheme = HTTPBearer()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency yielding an asynchronous database session.
    Guarantees session cleanup.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_current_user_claims(
    token: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> dict:
    """
    Validates token and returns claims payload (e.g. sub UUID).
    """
    return verify_supabase_jwt(token.credentials)

async def get_current_employee(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_db)
) -> Employee:
    """
    Retrieves employee record matching the Supabase subject UUID.
    """
    supabase_uid = claims.get("sub")
    if not supabase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject ID (sub claim)."
        )

    # Fetch employee by user_id (which maps directly to Supabase User UID)
    from sqlalchemy.orm import selectinload
    from app.modules.employees.models import User
    
    result = await db.execute(
        select(Employee)
        .where(Employee.user_id == supabase_uid)
        .options(selectinload(Employee.user).selectinload(User.role))
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found in HRMS database. Contact administrator."
        )
    
    if not employee.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    return employee

class RoleChecker:
    """
    Dependency builder to enforce Role-Based Access Control.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, employee: Employee = Depends(get_current_employee)) -> Employee:
        if employee.user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )
        return employee
