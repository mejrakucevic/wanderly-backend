import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { Page } from '../validators/common.validator.js';
import type { CreateTrip, UpdateTrip } from '../validators/trip.validator.js';

const NOT_FOUND = 'Trip not found.';

function checkDateOrder(start: string, end: string) {
  if (end < start) throw new ApiError(400, 'The end date cannot be before the start date.');
}

export async function listTrips(db: Db, userId: string, { limit, offset }: Page) {
  const { data, error } = await db.from('trips').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1);
  throwIfDbError(error);
  return data;
}

export async function getTrip(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('trips').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function createTrip(db: Db, userId: string, input: CreateTrip) {
  checkDateOrder(input.start_date, input.end_date);
  const { data, error } = await db.from('trips').insert({ ...input, user_id: userId }).select().single();
  throwIfDbError(error);
  return data;
}

export async function updateTrip(db: Db, userId: string, id: string, input: UpdateTrip) {
  const existing = await db.from('trips').select('start_date,end_date').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(existing.error);
  if (!existing.data) throw new ApiError(404, NOT_FOUND);
  checkDateOrder(input.start_date ?? existing.data.start_date, input.end_date ?? existing.data.end_date);
  const { data, error } = await db.from('trips').update(input).eq('id', id).eq('user_id', userId).select().maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function deleteTrip(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('trips').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
}
