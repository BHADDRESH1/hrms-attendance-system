import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Building2, 
  Activity, 
  AlertCircle 
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  employee_id_code: string;
  first_name: string;
  last_name: string;
}

export const ExportPage: React.FC = () => {
  // Dropdown list states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filter forms states
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interactive UI states
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dropdown lists from APIs on mount
  useEffect(() => {
    // Fetch departments
    apiClient.get<Department[]>('/employees/departments')
      .then(res => setDepartments(res.data))
      .catch(() => console.error("Could not fetch departments."));
      
    // Fetch employees
    apiClient.get<Employee[]>('/employees/')
      .then(res => setEmployees(res.data))
      .catch(() => console.error("Could not fetch employees."));
  }, []);

  // Sync Month picker with start/end date overrides
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const monthVal = e.target.value; // YYYY-MM
    setSelectedMonth(monthVal);
    
    if (monthVal) {
      const [year, month] = monthVal.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // last day of month
      
      // Offset timezone shifts when setting date string
      const toDateString = (dateObj: Date) => {
        const offset = dateObj.getTimezoneOffset() * 60000;
        return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
      };
      
      setStartDate(toDateString(firstDay));
      setEndDate(toDateString(lastDay));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleDateRangeChange = (type: 'start' | 'end', val: string) => {
    setSelectedMonth(''); // reset month selection when date overrides are entered
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  // Perform API download request with Blob response
  const triggerDownload = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setDownloading(true);
    setError(null);

    const params: any = {};
    if (selectedDept) params.department_id = selectedDept;
    if (selectedEmp) params.employee_id = selectedEmp;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (selectedStatus) params.status = selectedStatus;

    try {
      const response = await apiClient.get(`/attendance/export/${format}`, {
        params,
        responseType: 'blob' // Crucial for receiving binary files
      });

      // Parse headers for clean file names, or fallback
      const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup browser object refs
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setError('Export failed. Verify filters and query limits.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Download className="text-primary-600" size={24} />
          <span>Attendance Export Engine</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Select target filters and download workforce rosters in CSV, Excel, or PDF sheets.
        </p>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* FILTER CONTROL CARD */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-900 pb-3">
          Query Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Department Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <Building2 size={14} /> Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Employee Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <User size={14} /> Employee Profile
            </label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>

          {/* Month Picker Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={14} /> Selected Month
            </label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Status Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <Activity size={14} /> Attendance Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="on_leave">Leave</option>
              <option value="permission">Permission</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>

          {/* Date Overrides */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Start Date Override</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">End Date Override</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

        </div>
      </div>

      {/* DOWNLOAD PACKS ACTIONS CARD */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Supported Export Actions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Click the formats below to compile and download sheets.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CSV Download Card */}
          <div className="p-6 border border-slate-100 dark:border-slate-900 rounded-2xl text-center space-y-4 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">CSV Sheet</h4>
              <p className="text-xs text-slate-400">Plain text comma-separated values format. Fits standard DB imports.</p>
            </div>
            <Button
              onClick={() => triggerDownload('csv')}
              disabled={downloading}
              className="w-full"
              variant="outline"
            >
              Export CSV
            </Button>
          </div>

          {/* Excel Download Card */}
          <div className="p-6 border border-green-100 dark:border-green-950/20 rounded-2xl text-center space-y-4 bg-green-50/10 dark:bg-green-950/5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center mx-auto">
                <FileSpreadsheet size={24} />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Excel Ledger</h4>
              <p className="text-xs text-slate-400">Formatted binary spreadsheet (.xlsx) with grid headers and fit auto-spacing.</p>
            </div>
            <Button
              onClick={() => triggerDownload('xlsx')}
              disabled={downloading}
              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md border-none"
            >
              Export XLSX
            </Button>
          </div>

          {/* PDF Download Card */}
          <div className="p-6 border border-primary-100 dark:border-primary-955/20 rounded-2xl text-center space-y-4 bg-primary-50/10 dark:bg-primary-950/5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/20 text-primary-500 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">PDF Report Document</h4>
              <p className="text-xs text-slate-400">Print-ready generated grid documents with organization titles and table grids.</p>
            </div>
            <Button
              onClick={() => triggerDownload('pdf')}
              disabled={downloading}
              className="w-full"
            >
              Export PDF
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};
