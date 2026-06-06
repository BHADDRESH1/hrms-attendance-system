import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { 
  FileText, 
  Search, 
  User, 
  Calendar, 
  ArrowRight, 
  X,
  UserCheck,
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Employee {
  id: string;
  employee_id_code: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AuditLog {
  id: string;
  employee_id_code: string;
  employee_name: string;
  attendance_date: string;
  original_clock_in: string | null;
  original_clock_out: string | null;
  new_clock_in: string | null;
  new_clock_out: string | null;
  old_status: string | null;
  new_status: string | null;
  edited_by_name: string;
  edited_date: string;
  edited_time: string;
  edit_reason: string;
}

interface AuditLogPaginatedResponse {
  total: number;
  page: number;
  limit: number;
  items: AuditLog[];
}

export const AuditLogsPage: React.FC = () => {
  // Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded row details drawer state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch employees list to populate select filter
  useEffect(() => {
    apiClient.get<Employee[]>('/employees/')
      .then(res => setEmployees(res.data))
      .catch(() => console.error("Could not fetch employees list."));
  }, []);

  // Fetch Audit Logs with filter queries and pagination parameters
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: any = {
      page,
      limit
    };
    if (selectedEmployee) params.employee_id = selectedEmployee;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (searchQuery.trim()) params.search = searchQuery;

    try {
      const response = await apiClient.get<AuditLogPaginatedResponse>('/attendance/audit-logs', { params });
      setLogs(response.data.items);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync audit logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, startDate, endDate, searchQuery, page, limit]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Reset page to 1 when filters are changed to prevent page boundary index issues
  useEffect(() => {
    setPage(1);
  }, [selectedEmployee, startDate, endDate, searchQuery]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-slate-400">--</span>;
    const statusLower = status.toLowerCase();
    let classes = "px-2 py-0.5 text-[10px] font-bold rounded-lg border uppercase ";
    
    if (statusLower === 'present') {
      classes += "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800";
    } else if (statusLower === 'half_day') {
      classes += "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800";
    } else {
      classes += "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800";
    }

    return <span className={classes}>{status.replace('_', ' ')}</span>;
  };

  // Pagination Helper calculations
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div className="space-y-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      
      {/* LEFT MAIN: TABLE & FILTERS */}
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="text-primary-600" size={24} />
            <span>Attendance Roster Audit Logs</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track authorized overrides, adjustments, and edit reasons.
          </p>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search query input */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search reason or editor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-3 text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Employee dropdown picker */}
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-3 text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>

            {/* Date range pickers */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-3 text-slate-700 dark:text-slate-355 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Start Date"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-3 text-slate-700 dark:text-slate-355 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="End Date"
              />
            </div>

          </div>
        </div>

        {error && (
          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
            <X size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* AUDIT TABLE */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p className="text-xs uppercase font-bold tracking-wider">Loading Audit History...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-500 font-semibold">
                    <th className="p-4">Employee ID</th>
                    <th className="p-4">Employee Name</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Time Adjustments</th>
                    <th className="p-4">Status Adjustment</th>
                    <th className="p-4">Edited By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-900">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No audit records matched.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      // Highlight edited rows using a light yellow background as requested
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        className={`cursor-pointer transition-colors ${
                          selectedLog?.id === log.id 
                            ? 'bg-yellow-100/60 dark:bg-yellow-950/20' 
                            : 'bg-yellow-50/40 hover:bg-yellow-100/40 dark:bg-yellow-950/5 dark:hover:bg-yellow-950/10'
                        }`}
                      >
                        <td className="p-4 font-mono font-semibold text-slate-500 text-xs">
                          {log.employee_id_code}
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                          {log.employee_name}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {formatDate(log.attendance_date)}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span>{formatTime(log.original_clock_in)} - {formatTime(log.original_clock_out)}</span>
                            <ArrowRight size={12} className="text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-300">
                              {formatTime(log.new_clock_in)} - {formatTime(log.new_clock_out)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            {getStatusBadge(log.old_status)}
                            <ArrowRight size={12} className="text-slate-400" />
                            {getStatusBadge(log.new_status)}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">
                          {log.edited_by_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION PANEL CONTROLLER */}
          {total > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/10">
              <div>
                Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startIndex}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> records
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RIGHT PANEL: AUDIT OVERVIEW DETAILS DRAWER */}
      {selectedLog && (
        <div className="w-full lg:w-96 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-fit space-y-6 self-start lg:sticky lg:top-8 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={18} className="text-primary-600" />
              <span>Audit Details</span>
            </h3>
            <button 
              onClick={() => setSelectedLog(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5 text-sm">
            
            {/* Employee info */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-900">
              <p className="text-[10px] uppercase font-bold text-slate-400">Subject</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedLog.employee_name}</p>
              <p className="text-xs text-slate-500 font-mono">{selectedLog.employee_id_code}</p>
              <p className="text-xs text-slate-500">Attendance Date: <span className="font-semibold text-slate-600 dark:text-slate-350">{formatDate(selectedLog.attendance_date)}</span></p>
            </div>

            {/* Time mapping comparative */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><Clock size={12} /> Time Shift Adjustments</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-slate-100 dark:border-slate-900/50 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium">Original</span>
                  <p className="font-mono text-xs text-slate-500">{formatTime(selectedLog.original_clock_in)}</p>
                  <p className="font-mono text-xs text-slate-500">{formatTime(selectedLog.original_clock_out)}</p>
                  <div className="pt-1">{getStatusBadge(selectedLog.old_status)}</div>
                </div>

                <div className="p-3 border border-primary-100 dark:border-primary-950/30 bg-primary-50/20 dark:bg-primary-950/10 rounded-xl space-y-1">
                  <span className="text-[10px] text-primary-500 font-bold">Audited</span>
                  <p className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">{formatTime(selectedLog.new_clock_in)}</p>
                  <p className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">{formatTime(selectedLog.new_clock_out)}</p>
                  <div className="pt-1">{getStatusBadge(selectedLog.new_status)}</div>
                </div>
              </div>
            </div>

            {/* Reason log */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><MessageSquare size={12} /> Edit Reason</p>
              <div className="p-4 bg-yellow-50/20 border border-yellow-250 dark:bg-yellow-950/5 dark:border-yellow-900/40 rounded-xl text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {selectedLog.edit_reason}
              </div>
            </div>

            {/* Audit details footer */}
            <div className="border-t border-slate-100 dark:border-slate-900 pt-4 text-xs text-slate-400 space-y-1">
              <p>Audited By: <span className="font-semibold text-slate-600 dark:text-slate-350">{selectedLog.edited_by_name}</span></p>
              <p>Audit Timestamp: <span className="font-semibold text-slate-600 dark:text-slate-350">{formatDate(selectedLog.edited_date)} at {selectedLog.edited_time}</span></p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
