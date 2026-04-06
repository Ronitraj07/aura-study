/**
 * checklistTypes.ts
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * ────────────────────────────────────────────────────────────
 * Shared TypeScript types used by Checklist page and all
 * checklist sub-components. Centralising types here prevents
 * drift between TaskRow, SectionHeader, AIGeneratePanel, and
 * the main Checklist orchestrator.
 */

import type { AICategory } from "@/hooks/useChecklistGenerator";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  category?: AICategory;
  estimatedMinutes?: number;
  createdAt: number;
  completedAt?: number;
}
