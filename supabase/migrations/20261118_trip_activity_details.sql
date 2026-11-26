-- Trip plan details: what kind of item it is, which icon it shows, how much it costs, and (for stays) when it ends.
-- Run once in the Supabase SQL Editor. Adds columns only: existing rows, data and policies are not changed.
-- Safe to run again: every statement checks whether the change already exists.

alter table public.trip_activities
  add column if not exists category text not null default 'activity',
  add column if not exists cost numeric(12, 2),
  add column if not exists end_date date,
  add column if not exists icon text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trip_activities_category_check') then
    alter table public.trip_activities
      add constraint trip_activities_category_check
      check (category in ('stay', 'transport', 'activity', 'food', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_activities_cost_check') then
    alter table public.trip_activities
      add constraint trip_activities_cost_check check (cost is null or cost >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_activities_end_date_check') then
    alter table public.trip_activities
      add constraint trip_activities_end_date_check check (end_date is null or end_date >= activity_date);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_activities_icon_check') then
    alter table public.trip_activities
      add constraint trip_activities_icon_check check (icon is null or icon ~ '^[a-z-]{1,40}$');
  end if;
end $$;

comment on column public.trip_activities.category is 'stay, transport, activity, food or other';
comment on column public.trip_activities.cost is 'Price in the trip currency; null when unknown';
comment on column public.trip_activities.end_date is 'Last day, e.g. check-out for a stay; null for single-day items';
comment on column public.trip_activities.icon is 'Optional icon chosen in the app, e.g. hotel, train, museum; null uses the category icon';
