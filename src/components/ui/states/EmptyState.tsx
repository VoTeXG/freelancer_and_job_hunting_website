"use client";
import React from 'react';
import { Button } from "@/components/ui/Button";
import { LazyIcon } from "@/components/ui/LazyIcon";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string; // Heroicon name used by LazyIcon
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = "InformationCircleIcon",
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-12">
      <LazyIcon name={icon} className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
