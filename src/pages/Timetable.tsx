import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  X,
  Clock,
  BookOpen,
  GripVertical,
  Save,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { upsertTimetable } from "@/lib/database";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  hoursPerWeek: number;
  color: string;
}

type DaySlot = { subjectId: string | null };
type WeekGrid = Record<string, DaySlot[]>;

// Drag item id format: "drag-{day}-{slotIdx}"
// Droppable id format: "drop-{day}-{slotIdx}"

function parseDragId(id: string): { day: string; slotIdx: number } | null {
  const m = id.match(/^drag-(.+)-(\d+)$/);
  if (!m) return null;
  return { day: m[1], slotIdx: parseInt(m[2], 10) };
}

function parseDropId(id: string): { day: string; slotIdx: number } | null {
  const m = id.match(/^drop-(.+)-(\d+)$/);
  if (!m) return null;
  return { day: m[1], slotIdx: parseInt(m[2], 10) };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

const SUBJECT_COLORS = [
  "hsl(262, 80%, 62%)",
  "hsl(220, 85%, 62%)",
  "hsl(160, 70%, 46%)",
  "hsl(30, 80%, 57%)",
  "hsl(340, 75%, 57%)",
  "hsl(190, 75%, 50%)",
  "hsl(55, 80%, 52%)",
  "hsl(280, 70%, 58%)",
];

// ─── Smart distributor ────────────────────────────────────────────────────────

function distributeSubjects(subjects: Subject[]): WeekGrid {
  const grid: WeekGrid = {};
  DAYS.forEach((d) => {
    grid[d] = Array.from({ length: TIME_SLOTS.length }, () => ({ subjectId: null }));
  });
  const pool: string[] = [];
  subjects.forEach((s) => {
    for (let i = 0; i < Math.min(s.hoursPerWeek, 12); i++) pool.push(s.id);
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let pi = 0;
  outer: for (let slot = 0; slot < TIME_SLOTS.length; slot++) {
    for (let di = 0; di < DAYS.length; di++) {
      if (pi >= pool.length) break outer;
      const dayAlready = grid[DAYS[di]].some((s) => s.subjectId === pool[pi]);
      if (!dayAlready) {
        grid[DAYS[di]][slot].subjectId = pool[pi++];
      }
    }
  }
  return grid;
}

// ─── Subject Row ──────────────────────────────────────────────────────────────

function SubjectRow({
  subject,
  onUpdate,
  onDelete,
}: {
  subject: Subject;
  onUpdate: (s: Subject) => void;
  onDelete: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(subject.name);

  const commitName = () => {
    onUpdate({ ...subject, name: draftName.trim() || subject.name });
    setEditingName(false);
  };

  const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 group hover:border-border/70 transition-all"
    >
      <div
        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background"
        style={{ background: subject.color }}
      />
      {editingName ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") { setDraftName(subject.name); setEditingName(false); }
          }}
          className="flex-1 bg-secondary/80 border border-primary/40 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      ) : (
        <span
          onClick={() => { setDraftName(subject.name); setEditingName(true); }}
          className="flex-1 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors truncate"
          title="Click to rename"
        >
          {subject.name}
        </span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <div className="flex">
          {HOURS_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => onUpdate({ ...subject, hoursPerWeek: h })}
              className={cn(
                "w-6 h-6 text-xs font-bold rounded transition-all",
                subject.hoursPerWeek === h
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
              style={subject.hoursPerWeek === h ? { background: subject.color } : {}}
            >
              {h}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-0.5">h/w</span>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Slot Card (shared between GridCell and DragOverlay) ──────────────────────

function SlotCard({
  subject,
  isDragging = false,
}: {
  subject: Subject;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full min-h-[44px] rounded-lg px-2 py-1.5 relative overflow-hidden transition-all",
        isDragging && "opacity-60 scale-95",
      )}
      style={{
        background: `${subject.color}20`,
        border: `1px solid ${subject.color}40`,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: subject.color }}
      />
      <p
        className="text-xs font-semibold leading-tight pl-1.5 truncate"
        style={{ color: subject.color }}
      >
        {subject.name}
      </p>
    </div>
  );
}

// ─── Sortable Grid Cell ───────────────────────────────────────────────────────

function SortableCell({
  day,
  slotIdx,
  slot,
  subjects,
  onClear,
  onClick,
  isDragActive,
}: {
  day: string;
  slotIdx: number;
  slot: DaySlot;
  subjects: Subject[];
  onClear: () => void;
  onClick: () => void;
  isDragActive: boolean;
}) {
  const subject = subjects.find((s) => s.id === slot.subjectId);
  const dragId = `drag-${day}-${slotIdx}`;
  const dropId = `drop-${day}-${slotIdx}`;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    disabled: !subject,
    data: { day, slotIdx, subjectId: slot.subjectId },
  });

  // Separate droppable ref for empty cells
  const dropRef = useRef<HTMLDivElement>(null);

  const style = subject
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
      }
    : {};

  if (!subject) {
    return (
      <div
        id={dropId}
        ref={dropRef}
        className={cn(
          "w-full min-h-[44px] rounded-lg border border-dashed transition-all flex items-center justify-center",
          isDragActive
            ? "border-primary/40 bg-primary/5 text-primary/50"
            : "border-border/30 text-muted-foreground/30 hover:border-primary/30 hover:text-primary/40 hover:bg-primary/5",
        )}
        onClick={onClick}
      >
        <Plus className="w-3 h-3" />
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        "w-full min-h-[44px] rounded-lg relative group/cell cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 z-10 opacity-0 group-hover/cell:opacity-100 p-0.5 rounded text-muted-foreground/50 hover:text-foreground transition-all"
        tabIndex={-1}
        aria-label="Drag to reschedule"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Card body — click to clear if not dragging */}
      <div
        onClick={() => {
          if (!isDragging && !isDragActive) onClear();
        }}
        className="w-full h-full"
      >
        <SlotCard subject={subject} isDragging={isDragging} />
        {!isDragActive && (
          <div className="absolute inset-0 bg-destructive/10 opacity-0 group-hover/cell:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
            <X className="w-3 h-3 text-destructive/70" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({
  subjects,
  onAssign,
  onClose,
  day,
  time,
}: {
  subjects: Subject[];
  onAssign: (subjectId: string) => void;
  onClose: () => void;
  day: string;
  time: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-2xl p-5 w-64 border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">{day}</p>
            <p className="text-sm font-semibold text-foreground">{time}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Assign subject</p>
        <div className="flex flex-col gap-1.5">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => { onAssign(s.id); onClose(); }}
              className="flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-sm font-medium text-foreground">{s.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{s.hoursPerWeek}h/w</span>
            </button>
          ))}
          {subjects.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Add subjects first</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Timetable = () => {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([
    { id: "1", name: "Mathematics", hoursPerWeek: 4, color: SUBJECT_COLORS[0] },
    { id: "2", name: "Physics", hoursPerWeek: 3, color: SUBJECT_COLORS[1] },
    { id: "3", name: "Chemistry", hoursPerWeek: 3, color: SUBJECT_COLORS[2] },
  ]);
  const [newSubject, setNewSubject] = useState("");
  const [grid, setGrid] = useState<WeekGrid | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasBuilt, setHasBuilt] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ day: string; slotIdx: number } | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [activeDay, setActiveDay] = useState("Monday");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const prevGridRef = useRef<WeekGrid | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // ── Persist to Supabase ────────────────────────────────────────────────────

  const persistGrid = useCallback(async (newGrid: WeekGrid) => {
    if (!user?.id) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await upsertTimetable(user.id, {
        subjects,
        grid: newGrid,
      } as unknown as Parameters<typeof upsertTimetable>[1]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Timetable save failed:", err);
      toast.error("Failed to save timetable");
      if (prevGridRef.current) setGrid(prevGridRef.current);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, subjects]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    prevGridRef.current = grid;
  }, [grid]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverDropId(event.over?.id as string ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverDropId(null);

    if (!over || !grid) return;

    const srcParsed = parseDragId(active.id as string);
    if (!srcParsed) return;

    const dstFromDrag = parseDragId(over.id as string);
    const dstFromDrop = parseDropId(over.id as string);
    const dst = dstFromDrag ?? dstFromDrop;
    if (!dst) return;

    if (srcParsed.day === dst.day && srcParsed.slotIdx === dst.slotIdx) return;

    const newGrid = { ...grid };
    DAYS.forEach((d) => { newGrid[d] = [...grid[d]]; });

    const srcSubjectId = newGrid[srcParsed.day][srcParsed.slotIdx].subjectId;
    const dstSubjectId = newGrid[dst.day][dst.slotIdx].subjectId;

    newGrid[srcParsed.day][srcParsed.slotIdx] = { subjectId: dstSubjectId };
    newGrid[dst.day][dst.slotIdx] = { subjectId: srcSubjectId };

    setGrid(newGrid);
    persistGrid(newGrid);
  }, [grid, persistGrid]);

  // ── Subject management ─────────────────────────────────────────────────────

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    const id = Date.now().toString();
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    setSubjects((prev) => [...prev, { id, name, hoursPerWeek: 2, color }]);
    setNewSubject("");
  };

  const updateSubject = (updated: Subject) =>
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (grid) {
      const next = { ...grid };
      DAYS.forEach((d) => {
        next[d] = next[d].map((slot) => (slot.subjectId === id ? { subjectId: null } : slot));
      });
      setGrid(next);
    }
  };

  const buildTimetable = () => {
    if (subjects.length === 0) return;
    setIsBuilding(true);
    setHasBuilt(false);
    setTimeout(() => {
      const newGrid = distributeSubjects(subjects);
      setGrid(newGrid);
      setIsBuilding(false);
      setHasBuilt(true);
      persistGrid(newGrid);
    }, 900);
  };

  const clearSlot = (day: string, slotIdx: number) => {
    if (!grid) return;
    const next = { ...grid, [day]: grid[day].map((s, i) => (i === slotIdx ? { subjectId: null } : s)) };
    setGrid(next);
    persistGrid(next);
  };

  const assignSlot = (day: string, slotIdx: number, subjectId: string) => {
    if (!grid) return;
    const next = { ...grid, [day]: grid[day].map((s, i) => (i === slotIdx ? { subjectId } : s)) };
    setGrid(next);
    persistGrid(next);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalHours = subjects.reduce((a, s) => a + s.hoursPerWeek, 0);
  const filledSlots = grid ? Object.values(grid).flat().filter((s) => s.subjectId !== null).length : 0;
  const displayDays = viewMode === "week" ? DAYS : [activeDay];
  const isDragActive = activeDragId !== null;

  const activeDragSubject = (() => {
    if (!activeDragId || !grid) return null;
    const p = parseDragId(activeDragId);
    if (!p) return null;
    const subjectId = grid[p.day]?.[p.slotIdx]?.subjectId;
    return subjects.find((s) => s.id === subjectId) ?? null;
  })();

  const sortableIds = (day: string): string[] =>
    (grid?.[day] ?? []).map((_, i) => `drag-${day}-${i}`);

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-y-3 mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(30,80%,57%), hsl(340,75%,57%))" }}
          >
            <CalendarDays className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Timetable <span className="gradient-text">Builder</span>
            </h1>
            <p className="text-xs text-muted-foreground">Plan your weekly schedule · drag slots to reschedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          <AnimatePresence mode="wait">
            {isSaving && (
              <motion.div
                key="saving"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/50"
              >
                <span className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Saving...</span>
              </motion.div>
            )}
            {saveSuccess && !isSaving && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">Saved</span>
              </motion.div>
            )}
          </AnimatePresence>

          {hasBuilt && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/50">
                {(["week", "day"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      viewMode === v ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v === "week" ? "Week" : "Day"}
                  </button>
                ))}
              </div>
              <button
                onClick={buildTimetable}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all"
              >
                <GripVertical className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">

        {/* LEFT: Subject manager */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full md:w-72 md:shrink-0 flex flex-col gap-4 max-h-[45dvh] md:max-h-none overflow-y-auto"
        >
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Add Subject</label>
            <div className="flex gap-2">
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                placeholder="e.g. Biology"
                className="flex-1 bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
              />
              <button
                onClick={addSubject}
                disabled={!newSubject.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(30,80%,57%), hsl(262,80%,62%))" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Subjects</label>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: "hsl(30,80%,57%,0.15)", color: "hsl(30,80%,65%)" }}
              >
                {subjects.length}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(30,80%,57%,0.3) transparent" }}
            >
              <AnimatePresence>
                {subjects.map((s) => (
                  <SubjectRow
                    key={s.id}
                    subject={s}
                    onUpdate={updateSubject}
                    onDelete={() => deleteSubject(s.id)}
                  />
                ))}
              </AnimatePresence>
              {subjects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No subjects yet. Add one above.</p>
              )}
            </div>
          </div>

          <button
            onClick={buildTimetable}
            disabled={subjects.length === 0 || isBuilding}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(30,80%,57%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(30,80%,57%), hsl(340,75%,57%))" }}
          >
            {isBuilding ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Building...</>
            ) : (
              <><CalendarDays className="w-4 h-4" />Build Timetable</>
            )}
          </button>

          {hasBuilt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Stats</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Subjects", val: subjects.length },
                  { label: "Hrs/Week", val: totalHours },
                  { label: "Slots", val: filledSlots },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base" style={{ color: "hsl(30,80%,62%)" }}>{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* RIGHT: Grid */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0 min-h-[40vh] md:min-h-0"
        >
          {!hasBuilt && !isBuilding ? (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "linear-gradient(135deg, hsl(30,80%,57%,0.15), hsl(340,75%,57%,0.08))" }}
              >
                <CalendarDays className="w-10 h-10" style={{ color: "hsl(30,80%,57%,0.7)" }} />
              </motion.div>
              <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">No timetable yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Add your subjects, set hours per week, then hit{" "}
                <span style={{ color: "hsl(30,80%,62%)" }} className="font-medium">Build Timetable</span>.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Color-coded</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Smart spread</span>
                <span className="flex items-center gap-1.5"><GripVertical className="w-3.5 h-3.5" /> Drag to reschedule</span>
              </div>
            </div>
          ) : isBuilding ? (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
                style={{ borderTopColor: "hsl(30,80%,57%)" }}
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Building your timetable...</p>
              <p className="text-sm text-muted-foreground">Distributing subjects across the week</p>
            </div>
          ) : grid ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex-1 flex flex-col min-h-0">
                {viewMode === "day" && (
                  <div className="flex items-center gap-1.5 mb-4 flex-wrap shrink-0">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => setActiveDay(d)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          activeDay === d
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {DAY_SHORT[i]}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="flex-1 overflow-auto rounded-2xl glass-card"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(30,80%,57%,0.2) transparent" }}
                >
                  <table className="w-full min-w-[500px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-card/80 backdrop-blur-sm w-20 p-3 text-left">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest">Time</span>
                        </th>
                        {displayDays.map((day) => (
                          <th key={day} className="p-3 text-left border-l border-border/20">
                            <span className="text-xs font-semibold text-foreground/70">{day}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((time, slotIdx) => (
                        <tr key={time}>
                          <td className="sticky left-0 z-10 bg-card/80 backdrop-blur-sm p-2 border-t border-border/20">
                            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{time}</span>
                          </td>
                          {displayDays.map((day) => (
                            <td key={day} className="p-1.5 border-t border-l border-border/20 align-top" style={{ minWidth: 90 }}>
                              <SortableContext
                                items={sortableIds(day)}
                                strategy={rectSortingStrategy}
                              >
                                <SortableCell
                                  day={day}
                                  slotIdx={slotIdx}
                                  slot={grid[day][slotIdx]}
                                  subjects={subjects}
                                  onClear={() => clearSlot(day, slotIdx)}
                                  onClick={() => setAssignTarget({ day, slotIdx })}
                                  isDragActive={isDragActive}
                                />
                              </SortableContext>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap shrink-0">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Legend:</span>
                  {subjects.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground/40">
                    Drag ⠿ to reschedule · Click filled to clear · Empty to assign
                  </span>
                </div>
              </div>

              {/* Drag overlay — follows cursor */}
              <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
                {activeDragSubject ? (
                  <div className="w-[90px] rounded-lg shadow-xl shadow-black/30 scale-105">
                    <SlotCard subject={activeDragSubject} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : null}
        </motion.div>
      </div>

      {/* Assign modal */}
      <AnimatePresence>
        {assignTarget && (
          <AssignModal
            subjects={subjects}
            day={assignTarget.day}
            time={TIME_SLOTS[assignTarget.slotIdx]}
            onAssign={(subjectId) => assignSlot(assignTarget.day, assignTarget.slotIdx, subjectId)}
            onClose={() => setAssignTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timetable;
