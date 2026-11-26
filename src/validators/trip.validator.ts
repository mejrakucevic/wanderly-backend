import { z } from 'zod';
import { date, NOT_EMPTY_MESSAGE, notEmpty, title } from './common.validator.js';

export const createTrip = z.strictObject({
  title,
  destination: z.string().trim().min(1).max(200),
  start_date: date,
  end_date: date,
  description: z.string().max(10000).nullable().optional(),
  cover_image_path: z.string().max(1024).nullable().optional(),
  budget: z.number().finite().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});
export const updateTrip = createTrip.partial().refine(notEmpty, NOT_EMPTY_MESSAGE);
export type CreateTrip = z.infer<typeof createTrip>;
export type UpdateTrip = z.infer<typeof updateTrip>;
