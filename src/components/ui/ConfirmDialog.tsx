'use client';

import Modal from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'destructive' | 'outline';
}

export default function ConfirmDialog({
  isOpen,
  title = 'Please confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'destructive',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="space-y-6">
        <p className="text-gray-700 text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button variant={confirmVariant as any} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
