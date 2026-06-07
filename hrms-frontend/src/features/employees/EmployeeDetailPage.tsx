import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  AlertCircle, 
  CalendarMinus, 
  Percent, 
  Hourglass,
  FileSpreadsheet,
  Edit,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  employee_id_code: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  joined_date: string;
  designation: string | null;
  reporting_manager: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
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
  remarks: string | null;
  total_work_hours: number | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export const EmployeeDetailPage: React.FC = () => {
  const { id: employeeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee: adminUser } = useAuth();

  // Navigation / Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Data states
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [newClockIn, setNewClockIn] = useState('');
  const [newClockOut, setNewClockOut] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [editReason, setEditReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Summary Metrics states
  const [metrics, setMetrics] = useState({
    presentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    lopDays: 0,
    totalHoursWorked: 0,
    attendancePercentage: 0
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const toLocalDatetimeString = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const response = await apiClient.get<EmployeeProfile>(`/employees/${employeeId}`);
      setProfile(response.data);
    } catch (err: any) {
      setError('Failed to fetch employee profile details.');
    }
  }, [employeeId]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));
    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    try {
      const response = await apiClient.get<AttendanceRecord[]>(`/attendance/employee/${employeeId}/history`, {
        params: { start_date, end_date }
      });
      setRecords(response.data);
      calculateSummaryMetrics(response.data, selectedYear, selectedMonth);
    } catch (err: any) {
      setError('Failed to load employee attendance history.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, [fetchProfile, fetchHistory]);

  const calculateSummaryMetrics = (data: AttendanceRecord[], year: number, month: number) => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysLimit = isCurrentMonth ? today.getDate() : getDaysInMonth(year, month);
    
    let workingDays = 0;
    let present = 0;
    let half = 0;
    let leave = 0;
    let lop = 0;
    let hoursWorked = 0;

    for (let day = 1; day <= daysLimit; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        workingDays++;
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
          } else if (statusLower === 'absent' || statusLower === 'lop') {
            lop++;
          } else {
            lop++;
          }
        } else {
          if (dateObj < today) {
            lop++;
          }
        }
      }
    }

    const attendanceValueSum = present * 1.0 + half * 0.5;
    const percentage = workingDays > 0 ? (attendanceValueSum / workingDays) * 100 : 0;

    setMetrics({
      presentDays: present,
      halfDays: half,
      leaveDays: leave,
      lopDays: lop,
      totalHoursWorked: Math.round(hoursWorked * 100) / 100,
      attendancePercentage: Math.min(Math.round(percentage), 100)
    });
  };

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

  const handleOpenEditModal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setNewClockIn(toLocalDatetimeString(record.clock_in));
    setNewClockOut(toLocalDatetimeString(record.clock_out));
    setNewStatus(record.status);
    setEditReason('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!editReason.trim()) {
      setModalError('Reason is required for audit history.');
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
      await fetchHistory();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to update attendance.');
    } finally {
      setModalSubmitting(false);
    }
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
      {/* Header and Back Button */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Employee Profile Details</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Detailed overview and metrics for individual staff records.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {profile && (
        <>
          {/* PROFILE VIEW PANEL */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary-50 dark:bg-primary-950/30 text-primary-600 rounded-2xl">
                <User size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {profile.first_name} {profile.last_name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {profile.designation || 'Staff Associate'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-450 mt-1 font-semibold">
                  <span>ID: <span className="font-mono text-slate-700 dark:text-slate-200">{profile.employee_id_code}</span></span>
                  <span>•</span>
                  <span>Dept: <span className="text-slate-700 dark:text-slate-200">{profile.department?.name || 'Unassigned'}</span></span>
                  <span>•</span>
                  <span>Manager: <span className="text-slate-700 dark:text-slate-200">{profile.reporting_manager || 'None'}</span></span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-900 rounded-xl text-xs space-y-1">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Joining Date</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(profile.joined_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Contact Phone</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{profile.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* INDIVIDUAL EMPLOYEE ANALYTICS (KPIs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { label: 'Present Days', value: metrics.presentDays, icon: User, color: 'text-green-500 bg-green-50' },
              { label: 'Half Days', value: metrics.halfDays, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Leave Days', value: metrics.leaveDays, icon: CalendarMinus, color: 'text-blue-500 bg-blue-50' },
              { label: 'LOP Days', value: metrics.lopDays, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
              { label: 'Total Hours Worked', value: `${metrics.totalHoursWorked} hrs`, icon: Hourglass, color: 'text-amber-500 bg-amber-50' },
              { label: 'Attendance %', value: `${metrics.attendancePercentage}%`, icon: Percent, color: 'text-teal-500 bg-teal-50' }
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">{card.label}</span>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-slate-900 dark:text-white">{card.value}</p>
                    <div className={`p-1.5 rounded-lg ${card.color}`}><Icon size={14} /></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MONTH NAVIGATION BAR */}
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
          </div>

          {/* INDIVIDUAL ATTENDANCE TABLE */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="text-primary-600" size={20} />
                <span>Individual Attendance Table</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">Records found: {records.length}</span>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                  <p className="text-xs uppercase font-bold tracking-wider">Syncing history...</p>
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
                      {adminUser?.role === 'super_admin' && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">No logs found for this period.</td>
                      </tr>
                    ) : (
                      records.map(record => (
                        <tr 
                          key={record.id} 
                          className={record.is_edited ? "bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/60" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/10"}
                        >
                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                            {formatDateString(record.work_date)}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{formatPunchTime(record.clock_in)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{formatPunchTime(record.clock_out)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                            {record.total_work_hours !== null ? `${record.total_work_hours} hrs` : '--'}
                          </td>
                          <td className="p-4 text-center font-black text-slate-700 dark:text-slate-300">
                            {getAttendanceValue(record.status)}
                          </td>
                          <td className="p-4">{getStatusBadge(record.status)}</td>
                          <td className="p-4 text-slate-500 dark:text-slate-400 text-xs italic">{record.remarks || '--'}</td>
                          {adminUser?.role === 'super_admin' && (
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleOpenEditModal(record)}
                                className="p-2 bg-primary-50 dark:bg-primary-950/20 hover:bg-primary-100 text-primary-600 rounded-lg hover:scale-105 transition-all inline-flex items-center gap-1 font-semibold text-xs"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* OVERRIDE DIALOG MODAL */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Manual Roster Punch Override</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overriding logs for <span className="font-semibold text-slate-600 dark:text-slate-200">{profile ? `${profile.first_name} ${profile.last_name}` : 'Employee'}</span>
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-605"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2"><AlertTriangle size={14} /><span>{modalError}</span></div>
              )}

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-900 rounded-xl text-center text-xs">
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Clock In Time</label>
                <input type="datetime-local" value={newClockIn} onChange={(e) => setNewClockIn(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Clock Out Time</label>
                <input type="datetime-local" value={newClockOut} onChange={(e) => setNewClockOut(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">Leave</option>
                  <option value="permission">Permission</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase flex justify-between"><span>Reason for Edit</span><span className="text-[10px] text-red-500 lowercase font-bold font-mono">Mandatory Audit Log</span></label>
                <textarea required rows={3} value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Provide detail reason..." className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
              </div>

              <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                <Button type="submit" isLoading={modalSubmitting} className="flex-1 py-3">Confirm Override</Button>
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={modalSubmitting} className="flex-1 py-3">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
