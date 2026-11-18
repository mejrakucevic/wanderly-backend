import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import type { SupabaseClient, User, PostgrestError } from '@supabase/supabase-js';
import type { Database } from './types/database.js';
import * as schema from './validation.js';

type Client = SupabaseClient<Database>;
type AuthResponse = Response<unknown, { user: User; db: Client }>;
type Options = { createClient: (token: string) => Client; allowedOrigins?: string[] };
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function check(error: PostgrestError | null) {
  if (!error) return;
  if (error.code === '23505') throw new ApiError(409, 'This record already exists.');
  if (error.code === '23503' || error.code === '23514' || error.code === '23502' || error.code === '22P02') {
    throw new ApiError(400, 'The record does not satisfy the database rules.');
  }
  if (error.code === '42501') throw new ApiError(403, 'You do not have permission to perform this action.');
  throw new ApiError(502, 'The database request failed.');
}
function dateOrder(start: string, end: string) {
  if (end < start) throw new ApiError(400, 'The end date cannot be before the start date.');
}
/** Plan items must fall inside the trip; a stay's end date may not pass the trip's last day. */
function withinTrip(trip: { start_date: string; end_date: string }, start: string, end: string | null | undefined) {
  if (start < trip.start_date || start > trip.end_date) throw new ApiError(400, 'The date must be within the trip dates.');
  if (end && end < start) throw new ApiError(400, 'The end date cannot be before the start date.');
  if (end && end > trip.end_date) throw new ApiError(400, 'The end date must be within the trip dates.');
}
async function ownedTrip(db: Client, userId: string, id: string) {
  const { data, error } = await db.from('trips').select('id,start_date,end_date').eq('id', id).eq('user_id', userId).maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, 'The linked trip was not found.');
  return data;
}
async function ownedReference(db: Client, userId: string, table: 'trips' | 'locations', id: string) {
  const { data, error } = await db.from(table).select('id').eq('id', id).eq('user_id', userId).maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, 'The linked trip or location was not found.');
}

export function createApp({ createClient, allowedOrigins = [] }: Options) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new ApiError(403, 'This browser origin is not allowed.'));
  } }));
  app.use(express.json({ limit: '128kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'wanderly-backend' }));

  app.use('/api', async (req: Request, res: AuthResponse, next: NextFunction) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    if (!match) throw new ApiError(401, 'Sign in to access this resource.');
    const db = createClient(match[1]);
    const { data, error } = await db.auth.getUser(match[1]);
    if (error && (!error.status || error.status >= 500 || error.status === 429)) {
      throw new ApiError(503, 'Authentication is temporarily unavailable.');
    }
    if (error || !data.user) throw new ApiError(401, 'Your session is invalid or expired. Please sign in again.');
    res.locals.user = data.user;
    res.locals.db = db;
    next();
  });
  app.get('/api/me', (_req: Request, res: AuthResponse) => {
    res.json({ id: res.locals.user.id, email: res.locals.user.email });
  });

  app.get('/api/trips', async (req: Request, res: AuthResponse) => {
    const { limit, offset } = schema.pagination.parse(req.query);
    const { db, user } = res.locals;
    const { data, error } = await db.from('trips').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1);
    check(error);
    res.json(data);
  });
  app.get('/api/trips/:id', async (req: Request, res: AuthResponse) => {
    const id = schema.uuid.parse(req.params.id);
    const { db, user } = res.locals;
    const { data, error } = await db.from('trips').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Trip not found.');
    res.json(data);
  });
  app.post('/api/trips', async (req: Request, res: AuthResponse) => {
    const input = schema.createTrip.parse(req.body);
    dateOrder(input.start_date, input.end_date);
    const { db, user } = res.locals;
    const { data, error } = await db.from('trips').insert({ ...input, user_id: user.id }).select().single();
    check(error);
    res.status(201).json(data);
  });
  app.patch('/api/trips/:id', async (req: Request, res: AuthResponse) => {
    const id = schema.uuid.parse(req.params.id);
    const input = schema.updateTrip.parse(req.body);
    const { db, user } = res.locals;
    const existing = await db.from('trips').select('start_date,end_date').eq('id', id).eq('user_id', user.id).maybeSingle();
    check(existing.error);
    if (!existing.data) throw new ApiError(404, 'Trip not found.');
    dateOrder(input.start_date ?? existing.data.start_date, input.end_date ?? existing.data.end_date);
    const { data, error } = await db.from('trips').update(input).eq('id', id).eq('user_id', user.id).select().maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Trip not found.');
    res.json(data);
  });
  app.delete('/api/trips/:id', async (req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('trips').delete().eq('id', schema.uuid.parse(req.params.id)).eq('user_id', user.id).select('id').maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Trip not found.');
    res.sendStatus(204);
  });

  app.get('/api/diary-entries', async (req: Request, res: AuthResponse) => {
    const { limit, offset } = schema.pagination.parse(req.query);
    const { db, user } = res.locals;
    let query = db.from('diary_entries').select('*').eq('user_id', user.id);
    if (req.query.trip_id !== undefined) query = query.eq('trip_id', schema.uuid.parse(req.query.trip_id));
    const { data, error } = await query.order('entry_date', { ascending: false }).order('id').range(offset, offset + limit - 1);
    check(error);
    res.json(data);
  });
  app.post('/api/diary-entries', async (req: Request, res: AuthResponse) => {
    const input = schema.createDiary.parse(req.body);
    const { db, user } = res.locals;
    await ownedReference(db, user.id, 'trips', input.trip_id);
    if (input.location_id) await ownedReference(db, user.id, 'locations', input.location_id);
    const { data, error } = await db.from('diary_entries').insert({ ...input, user_id: user.id }).select().single();
    check(error);
    res.status(201).json(data);
  });
  app.patch('/api/diary-entries/:id', async (req: Request, res: AuthResponse) => {
    const input = schema.updateDiary.parse(req.body);
    const id = schema.uuid.parse(req.params.id);
    const { db, user } = res.locals;
    if (input.trip_id) await ownedReference(db, user.id, 'trips', input.trip_id);
    if (input.location_id) await ownedReference(db, user.id, 'locations', input.location_id);
    const { data, error } = await db.from('diary_entries').update(input).eq('id', id).eq('user_id', user.id).select().maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Diary entry not found.');
    res.json(data);
  });
  app.delete('/api/diary-entries/:id', async (req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('diary_entries').delete().eq('id', schema.uuid.parse(req.params.id)).eq('user_id', user.id).select('id').maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Diary entry not found.');
    res.sendStatus(204);
  });
  app.get('/api/activities', async (req: Request, res: AuthResponse) => {
    const { limit, offset } = schema.pagination.parse(req.query);
    const { trip_id } = schema.activityList.parse(req.query);
    const { db, user } = res.locals;
    let query = db.from('trip_activities').select('*').eq('user_id', user.id);
    if (trip_id) query = query.eq('trip_id', trip_id);
    const { data, error } = await query.order('activity_date').order('start_time', { nullsFirst: true }).order('sort_order').order('id')
      .range(offset, offset + limit - 1);
    check(error);
    res.json(data);
  });
  app.post('/api/activities', async (req: Request, res: AuthResponse) => {
    const input = schema.createActivity.parse(req.body);
    const { db, user } = res.locals;
    withinTrip(await ownedTrip(db, user.id, input.trip_id), input.activity_date, input.end_date);
    if (input.location_id) await ownedReference(db, user.id, 'locations', input.location_id);
    // ai_generated is never accepted from clients; only a future server-side AI endpoint may set it.
    const { data, error } = await db.from('trip_activities').insert({ ...input, user_id: user.id, ai_generated: false }).select().single();
    check(error);
    res.status(201).json(data);
  });
  app.patch('/api/activities/:id', async (req: Request, res: AuthResponse) => {
    const id = schema.uuid.parse(req.params.id);
    const input = schema.updateActivity.parse(req.body);
    const { db, user } = res.locals;
    const existing = await db.from('trip_activities').select('trip_id,activity_date,end_date').eq('id', id).eq('user_id', user.id).maybeSingle();
    check(existing.error);
    if (!existing.data) throw new ApiError(404, 'Plan item not found.');
    if (input.activity_date !== undefined || input.end_date !== undefined) {
      const trip = await ownedTrip(db, user.id, existing.data.trip_id);
      withinTrip(trip, input.activity_date ?? existing.data.activity_date, input.end_date !== undefined ? input.end_date : existing.data.end_date);
    }
    if (input.location_id) await ownedReference(db, user.id, 'locations', input.location_id);
    const { data, error } = await db.from('trip_activities').update(input).eq('id', id).eq('user_id', user.id).select().maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Plan item not found.');
    res.json(data);
  });
  app.delete('/api/activities/:id', async (req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('trip_activities').delete().eq('id', schema.uuid.parse(req.params.id)).eq('user_id', user.id).select('id').maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Plan item not found.');
    res.sendStatus(204);
  });
  app.get('/api/expenses', async (req: Request, res: AuthResponse) => {
    const { limit, offset } = schema.pagination.parse(req.query);
    const { trip_id } = schema.expenseList.parse(req.query);
    const { db, user } = res.locals;
    let query = db.from('expenses').select('*').eq('user_id', user.id);
    if (trip_id) query = query.eq('trip_id', trip_id);
    const { data, error } = await query.order('expense_date', { ascending: false }).order('created_at', { ascending: false }).order('id')
      .range(offset, offset + limit - 1);
    check(error);
    res.json(data);
  });
  app.post('/api/expenses', async (req: Request, res: AuthResponse) => {
    const input = schema.createExpense.parse(req.body);
    const { db, user } = res.locals;
    await ownedTrip(db, user.id, input.trip_id);
    const { data, error } = await db.from('expenses').insert({ ...input, user_id: user.id }).select().single();
    check(error);
    res.status(201).json(data);
  });
  app.patch('/api/expenses/:id', async (req: Request, res: AuthResponse) => {
    const id = schema.uuid.parse(req.params.id);
    const input = schema.updateExpense.parse(req.body);
    const { db, user } = res.locals;
    const { data, error } = await db.from('expenses').update(input).eq('id', id).eq('user_id', user.id).select().maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Expense not found.');
    res.json(data);
  });
  app.delete('/api/expenses/:id', async (req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('expenses').delete().eq('id', schema.uuid.parse(req.params.id)).eq('user_id', user.id).select('id').maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Expense not found.');
    res.sendStatus(204);
  });
  app.get('/api/countries', async (_req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('user_countries').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).order('id');
    check(error);
    res.json(data);
  });
  app.post('/api/countries', async (req: Request, res: AuthResponse) => {
    const input = schema.createCountry.parse(req.body);
    const { db, user } = res.locals;
    const existing = await db.from('user_countries').select('id').eq('user_id', user.id).eq('country_code', input.country_code).maybeSingle();
    check(existing.error);
    if (existing.data) throw new ApiError(409, 'This country is already in your list.');
    const visited_at = input.status === 'visited' ? input.visited_at ?? null : null;
    const { data, error } = await db.from('user_countries').insert({ ...input, visited_at, user_id: user.id }).select().single();
    check(error);
    res.status(201).json(data);
  });
  app.patch('/api/countries/:id', async (req: Request, res: AuthResponse) => {
    const id = schema.uuid.parse(req.params.id);
    const input = schema.updateCountry.parse(req.body);
    // A wishlist country has no visit date.
    const update = input.status === 'wishlist' ? { ...input, visited_at: null } : input;
    const { db, user } = res.locals;
    const { data, error } = await db.from('user_countries').update(update).eq('id', id).eq('user_id', user.id).select().maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Country not found in your list.');
    res.json(data);
  });
  app.delete('/api/countries/:id', async (req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('user_countries').delete().eq('id', schema.uuid.parse(req.params.id)).eq('user_id', user.id).select('id').maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, 'Country not found in your list.');
    res.sendStatus(204);
  });
  app.get('/api/profile', async (_req: Request, res: AuthResponse) => {
    const { db, user } = res.locals;
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    check(error);
    res.json(data);
  });
  app.patch('/api/profile', async (req: Request, res: AuthResponse) => {
    const input = schema.profile.parse(req.body);
    const { db, user } = res.locals;
    const { data, error } = await db.from('profiles').upsert({ ...input, id: user.id }, { onConflict: 'id' }).select().single();
    check(error);
    res.json(data);
  });
  app.use((_req, _res, next) => next(new ApiError(404, 'Endpoint not found.')));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request.', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
    } else if (error instanceof ApiError) res.status(error.status).json({ error: error.message });
    else if (error instanceof SyntaxError && 'body' in error) res.status(400).json({ error: 'Invalid JSON body.' });
    else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') res.status(413).json({ error: 'Request body is too large.' });
    else res.status(500).json({ error: 'An unexpected server error occurred.' });
  });
  return app;
}
