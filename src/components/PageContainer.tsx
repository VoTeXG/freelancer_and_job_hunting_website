'use client';

import { cn } from '@/lib/utils';
import React from 'react';

type Props = React.PropsWithChildren<{
  className?: string;
}>;

export default function PageContainer({ children, className }: Props) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      {children}
    </div>
  );
}
