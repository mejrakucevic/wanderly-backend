import type { Db } from '../types/api.js';
import { ApiError } from '../utils/api-error.js';
import { throwIfDbError } from '../utils/database-error.js';

/** Authorization check: the linked trip must belong to this user. Returns its dates. */
export async function requireOwnedTrip(db: Db, userId: string, tripId: string) {
  const { data, error } = await db.from('trips').select('id,start_date,end_date').eq('id', tripId).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, 'The linked trip was not found.');
  return data;
}

/** Authorization check: the linked location must belong to this user. */
export async function requireOwnedLocation(db: Db, userId: string, locationId: string) {
  const { data, error } = await db.from('locations').select('id').eq('id', locationId).eq('user_id', userId).maybeSingle();
  throwIfDbError(error);
  if (!data) throw new ApiError(404, 'The linked location was not found.');
}
