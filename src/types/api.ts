import type { Response } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.js';

/** Supabase client typed with our database tables. */
export type Db = SupabaseClient<Database>;
/** Creates a Supabase client; with a token, queries run as that user (RLS applies). */
export type CreateDb = (token?: string) => Db;
/** Values the auth middleware stores for the controllers that run after it. */
export type AuthContext = { user: User; db: Db; token: string };
export type AuthResponse = Response<unknown, AuthContext>;
