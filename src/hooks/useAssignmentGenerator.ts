// ============================================================
// useAssignmentGenerator — Groq AI + Supabase autosave
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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
}

export interface AssignmentInput {
  topic: string;
  wordCount: number;
  tone: AssignmentTone;
}

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];

function buildPrompt(input: AssignmentInput): string {
  const toneMap: Record<AssignmentTone, string> = {
    formal: 'Use formal, professional language. Third person perspective. No contractions.',
    academic: 'Use academic language with proper citations style (Author, Year). Include introduction, body paragraphs with topic sentences, and conclusion. Use hedging language where appropriate.',
    casual: 'Use approachable, clear language. First or second person is acceptable. Engaging tone.',
  };

  return `You are an expert academic writer. Write a structured ${input.wordCount}-word assignment.

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

async function callGroq(prompt: string): Promise<GeneratedAssignment> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set in .env');

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw) as GeneratedAssignment;
      if (!parsed.blocks || !Array.isArray(parsed.blocks)) throw new Error('Invalid response');
      return parsed;
    } catch (e) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      console.warn(`Model ${model} failed, trying next...`, e);
    }
  }
  throw new Error('All models failed');
}

export function useAssignmentGenerator() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<GeneratedAssignment | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIdRef = useRef<string | null>(null);
  savedIdRef.current = savedId;

  const saveToSupabase = useCallback(async (
    data: GeneratedAssignment,
    input: AssignmentInput,
    existingId: string | null,
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const payload = {
        user_id: user.id,
        topic: input.topic,
        word_count: data.wordCount,
        tone: input.tone,
        content: data.rawContent,
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
        // increment counter
        await supabase.rpc('increment_user_counter', { user_id: user.id, col: 'assignments_count' });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('saveAssignment:', e);
      setSaveStatus('error');
    }
  }, [user]);

  const generate = useCallback(async (input: AssignmentInput) => {
    if (!input.topic.trim()) { setError('Please enter a topic.'); return; }
    setIsGenerating(true);
    setError(null);
    setAssignment(null);
    setSavedId(null);
    savedIdRef.current = null;

    try {
      const prompt = buildPrompt(input);
      const result = await callGroq(prompt);
      setAssignment(result);
      await saveToSupabase(result, input, null);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [saveToSupabase]);

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

  return { assignment, savedId, isGenerating, saveStatus, error, generate, updateContent };
}
