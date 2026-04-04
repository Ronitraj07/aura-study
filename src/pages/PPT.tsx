import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation,
  Sparkles,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Layers,
  Pencil,
  Check,
  X,
  Palette,
  LayoutTemplate,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Slide {
  id: number;
  title: string;
  bullets: string[];
  designHint: string;
  colorAccent: string;
}

type Mode = "basic" | "hq";

// ─── Mock slide generator ────────────────────────────────────────────────────

const DESIGN_HINTS_BASIC = [
  "Clean white background with minimal text",
  "Simple two-column layout",
  "Bullet list with clear hierarchy",
  "Title + supporting paragraph",
  "Text-only with large heading",
];

const DESIGN_HINTS_HQ = [
  "Full-bleed gradient hero with bold white text",
  "Split layout: visual left, content right",
  "Dark card with glowing accent border",
  "Infographic-style with icon grid",
  "Timeline layout with connecting nodes",
  "Quote highlight with large typography",
  "Comparison table with branded columns",
];

const ACCENT_COLORS = [
  "hsl(262, 80%, 60%)",
  "hsl(220, 85%, 60%)",
  "hsl(160, 70%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(190, 75%, 50%)",
];

function generateMockSlides(topic: string, count: number, mode: Mode): Slide[] {
  const hints = mode === "hq" ? DESIGN_HINTS_HQ : DESIGN_HINTS_BASIC;
  const structures = [
    { titleSuffix: "Overview", bullets: ["Background and context", "Key definitions", "Why this matters", "Scope of discussion"] },
    { titleSuffix: "Core Concepts", bullets: ["Fundamental principles", "Key terminology", "Underlying theory", "Building blocks"] },
    { titleSuffix: "Key Components", bullets: ["Component A: Primary driver", "Component B: Supporting element", "Component C: Integration layer", "Component D: Output mechanism"] },
    { titleSuffix: "Applications", bullets: ["Real-world use case 1", "Industry application", "Academic perspective", "Future possibilities"] },
    { titleSuffix: "Challenges", bullets: ["Common obstacles", "Technical limitations", "Open research questions", "Mitigation strategies"] },
    { titleSuffix: "Case Study", bullets: ["Context and problem statement", "Approach and methodology", "Results and outcomes", "Lessons learned"] },
    { titleSuffix: "Comparison", bullets: ["Traditional vs modern approach", "Strengths and weaknesses", "Benchmark analysis", "Recommendation"] },
    { titleSuffix: "Future Trends", bullets: ["Emerging directions", "Technology roadmap", "Research opportunities", "Industry forecast"] },
    { titleSuffix: "Summary", bullets: ["Key takeaways", "Critical insights", "Action items", "Further reading"] },
    { titleSuffix: "Conclusion", bullets: ["Final thoughts", "Impact and significance", "Next steps", "Q&A"] },
  ];

  return Array.from({ length: count }, (_, i) => {
    const struct = structures[i % structures.length];
    const isTitle = i === 0;
    return {
      id: i + 1,
      title: isTitle ? topic : `${topic}: ${struct.titleSuffix}`,
      bullets: isTitle
        ? ["Presented by Aura Study AI", `Total slides: ${count}`, `Mode: ${mode === "hq" ? "High Quality" : "Basic"}`, "Generated with AI"]
        : struct.bullets,
      designHint: hints[i % hints.length],
      colorAccent: ACCENT_COLORS[i % ACCENT_COLORS.length],
    };
  });
}

// ─── Editable text helper ────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  className,
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const commit = () => {
    onChange(draft.trim() || value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="flex items-start gap-1.5 w-full">
        {multiline ? (
          <textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
              if (e.key === "Escape") cancel();
            }}
            className={cn(
              "flex-1 bg-white/5 border border-primary/40 rounded-lg px-3 py-1.5 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50",
              className,
            )}
            rows={2}
          />
        ) : (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className={cn(
              "flex-1 bg-white/5 border border-primary/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
              className,
            )}
          />
        )}
        <button onClick={commit} className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors mt-0.5 shrink-0">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors mt-0.5 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span
      className={cn("group/edit relative cursor-pointer w-full flex items-start gap-1.5", className)}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      <span className="flex-1">{value}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/edit:opacity-60 transition-opacity shrink-0 mt-1" />
    </span>
  );
}

// ─── Slide card (preview panel) ──────────────────────────────────────────────

function SlideCard({
  slide,
  isActive,
  mode,
  onUpdate,
}: {
  slide: Slide;
  isActive: boolean;
  mode: Mode;
  onUpdate: (updated: Slide) => void;
}) {
  const updateBullet = (idx: number, val: string) => {
    const bullets = [...slide.bullets];
    bullets[idx] = val;
    onUpdate({ ...slide, bullets });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-card rounded-2xl overflow-hidden border transition-all duration-300",
        isActive
          ? "border-primary/40 shadow-[0_0_30px_hsl(262,80%,60%,0.15)]"
          : "border-border/30",
      )}
    >
      {/* Slide top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background:
            mode === "hq"
              ? `linear-gradient(90deg, ${slide.colorAccent}, hsl(220,85%,60%))`
              : "hsl(262,80%,60%)",
        }}
      />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{
              background: `${slide.colorAccent}18`,
              borderColor: `${slide.colorAccent}40`,
              color: slide.colorAccent,
            }}
          >
            Slide {slide.id}
          </span>

          {mode === "hq" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Palette className="w-3 h-3" />
              HQ
            </span>
          )}
        </div>

        {/* Editable title */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5">Title</p>
          <h3 className="font-display text-lg font-bold text-foreground leading-tight">
            <EditableText
              value={slide.title}
              onChange={(v) => onUpdate({ ...slide, title: v })}
            />
          </h3>
        </div>

        {/* Editable bullets */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Content</p>
          <ul className="space-y-2">
            {slide.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: slide.colorAccent }}
                />
                <EditableText
                  value={bullet}
                  onChange={(v) => updateBullet(idx, v)}
                  multiline
                  className="text-sm"
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Design hint */}
        <div className="pt-4 border-t border-border/40">
          <div className="flex items-start gap-2">
            <LayoutTemplate className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Design Hint</p>
              <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
                {slide.designHint}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Slide thumbnail strip ────────────────────────────────────────────────────

function SlideThumbnail({
  slide,
  isActive,
  onClick,
  mode,
}: {
  slide: Slide;
  isActive: boolean;
  onClick: () => void;
  mode: Mode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-all duration-200 group",
        isActive
          ? "bg-primary/10 border-primary/40 shadow-[0_0_15px_hsl(262,80%,60%,0.12)]"
          : "glass-card border-border/30 hover:border-primary/20 hover:bg-secondary/60",
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Mini slide visual */}
        <div
          className="w-12 h-8 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${slide.colorAccent}20, ${slide.colorAccent}08)`,
            borderLeft: `3px solid ${slide.colorAccent}`,
          }}
        >
          <span className="text-[9px] font-bold" style={{ color: slide.colorAccent }}>
            {slide.id}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-xs font-medium truncate transition-colors",
            isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground",
          )}>
            {slide.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {slide.bullets.length} points
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PPT = () => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(6);
  const [mode, setMode] = useState<Mode>("basic");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => {
      const generated = generateMockSlides(topic.trim(), slideCount, mode);
      setSlides(generated);
      setActiveIdx(0);
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1400);
  };

  const regenerate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateMockSlides(topic.trim(), slideCount, mode);
      setSlides(generated);
      setActiveIdx(0);
      setIsGenerating(false);
    }, 1200);
  };

  const updateSlide = (idx: number, updated: Slide) => {
    const next = [...slides];
    next[idx] = updated;
    setSlides(next);
  };

  const canPrev = activeIdx > 0;
  const canNext = activeIdx < slides.length - 1;

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
            style={{ background: "linear-gradient(135deg, hsl(262,80%,60%), hsl(280,70%,50%))" }}
          >
            <Presentation className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              PPT <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-xs text-muted-foreground">Create AI-powered presentations instantly</p>
          </div>
        </div>

        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={regenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
              Regenerate
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(262,80%,60%,0.3)]"
              style={{ background: "var(--gradient-primary)" }}
              title="Export coming soon"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Two-panel layout */}
      <div className="flex-1 flex gap-5 min-h-0">

        {/* ── LEFT PANEL: Input form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-72 shrink-0 flex flex-col gap-4"
        >
          {/* Topic input */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Artificial Intelligence in Healthcare"
              rows={3}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }}
            />
          </div>

          {/* Slide count */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Slides
              </label>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                style={{ background: "var(--gradient-subtle)", color: "hsl(262,80%,70%)" }}
              >
                {slideCount}
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
              style={{
                accentColor: "hsl(262,80%,60%)",
              }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>3</span>
              <span>15</span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Mode
            </label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMode("basic")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                  mode === "basic"
                    ? "bg-primary/10 border-primary/40 shadow-[inset_0_0_0_1px_hsl(262,80%,60%,0.2)]"
                    : "bg-secondary/50 border-border/50 hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    mode === "basic" ? "bg-primary/20" : "bg-secondary",
                  )}
                >
                  <Layers
                    className={cn(
                      "w-4 h-4 transition-colors",
                      mode === "basic" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", mode === "basic" ? "text-primary" : "text-foreground/70")}>
                    Basic
                  </p>
                  <p className="text-[10px] text-muted-foreground">Clean bullet slides</p>
                </div>
                {mode === "basic" && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              <button
                onClick={() => setMode("hq")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                  mode === "hq"
                    ? "bg-primary/10 border-primary/40 shadow-[inset_0_0_0_1px_hsl(262,80%,60%,0.2)]"
                    : "bg-secondary/50 border-border/50 hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative",
                    mode === "hq" ? "bg-primary/20" : "bg-secondary",
                  )}
                >
                  <Zap
                    className={cn(
                      "w-4 h-4 transition-colors",
                      mode === "hq" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold flex items-center gap-1.5", mode === "hq" ? "text-primary" : "text-foreground/70")}>
                    High Quality
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold tracking-wide">HQ</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gamma-style rich slides</p>
                </div>
                {mode === "hq" && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(262,80%,60%,0.3)] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Slides
              </>
            )}
          </button>

          {/* Stats (after generation) */}
          {hasGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Stats</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Slides", val: slides.length },
                  { label: "Mode", val: mode === "hq" ? "HQ" : "Basic" },
                  { label: "Points", val: slides.reduce((a, s) => a + s.bullets.length, 0) },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base gradient-text">{s.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── RIGHT PANEL: Preview ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0"
        >
          {!hasGenerated && !isGenerating ? (
            /* Empty state */
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "var(--gradient-subtle)" }}
              >
                <Presentation className="w-10 h-10 text-primary/60" />
              </motion.div>
              <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">
                Ready to generate
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Enter a topic, choose your settings, and hit{" "}
                <span className="text-primary font-medium">Generate Slides</span>{" "}
                to create your presentation.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Up to 15 slides</span>
                <span className="flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Fully editable</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI-powered</span>
              </div>
            </div>
          ) : isGenerating && slides.length === 0 ? (
            /* Generating skeleton */
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary mb-6"
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">Crafting your slides...</p>
              <p className="text-sm text-muted-foreground">AI is building your presentation</p>
            </div>
          ) : (
            /* Slide viewer */
            <div className="flex-1 flex gap-4 min-h-0">

              {/* Thumbnail sidebar */}
              <div className="w-48 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(262,80%,60%,0.3) transparent" }}
              >
                {slides.map((slide, idx) => (
                  <SlideThumbnail
                    key={slide.id}
                    slide={slide}
                    isActive={idx === activeIdx}
                    mode={mode}
                    onClick={() => setActiveIdx(idx)}
                  />
                ))}
              </div>

              {/* Main slide + nav */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Navigation bar */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                      disabled={!canPrev}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground px-3 font-medium">
                      {activeIdx + 1} / {slides.length}
                    </span>
                    <button
                      onClick={() => setActiveIdx((i) => Math.min(slides.length - 1, i + 1))}
                      disabled={!canNext}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Dot indicators */}
                    {slides.slice(0, 10).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        className={cn(
                          "rounded-full transition-all duration-200",
                          idx === activeIdx
                            ? "w-5 h-2 bg-primary"
                            : "w-2 h-2 bg-border hover:bg-primary/40",
                        )}
                      />
                    ))}
                    {slides.length > 10 && (
                      <span className="text-[10px] text-muted-foreground ml-1">+{slides.length - 10}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium" style={{ color: "hsl(262,80%,70%)" }}>
                      {mode === "hq" ? "High Quality" : "Basic"}
                    </span>
                  </div>
                </div>

                {/* Active slide card */}
                <div className="flex-1 overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(262,80%,60%,0.2) transparent" }}
                >
                  <AnimatePresence mode="wait">
                    {slides[activeIdx] && (
                      <SlideCard
                        key={slides[activeIdx].id}
                        slide={slides[activeIdx]}
                        isActive
                        mode={mode}
                        onUpdate={(updated) => updateSlide(activeIdx, updated)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Keyboard hint */}
                <p className="text-[10px] text-muted-foreground/40 text-center mt-3 shrink-0">
                  ← → to navigate · Click text to edit
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PPT;
