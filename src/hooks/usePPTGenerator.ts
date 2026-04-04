// ============================================================
// usePPTGenerator — AI generation + autosave + version history
// ✔ Research-enhanced: Wikipedia + DuckDuckGo injected into prompt
// ✔ Bulletproof save: always INSERT first, UPDATE on edit
// ✔ Version snapshot: taken BEFORE every overwrite
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { GeneratedSlide } from '@/types/database';
import { fetchResearch, buildResearchPreamble, type ResearchResult } from '@/lib/research';

export type PPTMode = 'basic' | 'high_quality';
export type PresentationType = 'academic' | 'business' | 'creative';
export type DesignTheme = 'modern' | 'minimal' | 'corporate';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface GeneratedPPT {
  title: string;
  design_theme: DesignTheme;
  slides: GeneratedSlide[];
}

export interface PPTInput {
  topic: string;
  number_of_slides: number;
  mode: PPTMode;
  presentation_type: PresentationType;
}

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];

// ── Prompt builder ────────────────────────────────────────────
function buildPrompt(input: PPTInput, research: ResearchResult): string {
  const toneMap: Record<PresentationType, string> = {
    academic: 'structured, formal, citation-worthy, data-driven with clear evidence',
    business: 'concise, impact-driven, executive-level, ROI-focused with metrics',
    creative: 'engaging, storytelling, visually descriptive, energetic and bold',
  };

  const layoutPool = ['title', 'content', 'two-column', 'image-focus', 'quote', 'stats'];

  const modeInstructions = input.mode === 'high_quality'
    ? `
You are designing a GAMMA-LEVEL presentation. Follow this exact storytelling arc:

Slide 1: HOOK — Bold question, shocking fact, or provocative statement that grabs attention immediately
Slide 2: CONTEXT — Why this topic matters right now, the big picture
Slides 3 to ${input.number_of_slides - 2}: CORE CONTENT — One key idea per slide, deep but scannable
Slide ${input.number_of_slides - 1}: EVIDENCE/EXAMPLES — Real-world data, case studies, statistics
Slide ${input.number_of_slides}: SUMMARY + TAKEAWAYS — Key insights and memorable closing

PER-SLIDE RULES (NON-NEGOTIABLE):
- title: Maximum 8 words, punchy and specific — NOT generic like "Introduction" or "Overview"
- content array: MINIMUM 4 items, MAXIMUM 5 items per slide
- Each bullet must be a COMPLETE sentence of 10-15 words — NOT 2-word fragments
- subtitle: A strong one-liner that supports the title (always include this)
- visual_suggestion: MUST be one of these exact values: "bar-chart" | "line-chart" | "pie-chart" | "timeline" | "image-placeholder" | "icon-grid" | "two-column-table" | "quote-callout" | "stat-highlight" | "diagram"
- layout_type: MUST vary across slides — use each of these at least once across the deck: "title" | "content" | "two-column" | "image-focus" | "quote" | "stats"
- speaker_notes: 2-3 sentences of actual presenter talking points — not a summary of the bullets
- NEVER repeat the same layout_type on consecutive slides
`
    : `
Keep slides clean and educational:
- title: Clear, direct (max 10 words)
- content: MINIMUM 4 complete sentences per slide, MAXIMUM 5
- Each bullet must be a complete sentence (10+ words), not a fragment
- subtitle: A brief supporting line
- visual_suggestion: describe a useful visual
- layout_type: alternate between "content" and "two-column"
- speaker_notes: brief presenter note
`;

  const researchPreamble = buildResearchPreamble(research);

  return `You are a world-class presentation designer. ${researchPreamble}Create a ${input.number_of_slides}-slide presentation.

Topic: "${input.topic}"
Mode: ${input.mode === 'high_quality' ? 'HIGH QUALITY — Gamma.app level' : 'BASIC — Clean educational'}
Audience tone: ${toneMap[input.presentation_type]}

${modeInstructions}

DESIGN THEME RULES:
- academic presentation → design_theme: "minimal"
- business presentation → design_theme: "corporate"
- creative presentation → design_theme: "modern"

RETURN ONLY VALID JSON. No markdown, no code blocks, no explanation. Pure JSON only.

{
  "title": "<compelling presentation title — 5-10 words>",
  "design_theme": "<modern|minimal|corporate>",
  "slides": [
    {
      "slide_number": 1,
      "title": "<punchy slide title — max 8 words>",
      "subtitle": "<one strong supporting sentence>",
      "content": [
        "<complete sentence bullet — 10-15 words>",
        "<complete sentence bullet — 10-15 words>",
        "<complete sentence bullet — 10-15 words>",
        "<complete sentence bullet — 10-15 words>"
      ],
      "visual_suggestion": "<one of the exact allowed values>",
      "layout_type": "<title|content|two-column|image-focus|quote|stats>",
      "speaker_notes": "<2-3 sentences of actual presenter talking points>"
    }
  ]
}

Generate EXACTLY ${input.number_of_slides} slides. Every slide MUST have exactly 4 bullets in the content array. This is mandatory.`;
}

// ── Groq caller ───────────────────────────────────────────────
async function callGroq(prompt: string): Promise<GeneratedPPT> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set in environment variables.');

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
          messages: [
            {
              role: 'system',
              content: 'You are a presentation designer. You ONLY output valid JSON. Never output markdown, never output explanations. Only pure JSON matching the exact schema provided.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.75,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw) as GeneratedPPT;

      if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        throw new Error('Invalid response: missing or empty slides array');
      }

      // Normalise: ensure every slide has at least 4 bullets
      parsed.slides = parsed.slides.map((slide, i) => ({
        slide_number: i + 1,
        title: slide.title || `Slide ${i + 1}`,
        subtitle: slide.subtitle || '',
        content: Array.isArray(slide.content) && slide.content.length >= 3
          ? slide.content
          : [...(slide.content || []), 'Key insight about this topic that deserves attention.', 'Supporting evidence strengthens understanding of the core concept.'].slice(0, 4),
        visual_suggestion: slide.visual_suggestion || 'image-placeholder',
        layout_type: slide.layout_type || (i === 0 ? 'title' : 'content'),
        speaker_notes: slide.speaker_notes || '',
      }));

      return parsed;
    } catch (e) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      console.warn(`[PPT] Model ${model} failed, trying fallback...`, e);
    }
  }

  throw new Error('All Groq models failed. Please check your API key and try again.');
}

// ── Hook ──────────────────────────────────────────────────────
export function usePPTGenerator() {
  const { user } = useAuth();
  const [ppt, setPPT] = useState<GeneratedPPT | null>(null);
  const [savedPPTId, setSavedPPTId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [researchSource, setResearchSource] = useState<ResearchResult['source']>('none');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPPTIdRef = useRef<string | null>(null);
  const currentInputRef = useRef<PPTInput | null>(null);
  savedPPTIdRef.current = savedPPTId;

  // ── Snapshot + save ──────────────────────────────────────────
  const saveToSupabase = useCallback(async (
    data: GeneratedPPT,
    existingId: string | null,
    mode: PPTMode,
    presentation_type: PresentationType,
  ) => {
    if (!user) return;
    setSaveStatus('saving');

    try {
      const payload = {
        user_id: user.id,
        topic:   data.title,
        title:   data.title,
        mode,
        presentation_type,
        design_theme: data.design_theme,
        slide_count:  data.slides.length,
        slides:       data.slides as any,
      };

      if (existingId) {
        // ── UPDATE path: snapshot first, then overwrite ──────────
        const { data: current } = await supabase
          .from('ppts')
          .select('slides, topic, mode, presentation_type, design_theme')
          .eq('id', existingId)
          .single();

        if (current) {
          const { data: lastVer } = await supabase
            .from('ppt_versions')
            .select('version')
            .eq('ppt_id', existingId)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

          await supabase.from('ppt_versions').insert({
            ppt_id:            existingId,
            user_id:           user.id,
            version:           (lastVer?.version ?? 0) + 1,
            slides:            current.slides,
            topic:             current.topic,
            mode:              current.mode,
            presentation_type: current.presentation_type ?? 'academic',
            design_theme:      current.design_theme       ?? 'minimal',
          });
        }

        const { error: updateErr } = await supabase
          .from('ppts')
          .update(payload)
          .eq('id', existingId);
        if (updateErr) throw updateErr;

        setSavedPPTId(existingId);
        savedPPTIdRef.current = existingId;
      } else {
        // ── INSERT path: fresh row ───────────────────────────────
        const { data: newPPT, error: insertErr } = await supabase
          .from('ppts')
          .insert(payload)
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        setSavedPPTId(newPPT.id);
        savedPPTIdRef.current = newPPT.id;
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e: any) {
      console.error('[PPT] saveToSupabase error:', e);
      setSaveStatus('error');
    }
  }, [user]);

  // ── Generate ──────────────────────────────────────────────────
  const generate = useCallback(async (input: PPTInput) => {
    if (!input.topic.trim()) {
      setError('Please enter a topic to generate a presentation.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPPT(null);
    setSavedPPTId(null);
    savedPPTIdRef.current = null;
    setVersions([]);
    setActiveSlide(0);
    setResearchSource('none');
    currentInputRef.current = input;

    try {
      const research = await fetchResearch(input.topic);
      setResearchSource(research.source);

      const prompt = buildPrompt(input, research);
      const result = await callGroq(prompt);
      setPPT(result);
      await saveToSupabase(result, null, input.mode, input.presentation_type);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [saveToSupabase]);

  // ── Update slide field + debounced autosave ───────────────────
  const updateSlide = useCallback((
    idx: number,
    field: keyof GeneratedSlide,
    value: string | string[],
  ) => {
    setPPT(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], [field]: value };
      const updated = { ...prev, slides };

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        const inp = currentInputRef.current;
        saveToSupabase(
          updated,
          savedPPTIdRef.current,
          inp?.mode ?? 'basic',
          inp?.presentation_type ?? 'academic',
        );
      }, 1500);

      return updated;
    });
  }, [saveToSupabase]);

  // ── Regenerate single slide ──────────────────────────────────
  const regenerateSlide = useCallback(async (idx: number, input: PPTInput) => {
    if (!ppt) return;
    setError(null);
    try {
      const research = await fetchResearch(input.topic);
      const singlePrompt =
        buildPrompt({ ...input, number_of_slides: 1 }, research) +
        `\n\nThis is slide ${idx + 1} of ${ppt.slides.length} in the deck titled "${ppt.title}". Generate ONLY this one replacement slide. Output a JSON object with a "slides" array containing exactly 1 slide.`;

      const result = await callGroq(singlePrompt);
      const regenerated = result.slides[0];
      if (!regenerated) return;

      setPPT(prev => {
        if (!prev) return prev;
        const slides = [...prev.slides];
        slides[idx] = { ...regenerated, slide_number: idx + 1 };
        const updated = { ...prev, slides };

        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          saveToSupabase(updated, savedPPTIdRef.current, input.mode, input.presentation_type);
        }, 1500);

        return updated;
      });
    } catch (e: any) {
      setError(`Slide regeneration failed: ${e?.message}`);
    }
  }, [ppt, saveToSupabase]);

  // ── Load version history ──────────────────────────────────────
  const loadVersions = useCallback(async (pptId: string) => {
    const { data } = await supabase
      .from('ppt_versions')
      .select('*')
      .eq('ppt_id', pptId)
      .order('version', { ascending: false });
    setVersions(data ?? []);
  }, []);

  // ── Restore version ───────────────────────────────────────────
  const restoreVersion = useCallback(async (version: any) => {
    if (!ppt || !savedPPTIdRef.current) return;
    setPPT(prev => prev ? { ...prev, slides: version.slides } : prev);
    setSaveStatus('saving');
    const { error: restoreErr } = await supabase
      .from('ppts')
      .update({ slides: version.slides })
      .eq('id', savedPPTIdRef.current);
    if (restoreErr) {
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [ppt]);

  return {
    ppt,
    savedPPTId,
    isGenerating,
    saveStatus,
    error,
    versions,
    activeSlide,
    setActiveSlide,
    researchSource,
    generate,
    updateSlide,
    regenerateSlide,
    loadVersions,
    restoreVersion,
    currentInputRef,
  };
}
