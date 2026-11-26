import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
});

/** Reads and checks .env values. The server refuses to start with a wrong configuration. */
export function loadEnv() {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    console.error('Invalid backend configuration. Check .env against .env.example.');
    process.exit(1);
  }
  if (env.data.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')) {
    console.error('Use the publishable key; this API does not require an admin key.');
    process.exit(1);
  }
  return {
    supabaseUrl: env.data.SUPABASE_URL,
    supabaseKey: env.data.SUPABASE_PUBLISHABLE_KEY,
    port: env.data.PORT,
    host: env.data.HOST,
    allowedOrigins: env.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  };
}
