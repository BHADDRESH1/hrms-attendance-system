from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.modules.employees.models import Role, User, Department, Employee
from app.modules.employees import schemas
from app.core.exceptions import HRMSException

# --- Role Services ---
async def create_role(db: AsyncSession, role_in: schemas.RoleCreate) -> Role:
    # Check if role name already exists
    stmt = select(Role).where(Role.name == role_in.name)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HRMSException(message=f"Role '{role_in.name}' already exists.", status_code=400)
    
    role = Role(**role_in.model_dump())
    db.add(role)
    await db.flush()
    return role

async def get_role_by_id(db: AsyncSession, role_id: uuid.UUID) -> Optional[Role]:
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def get_role_by_name(db: AsyncSession, name: str) -> Optional[Role]:
    stmt = select(Role).where(Role.name == name)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def list_roles(db: AsyncSession) -> List[Role]:
    stmt = select(Role)
    res = await db.execute(stmt)
    return list(res.scalars().all())


# --- User Services ---
async def create_user(db: AsyncSession, user_in: schemas.UserCreate) -> User:
    # Verify email
    stmt = select(User).where(User.email == user_in.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HRMSException(message="A user with this email already exists.", status_code=400)
    
    # Verify role
    role = await get_role_by_id(db, user_in.role_id)
    if not role:
        raise HRMSException(message="Role not found.", status_code=404)
        
    user = User(**user_in.model_dump())
    db.add(user)
    await db.flush()
    return user

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    stmt = select(User).where(User.id == user_id).options(selectinload(User.role))
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def list_users(db: AsyncSession) -> List[User]:
    stmt = select(User).options(selectinload(User.role))
    res = await db.execute(stmt)
    return list(res.scalars().all())

async def update_user(db: AsyncSession, user: User, user_update: schemas.UserUpdate) -> User:
    update_data = user_update.model_dump(exclude_unset=True)
    
    if "role_id" in update_data:
        role = await get_role_by_id(db, update_data["role_id"])
        if not role:
            raise HRMSException(message="Role not found.", status_code=404)

    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    await db.flush()
    return user


# --- Department Services ---
async def create_department(db: AsyncSession, dept_in: schemas.DepartmentCreate) -> Department:
    dept = Department(**dept_in.model_dump())
    db.add(dept)
    await db.flush()
    return dept

async def get_department_by_id(db: AsyncSession, dept_id: uuid.UUID) -> Optional[Department]:
    stmt = select(Department).where(Department.id == dept_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def list_departments(db: AsyncSession) -> List[Department]:
    stmt = select(Department)
    res = await db.execute(stmt)
    return list(res.scalars().all())

async def update_department(db: AsyncSession, department: Department, dept_update: schemas.DepartmentUpdate) -> Department:
    update_data = dept_update.model_dump(exclude_unset=True)
    
    if "manager_id" in update_data and update_data["manager_id"]:
        # Verify employee exists
        stmt = select(Employee).where(Employee.id == update_data["manager_id"])
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HRMSException(message="Employee manager not found.", status_code=404)

    for field, value in update_data.items():
        setattr(department, field, value)
        
    db.add(department)
    await db.flush()
    return department


# --- Employee Services ---
async def create_employee(db: AsyncSession, emp_in: schemas.EmployeeCreate) -> Employee:
    # Check if employee_id_code already exists
    stmt = select(Employee).where(Employee.employee_id_code == emp_in.employee_id_code)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HRMSException(message="Employee ID code already exists.", status_code=400)
    
    # Verify user
    user = await get_user_by_id(db, emp_in.user_id)
    if not user:
        raise HRMSException(message="Associated User profile not found.", status_code=404)
        
    # Check if user already has an employee profile
    stmt = select(Employee).where(Employee.user_id == emp_in.user_id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HRMSException(message="User already has an employee profile registered.", status_code=400)

    # Verify department
    if emp_in.department_id:
        dept = await get_department_by_id(db, emp_in.department_id)
        if not dept:
            raise HRMSException(message="Department not found.", status_code=404)

    employee = Employee(**emp_in.model_dump())
    db.add(employee)
    await db.flush()
    return employee

async def get_employee_by_id(db: AsyncSession, emp_id: uuid.UUID) -> Optional[Employee]:
    stmt = select(Employee).where(Employee.id == emp_id).options(
        selectinload(Employee.user).selectinload(User.role),
        selectinload(Employee.department)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def get_employee_by_user_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[Employee]:
    stmt = select(Employee).where(Employee.user_id == user_id).options(
        selectinload(Employee.user).selectinload(User.role),
        selectinload(Employee.department)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def list_employees(db: AsyncSession) -> List[Employee]:
    stmt = select(Employee).options(
        selectinload(Employee.user).selectinload(User.role),
        selectinload(Employee.department)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())

async def update_employee(db: AsyncSession, employee: Employee, emp_update: schemas.EmployeeUpdate) -> Employee:
    update_data = emp_update.model_dump(exclude_unset=True)
    
    if "department_id" in update_data and update_data["department_id"]:
        dept = await get_department_by_id(db, update_data["department_id"])
        if not dept:
            raise HRMSException(message="Department not found.", status_code=404)
            
    if "employee_id_code" in update_data:
        stmt = select(Employee).where(
            Employee.employee_id_code == update_data["employee_id_code"],
            Employee.id != employee.id
        )
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HRMSException(message="Employee ID code already exists.", status_code=400)

    for field, value in update_data.items():
        setattr(employee, field, value)
        
    db.add(employee)
    await db.flush()
    return employee
