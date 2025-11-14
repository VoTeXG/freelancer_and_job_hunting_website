'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({ value, duration = 800, prefix = '', suffix = '', className }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const start = useRef<number>(0);
  const from = useRef<number>(0);
  const to = useRef<number>(value);

  useEffect(() => {
    from.current = display;
    to.current = value;
    start.current = performance.now();

    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start.current) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from.current + (to.current - from.current) * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{prefix}{display.toLocaleString()}{suffix}</span>;
}
