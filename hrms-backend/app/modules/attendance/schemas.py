from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
import uuid

# --- Attendance Schemas ---
class AttendancePunchIn(BaseModel):
    clock_in_ip: Optional[str] = Field(None, max_length=45)
    clock_in_location: Optional[str] = Field(None, max_length=255)

class AttendancePunchOut(BaseModel):
    clock_out_ip: Optional[str] = Field(None, max_length=45)
    clock_out_location: Optional[str] = Field(None, max_length=255)

class AttendanceRead(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    clock_in_ip: Optional[str] = None
    clock_out_ip: Optional[str] = None
    clock_in_location: Optional[str] = None
    clock_out_location: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    total_work_hours: Optional[float] = None
    is_edited: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Attendance Edit Schemas ---
class AttendanceEditCreate(BaseModel):
    attendance_id: uuid.UUID
    new_clock_in: Optional[datetime] = None
    new_clock_out: Optional[datetime] = None
    reason: str

class AttendanceEditApproval(BaseModel):
    status: str = Field(..., description="Must be 'approved' or 'rejected'")

class AttendanceEditRead(BaseModel):
    id: uuid.UUID
    attendance_id: uuid.UUID
    requested_by_id: uuid.UUID
    approved_by_id: Optional[uuid.UUID] = None
    original_clock_in: Optional[datetime] = None
    original_clock_out: Optional[datetime] = None
    new_clock_in: Optional[datetime] = None
    new_clock_out: Optional[datetime] = None
    reason: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuperAdminAnalyticsResponse(BaseModel):
    total_employees: int
    working_days: int
    expected_hours: float
    actual_productive_hours: float
    lost_hours: float
    efficiency: float
    present_days: int
    half_days: int
    leave_days: int
    lop_days: int
    permission_days: int

class AttendanceUpdateAdmin(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: Optional[str] = None
    reason: str

class SuperAdminEmployeeAnalytics(BaseModel):
    employee_id: uuid.UUID
    employee_id_code: str
    employee_name: str
    department: str
    month: str
    total_hours: float
    present_days: int
    half_days: int
    leave_days: int
    lop_days: int
    permission_days: int
    attendance_percentage: float
    status: str

class SuperAdminAuditLogResponse(BaseModel):
    id: uuid.UUID
    employee_id_code: str
    employee_name: str
    attendance_date: date
    original_clock_in: Optional[datetime] = None
    original_clock_out: Optional[datetime] = None
    new_clock_in: Optional[datetime] = None
    new_clock_out: Optional[datetime] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    edited_by_name: str
    edited_date: date
    edited_time: str
    edit_reason: str


class SuperAdminAuditLogListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[SuperAdminAuditLogResponse]
