"use client";
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const inputStyles = cva(
  'block w-full rounded-xl border bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-brand)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
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

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputStyles> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  errorText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, uiSize, intent, leadingIcon, trailingIcon, errorText, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const describedBy = clsx(ariaDescribedBy, errorText && id ? `${id}-error` : undefined);
    return (
      <div className="relative">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(inputStyles({ uiSize, intent }), leadingIcon && 'pl-10', trailingIcon && 'pr-10', className)}
          aria-invalid={intent === 'error' || undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {trailingIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
            {trailingIcon}
          </div>
        )}
        {errorText && id && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export default Input;
