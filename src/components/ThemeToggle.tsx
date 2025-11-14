'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    // Load initial from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const isDark = saved ? saved === 'dark' : false;
    setDark(isDark);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="inline-block h-4 w-4 rounded-full"
            style={{ background: dark ? 'var(--brand-600)' : 'var(--accent-teal)' }} />
      <span>{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
