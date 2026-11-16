-- Read-only metadata inspection. Run in Supabase SQL Editor and share the result.
-- No row data, credentials, or database changes are included.
select jsonb_build_object(
  'rls', (
    select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity
    ) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  ),
  'constraints', (
    select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', con.conname, 'definition', pg_get_constraintdef(con.oid)
    ) order by c.relname, con.conname)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ),
  'triggers', (
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'definition', pg_get_triggerdef(t.oid)
    ) order by n.nspname, c.relname, t.tgname)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
  ),
  'grants', (
    select jsonb_agg(to_jsonb(g) order by g.table_name, g.grantee, g.privilege_type)
    from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated', 'PUBLIC')
  ),
  'storage_policies', (
    select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
    from pg_policies p where p.schemaname = 'storage'
  )
) as schema_details;
