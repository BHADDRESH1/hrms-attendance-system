import uuid
from datetime import date
from typing import List, Optional, Dict, Any
import calendar

from fastapi import APIRouter, Depends, Query, status, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_employee, RoleChecker
from app.modules.employees.models import Employee
from app.modules.analytics import service, pdf_report

router = APIRouter(tags=["Attendance Analytics"])

# Role guards
admin_or_higher = Depends(RoleChecker(allowed_roles=["super_admin", "admin"]))
super_admin_only = Depends(RoleChecker(allowed_roles=["super_admin"]))

@router.get("/company-summary", response_model=Dict[str, Any])
async def get_company_summary_api(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _auth = super_admin_only
):
    """
    Fetch company-wide attendance summary. Super Admin only.
    """
    today = date.today()
    m = month or today.month
    y = year or today.year
    return await service.get_company_summary(db, m, y)


@router.get("/monthly-attendance", response_model=Dict[str, Any])
async def get_monthly_attendance_api(
    employee_id: uuid.UUID,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Fetch monthly attendance analytics for a specific employee.
    Accessible by Admin, Super Admin, or the employee themselves.
    """
    is_admin_or_super = current_emp.user.role.name in ["super_admin", "admin"]
    if not is_admin_or_super and current_emp.id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this employee's analytics."
        )
    
    today = date.today()
    m = month or today.month
    y = year or today.year
    
    res = await service.get_employee_monthly_analytics(db, employee_id, m, y)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee analytics not found."
        )
    return res


@router.get("/employee/{employee_id}", response_model=Dict[str, Any])
async def get_employee_analytics_by_id(
    employee_id: uuid.UUID,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Fetch monthly attendance analytics for a specific employee by ID (alias endpoint).
    Accessible by Admin, Super Admin, or the employee themselves.
    """
    return await get_monthly_attendance_api(employee_id, month, year, db, current_emp)


@router.get("/department-hours", response_model=List[Dict[str, Any]])
async def get_department_hours_api(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _auth = admin_or_higher
):
    """
    Fetch total and average working hours by department. Admin/Super Admin only.
    """
    today = date.today()
    m = month or today.month
    y = year or today.year
    return await service.get_departments_analytics(db, m, y)


@router.get("/export-pdf")
async def export_pdf_api(
    employee_id: uuid.UUID,
    month: int,
    year: int,
    work_date: Optional[date] = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Export employee attendance analytics as a PDF (either monthly report or daily receipt).
    """
    is_admin_or_super = current_emp.user.role.name in ["super_admin", "admin"]
    if not is_admin_or_super and current_emp.id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to export this employee's analytics."
        )
        
    analytics = await service.get_employee_monthly_analytics(db, employee_id, month, year)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee analytics not found."
        )
        
    generated_by = f"{current_emp.first_name} {current_emp.last_name}"
    
    if work_date:
        target_str = work_date.isoformat()
        day_record = None
        for t in analytics["timeline"]:
            if t["date"] == target_str:
                day_record = t
                break
        if not day_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No attendance record found for this date."
            )
        pdf_bytes = pdf_report.generate_daily_receipt(analytics["employee"], day_record, generated_by)
        filename = f"attendance_receipt_{employee_id}_{work_date.isoformat()}.pdf"
    else:
        dept_analytics = await service.get_departments_analytics(db, month, year)
        month_name = calendar.month_name[month]
        pdf_bytes = pdf_report.generate_monthly_report(
            employee_info=analytics["employee"],
            kpis=analytics["kpis"],
            timeline=analytics["timeline"],
            pie_dist=analytics["pie_chart_distribution"],
            department_analytics=dept_analytics,
            month_name=month_name,
            year=year,
            generated_by=generated_by
        )
        filename = f"attendance_report_{employee_id}_{year}_{month}.pdf"
        
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/export-excel")
async def export_excel_api(
    employee_id: uuid.UUID,
    month: int,
    year: int,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Export employee monthly attendance summary and log details to Excel.
    """
    is_admin_or_super = current_emp.user.role.name in ["super_admin", "admin"]
    if not is_admin_or_super and current_emp.id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to export this employee's analytics."
        )
        
    analytics = await service.get_employee_monthly_analytics(db, employee_id, month, year)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee analytics not found."
        )
        
    excel_bytes = service.generate_employee_monthly_xlsx(analytics)
    filename = f"attendance_report_{employee_id}_{year}_{month}.xlsx"
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/export-csv")
async def export_csv_api(
    employee_id: uuid.UUID,
    month: int,
    year: int,
    db: AsyncSession = Depends(get_db),
    current_emp: Employee = Depends(get_current_employee)
):
    """
    Export employee monthly attendance logs as CSV.
    """
    is_admin_or_super = current_emp.user.role.name in ["super_admin", "admin"]
    if not is_admin_or_super and current_emp.id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to export this employee's analytics."
        )
        
    analytics = await service.get_employee_monthly_analytics(db, employee_id, month, year)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee analytics not found."
        )
        
    csv_str = service.generate_employee_monthly_csv(analytics)
    filename = f"attendance_report_{employee_id}_{year}_{month}.csv"
    
    return Response(
        content=csv_str.encode("utf-8"),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
