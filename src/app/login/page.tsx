"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Ensure CSRF token present if user lands directly on /login (bypassing layout bootstrap timing)
  useEffect(() => {
    const has = typeof document !== 'undefined' && document.cookie.split('; ').some(c => c.startsWith('csrf_token='));
    if (!has) {
      fetch('/api/auth/nonce', { credentials: 'include' }).catch(() => {});
    }
  }, []);

  function getCsrfFromCookie() {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
    return m ? decodeURIComponent(m.split('=')[1]) : null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      // Try to ensure CSRF first if still missing
      let csrf = getCsrfFromCookie();
      if (!csrf) {
        await fetch('/api/auth/nonce', { credentials: 'include' }).catch(() => {});
        csrf = getCsrfFromCookie();
      }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed');
      } else {
        try { if (data.token) localStorage.setItem('auth_token', data.token); } catch {}
        setSuccess(true);
        setTimeout(() => router.push('/dashboard'), 600);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-16">
      <Card className="w-full max-w-md border-0 shadow-sm ring-1 ring-gray-200/70">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
              <input
                type="text"
                autoComplete="username"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com or yourname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">Login successful. Redirecting...</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
            <div className="text-center text-xs text-gray-500">
              <span className="block mb-2">Or continue with your wallet (optional) from the navigation after signing in.</span>
              <span className="block">Need an account? <a href="/register" className="text-purple-600 hover:underline font-medium">Register</a></span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
