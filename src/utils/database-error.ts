import type { PostgrestError } from '@supabase/supabase-js';
import { ApiError } from './api-error.js';

/** Translates PostgreSQL error codes into safe HTTP errors, without exposing database details. */
export function throwIfDbError(error: PostgrestError | null) {
  if (!error) return;
  if (error.code === '23505') throw new ApiError(409, 'This record already exists.'); // unique violation
  // Foreign key, check, not-null, and invalid value errors.
  if (['23503', '23514', '23502', '22P02'].includes(error.code)) {
    throw new ApiError(400, 'The record does not satisfy the database rules.');
  }
  if (error.code === '42501') throw new ApiError(403, 'You do not have permission to perform this action.');
  throw new ApiError(502, 'The database request failed.');
}
