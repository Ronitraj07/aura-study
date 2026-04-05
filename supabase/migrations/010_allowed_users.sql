-- ============================================================
-- Migration 010 — Allowed Users allowlist + RPC
-- Extracted from AuthContext.tsx JSDoc comment (issue #14)
-- Run via: supabase db push
-- ============================================================

-- ─── Table ──────────────────────────────────────────────────
create table if not exists public.allowed_users (
  email text primary key
);

-- ─── Seed your allowlist ────────────────────────────────────
-- Add every permitted email here. Lower-cased for safe comparison.
insert into public.allowed_users (email)
values
  ('sinharonitraj@gmail.com'),
  ('sinharomitraj@gmail.com'),
  ('radhikadidwania567@gmail.com')
on conflict (email) do nothing;  -- idempotent: safe to re-run

-- ─── RPC: is_allowed_user ────────────────────────────────────
-- Runs as SECURITY DEFINER so the anon/authenticated roles can
-- CALL this function but cannot SELECT from allowed_users directly.
create or replace function public.is_allowed_user(lookup_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   allowed_users
    where  lower(trim(email)) = lower(trim(lookup_email))
  );
$$;

-- ─── Lock down direct table access ──────────────────────────
-- Anon and authenticated roles may only call the RPC,
-- never query the table directly.
revoke all on public.allowed_users from anon, authenticated;
grant  execute on function public.is_allowed_user(text) to anon, authenticated;

-- ─── Enable RLS (defence in depth) ──────────────────────────
alter table public.allowed_users enable row level security;
-- No policies = no rows visible to anyone via direct SELECT
