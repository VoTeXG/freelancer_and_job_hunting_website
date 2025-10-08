import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be at least 16 chars'),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().optional(),
  PLATFORM_FEE_BPS: z.string().regex(/^\d+$/, 'PLATFORM_FEE_BPS must be integer basis points').transform(v => parseInt(v,10)).optional(),
  ADMIN_WALLETS: z.string().optional(),
}).passthrough();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Environment validation failed:', parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid environment variables. See logs for details.');
}

export const env = parsed.data as z.infer<typeof envSchema>;
