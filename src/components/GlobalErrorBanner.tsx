"use client";
import React from 'react';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { LazyIcon } from '@/components/ui/LazyIcon';

export default function GlobalErrorBanner() {
  const { error, clearError } = useGlobalError();
  if (!error) return null;

  const variant = error.variant || 'error';
  const styles = {
    error: 'bg-red-50 text-red-800 ring-red-200',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    info: 'bg-blue-50 text-blue-800 ring-blue-200',
    success: 'bg-green-50 text-green-800 ring-green-200',
  } as const;
  const icons = {
    error: 'ExclamationTriangleIcon',
    warning: 'ExclamationCircleIcon',
    info: 'InformationCircleIcon',
    success: 'CheckCircleIcon',
  } as const;

  return (
    <div className={`sticky top-0 z-50 w-full ring-1 ${styles[variant]}`} role="alert" aria-live="polite">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-start gap-3">
        <LazyIcon name={icons[variant]} className="h-5 w-5 mt-0.5" />
        <div className="flex-1">
          {error.title && <div className="font-medium">{error.title}</div>}
          <div className="text-sm opacity-90">{error.message}</div>
          {error.actionLabel && error.onAction && (
            <button
              className="mt-1 inline-flex text-sm underline decoration-1 underline-offset-2"
              onClick={error.onAction}
            >
              {error.actionLabel}
            </button>
          )}
        </div>
        <button
          aria-label="Dismiss"
          onClick={clearError}
          className="ml-2 text-current/70 hover:text-current"
        >
          ×
        </button>
      </div>
    </div>
  );
}
