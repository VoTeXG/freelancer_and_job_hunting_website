"use client";
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const selectStyles = cva(
  'block w-full rounded-xl border bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-brand)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      uiSize: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-3.5 py-2.5 text-sm',
        lg: 'px-4 py-3 text-base',
      },
      intent: {
        default: 'border-[var(--border-primary)]',
        error: 'border-red-300 focus:ring-red-500',
        success: 'border-green-300',
      },
    },
    defaultVariants: { uiSize: 'md', intent: 'default' },
  }
);

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectStyles> {
  errorText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, uiSize, intent, errorText, id, 'aria-describedby': ariaDescribedBy, children, ...props }, ref) => {
    const describedBy = [ariaDescribedBy, errorText && id ? `${id}-error` : undefined].filter(Boolean).join(' ');
    return (
      <div>
        <select
          ref={ref}
          id={id}
          className={clsx(selectStyles({ uiSize, intent }), className)}
          aria-invalid={intent === 'error' || undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        >
          {children}
        </select>
        {errorText && id && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Select;
