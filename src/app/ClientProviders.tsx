'use client';

import { AuthProvider } from '@/providers/AuthProvider';
import { Web3Provider } from '@/providers/Web3Provider';
import { ToastProvider } from '@/providers/ToastProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import Navigation from '@/components/Navigation';
import { useEffect } from 'react';
import { GlobalErrorProvider } from '@/providers/GlobalErrorProvider';
import GlobalErrorBanner from '@/components/GlobalErrorBanner';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Ensure CSRF token cookie exists early in the session (double-submit token)
  useEffect(() => {
    const REQUIRE_CSRF = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_REQUIRE_CSRF !== 'false') : true;
    try {
      const hasToken = typeof document !== 'undefined' && document.cookie.split('; ').some(c => c.startsWith('csrf_token='));
      if (REQUIRE_CSRF && !hasToken) {
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
            <GlobalErrorProvider>
              <GlobalErrorBanner />
              <header role="banner">
                <Navigation />
              </header>
              <main className="min-h-screen">{children}</main>
            </GlobalErrorProvider>
          </NotificationProvider>
        </ToastProvider>
      </Web3Provider>
    </AuthProvider>
  );
}
