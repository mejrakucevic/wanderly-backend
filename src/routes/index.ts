import { Router, type RequestHandler } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { CreateDb } from '../types/api.js';
import activityRoutes from './activity.routes.js';
import { authRoutes } from './auth.routes.js';
import countryRoutes from './country.routes.js';
import diaryRoutes from './diary.routes.js';
import expenseRoutes from './expense.routes.js';
import profileRoutes from './profile.routes.js';
import tripRoutes from './trip.routes.js';

/** Connects all /api routes. Everything after requireAuth needs a valid token. */
export function apiRoutes(createDb: CreateDb) {
  const authenticate = requireAuth(createDb) as unknown as RequestHandler;
  const router = Router();

  router.use('/auth', authRoutes(createDb, authenticate));

  router.use(authenticate);
  router.get('/me', createAuthController(createDb).me);
  router.use('/trips', tripRoutes);
  router.use('/diary-entries', diaryRoutes);
  router.use('/activities', activityRoutes);
  router.use('/expenses', expenseRoutes);
  router.use('/countries', countryRoutes);
  router.use('/profile', profileRoutes);
  return router;
}
