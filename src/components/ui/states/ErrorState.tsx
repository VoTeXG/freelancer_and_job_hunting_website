"use client";
import React from 'react';
import { Button } from "@/components/ui/Button";
import { LazyIcon } from "@/components/ui/LazyIcon";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong",
  onRetry,
}) => {
  return (
    <div role="alert" className="text-center py-12">
      <LazyIcon name="ExclamationTriangleIcon" className="mx-auto h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-red-700 mb-2">{message}</h3>
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
};

export default ErrorState;
