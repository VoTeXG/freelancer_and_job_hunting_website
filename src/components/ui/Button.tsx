import React, { forwardRef, isValidElement, cloneElement } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-brand)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] will-change-transform',
  {
    variants: {
      variant: {
        default: 'bg-[var(--brand-600)] text-white hover:bg-[color:var(--brand-700)]',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-[var(--border-primary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
        secondary: 'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-primary)]',
        ghost: 'hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
        link: 'underline-offset-4 hover:underline text-[var(--brand-700)]',
        gradient: 'text-white shadow-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
        soft: 'bg-[var(--surface-elevated)]/60 text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, children, onClick, disabled, type, loading = false, loadingText, ...rest },
  ref
): React.ReactElement | null {
    const classes = cn(buttonVariants({ variant, size, className }));
    const isDisabled = disabled || loading;

    if (asChild && isValidElement(children)) {
      const child: any = children;
      const mergedClassName = cn(classes, child.props?.className);

      // Compose onClick to respect disabled on non-button elements
      const childOnClick = child.props?.onClick;
      const composedOnClick = (e: React.MouseEvent<any>) => {
        if (isDisabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (typeof onClick === 'function') onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        if (typeof childOnClick === 'function') childOnClick(e);
      };

      const cloned = cloneElement(child, {
        className: mergedClassName,
        // Accessibility semantics for anchors or other elements when "disabled"
        'aria-disabled': isDisabled || undefined,
        'aria-busy': loading || undefined,
        'data-loading': loading || undefined,
        tabIndex: isDisabled ? -1 : child.props?.tabIndex,
        onClick: composedOnClick,
        // Avoid passing button-only props like type to non-button elements
        ...rest,
      });
  return cloned as React.ReactElement;
    }

    // Default: render a native button
    return (
      <button
        className={classes}
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        onClick={onClick}
        {...rest}
      >
        {loading && (
          <span
            className={cn(
              'mr-2 inline-block h-4 w-4 rounded-full border-2 animate-spin',
              // Token-aware spinner colors by variant for contrast
              variant === 'default' || variant === undefined
                ? 'border-white/80 border-t-transparent'
                : variant === 'destructive'
                ? 'border-white/80 border-t-transparent'
                : variant === 'outline' || variant === 'ghost'
                ? 'border-[var(--text-muted)]/60 border-t-transparent'
                : variant === 'secondary'
                ? 'border-[var(--text-primary)]/70 border-t-transparent'
                : 'border-white/80 border-t-transparent'
            )}
            aria-hidden="true"
          />
        )}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
