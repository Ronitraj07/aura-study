/**
 * TaskRow.tsx
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * UI FIX — Touch accessibility: priority picker + delete button are
 * hidden behind opacity-0 group-hover:opacity-100 which means they
 * are completely inaccessible on touch devices (phones/tablets).
 * Fixed by:
 *  - Always showing the controls on @media (hover:none) via a CSS class
 *  - Keeping the hover-reveal behaviour on pointer devices
 *  - Adding word-break:break-word to task text so long strings don't
 *    overflow on small screens
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
    <>
      {/*
        Scoped styles injected once per TaskRow render.
        On touch (hover:none) devices the priority badge and delete
        button are always visible — group-hover alone isn't enough.
      */}
      <style>{`
        @media (hover: none) {
          .task-row-action {
            opacity: 1 !important;
          }
        }
      `}</style>

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
          style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
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
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
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

        {/* Priority picker
            - On pointer devices: hidden until hover (group-hover:opacity-100)
            - On touch devices: always visible (@media hover:none overrides via .task-row-action)
            - When task is completed: always hidden (pointer-events-none + opacity forced to 0)
        */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowPriority((v) => !v)}
            aria-label={`Change priority — currently ${pc.label}`}
            aria-expanded={showPriority}
            className={cn(
              "task-row-action flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all",
              "opacity-0 group-hover:opacity-100",
              task.completed && "!opacity-0 pointer-events-none",
            )}
            style={{
              background: `${pc.color}15`,
              borderColor: `${pc.color}35`,
              color: pc.color,
              minHeight: 28,
              minWidth: 44,
            }}
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
                      style={{ color: cfg.color, minHeight: 36 }}
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

        {/* Delete button
            Same touch-visibility fix as priority picker.
        */}
        <button
          onClick={onDelete}
          aria-label={`Delete task "${task.text}"`}
          className="task-row-action opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
          style={{ minWidth: 36, minHeight: 36 }}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </motion.div>
    </>
  );
}
