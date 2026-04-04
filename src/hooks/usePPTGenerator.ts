// ============================================================
// usePPTGenerator — AI generation + autosave + version history
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Slide, DbPPT } from '@/types/database';

export type PPTMode = 'basic' | 'high_quality';
export type PresentationType = 'academic' | 'business' | 'creative';
export type DesignTheme = 'modern' | 'minimal' | 'corporate';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface GeneratedSlide extends Slide {
  subtitle?: string;
  visual_suggestion?: string;
  layout_type?: 'title' | 'content' | 'two-column' | 'image-focus';
  speaker_notes?: string;
}

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

function buildPrompt(input: PPTInput): string {
  const toneMap: Record<PresentationType, string> = {
    academic: 'structured, formal, citation-worthy, data-driven',
    business: 'concise, impact-driven, executive-level, ROI-focused',
    creative: 'engaging, visual-heavy, storytelling, energetic',
  };

  const modeInstructions = input.mode === 'high_quality'
    ? `Follow this storytelling arc across slides:
1. Hook slide — grab attention with a provocative question or bold statement
2. Context slide — set the scene, why this matters
3. Core concept slides — one key idea per slide, clear and memorable
4. Examples/Evidence slides — real-world applications, data, or case studies
5. Summary/CTA slide — key takeaways and next steps

Each slide must:
- Have a strong, punchy title (max 8 words)
- Max 4-5 bullet points, each max 12 words
- Include a clear visual_suggestion (specific: "bar chart comparing X vs Y", "timeline diagram", "icon grid")
- Include speaker_notes (2-3 sentences for the presenter)
- Avoid text walls — slides should be scannable in 5 seconds`
    : `Keep slides simple and clear:
- Direct titles
- 3-5 bullet points per slide
- No complex visual suggestions needed
- Basic structure only`;

  return `You are an expert presentation designer. Generate a ${input.number_of_slides}-slide presentation.

Topic: "${input.topic}"
Mode: ${input.mode === 'high_quality' ? 'HIGH QUALITY (Gamma-level)' : 'BASIC'}
Presentation Type: ${input.presentation_type} — tone should be ${toneMap[input.presentation_type]}

${modeInstructions}

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Strict format:
{
  "title": "<presentation title>",
  "design_theme": "<modern|minimal|corporate>",
  "slides": [
    {
      "slide_number": 1,
      "title": "<slide title>",
      "subtitle": "<optional one-liner>",
      "content": ["bullet 1", "bullet 2", "bullet 3"],
      "visual_suggestion": "<specific visual idea>",
      "layout_type": "<title|content|two-column|image-focus>",
      "speaker_notes": "<presenter notes>"
    }
  ]
}

Generate exactly ${input.number_of_slides} slides. The design_theme should match: academic→minimal, business→corporate, creative→modern.`;
}

async function callGroq(prompt: string): Promise<GeneratedPPT> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set');

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
          temperature: 0.7,
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
      const parsed = JSON.parse(raw) as GeneratedPPT;

      if (!parsed.slides || !Array.isArray(parsed.slides)) {
        throw new Error('Invalid response structure');
      }

      return parsed;
    } catch (e) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      console.warn(`Model ${model} failed, trying next...`, e);
    }
  }

  throw new Error('All models failed');
}

export function usePPTGenerator() {
  const { user } = useAuth();
  const [ppt, setPPT] = useState<GeneratedPPT | null>(null);
  const [savedPPTId, setSavedPPTId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Generate ────────────────────────────────────────────────
  const generate = useCallback(async (input: PPTInput) => {
    if (!input.topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setPPT(null);
    setSavedPPTId(null);
    setVersions([]);
    setActiveSlide(0);

    try {
      const prompt = buildPrompt(input);
      const result = await callGroq(prompt);
      setPPT(result);
      // Auto-save after generation
      await saveToSupabase(result, null, input.mode, input.presentation_type);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [user]); // eslint-disable-line

  // ── Save to Supabase ────────────────────────────────────────
  const saveToSupabase = useCallback(async (
    data: GeneratedPPT,
    existingId: string | null,
    mode: PPTMode,
    _type: PresentationType,
  ) => {
    if (!user) return;
    setSaveStatus('saving');

    try {
      const payload = {
        user_id: user.id,
        topic: data.title,
        mode,
        slide_count: data.slides.length,
        slides: data.slides as any,
        design_theme: data.design_theme,
      };

      if (existingId) {
        // Save current as version before updating
        const { data: current } = await supabase
          .from('ppts').select('slides, topic, mode').eq('id', existingId).single();

        if (current) {
          const { data: lastVersion } = await supabase
            .from('ppt_versions')
            .select('version')
            .eq('ppt_id', existingId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

          await supabase.from('ppt_versions').insert({
            ppt_id: existingId,
            user_id: user.id,
            version: (lastVersion?.version ?? 0) + 1,
            slides: current.slides,
            topic: current.topic,
            mode: current.mode,
          });
        }

        await supabase.from('ppts').update(payload).eq('id', existingId);
        setSavedPPTId(existingId);
      } else {
        const { data: newPPT, error } = await supabase
          .from('ppts').insert(payload).select().single();
        if (error) throw error;
        setSavedPPTId(newPPT.id);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('saveToSupabase:', e);
      setSaveStatus('error');
    }
  }, [user]);

  // ── Autosave on slide edit ───────────────────────────────────
  const updateSlide = useCallback((idx: number, field: keyof GeneratedSlide, value: string | string[]) => {
    setPPT(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], [field]: value };
      const updated = { ...prev, slides };

      // Debounced autosave
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        saveToSupabase(updated, savedPPTId, slides[idx] ? 'basic' : 'basic', 'academic');
      }, 1500);

      return updated;
    });
  }, [savedPPTId, saveToSupabase]);

  // ── Regenerate single slide ─────────────────────────────────
  const regenerateSlide = useCallback(async (idx: number, input: PPTInput) => {
    if (!ppt) return;
    setError(null);
    try {
      const singlePrompt = buildPrompt({ ...input, number_of_slides: 1 }) +
        `\n\nThis is slide ${idx + 1} of ${ppt.slides.length} in the presentation "${ppt.title}". Generate only this one slide.`;
      const result = await callGroq(singlePrompt);
      if (result.slides[0]) {
        updateSlide(idx, 'title', result.slides[0].title);
        updateSlide(idx, 'content', result.slides[0].content);
      }
    } catch (e: any) {
      setError(`Slide regeneration failed: ${e?.message}`);
    }
  }, [ppt, updateSlide]);

  // ── Load version history ────────────────────────────────────
  const loadVersions = useCallback(async (pptId: string) => {
    const { data } = await supabase
      .from('ppt_versions')
      .select('*')
      .eq('ppt_id', pptId)
      .order('version', { ascending: false });
    setVersions(data ?? []);
  }, []);

  // ── Restore version ─────────────────────────────────────────
  const restoreVersion = useCallback(async (version: any) => {
    if (!ppt) return;
    setPPT(prev => prev ? { ...prev, slides: version.slides } : prev);
    setSaveStatus('saving');
    await supabase.from('ppts').update({ slides: version.slides }).eq('id', savedPPTId);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [ppt, savedPPTId]);

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
  };
}
