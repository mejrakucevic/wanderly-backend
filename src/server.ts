import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createSupabaseClient } from './config/supabase.js';

const { supabaseUrl, supabaseKey, port, host, allowedOrigins } = loadEnv();

const app = createApp({
  createClient: (token) => createSupabaseClient(supabaseUrl, supabaseKey, token),
  allowedOrigins,
});

const server = app.listen(port, host, () => console.log(`Wanderly API listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
