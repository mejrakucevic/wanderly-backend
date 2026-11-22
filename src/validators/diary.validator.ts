import { z } from 'zod';
import { date, NOT_EMPTY_MESSAGE, notEmpty, title, uuid } from './common.validator.js';

export const createDiary = z.strictObject({
  trip_id: uuid,
  location_id: uuid.nullable().optional(),
  title,
  content: z.string().max(50000).optional(),
  entry_date: date.optional(),
});
export const updateDiary = createDiary.partial().refine(notEmpty, NOT_EMPTY_MESSAGE);
export type CreateDiary = z.infer<typeof createDiary>;
export type UpdateDiary = z.infer<typeof updateDiary>;
