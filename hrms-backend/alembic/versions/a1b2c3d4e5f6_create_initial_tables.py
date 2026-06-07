"""create initial tables

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2026-06-06 17:11:24.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Roles Table
    op.create_table(
        'roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 2. Create Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # 3. Create Departments Table
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('manager_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Create Employees Table
    op.create_table(
        'employees',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=True),
        sa.Column('employee_id_code', sa.String(length=50), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('joined_date', sa.Date(), nullable=False),
        sa.Column('designation', sa.String(length=100), nullable=True),
        sa.Column('reporting_manager', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id_code'),
        sa.UniqueConstraint('user_id')
    )

    # Add circular reference for Department manager_id pointing to Employees
    op.create_foreign_key(
        'fk_departments_manager_id',
        'departments', 'employees',
        ['manager_id'], ['id'],
        ondelete='SET NULL'
    )

    # 5. Create Attendance Table
    op.create_table(
        'attendance',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('employee_id', sa.UUID(), nullable=False),
        sa.Column('work_date', sa.Date(), nullable=False),
        sa.Column('clock_in', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clock_out', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clock_in_ip', sa.String(length=45), nullable=True),
        sa.Column('clock_out_ip', sa.String(length=45), nullable=True),
        sa.Column('clock_in_location', sa.String(length=255), nullable=True),
        sa.Column('clock_out_location', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='absent'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('total_work_hours', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_id', 'work_date', name='unique_employee_date')
    )

    # 6. Create Attendance Edits Table
    op.create_table(
        'attendance_edits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('attendance_id', sa.UUID(), nullable=False),
        sa.Column('requested_by_id', sa.UUID(), nullable=False),
        sa.Column('approved_by_id', sa.UUID(), nullable=True),
        sa.Column('original_clock_in', sa.DateTime(timezone=True), nullable=True),
        sa.Column('original_clock_out', sa.DateTime(timezone=True), nullable=True),
        sa.Column('new_clock_in', sa.DateTime(timezone=True), nullable=True),
        sa.Column('new_clock_out', sa.DateTime(timezone=True), nullable=True),
        sa.Column('old_status', sa.String(length=50), nullable=True),
        sa.Column('new_status', sa.String(length=50), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['approved_by_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['attendance_id'], ['attendance.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('attendance_edits')
    op.drop_table('attendance')
    
    # Drop circular foreign key on departments before dropping departments
    op.drop_constraint('fk_departments_manager_id', 'departments', type_='foreignkey')
    
    op.drop_table('employees')
    op.drop_table('departments')
    op.drop_table('users')
    op.drop_table('roles')
