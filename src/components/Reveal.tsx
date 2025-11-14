'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: any;
  delay?: number; // ms
}

export default function Reveal({ as = 'div', delay = 0, className, children, ...rest }: RevealProps) {
  const Comp: any = as;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current as Element | null;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (delay) {
              const t = setTimeout(() => setVisible(true), delay);
              // no cleanup needed for once-only reveal
              return () => clearTimeout(t);
            } else {
              setVisible(true);
            }
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <Comp
      ref={ref as any}
      className={cn('opacity-0 translate-y-2 will-change-[opacity,transform]', visible && 'opacity-100 translate-y-0 transition duration-500 ease-out', className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
