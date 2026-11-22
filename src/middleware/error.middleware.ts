import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Endpoint not found.'));
}

/** Last middleware: turns every error into a JSON response with the right status code. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request.',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
  } else if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
  } else if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON body.' });
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large.' });
  } else {
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
