import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../lib/api-client';
import {
  Users,
  Calendar,
  Clock,
  Percent,
  Search,
  Download,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart4,
  Briefcase,
  User,
  ShieldCheck,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

interface AdminAnalyticsDashboardProps {
  role: 'admin' | 'super_admin';
}

interface Employee {
  id: string;
  employee_id_code: string;
  first_name: string;
  last_name: string;
  designation: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

interface CompanySummary {
  total_employees: number;
  present_today: number;
  absent_today: number;
  leave_today: number;
  total_monthly_hours: number;
}

interface EmployeeAnalytics {
  employee: {
    id: string;
    employee_id_code: string;
    name: string;
    department: string;
    designation: string;
    manager: string;
    joined_date: string;
  };
  kpis: {
    working_days: number;
    present_days: number;
    leave_days: number;
    absent_days: number;
    attendance_percentage: number;
    total_working_hours: number;
    average_working_hours: number;
  };
  timeline: Array<{
    date: string;
    day: string;
    status: string;
    check_in: string;
    check_out: string;
    hours_worked: string;
  }>;
  weekly_productivity: Array<{
    week: string;
    hours: number;
  }>;
  monthly_hours_trend: Array<{
    month: string;
    hours: number;
  }>;
  pie_chart_distribution: Array<{
    name: string;
    value: number;
  }>;
}

interface DepartmentHours {
  department_name: string;
  total_hours: number;
  average_hours: number;
  employee_count: number;
}

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({ role }) => {
  const isSuperAdmin = role === 'super_admin';

  // State: Date Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12

  // State: Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [companySummary, setCompanySummary] = useState<CompanySummary | null>(null);
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);
  const [departmentHours, setDepartmentHours] = useState<DepartmentHours[]>([]);

  // State: UI Status
  const [loading, setLoading] = useState<boolean>(false);
  const [empListLoading, setEmpListLoading] = useState<boolean>(false);
  const [deptLoading, setDeptLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State: Pagination & Search for Employee List (Right Panel)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [empPage, setEmpPage] = useState<number>(1);
  const empLimit = 8;

  // State: Pagination for Daily logs Table (Main Section)
  const [tablePage, setTablePage] = useState<number>(1);
  const tableLimit = 7;

  // Static options
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const months = useMemo(() => [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ], []);

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    setEmpListLoading(true);
    try {
      const response = await apiClient.get<Employee[]>('/employees/');
      setEmployees(response.data);
      if (response.data.length > 0 && !selectedEmployeeId) {
        // Find first non-admin employee if possible, else just first employee
        const firstEmp = response.data[0];
        setSelectedEmployeeId(firstEmp.id);
      }
    } catch (err: any) {
      console.error('Failed to load employee directory:', err);
    } finally {
      setEmpListLoading(false);
    }
  }, [selectedEmployeeId]);

  // Fetch company-level stats (Super Admin only)
  const fetchCompanySummary = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const response = await apiClient.get<CompanySummary>('/analytics/company-summary', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setCompanySummary(response.data);
    } catch (err: any) {
      console.error('Failed to load company summary:', err);
    }
  }, [isSuperAdmin, selectedMonth, selectedYear]);

  // Fetch department hours summary (Admin/Super Admin)
  const fetchDepartmentHours = useCallback(async () => {
    setDeptLoading(true);
    try {
      const response = await apiClient.get<DepartmentHours[]>('/analytics/department-hours', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setDepartmentHours(response.data);
    } catch (err: any) {
      console.error('Failed to load department hours:', err);
    } finally {
      setDeptLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Fetch employee-specific analytics
  const fetchEmployeeAnalytics = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<EmployeeAnalytics>(`/analytics/employee/${selectedEmployeeId}`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setAnalytics(response.data);
      setTablePage(1); // Reset table page when employee changes
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee analytics.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, selectedMonth, selectedYear]);

  // Initial load
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Sync data when filters or selections change
  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeAnalytics();
    }
    fetchCompanySummary();
    fetchDepartmentHours();
  }, [selectedEmployeeId, selectedMonth, selectedYear, fetchEmployeeAnalytics, fetchCompanySummary, fetchDepartmentHours]);

  // Filtered and Paginated Employees List (Right Panel)
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const code = emp.employee_id_code.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || code.includes(query);
    });
  }, [employees, searchQuery]);

  const paginatedEmployees = useMemo(() => {
    const start = (empPage - 1) * empLimit;
    return filteredEmployees.slice(start, start + empLimit);
  }, [filteredEmployees, empPage]);

  const totalEmpPages = Math.ceil(filteredEmployees.length / empLimit);

  // Paginated daily logs table
  const paginatedTimeline = useMemo(() => {
    if (!analytics) return [];
    const start = (tablePage - 1) * tableLimit;
    return analytics.timeline.slice(start, start + tableLimit);
  }, [analytics, tablePage]);

  const totalTablePages = analytics ? Math.ceil(analytics.timeline.length / tableLimit) : 0;

  // Exports Handlers
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedEmployeeId) return;
    try {
      const endpoint = format === 'pdf' ? '/analytics/export-pdf' : format === 'excel' ? '/analytics/export-excel' : '/analytics/export-csv';
      const responseType = format === 'pdf' || format === 'excel' ? 'blob' : 'text';
      
      const response = await apiClient.get(endpoint, {
        params: { employee_id: selectedEmployeeId, month: selectedMonth, year: selectedYear },
        responseType: responseType as any
      });

      // Trigger download
      const mimeType = format === 'pdf' 
        ? 'application/pdf' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv';
      
      const blob = new Blob([response.data], { type: mimeType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendance_${selectedEmployeeId}_${selectedYear}_${selectedMonth}.${format === 'excel' ? 'xlsx' : format}`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(`Export to ${format.toUpperCase()} failed:`, err);
      alert(`Export to ${format.toUpperCase()} failed. Please try again.`);
    }
  };

  const handleDownloadReceipt = async (dateStr: string) => {
    if (!selectedEmployeeId) return;
    try {
      const response = await apiClient.get('/analytics/export-pdf', {
        params: { employee_id: selectedEmployeeId, month: selectedMonth, year: selectedYear, date: dateStr },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendance_receipt_${dateStr}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download receipt failed:', err);
      alert('Failed to download receipt for the selected day.');
    }
  };

  // Status badge style helper
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let badgeClass = "px-2 py-0.5 rounded-lg text-xs font-semibold border ";
    if (statusLower === 'present' || statusLower === 'present days') {
      badgeClass += "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40";
    } else if (statusLower === 'late' || statusLower === 'half day') {
      badgeClass += "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40";
    } else if (statusLower === 'leave' || statusLower === 'on_leave') {
      badgeClass += "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40";
    } else if (statusLower === 'holiday') {
      badgeClass += "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40";
    } else if (statusLower === 'n/a') {
      badgeClass += "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800";
    } else {
      badgeClass += "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40";
    }
    return <span className={badgeClass}>{status}</span>;
  };

  // Format Recharts daily hours trend
  const dailyTrendData = useMemo(() => {
    if (!analytics) return [];
    return analytics.timeline.map(t => {
      const dayNum = new Date(t.date).getDate();
      const hours = t.hours_worked === '-' ? 0 : parseFloat(t.hours_worked);
      return {
        name: dayNum.toString(),
        Hours: hours
      };
    });
  }, [analytics]);

  const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title Header with Modern Glassmorphism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 rounded-xl">
              <ShieldCheck size={24} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isSuperAdmin ? 'Super Admin Attendance Analytics' : 'Admin Attendance Analytics'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor attendance compliance, check daily punch details, and export reports.
          </p>
        </div>

        {/* Global Month/Year Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs bg-transparent border-0 focus:ring-0 font-bold text-slate-700 dark:text-slate-200 py-1.5 px-3 cursor-pointer outline-none"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs bg-transparent border-0 focus:ring-0 font-bold text-slate-700 dark:text-slate-200 py-1.5 px-3 cursor-pointer outline-none"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => {
              fetchEmployeeAnalytics();
              fetchCompanySummary();
              fetchDepartmentHours();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200/40 dark:border-slate-800"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Grid: 3 Cols Main, 1 Col Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Columns: Core Analytics and Logs */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Super Admin Company summary cards */}
          {isSuperAdmin && companySummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Employees', value: companySummary.total_employees, icon: Users, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/20' },
                { label: 'Present Today', value: companySummary.present_today, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                { label: 'Absent Today', value: companySummary.absent_today, icon: AlertCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
                { label: 'On Leave Today', value: companySummary.leave_today, icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                { label: 'Total Monthly Hours', value: `${companySummary.total_monthly_hours}h`, icon: Clock, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
              ].map((c, idx) => {
                const Icon = c.icon;
                return (
                  <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">{c.label}</span>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-black text-slate-900 dark:text-white">{c.value}</p>
                      <div className={`p-1.5 rounded-lg ${c.color}`}><Icon size={16} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Employee Summary Card */}
          {analytics && (
            <div className="bg-gradient-to-r from-primary-500/10 via-transparent to-transparent bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-900 pb-3">
                <span className="p-2 bg-primary-100 dark:bg-primary-950 text-primary-600 rounded-xl"><User size={20} /></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Profile Summary</h3>
                  <p className="text-xs text-slate-400">Selected employee profile details from HR directory.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Full Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{analytics.employee.name}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Employee Code</span>
                  <p className="font-mono font-bold text-primary-600 mt-0.5">{analytics.employee.employee_id_code}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Department</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                    <Building size={14} className="text-slate-400" />
                    {analytics.employee.department}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Designation</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                    <Briefcase size={14} className="text-slate-400" />
                    {analytics.employee.designation}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Manager / Supervisor</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{analytics.employee.manager}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">Joined Date</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    {analytics.employee.joined_date}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5 KPIs Section */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[
                { label: 'Working Days', value: `${analytics.kpis.working_days} Days`, desc: 'Target weekdays', icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
                { label: 'Present Days', value: `${analytics.kpis.present_days} Days`, desc: 'Including half days', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                { label: 'Leave Days', value: `${analytics.kpis.leave_days} Days`, desc: 'Approved leaves', icon: Calendar, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' },
                { label: 'Absent / LOP', value: `${analytics.kpis.absent_days} Days`, desc: 'Loss of pay', icon: AlertCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
                { label: 'Attendance %', value: `${analytics.kpis.attendance_percentage}%`, desc: 'Compliance rate', icon: Percent, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400">{card.label}</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{card.value}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-900/50">
                      <span className="text-[10px] text-slate-400">{card.desc}</span>
                      <div className={`p-1.5 rounded-lg ${card.color}`}><Icon size={14} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Attendance Daily Logs Table */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between flex-wrap gap-4 bg-slate-50/20 dark:bg-slate-900/5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="text-primary-600" size={18} />
                  <span>Attendance Daily Matrix</span>
                </h3>
                <p className="text-xs text-slate-400">Detailed punch in, punch out, and working hours for this month.</p>
              </div>

              {/* PDF/Excel/CSV Exports */}
              {analytics && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-semibold border border-slate-200/40 dark:border-slate-800"
                  >
                    <FileDown size={14} /> PDF
                  </button>
                  <button 
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-semibold border border-slate-200/40 dark:border-slate-800"
                  >
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button 
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-semibold border border-slate-200/40 dark:border-slate-800"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                  <p className="text-xs uppercase font-bold tracking-wider">Syncing logs...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertCircle className="mx-auto text-rose-500 mb-2" size={24} />
                  <p className="text-xs uppercase font-bold tracking-wider">{error}</p>
                </div>
              ) : !analytics || analytics.timeline.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-xs uppercase font-bold tracking-wider">No logs available for selected parameters</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                      <th className="p-4">Date</th>
                      <th className="p-4">Day</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Check In</th>
                      <th className="p-4 text-center">Check Out</th>
                      <th className="p-4 text-center">Hours Worked</th>
                      <th className="p-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {paginatedTimeline.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {record.date}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {record.day}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="p-4 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                          {record.check_in}
                        </td>
                        <td className="p-4 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                          {record.check_out}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {record.hours_worked !== '-' ? `${record.hours_worked}h` : '-'}
                        </td>
                        <td className="p-4 text-right">
                          {record.status.toLowerCase() !== 'n/a' && (
                            <button
                              onClick={() => handleDownloadReceipt(record.date)}
                              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold flex items-center gap-1 ml-auto"
                            >
                              <FileDown size={12} /> PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            {analytics && totalTablePages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Showing Page {tablePage} of {totalTablePages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={tablePage === 1}
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={tablePage === totalTablePages}
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Charts Row */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Distribution Pie Chart */}
              <div className="md:col-span-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3 mb-4 flex items-center gap-2">
                  <PieIcon className="text-primary-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Attendance Distribution</h3>
                </div>
                <div className="h-64 w-full relative flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.pie_chart_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.pie_chart_distribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{analytics.kpis.attendance_percentage}%</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendance</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-slate-50 dark:border-slate-900/50 mt-4">
                  {analytics.pie_chart_distribution.map((d, index) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="font-semibold text-slate-500">{d.name} ({d.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hours worked Line Chart */}
              <div className="md:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3 mb-4 flex items-center gap-2">
                  <TrendingUp className="text-primary-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Daily Working Hours Trend</h3>
                </div>
                <div className="h-64 w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-900" />
                      <XAxis dataKey="name" className="fill-slate-500 text-[10px]" />
                      <YAxis domain={[0, 12]} className="fill-slate-500 text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                      <Area type="monotone" dataKey="Hours" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* Department Working Hours Bar Graph */}
          {departmentHours.length > 0 && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart4 className="text-primary-600" size={18} />
                    <span>Department Productive Hours</span>
                  </h3>
                  <p className="text-xs text-slate-400">Comparative working hours metrics grouped by division.</p>
                </div>
              </div>
              
              <div className="h-72 w-full">
                {deptLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mr-2"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Syncing department hours...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentHours} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-900" />
                      <XAxis dataKey="department_name" className="fill-slate-500 text-xs font-semibold" />
                      <YAxis className="fill-slate-500 text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="total_hours" name="Total Hours" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="average_hours" name="Avg Hours per Employee" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Employee Roster/List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm h-fit space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
              <Users size={16} className="text-primary-500" /> Workforce Directory
            </h3>
            <p className="text-xs text-slate-400">Select employee to populate analytics dashboard details.</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setEmpPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Employee list */}
          <div className="space-y-2.5">
            {empListLoading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p className="text-[10px] uppercase font-bold tracking-wider">Syncing directory...</p>
              </div>
            ) : paginatedEmployees.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No employees found.</p>
            ) : (
              paginatedEmployees.map(emp => {
                const isSelected = emp.id === selectedEmployeeId;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                      isSelected 
                        ? 'bg-primary-500/10 border-primary-350 dark:border-primary-900/60 dark:bg-primary-950/20' 
                        : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 border-slate-200/40 dark:border-slate-900'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary-650 dark:text-primary-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate flex items-center gap-1">
                        <span className="font-mono text-primary-500 font-bold">{emp.employee_id_code}</span>
                        {emp.department && `• ${emp.department.name}`}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-650 dark:bg-primary-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Sidebar Pagination */}
          {!empListLoading && totalEmpPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-900/80">
              <span className="text-[10px] font-bold text-slate-400">Page {empPage} of {totalEmpPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={empPage === 1}
                  onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                  className="p-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  disabled={empPage === totalEmpPages}
                  onClick={() => setEmpPage(p => Math.min(totalEmpPages, p + 1))}
                  className="p-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
