import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Download,
  Sparkles,
  AlignLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  History,
  RotateCcw,
  X,
  Search,
  Edit3,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportAssignmentPDF } from "@/lib/pdfExport";
import { useAssignmentGenerator } from "@/hooks/useAssignmentGenerator";
import { useAssignmentEditor } from "@/hooks/useAssignmentEditor";
import { useSmartMode } from "@/hooks/useSmartMode";
import { SmartModeBanner } from "@/components/SmartModeBanner";
import { EditAssignmentBlocks } from "@/components/EditAssignmentBlocks";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import type { AssignmentTone, AssignmentInput } from "@/hooks/useAssignmentGenerator";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Block renderer styles ────────────────────────────────────────────────────
const BLOCK_STYLES: Record<string, string> = {
  heading:    "font-display font-bold text-lg text-foreground mt-2",
  subheading: "font-display font-semibold text-base text-foreground/90 mt-1",
  paragraph:  "text-sm text-foreground/75 leading-relaxed",
  quote:      "text-sm italic text-foreground/60 border-l-2 border-primary/40 pl-4 py-1",
  conclusion: "text-sm text-foreground/80 leading-relaxed",
};

const BLOCK_COLORS: Record<string, string> = {
  heading:    "hsl(220, 85%, 60%)",
  subheading: "hsl(262, 80%, 65%)",
  paragraph:  "transparent",
  quote:      "hsl(160, 70%, 48%)",
  conclusion: "hsl(30, 80%, 58%)",
};

// ─── History Sheet ────────────────────────────────────────────────────────────
function AssignmentHistorySheet({
  open,
  onClose,
  versions,
  onRestore,
  restoring,
}: {
  open: boolean;
  onClose: () => void;
  versions: ReturnType<typeof import('@/hooks/useAssignmentGenerator').useAssignmentGenerator>['versions'];
  onRestore: (v: (typeof versions)[0]) => void;
  restoring: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVersions = versions.filter((v) =>
    v.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 h-full w-[min(20rem,92vw)] z-50 flex flex-col"
            style={{ background: "hsl(240,8%,7%)", borderLeft: "1px solid hsl(0,0%,15%)" }}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-border/40" />
            </div>

            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">Version History</span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search bar */}
            {versions.length > 0 && (
              <div className="p-4 border-b border-border/30">
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
                            style={{ background: "hsl(220,85%,60%,0.15)", borderColor: "hsl(220,85%,60%,0.3)", color: "hsl(220,85%,65%)" }}
                          >
                            v{v.version}
                          </span>
                          <span className="text-xs text-muted-foreground">{timeAgo(v.created_at)}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground/80 truncate">{v.topic}</p>
                        <p className="text-xs text-muted-foreground">{v.word_count} words · {v.tone}</p>
                      </div>
                      <button
                        onClick={() => onRestore(v)}
                        disabled={restoring}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40"
                        style={{ background: "hsl(220,85%,60%,0.1)", borderColor: "hsl(220,85%,60%,0.3)", color: "hsl(220,85%,65%)" }}
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const Assignments = () => {
  const [topic, setTopic]       = useState("");
  const [wordCount, setWordCount] = useState(500);
  const [tone, setTone]         = useState<AssignmentTone>("academic");
  const [copied, setCopied]     = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [smartApplied, setSmartApplied]     = useState(false);
  const [historyOpen, setHistoryOpen]       = useState(false);
  const [restoring, setRestoring]           = useState(false);

  // New enhanced options
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [requirements, setRequirements] = useState("");
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'none'>('none');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [formatOption, setFormatOption] = useState<'structured' | 'essay' | 'bullet_points'>('structured');

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  
  // Current input for editor
  const currentInput: AssignmentInput = {
    topic: topic.trim(),
    wordCount,
    tone,
    subtopics: subtopics.length > 0 ? subtopics : undefined,
    requirements: requirements.trim() || undefined,
    citationStyle: citationStyle !== 'none' ? citationStyle : undefined,
    includeExamples,
    formatOption
  };

  const {
    assignment, savedId, isGenerating, isResearching, saveStatus, error,
    versions, generate, loadVersions, restoreVersion,
  } = useAssignmentGenerator();

  // Edit mode integration
  const editor = assignment ? useAssignmentEditor(
    assignment,
    currentInput,
    async (updatedAssignment) => {
      // Handle save - this would typically call updateContent or similar
      console.log('Assignment updated:', updatedAssignment);
      // For now, we'll just log. In full implementation, this would save to DB
    }
  ) : null;

  const { suggestion, isAnalysing, dismiss, dismissed } = useSmartMode(topic, 'assignment');

  const hasGenerated = !!assignment;

  const handleGenerate = () => {
    if (!topic.trim() || isGenerating) return;
    generate({ 
      topic: topic.trim(), 
      wordCount, 
      tone,
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      requirements: requirements.trim() || undefined,
      citationStyle: citationStyle !== 'none' ? citationStyle : undefined,
      includeExamples,
      formatOption
    });
  };

  const handleSmartApply = (s: typeof suggestion) => {
    if (!s) return;
    if (s.tone) setTone(s.tone);
    if (s.wordCount) setWordCount(s.wordCount);
    setSmartApplied(true);
    setTimeout(() => setSmartApplied(false), 2500);
  };

  const handleCopy = () => {
    if (!assignment) return;
    navigator.clipboard.writeText(assignment.rawContent).then(() => {
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
    if (isPdfExporting || !assignment) return;
    setIsPdfExporting(true);
    try {
      const paragraphs = assignment.blocks
        .filter((b) => b.type === "paragraph" || b.type === "conclusion")
        .map((b, i) => {
          const prevHeading = assignment.blocks
            .slice(0, assignment.blocks.indexOf(b))
            .reverse()
            .find((x) => x.type === "heading" || x.type === "subheading");
          return {
            id: i + 1,
            heading: prevHeading?.text ?? "",
            body: b.text,
            type: (b.type === "conclusion" ? "conclusion" : "body") as "body" | "intro" | "conclusion",
          };
        });
      await exportAssignmentPDF(assignment.title || topic, paragraphs);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const WORD_COUNTS = [200, 300, 500, 750, 1000, 1500];

  return (
    <div className="flex flex-col md:h-full">
      <AssignmentHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={versions}
        onRestore={handleRestore}
        restoring={restoring}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(220,85%,60%), hsl(200,80%,50%))" }}
          >
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Assignment <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI-researched structured academic writing in seconds</p>
          </div>
        </div>

        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {savedId && (
              <button
                onClick={handleOpenHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-secondary border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                title="Version history"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            )}

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                editMode
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
              title={editMode ? "Exit edit mode" : "Enter edit mode"}
            >
              {editMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {editMode ? "View" : "Edit"}
            </button>

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

      <div className={`flex flex-col md:flex-row gap-5 ${(assignment || isGenerating) ? 'md:flex-1 md:min-h-0' : ''}`}>
        {/* ── LEFT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full md:w-72 md:shrink-0 flex flex-col gap-4 max-h-[45dvh] md:max-h-none overflow-y-auto"
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Word Count</p>
            <div className="grid grid-cols-3 gap-1.5">
              {WORD_COUNTS.map((wc) => (
                <button
                  key={wc}
                  onClick={() => setWordCount(wc)}
                  className={cn(
                    "py-1.5 rounded-xl text-xs font-semibold border transition-all",
                    wordCount === wc
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                  )}
                >
                  {wc}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Tone</p>
            <div className="flex flex-col gap-2">
              {([
                { value: "formal", icon: AlignLeft, label: "Formal", desc: "Professional, third person" },
                { value: "academic", icon: GraduationCap, label: "Academic", desc: "Citations, hedging language" },
                { value: "casual", icon: BookOpen, label: "Casual", desc: "Clear, first-person friendly" },
              ] as const).map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setTone(value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    tone === value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-foreground hover:border-primary/20"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subtopics Selection */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Subtopics (optional)
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Historical context",
                "Current implications", 
                "Economic impact",
                "Social factors",
                "Environmental effects",
                "Policy recommendations",
                "Case studies",
                "Future prospects"
              ].map(sub => (
                <button
                  key={sub}
                  onClick={() => setSubtopics(prev => 
                    prev.includes(sub) 
                      ? prev.filter(s => s !== sub)
                      : [...prev, sub]
                  )}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    subtopics.includes(sub)
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                  )}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Requirements (optional)
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={`e.g. Include at least 3 academic sources
Must include a comparison table
Should address counterarguments
Needs real-world examples`}
              rows={4}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground/60 mt-2">
              Describe any specific requirements, formatting needs, or constraints
            </p>
          </div>

          {/* Advanced Options */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Advanced Options
            </p>
            
            <div className="space-y-3">
              {/* Citation Style */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Citation Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['none', 'APA', 'MLA'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setCitationStyle(style)}
                      className={cn(
                        "py-1.5 rounded-xl text-xs font-semibold border transition-all",
                        citationStyle === style
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      {style === 'none' ? 'None' : style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Option */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Format</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {([
                    { value: 'structured', label: 'Structured Essay', desc: 'Traditional academic format' },
                    { value: 'essay', label: 'Flowing Essay', desc: 'Narrative progression' },
                    { value: 'bullet_points', label: 'Mixed Format', desc: 'Lists + paragraphs' }
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setFormatOption(value)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border transition-all text-left",
                        formatOption === value
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

              {/* Include Examples Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-foreground">Include Examples</label>
                  <p className="text-xs text-muted-foreground/60">Add real-world examples and case studies</p>
                </div>
                <button
                  onClick={() => setIncludeExamples(prev => !prev)}
                  className={cn(
                    "w-11 h-6 rounded-full border-2 transition-all flex items-center",
                    includeExamples 
                      ? "bg-primary/20 border-primary/40" 
                      : "bg-secondary/40 border-border"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-white transition-all",
                      includeExamples ? "translate-x-5" : "translate-x-0.5"
                    )} 
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ⚡ Smart Mode Banner */}
          <SmartModeBanner
            suggestion={suggestion}
            isAnalysing={isAnalysing}
            dismissed={dismissed}
            tool="assignment"
            onApply={handleSmartApply}
            onDismiss={dismiss}
            applied={smartApplied}
          />

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-display font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(220,85%,60%,0.3)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(220,85%,60%), hsl(262,80%,60%))" }}
          >
            {isResearching ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Researching...</>
            ) : isGenerating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4" />Generate Assignment</>
            )}
          </button>

          {/* Error display */}
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

          {hasGenerated && assignment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Words", val: assignment.wordCount },
                  { label: "Blocks", val: assignment.blocks.length },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="font-display font-bold text-base" style={{ color: "hsl(220,85%,65%)" }}>{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {assignment.researchSource && assignment.researchSource !== 'none' && (
                <p className="text-xs text-muted-foreground/50 mt-2 text-center">
                  Research via {assignment.researchSource}
                </p>
              )}
            </motion.div>
          )}

          {/* Follow-up Panel (when assignment exists) */}
          {hasGenerated && assignment && savedId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <FollowUpPanel
                contentType="assignment"
                contentId={savedId}
                contentTitle={assignment.title}
                onContentUpdated={() => {
                  // Refresh the assignment data when content is updated
                  window.location.reload(); // Simple refresh for now
                }}
              />
            </motion.div>
          )}
        </motion.div>

        {/* ── RIGHT PANEL ── Only show when there's actual content to display */}
        {(assignment || isGenerating) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex-1 flex flex-col min-w-0"
          >
          
          {!hasGenerated && !isGenerating && (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12 hidden md:flex">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "linear-gradient(135deg, hsl(220,85%,60%,0.15), hsl(262,80%,60%,0.08))" }}
              >
                <FileText className="w-10 h-10" style={{ color: "hsl(220,85%,60%,0.7)" }} />
              </motion.div>
              <h3 className="font-display text-xl font-bold text-foreground/80 mb-2">Ready to write your assignment</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Enter a topic, pick your word count and tone, then hit{" "}
                <span style={{ color: "hsl(220,85%,65%)" }} className="font-medium">Generate Assignment</span>.
              </p>
            </div>
          )}
          
          {isGenerating && (
            <div className="flex-1 glass-card rounded-2xl flex flex-col items-center justify-center text-center p-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 mb-6"
                style={{ borderTopColor: "hsl(220,85%,60%)" }}
              />
              <p className="font-display text-lg font-semibold text-foreground/80 mb-1">
                {isResearching ? "Researching topic..." : "Writing assignment..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isResearching ? "Gathering facts via Groq" : `Targeting ~${wordCount} words in ${tone} tone`}
              </p>
            </div>
          )}
          
          {assignment && (
              <div
                className="flex-1 overflow-y-auto flex flex-col min-w-0 pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(220,85%,60%,0.3) transparent" }}
              >
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3 shrink-0 mb-4">
                  <Sparkles className="w-4 h-4 shrink-0" style={{ color: "hsl(220,85%,65%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground">{assignment.wordCount} words · {tone} tone · auto-saved</p>
                  </div>
                </div>

                {editMode && editor ? (
                  // Edit Mode
                  <EditAssignmentBlocks
                    editState={editor}
                    editActions={editor}
                    onReset={editor.resetToOriginal}
                    onSave={editor.saveEdits}
                    hasUnsavedChanges={editor.hasUnsavedChanges()}
                  />
                ) : (
                  // Display Mode  
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="glass-card rounded-2xl p-6 flex flex-col gap-4"
                    >
                      <AnimatePresence>
                        {assignment.blocks.map((block, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                          >
                            {(block.type === "heading" || block.type === "subheading") && (
                              <div
                                className="flex items-center gap-2"
                                style={{ color: BLOCK_COLORS[block.type] }}
                              >
                                <div
                                  className="w-1 rounded-full shrink-0"
                                  style={{
                                    height: block.type === "heading" ? "20px" : "16px",
                                    background: BLOCK_COLORS[block.type],
                                  }}
                                />
                                <span className={BLOCK_STYLES[block.type]}>{block.text}</span>
                              </div>
                            )}
                            {(block.type === "paragraph" || block.type === "conclusion" || block.type === "quote") && (
                              <p className={BLOCK_STYLES[block.type]}>{block.text}</p>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>

                    <p className="text-xs text-muted-foreground/40 text-center py-4">AI-generated · auto-saved to your account</p>
                  </>
                )}
              </div>
          )}
        </motion.div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
