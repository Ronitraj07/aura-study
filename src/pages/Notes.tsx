import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportNotesPDF } from "@/lib/pdfExport";
import { useNotesGenerator } from "@/hooks/useNotesGenerator";
import type { NoteHeading, NoteBullet } from "@/types/database";

// ─── Section Card ─────────────────────────────────────────────────────────────

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
}: {
  heading: NoteHeading;
  bullets: string[];
  index: number;
}) {
  const color = SECTION_COLORS[index % SECTION_COLORS.length];
  const indent = heading.level === 2;

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
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <h3 className={cn(
              "font-display font-semibold text-foreground leading-snug",
              indent ? "text-sm" : "text-base"
            )}>
              {heading.text}
            </h3>
          </div>
          <ul className="space-y-2">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <ChevronRight className="w-3 h-3 shrink-0 mt-1" style={{ color }} />
                <span className="text-sm text-foreground/75 leading-snug">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Block ────────────────────────────────────────────────────────────

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
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-medium">Key Takeaways</span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>
    </motion.div>
  );
}

// ─── Key Terms Block ──────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

const Notes = () => {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<'overview' | 'detailed'>('overview');
  const [copied, setCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const { notes, isGenerating, isResearching, saveStatus, error, generate } = useNotesGenerator();

  const hasGenerated = !!notes;

  const handleGenerate = () => {
    if (!topic.trim() || isGenerating) return;
    generate({ topic: topic.trim(), depth });
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

  const handleExportPDF = async () => {
    if (isPdfExporting || !notes) return;
    setIsPdfExporting(true);
    try {
      // Build NoteSection[] shape for pdfExport
      const sections = notes.headings.map((h, i) => {
        const b = notes.bullets.find((bl) => bl.heading === h.text);
        return {
          id: i + 1,
          heading: h.text,
          bullets: b?.points ?? [],
          color: SECTION_COLORS[i % SECTION_COLORS.length],
        };
      });
      // summary as string array for legacy exportNotesPDF signature
      const summaryLines = notes.summary.split(". ").filter(Boolean).map((s) => s.endsWith(".") ? s : s + ".");
      await exportNotesPDF(notes.title, sections, summaryLines);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const totalBullets = notes?.bullets.reduce((a, b) => a + (b.points?.length ?? 0), 0) ?? 0;

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))" }}
          >
            <BookOpen className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Notes <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI-researched structured notes with headings, bullets & summary</p>
          </div>
        </div>

        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
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
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Exporting...</>
                : <><Download className="w-3.5 h-3.5" />Export PDF</>
              }
            </button>
          </motion.div>
        )}
      </motion.div>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* ── LEFT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-72 shrink-0 flex flex-col gap-4"
        >
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis and Plant Biology"
              rows={4}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Depth</p>
            <div className="grid grid-cols-2 gap-2">
              {(["overview", "detailed"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-semibold border transition-all",
                    depth === d
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                  )}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Output Includes</p>
            <div className="flex flex-col gap-2">
              {[
                { icon: Hash, label: "Section Headings", desc: depth === 'detailed' ? "4–6 structured sections" : "3–4 structured sections", color: "hsl(262,80%,65%)" },
                { icon: List, label: "Bullet Points", desc: "Concise scannable facts", color: "hsl(220,85%,65%)" },
                { icon: AlignLeft, label: "Summary", desc: "Executive summary", color: "hsl(160,70%,48%)" },
                { icon: Tag, label: "Key Terms", desc: "Vocabulary glossary", color: "hsl(30,80%,58%)" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(160,70%,45%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))" }}
          >
            {isResearching ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Researching...</>
            ) : isGenerating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4" />Generate Notes</>
            )}
          </button>

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
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {notes.researchSource && notes.researchSource !== 'none' && (
                <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                  Research via {notes.researchSource}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {!hasGenerated && !isGenerating ? (
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
          ) : isGenerating ? (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
                style={{ borderTopColor: "hsl(160,70%,45%)" }}
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">
                {isResearching ? "Researching topic..." : "Generating notes..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isResearching ? "Gathering facts via Groq" : "Organising headings and bullet points"}
              </p>
            </div>
          ) : (
            notes && (
              <div
                className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(160,70%,45%,0.3) transparent" }}
              >
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3 shrink-0">
                  <Sparkles className="w-4 h-4 shrink-0" style={{ color: "hsl(160,70%,50%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{notes.title}</p>
                    <p className="text-[10px] text-muted-foreground">{notes.headings.length} sections · {totalBullets} bullets · summary included</p>
                  </div>
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
                      />
                    );
                  })}
                </AnimatePresence>

                <SummaryBlock summary={notes.summary} />
                <KeyTermsBlock terms={notes.keyTerms ?? []} />

                <p className="text-[10px] text-muted-foreground/40 text-center pb-2">AI-generated · auto-saved to your account</p>
              </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Notes;
