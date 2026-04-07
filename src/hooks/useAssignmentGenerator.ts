// ============================================================
// useAssignmentGenerator — Groq AI + Supabase autosave
// ✔ Research-enhanced: Groq double-pass (8b research → 70b generate)
// ✔ isResearching state exposed for UI loading stages
// ✔ researchSource attached to result for UI badge
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ✔ C10: version snapshot before every overwrite + loadVersions/restoreVersion
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchResearch, buildResearchPreamble } from '@/lib/research';
import {
  fetchAssignmentVersions,
  createAssignmentVersion,
  type AssignmentVersion,
} from '@/lib/database';

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
  subtopics?: string[];
  requirements?: string;
  citationStyle?: 'APA' | 'MLA' | 'none';
  includeExamples?: boolean;
  formatOption?: 'structured' | 'essay' | 'bullet_points';
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

  // Build subtopics section
  const subtopicsSection = input.subtopics && input.subtopics.length > 0
    ? `\nFocus Areas: ${input.subtopics.join(', ')}\nEnsure the assignment addresses these specific subtopics.`
    : '';

  // Build requirements section
  const requirementsSection = input.requirements
    ? `\nSpecific Requirements: ${input.requirements}`
    : '';

  // Build citation style section
  const citationSection = input.citationStyle && input.citationStyle !== 'none'
    ? `\nCitation Style: Use ${input.citationStyle} format for any references or citations.`
    : '';

  // Build examples section
  const examplesSection = input.includeExamples
    ? '\nInclude relevant real-world examples, case studies, or practical applications.'
    : '';

  // Build format section
  const formatMap = {
    structured: 'Use a traditional academic essay structure with introduction, body paragraphs with clear topic sentences, and conclusion.',
    essay: 'Write in essay format with flowing narrative and logical progression.',
    bullet_points: 'Use bullet points and numbered lists for clarity where appropriate, but maintain paragraph form for main content.'
  };
  
  const formatSection = input.formatOption
    ? `\nFormat Instructions: ${formatMap[input.formatOption]}`
    : '';

  return `${researchSection}You are an expert academic writer. Write a structured ${input.wordCount}-word assignment.

Topic: "${input.topic}"
Tone: ${input.tone} — ${toneMap[input.tone]}
Target word count: approximately ${input.wordCount} words${subtopicsSection}${requirementsSection}${citationSection}${examplesSection}${formatSection}

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
  const [versions, setVersions] = useState<AssignmentVersion[]>([]);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIdRef = useRef<string | null>(null);
  const currentInputRef = useRef<AssignmentInput | null>(null);
  savedIdRef.current = savedId;

  // ── Save (with snapshot-before-overwrite) ─────────────────────
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
        // Snapshot current state before overwriting
        const { data: current } = await supabase
          .from('assignments')
          .select('topic, content, word_count, tone')
          .eq('id', existingId)
          .single();

        if (current) {
          await createAssignmentVersion(existingId, user.id, {
            topic:      current.topic,
            content:    current.content,
            word_count: current.word_count,
            tone:       current.tone,
          });
        }

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
    setVersions([]);
    currentInputRef.current = input;

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

  // ── Load version history ──────────────────────────────────────
  const loadVersions = useCallback(async (assignmentId: string) => {
    const data = await fetchAssignmentVersions(assignmentId);
    setVersions(data);
  }, []);

  // ── Restore version ───────────────────────────────────────────
  const restoreVersion = useCallback(async (version: AssignmentVersion) => {
    if (!savedIdRef.current || !user) return;
    setSaveStatus('saving');

    // Snapshot current before restoring
    if (assignment && currentInputRef.current) {
      await createAssignmentVersion(savedIdRef.current, user.id, {
        topic:      currentInputRef.current.topic,
        content:    assignment.rawContent,
        word_count: assignment.wordCount,
        tone:       currentInputRef.current.tone,
      });
    }

    const { error: restoreErr } = await supabase
      .from('assignments')
      .update({
        content:    version.content,
        word_count: version.word_count,
        tone:       version.tone,
        topic:      version.topic,
      })
      .eq('id', savedIdRef.current);

    if (restoreErr) {
      setSaveStatus('error');
    } else {
      setAssignment(prev => prev ? {
        ...prev,
        rawContent: version.content,
        wordCount:  version.word_count,
        title:      version.topic,
      } : prev);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      loadVersions(savedIdRef.current!);
    }
  }, [assignment, user, loadVersions]);

  return {
    assignment,
    savedId,
    isGenerating,
    isResearching,
    saveStatus,
    error,
    versions,
    generate,
    updateContent,
    loadVersions,
    restoreVersion,
  };
}
