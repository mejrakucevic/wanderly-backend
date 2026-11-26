import { z } from 'zod';

export const uuid = z.uuid();
export const title = z.string().trim().min(1).max(150);
export const date = z.iso.date();
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const tripFilter = z.object({ trip_id: uuid.optional() });
export const notEmpty = (value: object) => Object.keys(value).length > 0;
export const NOT_EMPTY_MESSAGE = 'Provide at least one field.';
export type Page = z.infer<typeof pagination>;
