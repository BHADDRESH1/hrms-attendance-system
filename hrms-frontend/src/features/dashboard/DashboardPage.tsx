import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
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
  BarChart2
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
  remarks: string | null;
  total_work_hours: number | null;
  is_edited: boolean;
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
    totalDays: 0,
    presentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    lopDays: 0,
    permissionDays: 0,
    attendancePercentage: 0,
    totalHoursWorked: 0
  });

  // Keep live clock running
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

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
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysLimit = isCurrentMonth ? today.getDate() : daysInMonth;
    
    let workingDays = 0;
    let present = 0;
    let half = 0;
    let leave = 0;
    let lop = 0;
    let permission = 0;
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
          const statusLower = record.status.toLowerCase();
          
          if (statusLower === 'present' || statusLower === 'late') {
            present++;
          } else if (statusLower === 'half_day') {
            half++;
          } else if (statusLower === 'leave' || statusLower === 'on_leave') {
            leave++;
          } else if (statusLower === 'permission') {
            permission++;
          } else if (statusLower === 'absent' || statusLower === 'lop') {
            lop++;
          } else {
            lop++;
          }
        } else {
          // If no record exists for a past weekday, count it as LOP/Absent
          if (dateObj < today) {
            lop++;
          }
        }
      }
    }

    // Attendance Value Sum: Present * 1.0 + Half Day * 0.5 (others are 0.0)
    const attendanceValueSum = present * 1.0 + half * 0.5;
    const percentage = workingDays > 0 ? (attendanceValueSum / workingDays) * 100 : 0;

    setMetrics({
      totalDays: daysInMonth,
      presentDays: present,
      halfDays: half,
      leaveDays: leave,
      lopDays: lop,
      permissionDays: permission,
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
        return '1.0';
      case 'half_day':
        return '0.5';
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
      classes += "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800";
    } else if (statusLower === 'half_day') {
      classes += "text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-850";
    } else if (statusLower === 'leave' || statusLower === 'on_leave') {
      classes += "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800";
    } else if (statusLower === 'permission') {
      classes += "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800";
    } else if (statusLower === 'lop') {
      classes += "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-850";
    } else {
      classes += "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800";
    }

    return (
      <span className={`${classes} capitalize`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Color mapping based on status rules
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
      case 'late':
        return '#22c55e'; // Green
      case 'half_day':
        return '#eab308'; // Yellow
      case 'absent':
        return '#ef4444'; // Red
      case 'leave':
      case 'on_leave':
        return '#3b82f6'; // Blue
      case 'lop':
        return '#f97316'; // Orange
      case 'permission':
        return '#a855f7'; // Purple
      case 'weekend':
        return '#cbd5e1'; // Weekend light gray
      default:
        return '#94a3b8'; // default slate
    }
  };

  // Assembly of Daily Hours Graph Data (30 calendar days)
  const getGraphData = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const data = [];
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dateStr = dateObj.toISOString().split('T')[0];
      const record = records.find(rec => rec.work_date === dateStr);
      
      let hours = 0;
      let status = 'Absent';
      
      if (record) {
        hours = record.total_work_hours || 0;
        status = record.status;
      } else {
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
          status = 'Weekend';
        } else if (dateObj < today) {
          status = 'LOP';
        }
      }
      
      const shortMonth = monthNames[selectedMonth].substring(0, 3);
      const dayLabel = `${day < 10 ? '0' + day : day}-${shortMonth}`;
      
      data.push({
        date: dayLabel,
        'Hours Worked': hours,
        status: status
      });
    }
    return data;
  };

  const graphData = getGraphData();

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
          <span className="text-base font-bold text-slate-800 dark:text-slate-200 min-w-[150px] text-center">
            Attendance for {monthNames[selectedMonth]} {selectedYear}
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
          { label: 'Total Days in Month', value: metrics.totalDays, icon: Briefcase, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Present Days', value: metrics.presentDays, icon: CheckCircle2, color: 'text-green-500 bg-green-50 dark:bg-green-950/20' },
          { label: 'Leave Days', value: metrics.leaveDays, icon: CalendarMinus, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' },
          { label: 'LOP Days', value: metrics.lopDays, icon: AlertCircle, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' },
          { label: 'Half Days', value: metrics.halfDays, icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20' },
          { label: 'Attendance %', value: `${metrics.attendancePercentage}%`, icon: Percent, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
          { label: 'Total Hours Worked', value: `${metrics.totalHoursWorked} hrs`, icon: Hourglass, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Permissions', value: metrics.permissionDays, icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
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

      {/* DAILY ATTENDANCE HOURS GRAPH */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
          <BarChart2 className="text-primary-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Hours Graph</h3>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-900" />
              <XAxis dataKey="date" className="fill-slate-500 text-[10px] font-semibold" />
              <YAxis className="fill-slate-500 text-[10px]" label={{ value: 'Hours Worked', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: '10px', fill: '#94a3b8' } }} />
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
              <Bar dataKey="Hours Worked" radius={[4, 4, 0, 0]}>
                {graphData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Graph Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold pt-2">
          {[
            { label: 'Present', color: '#22c55e' },
            { label: 'Half Day', color: '#eab308' },
            { label: 'Absent', color: '#ef4444' },
            { label: 'Leave', color: '#3b82f6' },
            { label: 'LOP', color: '#f97316' },
            { label: 'Permission', color: '#a855f7' }
          ].map(leg => (
            <div key={leg.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: leg.color }}></span>
              <span className="text-slate-500 dark:text-slate-450">{leg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* EMPLOYEE ATTENDANCE TABLE */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-primary-600" size={20} />
            <span>Employee Attendance Table</span>
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
                  <th className="p-4">Punch In</th>
                  <th className="p-4">Punch Out</th>
                  <th className="p-4">Hours Worked</th>
                  <th className="p-4 text-center">Attendance Value</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No logs mapped for {monthNames[selectedMonth]} {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr 
                      key={record.id} 
                      className={
                        record.is_edited 
                          ? "bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-colors" 
                          : "hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                      }
                    >
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {formatDateString(record.work_date)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                        {formatPunchTime(record.clock_in)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                        {formatPunchTime(record.clock_out)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {record.total_work_hours !== null ? `${record.total_work_hours} Hours` : '--'}
                      </td>
                      <td className="p-4 text-center font-black text-slate-700 dark:text-slate-300">
                        {getAttendanceValue(record.status)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs italic">
                        {record.remarks || '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
