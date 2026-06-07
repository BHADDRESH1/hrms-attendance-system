from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
import uuid

# --- Role Schemas ---
class RoleBase(BaseModel):
    name: str = Field(..., max_length=50) # 'Super Admin', 'Admin', 'Employee'
    description: Optional[str] = Field(None, max_length=255)

class RoleCreate(RoleBase):
    pass

class RoleRead(RoleBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role_id: uuid.UUID
    is_active: bool = True

class UserCreate(UserBase):
    id: uuid.UUID # Maps to Supabase Auth's user UUID

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None

class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserDetailRead(UserRead):
    role: RoleRead

    class Config:
        from_attributes = True

# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=100)
    manager_id: Optional[uuid.UUID] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None

class DepartmentRead(DepartmentBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Employee Schemas ---
class EmployeeBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    joined_date: date = Field(default_factory=date.today)
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    id: Optional[uuid.UUID] = None # Will auto-generate unless specified
    user_id: uuid.UUID
    department_id: Optional[uuid.UUID] = None
    employee_id_code: str = Field(..., max_length=50)

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    employee_id_code: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None

class EmployeeRead(EmployeeBase):
    id: uuid.UUID
    user_id: uuid.UUID
    department_id: Optional[uuid.UUID]
    employee_id_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmployeeDetailRead(EmployeeRead):
    user: UserDetailRead
    department: Optional[DepartmentRead] = None

    class Config:
        from_attributes = True
