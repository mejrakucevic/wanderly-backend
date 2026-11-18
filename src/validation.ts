import { z } from 'zod';

export const uuid = z.uuid();
const title = z.string().trim().min(1).max(150);
const date = z.iso.date();
const tripFields = {
  title,
  destination: z.string().trim().min(1).max(200),
  start_date: date,
  end_date: date,
  description: z.string().max(10000).nullable().optional(),
  cover_image_path: z.string().max(1024).nullable().optional(),
  budget: z.number().finite().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
};
export const createTrip = z.strictObject(tripFields);
export const updateTrip = createTrip.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
const diaryFields = {
  trip_id: uuid,
  location_id: uuid.nullable().optional(),
  title,
  content: z.string().max(50000).optional(),
  entry_date: date.optional(),
};
export const createDiary = z.strictObject(diaryFields);
export const updateDiary = createDiary.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
export const profile = z.strictObject({
  username: z.string().trim().min(1).max(100).nullable().optional(),
  full_name: z.string().trim().max(150).nullable().optional(),
  avatar_path: z.string().max(1024).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
// Trip plan items: stays, transport, activities, food and other bookings.
export const activityCategory = z.enum(['stay', 'transport', 'activity', 'food', 'other']);
const activityFields = {
  category: activityCategory,
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
export const updateActivity = z.strictObject(activityFields).partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
export const activityList = z.object({ trip_id: uuid.optional() });

// Trip expenses: money actually spent, in the trip's currency.
export const expenseCategory = z.enum(['food', 'transport', 'stay', 'activities', 'shopping', 'other']);
const expenseFields = {
  title,
  amount: z.number().finite().positive().max(10_000_000),
  category: expenseCategory,
  expense_date: date,
};
export const createExpense = z.strictObject({ trip_id: uuid, ...expenseFields });
// The trip can't change after creation; move an expense by deleting and re-adding it.
export const updateExpense = z.strictObject(expenseFields).partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
export const expenseList = z.object({ trip_id: uuid.optional() });

// One row per country per user: either already visited, or on the wishlist.
export const countryStatus = z.enum(['visited', 'wishlist']);
export const createCountry = z.strictObject({
  country_code: z.string().regex(/^[A-Z]{2}$/, 'Use a 2-letter ISO country code, e.g. BA.'),
  status: countryStatus,
  visited_at: date.nullable().optional(),
});
export const updateCountry = z.strictObject({
  status: countryStatus.optional(),
  visited_at: date.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
