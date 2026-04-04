-- ============================================================
-- AURA STUDY — Full Schema with RLS
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────
-- 1. USERS (mirrors auth.users)
-- ─────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  ppts_count        integer not null default 0,
  assignments_count integer not null default 0,
  notes_count       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select own"
  on public.users for select
  using (auth.uid() = id);

create policy "users: insert own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();


-- ─────────────────────────────────────────
-- 2. PPTS
-- ─────────────────────────────────────────
create table if not exists public.ppts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  topic       text not null,
  mode        text not null check (mode in ('basic', 'high_quality')),
  slide_count integer not null default 5,
  slides      jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ppts enable row level security;

create policy "ppts: select own"
  on public.ppts for select
  using (auth.uid() = user_id);

create policy "ppts: insert own"
  on public.ppts for insert
  with check (auth.uid() = user_id);

create policy "ppts: update own"
  on public.ppts for update
  using (auth.uid() = user_id);

create policy "ppts: delete own"
  on public.ppts for delete
  using (auth.uid() = user_id);

create trigger ppts_updated_at
  before update on public.ppts
  for each row execute procedure public.set_updated_at();

create index if not exists ppts_user_id_idx on public.ppts(user_id);
create index if not exists ppts_created_at_idx on public.ppts(created_at desc);


-- ─────────────────────────────────────────
-- 3. ASSIGNMENTS
-- ─────────────────────────────────────────
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  topic       text not null,
  word_count  integer not null default 500,
  tone        text not null default 'academic' check (tone in ('formal', 'academic', 'casual')),
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "assignments: select own"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "assignments: insert own"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "assignments: update own"
  on public.assignments for update
  using (auth.uid() = user_id);

create policy "assignments: delete own"
  on public.assignments for delete
  using (auth.uid() = user_id);

create trigger assignments_updated_at
  before update on public.assignments
  for each row execute procedure public.set_updated_at();

create index if not exists assignments_user_id_idx on public.assignments(user_id);
create index if not exists assignments_created_at_idx on public.assignments(created_at desc);


-- ─────────────────────────────────────────
-- 4. NOTES
-- ─────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  topic       text not null,
  headings    jsonb not null default '[]',
  bullets     jsonb not null default '[]',
  summary     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes: select own"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes: insert own"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes: update own"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "notes: delete own"
  on public.notes for delete
  using (auth.uid() = user_id);

create trigger notes_updated_at
  before update on public.notes
  for each row execute procedure public.set_updated_at();

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_created_at_idx on public.notes(created_at desc);


-- ─────────────────────────────────────────
-- 5. TIMETABLES
-- ─────────────────────────────────────────
create table if not exists public.timetables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null default 'My Timetable',
  subjects    jsonb not null default '[]',
  -- subjects: [{ name, color, hoursPerWeek }]
  schedule    jsonb not null default '{}',
  -- schedule: { monday: [{subject, startTime, endTime}], tuesday: [...], ... }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.timetables enable row level security;

create policy "timetables: select own"
  on public.timetables for select
  using (auth.uid() = user_id);

create policy "timetables: insert own"
  on public.timetables for insert
  with check (auth.uid() = user_id);

create policy "timetables: update own"
  on public.timetables for update
  using (auth.uid() = user_id);

create policy "timetables: delete own"
  on public.timetables for delete
  using (auth.uid() = user_id);

create trigger timetables_updated_at
  before update on public.timetables
  for each row execute procedure public.set_updated_at();

create index if not exists timetables_user_id_idx on public.timetables(user_id);


-- ─────────────────────────────────────────
-- 6. CHECKLISTS
-- ─────────────────────────────────────────
create table if not exists public.checklists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  completed   boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.checklists enable row level security;

create policy "checklists: select own"
  on public.checklists for select
  using (auth.uid() = user_id);

create policy "checklists: insert own"
  on public.checklists for insert
  with check (auth.uid() = user_id);

create policy "checklists: update own"
  on public.checklists for update
  using (auth.uid() = user_id);

create policy "checklists: delete own"
  on public.checklists for delete
  using (auth.uid() = user_id);

create trigger checklists_updated_at
  before update on public.checklists
  for each row execute procedure public.set_updated_at();

create index if not exists checklists_user_id_idx on public.checklists(user_id);
create index if not exists checklists_position_idx on public.checklists(user_id, position);


-- ─────────────────────────────────────────
-- 7. AUTO-INCREMENT COUNTERS ON USERS
-- Keeps ppts_count, assignments_count, notes_count in sync
-- ─────────────────────────────────────────
create or replace function public.increment_user_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_TABLE_NAME = 'ppts' then
    if TG_OP = 'INSERT' then
      update public.users set ppts_count = ppts_count + 1 where id = new.user_id;
    elsif TG_OP = 'DELETE' then
      update public.users set ppts_count = greatest(ppts_count - 1, 0) where id = old.user_id;
    end if;
  elsif TG_TABLE_NAME = 'assignments' then
    if TG_OP = 'INSERT' then
      update public.users set assignments_count = assignments_count + 1 where id = new.user_id;
    elsif TG_OP = 'DELETE' then
      update public.users set assignments_count = greatest(assignments_count - 1, 0) where id = old.user_id;
    end if;
  elsif TG_TABLE_NAME = 'notes' then
    if TG_OP = 'INSERT' then
      update public.users set notes_count = notes_count + 1 where id = new.user_id;
    elsif TG_OP = 'DELETE' then
      update public.users set notes_count = greatest(notes_count - 1, 0) where id = old.user_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger ppts_counter
  after insert or delete on public.ppts
  for each row execute procedure public.increment_user_counter();

create trigger assignments_counter
  after insert or delete on public.assignments
  for each row execute procedure public.increment_user_counter();

create trigger notes_counter
  after insert or delete on public.notes
  for each row execute procedure public.increment_user_counter();
