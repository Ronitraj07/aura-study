-- ============================================================
-- Aura Study — Complete Supabase Schema (Reference Document)
-- Reflects: migrations 001 through 009
-- Last updated: 2026-04-04
--
-- ⚠️  DO NOT RUN THIS FILE against an existing database.
--     Use the numbered migration files in /migrations/ instead.
--     This file is documentation only — a full snapshot of the
--     current expected database state.
-- ============================================================

-- ─── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at on every UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Also aliased as handle_updated_at for legacy compatibility
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create a public.users row when a new auth.users row is inserted
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

-- Unified trigger-based counter function (migration 008)
-- Handles: ppts, assignments, notes, timetables, checklists
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
  elsif TG_TABLE_NAME = 'timetables' then
    if TG_OP = 'INSERT' then
      update public.users set timetable_count = timetable_count + 1 where id = new.user_id;
    elsif TG_OP = 'DELETE' then
      update public.users set timetable_count = greatest(timetable_count - 1, 0) where id = old.user_id;
    end if;
  elsif TG_TABLE_NAME = 'checklists' then
    if TG_OP = 'INSERT' then
      update public.users set checklist_count = checklist_count + 1 where id = new.user_id;
    elsif TG_OP = 'DELETE' then
      update public.users set checklist_count = greatest(checklist_count - 1, 0) where id = old.user_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;


-- ============================================================
-- CORE TABLES
-- ============================================================

-- ─── USERS ────────────────────────────────────────────────────
-- One row per authenticated user. Auto-created via handle_new_user trigger.
create table if not exists public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  full_name         text,
  avatar_url        text,
  ppts_count        integer not null default 0,
  assignments_count integer not null default 0,
  notes_count       integer not null default 0,
  timetable_count   integer not null default 0,   -- added migration 008
  checklist_count   integer not null default 0,   -- added migration 008
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.users enable row level security;
create policy "users: own row only" on public.users
  for all using (auth.uid() = id);
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();


-- ─── PPTs ─────────────────────────────────────────────────────
create table if not exists public.ppts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  topic             text not null,
  title             text not null default '',         -- added migration 003
  mode              text not null check (mode in ('basic', 'high_quality')),
  presentation_type text not null default 'academic'  -- added migration 003
    check (presentation_type in ('academic', 'business', 'creative')),
  design_theme      text not null default 'minimal'   -- added migration 003
    check (design_theme in ('modern', 'minimal', 'corporate')),
  slide_count       integer not null default 0,
  slides            jsonb not null default '[]',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.ppts enable row level security;
create policy "ppts: own rows only" on public.ppts
  for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.ppts
  for each row execute function public.set_updated_at();
create trigger ppts_counter
  after insert or delete on public.ppts
  for each row execute procedure public.increment_user_counter();


-- ─── PPT VERSIONS ─────────────────────────────────────────────
-- Snapshot saved before every overwrite (autosave)
create table if not exists public.ppt_versions (
  id                uuid primary key default uuid_generate_v4(),
  ppt_id            uuid not null references public.ppts(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  version           integer not null default 1,
  topic             text not null,
  mode              text not null default 'basic',
  presentation_type text not null default 'academic'  -- added migration 003
    check (presentation_type in ('academic', 'business', 'creative')),
  design_theme      text not null default 'minimal'   -- added migration 003
    check (design_theme in ('modern', 'minimal', 'corporate')),
  slides            jsonb not null default '[]',
  created_at        timestamptz not null default now()
);
alter table public.ppt_versions enable row level security;
create policy "ppt_versions: select own" on public.ppt_versions
  for select using (auth.uid() = user_id);
create policy "ppt_versions: insert own" on public.ppt_versions
  for insert with check (auth.uid() = user_id);
create index if not exists ppt_versions_ppt_id_idx on public.ppt_versions(ppt_id);
create index if not exists ppt_versions_created_at_idx on public.ppt_versions(created_at desc);


-- ─── ASSIGNMENTS ──────────────────────────────────────────────
create table if not exists public.assignments (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  topic          text not null,
  word_count     integer not null default 500,
  tone           text not null default 'academic'
    check (tone in ('formal', 'academic', 'casual')),
  mode           text not null default 'detailed'     -- added migration 005
    check (mode in ('detailed', 'exam_ready', 'quick_notes')),
  citation_style text not null default 'none'         -- added migration 005
    check (citation_style in ('APA', 'MLA', 'none')),
  content        text not null default '',
  content_html   text not null default '',            -- added migration 005
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "assignments: own rows only" on public.assignments
  for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger assignments_counter
  after insert or delete on public.assignments
  for each row execute procedure public.increment_user_counter();


-- ─── ASSIGNMENT VERSIONS ──────────────────────────────────────
create table if not exists public.assignment_versions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  version        integer not null default 1,
  content        text not null default '',
  content_html   text not null default '',
  topic          text not null,
  mode           text not null default 'detailed',
  tone           text not null default 'academic',
  citation_style text not null default 'none',
  created_at     timestamptz not null default now()
);
alter table public.assignment_versions enable row level security;
create policy "assignment_versions: select own" on public.assignment_versions
  for select using (auth.uid() = user_id);
create policy "assignment_versions: insert own" on public.assignment_versions
  for insert with check (auth.uid() = user_id);
create index if not exists assignment_versions_assignment_id_idx
  on public.assignment_versions(assignment_id);
create index if not exists assignment_versions_created_at_idx
  on public.assignment_versions(created_at desc);


-- ─── NOTES ────────────────────────────────────────────────────
create table if not exists public.notes (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  topic          text not null,
  depth          text not null default 'detailed'     -- added migration 006
    check (depth in ('basic', 'detailed', 'revision')),
  headings       jsonb not null default '[]',
  bullets        jsonb not null default '[]',
  summary        text not null default '',
  content_json   jsonb not null default '{}',         -- added migration 006
  exam_tips      text not null default '',            -- added migration 006
  quick_revision text not null default '',            -- added migration 006
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "notes: own rows only" on public.notes
  for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger notes_counter
  after insert or delete on public.notes
  for each row execute procedure public.increment_user_counter();


-- ─── NOTE VERSIONS ────────────────────────────────────────────
create table if not exists public.note_versions (
  id             uuid primary key default gen_random_uuid(),
  note_id        uuid not null references public.notes(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  version        integer not null default 1,
  content_json   jsonb not null default '{}',
  topic          text not null,
  depth          text not null default 'detailed',
  exam_tips      text not null default '',
  quick_revision text not null default '',
  created_at     timestamptz not null default now()
);
alter table public.note_versions enable row level security;
create policy "note_versions: select own" on public.note_versions
  for select using (auth.uid() = user_id);
create policy "note_versions: insert own" on public.note_versions
  for insert with check (auth.uid() = user_id);
create index if not exists note_versions_note_id_idx on public.note_versions(note_id);
create index if not exists note_versions_created_at_idx on public.note_versions(created_at desc);


-- ─── TIMETABLES ───────────────────────────────────────────────
create table if not exists public.timetables (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.users(id) on delete cascade,
  name                  text not null default 'My Timetable',
  subjects              jsonb not null default '[]',
  schedule              jsonb not null default '{}',
  mode                  text not null default 'normal'   -- added migration 007
    check (mode in ('normal', 'exam')),
  preferred_study_time  text not null default 'mixed'    -- added migration 007
    check (preferred_study_time in ('morning', 'evening', 'mixed')),
  hours_per_day         integer not null default 6       -- added migration 007
    check (hours_per_day between 1 and 16),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);
alter table public.timetables enable row level security;
create policy "timetables: own rows only" on public.timetables
  for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.timetables
  for each row execute function public.set_updated_at();
create trigger timetables_counter
  after insert or delete on public.timetables
  for each row execute procedure public.increment_user_counter();


-- ─── TIMETABLE VERSIONS ───────────────────────────────────────
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
create policy "timetable_versions: select own" on public.timetable_versions
  for select using (auth.uid() = user_id);
create policy "timetable_versions: insert own" on public.timetable_versions
  for insert with check (auth.uid() = user_id);
create index if not exists timetable_versions_timetable_id_idx
  on public.timetable_versions(timetable_id);
create index if not exists timetable_versions_created_at_idx
  on public.timetable_versions(created_at desc);


-- ─── CHECKLISTS ───────────────────────────────────────────────
create table if not exists public.checklists (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null,
  completed  boolean not null default false,
  position   integer not null default 0,
  priority   text not null default 'medium'   -- added migration 004
    check (priority in ('low', 'medium', 'high')),
  category   text not null default 'study'    -- added migration 004
    check (category in ('study', 'personal', 'project')),
  due_date   date,                            -- added migration 004
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.checklists enable row level security;
create policy "checklists: own rows only" on public.checklists
  for all using (auth.uid() = user_id);
create trigger set_updated_at before update on public.checklists
  for each row execute function public.set_updated_at();
create trigger checklists_counter
  after insert or delete on public.checklists
  for each row execute procedure public.increment_user_counter();
create index if not exists checklists_category_idx on public.checklists(user_id, category);
create index if not exists checklists_priority_idx on public.checklists(user_id, priority);
create index if not exists checklists_due_date_idx on public.checklists(user_id, due_date);


-- ============================================================
-- SMART MODE TABLES (migration 009)
-- ============================================================

-- ─── SMART SESSIONS ───────────────────────────────────────────
-- One row per uploaded syllabus PDF
create table if not exists public.smart_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  syllabus_filename text not null,
  extracted_text    text not null default '',
  subjects_json     jsonb not null default '[]',
  -- subjects_json shape:
  -- [{ name: string, units: [{ name: string, topics: string[] }] }]
  status            text not null default 'pending'
    check (status in ('pending', 'extracting', 'structuring', 'ready', 'generating', 'done', 'error')),
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.smart_sessions enable row level security;
create policy "smart_sessions: select own" on public.smart_sessions
  for select using (auth.uid() = user_id);
create policy "smart_sessions: insert own" on public.smart_sessions
  for insert with check (auth.uid() = user_id);
create policy "smart_sessions: update own" on public.smart_sessions
  for update using (auth.uid() = user_id);
create policy "smart_sessions: delete own" on public.smart_sessions
  for delete using (auth.uid() = user_id);
create trigger smart_sessions_updated_at
  before update on public.smart_sessions
  for each row execute procedure public.set_updated_at();
create index if not exists smart_sessions_user_id_idx on public.smart_sessions(user_id);
create index if not exists smart_sessions_created_at_idx on public.smart_sessions(created_at desc);


-- ─── SMART OUTPUTS ────────────────────────────────────────────
-- One row per generated item (ppt/notes/assignment/timetable) within a session
create table if not exists public.smart_outputs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.smart_sessions(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  subject     text not null,
  unit        text not null default '',
  topic       text not null,
  output_type text not null
    check (output_type in ('ppt', 'notes', 'assignment', 'timetable')),
  output_id   uuid not null,  -- references the actual row in ppts/notes/assignments/timetables
  status      text not null default 'pending'
    check (status in ('pending', 'generating', 'done', 'error')),
  created_at  timestamptz not null default now()
);
alter table public.smart_outputs enable row level security;
create policy "smart_outputs: select own" on public.smart_outputs
  for select using (auth.uid() = user_id);
create policy "smart_outputs: insert own" on public.smart_outputs
  for insert with check (auth.uid() = user_id);
create policy "smart_outputs: update own" on public.smart_outputs
  for update using (auth.uid() = user_id);
create index if not exists smart_outputs_session_id_idx on public.smart_outputs(session_id);
create index if not exists smart_outputs_user_id_idx on public.smart_outputs(user_id);
create index if not exists smart_outputs_output_type_idx on public.smart_outputs(output_type);
