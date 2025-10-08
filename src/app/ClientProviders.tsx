'use client';

import { AuthProvider } from '@/providers/AuthProvider';
import { Web3Provider } from '@/providers/Web3Provider';
import { ToastProvider } from '@/providers/ToastProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import Navigation from '@/components/Navigation';
import { useEffect } from 'react';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Ensure CSRF token cookie exists early in the session (double-submit token)
  useEffect(() => {
    try {
      const hasToken = typeof document !== 'undefined' && document.cookie.split('; ').some(c => c.startsWith('csrf_token='));
      if (!hasToken) {
        // Nonce endpoint also issues the CSRF cookie
        fetch('/api/auth/nonce', { credentials: 'include' }).catch(() => {});
      }
    } catch {}
  }, []);
  return (
    <AuthProvider>
      <Web3Provider>
        <ToastProvider>
          <NotificationProvider>
            <Navigation />
            <main className="min-h-screen">{children}</main>
          </NotificationProvider>
        </ToastProvider>
      </Web3Provider>
    </AuthProvider>
  );
}
