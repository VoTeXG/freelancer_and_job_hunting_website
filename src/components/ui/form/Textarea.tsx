"use client";
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const textareaStyles = cva(
  'block w-full rounded-xl border bg-[var(--surface-primary)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-brand)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
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
    defaultVariants: { size: 'md', intent: 'default' },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaStyles> {
  errorText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, intent, errorText, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const describedBy = [ariaDescribedBy, errorText && id ? `${id}-error` : undefined].filter(Boolean).join(' ');
    return (
      <div>
        <textarea
          ref={ref}
          id={id}
          className={clsx(textareaStyles({ size, intent }), className)}
          aria-invalid={intent === 'error' || undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {errorText && id && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export default Textarea;
