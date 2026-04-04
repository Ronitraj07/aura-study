-- ============================================================
-- Aura Study — Supabase Schema + RLS
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  ppts_count integer not null default 0,
  assignments_count integer not null default 0,
  notes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users enable row level security;
create policy "users: own row only" on public.users
  for all using (auth.uid() = id);

-- ─── PPTs ─────────────────────────────────────────────────────
create table if not exists public.ppts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  title text not null,
  mode text not null check (mode in ('basic', 'high_quality')),
  presentation_type text not null default 'academic' check (presentation_type in ('academic', 'business', 'creative')),
  design_theme text not null default 'minimal' check (design_theme in ('modern', 'minimal', 'corporate')),
  slide_count integer not null default 0,
  slides jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ppts enable row level security;
create policy "ppts: own rows only" on public.ppts
  for all using (auth.uid() = user_id);

-- ─── PPT VERSIONS ─────────────────────────────────────────────
create table if not exists public.ppt_versions (
  id uuid primary key default uuid_generate_v4(),
  ppt_id uuid not null references public.ppts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  version integer not null default 1,
  topic text not null,
  mode text not null default 'basic',
  presentation_type text not null default 'academic',
  design_theme text not null default 'minimal',
  slides jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.ppt_versions enable row level security;
create policy "ppt_versions: own rows only" on public.ppt_versions
  for all using (auth.uid() = user_id);

-- ─── ASSIGNMENTS ──────────────────────────────────────────────
create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  word_count integer not null default 500,
  tone text not null default 'academic' check (tone in ('formal', 'academic', 'casual')),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "assignments: own rows only" on public.assignments
  for all using (auth.uid() = user_id);

-- ─── NOTES ────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  headings jsonb not null default '[]',
  bullets jsonb not null default '[]',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "notes: own rows only" on public.notes
  for all using (auth.uid() = user_id);

-- ─── TIMETABLES ───────────────────────────────────────────────
create table if not exists public.timetables (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'My Timetable',
  subjects jsonb not null default '[]',
  schedule jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
alter table public.timetables enable row level security;
create policy "timetables: own rows only" on public.timetables
  for all using (auth.uid() = user_id);

-- ─── CHECKLISTS ───────────────────────────────────────────────
create table if not exists public.checklists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.checklists enable row level security;
create policy "checklists: own rows only" on public.checklists
  for all using (auth.uid() = user_id);

-- ─── AUTO-UPDATE updated_at TRIGGER ──────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ppts
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.assignments
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.notes
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.timetables
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.checklists
  for each row execute function public.handle_updated_at();

-- ─── AUTO-CREATE USER ROW ON SIGN-UP ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── INCREMENT COUNTERS ───────────────────────────────────────
create or replace function public.increment_user_counter(user_id uuid, col text)
returns void language plpgsql security definer as $$
begin
  if col = 'ppts_count' then
    update public.users set ppts_count = ppts_count + 1 where id = user_id;
  elsif col = 'assignments_count' then
    update public.users set assignments_count = assignments_count + 1 where id = user_id;
  elsif col = 'notes_count' then
    update public.users set notes_count = notes_count + 1 where id = user_id;
  end if;
end;
$$;
