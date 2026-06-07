import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { Link } from 'react-router-dom';
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
  Percent, 
  ChevronLeft,
  ChevronRight,
  BarChart2,
  FileText,
  AlertTriangle,
  FolderTree,
  UserCheck
} from 'lucide-react';

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

interface EmployeeAnalyticsRow {
  employee_id: string;
  employee_id_code: string;
  employee_name: string;
  department: string;
  month: string;
  total_hours: number;
  present_days: number;
  half_days: number;
  leave_days: number;
  lop_days: number;
  permission_days: number;
  attendance_percentage: number;
  status: string;
}

export const SuperAdminDashboardPage: React.FC = () => {
  // Navigation & Date states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [employeeRows, setEmployeeRows] = useState<EmployeeAnalyticsRow[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Fetch Aggregate Analytics and Monthly Comparison
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));
    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    try {
      // Fetch main month analytics
      const response = await apiClient.get<AnalyticsData>('/attendance/super-admin/analytics', {
        params: { start_date, end_date }
      });
      setAnalytics(response.data);

      // Fetch 3-month comparison data
      await fetchMonthlyComparisonData(selectedYear, selectedMonth);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch summary analytics.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch 3-month comparison data helper
  const fetchMonthlyComparisonData = async (year: number, month: number) => {
    const monthsToFetch = [];
    for (let i = 2; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      monthsToFetch.push({ year: y, month: m });
    }

    try {
      const promises = monthsToFetch.map(async ({ year, month }) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const start_date = firstDay.toISOString().split('T')[0];
        const end_date = lastDay.toISOString().split('T')[0];
        
        const res = await apiClient.get<AnalyticsData>('/attendance/super-admin/analytics', {
          params: { start_date, end_date }
        });
        
        return {
          name: `${monthNames[month].substring(0, 3)} ${year}`,
          'Expected Hours': res.data.expected_hours,
          'Productive Hours': res.data.actual_productive_hours,
          'Non Productive Hours': res.data.lost_hours,
          'Efficiency %': res.data.efficiency
        };
      });
      const data = await Promise.all(promises);
      setComparisonData(data);
    } catch (err) {
      console.error("Failed to load monthly comparison data:", err);
    }
  };

  // Fetch Employee Wise Table Analytics
  const fetchEmployeeAnalytics = useCallback(async () => {
    setTableLoading(true);
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));
    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    try {
      const response = await apiClient.get<EmployeeAnalyticsRow[]>('/attendance/super-admin/employee-analytics', {
        params: { start_date, end_date }
      });
      setEmployeeRows(response.data);
    } catch (err: any) {
      console.error("Failed to load employee analytics table:", err);
    } finally {
      setTableLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchAnalytics();
    fetchEmployeeAnalytics();
  }, [fetchAnalytics, fetchEmployeeAnalytics]);

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

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FolderTree className="text-primary-600" size={24} />
          <span>Super Admin Control Panel</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          High-level metrics, efficiency indexes, and organization-wide attendance diagnostics.
        </p>
      </div>

      {/* Navigation and Calendar Filter */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400">
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-bold text-slate-800 dark:text-slate-200 min-w-[150px] text-center">
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
          
          {/* 11 KPI METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { label: 'Total Employees', value: analytics.total_employees, icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
              { label: 'Working Days', value: analytics.working_days, icon: Calendar, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
              { label: 'Expected Hours', value: `${analytics.expected_hours} hrs`, icon: Clock, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
              { label: 'Actual Productive Hours', value: `${analytics.actual_productive_hours} hrs`, icon: Clock, color: 'text-green-500 bg-green-50 dark:bg-green-950/20' },
              { label: 'Non Productive Hours', value: `${analytics.lost_hours} hrs`, icon: Clock, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' },
              { label: 'Attendance Efficiency %', value: `${analytics.efficiency}%`, icon: Percent, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
              { label: 'Present Days', value: analytics.present_days, icon: UserCheck, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'Half Days', value: analytics.half_days, icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20' },
              { label: 'Leave Days', value: analytics.leave_days, icon: Calendar, color: 'text-sky-505 bg-sky-50 dark:bg-sky-950/20' },
              { label: 'LOP Days', value: analytics.lop_days, icon: AlertTriangle, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20' },
              { label: 'Permissions', value: analytics.permission_days, icon: Clock, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                    <p className="text-2xl font-black text-slate-950 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}><Icon size={20} /></div>
                </div>
              );
            })}
          </div>

          {/* SUPER ADMIN GRAPH (Monthly Comparison) */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
              <BarChart2 className="text-primary-600" size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Hours & Efficiency Comparison</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-900" />
                  <XAxis dataKey="name" className="fill-slate-500 text-xs font-semibold" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" className="text-[10px]" label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#3b82f6', fontSize: '10px' } }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#eab308" className="text-[10px]" label={{ value: 'Efficiency %', angle: 90, position: 'insideRight', offset: 10, style: { fill: '#eab308', fontSize: '10px' } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="Expected Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="Productive Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="Non Productive Hours" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="Efficiency %" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SUPER ADMIN ANALYTICS TABLE */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-primary-600" size={20} />
                <span>Super Admin Analytics Table</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Selectable monthly summaries of all workforce attendance records.</p>
            </div>

            <div className="overflow-x-auto">
              {tableLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                  <p className="text-xs uppercase font-bold tracking-wider">Syncing analytics table...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Employee Name</th>
                      <th className="p-4">Department</th>
                      <th className="p-4 text-center">Month</th>
                      <th className="p-4 text-center">Total Hours</th>
                      <th className="p-4 text-center">Present</th>
                      <th className="p-4 text-center">Half Day</th>
                      <th className="p-4 text-center">Leave</th>
                      <th className="p-4 text-center">LOP</th>
                      <th className="p-4 text-center">Attendance %</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {employeeRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400">
                          No employee analytics data available for this month.
                        </td>
                      </tr>
                    ) : (
                      employeeRows.map((row) => (
                        <tr key={row.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 font-mono font-bold text-xs text-primary-600 hover:underline">
                            <Link to={`/employees/${row.employee_id}`}>
                              {row.employee_id_code}
                            </Link>
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 hover:text-primary-600 hover:underline">
                            <Link to={`/employees/${row.employee_id}`}>
                              {row.employee_name}
                            </Link>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {row.department}
                          </td>
                          <td className="p-4 text-center text-slate-600 dark:text-slate-400">
                            {row.month}
                          </td>
                          <td className="p-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                            {row.total_hours} hrs
                          </td>
                          <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                            {row.present_days}
                          </td>
                          <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                            {row.half_days}
                          </td>
                          <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                            {row.leave_days}
                          </td>
                          <td className="p-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                            {row.lop_days}
                          </td>
                          <td className="p-4 text-center font-black text-teal-600">
                            {row.attendance_percentage}%
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-lg ${row.status === 'Active' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                              {row.status}
                            </span>
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
    </div>
  );
};
