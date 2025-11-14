"use client";
import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  rounded = "xl",
  ...props
}) => {
  const radius = rounded === "none" ? "rounded-none" : rounded === "full" ? "rounded-full" : `rounded-${rounded}`;
  return (
    <div
      className={clsx("skeleton-shimmer bg-[var(--surface-muted)]", radius, className)}
      aria-hidden
      {...props}
    />
  );
};

export default Skeleton;
