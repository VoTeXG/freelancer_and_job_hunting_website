import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean; // adds focus/hover lift
  hoverable?: boolean;   // subtle hover shadow only
  glass?: boolean;       // translucent panel style
  density?: 'default' | 'compact' | 'spacious';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, hoverable, glass, density = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border shadow-sm transition-all',
        'bg-[var(--surface-primary)] text-[var(--text-primary)] border-[var(--border-primary)]',
        (interactive || hoverable) && 'hover:shadow-md',
        interactive && 'hover:-translate-y-0.5 focus-within:shadow-md focus-within:-translate-y-0.5',
        glass && 'bg-[var(--surface-elevated)]/70 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-elevated)]/60',
        density === 'compact' && 'text-sm',
        density === 'spacious' && 'text-[1.02rem] leading-relaxed',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, density = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // default padding
        density === 'default' && 'p-6 pt-0',
        density === 'compact' && 'p-4 pt-0',
        density === 'spacious' && 'p-8 pt-0',
        className
      )}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
