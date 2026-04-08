/**
 * Checklist.tsx
 *
 * PHASE 7 — Monolith split into sub-components
 * ─────────────────────────────────────────────
 * This file was 41KB before Phase 7. All self-contained UI
 * pieces have been extracted to src/components/checklist/:
 *
 *   checklistTypes.ts   — Task, Priority types
 *   checklistConfig.ts  — PRIORITY_CONFIG, CATEGORY_CONFIG
 *   TaskRow.tsx         — Single task row with toggle/delete/priority
 *   SectionHeader.tsx   — Collapsible group header (Pending / Completed)
 *   AIGeneratePanel.tsx — AI modal + dashed trigger button
 *
 * This file is now the orchestrator only:
 *   - Supabase data fetching / optimistic mutations
 *   - Derived state (sorted pending, progress, estimated time)
 *   - Layout and section rendering
 *
 * Remaining size: ~12KB (down from 41KB)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  Star,
  Flag,
  Sparkles,
  AlertCircle,
  Timer,
  Download,
  FileText,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportChecklistCSV, exportChecklistJSON, exportChecklistMarkdown } from "@/lib/checklistExport";
import type { AITask, AICategory } from "@/hooks/useChecklistGenerator";
import { useAuth } from "@/context/AuthContext";
import {
  fetchChecklist,
  insertChecklistTask,
  updateChecklistTask,
  deleteChecklistTask,
  type ChecklistTask as DBTask,
} from "@/lib/database";

// Sub-components extracted in Phase 7
import { TaskRow } from "@/components/checklist/TaskRow";
import { SectionHeader } from "@/components/checklist/SectionHeader";
import { AIGeneratePanel } from "@/components/checklist/AIGeneratePanel";
import { PRIORITY_CONFIG } from "@/components/checklist/checklistConfig";
import type { Task, Priority } from "@/components/checklist/checklistTypes";

// ─── DB → App type adapter ────────────────────────────────────────────────────

function dbToTask(row: DBTask): Task {
  return {
    id: row.id,
    text: row.title,
    completed: row.completed,
    priority: row.priority as Priority,
    category: row.category as AICategory | undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Checklist = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [pendingCollapsed, setPendingCollapsed] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load from Supabase on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    fetchChecklist(userId)
      .then((rows) => { setTasks(rows.map(dbToTask)); setFetchError(null); })
      .catch((e) => setFetchError(e?.message ?? "Failed to load tasks"))
      .finally(() => setIsLoading(false));
  }, [userId]);

  // ── Add task (manual or AI bulk) ─────────────────────────────────────────────
  const addTask = useCallback(async (
    text?: string,
    opts?: { priority?: Priority; category?: AICategory; estimatedMinutes?: number },
  ) => {
    const t = (text ?? input).trim();
    if (!t) return;
    const newPriority = opts?.priority ?? priority;
    const tempId = `tmp-${Date.now()}-${Math.random()}`;
    const optimistic: Task = {
      id: tempId, text: t, completed: false, priority: newPriority,
      category: opts?.category, estimatedMinutes: opts?.estimatedMinutes,
      createdAt: Date.now(),
    };
    setTasks((prev) => [optimistic, ...prev]);
    if (!text) { setInput(""); inputRef.current?.focus(); }
    if (userId) {
      try {
        const row = await insertChecklistTask(userId, {
          title: t, priority: newPriority, position: 0,
          category: opts?.category, estimated_minutes: opts?.estimatedMinutes,
        });
        setTasks((prev) => prev.map((tk) => tk.id === tempId ? dbToTask(row) : tk));
      } catch {
        setTasks((prev) => prev.filter((tk) => tk.id !== tempId));
      }
    }
  }, [userId, input, priority]);

  const importAITasks = useCallback(async (aiTasks: AITask[]) => {
    const now = Date.now();
    const optimistic: Task[] = aiTasks.map((t, i) => ({
      id: `ai-tmp-${now}-${i}`, text: t.text, completed: false,
      priority: t.priority, category: t.category,
      estimatedMinutes: t.estimatedMinutes, createdAt: now + i,
    }));
    setTasks((prev) => [...optimistic, ...prev]);
    if (userId) {
      try {
        const inserted = await Promise.all(
          aiTasks.map((t, i) => insertChecklistTask(userId, {
            title: t.text, priority: t.priority, position: i,
            category: t.category, estimated_minutes: t.estimatedMinutes,
          })),
        );
        setTasks((prev) => {
          const tempIds = optimistic.map((o) => o.id);
          const rest = prev.filter((tk) => !tempIds.includes(tk.id));
          return [...inserted.map(dbToTask), ...rest];
        });
      } catch {
        setTasks((prev) => prev.filter((tk) => !tk.id.startsWith(`ai-tmp-${now}`)));
      }
    }
  }, [userId]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t,
    ));
    if (userId) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const nowCompleted = !task.completed;
      updateChecklistTask(id, userId, {
        completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      }).catch(() => {
        setTasks((prev) => prev.map((t) => t.id === id
          ? { ...t, completed: task.completed, completedAt: task.completedAt } : t));
      });
    }
  }, [userId, tasks]);

  const deleteTask = useCallback((id: string) => {
    const snapshot = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (userId && snapshot) {
      deleteChecklistTask(id, userId).catch(() => {
        setTasks((prev) => [snapshot, ...prev]);
      });
    }
  }, [userId, tasks]);

  const changePriority = useCallback((id: string, p: Priority) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, priority: p } : t));
    if (userId) updateChecklistTask(id, userId, { priority: p }).catch(() => {});
  }, [userId]);

  const clearCompleted = useCallback(() => {
    const toDelete = tasks.filter((t) => t.completed);
    setTasks((prev) => prev.filter((t) => !t.completed));
    if (userId) {
      Promise.all(toDelete.map((t) => deleteChecklistTask(t.id, userId))).catch(() => {
        setTasks((prev) => [...prev, ...toDelete]);
      });
    }
  }, [userId, tasks]);

  // ── Export functions ─────────────────────────────────────────────────────────
  const handleExport = async (format: 'csv' | 'json' | 'markdown') => {
    if (tasks.length === 0) {
      setExportError('No tasks to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Convert tasks to export format
      const exportTasks = tasks.map((task, idx) => ({
        id: task.id,
        title: task.text,
        completed: task.completed,
        priority: task.priority,
        category: (task.category || 'personal') as 'personal' | 'project' | 'study',
        due_date: undefined,
        completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
        estimated_minutes: task.estimatedMinutes,
        position: idx
      }));

      const title = `Checklist_${new Date().toLocaleDateString().replace(/\//g, '-')}`;

      switch (format) {
        case 'csv':
          await exportChecklistCSV(exportTasks, title);
          break;
        case 'json':
          await exportChecklistJSON(exportTasks, title);
          break;
        case 'markdown':
          await exportChecklistMarkdown(exportTasks, title);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────
  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.priority === filter);
  const pending   = filteredTasks.filter((t) => !t.completed);
  const completed = filteredTasks.filter((t) => t.completed);
  const priorityOrder: Priority[] = ["high", "medium", "low"];
  const sortedPending = [...pending].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );
  const progress = tasks.length === 0
    ? 0
    : Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
  const totalEstimatedMins = tasks
    .filter((t) => !t.completed && t.estimatedMinutes)
    .reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full md:h-full flex flex-col">
      {/* Page header — flex-wrap so progress row wraps on narrow screens */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-y-3 mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
            aria-hidden="true"
          >
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            {/* text-xl — web app heading cap (24-36px) */}
            <h1 className="font-display text-xl font-bold text-foreground">
              Checklist <span className="gradient-text">Manager</span>
            </h1>
            <p className="text-xs text-muted-foreground">Track tasks and stay on top of deadlines</p>
          </div>
        </div>

        {/* Progress indicator */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            {totalEstimatedMins > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="w-3.5 h-3.5" aria-hidden="true" />
                <span aria-label={`${totalEstimatedMins >= 60 ? `${Math.floor(totalEstimatedMins / 60)} hours ${totalEstimatedMins % 60} minutes` : `${totalEstimatedMins} minutes`} remaining`}>
                  {totalEstimatedMins >= 60
                    ? `${Math.floor(totalEstimatedMins / 60)}h ${totalEstimatedMins % 60}m left`
                    : `${totalEstimatedMins}m left`}
                </span>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p
                className="text-sm font-bold"
                style={{ color: progress === 100 ? "hsl(160,70%,46%)" : "hsl(262,80%,65%)" }}
                aria-label={`${progress}% complete`}
              >
                {progress}%
              </p>
            </div>
            {/* Progress bar: narrower on mobile (w-24) → normal on desktop (w-32) */}
            <div
              className="w-24 md:w-32 h-2 rounded-full bg-secondary overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Task completion progress"
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: progress === 100
                    ? "hsl(160,70%,46%)"
                    : "linear-gradient(90deg, hsl(262,80%,62%), hsl(220,85%,62%))",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/*
        TWO-COLUMN LAYOUT
        Mobile (<md):  flex-col — left panel stacks above task list
        Desktop (≥md): flex-row — side by side, left panel w-72

        Left panel on mobile:
          - w-full, max-h-[45dvh], overflow-y-auto (scrollable, won't push right panel off)
        Left panel on desktop:
          - w-72 shrink-0 (original behaviour)
      */}
      <div className="flex flex-col md:flex-row gap-5">

        {/* LEFT: Add task + filter + overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full md:w-72 md:shrink-0 flex flex-col gap-4 max-h-[45dvh] md:max-h-none overflow-y-auto md:overflow-visible"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Add task card */}
          <div className="glass-card rounded-2xl p-5">
            <label
              htmlFor="new-task-input"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3"
            >
              New Task
            </label>
            <input
              id="new-task-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              aria-label="New task description"
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all mb-3"
            />
            {/* Priority selector */}
            <div className="flex items-center gap-1.5 mb-3" role="group" aria-label="Select priority">
              {/* text-xs = 12px floor — minimum label size */}
              <span className="text-xs text-muted-foreground uppercase tracking-widest mr-1" aria-hidden="true">Priority:</span>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    aria-pressed={priority === p}
                    aria-label={`${cfg.label} priority`}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                      priority === p ? "scale-105" : "opacity-50 hover:opacity-80",
                    )}
                    style={{
                      background: priority === p ? `${cfg.color}18` : "transparent",
                      borderColor: `${cfg.color}35`,
                      color: cfg.color,
                    }}
                  >
                    <Flag className="w-2.5 h-2.5" aria-hidden="true" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => addTask()}
              disabled={!input.trim()}
              aria-label="Add task"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(262,80%,62%,0.3)] active:scale-[0.98] mb-2.5"
              style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Task
            </button>
            <AIGeneratePanel onImport={importAITasks} />
          </div>

          {/* Filter card */}
          <div className="glass-card rounded-2xl p-5">
            <p
              className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3"
              id="filter-group-label"
            >
              Filter
            </p>
            <div className="flex flex-col gap-1.5" role="group" aria-labelledby="filter-group-label">
              {(["all", "high", "medium", "low"] as const).map((f) => {
                const isAll = f === "all";
                const cfg = !isAll ? PRIORITY_CONFIG[f] : null;
                const color = cfg?.color ?? "hsl(262,80%,65%)";
                const active = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left font-medium border transition-all",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-transparent bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    {isAll ? (
                      <Star className="w-3.5 h-3.5" style={{ color: active ? "hsl(262,80%,65%)" : undefined }} aria-hidden="true" />
                    ) : (
                      <Flag className="w-3.5 h-3.5" style={{ color }} aria-hidden="true" />
                    )}
                    <span>{isAll ? "All tasks" : `${cfg!.label} priority`}</span>
                    <span className="ml-auto text-xs font-bold text-muted-foreground" aria-label={`${isAll ? tasks.length : tasks.filter((t) => t.priority === f).length} tasks`}>
                      {isAll ? tasks.length : tasks.filter((t) => t.priority === f).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview stats */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Overview</p>
            <div className="grid grid-cols-2 gap-2" role="list" aria-label="Task statistics">
              {[
                { label: "Total",   val: tasks.length,                                                     color: "hsl(262,80%,65%)" },
                { label: "Done",    val: tasks.filter((t) => t.completed).length,                           color: "hsl(160,70%,46%)" },
                { label: "Pending", val: tasks.filter((t) => !t.completed).length,                          color: "hsl(30,80%,57%)"  },
                { label: "High",    val: tasks.filter((t) => t.priority === "high" && !t.completed).length,  color: "hsl(340,75%,57%)" },
              ].map((s) => (
                <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center" role="listitem">
                  <p className="font-display font-bold text-lg" style={{ color: s.color }} aria-label={`${s.val} ${s.label}`}>{s.val}</p>
                  {/* text-xs = 12px minimum floor */}
                  <p className="text-xs text-muted-foreground" aria-hidden="true">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Export panel */}
          {tasks.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Export</p>
              <div className="flex flex-col gap-2">
                {exportError && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-2">
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-red-400">{exportError}</p>
                    </div>
                    <button 
                      onClick={() => setExportError(null)} 
                      className="text-red-400/60 hover:text-red-400 transition-colors shrink-0 text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all disabled:opacity-50 text-xs"
                    title="Export as CSV"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all disabled:opacity-50 text-xs"
                    title="Export as JSON"
                  >
                    <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    disabled={isExporting}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all disabled:opacity-50 text-xs"
                    title="Export as Markdown"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">MD</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* RIGHT: Task list - Only show when there are tasks, loading, or error */}
        {(tasks.length > 0 || isLoading || fetchError) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex-1 flex flex-col min-w-0"
          >
          <div
            className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(262,80%,62%,0.2) transparent" }}
          >
            {/* Loading skeleton */}
            {isLoading && (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading tasks">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-secondary/40 animate-pulse" aria-hidden="true" />
                ))}
              </div>
            )}

            {/* Fetch error */}
            {!isLoading && fetchError && (
              <div
                role="alert"
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Couldn't load tasks: {fetchError}</span>
              </div>
            )}

            {/* Empty state - Desktop only */}
            {!isLoading && !fetchError && tasks.length === 0 && (
              <div
                role="status"
                aria-label="No tasks yet"
                className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12 hidden md:flex"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: "linear-gradient(135deg, hsl(262,80%,62%,0.12), hsl(220,85%,62%,0.06))" }}
                  aria-hidden="true"
                >
                  <CheckSquare className="w-10 h-10" style={{ color: "hsl(262,80%,62%,0.6)" }} />
                </motion.div>
                <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">All clear!</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add a task manually or use{" "}
                  <span className="text-primary font-medium">Generate with AI</span>{" "}
                  to build a full study plan instantly.
                </p>
              </div>
            )}

            {/* Pending section */}
            {!isLoading && sortedPending.length > 0 && (
              <div className="flex flex-col gap-2">
                <SectionHeader
                  icon={Clock}
                  label="Pending"
                  count={sortedPending.length}
                  color="hsl(30, 80%, 57%)"
                  collapsed={pendingCollapsed}
                  controlsId="pending-task-list"
                  onToggle={() => setPendingCollapsed((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {!pendingCollapsed && (
                    <motion.div
                      id="pending-task-list"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col gap-2 overflow-hidden"
                    >
                      <AnimatePresence>
                        {sortedPending.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(task.id)}
                            onDelete={() => deleteTask(task.id)}
                            onPriorityChange={(p) => changePriority(task.id, p)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Completed section */}
            {!isLoading && completed.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <SectionHeader
                    icon={CheckCircle2}
                    label="Completed"
                    count={completed.length}
                    color="hsl(160, 70%, 46%)"
                    collapsed={completedCollapsed}
                    controlsId="completed-task-list"
                    onToggle={() => setCompletedCollapsed((v) => !v)}
                  />
                  <button
                    onClick={clearCompleted}
                    aria-label={`Clear all ${completed.length} completed tasks`}
                    className="ml-2 shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
                  >
                    Clear all
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {!completedCollapsed && (
                    <motion.div
                      id="completed-task-list"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col gap-2 overflow-hidden"
                    >
                      <AnimatePresence>
                        {completed.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(task.id)}
                            onDelete={() => deleteTask(task.id)}
                            onPriorityChange={(p) => changePriority(task.id, p)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {tasks.length > 0 && !isLoading && (
            <p className="text-xs text-muted-foreground/40 text-center mt-3 shrink-0" aria-hidden="true">
              Hover task to change priority · Press Enter to add · Click ✓ to complete
            </p>
          )}
        </motion.div>
        )}
      </div>
    </div>
  );
};

export default Checklist;
