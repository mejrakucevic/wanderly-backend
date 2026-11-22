import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { CreateCountry, UpdateCountry } from '../validators/country.validator.js';

const NOT_FOUND = 'Country not found in your list.';

export async function listCountries(db: Db, userId: string) {
  const { data, error } = await db.from('user_countries').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id');
  throwIfDbError(error);
  return data;
}

export async function getCountry(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('user_countries').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function createCountry(db: Db, userId: string, input: CreateCountry) {
  const existing = await db.from('user_countries').select('id').eq('user_id', userId).eq('country_code', input.country_code).maybeSingle();
  throwIfDbError(existing.error);
  if (existing.data) throw new ApiError(409, 'This country is already in your list.');
  const visited_at = input.status === 'visited' ? input.visited_at ?? null : null;
  const { data, error } = await db.from('user_countries').insert({ ...input, visited_at, user_id: userId }).select().single();
  throwIfDbError(error);
  return data;
}

export async function updateCountry(db: Db, userId: string, id: string, input: UpdateCountry) {
  // A wishlist country has no visit date.
  const update = input.status === 'wishlist' ? { ...input, visited_at: null } : input;
  const { data, error } = await db.from('user_countries').update(update).eq('id', id).eq('user_id', userId).select().maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function deleteCountry(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('user_countries').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
}
