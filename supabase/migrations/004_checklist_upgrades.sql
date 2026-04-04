-- ============================================================
-- 004_checklist_upgrades.sql
-- Adds priority, category, due_date to checklists table
-- ============================================================

alter table public.checklists
  add column if not exists priority   text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  add column if not exists category   text not null default 'study'
    check (category in ('study', 'personal', 'project')),
  add column if not exists due_date   date;

-- Index for filtering by category and priority
create index if not exists checklists_category_idx on public.checklists(user_id, category);
create index if not exists checklists_priority_idx on public.checklists(user_id, priority);
create index if not exists checklists_due_date_idx on public.checklists(user_id, due_date);
