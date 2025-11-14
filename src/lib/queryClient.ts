"use client";
import { QueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';

// Create a default queryClient with tuned defaults for UX and perf
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default: keep data fresh-ish and avoid refetch-on-window-focus noise
        staleTime: 60_000, // 1 min
        gcTime: 5 * 60_000, // 5 min
        retry: (failureCount, error: any) => {
          // Don't retry 4xx except 429; retry network/5xx twice
          const msg = String(error?.message || '');
          if (/4\d\d/.test(msg) && !/429/.test(msg)) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Helper hook to route API errors consistently to toast vs global banner
export function useApiErrorHandlers() {
  const { push } = useToast();
  const { showError } = useGlobalError();

  function toastError(message: string, title = 'Request failed') {
    push({ variant: 'error', title, message });
  }

  function toastSuccess(message: string, title = 'Success') {
    push({ variant: 'success', title, message });
  }

  function toastInfo(message: string, title = 'Notice') {
    push({ variant: 'info', title, message });
  }

  function bannerError(message: string, title = 'Something went wrong') {
    showError({ variant: 'error', title, message, autoHideMs: 8000 });
  }

  return { toastError, toastSuccess, toastInfo, bannerError };
}
