import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Download,
  Sparkles,
  AlignLeft,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportAssignmentPDF } from "@/lib/pdfExport";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "formal" | "academic";

interface Paragraph {
  id: number;
  heading: string;
  body: string;
  type: "intro" | "body" | "conclusion";
}

// ─── Mock generator ───────────────────────────────────────────────────────────

const SECTION_TEMPLATES: Record<string, { heading: string; type: "intro" | "body" | "conclusion" }[]> = {
  formal: [
    { heading: "Introduction", type: "intro" },
    { heading: "Background and Context", type: "body" },
    { heading: "Core Analysis", type: "body" },
    { heading: "Supporting Evidence", type: "body" },
    { heading: "Critical Evaluation", type: "body" },
    { heading: "Conclusion", type: "conclusion" },
  ],
  academic: [
    { heading: "Abstract", type: "intro" },
    { heading: "Introduction", type: "intro" },
    { heading: "Literature Review", type: "body" },
    { heading: "Methodology", type: "body" },
    { heading: "Results and Discussion", type: "body" },
    { heading: "Conclusion and Future Work", type: "conclusion" },
  ],
};

const BODY_TEMPLATES_FORMAL = [
  "This section examines the foundational principles underlying [topic]. A thorough understanding of these principles is essential for contextualising the broader discussion that follows. Scholars have long debated the significance of [topic] in contemporary discourse, and this assignment seeks to contribute meaningfully to that conversation.",
  "The evidence gathered from multiple reliable sources corroborates the central thesis of this assignment. Each source presents complementary perspectives that, taken together, provide a comprehensive account of [topic]. It is important to note that while consensus is widespread, certain areas remain open to scholarly interpretation.",
  "A critical evaluation of [topic] reveals both strengths and limitations in the prevailing frameworks. On the one hand, the existing body of literature offers well-substantiated claims; on the other, certain theoretical gaps persist that future research must address.",
  "Upon careful examination of the available data and scholarly perspectives, several conclusions can be drawn. The evidence overwhelmingly supports the position that [topic] plays a pivotal role in shaping current practices and future directions in the field.",
];

const BODY_TEMPLATES_ACADEMIC = [
  "This paper investigates the multifaceted dimensions of [topic], situating the inquiry within established theoretical frameworks. The research draws upon a diverse corpus of peer-reviewed literature to provide a rigorous and nuanced analysis of the subject matter.",
  "A systematic review of the literature reveals that [topic] has been studied from a variety of disciplinary perspectives. Researchers have employed both qualitative and quantitative methodologies, yielding insights that collectively advance the field's understanding of key mechanisms and outcomes.",
  "The methodology adopted in this study involves a structured analytical approach designed to evaluate [topic] against established benchmarks. Data were collected and interpreted in accordance with standard academic protocols, ensuring the validity and reliability of the findings presented herein.",
  "The results indicate that [topic] exhibits significant variability across contexts, a finding consistent with prior literature. These outcomes have important implications for both theoretical development and practical application, warranting further investigation in subsequent studies.",
];

function wordsToParas(wordCount: number): number {
  return Math.max(3, Math.min(6, Math.round(wordCount / 120)));
}

function generateAssignment(topic: string, wordCount: number, tone: Tone): Paragraph[] {
  const templates = SECTION_TEMPLATES[tone];
  const bodyTexts = tone === "academic" ? BODY_TEMPLATES_ACADEMIC : BODY_TEMPLATES_FORMAL;
  const parasNeeded = wordsToParas(wordCount);
  const selected = [
    templates[0],
    ...templates.slice(1, -1).slice(0, parasNeeded - 2),
    templates[templates.length - 1],
  ];

  return selected.map((tmpl, i) => ({
    id: i + 1,
    heading: tmpl.heading,
    type: tmpl.type,
    body: bodyTexts[i % bodyTexts.length].replace(/\[topic\]/g, topic),
  }));
}

// ─── Editable Paragraph Block ─────────────────────────────────────────────────

function ParagraphBlock({
  para,
  onUpdate,
  tone,
}: {
  para: Paragraph;
  onUpdate: (p: Paragraph) => void;
  tone: Tone;
}) {
  const [editingHeading, setEditingHeading] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [draftHeading, setDraftHeading] = useState(para.heading);
  const [draftBody, setDraftBody] = useState(para.body);

  const typeColor: Record<Paragraph["type"], string> = {
    intro: "hsl(160, 70%, 45%)",
    body: "hsl(220, 85%, 60%)",
    conclusion: "hsl(262, 80%, 60%)",
  };
  const typeLabel: Record<Paragraph["type"], string> = {
    intro: tone === "academic" ? "Abstract / Intro" : "Introduction",
    body: "Body",
    conclusion: "Conclusion",
  };

  const color = typeColor[para.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden border border-border/30 hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="h-0.5 w-full" style={{ background: color }} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 border"
            style={{ background: `${color}18`, borderColor: `${color}40`, color }}
          >
            {typeLabel[para.type]}
          </span>

          {editingHeading ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                autoFocus
                value={draftHeading}
                onChange={(e) => setDraftHeading(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdate({ ...para, heading: draftHeading.trim() || para.heading }); setEditingHeading(false); }
                  if (e.key === "Escape") { setDraftHeading(para.heading); setEditingHeading(false); }
                }}
                onBlur={() => { onUpdate({ ...para, heading: draftHeading.trim() || para.heading }); setEditingHeading(false); }}
                className="flex-1 bg-secondary/60 border border-primary/40 rounded-lg px-3 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ) : (
            <h3
              onClick={() => { setDraftHeading(para.heading); setEditingHeading(true); }}
              className="font-display font-semibold text-base text-foreground cursor-pointer hover:text-primary transition-colors flex-1 leading-snug"
              title="Click to edit heading"
            >
              {para.heading}
            </h3>
          )}
        </div>

        {editingBody ? (
          <textarea
            autoFocus
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            onBlur={() => { onUpdate({ ...para, body: draftBody.trim() || para.body }); setEditingBody(false); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setDraftBody(para.body); setEditingBody(false); }
            }}
            rows={5}
            className="w-full bg-secondary/60 border border-primary/40 rounded-xl px-4 py-3 text-sm text-foreground/80 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        ) : (
          <p
            onClick={() => { setDraftBody(para.body); setEditingBody(true); }}
            className="text-sm text-foreground/75 leading-relaxed cursor-pointer hover:text-foreground/90 transition-colors"
            title="Click to edit"
          >
            {para.body}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/40 mt-3 text-right">
          ~{para.body.split(" ").length} words · click text to edit
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Assignments = () => {
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState(500);
  const [tone, setTone] = useState<Tone>("academic");
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const generate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => {
      setParagraphs(generateAssignment(topic.trim(), wordCount, tone));
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1300);
  };

  const handleCopy = () => {
    const text = paragraphs.map((p) => `${p.heading}\n\n${p.body}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportPDF = async () => {
    if (isPdfExporting || !paragraphs.length) return;
    setIsPdfExporting(true);
    try {
      await exportAssignmentPDF(topic, paragraphs);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const totalWords = paragraphs.reduce((a, p) => a + p.body.split(" ").length, 0);

  const WORD_COUNTS = [200, 300, 500, 750, 1000, 1500];

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
            style={{ background: "linear-gradient(135deg, hsl(220,85%,60%), hsl(200,80%,50%))" }}
          >
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Assignment <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-xs text-muted-foreground">Structured academic writing in seconds</p>
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
              {copied ? "Copied!" : "Copy All"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isPdfExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(220,85%,60%,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, hsl(220,85%,60%), hsl(262,80%,60%))" }}
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
              placeholder="e.g. Climate Change and Global Policy"
              rows={3}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Word Count
              </label>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                style={{ background: "var(--gradient-subtle)", color: "hsl(220,85%,70%)" }}
              >
                ~{wordCount}w
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {WORD_COUNTS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWordCount(w)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-semibold border transition-all duration-150",
                    wordCount === w
                      ? "bg-primary/15 border-primary/40 text-primary shadow-[inset_0_0_0_1px_hsl(220,85%,60%,0.15)]"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {w >= 1000 ? `${w / 1000}k` : w}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Tone
            </label>
            <div className="flex flex-col gap-2">
              {([
                { val: "formal", icon: AlignLeft, label: "Formal", desc: "Professional writing style" },
                { val: "academic", icon: GraduationCap, label: "Academic", desc: "Research-grade tone" },
              ] as const).map(({ val, icon: Icon, label, desc }) => (
                <button
                  key={val}
                  onClick={() => setTone(val)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                    tone === val
                      ? "bg-primary/10 border-primary/40 shadow-[inset_0_0_0_1px_hsl(220,85%,60%,0.18)]"
                      : "bg-secondary/50 border-border/50 hover:border-border",
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tone === val ? "bg-primary/20" : "bg-secondary")}>
                    <Icon className={cn("w-4 h-4 transition-colors", tone === val ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", tone === val ? "text-primary" : "text-foreground/70")}>{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                  {tone === val && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(220,85%,60%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(220,85%,60%), hsl(262,80%,60%))" }}
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4" />Write Assignment</>
            )}
          </button>

          {hasGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Stats</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Sections", val: paragraphs.length },
                  { label: "Words", val: totalWords },
                  { label: "Tone", val: tone === "academic" ? "Acad." : "Formal" },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base" style={{ color: "hsl(220,85%,70%)" }}>{s.val}</p>
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
                style={{ background: "linear-gradient(135deg, hsl(220,85%,60%,0.15), hsl(262,80%,60%,0.08))" }}
              >
                <FileText className="w-10 h-10" style={{ color: "hsl(220,85%,60%,0.6)" }} />
              </motion.div>
              <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">Ready to write</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Enter a topic, choose your tone, and hit{" "}
                <span style={{ color: "hsl(220,85%,60%)" }} className="font-medium">Write Assignment</span>{" "}
                to generate structured paragraphs.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> Paragraph blocks</span>
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Editable content</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI-powered</span>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
                style={{ borderTopColor: "hsl(220,85%,60%)" }}
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Writing your assignment...</p>
              <p className="text-sm text-muted-foreground">Structuring paragraphs with {tone} tone</p>
            </div>
          ) : (
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(220,85%,60%,0.3) transparent" }}
            >
              <div className="glass-card rounded-2xl p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: "hsl(220,85%,60%)" }} />
                  <span className="text-sm font-semibold text-foreground">{topic}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: "hsl(220,85%,60%,0.12)", borderColor: "hsl(220,85%,60%,0.3)", color: "hsl(220,85%,70%)" }}>
                    {tone}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">~{totalWords} words</span>
              </div>

              <AnimatePresence>
                {paragraphs.map((para) => (
                  <ParagraphBlock
                    key={para.id}
                    para={para}
                    tone={tone}
                    onUpdate={(updated) => {
                      setParagraphs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                    }}
                  />
                ))}
              </AnimatePresence>

              <p className="text-[10px] text-muted-foreground/40 text-center pb-2">Click any heading or text to edit</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Assignments;
