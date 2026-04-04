-- ============================================================
-- 007_timetable_upgrades.sql
-- Adds mode, preferred_study_time, hours_per_day to timetables
-- Creates timetable_versions table
-- ============================================================

-- ── timetables: add missing columns ─────────────────────────
alter table public.timetables
  add column if not exists mode                  text not null default 'normal'
    check (mode in ('normal', 'exam')),
  add column if not exists preferred_study_time  text not null default 'mixed'
    check (preferred_study_time in ('morning', 'evening', 'mixed')),
  add column if not exists hours_per_day         integer not null default 6
    check (hours_per_day between 1 and 16);

-- ── timetable_versions table ─────────────────────────────
create table if not exists public.timetable_versions (
  id           uuid primary key default gen_random_uuid(),
  timetable_id uuid not null references public.timetables(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  version      integer not null default 1,
  schedule     jsonb not null default '{}',
  subjects     jsonb not null default '[]',
  name         text not null,
  mode         text not null default 'normal',
  created_at   timestamptz not null default now()
);

alter table public.timetable_versions enable row level security;

create policy "timetable_versions: select own"
  on public.timetable_versions for select
  using (auth.uid() = user_id);

create policy "timetable_versions: insert own"
  on public.timetable_versions for insert
  with check (auth.uid() = user_id);

create index if not exists timetable_versions_timetable_id_idx
  on public.timetable_versions(timetable_id);
create index if not exists timetable_versions_created_at_idx
  on public.timetable_versions(created_at desc);
