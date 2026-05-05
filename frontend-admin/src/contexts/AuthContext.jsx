import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { demoProfile } from '../data/demoData';
import { rolePermissions } from '../config/permissions';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

function mapBackendIssue(error) {
  const message = error?.message ?? 'Unknown Supabase error';
  const code = error?.code ?? null;

  if (
    code === 'PGRST205' ||
    message.includes("Could not find the table 'public.profiles'")
  ) {
    return {
      type: 'missing_profiles_table',
      title: 'Thieu bang profiles trong Supabase',
      message:
        'Dang nhap Auth thanh cong, nhung frontend khong the tai profile va role vi bang public.profiles chua ton tai.',
      details:
        'Project hien chua chay day du schema backend. Khi thieu bang profiles, sidebar, role va route guard se hoat dong khong dung.'
    };
  }

  return {
    type: 'unknown_supabase_issue',
    title: 'Khong tai duoc ho so nguoi dung',
    message:
      'Supabase da ket noi nhung frontend khong lay duoc profile hien tai de xac dinh role.',
    details: message
  };
}

function buildDemoSession() {
  return {
    access_token: 'demo-access-token',
    user: {
      id: demoProfile.id,
      email: demoProfile.email
    }
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendIssue, setBackendIssue] = useState(null);

  async function loadProfile(nextUser) {
    if (!nextUser) {
      setProfile(null);
      setBackendIssue(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setProfile(demoProfile);
      setBackendIssue(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setBackendIssue(null);
    setProfile(
      data ?? {
        id: nextUser.id,
        email: nextUser.email,
        full_name: nextUser.user_metadata?.full_name ?? 'Nhan vien moi',
        role: 'cashier',
        is_active: true
      }
    );
  }

  async function refreshProfile() {
    if (!user) {
      return;
    }

    await loadProfile(user);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        if (!isSupabaseConfigured) {
          const demoSession = buildDemoSession();
          if (!mounted) {
            return;
          }

          setSession(demoSession);
          setUser(demoSession.user);
          setProfile(demoProfile);
          setBackendIssue(null);
          return;
        }

        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        await loadProfile(currentSession?.user ?? null);
      } catch (error) {
        if (mounted) {
          console.error('Bootstrap auth failed', error);
          setBackendIssue(mapBackendIssue(error));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrapAuth();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await loadProfile(nextSession?.user ?? null);
      } catch (error) {
        console.error('Auth state sync failed', error);
        setBackendIssue(mapBackendIssue(error));
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn({ email, password }) {
    if (!isSupabaseConfigured) {
      const demoSession = buildDemoSession();
      setSession(demoSession);
      setUser(demoSession.user);
      setProfile({
        ...demoProfile,
        email: email || demoProfile.email
      });
      setBackendIssue(null);
      return { success: true };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        message: error.message
      };
    }

    return { success: true };
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setBackendIssue(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setBackendIssue(null);
  }

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile,
      demoMode: !isSupabaseConfigured,
      backendIssue,
      permissions: profile?.role ? rolePermissions[profile.role] ?? {} : {}
    }),
    [session, user, profile, loading, backendIssue]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
