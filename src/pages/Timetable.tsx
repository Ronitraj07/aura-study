import { useState, useCallback, useRef, useEffect } from "react";
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
  X,
  Clock,
  BookOpen,
  GripVertical,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Download,
  FileDown,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimetable } from "@/hooks/useTimetable";
import { exportTimetableCSV, exportTimetableICS, exportTimetableJSON, exportTimetablePDF } from "@/lib/timetableExport";
import type { Subject, Schedule, DayOfWeek } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_DISPLAY: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
const DAY_SHORT: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

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

// ─── Helper: Convert Schedule (AI format) to grid format ───────────────────

type DaySlot = { subjectId: string | null; subjectName?: string };
type WeekGrid = Record<string, DaySlot[]>;

function scheduleToGrid(schedule: Schedule | null, subjects: Subject[]): WeekGrid {
  const grid: WeekGrid = {};
  DAYS.forEach((d) => {
    grid[DAY_DISPLAY[d]] = Array.from({ length: TIME_SLOTS.length }, () => ({ subjectId: null }));
  });

  if (!schedule) return grid;

  DAYS.forEach((dayKey) => {
    const daySlots = schedule[dayKey] || [];
    daySlots.forEach((slot) => {
      // Find matching time slot index
      const timeStr = slot.startTime;
      let slotIdx = -1;

      // Convert 24h to 12h format for matching
      const [hours, mins] = timeStr.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const formatted = `${hour12}:00 ${period}`;

      slotIdx = TIME_SLOTS.findIndex(t => t.startsWith(`${hour12}:`));

      if (slotIdx >= 0) {
        const subject = subjects.find(s => s.name === slot.subject);
        if (subject) {
          // Use crypto.randomUUID if available, otherwise fallback
          const subjectId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${slot.subject}-${dayKey}-${slotIdx}`;

          grid[DAY_DISPLAY[dayKey]][slotIdx] = {
            subjectId,
            subjectName: slot.subject
          };
        }
      }
    });
  });

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

// ─── Slot Card ────────────────────────────────────────────────────────────────

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

// ─── Grid Cell ────────────────────────────────────────────────────────────────

function GridCell({
  day,
  slotIdx,
  slot,
  subjects,
  onClear,
  onClick,
}: {
  day: string;
  slotIdx: number;
  slot: DaySlot;
  subjects: Subject[];
  onClear: () => void;
  onClick: () => void;
}) {
  const subject = slot.subjectName
    ? subjects.find(s => s.name === slot.subjectName)
    : subjects.find((s) => s.name === slot.subjectId); // fallback to old format

  if (!subject) {
    return (
      <div
        className="w-full min-h-[44px] rounded-lg border border-dashed transition-all flex items-center justify-center border-border/30 text-muted-foreground/30 hover:border-primary/30 hover:text-primary/40 hover:bg-primary/5 cursor-pointer"
        onClick={onClick}
      >
        <Plus className="w-3 h-3" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[44px] rounded-lg relative group/cell">
      <div
        onClick={onClear}
        className="w-full h-full cursor-pointer"
      >
        <SlotCard subject={subject} />
        <div className="absolute inset-0 bg-destructive/10 opacity-0 group-hover/cell:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
          <X className="w-3 h-3 text-destructive/70" />
        </div>
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
  onAssign: (subjectName: string) => void;
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
              key={s.name}
              onClick={() => { onAssign(s.name); onClose(); }}
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
  const {
    subjects, schedule, isGenerating, isLoading, saveStatus, error,
    addSubject, removeSubject, generateSchedule,
  } = useTimetable();

  const [newSubject, setNewSubject] = useState("");
  const [grid, setGrid] = useState<WeekGrid | null>(null);
  const [hasBuilt, setHasBuilt] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ day: string; slotIdx: number } | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [activeDay, setActiveDay] = useState<DayOfWeek>("monday");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Convert schedule to grid when it changes
  useEffect(() => {
    if (schedule) {
      setGrid(scheduleToGrid(schedule, subjects));
      setHasBuilt(true);
    }
  }, [schedule, subjects]);

  const addNewSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    addSubject({ name, hoursPerWeek: 2, color });
    setNewSubject("");
  };

  const updateSubject = (updated: Subject) => {
    // Since we don't have an update method in the hook, remove and re-add
    removeSubject(updated.name);
    addSubject(updated);
  };

  const deleteSubject = (name: string) => {
    removeSubject(name);
    if (grid) {
      const next = { ...grid };
      Object.keys(next).forEach((d) => {
        next[d] = next[d].map((slot) =>
          slot.subjectName === name ? { subjectId: null } : slot
        );
      });
      setGrid(next);
    }
  };

  const clearSlot = (day: string, slotIdx: number) => {
    if (!grid) return;
    const next = { ...grid, [day]: grid[day].map((s, i) => (i === slotIdx ? { subjectId: null } : s)) };
    setGrid(next);
  };

  const assignSlot = (day: string, slotIdx: number, subjectName: string) => {
    if (!grid) return;
    const next = {
      ...grid,
      [day]: grid[day].map((s, i) =>
        i === slotIdx ? { subjectId: subjectName, subjectName } : s
      )
    };
    setGrid(next);
  };

  const totalHours = subjects.reduce((a, s) => a + s.hoursPerWeek, 0);
  const filledSlots = grid ? Object.values(grid).flat().filter((s) => s.subjectId !== null).length : 0;
  const displayDays = viewMode === "week" ? DAYS.map(d => DAY_DISPLAY[d]) : [DAY_DISPLAY[activeDay]];

  // Export functions
  const handleExport = async (format: 'csv' | 'ical' | 'json' | 'pdf') => {
    if (!schedule || !subjects.length) {
      setExportError('No timetable data to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Convert current data to the export format
      const timetable = {
        subjects,
        schedule: Object.fromEntries(
          Object.entries(schedule).map(([day, slots]) => [
            day,
            (slots as any[]).map((s: any) => ({
              subject: s.subject,
              start_time: s.startTime || s.start_time || '',
              end_time: s.endTime || s.end_time || '',
              duration: 60,
            }))
          ])
        ),
        mode: 'normal' as const,
        preferred_study_time: '9:00-17:00',
        hours_per_day: Math.round(totalHours / 6)
      };

      const title = `Timetable_${new Date().toLocaleDateString().replace(/\//g, '-')}`;

      switch (format) {
        case 'csv':
          await exportTimetableCSV(timetable, title);
          break;
        case 'ical':
          await exportTimetableICS(timetable, title);
          break;
        case 'json':
          await exportTimetableJSON(timetable, title);
          break;
        case 'pdf':
          await exportTimetablePDF(timetable, title);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0"
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
            <p className="text-xs text-muted-foreground">AI-powered smart scheduling · drag to adjust</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Save indicator */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/50"
              >
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Saving...</span>
              </motion.div>
            )}
            {saveStatus === 'saved' && (
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
                onClick={generateSchedule}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Regenerate</>
                )}
              </button>
              
              {/* Export Buttons */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/50">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || !hasBuilt}
                  className="p-2 rounded-lg text-xs font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50"
                  title="Export as CSV"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExport('ical')}
                  disabled={isExporting || !hasBuilt}
                  className="p-2 rounded-lg text-xs font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50"
                  title="Export as iCal (.ics)"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || !hasBuilt}
                  className="p-2 rounded-lg text-xs font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50"
                  title="Export as PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting || !hasBuilt}
                  className="p-2 rounded-lg text-xs font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50"
                  title="Export as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Export Error */}
      <AnimatePresence>
        {exportError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-red-400">Export failed</p>
              <p className="text-xs text-red-400/80 mt-0.5 break-words">{exportError}</p>
            </div>
            <button 
              onClick={() => setExportError(null)} 
              className="text-red-400/60 hover:text-red-400 transition-colors shrink-0 text-xs"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                onKeyDown={(e) => e.key === "Enter" && addNewSubject()}
                placeholder="e.g. Biology"
                className="flex-1 bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
              />
              <button
                onClick={addNewSubject}
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
                    key={s.name}
                    subject={s}
                    onUpdate={updateSubject}
                    onDelete={() => deleteSubject(s.name)}
                  />
                ))}
              </AnimatePresence>
              {subjects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No subjects yet. Add one above.</p>
              )}
            </div>
          </div>

          <button
            onClick={generateSchedule}
            disabled={subjects.length === 0 || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(30,80%,57%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(30,80%,57%), hsl(340,75%,57%))" }}
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Building...</>
            ) : (
              <><Sparkles className="w-4 h-4" />AI Generate</>
            )}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 bg-red-500/10 border-red-500/20"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </motion.div>
          )}

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

        {/* RIGHT: Grid - Only show when there's content, loading, or generating */}
        {(hasBuilt || isGenerating || isLoading) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex-1 flex flex-col min-w-0"
          >
          {isLoading ? (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary/50 mb-6" />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Loading timetable...</p>
            </div>
          ) : !hasBuilt && !isGenerating && (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12 hidden md:flex">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "linear-gradient(135deg, hsl(30,80%,57%,0.15), hsl(340,75%,57%,0.08))" }}
              >
                <Sparkles className="w-10 h-10" style={{ color: "hsl(30,80%,57%,0.7)" }} />
              </motion.div>
              <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">AI-Powered Scheduling</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Add your subjects and hours per week, then click{" "}
                <span style={{ color: "hsl(30,80%,62%)" }} className="font-medium">AI Generate</span>.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Smart</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Balanced</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI-Optimized</span>
              </div>
            </div>
          )}
          
          {isGenerating && (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
                style={{ borderTopColor: "hsl(30,80%,57%)" }}
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Generating smart schedule...</p>
              <p className="text-sm text-muted-foreground">Distributing subjects optimally across the week</p>
            </div>
          )}
          
          {grid && (
            <div className="flex-1 flex flex-col min-h-0">
              {viewMode === "day" && (
                <div className="flex items-center gap-1.5 mb-4 flex-wrap shrink-0">
                  {DAYS.map((d) => (
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
                      {DAY_SHORT[d]}
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
                            <GridCell
                              day={day}
                              slotIdx={slotIdx}
                              slot={grid[day][slotIdx]}
                              subjects={subjects}
                              onClear={() => clearSlot(day, slotIdx)}
                              onClick={() => setAssignTarget({ day, slotIdx })}
                            />
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
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                  </div>
                ))}
                <span className="ml-auto text-xs text-muted-foreground/40">
                  Click filled to clear · Empty to assign
                </span>
              </div>
            </div>
          )}
        </motion.div>
        )}
      </div>

      {/* Assign modal */}
      <AnimatePresence>
        {assignTarget && (
          <AssignModal
            subjects={subjects}
            day={assignTarget.day}
            time={TIME_SLOTS[assignTarget.slotIdx]}
            onAssign={(subjectName) => assignSlot(assignTarget.day, assignTarget.slotIdx, subjectName)}
            onClose={() => setAssignTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timetable;
