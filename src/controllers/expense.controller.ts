import type { Request } from 'express';
import * as expenseService from '../services/expense.service.js';
import type { AuthResponse } from '../types/api.js';
import { pagination, tripFilter, uuid } from '../validators/common.validator.js';
import { createExpense, updateExpense } from '../validators/expense.validator.js';

export async function list(req: Request, res: AuthResponse) {
  const page = pagination.parse(req.query);
  const { trip_id } = tripFilter.parse(req.query);
  res.json(await expenseService.listExpenses(res.locals.db, res.locals.user.id, page, trip_id));
}

export async function getOne(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  res.json(await expenseService.getExpense(res.locals.db, res.locals.user.id, id));
}

export async function create(req: Request, res: AuthResponse) {
  const input = createExpense.parse(req.body);
  res.status(201).json(await expenseService.createExpense(res.locals.db, res.locals.user.id, input));
}

export async function update(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  const input = updateExpense.parse(req.body);
  res.json(await expenseService.updateExpense(res.locals.db, res.locals.user.id, id, input));
}

export async function remove(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  await expenseService.deleteExpense(res.locals.db, res.locals.user.id, id);
  res.sendStatus(204);
}
