'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  className?: string;
  center?: boolean;
};

export default function SectionHeader({ title, subtitle, className, center }: Props) {
  return (
    <div className={cn('mb-8', className, center && 'text-center')}
      >
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
  );
}
