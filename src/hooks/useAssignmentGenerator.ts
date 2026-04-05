// ============================================================
// useAssignmentGenerator — Groq AI + Supabase autosave
// ✔ Research-enhanced: Groq double-pass (8b research → 70b generate)
// ✔ isResearching state exposed for UI loading stages
// ✔ researchSource attached to result for UI badge
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchResearch, buildResearchPreamble } from '@/lib/research';

export type AssignmentTone = 'formal' | 'academic' | 'casual';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AssignmentBlock {
  type: 'heading' | 'subheading' | 'paragraph' | 'quote' | 'conclusion';
  text: string;
}

export interface GeneratedAssignment {
  title: string;
  wordCount: number;
  blocks: AssignmentBlock[];
  rawContent: string;
  researchSource?: 'groq' | 'gemini' | 'none';
}

export interface AssignmentInput {
  topic: string;
  wordCount: number;
  tone: AssignmentTone;
}

// ── Prompt builder ──────────────────────────────────────────────
function buildPrompt(input: AssignmentInput, researchPreamble: string): string {
  const toneMap: Record<AssignmentTone, string> = {
    formal: 'Use formal, professional language. Third person perspective. No contractions.',
    academic: 'Use academic language with proper citations style (Author, Year). Include introduction, body paragraphs with topic sentences, and conclusion. Use hedging language where appropriate.',
    casual: 'Use approachable, clear language. First or second person is acceptable. Engaging tone.',
  };

  const researchSection = researchPreamble
    ? `${researchPreamble}write a well-researched assignment grounded in the facts above.\n\n`
    : '';

  return `${researchSection}You are an expert academic writer. Write a structured ${input.wordCount}-word assignment.

Topic: "${input.topic}"
Tone: ${input.tone} — ${toneMap[input.tone]}
Target word count: approximately ${input.wordCount} words

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Strict format:
{
  "title": "<assignment title>",
  "wordCount": <actual word count as integer>,
  "blocks": [
    { "type": "heading", "text": "Introduction" },
    { "type": "paragraph", "text": "<paragraph content>" },
    { "type": "subheading", "text": "<section title>" },
    { "type": "paragraph", "text": "<paragraph content>" },
    { "type": "conclusion", "text": "<conclusion paragraph>" }
  ],
  "rawContent": "<full assignment as plain text>"
}

Block types allowed: heading, subheading, paragraph, quote, conclusion.
Ensure the assignment is well-structured with:
- A clear introduction that defines the topic
- 2-4 body sections with subheadings
- Specific examples or evidence in each section
- A strong conclusion that synthesises key points
- Approximately ${input.wordCount} words total in rawContent`;
}

// ── Groq generation caller — routes through /api/generate ──────
async function callGroq(prompt: string): Promise<GeneratedAssignment> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'assignment',
      systemPrompt: 'You are an expert academic writer. Output ONLY valid JSON. No markdown. No explanation. No code blocks.',
      userPrompt: prompt,
      maxTokens: 4096,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Generation failed (HTTP ${res.status})`);
  }

  const parsed = await res.json() as GeneratedAssignment;
  if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
    throw new Error('Invalid response: missing blocks');
  }
  return parsed;
}

// ── Hook ───────────────────────────────────────────────────────────
export function useAssignmentGenerator() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<GeneratedAssignment | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIdRef = useRef<string | null>(null);
  savedIdRef.current = savedId;

  // ── Save ──────────────────────────────────────────────────────
  const saveToSupabase = useCallback(async (
    data: GeneratedAssignment,
    input: AssignmentInput,
    existingId: string | null,
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const payload = {
        user_id:    user.id,
        topic:      input.topic,
        word_count: data.wordCount,
        tone:       input.tone,
        content:    data.rawContent,
      };

      if (existingId) {
        await supabase.from('assignments').update(payload).eq('id', existingId);
        setSavedId(existingId);
        savedIdRef.current = existingId;
      } else {
        const { data: row, error: err } = await supabase
          .from('assignments').insert(payload).select().single();
        if (err) throw err;
        setSavedId(row.id);
        savedIdRef.current = row.id;
        await supabase.rpc('increment_user_counter', { user_id: user.id, col: 'assignments_count' });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('[Assignment] saveToSupabase:', e);
      setSaveStatus('error');
    }
  }, [user]);

  // ── Generate (research pass → generation pass) ────────────────
  const generate = useCallback(async (input: AssignmentInput) => {
    if (!input.topic.trim()) { setError('Please enter a topic.'); return; }

    setIsGenerating(true);
    setIsResearching(true);
    setError(null);
    setAssignment(null);
    setSavedId(null);
    savedIdRef.current = null;

    try {
      const research = await fetchResearch(input.topic);
      setIsResearching(false);

      const preamble = buildResearchPreamble(research);
      const prompt = buildPrompt(input, preamble);
      const result = await callGroq(prompt);

      result.researchSource = research.source;

      setAssignment(result);
      await saveToSupabase(result, input, null);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsResearching(false);
    }
  }, [saveToSupabase]);

  // ── Inline edit + debounced autosave ─────────────────────────
  const updateContent = useCallback((newRaw: string) => {
    setAssignment(prev => {
      if (!prev) return prev;
      const updated = { ...prev, rawContent: newRaw };
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (savedIdRef.current) {
          supabase.from('assignments')
            .update({ content: newRaw })
            .eq('id', savedIdRef.current);
        }
      }, 1500);
      return updated;
    });
  }, []);

  return {
    assignment,
    savedId,
    isGenerating,
    isResearching,
    saveStatus,
    error,
    generate,
    updateContent,
  };
}
