// ============================================================
// useNotesGenerator — Groq AI + Supabase autosave
// ✔ Research-enhanced: Groq double-pass (8b research → 70b generate)
// ✔ isResearching state exposed for UI loading stages
// ✔ researchSource attached to result for UI badge
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchResearch, buildResearchPreamble } from '@/lib/research';
import type { NoteHeading, NoteBullet } from '@/types/database';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface GeneratedNotes {
  title: string;
  headings: NoteHeading[];
  bullets: NoteBullet[];
  summary: string;
  keyTerms: string[];
  researchSource?: 'groq' | 'gemini' | 'none';
}

export interface NotesInput {
  topic: string;
  depth?: 'overview' | 'detailed';
}

// ── Prompt builder ──────────────────────────────────────────────
function buildPrompt(input: NotesInput, researchPreamble: string): string {
  const depthNote = input.depth === 'detailed'
    ? 'Provide comprehensive coverage with 4-6 major sections, 4-6 bullets per section.'
    : 'Provide a clear overview with 3-4 major sections, 3-5 bullets per section.';

  const researchSection = researchPreamble
    ? `${researchPreamble}create accurate, well-grounded study notes using the facts above as your foundation.\n\n`
    : '';

  return `${researchSection}You are an expert academic note-taker. Create structured study notes.

Topic: "${input.topic}"
Depth: ${input.depth ?? 'overview'} — ${depthNote}

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
  "keyTerms": ["<term 1>", "<term 2>", "<term 3>"]
}

Rules:
- Every heading in the headings array must have a corresponding bullets entry
- Level 1 headings are major sections, level 2 are subsections
- Bullets should be concise, scannable (max 20 words each)
- keyTerms: 5-8 important vocabulary words or concepts from the topic
- Summary must be written as complete sentences, not bullets`;
}

// ── Groq generation caller — routes through /api/generate ──────
async function callGroq(prompt: string): Promise<GeneratedNotes> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'notes',
      systemPrompt: 'You are an expert academic note-taker. Output ONLY valid JSON. No markdown. No explanation. No code blocks.',
      userPrompt: prompt,
      maxTokens: 3000,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Generation failed (HTTP ${res.status})`);
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
  const savedIdRef = useRef<string | null>(null);
  savedIdRef.current = savedId;

  // ── Save ──────────────────────────────────────────────────────
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

    try {
      const research = await fetchResearch(input.topic);
      setIsResearching(false);

      const preamble = buildResearchPreamble(research);
      const prompt = buildPrompt(input, preamble);
      const result = await callGroq(prompt);

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

  return {
    notes,
    savedId,
    isGenerating,
    isResearching,
    saveStatus,
    error,
    generate,
  };
}
