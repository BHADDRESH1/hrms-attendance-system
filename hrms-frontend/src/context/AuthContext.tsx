import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api-client';

interface HRMSEmployee {
  id: string;
  organization_id?: string;
  department_id: string | null;
  shift_id?: string | null;
  employee_id_code: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Employee';
  status: 'active' | 'suspended' | 'terminated';
}

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  employee: HRMSEmployee | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<HRMSEmployee | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const response = await apiClient.get<any>('/employees/me');
      const data = response.data;
      const mappedEmployee: HRMSEmployee = {
        id: data.id,
        department_id: data.department_id,
        employee_id_code: data.employee_id_code,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.user?.email || '',
        role: data.user?.role?.name || 'Employee',
        status: data.user?.is_active ? 'active' : 'suspended'
      };
      setEmployee(mappedEmployee);
    } catch (error) {
      console.error('Failed to load employee profile from backend:', error);
      setEmployee(null);
    }
  };

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        refreshProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        setLoading(true);
        await refreshProfile();
        setLoading(false);
      } else {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ supabaseUser, employee, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
