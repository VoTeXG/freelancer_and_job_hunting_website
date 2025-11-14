"use client";
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

// Standard optimistic update patterns for jobs and applications

export function optimisticApplyToJob(queryClient: QueryClient, params: { jobId: string }) {
  // Increment applications count in jobs list and mark as applied flag in any local list shape
  const listKeyPrefix = queryKeys.jobs.list();
  const detailKey = queryKeys.jobs.detail(params.jobId);

  const previousLists: Array<{ key: readonly unknown[]; data: any }> = [];
  // Optimistically update all lists with applications counter if shape matches
  queryClient.getQueryCache().findAll({ predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === listKeyPrefix[0] }).forEach(q => {
    const key = q.queryKey as readonly unknown[];
    const data: any = queryClient.getQueryData(key);
    if (data && Array.isArray(data.jobs)) {
      previousLists.push({ key, data });
      queryClient.setQueryData(key, {
        ...data,
        jobs: data.jobs.map((j: any) => j.id === params.jobId ? { ...j, _count: { applications: (j._count?.applications ?? (j.applicants?.length ?? 0)) + 1 } } : j),
      });
    }
  });

  const previousDetail = queryClient.getQueryData(detailKey);
  if (previousDetail && (previousDetail as any)._count) {
    queryClient.setQueryData(detailKey, {
      ...(previousDetail as any),
      _count: { applications: ((previousDetail as any)._count?.applications ?? 0) + 1 },
    });
  }

  // Return rollback function
  return () => {
    previousLists.forEach(({ key, data }) => queryClient.setQueryData(key, data));
    if (previousDetail !== undefined) queryClient.setQueryData(detailKey, previousDetail);
  };
}

export function invalidateAfterApply(queryClient: QueryClient, params: { jobId: string }) {
  // Invalidate affected queries to re-sync authoritative data
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list(), exact: false });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(params.jobId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.applications(params.jobId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.applications.byJob(params.jobId), exact: false });
}
