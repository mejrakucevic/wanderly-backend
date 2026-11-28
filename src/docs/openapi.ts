import { z } from 'zod';
import { createActivity, updateActivity } from '../validators/activity.validator.js';
import { login, register } from '../validators/auth.validator.js';
import { createCountry, updateCountry } from '../validators/country.validator.js';
import { createDiary, updateDiary } from '../validators/diary.validator.js';
import { createExpense, updateExpense } from '../validators/expense.validator.js';
import { updateProfile } from '../validators/profile.validator.js';
import { createTrip, updateTrip } from '../validators/trip.validator.js';

/**
 * OpenAPI description shown by Swagger UI at /api-docs.
 * Request bodies are generated from the Zod validators, so the docs follow the real rules.
 */

// Zod schema -> JSON Schema for a request body.
function schema(zodSchema: z.ZodType) {
  const json: Record<string, unknown> = z.toJSONSchema(zodSchema, { io: 'input', unrepresentable: 'any' });
  delete json.$schema; // OpenAPI documents declare the JSON Schema version themselves.
  return json;
}

const json = (body: object) => ({ content: { 'application/json': { schema: body } } });
const body = (zodSchema: z.ZodType) => ({ required: true, ...json(schema(zodSchema)) });
const errorResponse = (description: string) => ({ description, ...json({ $ref: '#/components/schemas/Error' }) });
const ok = (description: string) => ({ description, ...json({ type: 'object' }) });

const errors = {
  400: errorResponse('Invalid request data'),
  401: errorResponse('Missing or invalid token'),
};
const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const pageParameters = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
];
const tripIdFilter = { name: 'trip_id', in: 'query', description: 'Only rows of this trip', schema: { type: 'string', format: 'uuid' } };

type Resource = {
  path: string;
  tag: string;
  name: string;
  plural: string;
  create: z.ZodType;
  update: z.ZodType;
  listParameters: object[];
};

// The five CRUD operations every resource has: list, create, get one, update, delete.
function crudPaths({ path, tag, name, plural, create, update, listParameters }: Resource) {
  const notFound = errorResponse(`${name} not found`);
  return {
    [path]: {
      get: { tags: [tag], summary: `List my ${plural}`, parameters: listParameters, responses: { 200: ok('Array of rows'), ...errors } },
      post: { tags: [tag], summary: `Create a ${name.toLowerCase()}`, requestBody: body(create), responses: { 201: ok('Created row'), ...errors, 404: notFound, 409: errorResponse('Already exists') } },
    },
    [`${path}/{id}`]: {
      parameters: [idParameter],
      get: { tags: [tag], summary: `Get one ${name.toLowerCase()}`, responses: { 200: ok('One row'), ...errors, 404: notFound } },
      patch: { tags: [tag], summary: `Update a ${name.toLowerCase()} (only the sent fields)`, requestBody: body(update), responses: { 200: ok('Updated row'), ...errors, 404: notFound } },
      delete: { tags: [tag], summary: `Delete a ${name.toLowerCase()}`, responses: { 204: { description: 'Deleted' }, ...errors, 404: notFound } },
    },
  };
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Wanderly API',
    version: '0.1.0',
    description: 'Travel planner and journal API. Use a test account: run Login, copy session.access_token, click Authorize and paste it.',
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: ['Health', 'Auth', 'Profile', 'Trips', 'Trip plan', 'Spending', 'Diary', 'Countries'].map((name) => ({ name })),
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
        required: ['error'],
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Check that the server is running', security: [], responses: { 200: ok('Server is running') } },
    },
    '/api/auth/register': {
      post: { tags: ['Auth'], summary: 'Create an account', security: [], requestBody: body(register), responses: { 201: ok('User and session'), 400: errors[400], 409: errorResponse('Account already exists') } },
    },
    '/api/auth/login': {
      post: { tags: ['Auth'], summary: 'Sign in and get an access token', security: [], requestBody: body(login), responses: { 200: ok('User and session.access_token'), 400: errors[400], 401: errorResponse('Wrong email or password') } },
    },
    '/api/auth/logout': {
      post: { tags: ['Auth'], summary: 'End the current session', responses: { 204: { description: 'Signed out' }, 401: errors[401] } },
    },
    '/api/me': {
      get: { tags: ['Auth'], summary: 'Current user from the token', responses: { 200: ok('User ID and email'), 401: errors[401] } },
    },
    '/api/profile': {
      get: { tags: ['Profile'], summary: 'Get my profile', responses: { 200: ok('Profile'), 401: errors[401] } },
      patch: { tags: ['Profile'], summary: 'Update my profile', requestBody: body(updateProfile), responses: { 200: ok('Updated profile'), ...errors, 409: errorResponse('Username taken') } },
    },
    ...crudPaths({ path: '/api/trips', tag: 'Trips', name: 'Trip', plural: 'trips', create: createTrip, update: updateTrip, listParameters: pageParameters }),
    ...crudPaths({ path: '/api/activities', tag: 'Trip plan', name: 'Plan item', plural: 'plan items', create: createActivity, update: updateActivity, listParameters: [...pageParameters, tripIdFilter] }),
    ...crudPaths({ path: '/api/expenses', tag: 'Spending', name: 'Expense', plural: 'expenses', create: createExpense, update: updateExpense, listParameters: [...pageParameters, tripIdFilter] }),
    ...crudPaths({ path: '/api/diary-entries', tag: 'Diary', name: 'Diary entry', plural: 'diary entries', create: createDiary, update: updateDiary, listParameters: [...pageParameters, tripIdFilter] }),
    ...crudPaths({ path: '/api/countries', tag: 'Countries', name: 'Country', plural: 'countries', create: createCountry, update: updateCountry, listParameters: [] }),
  },
};
