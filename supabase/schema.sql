-- Supabase schema for Training Program Manager (optional cloud sync).
-- Run this in the Supabase SQL editor, then put the project URL + anon key in .env.
-- The whole dataset is kept as a single JSON document for a single user.

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Single-user app with no login: allow the anon role to read/write the one row.
-- (Data is low-sensitivity training plans. Add auth + per-user rows later if needed.)
alter table public.app_state enable row level security;

create policy "anon can read app_state"
  on public.app_state for select
  to anon using (true);

create policy "anon can upsert app_state"
  on public.app_state for insert
  to anon with check (true);

create policy "anon can update app_state"
  on public.app_state for update
  to anon using (true) with check (true);

insert into public.app_state (id, data)
values ('default', '{"macrocycles":[],"logs":[]}'::jsonb)
on conflict (id) do nothing;
