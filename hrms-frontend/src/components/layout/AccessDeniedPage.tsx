import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-3xl animate-bounce">
        <ShieldAlert size={64} />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">403 Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
      </div>
      <div className="pt-2">
        <Button onClick={() => navigate('/')} className="flex items-center gap-2 px-6 py-3 font-semibold shadow-md">
          <ArrowLeft size={16} />
          <span>Return Home</span>
        </Button>
      </div>
    </div>
  );
};
