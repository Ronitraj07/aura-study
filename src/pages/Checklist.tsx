import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  Clock,
  Star,
  Flag,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
  completedAt?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: typeof Flag }> = {
  low: { label: "Low", color: "hsl(160, 70%, 46%)", icon: Flag },
  medium: { label: "Medium", color: "hsl(30, 80%, 57%)", icon: Flag },
  high: { label: "High", color: "hsl(340, 75%, 57%)", icon: Flag },
};

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onDelete,
  onPriorityChange,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onPriorityChange: (p: Priority) => void;
}) {
  const [showPriority, setShowPriority] = useState(false);
  const pc = PRIORITY_CONFIG[task.priority];

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
      {/* Priority indicator */}
      <div
        className="w-0.5 h-7 rounded-full shrink-0"
        style={{ background: task.completed ? "hsl(0,0%,40%)" : pc.color }}
      />

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="shrink-0 transition-transform hover:scale-110 active:scale-95"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: "hsl(160,70%,46%)" }} />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-primary transition-colors" />
        )}
      </button>

      {/* Text */}
      <span
        className={cn(
          "flex-1 text-sm leading-snug transition-all select-none",
          task.completed
            ? "line-through text-muted-foreground/50"
            : "text-foreground/85",
        )}
      >
        {task.text}
      </span>

      {/* Priority badge + picker */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowPriority((v) => !v)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all",
            "opacity-0 group-hover:opacity-100",
            task.completed && "!opacity-0 pointer-events-none",
          )}
          style={{
            background: `${pc.color}15`,
            borderColor: `${pc.color}35`,
            color: pc.color,
          }}
        >
          <Flag className="w-2.5 h-2.5" />
          {pc.label}
        </button>

        <AnimatePresence>
          {showPriority && (
            <motion.div
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
                    onClick={() => { onPriorityChange(p); setShowPriority(false); }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      task.priority === p ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                    style={{ color: cfg.color }}
                  >
                    <Flag className="w-3 h-3" />
                    {cfg.label}
                    {task.priority === p && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  count,
  color,
  collapsed,
  onToggle,
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  color: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2.5 w-full py-1 group/sec"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: `${color}15`, color }}
      >
        {count}
      </span>
      <div className="flex-1 h-px ml-1" style={{ background: `${color}20` }} />
      {collapsed ? (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform" />
      )}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Checklist = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Review lecture notes for Chapter 4", completed: false, priority: "high", createdAt: Date.now() - 3600000 },
    { id: "2", text: "Complete practice problems for Math", completed: false, priority: "medium", createdAt: Date.now() - 7200000 },
    { id: "3", text: "Read assignment brief", completed: true, priority: "low", createdAt: Date.now() - 86400000, completedAt: Date.now() - 3600000 },
  ]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [pendingCollapsed, setPendingCollapsed] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks((prev) => [
      { id: Date.now().toString(), text, completed: false, priority, createdAt: Date.now() },
      ...prev,
    ]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined }
          : t,
      ),
    );

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const changePriority = (id: string, p: Priority) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: p } : t)));

  const clearCompleted = () => setTasks((prev) => prev.filter((t) => !t.completed));

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.priority === filter);
  const pending = filteredTasks.filter((t) => !t.completed);
  const completed = filteredTasks.filter((t) => t.completed);

  // sort pending: high → medium → low
  const priorityOrder: Priority[] = ["high", "medium", "low"];
  const sortedPending = [...pending].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );

  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
          >
            <CheckSquare className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Checklist <span className="gradient-text">Manager</span>
            </h1>
            <p className="text-xs text-muted-foreground">Track tasks and stay on top of deadlines</p>
          </div>
        </div>

        {/* Progress pill */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-bold" style={{ color: progress === 100 ? "hsl(160,70%,46%)" : "hsl(262,80%,65%)" }}>
                {progress}%
              </p>
            </div>
            <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: progress === 100 ? "hsl(160,70%,46%)" : "linear-gradient(90deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Layout: left stats + right task area */}
      <div className="flex-1 flex gap-5 min-h-0">

        {/* ── LEFT: Add + stats ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-72 shrink-0 flex flex-col gap-4"
        >
          {/* Add task */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              New Task
            </label>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all mb-3"
            />

            {/* Priority selector */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mr-1">Priority:</span>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                      priority === p ? "scale-105" : "opacity-50 hover:opacity-80",
                    )}
                    style={{
                      background: priority === p ? `${cfg.color}18` : "transparent",
                      borderColor: `${cfg.color}35`,
                      color: cfg.color,
                    }}
                  >
                    <Flag className="w-2.5 h-2.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={addTask}
              disabled={!input.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(262,80%,62%,0.3)] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, hsl(262,80%,62%), hsl(220,85%,62%))" }}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          {/* Filter */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Filter
            </label>
            <div className="flex flex-col gap-1.5">
              {(["all", "high", "medium", "low"] as const).map((f) => {
                const isAll = f === "all";
                const cfg = !isAll ? PRIORITY_CONFIG[f] : null;
                const color = cfg?.color ?? "hsl(262,80%,65%)";
                const active = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left font-medium border transition-all",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-transparent bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    {isAll ? (
                      <Star className="w-3.5 h-3.5" style={{ color: active ? "hsl(262,80%,65%)" : undefined }} />
                    ) : (
                      <Flag className="w-3.5 h-3.5" style={{ color }} />
                    )}
                    <span>{isAll ? "All tasks" : `${cfg!.label} priority`}</span>
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground">
                      {isAll ? tasks.length : tasks.filter((t) => t.priority === f).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Overview</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total", val: tasks.length, color: "hsl(262,80%,65%)" },
                { label: "Done", val: tasks.filter((t) => t.completed).length, color: "hsl(160,70%,46%)" },
                { label: "Pending", val: tasks.filter((t) => !t.completed).length, color: "hsl(30,80%,57%)" },
                { label: "High", val: tasks.filter((t) => t.priority === "high" && !t.completed).length, color: "hsl(340,75%,57%)" },
              ].map((s) => (
                <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                  <p className="font-display font-bold text-lg" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Task list ── */}
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
            {/* Empty state */}
            {tasks.length === 0 && (
              <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: "linear-gradient(135deg, hsl(262,80%,62%,0.12), hsl(220,85%,62%,0.06))" }}
                >
                  <CheckSquare className="w-10 h-10" style={{ color: "hsl(262,80%,62%,0.6)" }} />
                </motion.div>
                <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">All clear!</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  No tasks yet. Add your first task to get started.
                </p>
              </div>
            )}

            {/* ── PENDING section ── */}
            {pending.length > 0 || sortedPending.length > 0 ? (
              <div className="flex flex-col gap-2">
                <SectionHeader
                  icon={Clock}
                  label="Pending"
                  count={sortedPending.length}
                  color="hsl(30, 80%, 57%)"
                  collapsed={pendingCollapsed}
                  onToggle={() => setPendingCollapsed((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {!pendingCollapsed && (
                    <motion.div
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
                      {sortedPending.length === 0 && (
                        <p className="text-xs text-muted-foreground/50 text-center py-4">No pending tasks matching filter.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            {/* ── COMPLETED section ── */}
            {completed.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <SectionHeader
                    icon={CheckCircle2}
                    label="Completed"
                    count={completed.length}
                    color="hsl(160, 70%, 46%)"
                    collapsed={completedCollapsed}
                    onToggle={() => setCompletedCollapsed((v) => !v)}
                  />
                  <button
                    onClick={clearCompleted}
                    className="ml-2 shrink-0 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
                  >
                    Clear all
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {!completedCollapsed && (
                    <motion.div
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

          {/* Bottom hint */}
          {tasks.length > 0 && (
            <p className="text-[10px] text-muted-foreground/40 text-center mt-3 shrink-0">
              Hover task to change priority · Press Enter to add · Click ✓ to complete
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Checklist;
