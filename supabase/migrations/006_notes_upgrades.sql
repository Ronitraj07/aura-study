-- ============================================================
-- 006_notes_upgrades.sql
-- Adds depth, content_json, exam_tips, quick_revision to notes
-- Creates note_versions table
-- ============================================================

-- ── notes: add missing columns ─────────────────────────────
alter table public.notes
  add column if not exists depth          text not null default 'detailed'
    check (depth in ('basic', 'detailed', 'revision')),
  add column if not exists content_json   jsonb not null default '{}',
  add column if not exists exam_tips      text not null default '',
  add column if not exists quick_revision text not null default '';

-- ── note_versions table ───────────────────────────────────
create table if not exists public.note_versions (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.notes(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  version     integer not null default 1,
  content_json jsonb not null default '{}',
  topic       text not null,
  depth       text not null default 'detailed',
  exam_tips   text not null default '',
  quick_revision text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.note_versions enable row level security;

create policy "note_versions: select own"
  on public.note_versions for select
  using (auth.uid() = user_id);

create policy "note_versions: insert own"
  on public.note_versions for insert
  with check (auth.uid() = user_id);

create index if not exists note_versions_note_id_idx on public.note_versions(note_id);
create index if not exists note_versions_created_at_idx on public.note_versions(created_at desc);
