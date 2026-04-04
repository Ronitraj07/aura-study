-- ============================================================
-- PPT Version History Table
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

create table if not exists public.ppt_versions (
  id          uuid primary key default gen_random_uuid(),
  ppt_id      uuid not null references public.ppts(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  version     integer not null default 1,
  slides      jsonb not null default '[]',
  topic       text not null,
  mode        text not null,
  created_at  timestamptz not null default now()
);

alter table public.ppt_versions enable row level security;

create policy "ppt_versions: select own"
  on public.ppt_versions for select
  using (auth.uid() = user_id);

create policy "ppt_versions: insert own"
  on public.ppt_versions for insert
  with check (auth.uid() = user_id);

create index if not exists ppt_versions_ppt_id_idx on public.ppt_versions(ppt_id);
create index if not exists ppt_versions_created_at_idx on public.ppt_versions(created_at desc);
