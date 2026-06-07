import asyncio
import uuid
from datetime import date
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.config import settings

async def seed_database():
    print("Connecting to database to seed tables...")
    async with AsyncSessionLocal() as session:
        try:
            # Clear tables to ensure clean seed
            print("Clearing existing records...")
            await session.execute(text("DELETE FROM attendance_edits"))
            await session.execute(text("DELETE FROM attendance"))
            await session.execute(text("DELETE FROM employees"))
            await session.execute(text("DELETE FROM users"))
            await session.execute(text("DELETE FROM roles"))
            await session.commit()

            # 1. Seed Roles
            roles = [
                {"id": "6f307a09-ab0b-474d-bb66-42bf25472f3a", "name": "super_admin", "description": "Full system access"},
                {"id": "94d206da-6182-4f8a-8d68-8557a43d29eb", "name": "admin", "description": "Administrative access"},
                {"id": "b98208d4-cdc4-491a-9a9d-39c7b44caedb", "name": "employee", "description": "Employee access"}
            ]
            print("Seeding roles...")
            for r in roles:
                await session.execute(
                    text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :description)"),
                    {"id": uuid.UUID(r["id"]), "name": r["name"], "description": r["description"]}
                )
            
            # 2. Seed Users
            users = [
                {"id": "08549059-6def-4d84-a70d-aea56cf4757f", "email": "amudalahari65@gmail.com", "role_id": "6f307a09-ab0b-474d-bb66-42bf25472f3a"},
                {"id": "d3e5453e-a897-48ea-a925-d284ed7f6f91", "email": "bhaddreshamudala@gmail.com", "role_id": "94d206da-6182-4f8a-8d68-8557a43d29eb"},
                {"id": "9cfec8a8-1761-4173-82ba-4851ee56c975", "email": "gmaheshbabu2009@gmail.com", "role_id": "b98208d4-cdc4-491a-9a9d-39c7b44caedb"}
            ]
            print("Seeding users...")
            for u in users:
                await session.execute(
                    text("INSERT INTO users (id, email, role_id, is_active) VALUES (:id, :email, :role_id, true)"),
                    {"id": uuid.UUID(u["id"]), "email": u["email"], "role_id": uuid.UUID(u["role_id"])}
                )
            
            # 3. Seed Employees
            employees = [
                {"id": "f3b9313d-a742-45a1-8c5b-cebbcc454ac9", "user_id": "08549059-6def-4d84-a70d-aea56cf4757f", "employee_id_code": "SA001", "first_name": "Hari", "last_name": "Admin", "designation": "Principal Admin", "reporting_manager": "None"},
                {"id": "affe8ea4-0fc6-48f8-9326-399592ab5c28", "user_id": "d3e5453e-a897-48ea-a925-d284ed7f6f91", "employee_id_code": "AD001", "first_name": "Bhaddresh", "last_name": "Admin", "designation": "HR Director", "reporting_manager": "Hari Admin"},
                {"id": "5e8a3da4-f645-4f63-bcb6-fceb7e53aa8f", "user_id": "9cfec8a8-1761-4173-82ba-4851ee56c975", "employee_id_code": "EMP001", "first_name": "Mahesh", "last_name": "Employee", "designation": "Senior Associate", "reporting_manager": "Bhaddresh Admin"}
            ]
            print("Seeding employee profiles...")
            for e in employees:
                res = await session.execute(text("SELECT 1 FROM employees WHERE employee_id_code = :code"), {"code": e["employee_id_code"]})
                if not res.scalar():
                    await session.execute(
                        text("INSERT INTO employees (id, user_id, employee_id_code, first_name, last_name, joined_date, designation, reporting_manager) "
                             "VALUES (:id, :user_id, :code, :first_name, :last_name, :joined_date, :designation, :reporting_manager)"),
                        {
                            "id": uuid.UUID(e["id"]),
                            "user_id": uuid.UUID(e["user_id"]),
                            "code": e["employee_id_code"],
                            "first_name": e["first_name"],
                            "last_name": e["last_name"],
                            "joined_date": date(2026, 6, 7),
                            "designation": e["designation"],
                            "reporting_manager": e["reporting_manager"]
                        }
                    )
            await session.commit()
            print("Database seeding completed successfully.")
        except Exception as err:
            await session.rollback()
            print(f"Error during database seeding: {err}")

if __name__ == "__main__":
    asyncio.run(seed_database())
