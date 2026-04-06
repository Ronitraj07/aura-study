// ============================================================
// useChecklistGenerator — AI-powered task list generation
// ============================================================

import { useState, useCallback } from 'react';

export type AIPriority = 'low' | 'medium' | 'high';
export type AICategory = 'study' | 'research' | 'writing' | 'review' | 'practice' | 'admin' | 'other';

export interface AITask {
  text: string;
  priority: AIPriority;
  category: AICategory;
  estimatedMinutes: number;
}

export interface GeneratedChecklist {
  title: string;
  description: string;
  totalMinutes: number;
  tasks: AITask[];
}

const SYSTEM_PROMPT = `You are an expert academic productivity coach.
Given a study goal or topic, generate a structured, actionable task list.

Rules:
- Generate 5-12 specific, concrete tasks (not vague like "study topic")
- Each task should take 10-90 minutes realistically
- Mix of priorities based on urgency and importance
- Categories: study | research | writing | review | practice | admin | other
- Tasks should build on each other in logical order
- Be specific: "Summarize Chapter 3 key concepts" not just "Read chapter"

Return ONLY valid JSON matching this exact schema:
{
  "title": "<concise checklist title>",
  "description": "<1-2 sentence overview of the plan>",
  "totalMinutes": <sum of all estimatedMinutes>,
  "tasks": [
    {
      "text": "<specific actionable task>",
      "priority": "high" | "medium" | "low",
      "category": "study" | "research" | "writing" | "review" | "practice" | "admin" | "other",
      "estimatedMinutes": <number 10-90>
    }
  ]
}`;

export function useChecklistGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedChecklist | null>(null);

  const generate = useCallback(async (goal: string, context?: string) => {
    if (!goal.trim()) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    const userPrompt = context?.trim()
      ? `Goal/Topic: ${goal.trim()}\nAdditional context: ${context.trim()}`
      : `Goal/Topic: ${goal.trim()}`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checklist',
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
          maxTokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as GeneratedChecklist;

      if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error('Invalid response: no tasks returned');
      }

      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, clear, isGenerating, error, result };
}
