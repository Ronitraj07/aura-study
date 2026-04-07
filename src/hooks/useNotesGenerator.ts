// ============================================================
// useNotesGenerator — Groq AI + Supabase autosave
// ✔ Research-enhanced: Groq double-pass (8b research → 70b generate)
// ✔ isResearching state exposed for UI loading stages
// ✔ researchSource attached to result for UI badge
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ✔ C5: 'exam' depth mode — exam_tips, mnemonics, cheatsheet
// ✔ C10: version snapshot before every overwrite + loadVersions/restoreVersion
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchResearch, buildResearchPreamble } from '@/lib/research';
import {
  fetchNotesVersions,
  createNotesVersion,
  type NotesVersion,
} from '@/lib/database';
import type { NoteHeading, NoteBullet } from '@/types/database';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ExamTip {
  question: string;
  answer:   string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Mnemonic {
  concept: string;
  device:  string;
  explanation: string;
}

export interface CheatsheetEntry {
  label: string;
  value: string;
}

export interface GeneratedNotes {
  title: string;
  headings: NoteHeading[];
  bullets: NoteBullet[];
  summary: string;
  keyTerms: string[];
  exam_tips?:  ExamTip[];
  mnemonics?:  Mnemonic[];
  cheatsheet?: CheatsheetEntry[];
  researchSource?: 'groq' | 'gemini' | 'none';
}

export interface NotesInput {
  topic: string;
  depth?: 'overview' | 'detailed' | 'exam';
  subtopics?: string[];
  format?: 'cornell' | 'outline' | 'concept_map' | 'flashcards' | 'traditional';
  studentLevel?: 'high_school' | 'undergraduate' | 'graduate';
  examType?: 'multiple_choice' | 'essay' | 'practical' | 'mixed';
  includeQuestions?: boolean;
  includeDiagrams?: boolean;
  studyDuration?: '1_hour' | '1_day' | '1_week';
  includeExamTips?: boolean;
  includeMnemonics?: boolean;
  includeCheatsheet?: boolean;
}

// ── Prompt builder ──────────────────────────────────────────────
function buildPrompt(input: NotesInput, researchPreamble: string): string {
  const isExam = input.depth === 'exam' || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet;

  const depthNote = input.depth === 'exam'
    ? 'Provide comprehensive exam-focused coverage with 4-6 major sections, 4-6 bullets per section.'
    : input.depth === 'detailed'
    ? 'Provide comprehensive coverage with 4-6 major sections, 4-6 bullets per section.'
    : 'Provide a clear overview with 3-4 major sections, 3-5 bullets per section.';

  const researchSection = researchPreamble
    ? `${researchPreamble}create accurate, well-grounded study notes using the facts above as your foundation.\n\n`
    : '';

  // Build subtopics section
  const subtopicsSection = input.subtopics && input.subtopics.length > 0
    ? `\nFocus Areas: Focus specifically on these subtopics: ${input.subtopics.join(', ')}`
    : '';

  // Build format section
  const formatMap = {
    cornell: 'Structure notes in Cornell format with clear sections for notes, cues, and summary.',
    outline: 'Use hierarchical outline format with numbered sections and subsections.',
    concept_map: 'Create conceptual connections showing relationships between topics.',
    flashcards: 'Format content suitable for flashcard creation with key terms and definitions.',
    traditional: 'Use traditional note-taking format with headers and bullet points.'
  };
  
  const formatSection = input.format && input.format !== 'traditional'
    ? `\nFormat Instructions: ${formatMap[input.format]}`
    : '';

  // Build student level section
  const levelMap = {
    high_school: 'Use foundational concepts and clear explanations suitable for high school level.',
    undergraduate: 'Use intermediate depth with college-level terminology and concepts.',
    graduate: 'Use advanced, specialized terminology and in-depth analysis suitable for graduate level.'
  };

  const levelSection = input.studentLevel
    ? `\nStudent Level: ${levelMap[input.studentLevel]}`
    : '';

  // Build exam type section
  const examTypeSection = input.examType
    ? `\nExam Preparation: Structure content for ${input.examType.replace('_', ' ')} exam format.`
    : '';

  // Build study duration section
  const durationMap = {
    '1_hour': 'Optimize for quick review session (1 hour study time).',
    '1_day': 'Structure for day-long study session with detailed coverage.',
    '1_week': 'Create comprehensive notes for extended study period.'
  };

  const durationSection = input.studyDuration
    ? `\nStudy Duration: ${durationMap[input.studyDuration]}`
    : '';

  // Build additional features sections
  const questionsSection = input.includeQuestions
    ? '\nInclude practice questions and review questions throughout the notes.'
    : '';

  const diagramsSection = input.includeDiagrams
    ? '\nInclude descriptions of key diagrams and visual explanations where appropriate.'
    : '';

  // Determine which exam features to include
  const includeExamTips = isExam || input.includeExamTips;
  const includeMnemonics = isExam || input.includeMnemonics;
  const includeCheatsheet = isExam || input.includeCheatsheet;

  const examJsonFields = (includeExamTips || includeMnemonics || includeCheatsheet) ? `,
  ${includeExamTips ? `"exam_tips": [
    {
      "question": "<likely exam question>",
      "answer": "<concise 1-2 sentence answer>",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]` : ''}${includeExamTips && (includeMnemonics || includeCheatsheet) ? ',' : ''}
  ${includeMnemonics ? `"mnemonics": [
    {
      "concept": "<concept or list to remember>",
      "device": "<mnemonic device e.g. acronym, rhyme, story>",
      "explanation": "<what each part stands for>"
    }
  ]` : ''}${includeMnemonics && includeCheatsheet ? ',' : ''}
  ${includeCheatsheet ? `"cheatsheet": [
    { "label": "<term or formula or date>", "value": "<one-line definition or value>" }
  ]` : ''}` : '';

  const examInstructions = [];
  if (includeExamTips) examInstructions.push('- exam_tips: 5-8 likely exam questions with concise answers and difficulty ratings');
  if (includeMnemonics) examInstructions.push('- mnemonics: 2-4 memory devices for key concepts, lists, or sequences');
  if (includeCheatsheet) examInstructions.push('- cheatsheet: 8-12 key facts, formulas, dates, or definitions in label:value pairs');
  
  const examInstructionsText = examInstructions.length > 0 ? `\n${examInstructions.join('\n')}` : '';

  return `${researchSection}You are an expert academic note-taker. Create structured study notes.

Topic: "${input.topic}"
Depth: ${input.depth ?? 'overview'} — ${depthNote}${subtopicsSection}${formatSection}${levelSection}${examTypeSection}${durationSection}${questionsSection}${diagramsSection}

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Strict format:
{
  "title": "<notes title>",
  "headings": [
    { "level": 1, "text": "<major section heading>" },
    { "level": 2, "text": "<subsection heading>" }
  ],
  "bullets": [
    {
      "heading": "<section heading this belongs to>",
      "points": ["<point 1>", "<point 2>", "<point 3>"]
    }
  ],
  "summary": "<3-4 sentence executive summary of the entire topic>",
  "keyTerms": ["<term 1>", "<term 2>", "<term 3>"]${examJsonFields}
}

Rules:
- Every heading in the headings array must have a corresponding bullets entry
- Level 1 headings are major sections, level 2 are subsections
- Bullets should be concise, scannable (max 20 words each)
- keyTerms: 5-8 important vocabulary words or concepts from the topic
- Summary must be written as complete sentences, not bullets${examInstructionsText}`;
}

// ── Groq generation caller — routes through /api/generate ──────
async function callGroq(prompt: string, input: NotesInput): Promise<GeneratedNotes> {
  const isExam = input.depth === 'exam' || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet;
  
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'notes',
      systemPrompt: 'You are an expert academic note-taker. Output ONLY valid JSON. No markdown. No explanation. No code blocks.',
      userPrompt: prompt,
      maxTokens: isExam ? 5000 : 3000,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Generation failed (HTTP ${res.status})`);
  }

  const parsed = await res.json() as GeneratedNotes;
  if (!parsed.bullets || !Array.isArray(parsed.bullets)) {
    throw new Error('Invalid response: missing bullets');
  }
  return parsed;
}

// ── Hook ───────────────────────────────────────────────────────────
export function useNotesGenerator() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<GeneratedNotes | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<NotesVersion[]>([]);
  const savedIdRef = useRef<string | null>(null);
  savedIdRef.current = savedId;

  // ── Save (with snapshot-before-overwrite) ─────────────────────
  const saveToSupabase = useCallback(async (
    data: GeneratedNotes,
    input: NotesInput,
    existingId: string | null,
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const payload = {
        user_id:  user.id,
        topic:    input.topic,
        headings: data.headings as any,
        bullets:  data.bullets as any,
        summary:  data.summary,
      };

      if (existingId) {
        // Snapshot current state before overwriting
        const { data: current } = await supabase
          .from('notes')
          .select('topic, headings, bullets, summary')
          .eq('id', existingId)
          .single();

        if (current) {
          await createNotesVersion(existingId, user.id, {
            topic:    current.topic,
            headings: current.headings,
            bullets:  current.bullets,
            summary:  current.summary,
          });
        }

        await supabase.from('notes').update(payload).eq('id', existingId);
        setSavedId(existingId);
        savedIdRef.current = existingId;
      } else {
        const { data: row, error: err } = await supabase
          .from('notes').insert(payload).select().single();
        if (err) throw err;
        setSavedId(row.id);
        savedIdRef.current = row.id;
        await supabase.rpc('increment_user_counter', { user_id: user.id, col: 'notes_count' });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('[Notes] saveToSupabase:', e);
      setSaveStatus('error');
    }
  }, [user]);

  // ── Generate (research pass → generation pass) ────────────────
  const generate = useCallback(async (input: NotesInput) => {
    if (!input.topic.trim()) { setError('Please enter a topic.'); return; }

    setIsGenerating(true);
    setIsResearching(true);
    setError(null);
    setNotes(null);
    setSavedId(null);
    savedIdRef.current = null;
    setVersions([]);

    try {
      const research = await fetchResearch(input.topic);
      setIsResearching(false);

      const preamble = buildResearchPreamble(research);
      const prompt = buildPrompt(input, preamble);
      const result = await callGroq(prompt, input);

      result.researchSource = research.source;

      setNotes(result);
      await saveToSupabase(result, input, null);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsResearching(false);
    }
  }, [saveToSupabase]);

  // ── Load version history ──────────────────────────────────────
  const loadVersions = useCallback(async (notesId: string) => {
    const data = await fetchNotesVersions(notesId);
    setVersions(data);
  }, []);

  // ── Restore version ───────────────────────────────────────────
  const restoreVersion = useCallback(async (version: NotesVersion) => {
    if (!savedIdRef.current || !user) return;
    setSaveStatus('saving');

    // Snapshot current before restoring
    if (notes) {
      await createNotesVersion(savedIdRef.current, user.id, {
        topic:    notes.title,
        headings: notes.headings,
        bullets:  notes.bullets,
        summary:  notes.summary,
      });
    }

    const { error: restoreErr } = await supabase
      .from('notes')
      .update({
        headings: version.headings,
        bullets:  version.bullets,
        summary:  version.summary,
        topic:    version.topic,
      })
      .eq('id', savedIdRef.current);

    if (restoreErr) {
      setSaveStatus('error');
    } else {
      setNotes(prev => prev ? {
        ...prev,
        title:    version.topic,
        headings: version.headings as any,
        bullets:  version.bullets  as any,
        summary:  version.summary,
      } : prev);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Refresh version list
      loadVersions(savedIdRef.current!);
    }
  }, [notes, user, loadVersions]);

  return {
    notes,
    savedId,
    isGenerating,
    isResearching,
    saveStatus,
    error,
    versions,
    generate,
    loadVersions,
    restoreVersion,
  };
}
