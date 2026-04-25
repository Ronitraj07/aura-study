// ============================================================
// useNotesGenerator — Groq AI + Supabase autosave
// ✔ Research-enhanced: Groq double-pass (8b research → 70b generate)
// ✔ isResearching state exposed for UI loading stages
// ✔ researchSource attached to result for UI badge
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ✔ C5: 'exam' depth mode — exam_tips, mnemonics, cheatsheet
// ✔ C10: version snapshot before every overwrite + loadVersions/restoreVersion
// ✔ Phase 1: Streaming generation (notes_stream SSE route)
// ✔ Phase 2: Per-section regeneration (regenerateSection)
// ✔ Phase 3: Smarter chain-of-thought prompts
// ✔ Phase 4: Concept connections + difficulty curve + confidence scores
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

// Phase 4: Concept connection between two note sections
export interface ConceptConnection {
  from: string;
  to: string;
  relationship: string;
}

// ── Academy-mode enrichments ────────────────────────────────────

export interface NoteTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface NoteChart {
  type: 'bar' | 'line' | 'pie';
  title: string;
  description: string;
  xLabel?: string;
  yLabel?: string;
  labels: string[];
  datasets: { name: string; data: number[] }[];
}

export interface NoteCallout {
  type: 'definition' | 'formula' | 'tip' | 'warning';
  title: string;
  content: string;
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
  connections?: ConceptConnection[]; // Phase 4
  tables?: NoteTable[];
  charts?: NoteChart[];
  callouts?: NoteCallout[];
  researchSource?: 'groq' | 'gemini' | 'none';
}

export interface NotesInput {
  topic: string;
  depth?: 'overview' | 'detailed' | 'exam' | 'academy';
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
  /** Raw text extracted from an uploaded PDF/DOCX — injected as source material */
  sourceContent?: string;
}

// ── Prompt builder ──────────────────────────────────────────────
function buildPrompt(input: NotesInput, researchPreamble: string): string {
  const isExam = input.depth === 'exam' || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet;
  const isAcademy = input.depth === 'academy';

  const depthNote = isAcademy
    ? 'Provide deeply comprehensive academy-level coverage with 6-10 major sections, 5-8 bullets per section. This should read like thorough lecture notes from a university course.'
    : input.depth === 'exam'
    ? 'Provide comprehensive exam-focused coverage with 4-6 major sections, 4-6 bullets per section.'
    : input.depth === 'detailed'
    ? 'Provide comprehensive coverage with 4-6 major sections, 4-6 bullets per section.'
    : 'Provide a clear overview with 3-4 major sections, 3-5 bullets per section.';

  // Source content from uploaded PDF/DOCX
  const sourceSection = input.sourceContent
    ? `\n\n=== SOURCE MATERIAL (extracted from uploaded document — base your notes primarily on this) ===\n${input.sourceContent.slice(0, 12000)}\n=== END SOURCE MATERIAL ===\n`
    : '';

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
      "question": "What is the primary function of mitochondria?",
      "answer": "Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.",
      "difficulty": "easy"
    },
    {
      "question": "How does the electron transport chain contribute to ATP synthesis?",
      "answer": "It creates a proton gradient across the inner mitochondrial membrane, driving ATP synthase to produce ATP.",
      "difficulty": "medium"
    }
  ]` : ''}${includeExamTips && (includeMnemonics || includeCheatsheet) ? ',' : ''}
  ${includeMnemonics ? `"mnemonics": [
    {
      "concept": "Phases of Mitosis",
      "device": "PMAT - Please Make Art Today",
      "explanation": "Prophase, Metaphase, Anaphase, Telophase - the four phases of mitosis in order"
    }
  ]` : ''}${includeMnemonics && includeCheatsheet ? ',' : ''}
  ${includeCheatsheet ? `"cheatsheet": [
    { "label": "Photosynthesis Equation", "value": "6CO2 + 6H2O → C6H12O6 + 6O2" },
    { "label": "DNA Base Pairs", "value": "A-T, G-C (RNA: A-U, G-C)" }
  ]` : ''}` : '';

  // Academy-mode: tables, charts, callouts
  const academyJsonFields = isAcademy ? `,
  "tables": [
    {
      "caption": "<descriptive table title>",
      "headers": ["Column 1", "Column 2", "Column 3"],
      "rows": [["cell", "cell", "cell"], ["cell", "cell", "cell"]]
    }
  ],
  "charts": [
    {
      "type": "bar",
      "title": "<chart title>",
      "description": "<one sentence about what this chart shows>",
      "xLabel": "<x-axis label>",
      "yLabel": "<y-axis label>",
      "labels": ["Label A", "Label B", "Label C"],
      "datasets": [{ "name": "Series 1", "data": [10, 25, 15] }]
    }
  ],
  "callouts": [
    { "type": "definition", "title": "<term>", "content": "<definition>" },
    { "type": "formula", "title": "<formula name>", "content": "<formula>" },
    { "type": "tip", "title": "Key Insight", "content": "<important insight>" }
  ]` : '';

  const examInstructions = [];
  if (includeExamTips) examInstructions.push('- exam_tips: Generate 5-8 likely exam questions with specific, complete answers (not just "yes/no"). Mix difficulty levels (2-3 easy, 3-4 medium, 1-2 hard). Questions should test understanding, not just memorization.');
  if (includeMnemonics) examInstructions.push('- mnemonics: Create 2-4 effective memory devices (acronyms, rhymes, visual stories) for the most complex concepts, sequences, or lists in the topic. Focus on items students typically struggle to remember.');
  if (includeCheatsheet) examInstructions.push('- cheatsheet: Provide 8-12 essential facts, formulas, key dates, or definitions that students need to memorize. Use concise label:value format. Prioritize items that appear frequently on exams.');

  const academyInstructions = isAcademy ? `
- tables: Generate 2-5 comparison/data tables wherever the content has comparisons, processes, properties, classifications, or numerical data. Each table needs a descriptive caption, clear headers, and complete rows. Omit tables array if the topic has no tabular data.
- charts: Generate 1-3 charts ONLY when the topic has quantitative trends, distributions, comparisons of quantities, or time-series data that can be meaningfully plotted. Chart data must be realistic numbers. Omit charts array if data is not meaningful.
- callouts: Generate 3-8 callouts of types: "definition" (key terms), "formula" (equations/rules), "tip" (important insights), "warning" (common mistakes). These should capture the most critical standalone facts.` : '';
  
  const examInstructionsText = [...examInstructions, ...(academyInstructions ? [academyInstructions] : [])].length > 0
    ? `\n${[...examInstructions, ...(academyInstructions ? [academyInstructions] : [])].join('\n')}`
    : '';

  return `${sourceSection}${researchSection}Topic: "${input.topic}"
Depth: ${input.depth ?? 'overview'} — ${depthNote}${subtopicsSection}${formatSection}${levelSection}${examTypeSection}${durationSection}${questionsSection}${diagramsSection}

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Strict format:
{
  "title": "<notes title>",
  "headings": [
    { "level": 1, "text": "<major section heading>", "difficulty": "intro" },
    { "level": 2, "text": "<subsection heading>", "difficulty": "core" }
  ],
  "bullets": [
    {
      "heading": "<section heading this belongs to>",
      "points": ["<point 1>", "<point 2>", "<point 3>"],
      "confidence": 4
    }
  ],
  "summary": "<3-4 sentence executive summary of the entire topic>",
  "keyTerms": ["<term 1>", "<term 2>", "<term 3>"],
  "connections": [
    { "from": "<heading A>", "to": "<heading B>", "relationship": "<how they connect>" }
  ]${examJsonFields}${academyJsonFields}
}

Rules:
- Every heading in the headings array must have a corresponding bullets entry
- Level 1 headings are major sections, level 2 are subsections
- Bullets should be concise, scannable (max 20 words each). Use **bold** for key terms, \`code\` for formulas/symbols
- keyTerms: 5-8 important vocabulary words or concepts from the topic
- Summary must be written as complete sentences, not bullets
- difficulty on each heading: "intro" (foundational), "core" (main content), "advanced" (complex/specialised)
- confidence on each bullets entry: integer 1–5 (5 = very confident, 1 = may need verification)
- connections: 2–4 relationships showing how sections build on each other (omit if sections are independent)${examInstructionsText}`;
}

// ── Phase 1: Partial-notes extractor for streaming ─────────────
function tryExtractPartialNotes(partial: string): Partial<GeneratedNotes> | null {
  const titleMatch = partial.match(/"title"\s*:\s*"([^"]*)"/);

  // Extract completed headings (with optional difficulty field)
  const headings: NoteHeading[] = [];
  for (const m of partial.matchAll(
    /\{\s*"level"\s*:\s*([123])\s*,\s*"text"\s*:\s*"([^"]+)"(?:\s*,\s*"difficulty"\s*:\s*"(intro|core|advanced)")?\s*\}/g
  )) {
    headings.push({
      level: parseInt(m[1]) as 1 | 2 | 3,
      text: m[2],
      ...(m[3] ? { difficulty: m[3] as 'intro' | 'core' | 'advanced' } : {}),
    });
  }

  if (!titleMatch && headings.length === 0) return null;

  return {
    title: titleMatch?.[1] ?? 'Generating…',
    headings,
    bullets: [],
    summary: '',
    keyTerms: [],
  };
}

// ── Phase 1: Streaming AI caller ────────────────────────────────
async function callAIStreaming(
  prompt: string,
  onPartial: (partial: Partial<GeneratedNotes>) => void,
): Promise<GeneratedNotes> {
  const systemPrompt = `You are a world-class academic note-taker with a talent for clarity.
Think step by step: (1) Identify the main thesis, (2) Break into logical sections,
(3) Distill each concept to its essential insight, (4) Connect ideas across sections.
Your bullets should be scannable facts a student could recall 24 hours later.
Output ONLY valid JSON. No markdown. No explanation. No code blocks.`;

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'notes_stream',
      systemPrompt,
      userPrompt: prompt,
      maxTokens: 4500,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Generation failed (HTTP ${res.status})`);
  }

  if (!res.body) throw new Error('No response body for streaming');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let lastHeadingCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data) as { choices: { delta: { content?: string } }[] };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          accumulated += content;
          const partial = tryExtractPartialNotes(accumulated);
          if (partial && partial.headings && partial.headings.length > lastHeadingCount) {
            lastHeadingCount = partial.headings.length;
            onPartial(partial);
          }
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  let result: GeneratedNotes;
  try {
    result = JSON.parse(accumulated) as GeneratedNotes;
  } catch {
    throw new Error('Streaming response was incomplete or malformed. Please try again.');
  }
  if (!result.bullets || !Array.isArray(result.bullets)) {
    throw new Error('Invalid streaming response: missing bullets');
  }
  return result;
}

// ── Enhanced AI generation caller with routing support ──────
async function callAI(prompt: string, input: NotesInput): Promise<GeneratedNotes> {
  const isExam = input.depth === 'exam' || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet;
  const isAcademy = input.depth === 'academy';

  // Phase 3: Chain-of-thought system prompts
  const systemPrompt = isAcademy
    ? `You are a senior university professor creating deeply comprehensive lecture notes.
Think step by step: (1) Identify every major concept and sub-concept, (2) Build logical progression from fundamentals to advanced,
(3) Insert comparison tables wherever the content has categories, properties, or steps,
(4) Insert chart data wherever the content has quantities, trends, or distributions,
(5) Add definition/formula/tip callouts for critical standalone facts.
Your notes should rival a textbook chapter — thorough, precise, and visually rich.
Output ONLY valid JSON. No markdown. No explanation. No code blocks.`
    : isExam
    ? `You are a world-class academic educator with deep expertise in exam preparation.
Think step by step: (1) Identify core concepts, (2) Map conceptual dependencies,
(3) Anticipate common misconceptions, (4) Structure from foundational to advanced.
Produce exam-ready material: questions that test understanding not recall,
mnemonics that exploit pattern recognition, cheatsheets that compress 80% of marks into 20% of content.
Output ONLY valid JSON. No markdown. No explanation. No code blocks.`
    : `You are a world-class academic note-taker with a talent for clarity.
Think step by step: (1) Identify the main thesis, (2) Break into logical sections,
(3) Distill each concept to its essential insight, (4) Connect ideas across sections.
Your bullets should be scannable facts a student could recall 24 hours later.
Output ONLY valid JSON. No markdown. No explanation. No code blocks.`;
  
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: isAcademy ? 'notes_academy' : isExam ? 'notes_exam' : 'notes',
      systemPrompt,
      userPrompt: prompt,
      maxTokens: isAcademy ? 7000 : isExam ? 5000 : 4500,
      temperature: isAcademy ? 0.4 : isExam ? 0.4 : 0.35,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Generation failed (HTTP ${res.status})`);
  }

  const parsed = await res.json() as GeneratedNotes;
  if (!parsed.bullets || !Array.isArray(parsed.bullets)) {
    throw new Error('Invalid response: missing bullets');
  }
  
  // Validate and ensure exam fields are properly parsed
  if (isExam || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet) {
    if ((isExam || input.includeExamTips) && (!parsed.exam_tips || !Array.isArray(parsed.exam_tips))) {
      parsed.exam_tips = [];
    }
    if ((isExam || input.includeMnemonics) && (!parsed.mnemonics || !Array.isArray(parsed.mnemonics))) {
      parsed.mnemonics = [];
    }
    if ((isExam || input.includeCheatsheet) && (!parsed.cheatsheet || !Array.isArray(parsed.cheatsheet))) {
      parsed.cheatsheet = [];
    }
    if (parsed.exam_tips) {
      parsed.exam_tips = parsed.exam_tips.filter(tip => 
        tip && typeof tip.question === 'string' && typeof tip.answer === 'string' && 
        ['easy', 'medium', 'hard'].includes(tip.difficulty)
      );
    }
    if (parsed.mnemonics) {
      parsed.mnemonics = parsed.mnemonics.filter(mnemonic => 
        mnemonic && typeof mnemonic.concept === 'string' && 
        typeof mnemonic.device === 'string' && typeof mnemonic.explanation === 'string'
      );
    }
    if (parsed.cheatsheet) {
      parsed.cheatsheet = parsed.cheatsheet.filter(entry => 
        entry && typeof entry.label === 'string' && typeof entry.value === 'string'
      );
    }
  }

  // Validate Phase 4: concept connections
  if (parsed.connections && !Array.isArray(parsed.connections)) {
    parsed.connections = undefined;
  }
  if (parsed.connections) {
    parsed.connections = parsed.connections.filter(c =>
      c && typeof c.from === 'string' && typeof c.to === 'string' && typeof c.relationship === 'string'
    );
    if (parsed.connections.length === 0) parsed.connections = undefined;
  }

  // Validate academy fields
  if (parsed.tables) {
    if (!Array.isArray(parsed.tables)) {
      parsed.tables = undefined;
    } else {
      parsed.tables = parsed.tables.filter(t =>
        t && typeof t.caption === 'string' &&
        Array.isArray(t.headers) && t.headers.length > 0 &&
        Array.isArray(t.rows) && t.rows.length > 0
      );
      if (parsed.tables.length === 0) parsed.tables = undefined;
    }
  }
  if (parsed.charts) {
    if (!Array.isArray(parsed.charts)) {
      parsed.charts = undefined;
    } else {
      parsed.charts = parsed.charts.filter(c =>
        c && typeof c.title === 'string' &&
        ['bar', 'line', 'pie'].includes(c.type) &&
        Array.isArray(c.labels) && c.labels.length > 0 &&
        Array.isArray(c.datasets) && c.datasets.length > 0
      );
      if (parsed.charts.length === 0) parsed.charts = undefined;
    }
  }
  if (parsed.callouts) {
    if (!Array.isArray(parsed.callouts)) {
      parsed.callouts = undefined;
    } else {
      parsed.callouts = parsed.callouts.filter(c =>
        c && typeof c.title === 'string' && typeof c.content === 'string' &&
        ['definition', 'formula', 'tip', 'warning'].includes(c.type)
      );
      if (parsed.callouts.length === 0) parsed.callouts = undefined;
    }
  }
  
  return parsed;
}

// ── Hook ───────────────────────────────────────────────────────────
export function useNotesGenerator() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<GeneratedNotes | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);  // Phase 1
  const [isResearching, setIsResearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
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
        key_terms: data.keyTerms,
        exam_tips: data.exam_tips || null,
        mnemonics: data.mnemonics || null,  
        cheatsheet: data.cheatsheet || null,
      };

      if (existingId) {
        // Snapshot current state before overwriting
        const { data: current } = await supabase
          .from('notes')
          .select('topic, headings, bullets, summary, key_terms, exam_tips, mnemonics, cheatsheet')
          .eq('id', existingId)
          .single();

        if (current) {
          await createNotesVersion(existingId, user.id, {
            topic:    current.topic,
            headings: current.headings,
            bullets:  current.bullets,
            summary:  current.summary,
            key_terms: current.key_terms,
            exam_tips: current.exam_tips,
            mnemonics: current.mnemonics,
            cheatsheet: current.cheatsheet,
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

    const isExam = input.depth === 'exam' || input.includeExamTips || input.includeMnemonics || input.includeCheatsheet;
    const isAcademy = input.depth === 'academy';
    // Academy and exam both skip streaming (too large for SSE partial parsing)
    const useStreaming = !isExam && !isAcademy && !input.sourceContent;

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

      let result: GeneratedNotes;

      // Phase 1: use streaming for standard notes (non-exam, non-academy, no source)
      if (useStreaming) {
        setIsStreaming(true);
        result = await callAIStreaming(prompt, (partial) => {
          // Show section headings as they arrive in the stream
          setNotes(prev => ({
            title: partial.title ?? prev?.title ?? 'Generating…',
            headings: partial.headings ?? prev?.headings ?? [],
            bullets: prev?.bullets ?? [],
            summary: prev?.summary ?? '',
            keyTerms: prev?.keyTerms ?? [],
          }));
        });
        setIsStreaming(false);
      } else {
        result = await callAI(prompt, input);
      }

      result.researchSource = research.source;

      setNotes(result);
      await saveToSupabase(result, input, null);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
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
        key_terms: notes.keyTerms,
        exam_tips: notes.exam_tips,
        mnemonics: notes.mnemonics,
        cheatsheet: notes.cheatsheet,
      });
    }

    const { error: restoreErr } = await supabase
      .from('notes')
      .update({
        headings: version.headings,
        bullets:  version.bullets,
        summary:  version.summary,
        topic:    version.topic,
        key_terms: version.key_terms,
        exam_tips: version.exam_tips,
        mnemonics: version.mnemonics,
        cheatsheet: version.cheatsheet,
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
        keyTerms: version.key_terms || [],
        exam_tips: version.exam_tips,
        mnemonics: version.mnemonics,
        cheatsheet: version.cheatsheet,
      } : prev);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Refresh version list
      loadVersions(savedIdRef.current!);
    }
  }, [notes, user, loadVersions]);

  // ── Phase 2: Per-section regeneration ────────────────────────
  const regenerateSection = useCallback(async (headingText: string, topicContext: string) => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'notes_section',
        systemPrompt: `You are a world-class academic note-taker with a talent for clarity.
Output ONLY valid JSON. No markdown. No explanation. No code blocks.`,
        userPrompt: `Regenerate the notes section "${headingText}" for topic "${topicContext}".
Return JSON with this exact shape:
{
  "heading": "${headingText}",
  "points": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "confidence": 4
}
Rules: 3–5 scannable bullet points (max 20 words each). Use **bold** for key terms, \`code\` for formulas.`,
        maxTokens: 800,
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      setSectionError('Section regeneration failed. Please try again.');
      return;
    }

    try {
      const updated = await res.json() as { heading?: string; points?: string[]; confidence?: number };
      if (!updated.points || !Array.isArray(updated.points)) {
        setSectionError('Section regeneration returned invalid data.');
        return;
      }

      setNotes(prev => {
        if (!prev) return prev;
        const bullets = prev.bullets.map(b =>
          b.heading === headingText
            ? { ...b, points: updated.points!, confidence: updated.confidence }
            : b
        );
        return { ...prev, bullets };
      });
    } catch {
      setSectionError('Section regeneration failed. Please try again.');
    }
  }, []);

  return {
    notes,
    savedId,
    isGenerating,
    isStreaming,
    isResearching,
    saveStatus,
    error,
    sectionError,
    versions,
    generate,
    regenerateSection,
    loadVersions,
    restoreVersion,
  };
}
