import { z } from 'zod';
import { date, NOT_EMPTY_MESSAGE, notEmpty } from './common.validator.js';

// One row per country per user: either already visited, or on the wishlist.
const status = z.enum(['visited', 'wishlist']);
export const createCountry = z.strictObject({
  country_code: z.string().regex(/^[A-Z]{2}$/, 'Use a 2-letter ISO country code, e.g. BA.'),
  status,
  visited_at: date.nullable().optional(),
});
export const updateCountry = z.strictObject({
  status: status.optional(),
  visited_at: date.nullable().optional(),
}).refine(notEmpty, NOT_EMPTY_MESSAGE);
export type CreateCountry = z.infer<typeof createCountry>;
export type UpdateCountry = z.infer<typeof updateCountry>;
