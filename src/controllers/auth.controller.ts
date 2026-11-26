import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthResponse, CreateDb } from '../types/api.js';
import * as validator from '../validators/auth.validator.js';

export function createAuthController(createDb: CreateDb) {
  return {
    async register(req: Request, res: Response) {
      const credentials = validator.register.parse(req.body);
      res.status(201).json(await authService.register(createDb(), credentials));
    },
    async login(req: Request, res: Response) {
      const credentials = validator.login.parse(req.body);
      res.json(await authService.login(createDb(), credentials));
    },
    async logout(_req: Request, res: AuthResponse) {
      await authService.logout(res.locals.db, res.locals.token);
      res.sendStatus(204);
    },
    me(_req: Request, res: AuthResponse) {
      res.json({ id: res.locals.user.id, email: res.locals.user.email });
    },
  };
}
