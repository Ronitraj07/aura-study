-- ============================================================
-- 005_assignment_upgrades.sql
-- Adds mode, citation_style, content_html to assignments
-- Creates assignment_versions table
-- ============================================================

-- ── assignments: add missing columns ──────────────────────────
alter table public.assignments
  add column if not exists mode           text not null default 'detailed'
    check (mode in ('detailed', 'exam_ready', 'quick_notes')),
  add column if not exists citation_style text not null default 'none'
    check (citation_style in ('APA', 'MLA', 'none')),
  add column if not exists content_html   text not null default '';

-- ── assignment_versions table ───────────────────────────────
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

create policy "assignment_versions: select own"
  on public.assignment_versions for select
  using (auth.uid() = user_id);

create policy "assignment_versions: insert own"
  on public.assignment_versions for insert
  with check (auth.uid() = user_id);

create index if not exists assignment_versions_assignment_id_idx
  on public.assignment_versions(assignment_id);
create index if not exists assignment_versions_created_at_idx
  on public.assignment_versions(created_at desc);
