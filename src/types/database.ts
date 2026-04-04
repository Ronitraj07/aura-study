// ============================================================
// Aura Study — Supabase Database Types
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Slide (PPT) ─────────────────────────────────────────────
/** Legacy minimal slide shape stored in DB before L4 */
export interface Slide {
  slide_number: number;
  title: string;
  content: string[];      // bullet points
  design_hint?: string;
}

/** Full slide shape produced by the AI generator */
export interface GeneratedSlide {
  slide_number: number;
  title: string;
  subtitle?: string;
  content: string[];
  visual_suggestion?: string;
  layout_type?: 'title' | 'content' | 'two-column' | 'image-focus';
  speaker_notes?: string;
  design_hint?: string;   // kept for backwards compat
}

// ─── Timetable ────────────────────────────────────────────────
export interface Subject {
  name: string;
  color: string;          // hex color
  hoursPerWeek: number;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  subject: string;
  startTime: string;      // "09:00"
  endTime: string;        // "10:00"
}

export type Schedule = Record<DayOfWeek, TimeSlot[]>;

// ─── Notes ────────────────────────────────────────────────────
export interface NoteHeading {
  level: 1 | 2 | 3;
  text: string;
}

export interface NoteBullet {
  heading: string;
  points: string[];
}

// ─── Database Row Types ────────────────────────────────────────
export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  ppts_count: number;
  assignments_count: number;
  notes_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbPPT {
  id: string;
  user_id: string;
  topic: string;
  title: string;
  mode: 'basic' | 'high_quality';
  presentation_type: 'academic' | 'business' | 'creative';
  design_theme: 'modern' | 'minimal' | 'corporate';
  slide_count: number;
  slides: GeneratedSlide[];
  created_at: string;
  updated_at: string;
}

/** A single saved version of a PPT (version history row) */
export interface DbPPTVersion {
  id: string;
  ppt_id: string;
  user_id: string;
  version: number;
  topic: string;
  mode: 'basic' | 'high_quality';
  presentation_type: 'academic' | 'business' | 'creative';
  design_theme: 'modern' | 'minimal' | 'corporate';
  slides: GeneratedSlide[];
  created_at: string;
}

export interface DbAssignment {
  id: string;
  user_id: string;
  topic: string;
  word_count: number;
  tone: 'formal' | 'academic' | 'casual';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbNote {
  id: string;
  user_id: string;
  topic: string;
  headings: NoteHeading[];
  bullets: NoteBullet[];
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface DbTimetable {
  id: string;
  user_id: string;
  name: string;
  subjects: Subject[];
  schedule: Schedule;
  created_at: string;
  updated_at: string;
}

export interface DbChecklist {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// ─── Insert Payloads (omit auto-generated fields) ─────────────
export type InsertPPT = Omit<DbPPT, 'id' | 'created_at' | 'updated_at'>;
export type InsertAssignment = Omit<DbAssignment, 'id' | 'created_at' | 'updated_at'>;
export type InsertNote = Omit<DbNote, 'id' | 'created_at' | 'updated_at'>;
export type InsertTimetable = Omit<DbTimetable, 'id' | 'created_at' | 'updated_at'>;
export type InsertChecklist = Omit<DbChecklist, 'id' | 'created_at' | 'updated_at'>;

// ─── Update Payloads (all optional except id) ─────────────────
export type UpdatePPT = Partial<Omit<DbPPT, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateAssignment = Partial<Omit<DbAssignment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateNote = Partial<Omit<DbNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateTimetable = Partial<Omit<DbTimetable, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateChecklist = Partial<Omit<DbChecklist, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
