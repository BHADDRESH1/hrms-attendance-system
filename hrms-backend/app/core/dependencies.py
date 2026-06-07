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
    from sqlalchemy import text
    import uuid
    
    # 1. Try to fetch by user_id
    result = await db.execute(
        select(Employee)
        .where(Employee.user_id == supabase_uid)
        .options(selectinload(Employee.user).selectinload(User.role))
    )
    employee = result.scalar_one_or_none()

    # 2. Fallback: If not found, try to fetch by email and dynamically link the ID
    if not employee:
        email = claims.get("email")
        if email:
            result = await db.execute(
                select(Employee)
                .join(Employee.user)
                .where(User.email == email)
                .options(selectinload(Employee.user).selectinload(User.role))
            )
            employee = result.scalar_one_or_none()
            
            if employee:
                user = employee.user
                old_user_id = user.id
                new_user_id = uuid.UUID(supabase_uid)
                
                try:
                    # Insert new user row copying attributes
                    await db.execute(
                        text("INSERT INTO users (id, email, role_id, is_active, created_at, updated_at) "
                             "VALUES (:new_id, :email, :role_id, :is_active, :created_at, :updated_at)"),
                        {
                            "new_id": new_user_id,
                            "email": user.email,
                            "role_id": user.role_id,
                            "is_active": user.is_active,
                            "created_at": user.created_at,
                            "updated_at": user.updated_at
                        }
                    )
                    # Point employee to the new user row
                    await db.execute(
                        text("UPDATE employees SET user_id = :new_id WHERE id = :emp_id"),
                        {"new_id": new_user_id, "emp_id": employee.id}
                    )
                    # Delete old user row
                    await db.execute(
                        text("DELETE FROM users WHERE id = :old_id"),
                        {"old_id": old_user_id}
                    )
                    await db.commit()
                    
                    # Refresh employee object
                    result = await db.execute(
                        select(Employee)
                        .where(Employee.id == employee.id)
                        .options(selectinload(Employee.user).selectinload(User.role))
                    )
                    employee = result.scalar_one()
                    print(f"Dynamically linked Supabase UID {supabase_uid} to user email {email}", flush=True)
                except Exception as link_err:
                    await db.rollback()
                    print(f"Error dynamically linking Supabase UID: {link_err}", flush=True)

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found in HRMS database. Contact administrator."
        )

    # Sync role dynamically from Supabase user_roles table
    try:
        import httpx
        from jose import jwt
        from app.config import settings
        from app.modules.employees.models import Role

        email = employee.user.email
        claims_token = {
            "aud": "authenticated",
            "role": "service_role"
        }
        srv_token = jwt.encode(claims_token, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {srv_token}"
        }
        url = f"{settings.SUPABASE_URL}/rest/v1/user_roles?email=eq.{email}&select=role"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    supabase_role = data[0]["role"]
                    if employee.user.role.name != supabase_role:
                        role_res = await db.execute(
                            select(Role).where(Role.name == supabase_role)
                        )
                        db_role = role_res.scalar_one_or_none()
                        if db_role:
                            employee.user.role_id = db_role.id
                            await db.commit()
                            # Refresh employee object to fetch new role relationship
                            result = await db.execute(
                                select(Employee)
                                .where(Employee.id == employee.id)
                                .options(selectinload(Employee.user).selectinload(User.role))
                            )
                            employee = result.scalar_one()
                            print(f"Synced role for {email} to {supabase_role} on the fly", flush=True)
    except Exception as sync_err:
        print(f"Error syncing role from Supabase: {sync_err}", flush=True)

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
