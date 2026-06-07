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
  role: 'super_admin' | 'admin' | 'employee';
  status: 'active' | 'suspended' | 'terminated';
}

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  employee: HRMSEmployee | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<HRMSEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) {
        throw new Error("No user email in session");
      }

      // Fetch user's role from Supabase user_roles table
      console.log("[AuthContext] Querying role for email:", email);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', email)
        .single();

      console.log("Logged in email:", session.user.email);
      console.log("Retrieved role:", roleData?.role);

      console.log("[AuthContext] Query results:", { roleData, roleError });

      if (roleError || !roleData || !roleData.role) {
        console.error("[AuthContext] Role retrieval failed:", roleError);
        throw new Error("No role assigned to this user");
      }

      const response = await apiClient.get<any>('/employees/me');
      const data = response.data;
      const mappedEmployee: HRMSEmployee = {
        id: data.id,
        department_id: data.department_id,
        employee_id_code: data.employee_id_code,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.user?.email || '',
        role: roleData.role as 'super_admin' | 'admin' | 'employee',
        status: data.user?.is_active ? 'active' : 'suspended'
      };
      setEmployee(mappedEmployee);
    } catch (err: any) {
      console.error('Failed to load employee profile from backend:', err);
      setEmployee(null);
      throw err;
    }
  };

  useEffect(() => {
    setError(null);
    // Check initial active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        try {
          await refreshProfile();
        } catch (err: any) {
          setError(err.message || "Failed to authenticate role");
          await supabase.auth.signOut();
        } finally {
          setLoading(false);
        }
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
        setError(null);
        try {
          await refreshProfile();
        } catch (err: any) {
          setError(err.message || "Failed to authenticate role");
          await supabase.auth.signOut();
        } finally {
          setLoading(false);
        }
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
    setError(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ supabaseUser, employee, session, loading, error, signOut, refreshProfile }}>
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
