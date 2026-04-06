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

export interface ChecklistTask {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  position: number;
  priority: "low" | "medium" | "high";
  category?: string;
  estimated_minutes?: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ChecklistTaskPatch = Partial<
  Pick<ChecklistTask, "completed" | "priority" | "position" | "completed_at" | "category" | "estimated_minutes">
>;

// ─── Timetable ────────────────────────────────────────────────────────────────

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

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function fetchChecklist(userId: string): Promise<ChecklistTask[]> {
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[database] fetchChecklist error:", error.message);
    throw error;
  }

  return (data ?? []) as ChecklistTask[];
}

export async function insertChecklistTask(
  userId: string,
  task: {
    title: string;
    priority: "low" | "medium" | "high";
    position: number;
    category?: string;
    estimated_minutes?: number;
  },
): Promise<ChecklistTask> {
  const { data, error } = await supabase
    .from("checklists")
    .insert({
      user_id: userId,
      title: task.title,
      completed: false,
      position: task.position,
      priority: task.priority,
      category: task.category ?? "study",
      estimated_minutes: task.estimated_minutes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[database] insertChecklistTask error:", error.message);
    throw error;
  }

  return data as ChecklistTask;
}

export async function updateChecklistTask(
  taskId: string,
  userId: string,
  patch: ChecklistTaskPatch,
): Promise<void> {
  const { error } = await supabase
    .from("checklists")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    console.error("[database] updateChecklistTask error:", error.message);
    throw error;
  }
}

export async function deleteChecklistTask(
  taskId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("checklists")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    console.error("[database] deleteChecklistTask error:", error.message);
    throw error;
  }
}
