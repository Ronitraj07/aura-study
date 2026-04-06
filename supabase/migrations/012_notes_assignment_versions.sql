-- Migration 012: notes_versions and assignment_versions tables
-- Mirrors the ppt_versions pattern for Notes and Assignments

-- ── notes_versions ───────────────────────────────────────────────
create table if not exists notes_versions (
  id          uuid primary key default gen_random_uuid(),
  notes_id    uuid not null references notes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     integer not null default 1,
  topic       text not null,
  headings    jsonb not null default '[]',
  bullets     jsonb not null default '[]',
  summary     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists notes_versions_notes_id_idx on notes_versions(notes_id);
create index if not exists notes_versions_user_id_idx  on notes_versions(user_id);

alter table notes_versions enable row level security;

create policy "Users manage own notes_versions"
  on notes_versions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── assignment_versions ───────────────────────────────────────────
create table if not exists assignment_versions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references assignments(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  version        integer not null default 1,
  topic          text not null,
  content        text not null default '',
  word_count     integer not null default 0,
  tone           text not null default 'academic',
  created_at     timestamptz not null default now()
);

create index if not exists assignment_versions_assignment_id_idx on assignment_versions(assignment_id);
create index if not exists assignment_versions_user_id_idx       on assignment_versions(user_id);

alter table assignment_versions enable row level security;

create policy "Users manage own assignment_versions"
  on assignment_versions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
