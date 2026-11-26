import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const register = z.strictObject({ email, password: z.string().min(8).max(72) });
export const login = z.strictObject({ email, password: z.string().min(1).max(72) });
export type Credentials = z.infer<typeof login>;
