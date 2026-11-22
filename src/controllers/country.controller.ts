import type { Request } from 'express';
import * as countryService from '../services/country.service.js';
import type { AuthResponse } from '../types/api.js';
import { uuid } from '../validators/common.validator.js';
import { createCountry, updateCountry } from '../validators/country.validator.js';

export async function list(_req: Request, res: AuthResponse) {
  res.json(await countryService.listCountries(res.locals.db, res.locals.user.id));
}

export async function getOne(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  res.json(await countryService.getCountry(res.locals.db, res.locals.user.id, id));
}

export async function create(req: Request, res: AuthResponse) {
  const input = createCountry.parse(req.body);
  res.status(201).json(await countryService.createCountry(res.locals.db, res.locals.user.id, input));
}

export async function update(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  const input = updateCountry.parse(req.body);
  res.json(await countryService.updateCountry(res.locals.db, res.locals.user.id, id, input));
}

export async function remove(req: Request, res: AuthResponse) {
  const id = uuid.parse(req.params.id);
  await countryService.deleteCountry(res.locals.db, res.locals.user.id, id);
  res.sendStatus(204);
}
