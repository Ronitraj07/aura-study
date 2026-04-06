/**
 * checklistConfig.ts
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * ────────────────────────────────────────────────────────────
 * PRIORITY_CONFIG and CATEGORY_CONFIG were duplicated across
 * the main Checklist page and the AIGenerateModal inline
 * preview. Now they live in one place; every consumer imports
 * from here.
 */

import {
  BookOpen,
  Search,
  PenTool,
  RotateCcw,
  Dumbbell,
  Settings,
  HelpCircle,
} from "lucide-react";
import type { AICategory } from "@/hooks/useChecklistGenerator";
import type { Priority } from "./checklistTypes";

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "hsl(160, 70%, 46%)" },
  medium: { label: "Medium", color: "hsl(30, 80%, 57%)"  },
  high:   { label: "High",   color: "hsl(340, 75%, 57%)" },
};

export const CATEGORY_CONFIG: Record<
  AICategory,
  { label: string; icon: typeof BookOpen; color: string }
> = {
  study:    { label: "Study",    icon: BookOpen,   color: "hsl(220, 85%, 62%)" },
  research: { label: "Research", icon: Search,     color: "hsl(262, 80%, 65%)" },
  writing:  { label: "Writing",  icon: PenTool,    color: "hsl(30, 80%, 57%)"  },
  review:   { label: "Review",   icon: RotateCcw,  color: "hsl(160, 70%, 46%)" },
  practice: { label: "Practice", icon: Dumbbell,   color: "hsl(340, 75%, 57%)" },
  admin:    { label: "Admin",    icon: Settings,   color: "hsl(0, 0%, 55%)"    },
  other:    { label: "Other",    icon: HelpCircle, color: "hsl(0, 0%, 55%)"    },
};
