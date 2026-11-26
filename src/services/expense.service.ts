import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { Page } from '../validators/common.validator.js';
import type { CreateExpense, UpdateExpense } from '../validators/expense.validator.js';
import { requireOwnedTrip } from './ownership.service.js';

const NOT_FOUND = 'Expense not found.';

export async function listExpenses(db: Db, userId: string, { limit, offset }: Page, tripId?: string) {
  let query = db.from('expenses').select('*').eq('user_id', userId);
  if (tripId) query = query.eq('trip_id', tripId);
  const { data, error } = await query.order('expense_date', { ascending: false }).order('created_at', { ascending: false }).order('id')
    .range(offset, offset + limit - 1);
  throwIfDbError(error);
  return data;
}

export async function getExpense(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('expenses').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function createExpense(db: Db, userId: string, input: CreateExpense) {
  await requireOwnedTrip(db, userId, input.trip_id);
  const { data, error } = await db.from('expenses').insert({ ...input, user_id: userId }).select().single();
  throwIfDbError(error);
  return data;
}

export async function updateExpense(db: Db, userId: string, id: string, input: UpdateExpense) {
  const { data, error } = await db.from('expenses').update(input).eq('id', id).eq('user_id', userId).select().maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function deleteExpense(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('expenses').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
}
