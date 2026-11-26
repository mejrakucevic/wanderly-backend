import { z } from 'zod';
import { date, NOT_EMPTY_MESSAGE, notEmpty, title, uuid } from './common.validator.js';

// Trip plan items: stays, transport, activities, food and other bookings.
const activityFields = {
  category: z.enum(['stay', 'transport', 'activity', 'food', 'other']),
  title,
  description: z.string().max(10000).nullable().optional(),
  activity_date: date,
  end_date: date.nullable().optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM, e.g. 09:30.').nullable().optional(),
  cost: z.number().finite().nonnegative().max(10_000_000).nullable().optional(),
  location_id: uuid.nullable().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
  icon: z.string().regex(/^[a-z-]{1,40}$/).nullable().optional(),
};
export const createActivity = z.strictObject({ trip_id: uuid, ...activityFields });
export const updateActivity = z.strictObject(activityFields).partial().refine(notEmpty, NOT_EMPTY_MESSAGE);
export type CreateActivity = z.infer<typeof createActivity>;
export type UpdateActivity = z.infer<typeof updateActivity>;
