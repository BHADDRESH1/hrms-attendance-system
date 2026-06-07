import io
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_daily_receipt(employee_info: Dict[str, Any], day_record: Dict[str, Any], generated_by: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0284c7'),
        spaceAfter=15,
        alignment=1 # Center
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=20,
        alignment=1 # Center
    )

    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10,
        bold=True
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )

    # 1. Title Header
    story.append(Paragraph("HRMS Attendance Record Receipt", title_style))
    story.append(Paragraph(f"Generated on {date.today().isoformat()} | Issued By: {generated_by}", meta_style))
    story.append(Spacer(1, 15))

    # 2. Employee Info Section
    story.append(Paragraph("Employee Details", section_title))
    emp_data = [
        [Paragraph("<b>Employee Name:</b>", body_style), Paragraph(employee_info["name"], body_style),
         Paragraph("<b>Employee ID:</b>", body_style), Paragraph(employee_info["employee_id_code"], body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph(employee_info["department"], body_style),
         Paragraph("<b>Designation:</b>", body_style), Paragraph(employee_info["designation"], body_style)],
        [Paragraph("<b>Manager:</b>", body_style), Paragraph(employee_info["manager"], body_style),
         Paragraph("<b>Joined Date:</b>", body_style), Paragraph(employee_info["joined_date"], body_style)]
    ]
    emp_table = Table(emp_data, colWidths=[110, 150, 100, 160])
    emp_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(emp_table)
    story.append(Spacer(1, 20))

    # 3. Attendance Punch Details
    story.append(Paragraph("Attendance Record Details", section_title))
    
    status_color = '#10b981' # green
    if day_record["status"].lower() == 'absent':
        status_color = '#ef4444' # red
    elif day_record["status"].lower() == 'leave':
        status_color = '#3b82f6' # blue
    elif day_record["status"].lower() == 'holiday':
        status_color = '#f59e0b' # amber

    status_para = Paragraph(f"<font color='{status_color}'><b>{day_record['status']}</b></font>", body_style)

    rec_data = [
        [Paragraph("<b>Work Date:</b>", body_style), Paragraph(f"{day_record['date']} ({day_record['day']})", body_style)],
        [Paragraph("<b>Attendance Status:</b>", body_style), status_para],
        [Paragraph("<b>Check In Time:</b>", body_style), Paragraph(day_record["check_in"], body_style)],
        [Paragraph("<b>Check Out Time:</b>", body_style), Paragraph(day_record["check_out"], body_style)],
        [Paragraph("<b>Hours Worked:</b>", body_style), Paragraph(day_record["hours_worked"], body_style)]
    ]
    rec_table = Table(rec_data, colWidths=[150, 370])
    rec_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 40))

    # Footer notice
    notice_style = ParagraphStyle(
        'Notice',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#94a3b8'),
        alignment=1
    )
    story.append(Paragraph("This is an automatically generated system document. No signature is required.", notice_style))

    doc.build(story)
    return buffer.getvalue()


def generate_monthly_report(
    employee_info: Dict[str, Any],
    kpis: Dict[str, Any],
    timeline: List[Dict[str, Any]],
    pie_dist: List[Dict[str, Any]],
    department_analytics: List[Dict[str, Any]],
    month_name: str,
    year: int,
    generated_by: str
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    story = []

    styles = getSampleStyleSheet()
    
    # Text styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4,
        bold=True
    )
    
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0284c7'),
        spaceAfter=15,
        bold=True
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15
    )

    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=12,
        spaceAfter=8,
        bold=True
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        textColor=colors.white,
        bold=True
    )

    # 1. Clean Title and Headers
    story.append(Paragraph("HRMS Attendance Report", title_style))
    story.append(Paragraph(f"Monthly Attendance Summary - {month_name} {year}", subtitle_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %I:%M %p')} | Prepared By: {generated_by}", meta_style))
    story.append(Spacer(1, 5))

    # 2. Employee Details Card
    story.append(Paragraph("Employee Information", section_title))
    emp_data = [
        [Paragraph("<b>Employee Name:</b>", body_style), Paragraph(employee_info["name"], body_style),
         Paragraph("<b>Employee ID:</b>", body_style), Paragraph(employee_info["employee_id_code"], body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph(employee_info["department"], body_style),
         Paragraph("<b>Designation:</b>", body_style), Paragraph(employee_info["designation"], body_style)],
        [Paragraph("<b>Manager:</b>", body_style), Paragraph(employee_info["manager"], body_style),
         Paragraph("<b>Joined Date:</b>", body_style), Paragraph(employee_info["joined_date"], body_style)]
    ]
    emp_table = Table(emp_data, colWidths=[100, 175, 90, 185])
    emp_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(emp_table)
    story.append(Spacer(1, 10))

    # 3. KPI Statistics
    story.append(Paragraph("Attendance Key Performance Indicators (KPIs)", section_title))
    kpi_data = [
        [
            Paragraph(f"<b>Working Days</b><br/>{kpis['working_days']} Days", body_style),
            Paragraph(f"<b>Present Days</b><br/>{kpis['present_days']} Days", body_style),
            Paragraph(f"<b>Leave Days</b><br/>{kpis['leave_days']} Days", body_style),
            Paragraph(f"<b>Absent / LOP</b><br/>{kpis['absent_days']} Days", body_style),
            Paragraph(f"<b>Attendance %</b><br/>{kpis['attendance_percentage']}%", body_style),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[110, 110, 110, 110, 110])
    kpi_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0f2fe')), # light blue
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 4. Pie Chart distribution (Tabular Snapshot representation)
    story.append(Paragraph("Attendance Distribution Snapshot", section_title))
    pie_headers = [Paragraph("Status", table_header_style), Paragraph("Percentage (%)", table_header_style)]
    pie_rows = [pie_headers]
    for p in pie_dist:
        pie_rows.append([
            Paragraph(p["name"], body_style),
            Paragraph(f"{p['value']}%", body_style)
        ])
    pie_table = Table(pie_rows, colWidths=[200, 150])
    pie_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#64748b')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(pie_table)
    story.append(Spacer(1, 10))

    # 5. Department wise metrics (visible for Admins)
    story.append(Paragraph("Department Working Hours Analytics", section_title))
    dept_headers = [
        Paragraph("Department", table_header_style),
        Paragraph("Total Working Hours", table_header_style),
        Paragraph("Average Working Hours", table_header_style),
        Paragraph("Employee Count", table_header_style)
    ]
    dept_rows = [dept_headers]
    for d in department_analytics:
        dept_rows.append([
            Paragraph(d["department_name"], body_style),
            Paragraph(f"{d['total_hours']:.2f} h", body_style),
            Paragraph(f"{d['average_hours']:.2f} h", body_style),
            Paragraph(str(d["employee_count"]), body_style)
        ])
    dept_table = Table(dept_rows, colWidths=[180, 130, 130, 110])
    dept_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(dept_table)
    
    # 6. Detailed Timeline Table (Daily Logs)
    # Put daily logs on next pages or keep flowing
    story.append(Spacer(1, 10))
    story.append(Paragraph("Detailed Monthly Timeline Logs", section_title))
    
    timeline_headers = [
        Paragraph("Date", table_header_style),
        Paragraph("Day", table_header_style),
        Paragraph("Status", table_header_style),
        Paragraph("Check In", table_header_style),
        Paragraph("Check Out", table_header_style),
        Paragraph("Hours Worked", table_header_style)
    ]
    timeline_rows = [timeline_headers]
    for t in timeline:
        timeline_rows.append([
            Paragraph(t["date"], body_style),
            Paragraph(t["day"], body_style),
            Paragraph(t["status"], body_style),
            Paragraph(t["check_in"], body_style),
            Paragraph(t["check_out"], body_style),
            Paragraph(t["hours_worked"], body_style)
        ])
    
    timeline_table = Table(timeline_rows, colWidths=[80, 80, 90, 100, 100, 100])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0284c7')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(timeline_table)

    doc.build(story)
    return buffer.getvalue()
