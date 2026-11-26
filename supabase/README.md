# Existing Supabase database

This folder belongs to the Node backend repository. It describes the nine tables already created in the Supabase dashboard; it is not a table-creation migration.

- `schema/columns.json`: supplied column names, types, nullability and defaults.
- `schema/policies.json`: supplied ownership policies.
- `inspect-schema.sql`: read-only inspection of RLS flags, constraints, triggers, table grants and storage policies.

## Verified hosted schema (2026-11-22)

`inspect-schema.sql` confirmed RLS on all nine tables, primary keys, foreign keys, CHECK constraints, and triggers.

- `auth.users` 1:1 `profiles`; the `on_auth_user_created` trigger creates the profile.
- `profiles` 1:N `trips`, `locations`, and `user_countries`.
- `trips` 1:N `trip_activities`, `expenses`, and `diary_entries`; deleting a trip cascades to them.
- `diary_entries` 1:N `diary_photos`.
- `trips` M:N `locations` through `trip_locations`.
- Composite foreign keys such as `(trip_id, user_id) -> trips(id, user_id)` stop a row from linking to another user's trip.

The column export does not establish primary/foreign keys, deletion behavior, automatic profile creation, update triggers, storage buckets, or whether RLS is enabled. Do not infer those features from column names or policy definitions. Apply new schema changes only through reviewed migrations after inspecting the hosted schema.

`npm run types:database` generates provisional `src/types/database.ts` from the saved columns. For authoritative types, run the Supabase CLI:

```sh
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public
```

Save the output as `src/types/database.ts` and update the separate frontend contract as necessary. Do not rerun the snapshot generator over authoritative CLI types. The frontend and backend do not import files from each other's repository.

Database tests reproduce only the supplied columns and policies in an isolated PGlite database with RLS explicitly enabled. They cannot establish that the hosted database is configured identically. The API performs its own owner filtering and checks diary references while forwarding the user's token to preserve hosted RLS.
