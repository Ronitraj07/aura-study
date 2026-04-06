import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetableSubject {
  id: string;
  name: string;
  hoursPerWeek: number;
  color: string;
}

export type WeekGrid = Record<string, { subjectId: string | null }[]>;

export interface TimetablePayload {
  subjects: TimetableSubject[];
  grid: WeekGrid;
}

// ─── Timetable ────────────────────────────────────────────────────────────────
// Real table schema:
//   id, user_id, name, subjects (jsonb), schedule (jsonb),
//   created_at, updated_at, mode, preferred_study_time, hours_per_day

export async function upsertTimetable(
  userId: string,
  payload: TimetablePayload,
): Promise<void> {
  const { error } = await supabase.from("timetables").upsert(
    {
      user_id: userId,
      subjects: payload.subjects,
      schedule: payload.grid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[database] upsertTimetable error:", error.message);
    throw error;
  }
}

export async function fetchTimetable(
  userId: string,
): Promise<TimetablePayload | null> {
  const { data, error } = await supabase
    .from("timetables")
    .select("subjects, schedule")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[database] fetchTimetable error:", error.message);
    throw error;
  }

  if (!data) return null;

  return {
    subjects: (data.subjects as TimetableSubject[]) ?? [],
    grid: (data.schedule as WeekGrid) ?? {},
  };
}
