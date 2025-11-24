"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type GlobalErrorVariant = 'error' | 'warning' | 'info' | 'success';

export interface GlobalError {
  id?: string;
  title?: string;
  message: string;
  variant?: GlobalErrorVariant;
  actionLabel?: string;
  onAction?: () => void;
  autoHideMs?: number; // optional auto-dismiss
}

interface GlobalErrorContextType {
  error: GlobalError | null;
  showError: (error: GlobalError | string) => void;
  clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<GlobalError | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setError(null);
  }, []);

  const showError = useCallback((err: GlobalError | string) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const payload: GlobalError = typeof err === 'string' ? { message: err, variant: 'error' } : err;
    const withDefaults: GlobalError = {
      id: payload.id || `global_error_${Date.now()}`,
      title: payload.title || (payload.variant === 'warning' ? 'Warning' : payload.variant === 'info' ? 'Notice' : payload.variant === 'success' ? 'Success' : 'Error'),
      variant: payload.variant || 'error',
      ...payload,
    };
    setError(withDefaults);
    if (withDefaults.autoHideMs && withDefaults.autoHideMs > 0) {
      timerRef.current = setTimeout(() => { setError(null); timerRef.current = null; }, withDefaults.autoHideMs);
    }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Capture uncaught errors and unhandled promise rejections to surface them in UI
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      showError({ title: 'Runtime Error', message: ev?.error?.message || ev?.message || 'Unknown client error', variant: 'error' });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason: any = ev?.reason;
      const msg = (reason && (reason.message || String(reason))) || 'Unhandled promise rejection';
      showError({ title: 'Unhandled Promise Rejection', message: msg, variant: 'error' });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection as any);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection as any);
    };
  }, [showError]);

  const value = useMemo(() => ({ error, showError, clearError }), [error, showError, clearError]);

  return (
    <GlobalErrorContext.Provider value={value}>
      {children}
    </GlobalErrorContext.Provider>
  );
}

export function useGlobalError() {
  const ctx = useContext(GlobalErrorContext);
  if (!ctx) throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  return ctx;
}
