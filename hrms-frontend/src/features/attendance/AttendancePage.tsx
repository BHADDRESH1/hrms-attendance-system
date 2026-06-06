import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { 
  Clock, 
  Play, 
  Square, 
  CheckCircle, 
  AlertCircle, 
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_location: string | null;
  clock_out_location: string | null;
  status: string;
  total_work_hours: number | null;
}

export const AttendancePage: React.FC = () => {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Running timer states
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [liveClock, setLiveClock] = useState(new Date());

  // Geolocation mock
  const [mockLocation] = useState("12.9716° N, 77.5946° E (Bengaluru Headquarters)");

  // Tick live clock
  useEffect(() => {
    const clockTimer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getLocalDateString = () => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().split('T')[0];
  };

  // Fetch today's punch state
  const loadTodayState = async () => {
    setLoading(true);
    setError(null);
    const todayStr = getLocalDateString();
    try {
      const response = await apiClient.get<AttendanceRecord[]>('/attendance/history', {
        params: { start_date: todayStr, end_date: todayStr }
      });
      if (response.data && response.data.length > 0) {
        setTodayRecord(response.data[0]);
      } else {
        setTodayRecord(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync punch status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayState();
  }, []);

  // Timer counter for active working state
  useEffect(() => {
    if (todayRecord && todayRecord.clock_in && !todayRecord.clock_out) {
      // Calculate initial elapsed time
      const startTime = new Date(todayRecord.clock_in).getTime();
      
      const tick = () => {
        const diff = Math.floor((new Date().getTime() - startTime) / 1000);
        setSecondsElapsed(diff > 0 ? diff : 0);
      };

      tick(); // run once immediately
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    } else {
      setSecondsElapsed(0);
    }
  }, [todayRecord]);

  const handlePunchIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post<AttendanceRecord>('/attendance/punch-in', {
        clock_in_ip: '192.168.1.101',
        clock_in_location: mockLocation
      });
      await loadTodayState();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Clock-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post<AttendanceRecord>('/attendance/punch-out', {
        clock_out_ip: '192.168.1.101',
        clock_out_location: mockLocation
      });
      await loadTodayState();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Clock-out failed.');
    } finally {
      setLoading(false);
    }
  };

  // Timer display formatter
  const formatElapsedTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert hours to clean hh:mm string
  const formatDurationString = (hours: number | null) => {
    if (hours === null) return '0 hrs';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} hrs ${m} mins`;
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
      case 'absent':
      case 'lop':
      default:
        return '0.0';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      case 'half_day':
        return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      default:
        return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
    }
  };

  // Determine current system states
  const isBeforePunch = !todayRecord;
  const isWorking = todayRecord && todayRecord.clock_in && !todayRecord.clock_out;
  const isAfterPunch = todayRecord && todayRecord.clock_in && todayRecord.clock_out;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Workforce Punch Portal</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Perform check-in/out protocols and audit time logs.
        </p>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* CORE TIMER DISPLAY & BUTTON SECTION */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-8">
        
        {/* Dynamic status indicators */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity size={14} className="text-primary-500" /> System Status:
          </span>
          <span className={`px-3.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${
            isBeforePunch ? 'text-slate-500 bg-slate-100 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800' :
            isWorking ? 'text-primary-700 bg-primary-50 border-primary-200 dark:bg-primary-950/20 dark:text-primary-300 dark:border-primary-800 animate-pulse' :
            'text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800'
          }`}>
            {isBeforePunch && "NOT CHECKED IN"}
            {isWorking && "CHECKED IN"}
            {isAfterPunch && "CHECKED OUT"}
          </span>
        </div>

        {/* Big visual time clocks */}
        <div className="text-center space-y-3">
          {isWorking ? (
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-500">Duration Elapsed</span>
              <p className="text-6xl font-black font-mono tracking-tight text-primary-600 dark:text-primary-400 tabular-nums">
                {formatElapsedTimer(secondsElapsed)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Current Time</span>
              <p className="text-5xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-200 tabular-nums">
                {liveClock.toLocaleTimeString()}
              </p>
            </div>
          )}
          <p className="text-sm text-slate-400 font-medium">
            {liveClock.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Location bounds indicators */}
        <div className="flex items-center gap-2.5 justify-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-150 dark:border-slate-900">
          <MapPin className="text-primary-500" size={16} />
          <span>Punch Coordinates: <span className="font-semibold">{mockLocation}</span></span>
        </div>

        {/* Dynamic primary buttons */}
        <div className="flex justify-center pt-2">
          {isBeforePunch && (
            <Button
              onClick={handlePunchIn}
              isLoading={loading}
              className="px-10 py-4 text-base font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Play size={18} fill="currentColor" />
              <span>Punch In Now</span>
            </Button>
          )}

          {isWorking && (
            <Button
              onClick={handlePunchOut}
              isLoading={loading}
              variant="danger"
              className="px-10 py-4 text-base font-bold rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Square size={18} fill="currentColor" />
              <span>Punch Out Now</span>
            </Button>
          )}

          {isAfterPunch && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 dark:bg-green-950/20 px-6 py-3 rounded-xl border border-green-200 dark:border-green-900/40 text-sm font-semibold">
              <CheckCircle size={16} />
              <span>Shift logged successfully. See daily card logs below.</span>
            </div>
          )}
        </div>
      </div>

      {/* METRIC CARD LOGS (VISIBLE AFTER CHECKS AND PUNCH OUT) */}
      {(isWorking || isAfterPunch) && todayRecord && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline points card */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock size={16} className="text-primary-500" /> Roster Timestamps
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500">Punch In Time</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  {formatPunchTime(todayRecord.clock_in)}
                </span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500">Punch Out Time</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  {formatPunchTime(todayRecord.clock_out)}
                </span>
              </div>
              {isAfterPunch && (
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500">Total Shift Duration</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    {formatDurationString(todayRecord.total_work_hours)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Business rules status cards */}
          {isAfterPunch && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary-500" /> Attendance Value Audit
              </h3>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500">Roster Calculation Status</span>
                  <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-lg capitalize ${getStatusBadgeColor(todayRecord.status)}`}>
                    {todayRecord.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-500">Attendance Value Factor</span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {getAttendanceValue(todayRecord.status)}
                  </span>
                </div>
                <div className="py-3 text-xs text-slate-400 italic">
                  * Rules: Present (&gt;=7 hrs) = 1.0; Half Day (5-7 hrs) = 0.5; Absent (&lt;5 hrs) = 0.0
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
