// ============================================================
// useTimetable — Groq AI smart schedule + Supabase persistence
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Subject, Schedule, DayOfWeek } from '@/types/database';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];

function buildSchedulePrompt(subjects: Subject[]): string {
  const subjectList = subjects.map(s => `${s.name}: ${s.hoursPerWeek} hours/week`).join(', ');
  return `You are an academic schedule planner. Create a weekly timetable.

Subjects and hours: ${subjectList}

Rules:
- Distribute sessions across Monday–Saturday (avoid Sunday for heavy subjects)
- Each session is 1 hour
- Spread the same subject across multiple days (not all in one day)
- Start times between 08:00 and 19:00
- 1-hour gap between sessions of the same subject
- Balance the load — don't put too many sessions on one day

Return ONLY valid JSON. No markdown, no explanation:
{
  "monday": [{"subject": "<name>", "startTime": "09:00", "endTime": "10:00"}],
  "tuesday": [...],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...],
  "saturday": [...],
  "sunday": []
}

Only include days with sessions. Empty days should have [].`;
}

async function callGroq(prompt: string): Promise<Schedule> {
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
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(raw) as Schedule;
      // Ensure all 7 days exist
      for (const day of DAYS) {
        if (!parsed[day]) parsed[day] = [];
      }
      return parsed;
    } catch (e) {
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) throw e;
      console.warn(`Model ${model} failed, trying next...`, e);
    }
  }
  throw new Error('All models failed');
}

export function useTimetable() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // ── Load persisted timetable ────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from('timetables').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data) {
          setSavedId(data.id);
          setSubjects(data.subjects as Subject[]);
          setSchedule(data.schedule as Schedule);
        }
        setIsLoading(false);
      });
  }, [user]);

  // ── Generate smart schedule via Groq ────────────────────
  const generateSchedule = useCallback(async () => {
    if (subjects.length === 0) { setError('Add at least one subject first.'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = buildSchedulePrompt(subjects);
      const result = await callGroq(prompt);
      setSchedule(result);
      await saveToSupabase(subjects, result, savedId);
    } catch (e: any) {
      setError(e?.message ?? 'Schedule generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }, [subjects, savedId]);

  // ── Save ─────────────────────────────────────────────────
  const saveToSupabase = useCallback(async (
    subs: Subject[],
    sched: Schedule,
    existingId: string | null,
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const payload = {
        user_id: user.id,
        name: 'My Timetable',
        subjects: subs as any,
        schedule: sched as any,
      };

      if (existingId) {
        await supabase.from('timetables').update(payload).eq('id', existingId);
        setSavedId(existingId);
      } else {
        const { data: row, error: err } = await supabase
          .from('timetables').insert(payload).select().single();
        if (err) throw err;
        setSavedId(row.id);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('saveTimetable:', e);
      setSaveStatus('error');
    }
  }, [user]);

  const addSubject = useCallback((subject: Subject) => {
    setSubjects(prev => [...prev, subject]);
  }, []);

  const removeSubject = useCallback((name: string) => {
    setSubjects(prev => prev.filter(s => s.name !== name));
  }, []);

  const saveManually = useCallback(() => {
    if (schedule) saveToSupabase(subjects, schedule, savedId);
  }, [subjects, schedule, savedId, saveToSupabase]);

  return {
    subjects, schedule, savedId,
    isGenerating, isLoading, saveStatus, error,
    addSubject, removeSubject, generateSchedule, saveManually,
  };
}
