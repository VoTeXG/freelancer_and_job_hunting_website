"use client";
import React from 'react';
import { Skeleton } from './Skeleton';

export function CardSkeleton({ className = "h-64 rounded-2xl" }: { className?: string }) {
  return <Skeleton className={className} />;
}

export function LineSkeleton({ width = "100%", className = "h-4 rounded" }: { width?: string; className?: string }) {
  return <Skeleton className={className} style={{ width }} />;
}

export function ListSkeleton({ count = 5, itemClassName = "h-6 rounded" }: { count?: number; itemClassName?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}
