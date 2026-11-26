import type { NextFunction, Request } from 'express';
import type { AuthResponse, CreateDb } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';

/** Checks the Bearer token with Supabase and stores the verified user for the controllers. */
export function requireAuth(createDb: CreateDb) {
  return async (req: Request, res: AuthResponse, next: NextFunction) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    if (!match) throw new ApiError(401, 'Sign in to access this resource.');
    const token = match[1];
    const db = createDb(token);
    const { data, error } = await db.auth.getUser(token);
    if (error && (!error.status || error.status >= 500 || error.status === 429)) {
      throw new ApiError(503, 'Authentication is temporarily unavailable.');
    }
    if (error || !data.user) throw new ApiError(401, 'Your session is invalid or expired. Please sign in again.');
    res.locals.user = data.user;
    res.locals.db = db;
    res.locals.token = token;
    next();
  };
}
