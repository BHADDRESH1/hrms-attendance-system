import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SuperAdminDashboardPage } from './features/dashboard/SuperAdminDashboardPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { AuditLogsPage } from './features/attendance/AuditLogsPage';
import { ExportPage } from './features/attendance/ExportPage';
import { EmployeeDetailPage } from './features/employees/EmployeeDetailPage';
import { supabase } from './lib/supabase';
import { Button } from './components/ui/Button';

// --- Login Screen component ---
const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setError('Registration successful! Please sign in.');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">HRMS Workspace</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in with Supabase Authentication to sync portal.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g. employee@company.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Button type="submit" isLoading={loading}>
              Sign In
            </Button>
            <Button type="button" variant="secondary" onClick={handleSignUp} disabled={loading}>
              Register
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- App Layout Guard ---
const ProtectedLayout: React.FC = () => {
  const { session, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Syncing HRMS Portal...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 lg:p-10">
        <Routes>
          <Route path="/" element={employee?.role === 'Super Admin' ? <SuperAdminDashboardPage /> : <DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/audit-logs" element={employee?.role === 'Super Admin' ? <AuditLogsPage /> : <Navigate to="/" />} />
          <Route path="/export" element={employee?.role === 'Super Admin' ? <ExportPage /> : <Navigate to="/" />} />
          <Route path="/employees/:id" element={employee?.role === 'Super Admin' ? <EmployeeDetailPage /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

// --- Main Root Component ---
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
