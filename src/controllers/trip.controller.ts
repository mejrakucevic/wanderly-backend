import type { Request } from 'express';
import * as tripService from '../services/trip.service.js';
import type { AuthResponse } from '../types/api.js';
import { pagination, uuid } from '../validators/common.validator.js';
import { createTrip, updateTrip } from '../validators/trip.validator.js';

export async function list(req: Request, res: AuthResponse) {
  const page = pagination.parse(req.query);
  res.json(await tripService.listTrips(res.locals.db, res.locals.user.id, page));
}

export async function getOne(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  res.json(await tripService.getTrip(res.locals.db, res.locals.user.id, id));
}

export async function create(req: Request, res: AuthResponse) {
  const input = createTrip.parse(req.body);
  res.status(201).json(await tripService.createTrip(res.locals.db, res.locals.user.id, input));
}

export async function update(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  const input = updateTrip.parse(req.body);
  res.json(await tripService.updateTrip(res.locals.db, res.locals.user.id, id, input));
}

export async function remove(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  await tripService.deleteTrip(res.locals.db, res.locals.user.id, id);
  res.sendStatus(204);
}
