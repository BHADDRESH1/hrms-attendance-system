import asyncio
import uuid
from datetime import date
import httpx
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.main import app
from app.core.dependencies import get_current_employee
from app.database import AsyncSessionLocal
from app.modules.employees.models import Employee, User, Role

async def get_test_employee(db, role_name: str) -> Employee:
    stmt = (
        select(Employee)
        .join(Employee.user)
        .join(User.role)
        .where(Role.name == role_name)
        .options(selectinload(Employee.user).selectinload(User.role))
    )
    res = await db.execute(stmt)
    emp = res.scalars().first()
    if not emp:
        raise RuntimeError(f"No employee found with role {role_name}. Ensure DB is seeded.")
    return emp

async def run_tests():
    async with AsyncSessionLocal() as db:
        # 1. Fetch seed employees for testing with eager loading
        super_admin_emp = await get_test_employee(db, "super_admin")
        admin_emp = await get_test_employee(db, "admin")
        regular_emp = await get_test_employee(db, "employee")
        
    print(f"Testing with Super Admin: {super_admin_emp.employee_id_code}")
    print(f"Testing with Admin: {admin_emp.employee_id_code}")
    print(f"Testing with Regular Employee: {regular_emp.employee_id_code}")
    
    # Using AsyncClient with ASGITransport
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:

        # --- Test 1: Super Admin Access to Company Summary ---
        app.dependency_overrides[get_current_employee] = lambda: super_admin_emp
        response = await client.get("/api/v1/analytics/company-summary?month=6&year=2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_employees" in data
        assert "present_today" in data
        assert "absent_today" in data
        assert "leave_today" in data
        assert "total_monthly_hours" in data
        print("Test 1 Passed: Company Summary works for Super Admin.")

        # --- Test 2: Admin Access to Company Summary (Should be Forbidden) ---
        app.dependency_overrides[get_current_employee] = lambda: admin_emp
        response = await client.get("/api/v1/analytics/company-summary?month=6&year=2026")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Test 2 Passed: Company Summary forbidden for Admin.")

        # --- Test 3: Employee Monthly Analytics ---
        app.dependency_overrides[get_current_employee] = lambda: regular_emp
        response = await client.get(f"/api/v1/analytics/monthly-attendance?employee_id={regular_emp.id}&month=6&year=2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "employee" in data
        assert "kpis" in data
        assert "timeline" in data
        assert "weekly_productivity" in data
        assert "monthly_hours_trend" in data
        assert "pie_chart_distribution" in data
        print("Test 3 Passed: Regular Employee can view own monthly attendance analytics.")

        # --- Test 4: Employee Accessing Other Employee's Analytics (Should be Forbidden) ---
        response = await client.get(f"/api/v1/analytics/monthly-attendance?employee_id={admin_emp.id}&month=6&year=2026")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Test 4 Passed: Regular Employee cannot access Admin's analytics.")

        # --- Test 5: Department Working Hours (Admin/Super Admin only) ---
        app.dependency_overrides[get_current_employee] = lambda: admin_emp
        response = await client.get("/api/v1/analytics/department-hours?month=6&year=2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "department_name" in data[0]
            assert "total_hours" in data[0]
            assert "average_hours" in data[0]
        print("Test 5 Passed: Admin can view department working hours analytics.")

        # --- Test 6: Export PDF (Monthly) ---
        app.dependency_overrides[get_current_employee] = lambda: regular_emp
        response = await client.get(f"/api/v1/analytics/export-pdf?employee_id={regular_emp.id}&month=6&year=2026")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0
        print("Test 6 Passed: PDF Export (Monthly) works successfully.")

        # --- Test 7: Export Excel ---
        response = await client.get(f"/api/v1/analytics/export-excel?employee_id={regular_emp.id}&month=6&year=2026")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(response.content) > 0
        print("Test 7 Passed: Excel Export works successfully.")

        # --- Test 8: Export CSV ---
        response = await client.get(f"/api/v1/analytics/export-csv?employee_id={regular_emp.id}&month=6&year=2026")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert len(response.content) > 0
        print("Test 8 Passed: CSV Export works successfully.")

    # Clear overrides
    app.dependency_overrides.clear()
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
