// ============================================================
// useTimetable — Groq AI smart schedule + Supabase persistence
// ✔ Groq calls proxied through /api/generate (key never exposed)
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Subject, Schedule, DayOfWeek } from '@/types/database';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

// ── Groq generation caller — routes through /api/generate ──────
async function callGroq(prompt: string): Promise<Schedule> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'timetable',
      systemPrompt: 'You are an academic schedule planner. Output ONLY valid JSON matching the exact schema. No markdown, no explanation.',
      userPrompt: prompt,
      maxTokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Generation failed (HTTP ${res.status})`);
  }

  const parsed = await res.json() as Schedule;
  for (const day of DAYS) {
    if (!parsed[day]) parsed[day] = [];
  }
  return parsed;
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
    supabase
      .from('timetables')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedId(data.id);
          setSubjects(data.subjects as Subject[]);
          setSchedule(data.schedule as Schedule);
        }
        setIsLoading(false);
      });
  }, [user]);

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
          .from('timetables')
          .upsert(payload, { onConflict: 'user_id' })
          .select()
          .single();
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

  // ── Generate smart schedule via /api/generate ────────────
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
  }, [subjects, savedId, saveToSupabase]);

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
