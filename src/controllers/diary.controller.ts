import type { Request } from 'express';
import * as diaryService from '../services/diary.service.js';
import type { AuthResponse } from '../types/api.js';
import { pagination, tripFilter, uuid } from '../validators/common.validator.js';
import { createDiary, updateDiary } from '../validators/diary.validator.js';

export async function list(req: Request, res: AuthResponse) {
  const page = pagination.parse(req.query);
  const { trip_id } = tripFilter.parse(req.query);
  res.json(await diaryService.listEntries(res.locals.db, res.locals.user.id, page, trip_id));
}

export async function getOne(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  res.json(await diaryService.getEntry(res.locals.db, res.locals.user.id, id));
}

export async function create(req: Request, res: AuthResponse) {
  const input = createDiary.parse(req.body);
  res.status(201).json(await diaryService.createEntry(res.locals.db, res.locals.user.id, input));
}

export async function update(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  const input = updateDiary.parse(req.body);
  res.json(await diaryService.updateEntry(res.locals.db, res.locals.user.id, id, input));
}

export async function remove(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  await diaryService.deleteEntry(res.locals.db, res.locals.user.id, id);
  res.sendStatus(204);
}
