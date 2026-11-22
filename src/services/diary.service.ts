import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { Page } from '../validators/common.validator.js';
import type { CreateDiary, UpdateDiary } from '../validators/diary.validator.js';
import { requireOwnedLocation, requireOwnedTrip } from './ownership.service.js';

const NOT_FOUND = 'Diary entry not found.';

export async function listEntries(db: Db, userId: string, { limit, offset }: Page, tripId?: string) {
  let query = db.from('diary_entries').select('*').eq('user_id', userId);
  if (tripId) query = query.eq('trip_id', tripId);
  const { data, error } = await query.order('entry_date', { ascending: false }).order('id').range(offset, offset + limit - 1);
  throwIfDbError(error);
  return data;
}

export async function getEntry(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('diary_entries').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function createEntry(db: Db, userId: string, input: CreateDiary) {
  await requireOwnedTrip(db, userId, input.trip_id);
  if (input.location_id) await requireOwnedLocation(db, userId, input.location_id);
  const { data, error } = await db.from('diary_entries').insert({ ...input, user_id: userId }).select().single();
  throwIfDbError(error);
  return data;
}

export async function updateEntry(db: Db, userId: string, id: string, input: UpdateDiary) {
  if (input.trip_id) await requireOwnedTrip(db, userId, input.trip_id);
  if (input.location_id) await requireOwnedLocation(db, userId, input.location_id);
  const { data, error } = await db.from('diary_entries').update(input).eq('id', id).eq('user_id', userId).select().maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function deleteEntry(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('diary_entries').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
}
