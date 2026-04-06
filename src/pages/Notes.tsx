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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportNotesPDF } from "@/lib/pdfExport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteSection {
  id: number;
  heading: string;
  bullets: string[];
  color: string;
}

interface NotesOutput {
  topic: string;
  sections: NoteSection[];
  summary: string[];
}

// ─── Mock generator ───────────────────────────────────────────────────────────

const SECTION_COLORS = [
  "hsl(262, 80%, 65%)",
  "hsl(220, 85%, 65%)",
  "hsl(160, 70%, 48%)",
  "hsl(30, 80%, 58%)",
  "hsl(340, 75%, 58%)",
];

const SECTION_TEMPLATES = [
  {
    heading: "Overview",
    bullets: [
      "Definition and core meaning of the topic",
      "Historical background and origin",
      "Why it is relevant today",
      "Key stakeholders and domains involved",
    ],
  },
  {
    heading: "Core Concepts",
    bullets: [
      "Fundamental principles and ideas",
      "Key terminology you need to know",
      "Underlying theory and framework",
      "Common misconceptions clarified",
    ],
  },
  {
    heading: "Key Components",
    bullets: [
      "Primary element: what drives the topic",
      "Secondary element: supporting structures",
      "How these components interact",
      "Real-world manifestations",
    ],
  },
  {
    heading: "Applications & Examples",
    bullets: [
      "Industry use case with practical context",
      "Academic research perspective",
      "Everyday life example",
      "Emerging or future application",
    ],
  },
  {
    heading: "Challenges & Limitations",
    bullets: [
      "Primary constraint or obstacle",
      "Technical or theoretical limitation",
      "Open questions in the field",
      "Ongoing debates among experts",
    ],
  },
];

const SUMMARY_TEMPLATES = [
  "[topic] is a broad and significant subject with far-reaching implications across multiple disciplines.",
  "Understanding [topic] requires familiarity with its foundational concepts and the context in which they emerged.",
  "The practical applications of [topic] continue to grow as new research and technologies advance the field.",
  "While challenges remain, [topic] offers immense potential for innovation and progress.",
];

function generateNotes(topic: string): NotesOutput {
  const sections: NoteSection[] = SECTION_TEMPLATES.map((tmpl, i) => ({
    id: i + 1,
    heading: tmpl.heading,
    bullets: tmpl.bullets.map((b) => `${b} (re: ${topic})`),
    color: SECTION_COLORS[i % SECTION_COLORS.length],
  }));

  const summary = SUMMARY_TEMPLATES.map((t) => t.replace(/\[topic\]/g, topic));

  return { topic, sections, summary };
}

// ─── Note Section Card ────────────────────────────────────────────────────────

function NoteSectionCard({
  section,
  onUpdate,
  index,
}: {
  section: NoteSection;
  onUpdate: (s: NoteSection) => void;
  index: number;
}) {
  const [editingBullet, setEditingBullet] = useState<number | null>(null);
  const [draftBullet, setDraftBullet] = useState("");
  const [editingHeading, setEditingHeading] = useState(false);
  const [draftHeading, setDraftHeading] = useState(section.heading);

  const commitBullet = (idx: number) => {
    const bullets = [...section.bullets];
    bullets[idx] = draftBullet.trim() || section.bullets[idx];
    onUpdate({ ...section, bullets });
    setEditingBullet(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-border/30 hover:border-primary/20 transition-all duration-200"
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: section.color }} />
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: section.color }} />
            {editingHeading ? (
              <input
                autoFocus
                value={draftHeading}
                onChange={(e) => setDraftHeading(e.target.value)}
                onBlur={() => { onUpdate({ ...section, heading: draftHeading.trim() || section.heading }); setEditingHeading(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdate({ ...section, heading: draftHeading.trim() || section.heading }); setEditingHeading(false); }
                  if (e.key === "Escape") { setDraftHeading(section.heading); setEditingHeading(false); }
                }}
                className="flex-1 bg-secondary/60 border border-primary/40 rounded-lg px-3 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            ) : (
              <h3
                onClick={() => { setDraftHeading(section.heading); setEditingHeading(true); }}
                className="font-display font-semibold text-base text-foreground cursor-pointer hover:text-primary transition-colors"
                title="Click to edit"
              >
                {section.heading}
              </h3>
            )}
          </div>

          <ul className="space-y-2">
            {section.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <ChevronRight className="w-3 h-3 shrink-0 mt-1" style={{ color: section.color }} />
                {editingBullet === idx ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={draftBullet}
                      onChange={(e) => setDraftBullet(e.target.value)}
                      onBlur={() => commitBullet(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitBullet(idx);
                        if (e.key === "Escape") { setEditingBullet(null); }
                      }}
                      className="flex-1 bg-secondary/60 border border-primary/40 rounded-lg px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                ) : (
                  <span
                    onClick={() => { setDraftBullet(bullet); setEditingBullet(idx); }}
                    className="text-sm text-foreground/75 cursor-pointer hover:text-foreground transition-colors leading-snug"
                    title="Click to edit"
                  >
                    {bullet}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Block ────────────────────────────────────────────────────────────

function SummaryBlock({ lines, onUpdate }: { lines: string[]; onUpdate: (l: string[]) => void }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const commit = (idx: number) => {
    const next = [...lines];
    next[idx] = draft.trim() || lines[idx];
    onUpdate(next);
    setEditingIdx(null);
  };

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
        <ul className="space-y-2.5">
          {lines.map((line, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "hsl(262,80%,60%,0.15)", color: "hsl(262,80%,65%)" }}>
                {idx + 1}
              </span>
              {editingIdx === idx ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(idx);
                    if (e.key === "Escape") setEditingIdx(null);
                  }}
                  className="flex-1 bg-secondary/60 border border-primary/40 rounded-lg px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ) : (
                <span
                  onClick={() => { setDraft(line); setEditingIdx(idx); }}
                  className="text-sm text-foreground/80 leading-snug cursor-pointer hover:text-foreground transition-colors"
                  title="Click to edit"
                >
                  {line}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Notes = () => {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState<NotesOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const generate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => {
      setNotes(generateNotes(topic.trim()));
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1200);
  };

  const handleCopy = () => {
    if (!notes) return;
    const text = [
      `# ${notes.topic}\n`,
      ...notes.sections.map((s) => `## ${s.heading}\n${s.bullets.map((b) => `- ${b}`).join("\n")}`),
      `\n## Summary\n${notes.summary.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    ].join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportPDF = async () => {
    if (isPdfExporting || !notes) return;
    setIsPdfExporting(true);
    try {
      await exportNotesPDF(notes.topic, notes.sections, notes.summary);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const updateSection = (updated: NoteSection) => {
    if (!notes) return;
    setNotes({ ...notes, sections: notes.sections.map((s) => (s.id === updated.id ? updated : s)) });
  };

  const totalBullets = notes?.sections.reduce((a, s) => a + s.bullets.length, 0) ?? 0;

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
            <p className="text-xs text-muted-foreground">Structured notes with headings, bullets & summary</p>
          </div>
        </div>

        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Output Includes</p>
            <div className="flex flex-col gap-2">
              {[
                { icon: Hash, label: "Section Headings", desc: "5 structured sections", color: "hsl(262,80%,65%)" },
                { icon: List, label: "Bullet Points", desc: "4 bullets per section", color: "hsl(220,85%,65%)" },
                { icon: AlignLeft, label: "Summary", desc: "4 key takeaways", color: "hsl(160,70%,48%)" },
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
            onClick={generate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(160,70%,45%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(220,85%,60%))" }}
          >
            {isGenerating ? (
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
                  { label: "Sections", val: notes.sections.length },
                  { label: "Bullets", val: totalBullets },
                  { label: "Summary", val: notes.summary.length },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base" style={{ color: "hsl(160,70%,52%)" }}>{s.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
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
                to get structured headings, bullets, and a summary.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> 5 sections</span>
                <span className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" /> Bullet points</span>
                <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Auto summary</span>
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
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Generating notes...</p>
              <p className="text-sm text-muted-foreground">Organising headings and bullet points</p>
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
                    <p className="text-sm font-semibold text-foreground truncate">{notes.topic}</p>
                    <p className="text-[10px] text-muted-foreground">{notes.sections.length} sections · {totalBullets} bullets · summary included</p>
                  </div>
                </div>

                <AnimatePresence>
                  {notes.sections.map((section, i) => (
                    <NoteSectionCard
                      key={section.id}
                      section={section}
                      index={i}
                      onUpdate={updateSection}
                    />
                  ))}
                </AnimatePresence>

                <SummaryBlock
                  lines={notes.summary}
                  onUpdate={(lines) => setNotes({ ...notes, summary: lines })}
                />

                <p className="text-[10px] text-muted-foreground/40 text-center pb-2">Click any heading or bullet to edit</p>
              </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Notes;
