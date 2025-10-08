"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';

interface AuthContextValue {
  token: string | null;
  user: any;
  loading: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const { profile, isLoading, fetchProfile, setProfile } = useProfile({ token: token ?? undefined });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_token');
      if (stored) setToken(stored);
    } catch {}
    setInitializing(false);
  }, []);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
    try { localStorage.setItem('auth_token', newToken); } catch {}
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    try { localStorage.removeItem('auth_token'); } catch {}
    setToken(null);
    setProfile(null as any);
  };

  const refresh = async () => {
    if (token) await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ token, user: profile, loading: isLoading || initializing, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
