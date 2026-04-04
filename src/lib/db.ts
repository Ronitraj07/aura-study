// ============================================================
// Aura Study — Database helper functions
// Thin wrappers around supabase client calls
// ============================================================

import { supabase } from './supabase';
import type {
  DbUser, DbPPT, DbAssignment, DbNote, DbTimetable, DbChecklist,
  InsertPPT, InsertAssignment, InsertNote, InsertTimetable, InsertChecklist,
  UpdatePPT, UpdateAssignment, UpdateNote, UpdateTimetable, UpdateChecklist,
} from '@/types/database';

// ─── USER ──────────────────────────────────────────────────────
export async function getUser(userId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.error('getUser:', error); return null; }
  return data;
}

export async function upsertUser(user: Partial<DbUser> & { id: string; email: string }) {
  const { data, error } = await supabase
    .from('users')
    .upsert(user, { onConflict: 'id' })
    .select()
    .single();
  if (error) console.error('upsertUser:', error);
  return data;
}

// ─── PPTS ─────────────────────────────────────────────────────
export async function getPPTs(userId: string): Promise<DbPPT[]> {
  const { data, error } = await supabase
    .from('ppts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getPPTs:', error); return []; }
  return data ?? [];
}

export async function createPPT(payload: InsertPPT): Promise<DbPPT | null> {
  const { data, error } = await supabase
    .from('ppts')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createPPT:', error); return null; }
  return data;
}

export async function updatePPT(id: string, payload: UpdatePPT): Promise<DbPPT | null> {
  const { data, error } = await supabase
    .from('ppts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updatePPT:', error); return null; }
  return data;
}

export async function deletePPT(id: string): Promise<boolean> {
  const { error } = await supabase.from('ppts').delete().eq('id', id);
  if (error) { console.error('deletePPT:', error); return false; }
  return true;
}

// ─── ASSIGNMENTS ───────────────────────────────────────────────
export async function getAssignments(userId: string): Promise<DbAssignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAssignments:', error); return []; }
  return data ?? [];
}

export async function createAssignment(payload: InsertAssignment): Promise<DbAssignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createAssignment:', error); return null; }
  return data;
}

export async function updateAssignment(id: string, payload: UpdateAssignment): Promise<DbAssignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateAssignment:', error); return null; }
  return data;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) { console.error('deleteAssignment:', error); return false; }
  return true;
}

// ─── NOTES ─────────────────────────────────────────────────────
export async function getNotes(userId: string): Promise<DbNote[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getNotes:', error); return []; }
  return data ?? [];
}

export async function createNote(payload: InsertNote): Promise<DbNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createNote:', error); return null; }
  return data;
}

export async function updateNote(id: string, payload: UpdateNote): Promise<DbNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateNote:', error); return null; }
  return data;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) { console.error('deleteNote:', error); return false; }
  return true;
}

// ─── TIMETABLES ────────────────────────────────────────────────
export async function getTimetable(userId: string): Promise<DbTimetable | null> {
  const { data, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) { if (error.code !== 'PGRST116') console.error('getTimetable:', error); return null; }
  return data;
}

export async function upsertTimetable(payload: InsertTimetable & { id?: string }): Promise<DbTimetable | null> {
  const { data, error } = await supabase
    .from('timetables')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) { console.error('upsertTimetable:', error); return null; }
  return data;
}

// ─── CHECKLISTS ────────────────────────────────────────────────
export async function getChecklists(userId: string): Promise<DbChecklist[]> {
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) { console.error('getChecklists:', error); return []; }
  return data ?? [];
}

export async function createChecklist(payload: InsertChecklist): Promise<DbChecklist | null> {
  const { data, error } = await supabase
    .from('checklists')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createChecklist:', error); return null; }
  return data;
}

export async function updateChecklist(id: string, payload: UpdateChecklist): Promise<DbChecklist | null> {
  const { data, error } = await supabase
    .from('checklists')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateChecklist:', error); return null; }
  return data;
}

export async function deleteChecklist(id: string): Promise<boolean> {
  const { error } = await supabase.from('checklists').delete().eq('id', id);
  if (error) { console.error('deleteChecklist:', error); return false; }
  return true;
}

export async function reorderChecklists(items: { id: string; position: number }[]): Promise<boolean> {
  const updates = items.map(({ id, position }) =>
    supabase.from('checklists').update({ position }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.filter(r => r.error);
  if (failed.length) { console.error('reorderChecklists:', failed); return false; }
  return true;
}
