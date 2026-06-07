from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.core.dependencies import get_db, get_current_employee, RoleChecker
from app.modules.employees import schemas, service
from app.modules.employees.models import Employee

router = APIRouter(tags=["Employees & Organizations"])

# Role guards
super_admin_only = Depends(RoleChecker(allowed_roles=["super_admin"]))
admin_or_higher = Depends(RoleChecker(allowed_roles=["super_admin", "admin"]))
employee_or_higher = Depends(RoleChecker(allowed_roles=["super_admin", "admin", "employee"]))

# --- Role Endpoints ---
@router.post("/roles", response_model=schemas.RoleRead, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_in: schemas.RoleCreate,
    db: AsyncSession = Depends(get_db),
    _auth = super_admin_only
):
    """
    Define a new user role in the system. Super Admin only.
    """
    return await service.create_role(db, role_in)

@router.get("/roles", response_model=List[schemas.RoleRead])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    List all available roles in the system. Admin or higher.
    """
    return await service.list_roles(db)


# --- User Endpoints ---
@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    _auth = super_admin_only
):
    """
    Onboard a user login profile. Super Admin only.
    """
    return await service.create_user(db, user_in)

@router.get("/users", response_model=List[schemas.UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    List all user logins. Admin or higher.
    """
    return await service.list_users(db)

@router.patch("/users/{user_id}", response_model=schemas.UserRead)
async def update_user(
    user_id: uuid.UUID,
    user_update: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    _auth = super_admin_only
):
    """
    Modify user settings (active state, role assignment). Super Admin only.
    """
    user = await service.get_user_by_id(db, user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return await service.update_user(db, user, user_update)


# --- Department Endpoints ---
@router.post("/departments", response_model=schemas.DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_in: schemas.DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Create a corporate department. Admin or higher.
    """
    return await service.create_department(db, dept_in)

@router.get("/departments", response_model=List[schemas.DepartmentRead])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _auth = employee_or_higher
):
    """
    List all corporate departments.
    """
    return await service.list_departments(db)

@router.patch("/departments/{dept_id}", response_model=schemas.DepartmentRead)
async def update_department(
    dept_id: uuid.UUID,
    dept_update: schemas.DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Update department metadata or assign a manager. Admin or higher.
    """
    dept = await service.get_department_by_id(db, dept_id)
    if not dept:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Department not found")
    return await service.update_department(db, dept, dept_update)


# --- Employee Profile Endpoints ---
@router.post("/", response_model=schemas.EmployeeRead, status_code=status.HTTP_201_CREATED)
async def register_employee(
    emp_in: schemas.EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Create an employee profile. Admin or higher.
    """
    return await service.create_employee(db, emp_in)

@router.get("/me", response_model=schemas.EmployeeDetailRead)
async def get_my_profile(
    current_emp: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the profile of the current logged-in employee.
    """
    return await service.get_employee_by_id(db, current_emp.id)

@router.get("/", response_model=List[schemas.EmployeeRead])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    List all employee profiles. Admin or higher.
    """
    return await service.list_employees(db)

@router.get("/{employee_id}", response_model=schemas.EmployeeDetailRead)
async def get_employee_details(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Fetch a detailed employee profile. Admin or higher.
    """
    employee = await service.get_employee_by_id(db, employee_id)
    if not employee:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.patch("/{employee_id}", response_model=schemas.EmployeeRead)
async def update_employee_profile(
    employee_id: uuid.UUID,
    emp_update: schemas.EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Update employee settings. Admin or higher.
    """
    employee = await service.get_employee_by_id(db, employee_id)
    if not employee:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")
    return await service.update_employee(db, employee, emp_update)
