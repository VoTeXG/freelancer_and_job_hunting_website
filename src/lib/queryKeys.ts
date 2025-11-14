// Centralized React Query keys
// Keep keys stable and typed to avoid typos across the app

export const queryKeys = {
  jobs: {
    root: ['jobs'] as const,
    list: (params?: Record<string, unknown>) => ['jobs', 'list', params ?? {}] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    applications: (id: string) => ['jobs', 'applications', id] as const,
  },
  applications: {
    root: ['applications'] as const,
    byUser: (userId: string) => ['applications', 'user', userId] as const,
    byJob: (jobId: string) => ['applications', 'job', jobId] as const,
  },
  freelancers: {
    root: ['freelancers'] as const,
    list: (params?: Record<string, unknown>) => ['freelancers', 'list', params ?? {}] as const,
    detail: (id: string) => ['freelancers', 'detail', id] as const,
  },
  profile: {
    self: ['profile', 'self'] as const,
    byId: (id: string) => ['profile', 'detail', id] as const,
  },
} as const;

export type QueryKey =
  | ReturnType<typeof queryKeys.jobs.list>
  | ReturnType<typeof queryKeys.jobs.detail>
  | ReturnType<typeof queryKeys.jobs.applications>
  | ReturnType<typeof queryKeys.applications.byUser>
  | ReturnType<typeof queryKeys.applications.byJob>
  | ReturnType<typeof queryKeys.freelancers.list>
  | ReturnType<typeof queryKeys.freelancers.detail>
  | typeof queryKeys.profile.self
  | ReturnType<typeof queryKeys.profile.byId>;
