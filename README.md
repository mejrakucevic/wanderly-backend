# Wanderly backend

Independent Node.js 24 + Express 5 + TypeScript API. This repository owns database operations, input validation, access-token verification, schema metadata, and backend tests. The separate `wanderly` repository is the Expo frontend.

## Project structure

```text
src/
  server.ts       Starts the HTTP server
  app.ts          Global middleware, routes, and error handling
  config/         Environment variables and Supabase client
  routes/         URLs and HTTP methods
  middleware/     Authentication, CORS, not-found, and error handling
  controllers/    Read the request, call a service, send the response
  services/       Business logic and Supabase queries
  validators/     Zod schemas for request data
  utils/          Shared API and database error helpers
  types/          TypeScript types
```

Request flow: `route -> auth middleware -> controller -> validator -> service -> Supabase -> JSON response`. Any thrown error goes to the error middleware.

## Run locally

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env
npm.cmd run dev
```

Use the same Supabase project as the frontend. You do not need a service-role/secret key. `.env` is ignored by Git. Port defaults to 3000 and the development host is `0.0.0.0` so a phone on the same Wi-Fi can connect. Use HTTPS when deploying; do not expose a local development API publicly.

For a production build:

```powershell
npm.cmd run build
npm.cmd start
```

`GET http://localhost:3000/health` returns the process health status. It does not check database connectivity. `GET /api/me` with a valid bearer token verifies authentication.

## Frontend connection

In the Expo repository's `.env.local`, set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_WIFI_IP:3000`. Use `http://localhost:3000` for a browser running on the same computer. A physical iPhone cannot use localhost to reach the computer. If the computer's Wi-Fi address changes, update the app variable and reload Expo. Add the exact Expo web origin to `CORS_ORIGINS` when testing a browser. Native requests without an Origin header are accepted; authentication is still required.

The Expo frontend currently signs up/signs in directly with Supabase Auth, while API clients such as Postman can use `/api/auth/*`. Both pass the resulting access token as `Authorization: Bearer <token>`. This API validates the token with Supabase `getUser(token)` before handling requests. Each request uses a separate Supabase client carrying that user's token, so RLS remains in force. Server queries also filter by the verified owner, and diary links are checked against owned trips/locations. The API forwards passwords to Supabase Auth only for register/login and never stores or logs them. Do not disable database RLS: the Supabase Data API still exists independently of this API.

## Endpoints

Except for `/api/auth/register` and `/api/auth/login`, all `/api` endpoints require a bearer token. JSON success responses are direct objects/arrays. Errors have `{ "error": "..." }`, with field details on validation errors.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Public liveness check |
| POST | `/api/auth/register` | Create an account: `{ email, password }` (password at least 8 characters); returns `user` and `session` (`session` is null if email confirmation is required) |
| POST | `/api/auth/login` | Sign in: `{ email, password }`; returns `user` and `session.access_token` |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/me` | Current verified user ID and email |
| GET | `/api/trips?limit=20&offset=0` | List owned trips |
| GET | `/api/trips/:id` | Get owned trip |
| POST | `/api/trips` | Create a trip; server supplies owner |
| PATCH | `/api/trips/:id` | Update allowed trip fields |
| DELETE | `/api/trips/:id` | Delete owned trip |
| GET | `/api/diary-entries?trip_id=UUID&limit=20&offset=0` | List owned diary entries; trip filter optional |
| GET | `/api/diary-entries/:id` | Get owned diary entry |
| POST | `/api/diary-entries` | Create entry referencing an owned trip |
| PATCH | `/api/diary-entries/:id` | Update owned entry |
| DELETE | `/api/diary-entries/:id` | Delete owned entry |
| GET | `/api/profile` | Own profile, or null if absent |
| PATCH | `/api/profile` | Insert/update own profile |
| GET | `/api/activities?trip_id=UUID&limit=20&offset=0` | List own trip plan items; trip filter optional |
| GET | `/api/activities/:id` | Get owned plan item |
| POST | `/api/activities` | Add a plan item (`category`: stay, transport, activity, food, other; optional `cost`, `end_date`, `start_time` HH:MM, `icon`) to an owned trip; dates must be inside the trip |
| PATCH | `/api/activities/:id` | Update an owned plan item |
| DELETE | `/api/activities/:id` | Delete an owned plan item |
| GET | `/api/expenses?trip_id=UUID&limit=20&offset=0` | List own expenses, newest first; trip filter optional |
| GET | `/api/expenses/:id` | Get owned expense |
| POST | `/api/expenses` | Add an expense (`title`, `amount` > 0, `category`: accommodation, transport, food, activities, other, `expense_date`) to an owned trip |
| PATCH | `/api/expenses/:id` | Update an owned expense (the trip cannot change) |
| DELETE | `/api/expenses/:id` | Delete an owned expense |
| GET | `/api/countries` | List own countries (`visited` or `wishlist`) |
| GET | `/api/countries/:id` | Get owned country |
| POST | `/api/countries` | Add a country: `{ country_code: "BA", status: "visited" \| "wishlist", visited_at? }`; 409 if already listed |
| PATCH | `/api/countries/:id` | Change status or visit date; moving to `wishlist` clears `visited_at` |
| DELETE | `/api/countries/:id` | Remove own country |

Trip creation requires title, destination, start_date, and end_date (`YYYY-MM-DD`). Optional fields: description, cover_image_path, budget, currency. Diary creation requires title and trip_id; optional fields: location_id, content, entry_date. Profile fields: username, full_name, avatar_path, bio. Payloads cannot supply ownership, IDs, or timestamps. Pagination accepts 1–100 rows and a nonnegative offset. Unknown fields, invalid IDs/dates, negative budgets, and reversed date ranges are rejected.

The six other database tables have types but no API endpoints yet. File uploads, AI, expenses/location features, API hosting, and password recovery are future work. The existing database has not been changed by this repository split.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

HTTP tests use a fake Supabase client and test the compiled server over actual HTTP, including missing/invalid tokens, ownership filtering without simulated RLS, strict input validation, and cross-owner diary links. Database tests reconstruct only the supplied columns/defaults and policies in PGlite; unknown hosted constraints/triggers/RLS flags are not inferred. No hosted account or row is modified by the tests.

## Database metadata

See `supabase/README.md`. Types cover the nine existing tables. Generate authoritative types with the Supabase CLI after linking your project; the saved snapshot is provisional. Do not run a table-creation migration over the existing database. The `inspect-schema.sql` query is read-only and can verify RLS flags, constraints, triggers and grants.

## Repositories

This folder has its own `.git` directory, package.json, lockfile, tests and environment. It does not import frontend code or rely on the frontend's node_modules. To publish, create a separate empty GitHub repository and add its URL as this repository's `origin`. Nothing has been pushed automatically.

## Postman

Import `postman/wanderly-api.postman_collection.json`. Use a separate test account: set the `email` and `password` collection variables (do not commit real values), start the API, and run the folders in order. Login saves the token, and folder 10 deletes the test data.

## Database migrations

New schema changes live in `supabase/migrations/` and are applied by hand in the Supabase SQL Editor (they only add to the existing tables).

| File | What it does |
|---|---|
| `20261118_trip_activity_details.sql` | Adds `category`, `cost`, `end_date` and `icon` to `trip_activities` for the trip plan. Required by `/api/activities`. |
