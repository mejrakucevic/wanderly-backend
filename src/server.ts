import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createSupabaseClient } from './config/supabase.js';

const { supabaseUrl, supabaseKey, port, host, allowedOrigins } = loadEnv();

const app = createApp({
  createClient: (token) => createSupabaseClient(supabaseUrl, supabaseKey, token),
  // The server's own address is allowed too, so Swagger UI at /api-docs can send requests.
  allowedOrigins: [...allowedOrigins, `http://localhost:${port}`, `http://127.0.0.1:${port}`],
});

const server = app.listen(port, host, () => console.log(`Wanderly API listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
