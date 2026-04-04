-- ============================================================
-- 003_ppt_columns.sql
-- Adds missing columns to ppts and syncs ppt_versions schema
-- Run in Supabase SQL Editor
-- ============================================================

-- ── ppts: add missing columns ─────────────────────────────────
alter table public.ppts
  add column if not exists title             text not null default '',
  add column if not exists presentation_type text not null default 'academic'
    check (presentation_type in ('academic', 'business', 'creative')),
  add column if not exists design_theme      text not null default 'minimal'
    check (design_theme in ('modern', 'minimal', 'corporate'));

-- Back-fill title from topic for any rows that already exist
update public.ppts set title = topic where title = '';

-- ── ppt_versions: add missing columns ────────────────────────
alter table public.ppt_versions
  add column if not exists presentation_type text not null default 'academic'
    check (presentation_type in ('academic', 'business', 'creative')),
  add column if not exists design_theme      text not null default 'minimal'
    check (design_theme in ('modern', 'minimal', 'corporate'));
