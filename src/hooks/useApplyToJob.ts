"use client";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { optimisticApplyToJob, invalidateAfterApply } from '@/lib/mutations';
import { useApiErrorHandlers } from '@/lib/queryClient';
import { apiFetch } from '@/lib/utils';

type ApplyPayload = {
  coverLetter: string;
  proposedRate?: number;
  estimatedDuration: string;
  portfolio?: string;
};

export function useApplyToJob(opts?: {
  onOptimistic?: (jobId: string) => void;
  onRollback?: (jobId: string) => void;
  onSuccess?: (jobId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { toastError, toastSuccess } = useApiErrorHandlers();

  const mutation = useMutation({
    mutationFn: async ({ jobId, payload }: { jobId: string; payload: ApplyPayload }) => {
      // Rely on apiFetch for CSRF and JSON headers + refresh
      const res = await apiFetch<{ success: boolean; id?: string; error?: string }>(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res?.success) throw new Error(res?.error || 'Failed to apply');
      return res;
    },
    onMutate: async ({ jobId }) => {
      // cancel outgoing queries for lists/details that may be affected
      await Promise.all([
        queryClient.cancelQueries(),
      ]);
      const rollback = optimisticApplyToJob(queryClient, { jobId });
      opts?.onOptimistic?.(jobId);
      return { jobId, rollback } as const;
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.rollback) ctx.rollback();
      const message = String(error?.message || 'Failed to apply');
      // Non-blocking: toast by default
      toastError(message, 'Application failed');
      if (_vars?.jobId) opts?.onRollback?.(_vars.jobId);
    },
    onSuccess: (_data, vars) => {
  // Friendly feedback
  toastSuccess('Your application was submitted successfully.', 'Application submitted');
      if (vars?.jobId) opts?.onSuccess?.(vars.jobId);
    },
    onSettled: (_data, _error, vars) => {
      if (vars?.jobId) invalidateAfterApply(queryClient, { jobId: vars.jobId });
    },
  });

  async function applyToJob(jobId: string, payload: ApplyPayload) {
    return mutation.mutateAsync({ jobId, payload });
  }

  return { applyToJob, mutation };
}
