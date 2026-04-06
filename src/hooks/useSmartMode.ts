// ============================================================
// useSmartMode — C8: Smart Mode
// Debounced topic analysis → AI-powered setting suggestions
// Works on Notes (depth) and Assignments (tone + wordCount)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export type ToolType = 'notes' | 'assignment';

export interface SmartSuggestion {
  // Notes
  depth?: 'overview' | 'detailed' | 'exam';
  // Assignments
  tone?: 'formal' | 'academic' | 'casual';
  wordCount?: number;
  // Shared
  reason: string;          // short human-readable explanation
  confidence: 'high' | 'medium' | 'low';
  category: string;        // e.g. "STEM", "Humanities", "Law", "Exam Prep"
}

export interface UseSmartModeReturn {
  suggestion: SmartSuggestion | null;
  isAnalysing: boolean;
  dismiss: () => void;
  dismissed: boolean;
}

// ── Prompt builder ──────────────────────────────────────────
function buildAnalysisPrompt(topic: string, tool: ToolType): string {
  const notesFields = tool === 'notes' ? `
  "depth": "overview" | "detailed" | "exam",` : '';
  const assignmentFields = tool === 'assignment' ? `
  "tone": "formal" | "academic" | "casual",
  "wordCount": 200 | 300 | 500 | 750 | 1000 | 1500,` : '';

  return `You are an academic assistant analysing a study topic to recommend optimal generation settings.

Tool: ${tool}
Topic: "${topic}"

Analyse the topic and return ONLY valid JSON. No markdown, no explanation.

{
  "category": "<one of: STEM, Humanities, Law, Business, Language, Exam Prep, Science, History, Psychology, General>",${notesFields}${assignmentFields}
  "reason": "<one sentence explaining why these settings fit this topic — max 15 words>",
  "confidence": "high" | "medium" | "low"
}

Rules for notes depth:
- "exam": topic contains exam/test/quiz keywords OR is a specific exam subject (Biology, Chemistry, History, etc.)
- "detailed": STEM subjects, technical topics, multi-concept topics (>3 words)
- "overview": short introductory topics, creative topics, single-concept questions

Rules for assignment tone:
- "formal": legal topics, business, policy, government, professional domains
- "academic": scientific research, historical analysis, psychology, sociology, philosophy
- "casual": creative writing, personal opinion, general interest, conversational topics

Rules for wordCount:
- 200-300: simple or personal topics
- 500: standard essay topics
- 750-1000: complex multi-faceted topics, historical analysis, policy
- 1500: research-heavy technical or scientific topics

Return ONLY the JSON object.`;
}

// ── AI call via /api/generate ───────────────────────────────
async function analyseTopicWithAI(
  topic: string,
  tool: ToolType,
): Promise<SmartSuggestion | null> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'smart_mode',
        systemPrompt: 'You are an academic assistant. Output ONLY valid JSON. No markdown. No explanation.',
        userPrompt: buildAnalysisPrompt(topic, tool),
        maxTokens: 200,
        temperature: 0.2,
        model: 'llama-3.1-8b-instant',
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;

    // Validate required fields
    if (!data.reason || !data.confidence || !data.category) return null;
    if (tool === 'notes' && !data.depth) return null;
    if (tool === 'assignment' && (!data.tone || !data.wordCount)) return null;

    return {
      depth:      data.depth as SmartSuggestion['depth'],
      tone:       data.tone as SmartSuggestion['tone'],
      wordCount:  typeof data.wordCount === 'number' ? data.wordCount : undefined,
      reason:     data.reason as string,
      confidence: data.confidence as SmartSuggestion['confidence'],
      category:   data.category as string,
    };
  } catch {
    return null;
  }
}

// ── Hook ────────────────────────────────────────────────────
export function useSmartMode(topic: string, tool: ToolType): UseSmartModeReturn {
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null);
  const [isAnalysing, setIsAnalysing]   = useState(false);
  const [dismissed, setDismissed]       = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTopicRef = useRef<string>('');

  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    // Reset dismissal when topic changes significantly
    if (topic !== lastTopicRef.current) {
      setDismissed(false);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = topic.trim();

    if (trimmed.length < 4) {
      setSuggestion(null);
      setIsAnalysing(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Don't re-analyse if topic hasn't meaningfully changed
      if (trimmed === lastTopicRef.current) return;
      lastTopicRef.current = trimmed;

      setIsAnalysing(true);
      setSuggestion(null);

      const result = await analyseTopicWithAI(trimmed, tool);

      setIsAnalysing(false);
      if (result) setSuggestion(result);
    }, 1200); // 1.2s debounce — fires after user stops typing

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [topic, tool]);

  return { suggestion, isAnalysing, dismiss, dismissed };
}
