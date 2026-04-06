import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetablePayload {
  subjects: {
    id: string;
    name: string;
    hoursPerWeek: number;
    color: string;
  }[];
  grid: Record<string, { subjectId: string | null }[]>;
}

// ─── Timetable ────────────────────────────────────────────────────────────────

/**
 * Upsert (insert or update) a user's timetable in Supabase.
 * Stores the full subjects + grid as JSONB in the `timetables` table.
 *
 * Table shape (create if missing):
 *   CREATE TABLE timetables (
 *     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
 *     data        jsonb NOT NULL,
 *     updated_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users manage own timetable" ON timetables
 *     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */
export async function upsertTimetable(
  userId: string,
  payload: TimetablePayload,
): Promise<void> {
  const { error } = await supabase.from("timetables").upsert(
    {
      user_id: userId,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[database] upsertTimetable error:", error.message);
    throw error;
  }
}

/**
 * Fetch a user's saved timetable. Returns null if none exists yet.
 */
export async function fetchTimetable(
  userId: string,
): Promise<TimetablePayload | null> {
  const { data, error } = await supabase
    .from("timetables")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[database] fetchTimetable error:", error.message);
    throw error;
  }

  return (data?.data as TimetablePayload) ?? null;
}
