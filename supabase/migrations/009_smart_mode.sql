-- ============================================================
-- 009_smart_mode.sql
-- Creates smart_sessions and smart_outputs tables
-- ============================================================

-- ── smart_sessions: one row per uploaded syllabus ─────────────
create table if not exists public.smart_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  syllabus_filename text not null,
  extracted_text   text not null default '',
  subjects_json    jsonb not null default '[]',
  -- subjects_json shape:
  -- [{ name: string, units: [{ name: string, topics: string[] }] }]
  status           text not null default 'pending'
    check (status in ('pending', 'extracting', 'structuring', 'ready', 'generating', 'done', 'error')),
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.smart_sessions enable row level security;

create policy "smart_sessions: select own"
  on public.smart_sessions for select
  using (auth.uid() = user_id);

create policy "smart_sessions: insert own"
  on public.smart_sessions for insert
  with check (auth.uid() = user_id);

create policy "smart_sessions: update own"
  on public.smart_sessions for update
  using (auth.uid() = user_id);

create policy "smart_sessions: delete own"
  on public.smart_sessions for delete
  using (auth.uid() = user_id);

create trigger smart_sessions_updated_at
  before update on public.smart_sessions
  for each row execute procedure public.set_updated_at();

create index if not exists smart_sessions_user_id_idx on public.smart_sessions(user_id);
create index if not exists smart_sessions_created_at_idx on public.smart_sessions(created_at desc);


-- ── smart_outputs: one row per generated item ───────────────
create table if not exists public.smart_outputs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.smart_sessions(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  subject      text not null,
  unit         text not null default '',
  topic        text not null,
  output_type  text not null
    check (output_type in ('ppt', 'notes', 'assignment', 'timetable')),
  output_id    uuid not null,   -- FK to the respective table (ppts, notes, assignments, timetables)
  status       text not null default 'pending'
    check (status in ('pending', 'generating', 'done', 'error')),
  created_at   timestamptz not null default now()
);

alter table public.smart_outputs enable row level security;

create policy "smart_outputs: select own"
  on public.smart_outputs for select
  using (auth.uid() = user_id);

create policy "smart_outputs: insert own"
  on public.smart_outputs for insert
  with check (auth.uid() = user_id);

create policy "smart_outputs: update own"
  on public.smart_outputs for update
  using (auth.uid() = user_id);

create index if not exists smart_outputs_session_id_idx on public.smart_outputs(session_id);
create index if not exists smart_outputs_user_id_idx on public.smart_outputs(user_id);
create index if not exists smart_outputs_output_type_idx on public.smart_outputs(output_type);
