import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import type { Credentials } from '../validators/auth.validator.js';

const publicUser = (user: User) => ({ id: user.id, email: user.email });
const publicSession = (session: Session) => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  token_type: session.token_type,
  expires_at: session.expires_at,
});

/** Translates Supabase Auth errors into safe HTTP errors. */
function toApiError(error: AuthError) {
  if (error.code === 'invalid_credentials') return new ApiError(401, 'Invalid email or password.');
  if (error.code === 'email_not_confirmed') return new ApiError(403, 'Confirm your email before signing in.');
  if (error.code === 'user_already_exists' || error.code === 'email_exists') return new ApiError(409, 'An account with this email already exists.');
  if (error.code === 'weak_password') return new ApiError(400, 'Choose a stronger password.');
  if (error.status === 429) return new ApiError(429, 'Too many attempts. Please try again later.');
  if (!error.status || error.status >= 500) return new ApiError(503, 'Authentication is temporarily unavailable.');
  return new ApiError(400, 'The email or password was rejected.');
}

export async function register(db: Db, credentials: Credentials) {
  const { data, error } = await db.auth.signUp(credentials);
  if (error) throw toApiError(error);
  if (!data.user) throw new ApiError(503, 'Authentication is temporarily unavailable.');
  // The session is null when Supabase requires email confirmation first.
  return { user: publicUser(data.user), session: data.session ? publicSession(data.session) : null };
}

export async function login(db: Db, credentials: Credentials) {
  const { data, error } = await db.auth.signInWithPassword(credentials);
  if (error) throw toApiError(error);
  return { user: publicUser(data.user), session: publicSession(data.session) };
}

/** Ends this session in Supabase, so its refresh token can no longer be used. */
export async function logout(db: Db, token: string) {
  const { error } = await db.auth.admin.signOut(token, 'local');
  // 401, 403 and 404 mean the session has already ended, which is the goal of logout.
  if (error && ![401, 403, 404].includes(error.status ?? 0)) throw toApiError(error);
}
