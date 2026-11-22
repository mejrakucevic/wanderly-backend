import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { CreateActivity, UpdateActivity } from '../validators/activity.validator.js';
import type { Page } from '../validators/common.validator.js';
import { requireOwnedLocation, requireOwnedTrip } from './ownership.service.js';

const NOT_FOUND = 'Plan item not found.';

/** Plan items must fall inside the trip; a stay's end date may not pass the trip's last day. */
function checkWithinTrip(trip: { start_date: string; end_date: string }, start: string, end: string | null | undefined) {
  if (start < trip.start_date || start > trip.end_date) throw new ApiError(400, 'The date must be within the trip dates.');
  if (end && end < start) throw new ApiError(400, 'The end date cannot be before the start date.');
  if (end && end > trip.end_date) throw new ApiError(400, 'The end date must be within the trip dates.');
}

export async function listActivities(db: Db, userId: string, { limit, offset }: Page, tripId?: string) {
  let query = db.from('trip_activities').select('*').eq('user_id', userId);
  if (tripId) query = query.eq('trip_id', tripId);
  const { data, error } = await query.order('activity_date').order('start_time', { nullsFirst: true }).order('sort_order').order('id')
    .range(offset, offset + limit - 1);
  throwIfDbError(error);
  return data;
}

export async function getActivity(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('trip_activities').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function createActivity(db: Db, userId: string, input: CreateActivity) {
  const trip = await requireOwnedTrip(db, userId, input.trip_id);
  checkWithinTrip(trip, input.activity_date, input.end_date);
  if (input.location_id) await requireOwnedLocation(db, userId, input.location_id);
  // ai_generated is never accepted from clients; only a future server-side AI endpoint may set it.
  const { data, error } = await db.from('trip_activities').insert({ ...input, user_id: userId, ai_generated: false }).select().single();
  throwIfDbError(error);
  return data;
}

export async function updateActivity(db: Db, userId: string, id: string, input: UpdateActivity) {
  const existing = await db.from('trip_activities').select('trip_id,activity_date,end_date').eq('id', id).eq('user_id', userId).maybeSingle();
  throwIfDbError(existing.error);
  if (!existing.data) throw new ApiError(404, NOT_FOUND);
  if (input.activity_date !== undefined || input.end_date !== undefined) {
    const trip = await requireOwnedTrip(db, userId, existing.data.trip_id);
    const end = input.end_date !== undefined ? input.end_date : existing.data.end_date;
    checkWithinTrip(trip, input.activity_date ?? existing.data.activity_date, end);
  }
  if (input.location_id) await requireOwnedLocation(db, userId, input.location_id);
  const { data, error } = await db.from('trip_activities').update(input).eq('id', id).eq('user_id', userId).select().maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
  return data;
}

export async function deleteActivity(db: Db, userId: string, id: string) {
  const { data, error } = await db.from('trip_activities').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, NOT_FOUND);
}
