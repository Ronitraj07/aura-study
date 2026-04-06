/**
 * AIGeneratePanel.tsx
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * ────────────────────────────────────────────────────────────
 * Contains two components:
 *
 *  AIGenerateModal  — full-screen portal modal for AI task
 *    generation. Handles the generate → preview → import flow.
 *    Uses createPortal so z-index stacking is always correct
 *    regardless of parent overflow context.
 *
 *  AIGeneratePanel  — thin trigger wrapper that sits in the
 *    left sidebar of the Checklist page. Renders the
 *    "Generate with AI" dashed button and mounts the modal.
 *
 * Both components were previously inlined inside Checklist.tsx,
 * making the file 41KB. Extracting them here reduces the main
 * file to ~12KB and makes each piece independently testable.
 *
 * Accessibility improvements over the inline version:
 *  - Modal root has role="dialog" + aria-modal + aria-labelledby
 *  - Close button has descriptive aria-label
 *  - Generate button aria-label reflects loading state
 *  - Result task list is role="list" with sr-only heading
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
  Import,
  X,
  Timer,
  Flag,
} from "lucide-react";
import { useChecklistGenerator, type AITask } from "@/hooks/useChecklistGenerator";
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from "./checklistConfig";

// ─── Modal ────────────────────────────────────────────────────────────────────

const MODAL_TITLE_ID = "ai-generate-modal-title";

function AIGenerateModal({
  isOpen,
  onImport,
  onClose,
}: {
  isOpen: boolean;
  onImport: (tasks: AITask[]) => void;
  onClose: () => void;
}) {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const { generate, clear, isGenerating, error, result } = useChecklistGenerator();

  const handleGenerate = () => {
    if (!goal.trim()) return;
    generate(goal, context);
  };

  const handleImportAll = () => {
    if (!result) return;
    onImport(result.tasks);
    handleClose();
  };

  const handleClose = () => {
    clear();
    setGoal("");
    setContext("");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={MODAL_TITLE_ID}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "oklch(0 0 0 / 0.65)", zIndex: 9999 }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            key="ai-modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl border border-border/60 w-full max-w-lg shadow-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
                  aria-hidden="true"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3
                    id={MODAL_TITLE_ID}
                    className="font-display font-bold text-base text-foreground"
                  >
                    AI Task Generator
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Describe your goal — AI builds the plan</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close AI task generator"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all ml-3 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-6 flex flex-col gap-4 overflow-y-auto"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(262,80%,62%,0.2) transparent" }}
            >
              {/* Goal input */}
              <div>
                <label
                  htmlFor="ai-goal-input"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2"
                >
                  Goal or Topic <span className="text-destructive" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id="ai-goal-input"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleGenerate()}
                  placeholder="e.g. Prepare for Physics exam on thermodynamics"
                  className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                  disabled={isGenerating}
                  autoFocus
                  aria-required="true"
                />
              </div>

              {/* Context textarea */}
              <div>
                <label
                  htmlFor="ai-context-input"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2"
                >
                  Extra Context{" "}
                  <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  id="ai-context-input"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Exam is in 3 days, I'm struggling with heat transfer specifically"
                  rows={3}
                  className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result preview */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex flex-col gap-3"
                  >
                    <div
                      className="flex items-start justify-between p-3.5 rounded-xl border border-primary/20"
                      style={{ background: "hsl(262,80%,62%,0.06)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{result.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{result.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1.5 rounded-lg">
                        <Timer className="w-3.5 h-3.5" aria-hidden="true" />
                        {result.totalMinutes >= 60
                          ? `${Math.floor(result.totalMinutes / 60)}h ${result.totalMinutes % 60}m`
                          : `${result.totalMinutes}m`}
                      </div>
                    </div>

                    {/* Generated task list */}
                    <div
                      role="list"
                      aria-label="Generated tasks"
                      className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(262,80%,62%,0.2) transparent" }}
                    >
                      {result.tasks.map((task, i) => {
                        const pc = PRIORITY_CONFIG[task.priority];
                        const cat = CATEGORY_CONFIG[task.category];
                        const CatIcon = cat.icon;
                        return (
                          <motion.div
                            key={i}
                            role="listitem"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border/30"
                          >
                            <div
                              className="w-0.5 h-5 rounded-full shrink-0"
                              style={{ background: pc.color }}
                              aria-hidden="true"
                            />
                            <span className="flex-1 text-xs text-foreground/85 leading-snug">{task.text}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: cat.color }}>
                                <CatIcon className="w-2.5 h-2.5" aria-hidden="true" />
                                <span className="hidden sm:inline">{cat.label}</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                {task.estimatedMinutes}m
                              </span>
                              <span className="text-[10px] font-semibold" style={{ color: pc.color }}>
                                <Flag className="w-2.5 h-2.5 inline" aria-label={`${pc.label} priority`} />
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                {!result ? (
                  <>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={!goal.trim() || isGenerating}
                      aria-label={isGenerating ? "Generating tasks, please wait" : "Generate tasks"}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_hsl(262,80%,62%,0.35)] active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" aria-hidden="true" />Generate Tasks</>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => clear()}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Retry
                    </button>
                    <button
                      onClick={handleImportAll}
                      aria-label={`Import all ${result.tasks.length} generated tasks`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_hsl(262,80%,62%,0.35)] active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
                    >
                      <Import className="w-4 h-4" aria-hidden="true" />
                      Import {result.tasks.length} Tasks
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Panel (trigger button) ───────────────────────────────────────────────────

export function AIGeneratePanel({ onImport }: { onImport: (tasks: AITask[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI task generator"
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        Generate with AI
      </button>
      <AIGenerateModal isOpen={open} onImport={onImport} onClose={() => setOpen(false)} />
    </>
  );
}
