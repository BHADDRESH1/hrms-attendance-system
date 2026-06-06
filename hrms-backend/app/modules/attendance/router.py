from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from typing import List, Optional
import uuid

from app.core.dependencies import get_db, get_current_employee, RoleChecker
from app.modules.attendance import schemas, service
from app.modules.employees.models import Employee

router = APIRouter(tags=["Attendance & Corrections"])

# Role guards
admin_or_higher = Depends(RoleChecker(allowed_roles=["Super Admin", "Admin"]))
employee_or_higher = Depends(RoleChecker(allowed_roles=["Super Admin", "Admin", "Employee"]))

# --- Core Punch Endpoints ---
@router.post("/punch-in", response_model=schemas.AttendanceRead)
async def clock_in(
    punch: schemas.AttendancePunchIn,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Log clock-in punch for the current authenticated employee.
    """
    return await service.punch_in(db, current_emp, punch)

@router.post("/punch-out", response_model=schemas.AttendanceRead)
async def clock_out(
    punch: schemas.AttendancePunchOut,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Log clock-out punch and compute total hours.
    """
    try:
        return await service.punch_out(db, current_emp, punch)
    except Exception as e:
        import traceback
        print("PUNCH-OUT ERROR EXCEPTION:")
        traceback.print_exc()
        raise e

@router.get("/history", response_model=List[schemas.AttendanceRead])
async def get_my_history(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Fetch history logs for the current authenticated employee.
    """
    return await service.get_attendance_history(db, current_emp.id, start_date, end_date)

@router.get("/daily", response_model=List[schemas.AttendanceRead])
async def get_daily_logs(
    work_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Fetch daily attendance matrix. Admin or higher required.
    """
    return await service.get_daily_attendance(db, work_date)


# --- Attendance Correction / Edit Request Endpoints ---
@router.post("/edits", response_model=schemas.AttendanceEditRead, status_code=status.HTTP_201_CREATED)
async def request_correction(
    edit_in: schemas.AttendanceEditCreate,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Submit a request for attendance record correction.
    """
    return await service.request_attendance_edit(db, current_emp, edit_in)

@router.get("/edits/pending", response_model=List[schemas.AttendanceEditRead])
async def get_pending_edits(
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    List all pending attendance correction requests. Admin or higher required.
    """
    return await service.list_pending_edits(db)

@router.patch("/edits/{edit_id}/review", response_model=schemas.AttendanceEditRead)
async def review_correction(
    edit_id: uuid.UUID,
    approval: schemas.AttendanceEditApproval,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee),
    _auth = admin_or_higher
):
    """
    Approve or reject a pending attendance correction request. Admin or higher required.
    """
    return await service.review_attendance_edit(db, edit_id, approval, current_emp)


@router.get("/super-admin/analytics", response_model=schemas.SuperAdminAnalyticsResponse)
async def get_super_admin_analytics(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    """
    Fetch super admin dashboard analytics metrics.
    """
    return await service.get_super_admin_analytics(db, start_date, end_date)


@router.patch("/{record_id}", response_model=schemas.AttendanceRead)
async def update_record_admin(
    record_id: uuid.UUID,
    update_in: schemas.AttendanceUpdateAdmin,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    """
    Manually edit an attendance record (Super Admin Override).
    """
    return await service.update_attendance_admin(db, record_id, update_in, current_emp)


@router.get("/audit-logs", response_model=schemas.SuperAdminAuditLogListResponse)
async def get_audit_logs(
    employee_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    """
    Fetch all approved attendance audit logs (Super Admin Override logs).
    """
    edits, total_count = await service.get_attendance_audit_logs(
        db, employee_id, start_date, end_date, search, page, limit
    )
    
    # Map raw models to response schemas
    items = []
    for edit in edits:
        items.append(
            schemas.SuperAdminAuditLogResponse(
                id=edit.id,
                employee_id_code=edit.attendance_record.employee.employee_id_code,
                employee_name=f"{edit.attendance_record.employee.first_name} {edit.attendance_record.employee.last_name}",
                attendance_date=edit.attendance_record.work_date,
                original_clock_in=edit.original_clock_in,
                original_clock_out=edit.original_clock_out,
                new_clock_in=edit.new_clock_in,
                new_clock_out=edit.new_clock_out,
                old_status=edit.old_status,
                new_status=edit.new_status,
                edited_by_name=f"{edit.requested_by.first_name} {edit.requested_by.last_name}",
                edited_date=edit.created_at.date(),
                edited_time=edit.created_at.time().strftime("%H:%M:%S"),
                edit_reason=edit.reason
            )
        )
    return schemas.SuperAdminAuditLogListResponse(
        total=total_count,
        page=page,
        limit=limit,
        items=items
    )


@router.get("/export/csv")
async def export_attendance_csv(
    department_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    from fastapi import Response
    records = await service.query_attendance_for_export(
        db, department_id, employee_id, start_date, end_date, status
    )
    csv_data = service.generate_attendance_csv(records)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=attendance_report.csv"
        }
    )


@router.get("/export/xlsx")
async def export_attendance_xlsx(
    department_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    from fastapi import Response
    records = await service.query_attendance_for_export(
        db, department_id, employee_id, start_date, end_date, status
    )
    xlsx_data = service.generate_attendance_xlsx(records)
    return Response(
        content=xlsx_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=attendance_report.xlsx"
        }
    )


@router.get("/export/pdf")
async def export_attendance_pdf(
    department_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth = Depends(RoleChecker(allowed_roles=["Super Admin"]))
):
    from fastapi import Response
    records = await service.query_attendance_for_export(
        db, department_id, employee_id, start_date, end_date, status
    )
    pdf_data = service.generate_attendance_pdf(records)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=attendance_report.pdf"
        }
    )
