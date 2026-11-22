import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { apiRoutes } from './routes/index.js';
import type { CreateDb } from './types/api.js';

type Options = { createClient: CreateDb; allowedOrigins?: string[] };

/** Builds the Express app: global middleware, then routes, then error handling. */
export function createApp({ createClient, allowedOrigins = [] }: Options) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(corsMiddleware(allowedOrigins));
  app.use(express.json({ limit: '128kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'wanderly-backend' }));
  app.use('/api', apiRoutes(createClient));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
