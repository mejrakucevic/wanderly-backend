import type { Db } from '../types/api.js';
import { throwIfDbError } from '../utils/database-error.js';
import type { UpdateProfile } from '../validators/profile.validator.js';

export async function getProfile(db: Db, userId: string) {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function updateProfile(db: Db, userId: string, input: UpdateProfile) {
  const { data, error } = await db.from('profiles').upsert({ ...input, id: userId }, { onConflict: 'id' }).select().single();
  throwIfDbError(error);
  return data;
}
