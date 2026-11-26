import type { Request } from 'express';
import * as profileService from '../services/profile.service.js';
import type { AuthResponse } from '../types/api.js';
import { updateProfile } from '../validators/profile.validator.js';

export async function get(_req: Request, res: AuthResponse) {
  res.json(await profileService.getProfile(res.locals.db, res.locals.user.id));
}

export async function update(req: Request, res: AuthResponse) {
  const input = updateProfile.parse(req.body);
  res.json(await profileService.updateProfile(res.locals.db, res.locals.user.id, input));
}
