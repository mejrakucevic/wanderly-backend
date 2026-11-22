import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

/**
 * Creates a separate client for each request. With a user's token, Supabase applies
 * that user's RLS policies. Without one, it is used only for register and login.
 */
export function createSupabaseClient(url: string, key: string, token?: string) {
  return createClient<Database>(url, key, {
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
