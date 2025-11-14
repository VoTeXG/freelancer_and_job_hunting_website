'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  className?: string;
  center?: boolean;
  actions?: React.ReactNode;
  status?: string;
};

export default function SectionHeader({ title, subtitle, className, center, actions, status }: Props) {
  return (
    <div className={cn('mb-8', className)}>
      <div className={cn('flex items-start justify-between gap-4', center && 'flex-col items-center')}>
        <div className={cn(center ? 'text-center' : 'text-left') }>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          <div className={cn('h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full', center && 'mx-auto')} />
          {subtitle && (
            <p className={cn('text-lg text-gray-600 mt-3', center && 'mx-auto max-w-2xl')}>
              {subtitle}
            </p>
          )}
        </div>
        {/* Actions area (optional) - hidden on small screens */}
        {actions && (
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">{actions}</div>
            {status && <div className="text-sm text-gray-500">{status}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
