import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.js';

export function createUserClient(url: string, key: string, token: string) {
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
