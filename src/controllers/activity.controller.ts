import type { Request } from 'express';
import * as activityService from '../services/activity.service.js';
import type { AuthResponse } from '../types/api.js';
import { createActivity, updateActivity } from '../validators/activity.validator.js';
import { pagination, tripFilter, uuid } from '../validators/common.validator.js';

export async function list(req: Request, res: AuthResponse) {
  const page = pagination.parse(req.query);
  const { trip_id } = tripFilter.parse(req.query);
  res.json(await activityService.listActivities(res.locals.db, res.locals.user.id, page, trip_id));
}

export async function getOne(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  res.json(await activityService.getActivity(res.locals.db, res.locals.user.id, id));
}

export async function create(req: Request, res: AuthResponse) {
  const input = createActivity.parse(req.body);
  res.status(201).json(await activityService.createActivity(res.locals.db, res.locals.user.id, input));
}

export async function update(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  const input = updateActivity.parse(req.body);
  res.json(await activityService.updateActivity(res.locals.db, res.locals.user.id, id, input));
}

export async function remove(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  await activityService.deleteActivity(res.locals.db, res.locals.user.id, id);
  res.sendStatus(204);
}
