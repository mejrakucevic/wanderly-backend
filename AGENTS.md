# Wanderly Node backend

This is an independent Node.js 24, Express 5 and TypeScript API. Use npm in this repository; it is not an Expo app.

- Run `npm run lint`, `npm run typecheck`, and `npm test` before completing changes.
- Build with `npm run build`; production entry is `dist/server.js`.
- Validate bearer tokens with Supabase Auth. Derive ownership from the verified user, never request payloads.
- Use per-request Supabase clients carrying the user's bearer token. Do not replace them with an admin/service-role client.
- Validate all input and filter all owned resources by verified user ID. Check linked-resource ownership.
- Keep .env values and tokens out of commits, responses and logs.
- Do not recreate existing hosted tables. Schema metadata is provisional until checked against the live database.
