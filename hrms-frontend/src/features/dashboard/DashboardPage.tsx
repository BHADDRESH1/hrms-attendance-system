import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  CalendarMinus, 
  Percent, 
  Hourglass,
  HelpCircle,
  FileSpreadsheet,
  PieChart as PieIcon
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_ip: string | null;
  clock_out_ip: string | null;
  clock_in_location: string | null;
  clock_out_location: string | null;
  status: string;
  total_work_hours: number | null;
  created_at: string;
  updated_at: string;
}

export const DashboardPage: React.FC = () => {
  
  
  // Navigation states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed

  // Live timer states
  const [liveTime, setLiveTime] = useState(new Date());

  // Backend data states
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary Metrics states
  const [metrics, setMetrics] = useState({
    totalWorkingDays: 0,
    presentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    lopDays: 0,
    permissionDays: 0,
    holidayDays: 0,
    attendancePercentage: 0,
    totalHoursWorked: 0
  });

  // Keep live clock running
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Helper for Month Name
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Get total days in a month helper
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Main fetch call to FastAPI backend
  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));

    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    try {
      const response = await apiClient.get<AttendanceRecord[]>('/attendance/history', {
        params: { start_date, end_date }
      });
      setRecords(response.data);
      calculateSummaryMetrics(response.data, selectedYear, selectedMonth);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync logs from backend API.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Sync when navigation states trigger
  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Compute Metrics from Backend Rows
  const calculateSummaryMetrics = (data: AttendanceRecord[], year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysLimit = isCurrentMonth ? today.getDate() : getDaysInMonth(year, month);
    
    let workingDays = 0;
    let present = 0;
    let half = 0;
    let leave = 0;
    let lop = 0;
    let permission = 0;
    let holiday = 0;
    let hoursWorked = 0;

    // Check calendar dates up to current limit
    for (let day = 1; day <= daysLimit; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        workingDays++;
        
        // Find record in list
        const dateStr = dateObj.toISOString().split('T')[0];
        const record = data.find(rec => rec.work_date === dateStr);

        if (record) {
          hoursWorked += record.total_work_hours || 0;
          
          switch (record.status.toLowerCase()) {
            case 'present':
              present++;
              break;
            case 'late':
              present++;
              break;
            case 'half_day':
              half++;
              break;
            case 'leave':
            case 'on_leave':
              leave++;
              break;
            case 'permission':
              permission++;
              break;
            case 'holiday':
              holiday++;
              break;
            case 'absent':
            case 'lop':
              lop++;
              break;
            default:
              lop++; // default unrecognized status to LOP
              break;
          }
        } else {
          // If no record exists for a past weekday, count it as LOP/Absent
          if (dateObj < today) {
            lop++;
          }
        }
      } else {
        // Weekend check if holiday punches exist
        const dateStr = dateObj.toISOString().split('T')[0];
        const record = data.find(rec => rec.work_date === dateStr);
        if (record && record.status.toLowerCase() === 'holiday') {
          holiday++;
        }
      }
    }

    // Attendance Calculation: Present + Paid Leave + Permission + (0.5 * Half Day)
    const effectivePresent = present + leave + permission + (half * 0.5);
    const percentage = workingDays > 0 ? (effectivePresent / workingDays) * 100 : 0;

    setMetrics({
      totalWorkingDays: workingDays,
      presentDays: present,
      halfDays: half,
      leaveDays: leave,
      lopDays: lop,
      permissionDays: permission,
      holidayDays: holiday,
      attendancePercentage: Math.min(Math.round(percentage), 100),
      totalHoursWorked: Math.round(hoursWorked * 100) / 100
    });
  };

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const formatDateString = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatPunchTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const getAttendanceValue = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
      case 'late':
      case 'permission':
      case 'leave':
      case 'on_leave':
        return '1.0';
      case 'half_day':
        return '0.5';
      case 'absent':
      case 'lop':
      default:
        return '0.0';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let classes = "px-2.5 py-1 text-xs font-semibold rounded-lg border ";
    
    if (statusLower === 'present') {
      classes += "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800";
    } else if (statusLower === 'late') {
      classes += "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800";
    } else if (statusLower === 'half_day') {
      classes += "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800";
    } else if (statusLower === 'leave' || statusLower === 'on_leave') {
      classes += "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800";
    } else if (statusLower === 'permission') {
      classes += "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800";
    } else if (statusLower === 'holiday') {
      classes += "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800";
    } else {
      classes += "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800";
    }

    return (
      <span className={`${classes} capitalize`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Chart Data Assembly
  const getChartData = () => {
    const rawData = [
      { name: 'Present', value: metrics.presentDays, color: '#10b981' },
      { name: 'Half Day', value: metrics.halfDays, color: '#f97316' },
      { name: 'Absent', value: metrics.lopDays, color: '#ef4444' },
      { name: 'Leave', value: metrics.leaveDays, color: '#3b82f6' },
      { name: 'Permission', value: metrics.permissionDays, color: '#a855f7' },
      { name: 'Holiday', value: metrics.holidayDays, color: '#64748b' }
    ];
    // Filter out zero elements, but check if all are zero
    const filtered = rawData.filter(item => item.value > 0);
    if (filtered.length === 0) {
      // Return default placeholder to prevent chart breaking
      return [{ name: 'No Data Mapped', value: 1, color: '#e2e8f0' }];
    }
    return filtered;
  };

  const chartData = getChartData();

  return (
    <div className="space-y-8">
      {/* HEADER SECTION: DATE & LIVE CLOCK */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 rounded-2xl">
            <Calendar size={28} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {liveTime.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Day: <span className="font-semibold text-slate-700 dark:text-slate-300">{liveTime.getDate()}</span></span>
              <span>•</span>
              <span>Month: <span className="font-semibold text-slate-700 dark:text-slate-300">{monthNames[liveTime.getMonth()]}</span></span>
              <span>•</span>
              <span>Year: <span className="font-semibold text-slate-700 dark:text-slate-300">{liveTime.getFullYear()}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-900/50 self-start md:self-auto">
          <Clock className="text-primary-600 animate-pulse" size={20} />
          <span className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-200">
            {liveTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* MONTH NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
            {monthNames[selectedMonth]} {selectedYear}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button 
          onClick={handleCurrentMonth}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold text-primary-600"
        >
          Current Month
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ATTENDANCE SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Working Days', value: metrics.totalWorkingDays, icon: Briefcase, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Present Days', value: metrics.presentDays, icon: CheckCircle2, color: 'text-green-500 bg-green-50 dark:bg-green-950/20' },
          { label: 'Half Days', value: metrics.halfDays, icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Leave Days', value: metrics.leaveDays, icon: CalendarMinus, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' },
          { label: 'LOP Days', value: metrics.lopDays, icon: AlertCircle, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' },
          { label: 'Permission Days', value: metrics.permissionDays, icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
          { label: 'Attendance %', value: `${metrics.attendancePercentage}%`, icon: Percent, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
          { label: 'Total Hours Worked', value: `${metrics.totalHoursWorked} hrs`, icon: Hourglass, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* TWO COLUMN GRID LAYOUT (TABLE & CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ATTENDANCE HISTORY TABLE (Left 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="text-primary-600" size={20} />
              <span>Attendance Logs Worksheet</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Records found: {records.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs uppercase font-bold tracking-wider">Syncing rows...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Punch In</th>
                    <th className="p-4">Punch Out</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4 text-right">Attendance Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No logs mapped for {monthNames[selectedMonth]} {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateString(record.work_date)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                          {formatPunchTime(record.clock_in)}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                          {formatPunchTime(record.clock_out)}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                          {record.total_work_hours !== null ? `${record.total_work_hours} hrs` : '--'}
                        </td>
                        <td className="p-4 text-right font-black text-slate-700 dark:text-slate-300">
                          {getAttendanceValue(record.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PIE CHART SIDE PANEL (Right 1 column) */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-6">
          <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="text-primary-600" size={20} />
              <span>Status Share</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Attendance distribution matrix</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { name: 'Present', color: 'bg-green-500', val: metrics.presentDays },
              { name: 'Half Day', color: 'bg-orange-500', val: metrics.halfDays },
              { name: 'Absent', color: 'bg-red-500', val: metrics.lopDays },
              { name: 'Leave', color: 'bg-blue-500', val: metrics.leaveDays },
              { name: 'Permission', color: 'bg-purple-500', val: metrics.permissionDays },
              { name: 'Holiday', color: 'bg-slate-500', val: metrics.holidayDays }
            ].map((legend) => (
              <div key={legend.name} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-900/30">
                <span className={`w-2 h-2 rounded-full ${legend.color}`}></span>
                <div className="flex-1 flex justify-between min-w-0">
                  <span className="text-slate-500 truncate">{legend.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">{legend.val}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
