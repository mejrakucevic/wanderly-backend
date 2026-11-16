import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const readSnapshot = async (name) => JSON.parse((await readFile(new URL(`../supabase/schema/${name}.json`, import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
const quote = (name) => `"${name.replaceAll('"', '""')}"`;

test('exported columns and policies (not the hosted database)', async (t) => {
  const db = new PGlite();
  try {
    const columns = await readSnapshot('columns');
    const policies = await readSnapshot('policies');
    const tables = [...new Set(columns.map((column) => column.table_name))];
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema auth to anon, authenticated;
    `);
    for (const table of tables) {
      const definitions = columns.filter((column) => column.table_name === table).map((column) =>
        `${quote(column.column_name)} ${column.data_type}${column.is_nullable === 'NO' ? ' not null' : ''}${column.column_default !== null ? ` default ${column.column_default}` : ''}`);
      await db.exec(`create table public.${quote(table)} (${definitions.join(', ')});
        alter table public.${quote(table)} enable row level security;
        grant select, insert, update, delete on public.${quote(table)} to authenticated, anon;`);
    }
    for (const policy of policies) {
      assert.equal(policy.roles, '{authenticated}');
      await db.exec(`create policy ${quote(policy.policyname)} on public.${quote(policy.tablename)}
        for ${policy.cmd} to authenticated
        ${policy.qual ? `using (${policy.qual})` : ''}
        ${policy.with_check ? `with check (${policy.with_check})` : ''};`);
    }

    async function asUser(id) {
      await db.exec('reset role; set role authenticated;');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    }
    async function insertRow(table, values) {
      const names = Object.keys(values);
      return db.query(`insert into public.${quote(table)} (${names.map(quote).join(', ')}) values (${names.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, Object.values(values));
    }
    const trip = { user_id: alice, title: 'Lisbon', destination: 'Lisbon', start_date: '2027-06-01', end_date: '2027-06-07' };

    await t.test('trips require an explicit owner and both dates', async () => {
      await asUser(alice);
      for (const field of ['user_id', 'start_date', 'end_date']) {
        const missing = { ...trip };
        delete missing[field];
        await assert.rejects(insertRow('trips', missing), { code: field === 'user_id' ? '42501' : '23502' });
      }
      const created = (await insertRow('trips', trip)).rows[0];
      assert.equal(created.user_id, alice);
      assert.equal(Number(created.budget), 0);
      assert.equal(created.currency, 'EUR');
    });

    await t.test('diary entries require a trip and default ownership to auth.uid()', async () => {
      await assert.rejects(insertRow('diary_entries', { title: 'First day' }), { code: '23502' });
      const created = (await insertRow('diary_entries', { title: 'First day', trip_id: alice })).rows[0];
      assert.equal(created.user_id, alice);
      assert.equal(created.location_id, null);
    });

    await t.test('exported policies block cross-user reads and writes on every table when RLS is enabled', async () => {
      for (const table of tables) {
        await db.exec('reset role;');
        const tableColumns = columns.filter((column) => column.table_name === table);
        const values = {};
        for (const column of tableColumns) {
          if (column.column_default !== null || column.is_nullable === 'YES') continue;
          values[column.column_name] = ({ uuid: alice, text: 'example', date: '2027-06-01', numeric: 10, 'double precision': 10 })[column.data_type];
        }
        const created = (await insertRow(table, values)).rows[0];
        const ownerField = table === 'profiles' ? 'id' : 'user_id';
        const keyField = table === 'trip_locations' ? 'trip_id' : 'id';
        await asUser(bob);
        assert.equal((await db.query(`select * from public.${quote(table)}`)).rows.length, 0);
        assert.equal((await db.query(`update public.${quote(table)} set ${quote(ownerField)} = $1 where ${quote(keyField)} = $2 returning *`, [bob, created[keyField]])).rows.length, 0);
        assert.equal((await db.query(`delete from public.${quote(table)} returning *`)).rows.length, 0);
        await assert.rejects(insertRow(table, { ...values, [ownerField]: alice }), { code: '42501' });
        await asUser(alice);
        const owned = await db.query(`select * from public.${quote(table)}`);
        assert.ok(owned.rows.length > 0);
        await assert.rejects(db.query(`update public.${quote(table)} set ${quote(ownerField)} = $1`, [bob]), { code: '42501' });
        assert.ok((await db.query(`delete from public.${quote(table)} returning *`)).rows.length > 0);
      }
    });

    await t.test('anonymous clients have no matching policies', async () => {
      await db.exec('reset role; set role anon;');
      for (const table of tables) {
        assert.equal((await db.query(`select * from public.${quote(table)}`)).rows.length, 0);
      }
      await assert.rejects(insertRow('trips', trip), { code: '42501' });
    });
  } finally {
    await db.close();
  }
});
