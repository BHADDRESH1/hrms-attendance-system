import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { 
  Users, 
  Clock, 
  Activity, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  total_work_hours: number | null;
  employee?: {
    first_name: string;
    last_name: string;
    employee_id_code: string;
    designation: string | null;
  };
}

export const AdminDashboardPage: React.FC = () => {
  const [dailyLogs, setDailyLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date configuration
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchDailyLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AttendanceRecord[]>('/attendance/daily', {
        params: { work_date: selectedDate }
      });
      setDailyLogs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch daily attendance logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyLogs();
  }, [fetchDailyLogs]);

  // Compute metrics from the daily logs
  const totalLogs = dailyLogs.length;
  const presentCount = dailyLogs.filter(r => r.status.toLowerCase() === 'present' || r.status.toLowerCase() === 'late').length;
  const halfDayCount = dailyLogs.filter(r => r.status.toLowerCase() === 'half_day').length;
  const absentCount = dailyLogs.filter(r => r.status.toLowerCase() === 'absent' || r.status.toLowerCase() === 'lop').length;

  const formatPunchTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let classes = "px-2.5 py-1 text-xs font-semibold rounded-lg border ";
    if (statusLower === 'present' || statusLower === 'late') {
      classes += "text-green-700 bg-green-50 border-green-200";
    } else if (statusLower === 'half_day') {
      classes += "text-yellow-700 bg-yellow-50 border-yellow-200";
    } else if (statusLower === 'leave' || statusLower === 'on_leave') {
      classes += "text-blue-700 bg-blue-50 border-blue-200";
    } else {
      classes += "text-red-700 bg-red-50 border-red-200";
    }
    return <span className={`${classes} capitalize`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage daily logs, track employee attendance states, and oversee shift compliance.</p>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Tracked Logs', value: totalLogs, icon: Users, color: 'text-primary-600 bg-primary-50' },
          { label: 'Present Today', value: presentCount, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Half Days', value: halfDayCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Absent/LOP', value: absentCount, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">{card.label}</span>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                <div className={`p-2 rounded-xl ${card.color}`}><Icon size={18} /></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Attendance logs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="text-primary-600" size={20} />
              <span>Today's Attendance Matrix</span>
            </h3>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-semibold text-slate-600 dark:text-slate-300"
            />
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p className="text-xs uppercase font-bold tracking-wider">Loading logs...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Designation</th>
                    <th className="p-4">Clock In</th>
                    <th className="p-4">Clock Out</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {dailyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No logs recorded for this day.</td>
                    </tr>
                  ) : (
                    dailyLogs.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                          {record.employee ? `${record.employee.first_name} ${record.employee.last_name}` : 'Unknown Staff'}
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {record.employee?.designation || 'Staff'}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">{formatPunchTime(record.clock_in)}</td>
                        <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">{formatPunchTime(record.clock_out)}</td>
                        <td className="p-4">{getStatusBadge(record.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity size={14} className="text-primary-500" /> Admin Quick Shortcuts
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center justify-between cursor-not-allowed opacity-60">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee Management</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage details and designations.</p>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center justify-between cursor-not-allowed opacity-60">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Approve Leave Requests</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Approve and verify staff leave.</p>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center justify-between cursor-not-allowed opacity-60">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Shift Configurations</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize daily shift matrix rules.</p>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
