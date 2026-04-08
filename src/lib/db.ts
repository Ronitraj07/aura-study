// ============================================================
// Aura Study — Database helper functions
// Thin wrappers around supabase client calls
// ✔ #6  upsertTimetable uses onConflict: 'user_id'
// ✔ #7  getTimetable uses maybeSingle() — no error suppression
// ✔ #8  reorderChecklists uses single batch upsert
// ✔ #15 Version helpers added for all 4 entity types
// ============================================================

import { supabase } from './supabase';
import type {
  DbUser, DbPPT, DbPPTVersion, DbAssignment, DbAssignmentVersion,
  DbNote, DbNoteVersion, DbTimetable, DbTimetableVersion, DbChecklist,
  DbSmartSession, DbSmartOutput,
  InsertPPT, InsertAssignment, InsertNote, InsertTimetable, InsertChecklist,
  InsertSmartSession, InsertSmartOutput,
  UpdatePPT, UpdateAssignment, UpdateNote, UpdateTimetable, UpdateChecklist,
  UpdateSmartSession,
} from '@/types/database';

// ─── USER ──────────────────────────────────────────────────────────
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

// ─── PPTS ─────────────────────────────────────────────────────────
export async function getPPTs(userId: string): Promise<DbPPT[]> {
  const { data, error } = await supabase
    .from('ppts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getPPTs:', error); return []; }
  return data ?? [];
}

export async function getPPT(id: string): Promise<DbPPT | null> {
  const { data, error } = await supabase
    .from('ppts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getPPT:', error); return null; }
  return data;
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

// ─── PPT VERSIONS ────────────────────────────────────────────────
export async function getPPTVersions(pptId: string): Promise<DbPPTVersion[]> {
  const { data, error } = await supabase
    .from('ppt_versions')
    .select('*')
    .eq('ppt_id', pptId)
    .order('version', { ascending: false });
  if (error) { console.error('getPPTVersions:', error); return []; }
  return data ?? [];
}

export async function createPPTVersion(
  payload: Omit<DbPPTVersion, 'id' | 'created_at'>
): Promise<DbPPTVersion | null> {
  const { data, error } = await supabase
    .from('ppt_versions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createPPTVersion:', error); return null; }
  return data;
}

// ─── ASSIGNMENTS ──────────────────────────────────────────────────
export async function getAssignments(userId: string): Promise<DbAssignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getAssignments:', error); return []; }
  return data ?? [];
}

export async function getAssignment(id: string): Promise<DbAssignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getAssignment:', error); return null; }
  return data;
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

// ─── ASSIGNMENT VERSIONS ──────────────────────────────────────────
export async function getAssignmentVersions(assignmentId: string): Promise<DbAssignmentVersion[]> {
  const { data, error } = await supabase
    .from('assignment_versions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('version', { ascending: false });
  if (error) { console.error('getAssignmentVersions:', error); return []; }
  return data ?? [];
}

export async function createAssignmentVersion(
  payload: Omit<DbAssignmentVersion, 'id' | 'created_at'>
): Promise<DbAssignmentVersion | null> {
  const { data, error } = await supabase
    .from('assignment_versions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createAssignmentVersion:', error); return null; }
  return data;
}

// ─── NOTES ──────────────────────────────────────────────────────────
export async function getNotes(userId: string): Promise<DbNote[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getNotes:', error); return []; }
  return data ?? [];
}

export async function getNote(id: string): Promise<DbNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getNote:', error); return null; }
  return data;
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

// ─── NOTE VERSIONS ──────────────────────────────────────────────────
export async function getNoteVersions(noteId: string): Promise<DbNoteVersion[]> {
  const { data, error } = await supabase
    .from('note_versions')
    .select('*')
    .eq('note_id', noteId)
    .order('version', { ascending: false });
  if (error) { console.error('getNoteVersions:', error); return []; }
  return data ?? [];
}

export async function createNoteVersion(
  payload: Omit<DbNoteVersion, 'id' | 'created_at'>
): Promise<DbNoteVersion | null> {
  const { data, error } = await supabase
    .from('note_versions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createNoteVersion:', error); return null; }
  return data;
}

// ─── TIMETABLES ───────────────────────────────────────────────────
export async function getTimetable(userId: string): Promise<DbTimetable | null> {
  // Fix #7: maybeSingle() returns null (not an error) when no row exists
  // No need to suppress PGRST116 — the API contract is cleaner
  const { data, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('getTimetable:', error); return null; }
  return data;
}

export async function upsertTimetable(
  payload: InsertTimetable & { id?: string }
): Promise<DbTimetable | null> {
  // Fix #6: schema has unique(user_id) on timetables — one row per user.
  // onConflict must target 'user_id', not 'id', so that inserting without
  // an id still correctly merges with the existing row for that user.
  const { data, error } = await supabase
    .from('timetables')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) { console.error('upsertTimetable:', error); return null; }
  return data;
}

// ─── TIMETABLE VERSIONS ──────────────────────────────────────────────
export async function getTimetableVersions(timetableId: string): Promise<DbTimetableVersion[]> {
  const { data, error } = await supabase
    .from('timetable_versions')
    .select('*')
    .eq('timetable_id', timetableId)
    .order('version', { ascending: false });
  if (error) { console.error('getTimetableVersions:', error); return []; }
  return data ?? [];
}

export async function createTimetableVersion(
  payload: Omit<DbTimetableVersion, 'id' | 'created_at'>
): Promise<DbTimetableVersion | null> {
  const { data, error } = await supabase
    .from('timetable_versions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createTimetableVersion:', error); return null; }
  return data;
}

// ─── CHECKLISTS ───────────────────────────────────────────────────
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

export async function reorderChecklists(
  items: { id: string; position: number }[]
): Promise<boolean> {
  // Fix #8: replaced N individual .update() calls with a single batch .upsert()
  // For 20 items, this goes from 20 round trips to 1
  const { error } = await supabase
    .from('checklists')
    .upsert(
      items.map(({ id, position }) => ({ id, position })),
      { onConflict: 'id' }
    );
  if (error) { console.error('reorderChecklists:', error); return false; }
  return true;
}

// ─── SMART MODE ───────────────────────────────────────────────────
export async function getSmartSessions(userId: string): Promise<DbSmartSession[]> {
  const { data, error } = await supabase
    .from('smart_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getSmartSessions:', error); return []; }
  return data ?? [];
}

export async function createSmartSession(
  payload: InsertSmartSession
): Promise<DbSmartSession | null> {
  const { data, error } = await supabase
    .from('smart_sessions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createSmartSession:', error); return null; }
  return data;
}

export async function updateSmartSession(
  id: string,
  payload: UpdateSmartSession
): Promise<DbSmartSession | null> {
  const { data, error } = await supabase
    .from('smart_sessions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateSmartSession:', error); return null; }
  return data;
}

export async function getSmartOutputs(sessionId: string): Promise<DbSmartOutput[]> {
  const { data, error } = await supabase
    .from('smart_outputs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getSmartOutputs:', error); return []; }
  return data ?? [];
}

export async function createSmartOutput(
  payload: InsertSmartOutput
): Promise<DbSmartOutput | null> {
  const { data, error } = await supabase
    .from('smart_outputs')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createSmartOutput:', error); return null; }
  return data;
}

// ─── CHECKLIST VERSIONS ───────────────────────────────────────────────
export async function getChecklistVersions(userId: string, checklistId?: string): Promise<DbChecklistVersion[]> {
  let query = supabase
    .from('checklist_versions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (checklistId) {
    query = query.eq('checklist_id', checklistId);
  }
  
  const { data, error } = await query;
  if (error) { console.error('getChecklistVersions:', error); return []; }
  return data ?? [];
}

export async function createChecklistVersion(payload: InsertChecklistVersion): Promise<DbChecklistVersion | null> {
  const { data, error } = await supabase
    .from('checklist_versions')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createChecklistVersion:', error); return null; }
  return data;
}
