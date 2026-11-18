import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createApp } from '../dist/app.js';

const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
const aliceTrip = '00000000-0000-4000-8000-000000000011';
const bobTrip = '00000000-0000-4000-8000-000000000012';
const bobLocation = '00000000-0000-4000-8000-000000000022';
const bobCountry = '00000000-0000-4000-8000-000000000032';
const bobExpense = '00000000-0000-4000-8000-000000000042';

test('HTTP API validates authentication, ownership and input', async (t) => {
  const tables = {
    trips: [
      { id: aliceTrip, user_id: alice, title: 'Lisbon', start_date: '2027-06-01', end_date: '2027-06-07' },
      { id: bobTrip, user_id: bob, title: 'Vienna', start_date: '2027-06-01', end_date: '2027-06-07' },
    ],
    locations: [{ id: bobLocation, user_id: bob }],
    diary_entries: [],
    profiles: [{ id: alice, full_name: 'Alice' }, { id: bob, full_name: 'Bob' }],
    trip_activities: [],
    expenses: [{ id: bobExpense, trip_id: bobTrip, user_id: bob, title: 'Bob dinner', amount: 30, category: 'food', expense_date: '2027-06-02' }],
    user_countries: [{ id: bobCountry, user_id: bob, country_code: 'IT', status: 'visited', visited_at: null }],
  };
  let nextId = 100;
  // Deliberately NO simulated RLS: the API must apply its own ownership filters.
  function client(token) {
    return {
      auth: { getUser: async () => token === 'valid-alice'
        ? { data: { user: { id: alice, email: 'alice@example.com' } }, error: null }
        : { data: { user: null }, error: { status: token === 'auth-down' ? 503 : 401 } } },
      from(table) {
        const filters = [];
        let operation = 'select';
        let payload;
        let page;
        function run(single = false) {
          let rows = tables[table].filter((row) => filters.every(([key, value]) => row[key] === value));
          if (operation === 'insert' || operation === 'upsert') {
            const existing = operation === 'upsert' ? tables[table].find((row) => row.id === payload.id) : null;
            const row = existing ?? { id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}` };
            Object.assign(row, payload);
            if (!existing) tables[table].push(row);
            rows = [row];
          } else if (operation === 'update') rows.forEach((row) => Object.assign(row, payload));
          else if (operation === 'delete') tables[table] = tables[table].filter((row) => !rows.includes(row));
          if (page) rows = rows.slice(page[0], page[1] + 1);
          return { data: single ? rows[0] ?? null : rows, error: null };
        }
        const query = {
          select() { return query; },
          eq(key, value) { filters.push([key, value]); return query; },
          order() { return query; },
          range(start, end) { page = [start, end]; return query; },
          insert(value) { operation = 'insert'; payload = value; return query; },
          upsert(value) { operation = 'upsert'; payload = value; return query; },
          update(value) { operation = 'update'; payload = value; return query; },
          delete() { operation = 'delete'; return query; },
          maybeSingle: async () => run(true),
          single: async () => run(true),
          then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
        };
        return query;
      },
    };
  }
  const server = createApp({ createClient: client, allowedOrigins: ['http://localhost:8081'] }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { token = 'valid-alice', body, method = 'GET', headers = {} } = {}) {
    const response = await fetch(`${base}${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  try {
    await t.test('health works without authentication', async () => {
      assert.equal((await request('/health', { token: null })).status, 200);
    });
    await t.test('missing and invalid tokens are rejected; outages remain distinguishable', async () => {
      assert.equal((await request('/api/trips', { token: null })).status, 401);
      assert.equal((await request('/api/trips', { token: 'invalid' })).status, 401);
      assert.equal((await request('/api/trips', { token: 'auth-down' })).status, 503);
    });
    await t.test('untrusted browser origins are rejected', async () => {
      assert.equal((await request('/health', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
      assert.equal((await request('/health', { headers: { Origin: 'http://localhost:8081' } })).status, 200);
    });
    await t.test('lists contain only the authenticated owner’s records', async () => {
      const result = await request('/api/trips');
      assert.equal(result.status, 200);
      assert.deepEqual(result.data.map((row) => row.id), [aliceTrip]);
      assert.equal((await request('/api/me')).data.id, alice);
    });
    await t.test('cannot read, patch, or delete another owner’s trip', async () => {
      assert.equal((await request(`/api/trips/${bobTrip}`)).status, 404);
      assert.equal((await request(`/api/trips/${bobTrip}`, { method: 'PATCH', body: { title: 'Stolen' } })).status, 404);
      assert.equal((await request(`/api/trips/${bobTrip}`, { method: 'DELETE' })).status, 404);
    });
    const validTrip = { title: 'Summer', destination: 'Lisbon', start_date: '2027-06-01', end_date: '2027-06-07' };
    await t.test('trip creation derives ownership and rejects owner spoofing', async () => {
      const created = await request('/api/trips', { method: 'POST', body: validTrip });
      assert.equal(created.status, 201);
      assert.equal(created.data.user_id, alice);
      assert.equal((await request('/api/trips', { method: 'POST', body: { ...validTrip, user_id: bob } })).status, 400);
    });
    await t.test('invalid dates, IDs, pagination and empty updates are rejected', async () => {
      assert.equal((await request('/api/trips', { method: 'POST', body: { ...validTrip, end_date: '2027-05-01' } })).status, 400);
      assert.equal((await request(`/api/trips/${aliceTrip}`, { method: 'PATCH', body: { start_date: '2027-07-01' } })).status, 400);
      assert.equal((await request('/api/trips/not-a-uuid')).status, 400);
      assert.equal((await request('/api/trips?limit=10000')).status, 400);
      assert.equal((await request(`/api/trips/${aliceTrip}`, { method: 'PATCH', body: {} })).status, 400);
    });
    await t.test('diary entries can link only to owned trips and locations', async () => {
      assert.equal((await request('/api/diary-entries', { method: 'POST', body: { title: 'No', trip_id: bobTrip } })).status, 404);
      assert.equal((await request('/api/diary-entries', { method: 'POST', body: { title: 'No', trip_id: aliceTrip, location_id: bobLocation } })).status, 404);
      const created = await request('/api/diary-entries', { method: 'POST', body: { title: 'First day', trip_id: aliceTrip } });
      assert.equal(created.status, 201);
      assert.equal(created.data.user_id, alice);
      assert.equal((await request(`/api/diary-entries/${created.data.id}`, { method: 'PATCH', body: { trip_id: bobTrip } })).status, 404);
      assert.equal((await request(`/api/diary-entries/${created.data.id}`, { method: 'DELETE' })).status, 204);
    });
    await t.test('plan items: owned trips only, dates inside the trip, no client-set AI flag', async () => {
      const stay = { trip_id: aliceTrip, category: 'stay', title: 'Hotel Alfama', activity_date: '2027-06-01', end_date: '2027-06-04', cost: 420 };
      const created = await request('/api/activities', { method: 'POST', body: stay });
      assert.equal(created.status, 201);
      assert.equal(created.data.user_id, alice);
      assert.equal(created.data.ai_generated, false);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, trip_id: bobTrip } })).status, 404);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, ai_generated: true } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, category: 'spa' } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, cost: -5 } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, activity_date: '2027-05-31' } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, end_date: '2027-06-08' } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, start_time: '25:00' } })).status, 400);
      assert.equal((await request('/api/activities', { method: 'POST', body: { ...stay, icon: '<script>' } })).status, 400);
      assert.equal((await request(`/api/activities/${created.data.id}`, { method: 'PATCH', body: { icon: 'apartment' } })).data.icon, 'apartment');
      const train = await request('/api/activities', { method: 'POST', body: { trip_id: aliceTrip, category: 'transport', title: 'Train to Porto', activity_date: '2027-06-05', start_time: '09:30' } });
      assert.equal(train.status, 201);
      assert.deepEqual((await request(`/api/activities?trip_id=${aliceTrip}`)).data.map((row) => row.title).sort(), ['Hotel Alfama', 'Train to Porto']);
      assert.equal((await request(`/api/activities/${created.data.id}`, { method: 'PATCH', body: { end_date: '2027-05-30' } })).status, 400);
      assert.equal((await request(`/api/activities/${created.data.id}`, { method: 'PATCH', body: { cost: 390.5 } })).data.cost, 390.5);
      assert.equal((await request(`/api/activities/${created.data.id}`, { method: 'PATCH', body: { trip_id: bobTrip } })).status, 400);
      assert.equal((await request(`/api/activities/${train.data.id}`, { method: 'DELETE' })).status, 204);
    });
    await t.test('expenses: owned trips only, positive amounts, known categories', async () => {
      const lunch = { trip_id: aliceTrip, title: 'Lunch', amount: 18.5, category: 'food', expense_date: '2027-06-02' };
      const created = await request('/api/expenses', { method: 'POST', body: lunch });
      assert.equal(created.status, 201);
      assert.equal(created.data.user_id, alice);
      assert.equal((await request('/api/expenses', { method: 'POST', body: { ...lunch, trip_id: bobTrip } })).status, 404);
      assert.equal((await request('/api/expenses', { method: 'POST', body: { ...lunch, amount: 0 } })).status, 400);
      assert.equal((await request('/api/expenses', { method: 'POST', body: { ...lunch, amount: -3 } })).status, 400);
      assert.equal((await request('/api/expenses', { method: 'POST', body: { ...lunch, category: 'casino' } })).status, 400);
      assert.equal((await request('/api/expenses', { method: 'POST', body: { ...lunch, user_id: bob } })).status, 400);
      assert.deepEqual((await request('/api/expenses')).data.map((row) => row.title), ['Lunch']);
      assert.equal((await request(`/api/expenses/${created.data.id}`, { method: 'PATCH', body: { amount: 21 } })).data.amount, 21);
      assert.equal((await request(`/api/expenses/${created.data.id}`, { method: 'PATCH', body: { trip_id: bobTrip } })).status, 400);
      assert.equal((await request(`/api/expenses/${bobExpense}`, { method: 'PATCH', body: { amount: 1 } })).status, 404);
      assert.equal((await request(`/api/expenses/${bobExpense}`, { method: 'DELETE' })).status, 404);
      assert.equal((await request(`/api/expenses/${created.data.id}`, { method: 'DELETE' })).status, 204);
      assert.equal(tables.expenses.find((row) => row.id === bobExpense).amount, 30);
    });
    await t.test('countries: owner-only, one row per country, wishlist has no visit date', async () => {
      assert.deepEqual((await request('/api/countries')).data, []);
      const added = await request('/api/countries', { method: 'POST', body: { country_code: 'BA', status: 'visited', visited_at: '2026-05-01' } });
      assert.equal(added.status, 201);
      assert.equal(added.data.user_id, alice);
      assert.equal((await request('/api/countries', { method: 'POST', body: { country_code: 'BA', status: 'wishlist' } })).status, 409);
      // Bob already has IT, but Alice can still add it.
      assert.equal((await request('/api/countries', { method: 'POST', body: { country_code: 'IT', status: 'wishlist' } })).status, 201);
      assert.equal((await request('/api/countries', { method: 'POST', body: { country_code: 'bosnia', status: 'visited' } })).status, 400);
      assert.equal((await request('/api/countries', { method: 'POST', body: { country_code: 'FR', status: 'maybe' } })).status, 400);
      assert.equal((await request('/api/countries', { method: 'POST', body: { country_code: 'FR', status: 'visited', user_id: bob } })).status, 400);
      const moved = await request(`/api/countries/${added.data.id}`, { method: 'PATCH', body: { status: 'wishlist' } });
      assert.equal(moved.data.status, 'wishlist');
      assert.equal(moved.data.visited_at, null);
      assert.equal((await request(`/api/countries/${bobCountry}`, { method: 'PATCH', body: { status: 'wishlist' } })).status, 404);
      assert.equal((await request(`/api/countries/${bobCountry}`, { method: 'DELETE' })).status, 404);
      assert.equal((await request(`/api/countries/${added.data.id}`, { method: 'DELETE' })).status, 204);
      assert.equal(tables.user_countries.filter((row) => row.user_id === bob).length, 1);
    });
    await t.test('profile writes cannot choose another user’s ID', async () => {
      assert.equal((await request('/api/profile', { method: 'PATCH', body: { id: bob, full_name: 'No' } })).status, 400);
      const updated = await request('/api/profile', { method: 'PATCH', body: { full_name: 'Alice Updated' } });
      assert.equal(updated.data.id, alice);
      assert.equal(tables.profiles.find((row) => row.id === bob).full_name, 'Bob');
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
