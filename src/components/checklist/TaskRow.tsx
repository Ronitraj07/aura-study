/**
 * TaskRow.tsx
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * ────────────────────────────────────────────────────────────
 * Renders a single task row with:
 *  - Coloured priority stripe
 *  - Toggle-complete button (Circle / CheckCircle2)
 *  - Task text + category badge + estimated-time badge
 *  - Hover-reveal priority picker (dropdown portal-free)
 *  - Hover-reveal delete button
 *
 * Props are intentionally minimal — the parent Checklist passes
 * plain callbacks so this component stays pure and testable.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Circle,
  CheckCircle2,
  Flag,
  Trash2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from "./checklistConfig";
import type { Task, Priority } from "./checklistTypes";

interface TaskRowProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onPriorityChange: (p: Priority) => void;
}

export function TaskRow({ task, onToggle, onDelete, onPriorityChange }: TaskRowProps) {
  const [showPriority, setShowPriority] = useState(false);
  const pc = PRIORITY_CONFIG[task.priority];
  const cat = task.category ? CATEGORY_CONFIG[task.category] : null;
  const CatIcon = cat?.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        task.completed
          ? "bg-secondary/20 border-border/20 opacity-60"
          : "bg-secondary/40 border-border/40 hover:border-border/70 hover:bg-secondary/60",
      )}
    >
      {/* Priority stripe */}
      <div
        className="w-0.5 h-7 rounded-full shrink-0"
        style={{ background: task.completed ? "hsl(0,0%,40%)" : pc.color }}
      />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={task.completed ? `Mark "${task.text}" as pending` : `Complete "${task.text}"`}
        className="shrink-0 transition-transform hover:scale-110 active:scale-95"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: "hsl(160,70%,46%)" }} />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-primary transition-colors" />
        )}
      </button>

      {/* Text + badges */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm leading-snug transition-all select-none block",
            task.completed ? "line-through text-muted-foreground/50" : "text-foreground/85",
          )}
        >
          {task.text}
        </span>
        {(cat || task.estimatedMinutes) && !task.completed && (
          <div className="flex items-center gap-2 mt-0.5">
            {cat && CatIcon && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: cat.color }}>
                <CatIcon className="w-2.5 h-2.5" aria-hidden="true" />
                {cat.label}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Timer className="w-2.5 h-2.5" aria-hidden="true" />
                {task.estimatedMinutes}m
              </span>
            )}
          </div>
        )}
      </div>

      {/* Priority picker */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowPriority((v) => !v)}
          aria-label={`Change priority — currently ${pc.label}`}
          aria-expanded={showPriority}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all",
            "opacity-0 group-hover:opacity-100",
            task.completed && "!opacity-0 pointer-events-none",
          )}
          style={{ background: `${pc.color}15`, borderColor: `${pc.color}35`, color: pc.color }}
        >
          <Flag className="w-2.5 h-2.5" aria-hidden="true" />
          {pc.label}
        </button>

        <AnimatePresence>
          {showPriority && (
            <motion.div
              role="menu"
              aria-label="Select priority"
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-7 z-20 glass-card rounded-xl border border-border/50 p-1.5 flex flex-col gap-0.5 min-w-[100px] shadow-lg"
            >
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    role="menuitem"
                    onClick={() => { onPriorityChange(p); setShowPriority(false); }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      task.priority === p ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                    style={{ color: cfg.color }}
                  >
                    <Flag className="w-3 h-3" aria-hidden="true" />
                    {cfg.label}
                    {task.priority === p && <CheckCircle2 className="w-3 h-3 ml-auto" aria-hidden="true" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        aria-label={`Delete task "${task.text}"`}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
