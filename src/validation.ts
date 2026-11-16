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
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
