'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

/**
 * PageTransition
 * Lightweight page mount animation using CSS classes. Respects prefers-reduced-motion.
 * No external dependencies. Triggers on route change via keying by pathname.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter animate-fade-in">
      {children}
    </div>
  );
}
