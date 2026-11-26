import { Router, type RequestHandler } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import type { CreateDb } from '../types/api.js';

/** Register and login are public; logout needs the signed-in user's token. */
export function authRoutes(createDb: CreateDb, authenticate: RequestHandler) {
  const controller = createAuthController(createDb);
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', authenticate, controller.logout);
  return router;
}
