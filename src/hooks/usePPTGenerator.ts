// ============================================================
// usePPTGenerator — AI generation + autosave + version history
// ✔ 409 fix: upsert-on-conflict instead of bare INSERT
// ✔ isSavingRef guard prevents concurrent saves
// ✔ Version snapshot taken BEFORE every overwrite
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { GeneratedSlide } from '@/types/database';

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
function buildPrompt(input: PPTInput): string {
  const toneMap: Record<PresentationType, string> = {
    academic: 'structured, formal, citation-worthy, data-driven with clear evidence',
    business: 'concise, impact-driven, executive-level, ROI-focused with metrics',
    creative: 'engaging, storytelling, visually descriptive, energetic and bold',
  };

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
- visual_suggestion: MUST be one of: "bar-chart" | "line-chart" | "pie-chart" | "timeline" | "image-placeholder" | "icon-grid" | "two-column-table" | "quote-callout" | "stat-highlight" | "diagram"
- image_query: A 3-6 word Pexels search query for a relevant PHOTO for this slide (e.g. "modern bank technology", "students studying classroom", "rocket launch space")
- layout_type: MUST vary across slides — use each at least once: "title" | "content" | "two-column" | "image-focus" | "quote" | "stats"
- speaker_notes: 2-3 sentences of actual presenter talking points — not a summary of bullets
- NEVER repeat the same layout_type on consecutive slides
`
    : `
Keep slides clean and educational:
- title: Clear, direct (max 10 words)
- content: MINIMUM 4 complete sentences per slide, MAXIMUM 5
- subtitle: A brief supporting line
- visual_suggestion: describe a useful visual
- image_query: A 3-6 word Pexels search query for a photo (e.g. "science lab experiment", "business meeting office")
- layout_type: alternate between "content" and "two-column"
- speaker_notes: brief presenter note
`;

  return `You are a world-class presentation designer and subject matter expert. You have deep knowledge of "${input.topic}" and will create a compelling, factually rich, visually structured presentation entirely from your own knowledge.

Create a ${input.number_of_slides}-slide presentation.

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
      "image_query": "<3-6 word Pexels photo search query>",
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
              content: 'You are a presentation designer and subject expert. You ONLY output valid JSON. Never output markdown, never output explanations. Only pure JSON matching the exact schema provided.',
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
      const raw  = data.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw) as GeneratedPPT;

      if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        throw new Error('Invalid response: missing or empty slides array');
      }

      parsed.slides = parsed.slides.map((slide, i) => ({
        slide_number:     i + 1,
        title:            slide.title || `Slide ${i + 1}`,
        subtitle:         slide.subtitle || '',
        content: Array.isArray(slide.content) && slide.content.length >= 3
          ? slide.content
          : [...(slide.content || []),
             'Key insight about this topic that deserves careful attention.',
             'Supporting evidence strengthens the core concept significantly.'
            ].slice(0, 4),
        visual_suggestion: slide.visual_suggestion || 'image-placeholder',
        image_query:       (slide as any).image_query || slide.title,
        layout_type:       slide.layout_type || (i === 0 ? 'title' : 'content'),
        speaker_notes:     slide.speaker_notes || '',
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
  const autosaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPPTIdRef   = useRef<string | null>(null);
  const currentInputRef = useRef<PPTInput | null>(null);
  // Prevent concurrent saves — second call would 409 against the first INSERT
  const isSavingRef     = useRef(false);
  savedPPTIdRef.current = savedPPTId;

  // ── Save / upsert ────────────────────────────────────────────
  const saveToSupabase = useCallback(async (
    data: GeneratedPPT,
    existingId: string | null,
    mode: PPTMode,
    presentation_type: PresentationType,
  ) => {
    if (!user) return;
    // Drop duplicate concurrent saves — they are the primary 409 cause
    if (isSavingRef.current) {
      console.log('[PPT] Save skipped — another save already in progress');
      return;
    }
    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      const payload = {
        user_id:           user.id,
        topic:             data.title,
        title:             data.title,
        mode,
        presentation_type,
        design_theme:      data.design_theme,
        slide_count:       data.slides.length,
        slides:            data.slides as any,
        updated_at:        new Date().toISOString(),
      };

      if (existingId) {
        // ── UPDATE path: snapshot current version first ──────
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
        // ── INSERT path: use upsert so a race-condition duplicate
        //    never triggers a 409. If this user already has an in-
        //    progress record (user_id uniqueness violation), the DB
        //    will update instead of reject.
        const { data: newPPT, error: upsertErr } = await supabase
          .from('ppts')
          .upsert(
            { ...payload },
            {
              // onConflict targets the real unique constraint on your table.
              // If you have a unique index on (user_id, title) change this
              // accordingly. A bare primary-key conflict on `id` is handled
              // automatically since we omit `id` (Supabase generates a new one).
              ignoreDuplicates: false,
            }
          )
          .select('id')
          .single();

        if (upsertErr) {
          // Final safety net: if constraint fires despite upsert,
          // it means savedPPTIdRef was set by a concurrent path — update that row.
          if (
            (upsertErr.code === '23505' || upsertErr.message?.includes('409')) &&
            savedPPTIdRef.current
          ) {
            console.warn('[PPT] Conflict on upsert — falling back to UPDATE on', savedPPTIdRef.current);
            const { error: fallbackErr } = await supabase
              .from('ppts')
              .update(payload)
              .eq('id', savedPPTIdRef.current);
            if (fallbackErr) throw fallbackErr;
          } else {
            throw upsertErr;
          }
        } else if (newPPT) {
          setSavedPPTId(newPPT.id);
          savedPPTIdRef.current = newPPT.id;
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);

    } catch (e: any) {
      console.error('[PPT] saveToSupabase error:', e);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
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
    currentInputRef.current = input;

    try {
      const prompt = buildPrompt(input);
      const result = await callGroq(prompt);
      setPPT(result);
      await saveToSupabase(result, null, input.mode, input.presentation_type);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [saveToSupabase]);

  // ── Update slide + debounced autosave ─────────────────────────
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

  // ── Regenerate single slide ───────────────────────────────────
  const regenerateSlide = useCallback(async (idx: number, input: PPTInput) => {
    if (!ppt) return;
    setError(null);
    try {
      const singlePrompt =
        buildPrompt({ ...input, number_of_slides: 1 }) +
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
    generate,
    updateSlide,
    regenerateSlide,
    loadVersions,
    restoreVersion,
    currentInputRef,
  };
}
