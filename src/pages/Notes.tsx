import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Download,
  Sparkles,
  Hash,
  List,
  AlignLeft,
  Lightbulb,
  ChevronRight,
  Loader2,
  AlertCircle,
  Tag,
  GraduationCap,
  Brain,
  Target,
  ClipboardList,
  BookMarked,
  History,
  RotateCcw,
  X,
  Search,
  MessageSquarePlus,
  Link2,
  RotateCw,
  FileUp,
  FileText,
  Table,
  BarChart2,
  Info,
  Zap,
  TriangleAlert,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportNotesPDF, exportExamNotesPDF } from "@/lib/pdfExport";
import { useNotesGenerator } from "@/hooks/useNotesGenerator";
import { useContentState } from "@/hooks/useContentState";
import { SubtopicsSuggester } from "@/components/SubtopicsSuggester";
import { SubtopicsInput } from "@/components/SubtopicsInput";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import type { NoteHeading, NoteBullet } from "@/types/database";
import type {
  ExamTip, Mnemonic, CheatsheetEntry, ConceptConnection,
  NoteTable, NoteChart, NoteCallout,
} from "@/hooks/useNotesGenerator";

// ─── Helpers ────────────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Phase 5B: Inline markdown renderer (bold, italic, code — no dependency needed)
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*(?!\*)[^*]+\*(?!\*)|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground/95">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="text-xs font-mono bg-secondary/80 border border-border/40 px-1 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Phase 4: Difficulty badge config
const DIFFICULTY_CONFIG = {
  intro:    { label: 'Intro',    color: 'hsl(160,70%,48%)',  bg: 'hsl(160,70%,48%,0.12)', border: 'hsl(160,70%,48%,0.3)' },
  core:     { label: 'Core',     color: 'hsl(220,85%,65%)',  bg: 'hsl(220,85%,65%,0.12)', border: 'hsl(220,85%,65%,0.3)' },
  advanced: { label: 'Advanced', color: 'hsl(340,75%,58%)',  bg: 'hsl(340,75%,58%,0.12)', border: 'hsl(340,75%,58%,0.3)' },
};

// ─── Section Card ────────────────────────────────────────────────────────────────────────────────────────
const SECTION_COLORS = [
  "hsl(262, 80%, 65%)",
  "hsl(220, 85%, 65%)",
  "hsl(160, 70%, 48%)",
  "hsl(30, 80%, 58%)",
  "hsl(340, 75%, 58%)",
];

function NoteSectionCard({
  heading,
  bullets,
  index,
  isStreaming,
  onRegenerate,
}: {
  heading: NoteHeading;
  bullets: string[];
  index: number;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const color = SECTION_COLORS[index % SECTION_COLORS.length];
  const indent = heading.level === 2;
  const diffCfg = heading.difficulty ? DIFFICULTY_CONFIG[heading.difficulty] : undefined;

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    await onRegenerate();
    setRegenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-card rounded-2xl overflow-hidden border border-border/30 hover:border-primary/20 transition-all duration-200",
        indent && "ml-4"
      )}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: color }} />
        <div className="flex-1 p-5">
          <div className="flex items-start gap-2 mb-3">
            <Hash className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
            <h3 className={cn(
              "font-display font-semibold text-foreground leading-snug flex-1",
              indent ? "text-sm" : "text-base"
            )}>
              {heading.text}
            </h3>
            {/* Phase 4: difficulty badge */}
            {diffCfg && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide border"
                style={{ background: diffCfg.bg, borderColor: diffCfg.border, color: diffCfg.color }}
              >
                {diffCfg.label}
              </span>
            )}
            {/* Phase 2: per-section regenerate button */}
            {onRegenerate && !isStreaming && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                aria-label={`Regenerate section "${heading.text}"`}
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-40"
              >
                <RotateCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
              </button>
            )}
          </div>
          {isStreaming && bullets.length === 0 ? (
            // Skeleton bullets while streaming
            <div className="space-y-2">
              {[60, 80, 50].map((w, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <ChevronRight className="w-3 h-3 shrink-0 mt-1 opacity-20" style={{ color }} />
                  <div
                    className="h-3 rounded bg-secondary/60 animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <ChevronRight className="w-3 h-3 shrink-0 mt-1" style={{ color }} />
                  {/* Phase 5B: inline markdown rendering */}
                  <span className="text-sm text-foreground/75 leading-snug">
                    {renderInlineMarkdown(bullet)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Block ───────────────────────────────────────────────────────────────────────────────────────
function SummaryBlock({ summary }: { summary: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-primary/20"
      style={{ boxShadow: "0 0 24px hsl(262,80%,60%,0.08)" }}
    >
      <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(262,80%,60%), hsl(220,85%,60%))" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-base text-foreground">Summary</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-medium">Key Takeaways</span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>
    </motion.div>
  );
}

// ─── Key Terms Block ──────────────────────────────────────────────────────────────────────────────────────────
function KeyTermsBlock({ terms }: { terms: string[] }) {
  if (!terms?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 border border-border/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-primary/60" />
        <h3 className="font-display font-semibold text-sm text-foreground">Key Terms</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <span
            key={term}
            className="text-xs px-3 py-1 rounded-full bg-secondary/60 border border-border text-foreground/70 font-medium"
          >
            {term}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Phase 4: Concept Connections Block ───────────────────────────────────────
function ConceptConnectionsBlock({ connections }: { connections: ConceptConnection[] }) {
  if (!connections?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-border/30"
    >
      <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(262,80%,60%), hsl(160,70%,48%))" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4" style={{ color: "hsl(262,80%,65%)" }} />
          <h3 className="font-display font-semibold text-base text-foreground">Concept Connections</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide"
            style={{ background: "hsl(262,80%,60%,0.12)", borderColor: "hsl(262,80%,60%,0.3)", color: "hsl(262,80%,65%)" }}
          >
            {connections.length} link{connections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-2">
          {connections.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-border/20"
              style={{ background: "hsl(0,0%,8%,0.4)" }}
            >
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5"
                style={{ background: "hsl(262,80%,60%,0.15)", borderColor: "hsl(262,80%,60%,0.3)", color: "hsl(262,80%,68%)" }}
              >
                {c.from}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5"
                style={{ background: "hsl(160,70%,45%,0.15)", borderColor: "hsl(160,70%,45%,0.3)", color: "hsl(160,70%,55%)" }}
              >
                {c.to}
              </span>
              <span className="text-xs text-foreground/60 leading-snug mt-0.5 flex-1">{c.relationship}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Academy: Table Block ─────────────────────────────────────────────────────
function NoteTableBlock({ tables }: { tables: NoteTable[] }) {
  if (!tables?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      {tables.map((table, ti) => (
        <div key={ti} className="glass-card rounded-2xl overflow-hidden border border-border/30">
          <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(220,85%,60%), hsl(262,80%,60%))" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Table className="w-4 h-4" style={{ color: "hsl(220,85%,65%)" }} />
              <span className="text-sm font-semibold text-foreground">{table.caption}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {table.headers.map((h, i) => (
                      <th
                        key={i}
                        className="text-left px-3 py-2 font-semibold text-foreground/90 border-b border-border/40"
                        style={{ background: "hsl(220,85%,60%,0.1)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-secondary/20" : ""}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-foreground/75 border-b border-border/20">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Chart colour palette
const CHART_COLORS = [
  "hsl(262,80%,65%)", "hsl(160,70%,48%)", "hsl(30,80%,58%)",
  "hsl(220,85%,65%)", "hsl(340,75%,58%)",
];

// ─── Academy: Chart Block ─────────────────────────────────────────────────────
function NoteChartBlock({ charts }: { charts: NoteChart[] }) {
  if (!charts?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      {charts.map((chart, ci) => {
        // Build recharts-compatible data
        const data = chart.labels.map((label, i) => {
          const entry: Record<string, string | number> = { label };
          chart.datasets.forEach(ds => { entry[ds.name] = ds.data[i] ?? 0; });
          return entry;
        });

        return (
          <div key={ci} className="glass-card rounded-2xl overflow-hidden border border-border/30">
            <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(160,70%,48%), hsl(220,85%,60%))" }} />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4" style={{ color: "hsl(160,70%,50%)" }} />
                <span className="text-sm font-semibold text-foreground">{chart.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{chart.description}</p>
              <ResponsiveContainer width="100%" height={220}>
                {chart.type === 'pie' ? (
                  <PieChart>
                    <Pie data={data} dataKey={chart.datasets[0]?.name ?? 'value'} nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label: l, percent }) => `${l} ${(percent * 100).toFixed(0)}%`}>
                      {data.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : chart.type === 'line' ? (
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(0,0%,55%)", fontSize: 10 }} label={chart.xLabel ? { value: chart.xLabel, position: "insideBottom", offset: -2, fill: "hsl(0,0%,50%)", fontSize: 10 } : undefined} />
                    <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 10 }} label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: "insideLeft", fill: "hsl(0,0%,50%)", fontSize: 10 } : undefined} />
                    <Tooltip contentStyle={{ background: "hsl(240,8%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {chart.datasets.map((ds, di) => (
                      <Line key={di} type="monotone" dataKey={ds.name} stroke={CHART_COLORS[di % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(0,0%,55%)", fontSize: 10 }} label={chart.xLabel ? { value: chart.xLabel, position: "insideBottom", offset: -2, fill: "hsl(0,0%,50%)", fontSize: 10 } : undefined} />
                    <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 10 }} label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: "insideLeft", fill: "hsl(0,0%,50%)", fontSize: 10 } : undefined} />
                    <Tooltip contentStyle={{ background: "hsl(240,8%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {chart.datasets.map((ds, di) => (
                      <Bar key={di} dataKey={ds.name} fill={CHART_COLORS[di % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Academy: Callout Block ───────────────────────────────────────────────────
const CALLOUT_CONFIG = {
  definition: { icon: Info,          color: "hsl(220,85%,65%)", bg: "hsl(220,85%,60%,0.08)", border: "hsl(220,85%,60%,0.25)", label: "Definition" },
  formula:    { icon: Zap,           color: "hsl(30,80%,58%)",  bg: "hsl(30,80%,55%,0.08)",  border: "hsl(30,80%,55%,0.25)",  label: "Formula" },
  tip:        { icon: Lightbulb,     color: "hsl(160,70%,48%)", bg: "hsl(160,70%,45%,0.08)", border: "hsl(160,70%,45%,0.25)", label: "Key Insight" },
  warning:    { icon: TriangleAlert, color: "hsl(340,75%,58%)", bg: "hsl(340,75%,55%,0.08)", border: "hsl(340,75%,55%,0.25)", label: "Important" },
} as const;

function NoteCalloutBlock({ callouts }: { callouts: NoteCallout[] }) {
  if (!callouts?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary/60" />
        <h3 className="font-display font-semibold text-sm text-foreground">Key Notes</h3>
      </div>
      {callouts.map((c, i) => {
        const cfg = CALLOUT_CONFIG[c.type] ?? CALLOUT_CONFIG.tip;
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl p-3 border"
            style={{ background: cfg.bg, borderColor: cfg.border }}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cfg.color}20` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-xs font-semibold text-foreground">{c.title}</span>
              </div>
              <p className="text-xs text-foreground/75 leading-snug">{c.content}</p>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Phase 5C: Flashcard flip-card component ──────────────────────────────────
function FlashcardView({ bullets, notes }: { bullets: NoteBullet[]; notes: { title: string; keyTerms: string[] } }) {
  const [flippedIdx, setFlippedIdx] = useState<number | null>(null);

  // Build flashcard pairs from bullets (heading = front, first point = back)
  const cards = bullets.flatMap((b) =>
    b.points.map((point, i) => ({
      front: i === 0 ? b.heading : `${b.heading} (${i + 1})`,
      back: point,
    }))
  );

  if (cards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3 shrink-0">
        <BookMarked className="w-4 h-4 shrink-0" style={{ color: "hsl(220,85%,65%)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{notes.title} — Flashcards</p>
          <p className="text-xs text-muted-foreground">{cards.length} cards · click to flip</p>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider"
          style={{ background: "hsl(220,85%,65%,0.15)", borderColor: "hsl(220,85%,65%,0.3)", color: "hsl(220,85%,68%)" }}
        >
          Flashcards
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {cards.map((card, i) => {
          const flipped = flippedIdx === i;
          return (
            <button
              key={i}
              onClick={() => setFlippedIdx(flipped ? null : i)}
              aria-label={flipped ? `Hide answer for ${card.front}` : `Show answer for ${card.front}`}
              className="text-left"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '80px' }}
              >
                {/* Front */}
                <div
                  className="glass-card rounded-2xl p-4 border border-border/30 hover:border-primary/20 transition-colors absolute inset-0 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Question</span>
                  <span className="text-sm font-semibold text-foreground/90 leading-snug mt-2">{card.front}</span>
                  <span className="text-[10px] text-muted-foreground/50 mt-2">tap to reveal answer</span>
                </div>
                {/* Back */}
                <div
                  className="glass-card rounded-2xl p-4 border absolute inset-0 flex flex-col justify-between"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    borderColor: 'hsl(160,70%,45%,0.3)',
                    background: 'hsl(160,70%,45%,0.05)',
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "hsl(160,70%,52%)" }}>Answer</span>
                  <span className="text-sm text-foreground/80 leading-relaxed mt-2">{renderInlineMarkdown(card.back)}</span>
                  <span className="text-[10px] text-muted-foreground/50 mt-2">tap to flip back</span>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground/40 text-center pb-2">AI-generated · auto-saved to your account</p>
    </motion.div>
  );
}

// ─── Exam Tips Block ──────────────────────────────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  easy:   { color: "hsl(160,70%,48%)",  label: "Easy" },
  medium: { color: "hsl(30,80%,58%)",   label: "Medium" },
  hard:   { color: "hsl(340,75%,58%)",  label: "Hard" },
};

function ExamTipsBlock({ tips }: { tips: ExamTip[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-border/30"
    >
      <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(340,75%,55%), hsl(30,80%,55%))" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: "hsl(340,75%,60%)" }} />
          <h3 className="font-display font-semibold text-base text-foreground">Exam Q&amp;A</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium border"
            style={{ background: "hsl(340,75%,58%,0.12)", borderColor: "hsl(340,75%,58%,0.3)", color: "hsl(340,75%,62%)" }}
          >
            {(!tips || tips.length === 0) ? 'No questions' : `${tips.length} questions`}
          </span>
        </div>
        
        {(!tips || tips.length === 0) ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(340,75%,55%,0.1)" }}>
              <Target className="w-6 h-6 opacity-40" style={{ color: "hsl(340,75%,60%)" }} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No exam questions generated</p>
            <p className="text-xs text-muted-foreground/60">Try regenerating with exam mode enabled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tips.map((tip, i) => {
            const cfg = DIFF_CONFIG[tip.difficulty] ?? DIFF_CONFIG.medium;
            const open = expanded === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-border/30 overflow-hidden transition-all duration-200 hover:border-border/60"
                style={{ background: "hsl(0,0%,8%,0.4)" }}
              >
                <button
                  onClick={() => setExpanded(open ? null : i)}
                  className="w-full flex items-start gap-3 p-3.5 text-left"
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 uppercase tracking-wide border"
                    style={{
                      background: `${cfg.color}18`,
                      borderColor: `${cfg.color}40`,
                      color: cfg.color,
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-sm font-medium text-foreground/90 leading-snug flex-1">{tip.question}</span>
                  <ChevronRight
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground transition-transform duration-200"
                    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-3.5 pt-0 text-sm text-foreground/75 leading-relaxed border-t border-border/20"
                        style={{ marginTop: "-1px", paddingTop: "12px" }}
                      >
                        {tip.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Mnemonics Block ──────────────────────────────────────────────────────────────────────────────────────────────
function MnemonicsBlock({ mnemonics }: { mnemonics: Mnemonic[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 border border-border/30"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4" style={{ color: "hsl(220,85%,65%)" }} />
        <h3 className="font-display font-semibold text-base text-foreground">Memory Devices</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide"
          style={{ background: "hsl(220,85%,65%,0.12)", borderColor: "hsl(220,85%,65%,0.3)", color: "hsl(220,85%,67%)" }}
        >
          {(!mnemonics || mnemonics.length === 0) ? 'None' : `${mnemonics.length} mnemonics`}
        </span>
      </div>
      
      {(!mnemonics || mnemonics.length === 0) ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(220,85%,65%,0.1)" }}>
            <Brain className="w-6 h-6 opacity-40" style={{ color: "hsl(220,85%,65%)" }} />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No memory devices created</p>
          <p className="text-xs text-muted-foreground/60">Enable mnemonics in exam mode for memory aids</p>
        </div>
      ) : (
        <div className="space-y-3">{mnemonics.map((m, i) => (
          <div
            key={i}
            className="rounded-xl border p-4"
            style={{
              background: "hsl(220,85%,60%,0.06)",
              borderColor: "hsl(220,85%,60%,0.2)",
            }}
          >
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-1">
              Concept
            </p>
            <p className="text-xs font-semibold mb-2" style={{ color: "hsl(220,85%,65%)" }}>
              {m.concept}
            </p>
            <p className="text-base font-bold text-foreground mb-2 italic">
              &ldquo;{m.device}&rdquo;
            </p>
            <p className="text-xs text-foreground/65 leading-relaxed">{m.explanation}</p>
          </div>
        ))}
      </div>
      )}
    </motion.div>
  );
}

// ─── Cheatsheet Block ────────────────────────────────────────────────────────────────────────────────────────────
function CheatsheetBlock({ entries }: { entries: CheatsheetEntry[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-border/30"
    >
      <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(30,80%,55%), hsl(262,80%,60%))" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4" style={{ color: "hsl(30,80%,60%)" }} />
          <h3 className="font-display font-semibold text-base text-foreground">Quick Reference</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide"
            style={{ background: "hsl(30,80%,58%,0.12)", borderColor: "hsl(30,80%,58%,0.3)", color: "hsl(30,80%,62%)" }}
          >
            {(!entries || entries.length === 0) ? 'None' : `${entries.length} items`}
          </span>
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(30,80%,55%,0.1)" }}>
              <ClipboardList className="w-6 h-6 opacity-40" style={{ color: "hsl(30,80%,60%)" }} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No cheatsheet created</p>
            <p className="text-xs text-muted-foreground/60">Enable cheatsheet in exam mode for key concepts</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border/30">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[2fr_3fr] gap-0 border-b border-border/20 last:border-b-0"
              )}
              style={{ background: i % 2 === 0 ? "hsl(0,0%,8%,0.4)" : "hsl(0,0%,10%,0.3)" }}
            >
              <div className="px-4 py-2.5 border-r border-border/20">
                <span className="text-xs font-semibold text-foreground/90">{entry.label}</span>
              </div>
              <div className="px-4 py-2.5">
                <span className="text-xs text-foreground/70">{entry.value}</span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── History Sheet ────────────────────────────────────────────────────────────────────────────────────────
function NotesHistorySheet({
  open,
  onClose,
  versions,
  onRestore,
  restoring,
}: {
  open: boolean;
  onClose: () => void;
  versions: ReturnType<typeof import('@/hooks/useNotesGenerator').useNotesGenerator>['versions'];
  onRestore: (v: (typeof versions)[0]) => void;
  restoring: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVersions = versions.filter((v) =>
    v.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 h-full w-[min(20rem,92vw)] z-50 flex flex-col"
            style={{ background: "hsl(240,8%,7%)", borderLeft: "1px solid hsl(0,0%,15%)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">Version History</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close version history"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {versions.length > 0 && (
              <div className="px-4 pt-4 pb-3 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search versions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/60 border border-border/40 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
              {filteredVersions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                  <History className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm">
                    {searchQuery ? "No matching versions" : "No versions yet"}
                  </p>
                  <p className="text-xs mt-1 opacity-60">
                    {searchQuery ? "Try a different search term" : "Versions are saved each time you regenerate"}
                  </p>
                </div>
              ) : (
                filteredVersions.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-border/30 p-3.5 hover:border-primary/20 transition-all"
                    style={{ background: "hsl(0,0%,10%,0.6)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded border"
                            style={{ background: "hsl(160,70%,45%,0.15)", borderColor: "hsl(160,70%,45%,0.3)", color: "hsl(160,70%,55%)" }}
                          >
                            v{v.version}
                          </span>
                          <span className="text-xs text-muted-foreground">{timeAgo(v.created_at)}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground/80 truncate">{v.topic}</p>
                      </div>
                      <button
                        onClick={() => onRestore(v)}
                        disabled={restoring}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40"
                        style={{ background: "hsl(160,70%,45%,0.1)", borderColor: "hsl(160,70%,45%,0.3)", color: "hsl(160,70%,55%)" }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground/50 text-center">
                Restoring saves a new snapshot of your current version first
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────────────────────────────────
const Notes = () => {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<'overview' | 'detailed' | 'exam' | 'academy'>('overview');
  const [examMode, setExamMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [followUpRefreshKey, setFollowUpRefreshKey] = useState(0);
  // Phase-2 task 2.2: mobile right-panel sheet state
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Enhanced notes options
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [format, setFormat] = useState<'cornell' | 'outline' | 'concept_map' | 'flashcards' | 'traditional'>('traditional');
  const [studentLevel, setStudentLevel] = useState<'high_school' | 'undergraduate' | 'graduate'>('undergraduate');
  const [examType, setExamType] = useState<'multiple_choice' | 'essay' | 'practical' | 'mixed'>('mixed');
  const [includeQuestions, setIncludeQuestions] = useState(false);
  const [includeDiagrams, setIncludeDiagrams] = useState(false);
  const [studyDuration, setStudyDuration] = useState<'1_hour' | '1_day' | '1_week'>('1_day');
  const [includeExamTips, setIncludeExamTips] = useState(false);
  const [includeMnemonics, setIncludeMnemonics] = useState(false);
  const [includeCheatsheet, setIncludeCheatsheet] = useState(false);

  // PDF / document upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; wordCount: number } | null>(null);
  const [sourceContent, setSourceContent] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadedFile(null);
    setSourceContent(undefined);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json() as { success: boolean; content?: string; metadata?: { wordCount?: number; fileName?: string }; error?: string };
      if (!data.success || !data.content) {
        setUploadError(data.error ?? 'Failed to extract text from file.');
        return;
      }
      setSourceContent(data.content);
      setUploadedFile({ name: file.name, wordCount: data.metadata?.wordCount ?? 0 });
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const {
    notes, savedId, isGenerating, isStreaming, isResearching, saveStatus, error, sectionError,
    versions, generate, regenerateSection, loadVersions, restoreVersion,
  } = useNotesGenerator();
  const hasGenerated = !!notes;
  const hasExamContent = !!(notes?.exam_tips?.length || notes?.mnemonics?.length || notes?.cheatsheet?.length);
  const isFlashcardMode = format === 'flashcards' && hasGenerated && !examMode;
  const { hasGeneratedContent } = useContentState('notes', hasGenerated);

  const handleGenerate = () => {
    if (!topic.trim() || isGenerating) return;
    generate({ 
      topic: topic.trim(), 
      depth,
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      format: format !== 'traditional' ? format : undefined,
      studentLevel: studentLevel !== 'undergraduate' ? studentLevel : undefined,
      examType: examType !== 'mixed' ? examType : undefined,
      includeQuestions: includeQuestions || undefined,
      includeDiagrams: includeDiagrams || undefined,
      studyDuration: studyDuration !== '1_day' ? studyDuration : undefined,
      includeExamTips: includeExamTips || undefined,
      includeMnemonics: includeMnemonics || undefined,
      includeCheatsheet: includeCheatsheet || undefined,
      sourceContent,
    });
    if (depth === 'exam' || includeExamTips || includeMnemonics || includeCheatsheet) {
      setExamMode(true);
    } else {
      setExamMode(false);
    }
  };

  const handleCopy = () => {
    if (!notes) return;
    const sections = notes.headings.map((h) => {
      const b = notes.bullets.find((b) => b.heading === h.text);
      const points = b?.points?.join("\n  - ") ?? "";
      return `## ${h.text}\n  - ${points}`;
    });
    const text = [`# ${notes.title}`, ...sections, `\n## Summary\n${notes.summary}`].join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenHistory = () => {
    if (savedId) loadVersions(savedId);
    setHistoryOpen(true);
  };

  const handleRestore = async (v: (typeof versions)[0]) => {
    setRestoring(true);
    await restoreVersion(v);
    setRestoring(false);
    setHistoryOpen(false);
  };

  const handleExportPDF = async () => {
    if (isPdfExporting || !notes) return;
    setIsPdfExporting(true);
    try {
      // Phase 5A: pass difficulty and connections to PDF
      const sections = notes.headings.map((h, i) => {
        const b = notes.bullets.find((bl) => bl.heading === h.text);
        return {
          id: i + 1,
          heading: h.text,
          bullets: b?.points ?? [],
          color: SECTION_COLORS[i % SECTION_COLORS.length],
          difficulty: h.difficulty,
        };
      });

      if (examMode && hasExamContent) {
        await exportExamNotesPDF(
          notes.title,
          sections,
          notes.exam_tips ?? [],
          notes.mnemonics ?? [],
          notes.cheatsheet ?? []
        );
      } else {
        const summaryLines = notes.summary.split(". ").filter(Boolean).map((s) => s.endsWith(".") ? s : s + ".");
        await exportNotesPDF(notes.title, sections, summaryLines, notes.connections, notes.tables);
      }
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const totalBullets = notes?.bullets.reduce((a, b) => a + (b.points?.length ?? 0), 0) ?? 0;

  const DEPTH_CONFIG = [
    { key: 'overview' as const,  label: 'Overview',      desc: '3–4 sections' },
    { key: 'detailed' as const,  label: 'Detailed',      desc: '4–6 sections' },
    { key: 'exam' as const,      label: 'Exam Mode',     desc: '+ tips & mnemonics' },
    { key: 'academy' as const,   label: 'Academy Notes', desc: 'Tables · charts · callouts' },
  ];

  // Right-panel content — reused for both the desktop column and the mobile sheet
  const rightPanelContent = (
    <>
      {!hasGenerated && !isGenerating && (
        <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, hsl(160,70%,45%,0.15), hsl(220,85%,60%,0.08))" }}
          >
            <BookOpen className="w-10 h-10" style={{ color: "hsl(160,70%,48%,0.7)" }} />
          </motion.div>
          <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">Ready to generate notes</h3>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Enter any topic and hit{" "}
            <span style={{ color: "hsl(160,70%,50%)" }} className="font-medium">Generate Notes</span>{" "}
            for AI-researched structured headings, bullets, and a summary.
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Sections</span>
            <span className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" /> Bullets</span>
            <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Summary</span>
          </div>
        </div>
      )}

      {isGenerating && !isStreaming && !notes && (
        <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
            style={{ borderTopColor: depth === 'exam' ? "hsl(340,75%,55%)" : "hsl(160,70%,45%)" }}
          />
          <p className="font-display text-lg font-semibold text-foreground/80 mb-1">
            {isResearching ? "Researching topic..." : "Generating notes..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isResearching
              ? "Gathering facts via Groq"
              : depth === 'exam'
              ? "Building exam tips, mnemonics & cheatsheet"
              : "Organising headings and bullet points"}
          </p>
        </div>
      )}

      {notes && (
        <AnimatePresence mode="wait">
          {examMode ? (
            <motion.div
              key="exam"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(340,75%,55%,0.3) transparent" }}
            >
              <div
                className="glass-card rounded-2xl p-4 flex items-center gap-3 shrink-0 border"
                style={{ borderColor: "hsl(340,75%,55%,0.25)", background: "hsl(340,75%,55%,0.05)" }}
              >
                <GraduationCap className="w-4 h-4 shrink-0" style={{ color: "hsl(340,75%,60%)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{notes.title} — Exam Prep</p>
                  <p className="text-xs text-muted-foreground">
                    {notes.exam_tips?.length ?? 0} exam Q&As · {notes.mnemonics?.length ?? 0} mnemonics · {notes.cheatsheet?.length ?? 0} cheatsheet entries
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider"
                  style={{ background: "hsl(340,75%,55%,0.15)", borderColor: "hsl(340,75%,55%,0.3)", color: "hsl(340,75%,62%)" }}
                >
                  Exam Mode
                </span>
              </div>
              <ExamTipsBlock tips={notes.exam_tips ?? []} />
              <MnemonicsBlock mnemonics={notes.mnemonics ?? []} />
              <CheatsheetBlock entries={notes.cheatsheet ?? []} />
              <p className="text-xs text-muted-foreground/40 text-center pb-2">AI-generated · auto-saved to your account</p>
            </motion.div>
          ) : isFlashcardMode ? (
            // Phase 5C: Flashcard mode
            <FlashcardView key="flashcards" bullets={notes.bullets} notes={{ title: notes.title, keyTerms: notes.keyTerms ?? [] }} />
          ) : (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(160,70%,45%,0.3) transparent" }}
            >
              <div className="glass-card rounded-2xl p-4 flex items-center gap-3 shrink-0">
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: "hsl(160,70%,50%)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{notes.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {notes.headings.length} sections · {totalBullets} bullets
                    {isStreaming ? " · streaming…" : " · summary included"}
                  </p>
                </div>
                {isStreaming && (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "hsl(160,70%,50%)" }} />
                )}
              </div>
              <AnimatePresence>
                {notes.headings.map((heading, i) => {
                  const bulletEntry = notes.bullets.find((b) => b.heading === heading.text);
                  return (
                    <NoteSectionCard
                      key={heading.text + i}
                      heading={heading}
                      bullets={bulletEntry?.points ?? []}
                      index={i}
                      isStreaming={isStreaming && !bulletEntry}
                      onRegenerate={
                        !isGenerating
                          ? () => regenerateSection(heading.text, notes.title)
                          : undefined
                      }
                    />
                  );
                })}
              </AnimatePresence>
              {!isStreaming && notes.summary && <SummaryBlock summary={notes.summary} />}
              {!isStreaming && <KeyTermsBlock terms={notes.keyTerms ?? []} />}
              {/* Phase 4: Concept connections */}
              {!isStreaming && notes.connections && (
                <ConceptConnectionsBlock connections={notes.connections} />
              )}
              {/* Academy: callouts, tables, charts */}
              {!isStreaming && !!notes.callouts?.length && (
                <NoteCalloutBlock callouts={notes.callouts} />
              )}
              {!isStreaming && !!notes.tables?.length && (
                <NoteTableBlock tables={notes.tables} />
              )}
              {!isStreaming && !!notes.charts?.length && (
                <NoteChartBlock charts={notes.charts} />
              )}
              <p className="text-xs text-muted-foreground/40 text-center pb-2">AI-generated · auto-saved to your account</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );

  return (
    <div className="flex flex-col md:h-full">
      {hasGeneratedContent && (
        <NotesHistorySheet
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          versions={versions}
          onRestore={handleRestore}
          restoring={restoring}
        />
      )}

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-y-3 mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))" }}
          >
            <BookOpen className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Notes <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI-researched structured notes with headings, bullets &amp; summary</p>
          </div>
        </div>

        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-wrap items-center gap-2"
          >
            {hasExamContent && (
              <button
                onClick={() => setExamMode((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  examMode
                    ? "text-white border-transparent"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/30"
                )}
                style={examMode ? { background: "linear-gradient(135deg, hsl(340,75%,50%), hsl(30,80%,52%))" } : {}}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Exam Mode
              </button>
            )}
            {savedId && hasGeneratedContent && (
              <button
                onClick={handleOpenHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-secondary border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                aria-label="Open version history"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            )}
            {saveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Notes"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isPdfExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(160,70%,45%,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))" }}
            >
              {isPdfExporting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Exporting...</>
                : <><Download className="w-3.5 h-3.5" />Export PDF</>
              }
            </button>
          </motion.div>
        )}
      </motion.div>

      {/*
        ── THREE-COLUMN LAYOUT (Phase-2 task 2.1)
        Mobile  (<md):  single column stack
        Desktop (≥md):  [left 288px] [centre flex-1] [right 288px (FollowUp)]
        Right col appears only after first generation.
      */}
      <div className={`flex flex-col md:flex-row gap-5 ${(notes || isGenerating) ? 'md:flex-1 md:min-h-0' : ''}`}>

        {/* ── LEFT PANEL ──
            Phase-2 task 2.3: removed max-h-[45dvh] clamp.
            Left panel now scrolls naturally at all viewport sizes. */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full md:w-72 md:shrink-0 flex flex-col gap-4 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="glass-card rounded-2xl p-5">
            <label
              htmlFor="notes-topic-input"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3"
            >
              Topic
            </label>
            <textarea
              id="notes-topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis and Plant Biology"
              rows={4}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>

          {/* Source Document Upload */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Source Document <span className="normal-case text-muted-foreground/50">(optional)</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = '';
              }}
            />
            {uploadedFile ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                <FileText className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground/90 truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{uploadedFile.wordCount.toLocaleString()} words extracted</p>
                </div>
                <button
                  onClick={() => { setUploadedFile(null); setSourceContent(undefined); setUploadError(null); }}
                  aria-label="Remove uploaded file"
                  className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <FileUp className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isUploading ? "Extracting text…" : "Upload PDF, DOCX or TXT"}
                </span>
              </button>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {uploadError}
              </p>
            )}
            {uploadedFile && (
              <p className="mt-2 text-xs text-muted-foreground/60 leading-snug">
                AI will base notes primarily on the uploaded document.
              </p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Mode</p>
            <div className="flex flex-col gap-2">
              {DEPTH_CONFIG.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDepth(d.key)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-left border transition-all",
                    depth === d.key
                      ? "border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                  )}
                  style={depth === d.key ? { background: d.key === 'exam' ? 'linear-gradient(135deg,hsl(340,75%,50%,0.15),hsl(30,80%,52%,0.1))' : 'hsl(262,80%,60%,0.1)' } : {}}
                >
                  <div className="flex items-center gap-2">
                    {d.key === 'exam'
                      ? <GraduationCap className="w-3.5 h-3.5" style={{ color: depth === d.key ? 'hsl(340,75%,60%)' : undefined }} />
                      : d.key === 'detailed'
                      ? <BookMarked className="w-3.5 h-3.5" />
                      : <BookOpen className="w-3.5 h-3.5" />
                    }
                    <span className="text-xs font-semibold">{d.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subtopics */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Subtopics (optional)
            </p>
            <SubtopicsSuggester
              mainTopic={topic}
              onSelectSuggestion={(subtopic) => {
                if (!subtopics.includes(subtopic)) {
                  setSubtopics(prev => [...prev, subtopic]);
                }
              }}
              existingSubtopics={subtopics}
              className="mb-4"
            />
            <SubtopicsInput
              subtopics={subtopics}
              onChange={setSubtopics}
              placeholder="Add custom subtopic..."
              maxItems={8}
              maxLength={50}
              showCharacterCount={true}
              enableDragReorder={true}
            />
          </div>

          {/* Format */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Format</p>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: 'traditional', label: 'Traditional', desc: 'Standard headers & bullets' },
                { value: 'cornell', label: 'Cornell Notes', desc: 'Cues, notes, summary' },
                { value: 'outline', label: 'Outline', desc: 'Hierarchical structure' },
                { value: 'concept_map', label: 'Concept Map', desc: 'Connected concepts' },
                { value: 'flashcards', label: 'Flashcard Ready', desc: 'Terms & definitions' }
              ] as const).map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
                    format === value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-foreground hover:border-primary/20"
                  )}
                >
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student Level */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Student Level</p>
            <div className="grid grid-cols-1 gap-2">
              {([
                { value: 'high_school', label: 'High School', desc: 'Foundational concepts' },
                { value: 'undergraduate', label: 'Undergraduate', desc: 'Intermediate depth' },
                { value: 'graduate', label: 'Graduate', desc: 'Advanced, specialized' }
              ] as const).map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setStudentLevel(value)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
                    studentLevel === value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-foreground hover:border-primary/20"
                  )}
                >
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Features */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Exam Features
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Exam Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: 'multiple_choice', label: 'Multiple Choice' },
                    { value: 'essay', label: 'Essay' },
                    { value: 'practical', label: 'Practical' },
                    { value: 'mixed', label: 'Mixed' }
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setExamType(value)}
                      className={cn(
                        "py-1.5 rounded-xl text-xs font-semibold border transition-all",
                        examType === value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Study Duration</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: '1_hour', label: '1 Hour' },
                    { value: '1_day', label: '1 Day' },
                    { value: '1_week', label: '1 Week' }
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setStudyDuration(value)}
                      className={cn(
                        "py-1.5 rounded-xl text-xs font-semibold border transition-all",
                        studyDuration === value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { state: includeExamTips, setter: setIncludeExamTips, label: 'Practice Questions', desc: 'Exam Q&A with difficulty levels' },
                  { state: includeMnemonics, setter: setIncludeMnemonics, label: 'Mnemonics', desc: 'Memory devices and acronyms' },
                  { state: includeCheatsheet, setter: setIncludeCheatsheet, label: 'Cheat Sheet', desc: 'Key facts and formulas' },
                  { state: includeQuestions, setter: setIncludeQuestions, label: 'Review Questions', desc: 'Questions throughout notes' },
                  { state: includeDiagrams, setter: setIncludeDiagrams, label: 'Diagram Descriptions', desc: 'Visual explanations' }
                ].map(({ state, setter, label, desc }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-foreground">{label}</label>
                      <p className="text-xs text-muted-foreground/60">{desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={state}
                      aria-label={`Toggle ${label}`}
                      onClick={() => setter(prev => !prev)}
                      className={cn(
                        "w-11 h-6 rounded-full border-2 transition-all flex items-center",
                        state 
                          ? "bg-primary/20 border-primary/40" 
                          : "bg-secondary/40 border-border"
                      )}
                    >
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          state ? "translate-x-5" : "translate-x-0.5"
                        )} 
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Output includes */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Output Includes</p>
            <div className="flex flex-col gap-2">
              {[
                { icon: Hash, label: "Section Headings", desc: depth === 'detailed' || depth === 'exam' ? "4–6 structured sections" : "3–4 structured sections", color: "hsl(262,80%,65%)" },
                { icon: List, label: "Bullet Points", desc: "Concise scannable facts", color: "hsl(220,85%,65%)" },
                { icon: AlignLeft, label: "Summary", desc: "Executive summary", color: "hsl(160,70%,48%)" },
                { icon: Tag, label: "Key Terms", desc: "Vocabulary glossary", color: "hsl(30,80%,58%)" },
                ...(depth === 'exam' ? [
                  { icon: Target, label: "Exam Q&A", desc: "5–8 likely exam questions", color: "hsl(340,75%,58%)" },
                  { icon: Brain, label: "Mnemonics", desc: "Memory devices", color: "hsl(220,85%,65%)" },
                  { icon: ClipboardList, label: "Cheatsheet", desc: "Key facts at a glance", color: "hsl(30,80%,58%)" },
                ] : []),
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: depth === 'exam'
                ? "linear-gradient(135deg, hsl(340,75%,50%), hsl(30,80%,52%))"
                : "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))",
            }}
          >
            {isResearching ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Researching...</>
            ) : isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <>{depth === 'exam' ? <GraduationCap className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}Generate Notes</>
            )}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {sectionError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {sectionError}
            </motion.div>
          )}

          {hasGenerated && notes && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Stats</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Sections", val: notes.headings.length },
                  { label: "Bullets", val: totalBullets },
                  { label: "Terms", val: notes.keyTerms?.length ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base" style={{ color: "hsl(160,70%,52%)" }}>{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {notes.researchSource && notes.researchSource !== 'none' && (
                <p className="text-xs text-muted-foreground/50 mt-2 text-center">
                  Research via {notes.researchSource}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* ── CENTRE PANEL (notes output) ──
            On mobile: full width stack.
            On desktop: flex-1, scrolls independently. */}
        {(notes || isGenerating) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex-1 flex flex-col min-w-0"
          >
            {rightPanelContent}
          </motion.div>
        )}

        {/* ── RIGHT PANEL — FollowUpPanel (Phase-2 task 2.1) ──
            Desktop: always-visible third column, 288px wide.
            Mobile:  hidden until content exists; opened via FAB as a slide-in sheet. */}
        {hasGenerated && savedId && (
          <>
            {/* Desktop column */}
            <motion.div
              key={followUpRefreshKey}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="hidden md:flex md:w-72 md:shrink-0 flex-col glass-card rounded-2xl overflow-hidden"
            >
              <FollowUpPanel
                contentType="notes"
                contentId={savedId}
                contentTitle={notes!.title}
                onContentUpdated={() => setFollowUpRefreshKey(k => k + 1)}
              />
            </motion.div>

            {/* Mobile FAB (task 2.2) */}
            <AnimatePresence>
              {!rightPanelOpen && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="right-panel-fab"
                  onClick={() => setRightPanelOpen(true)}
                  aria-label="Open AI follow-up panel"
                >
                  <MessageSquarePlus className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Mobile sheet (task 2.2) */}
            <AnimatePresence>
              {rightPanelOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setRightPanelOpen(false)}
                  />
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    key={followUpRefreshKey}
                    className="fixed right-0 top-0 h-full w-[min(22rem,96vw)] z-50 flex flex-col md:hidden"
                    style={{ background: "hsl(240,8%,7%)", borderLeft: "1px solid hsl(0,0%,15%)" }}
                  >
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 rounded-full bg-white/10" />
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                      <span className="font-display font-semibold text-sm text-foreground">AI Follow-up</span>
                      <button
                        onClick={() => setRightPanelOpen(false)}
                        aria-label="Close follow-up panel"
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <FollowUpPanel
                        contentType="notes"
                        contentId={savedId}
                        contentTitle={notes!.title}
                        onContentUpdated={() => {
                          setFollowUpRefreshKey(k => k + 1);
                          setRightPanelOpen(false);
                        }}
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default Notes;
