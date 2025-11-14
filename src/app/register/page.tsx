"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/providers/AuthProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { login: setAuthToken, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ensureCsrf = async () => {
    const has = typeof document !== 'undefined' && document.cookie.split('; ').some(c => c.startsWith('csrf_token='));
    if (!has) {
      await fetch('/api/auth/nonce', { credentials: 'include' }).catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await ensureCsrf();
      // Attach CSRF double-submit token if present
      const csrfCookie = typeof document !== 'undefined' ? document.cookie.split('; ').find(c=>c.startsWith('csrf_token=')) : null;
      const csrf = csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : undefined;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed');
      } else {
        try { if (data.token) localStorage.setItem('auth_token', data.token); } catch {}
        if (data.token) {
          setAuthToken(data.token);
        } else {
          // Fallback: try to refresh profile if token is cookie-based
          refresh().catch(() => {});
        }
        setSuccess(true);
        try { await refresh(); } catch {}
        setTimeout(() => router.push('/dashboard/enhanced'), 300);
      }
    } catch (e: any) {
      // Provide more granular error hinting for debugging connectivity vs server failures
      if (e?.name === 'TypeError') {
        setError('Network error (failed to reach server)');
      } else {
        setError('Unexpected error submitting registration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-16">
      <Card className="w-full max-w-md border-0 shadow-sm ring-1 ring-gray-200/70">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                id="reg-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="yourname"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">Account created. Redirecting...</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </Button>
            <div className="text-center text-xs text-gray-500">
              <span className="block">Already have an account? <a href="/login" className="text-purple-600 underline font-medium">Sign in</a></span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
