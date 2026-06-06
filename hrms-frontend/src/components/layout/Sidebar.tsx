import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarClock, 
  LogOut, 
  ShieldAlert, 
  CreditCard, 
  FolderLock, 
  Briefcase, 
  BookOpen,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { employee, signOut } = useAuth();

  const activeClass = "flex items-center gap-3 px-4 py-3 text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/30 rounded-xl transition-all duration-150";
  const inactiveClass = "flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all duration-150";
  const disabledClass = "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60";

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">
          Antigravity HRMS
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          Tenant Workspace
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink to="/" className={({ isActive }) => isActive ? activeClass : inactiveClass}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink to="/attendance" className={({ isActive }) => isActive ? activeClass : inactiveClass}>
          <CalendarClock size={18} />
          Attendance
        </NavLink>

        {employee?.role === 'Super Admin' && (
          <>
            <NavLink to="/audit-logs" className={({ isActive }) => isActive ? activeClass : inactiveClass}>
              <FileText size={18} />
              Audit Logs
            </NavLink>
            <NavLink to="/export" className={({ isActive }) => isActive ? activeClass : inactiveClass}>
              <Download size={18} />
              Export Data
            </NavLink>
          </>
        )}

        {/* Future Module Navigation Hooks (Stubs) */}
        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            Future Add-ons
          </p>
        </div>

        <div className={disabledClass}>
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} />
            <span>Leave Mgmt</span>
          </div>
          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 uppercase font-semibold">Soon</span>
        </div>

        <div className={disabledClass}>
          <div className="flex items-center gap-3">
            <CreditCard size={18} />
            <span>Payroll</span>
          </div>
          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 uppercase font-semibold">Soon</span>
        </div>

        <div className={disabledClass}>
          <div className="flex items-center gap-3">
            <Briefcase size={18} />
            <span>Assets</span>
          </div>
          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 uppercase font-semibold">Soon</span>
        </div>

        <div className={disabledClass}>
          <div className="flex items-center gap-3">
            <FolderLock size={18} />
            <span>Loans</span>
          </div>
          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 uppercase font-semibold">Soon</span>
        </div>

        <div className={disabledClass}>
          <div className="flex items-center gap-3">
            <BookOpen size={18} />
            <span>Courses (L&D)</span>
          </div>
          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 uppercase font-semibold">Soon</span>
        </div>
      </nav>

      {/* User profile footer */}
      {employee && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold uppercase">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                {employee.role}
              </p>
            </div>
            <button 
              onClick={signOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
