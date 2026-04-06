-- ============================================================
-- 011_checklist_persistence.sql
-- Fix category constraint + add estimated_minutes + completed_at
-- ============================================================

-- 1. Drop the old category check constraint (study/personal/project)
--    which conflicts with the app's AICategory enum:
--    study | research | writing | review | practice | admin | other
alter table public.checklists
  drop constraint if exists checklists_category_check;

-- 2. Add the corrected category constraint
alter table public.checklists
  add constraint checklists_category_check
  check (category in ('study', 'research', 'writing', 'review', 'practice', 'admin', 'other'));

-- 3. Update the default to 'study' (unchanged, still valid)
-- (no action needed — default 'study' is still in the new set)

-- 4. Add estimated_minutes — how long the task is expected to take
alter table public.checklists
  add column if not exists estimated_minutes integer;

-- 5. Add completed_at — timestamp when the task was marked complete
alter table public.checklists
  add column if not exists completed_at timestamptz;

-- 6. Indexes
create index if not exists checklists_completed_at_idx
  on public.checklists(user_id, completed_at);

create index if not exists checklists_completed_idx
  on public.checklists(user_id, completed);
