import { z } from 'zod';

// Shared schemas for job creation and draft publishing to avoid drift.
export const JobCoreSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  budgetAmount: z.union([z.number(), z.string()]).transform(v => Number(v)),
  budgetType: z.enum(['FIXED','HOURLY','fixed','hourly']).transform(v => v.toString().toUpperCase()),
  currency: z.string().optional(),
  duration: z.string().min(1),
  deadline: z.string().datetime().optional().or(z.string().optional()),
  skills: z.array(z.string()).min(1),
  requirements: z.array(z.string()).optional(),
  useBlockchain: z.boolean().optional()
});

export type JobCoreInput = z.infer<typeof JobCoreSchema>;
