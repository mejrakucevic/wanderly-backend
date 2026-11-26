import { z } from 'zod';
import { NOT_EMPTY_MESSAGE, notEmpty } from './common.validator.js';

export const updateProfile = z.strictObject({
  username: z.string().trim().regex(/^[A-Za-z0-9_]{3,30}$/, 'Use 3-30 letters, numbers or underscores.').nullable().optional(),
  full_name: z.string().trim().max(150).nullable().optional(),
  avatar_path: z.string().max(1024).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
}).refine(notEmpty, NOT_EMPTY_MESSAGE);
export type UpdateProfile = z.infer<typeof updateProfile>;
