import { z } from 'zod';
import { createApp } from './app.js';
import { createUserClient } from './supabase.js';

const config = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
}).safeParse(process.env);

if (!config.success) {
  console.error('Invalid backend configuration. Check .env against .env.example.');
  process.exit(1);
}
const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, PORT: port, HOST: host, CORS_ORIGINS: origins } = config.data;
if (key.startsWith('sb_secret_')) {
  console.error('Use the publishable key; this API does not require an admin key.');
  process.exit(1);
}
const app = createApp({
  createClient: (token) => createUserClient(url, key, token),
  allowedOrigins: origins.split(',').map((origin) => origin.trim()).filter(Boolean),
});
const server = app.listen(port, host, () => console.log(`Wanderly API listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
