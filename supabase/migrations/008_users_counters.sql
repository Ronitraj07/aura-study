-- ============================================================
-- 008_users_counters.sql
-- Adds timetable_count and checklist_count to users table
-- Adds counter triggers for both tables
-- ============================================================

alter table public.users
  add column if not exists timetable_count integer not null default 0,
  add column if not exists checklist_count integer not null default 0;

-- Extend the existing increment_user_counter function to handle
-- timetables and checklists
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

-- Add triggers for timetables and checklists
drop trigger if exists timetables_counter on public.timetables;
create trigger timetables_counter
  after insert or delete on public.timetables
  for each row execute procedure public.increment_user_counter();

drop trigger if exists checklists_counter on public.checklists;
create trigger checklists_counter
  after insert or delete on public.checklists
  for each row execute procedure public.increment_user_counter();
