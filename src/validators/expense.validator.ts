import { z } from 'zod';
import { date, NOT_EMPTY_MESSAGE, notEmpty, title, uuid } from './common.validator.js';

// Money actually spent, in the trip's currency.
const expenseFields = {
  title,
  amount: z.number().finite().positive().max(10_000_000),
  category: z.enum(['accommodation', 'transport', 'food', 'activities', 'other']),
  expense_date: date,
};
export const createExpense = z.strictObject({ trip_id: uuid, ...expenseFields });
// The trip can't change after creation; move an expense by deleting and re-adding it.
export const updateExpense = z.strictObject(expenseFields).partial().refine(notEmpty, NOT_EMPTY_MESSAGE);
export type CreateExpense = z.infer<typeof createExpense>;
export type UpdateExpense = z.infer<typeof updateExpense>;
