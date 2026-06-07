import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    
    clock_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clock_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    clock_in_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    clock_out_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    
    clock_in_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    clock_out_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # 'present', 'late', 'absent', 'half_day', 'on_leave'
    status: Mapped[str] = mapped_column(String(50), default="absent", nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    total_work_hours: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee: Mapped["Employee"] = relationship(back_populates="attendance_records", foreign_keys=[employee_id])
    edits: Mapped[list["AttendanceEdit"]] = relationship(back_populates="attendance_record", cascade="all, delete-orphan")

    @property
    def is_edited(self) -> bool:
        try:
            # Check if any edits have been approved
            return any(e.status == "approved" for e in self.edits)
        except Exception:
            return False

    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="unique_employee_date"),
    )


class AttendanceEdit(Base):
    __tablename__ = "attendance_edits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attendance_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attendance.id", ondelete="CASCADE"), nullable=False)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    original_clock_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    original_clock_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    new_clock_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    new_clock_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    old_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # 'pending', 'approved', 'rejected'
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    attendance_record: Mapped["Attendance"] = relationship(back_populates="edits", foreign_keys=[attendance_id])
    requested_by: Mapped["Employee"] = relationship(foreign_keys=[requested_by_id])
    approved_by: Mapped[Optional["Employee"]] = relationship(foreign_keys=[approved_by_id])
