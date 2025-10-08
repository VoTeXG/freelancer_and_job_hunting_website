"use client";
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
  dismissible?: boolean;
  duration?: number; // ms
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push: ToastContextValue['push'] = useCallback((t) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const item: ToastItem = { id, createdAt: Date.now(), duration: 5000, dismissible: true, ...( { variant: 'info' } ), ...t } as ToastItem;
    setToasts(prev => [item, ...prev]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => dismiss(id), item.duration);
    }
    return id;
  }, [dismiss]);

  const clear = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, clear }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastViewport({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string)=>void }) {
  return (
    <div aria-live="assertive" className="fixed z-50 top-4 right-4 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={`rounded shadow-lg border text-sm overflow-hidden animate-slide-in bg-white border-gray-200 ${variantRing(t.variant)}`}> 
          <div className="p-3 flex items-start gap-3">
            <div className="pt-0.5 text-lg">{variantIcon(t.variant)}</div>
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-medium text-gray-900 leading-tight">{t.title}</p>}
              <p className="text-gray-700 mt-0.5 break-words">{t.message}</p>
              {t.actionLabel && t.onAction && (
                <button onClick={() => { t.onAction?.(); dismiss(t.id); }} className="mt-2 text-xs font-medium text-purple-600 hover:underline">
                  {t.actionLabel}
                </button>
              )}
            </div>
            {t.dismissible && (
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                ×
              </button>
            )}
          </div>
          <div className="h-1 bg-gray-100 relative">
            {t.duration && t.duration > 0 && <div className="absolute left-0 top-0 h-full bg-purple-500 animate-toast-bar" style={{ animationDuration: `${t.duration}ms` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function variantIcon(v: ToastVariant) {
  switch (v) {
    case 'success': return '✅';
    case 'error': return '⛔';
    case 'warning': return '⚠️';
    default: return 'ℹ️';
  }
}
function variantRing(v: ToastVariant) {
  switch (v) {
    case 'success': return 'border-green-300';
    case 'error': return 'border-red-300';
    case 'warning': return 'border-amber-300';
    default: return 'border-blue-300';
  }
}

// Tailwind animations (expect global CSS additions)
