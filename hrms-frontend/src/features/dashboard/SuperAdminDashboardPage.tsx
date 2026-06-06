import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Percent, 
  ChevronLeft,
  ChevronRight,
  BarChart as BarIcon,
  Edit,
  X,
  FileText
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  employee_id_code: string;
  first_name: string;
  last_name: string;
}

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
  employee?: EmployeeProfile;
}

interface AnalyticsData {
  total_employees: number;
  working_days: number;
  expected_hours: number;
  actual_productive_hours: number;
  lost_hours: number;
  efficiency: number;
  present_days: number;
  half_days: number;
  leave_days: number;
  lop_days: number;
  permission_days: number;
}

export const SuperAdminDashboardPage: React.FC = () => {
  const { employee: adminUser } = useAuth();
  
  // Navigation & Date states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [newClockIn, setNewClockIn] = useState('');
  const [newClockOut, setNewClockOut] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [editReason, setEditReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Convert DB ISO dates to local input format (YYYY-MM-DDTHH:MM)
  const toLocalDatetimeString = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  // Fetch Summary Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));
    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    try {
      const response = await apiClient.get<AnalyticsData>('/attendance/super-admin/analytics', {
        params: { start_date, end_date }
      });
      setAnalytics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch summary analytics.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch Daily Log rows
  const fetchDailyLogs = useCallback(async () => {
    setDailyLoading(true);
    try {
      const response = await apiClient.get<AttendanceRecord[]>('/attendance/daily', {
        params: { work_date: selectedDate }
      });
      setDailyRecords(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load daily logs.');
    } finally {
      setDailyLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchDailyLogs();
  }, [fetchDailyLogs]);

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

  // Open Edit Dialog
  const handleOpenEditModal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setNewClockIn(toLocalDatetimeString(record.clock_in));
    setNewClockOut(toLocalDatetimeString(record.clock_out));
    setNewStatus(record.status);
    setEditReason('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit override patch
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!editReason.trim()) {
      setModalError('Edit reason is required for audit logs.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    const payload = {
      clock_in: newClockIn ? new Date(newClockIn).toISOString() : null,
      clock_out: newClockOut ? new Date(newClockOut).toISOString() : null,
      status: newStatus,
      reason: editReason
    };

    try {
      await apiClient.patch(`/attendance/${selectedRecord.id}`, payload);
      setIsModalOpen(false);
      await fetchDailyLogs();
      await fetchAnalytics();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to update record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const chartData = analytics ? [
    {
      name: monthNames[selectedMonth],
      'Expected Hours': analytics.expected_hours,
      'Productive Hours': analytics.actual_productive_hours,
      'Lost Hours': analytics.lost_hours,
      'Efficiency %': analytics.efficiency
    }
  ] : [];

  const formatPunchTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      case 'half_day':
        return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      case 'leave':
      case 'on_leave':
        return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-primary-600" size={24} />
            <span>Super Admin Control Panel</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            High-level metrics, efficiency indexes, and organization-wide attendance diagnostics.
          </p>
        </div>
      </div>

      {/* Navigation and Calendar Filter */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400">
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
            {monthNames[selectedMonth]} {selectedYear}
          </span>
          <button onClick={handleNextMonth} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400">
            <ChevronRight size={18} />
          </button>
        </div>

        <button 
          onClick={() => {
            const today = new Date();
            setSelectedMonth(today.getMonth());
            setSelectedYear(today.getFullYear());
          }}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold text-primary-600"
        >
          Current Month
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
          <p className="text-xs uppercase font-bold tracking-wider">Syncing dashboard...</p>
        </div>
      ) : analytics && (
        <div className="space-y-8">
          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Attendance Efficiency</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white">{analytics.efficiency}%</p>
              </div>
              <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-500 rounded-xl"><Percent size={22} /></div>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Total Active Employees</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white">{analytics.total_employees}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-xl"><Users size={22} /></div>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Working Days</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white">{analytics.working_days}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 text-purple-500 rounded-xl"><Calendar size={22} /></div>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Productive Hours</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white">{analytics.actual_productive_hours}h</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-xl"><Clock size={22} /></div>
            </div>
          </div>

          {/* LOWER SECTION: BAR CHARTS AND METRICS ROSTER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
              <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                <BarIcon className="text-primary-600" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hours & Efficiency Roster</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-900" />
                    <XAxis dataKey="name" className="fill-slate-500 text-xs" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="Expected Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Productive Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Lost Hours" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="Efficiency %" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="border-b border-slate-100 dark:border-slate-900 pb-3"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Status Tallies</h3></div>
              <div className="flex-1 flex flex-col justify-center gap-3 py-4">
                {[
                  { name: 'Present', val: analytics.present_days, color: 'bg-green-500' },
                  { name: 'Half Day', val: analytics.half_days, color: 'bg-orange-500' },
                  { name: 'Leave', val: analytics.leave_days, color: 'bg-blue-500' },
                  { name: 'LOP', val: analytics.lop_days, color: 'bg-red-500' },
                  { name: 'Permission', val: analytics.permission_days, color: 'bg-purple-500' }
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-base font-black text-slate-900 dark:text-white">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SUPER ADMIN DIRECT OVERRIDE ATTENDANCE TABLE */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-primary-600" size={20} />
                  <span>Roster Logs Override Directory</span>
                </h3>
                <p className="text-xs text-slate-400">View and manually override logged punches across the entire workforce.</p>
              </div>

              {/* Date selection picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Roster Date:</span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {dailyLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                  <p className="text-xs uppercase font-bold tracking-wider">Syncing daily logs...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Employee Name</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Punch In</th>
                      <th className="p-4">Punch Out</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {dailyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No punches registered on this date.
                        </td>
                      </tr>
                    ) : (
                      dailyRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 font-mono font-semibold text-slate-500 text-xs">
                            {record.employee?.employee_id_code || 'EMP-UNKNOWN'}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                            {record.employee ? `${record.employee.first_name} ${record.employee.last_name}` : 'Unknown Profile'}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(record.work_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                            {formatPunchTime(record.clock_in)}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                            {formatPunchTime(record.clock_out)}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-lg capitalize ${getStatusBadgeColor(record.status)}`}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {adminUser?.role === 'Super Admin' && (
                              <button 
                                onClick={() => handleOpenEditModal(record)}
                                className="p-2 bg-primary-50 dark:bg-primary-950/20 hover:bg-primary-100 dark:hover:bg-primary-950/40 text-primary-600 rounded-lg hover:scale-105 transition-all inline-flex items-center gap-1.5 font-semibold text-xs"
                                title="Edit Attendance"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                            )}
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
      )}

      {/* OVERRIDE DIALOG MODAL */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Manual Roster Punch Override
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overriding logs for <span className="font-semibold text-slate-600 dark:text-slate-200">{selectedRecord.employee ? `${selectedRecord.employee.first_name} ${selectedRecord.employee.last_name}` : 'Employee'}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Current Details Indicators */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 rounded-xl text-center text-xs">
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Current In</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{formatPunchTime(selectedRecord.clock_in)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Current Out</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{formatPunchTime(selectedRecord.clock_out)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Current Status</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedRecord.status}</span>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Clock In Time</label>
                <input 
                  type="datetime-local"
                  value={newClockIn}
                  onChange={(e) => setNewClockIn(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Clock Out Time</label>
                <input 
                  type="datetime-local"
                  value={newClockOut}
                  onChange={(e) => setNewClockOut(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">Leave</option>
                  <option value="permission">Permission</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase flex justify-between">
                  <span>Reason for Edit</span>
                  <span className="text-[10px] text-red-500 lowercase font-bold font-mono">Mandatory Audit Log</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Employee forgot to punch out due to system outage. Adjusted based on email confirmation."
                  className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                <Button 
                  type="submit" 
                  isLoading={modalSubmitting}
                  className="flex-1 py-3"
                >
                  Confirm Override
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                  className="flex-1 py-3"
                >
                  Cancel
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
