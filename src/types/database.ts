// ============================================================
// Aura Study — Supabase Database Types
// ✔ Synced with migrations 001–009
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
  image_query?: string;
  layout_type?: 'title' | 'content' | 'two-column' | 'image-focus' | 'quote' | 'stats';
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

// ─── Smart Mode (migration 009) ───────────────────────────────
export interface SmartSubjectUnit {
  name: string;
  topics: string[];
}

export interface SmartSubject {
  name: string;
  units: SmartSubjectUnit[];
}

// ─── Database Row Types ────────────────────────────────────────

/** migration 001 + 008 */
export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  ppts_count: number;
  assignments_count: number;
  notes_count: number;
  timetable_count: number;    // migration 008
  checklist_count: number;    // migration 008
  created_at: string;
  updated_at: string;
}

/** migration 001 + 003 */
export interface DbPPT {
  id: string;
  user_id: string;
  topic: string;
  title: string;              // migration 003
  mode: 'basic' | 'high_quality';
  presentation_type: 'academic' | 'business' | 'creative';  // migration 003
  design_theme: 'modern' | 'minimal' | 'corporate';          // migration 003
  slide_count: number;
  slides: GeneratedSlide[];
  created_at: string;
  updated_at: string;
}

/** A single saved version of a PPT (version history row) — migration 002 + 003 */
export interface DbPPTVersion {
  id: string;
  ppt_id: string;
  user_id: string;
  version: number;
  topic: string;
  mode: 'basic' | 'high_quality';
  presentation_type: 'academic' | 'business' | 'creative';  // migration 003
  design_theme: 'modern' | 'minimal' | 'corporate';          // migration 003
  slides: GeneratedSlide[];
  created_at: string;
}

/** migration 001 + 005 */
export interface DbAssignment {
  id: string;
  user_id: string;
  topic: string;
  word_count: number;
  tone: 'formal' | 'academic' | 'casual';
  mode: 'detailed' | 'exam_ready' | 'quick_notes';  // migration 005
  citation_style: 'APA' | 'MLA' | 'none';           // migration 005
  content: string;
  content_html: string;                              // migration 005
  created_at: string;
  updated_at: string;
}

/** migration 005 */
export interface DbAssignmentVersion {
  id: string;
  assignment_id: string;
  user_id: string;
  version: number;
  content: string;
  content_html: string;
  topic: string;
  mode: 'detailed' | 'exam_ready' | 'quick_notes';
  tone: 'formal' | 'academic' | 'casual';
  citation_style: 'APA' | 'MLA' | 'none';
  created_at: string;
}

/** migration 001 + 006 */
export interface DbNote {
  id: string;
  user_id: string;
  topic: string;
  depth: 'basic' | 'detailed' | 'revision';  // migration 006
  headings: NoteHeading[];
  bullets: NoteBullet[];
  summary: string;
  content_json: Record<string, unknown>;      // migration 006
  exam_tips: string;                          // migration 006
  quick_revision: string;                     // migration 006
  created_at: string;
  updated_at: string;
}

/** migration 006 */
export interface DbNoteVersion {
  id: string;
  note_id: string;
  user_id: string;
  version: number;
  content_json: Record<string, unknown>;
  topic: string;
  depth: 'basic' | 'detailed' | 'revision';
  exam_tips: string;
  quick_revision: string;
  created_at: string;
}

/** migration 001 + 007 */
export interface DbTimetable {
  id: string;
  user_id: string;
  name: string;
  subjects: Subject[];
  schedule: Schedule;
  mode: 'normal' | 'exam';                                   // migration 007
  preferred_study_time: 'morning' | 'evening' | 'mixed';     // migration 007
  hours_per_day: number;                                     // migration 007
  created_at: string;
  updated_at: string;
}

/** migration 007 */
export interface DbTimetableVersion {
  id: string;
  timetable_id: string;
  user_id: string;
  version: number;
  schedule: Schedule;
  subjects: Subject[];
  name: string;
  mode: 'normal' | 'exam';
  created_at: string;
}

/** migration 001 + 004 */
export interface DbChecklist {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  position: number;
  priority: 'low' | 'medium' | 'high';                      // migration 004
  category: 'study' | 'personal' | 'project';               // migration 004
  due_date: string | null;                                   // migration 004 — ISO date string (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
}

/** Checklist task data structure */
export interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'study' | 'personal' | 'project';
  due_date?: string | null;
  completed_at?: string | null;
  estimated_minutes?: number;
  position: number;
}

/** migration 010 — Checklist version snapshot */
export interface DbChecklistVersion {
  id: string;
  checklist_id: string;
  user_id: string;
  version_name: string;
  tasks: ChecklistTask[];
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  created_at: string;
}

/** migration 009 — Smart Mode session */
export interface DbSmartSession {
  id: string;
  user_id: string;
  syllabus_filename: string;
  extracted_text: string;
  subjects_json: SmartSubject[];
  status: 'pending' | 'extracting' | 'structuring' | 'ready' | 'generating' | 'done' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** migration 009 — Smart Mode per-topic output record */
export interface DbSmartOutput {
  id: string;
  session_id: string;
  user_id: string;
  subject: string;
  unit: string;
  topic: string;
  output_type: 'ppt' | 'notes' | 'assignment' | 'timetable';
  output_id: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  created_at: string;
}

// ─── Insert Payloads (omit auto-generated fields) ─────────────
export type InsertPPT = Omit<DbPPT, 'id' | 'created_at' | 'updated_at'>;
export type InsertAssignment = Omit<DbAssignment, 'id' | 'created_at' | 'updated_at'>;
export type InsertNote = Omit<DbNote, 'id' | 'created_at' | 'updated_at'>;
export type InsertTimetable = Omit<DbTimetable, 'id' | 'created_at' | 'updated_at'>;
export type InsertChecklist = Omit<DbChecklist, 'id' | 'created_at' | 'updated_at'>;
export type InsertChecklistVersion = Omit<DbChecklistVersion, 'id' | 'created_at'>;
export type InsertSmartSession = Omit<DbSmartSession, 'id' | 'created_at' | 'updated_at'>;
export type InsertSmartOutput = Omit<DbSmartOutput, 'id' | 'created_at'>;

// ─── Update Payloads (all optional except id) ─────────────────
export type UpdatePPT = Partial<Omit<DbPPT, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateAssignment = Partial<Omit<DbAssignment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateNote = Partial<Omit<DbNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateTimetable = Partial<Omit<DbTimetable, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateChecklist = Partial<Omit<DbChecklist, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateSmartSession = Partial<Omit<DbSmartSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
