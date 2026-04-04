import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, Save, RefreshCw, ChevronLeft, ChevronRight,
  History, RotateCcw, Copy, Check, AlertCircle, Loader2,
  Presentation, Lightbulb, StickyNote, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  usePPTGenerator,
  type PPTMode,
  type PresentationType,
  type GeneratedSlide,
} from '@/hooks/usePPTGenerator';
import { exportToPPTX } from '@/lib/pptExport';

const LAYOUT_COLORS: Record<string, string> = {
  title: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  content: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'two-column': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'image-focus': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function SaveIndicator({ status }: { status: string }) {
  if (status === 'idle') return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 text-xs"
    >
      {status === 'saving' && <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Saving…</span></>}
      {status === 'saved' && <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Saved</span></>}
      {status === 'error' && <><AlertCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">Save failed</span></>}
    </motion.div>
  );
}

function SlideCard({ slide, index, isActive, onClick }: {
  slide: GeneratedSlide; index: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
        isActive
          ? 'border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/10'
          : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        {slide.layout_type && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${LAYOUT_COLORS[slide.layout_type] ?? ''}`}>
            {slide.layout_type}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{slide.title}</p>
    </button>
  );
}

function SlidePreview({ slide, index, total, mode, onUpdate, onRegenerate, isRegenerating }: {
  slide: GeneratedSlide;
  index: number;
  total: number;
  mode: PPTMode;
  onUpdate: (field: keyof GeneratedSlide, value: string | string[]) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBullet, setEditingBullet] = useState<number | null>(null);

  const copyContent = () => {
    const text = [slide.title, '', ...slide.content].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Slide canvas */}
      <div className="glass-card rounded-2xl p-8 flex-1 flex flex-col gap-4 relative overflow-hidden">
        {/* Slide header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted-foreground">
            Slide {index + 1} / {total}
          </span>
          <div className="flex items-center gap-2">
            {slide.layout_type && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LAYOUT_COLORS[slide.layout_type] ?? ''}` }>
                {slide.layout_type}
              </span>
            )}
            <button onClick={copyContent} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-0.5 w-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />

        {/* Title — editable */}
        {editingTitle ? (
          <Input
            autoFocus
            value={slide.title}
            onChange={e => onUpdate('title', e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            className="text-2xl font-bold bg-transparent border-purple-500/50 text-foreground h-auto py-1"
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            className="text-2xl font-bold text-foreground cursor-text hover:text-purple-300 transition-colors leading-tight"
          >
            {slide.title}
          </h2>
        )}

        {/* Subtitle */}
        {slide.subtitle && (
          <p className="text-sm text-muted-foreground italic -mt-2">{slide.subtitle}</p>
        )}

        {/* Bullets — editable */}
        <ul className="space-y-2 flex-1">
          {slide.content.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              {editingBullet === i ? (
                <Input
                  autoFocus
                  value={point}
                  onChange={e => {
                    const updated = [...slide.content];
                    updated[i] = e.target.value;
                    onUpdate('content', updated);
                  }}
                  onBlur={() => setEditingBullet(null)}
                  onKeyDown={e => e.key === 'Enter' && setEditingBullet(null)}
                  className="text-sm bg-transparent border-purple-500/40 h-auto py-0.5 flex-1"
                />
              ) : (
                <span
                  onClick={() => setEditingBullet(i)}
                  className="text-sm text-foreground/90 cursor-text hover:text-purple-300 transition-colors leading-relaxed flex-1"
                >
                  {point}
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Visual suggestion */}
        {slide.visual_suggestion && mode === 'high_quality' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <span className="text-xs text-amber-300/80">{slide.visual_suggestion}</span>
          </div>
        )}

        {/* Decorative glow */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Speaker notes toggle */}
      {slide.speaker_notes && mode === 'high_quality' && (
        <div className="mt-3">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Speaker Notes
            <ChevronRight className={`w-3 h-3 transition-transform ${showNotes ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-muted-foreground leading-relaxed">{slide.speaker_notes}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex-1 border-white/10 hover:bg-white/5 text-xs"
        >
          {isRegenerating
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate Slide
        </Button>
      </div>
    </div>
  );
}

export default function PPTPage() {
  const {
    ppt, isGenerating, saveStatus, error, versions,
    activeSlide, setActiveSlide,
    generate, updateSlide, regenerateSlide, loadVersions, restoreVersion, savedPPTId,
  } = usePPTGenerator();

  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [mode, setMode] = useState<PPTMode>('high_quality');
  const [presentationType, setPresentationType] = useState<PresentationType>('academic');
  const [isExporting, setIsExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (savedPPTId && showVersions) loadVersions(savedPPTId);
  }, [savedPPTId, showVersions, loadVersions]);

  const handleGenerate = () => generate({ topic, number_of_slides: slideCount, mode, presentation_type: presentationType });

  const handleExport = async () => {
    if (!ppt || !savedPPTId) return;
    setIsExporting(true);
    try {
      const fullPPT = { id: savedPPTId, user_id: '', ...ppt, slide_count: ppt.slides.length, created_at: '', updated_at: '' };
      await exportToPPTX(fullPPT as any);
    } catch (e: any) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenSlide = async () => {
    setIsRegenerating(true);
    await regenerateSlide(activeSlide, { topic, number_of_slides: slideCount, mode, presentation_type: presentationType });
    setIsRegenerating(false);
  };

  const slide = ppt?.slides[activeSlide];

  return (
    <div className="flex h-full gap-0">
      {/* LEFT PANEL — Input */}
      <div className="w-80 shrink-0 flex flex-col gap-5 p-6 border-r border-white/5 overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold gradient-text">PPT Generator</h1>
          <p className="text-xs text-muted-foreground mt-1">AI-powered Gamma-level presentations</p>
        </div>

        {/* Topic */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Topic</Label>
          <Textarea
            placeholder="e.g. The Impact of AI on Modern Education"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="resize-none bg-white/5 border-white/10 focus:border-purple-500/60 text-sm h-20"
          />
        </div>

        {/* Slide count */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Slides</Label>
            <span className="text-sm font-semibold text-purple-400">{slideCount}</span>
          </div>
          <Slider
            min={4} max={20} step={1}
            value={[slideCount]}
            onValueChange={([v]) => setSlideCount(v)}
            className="[&>span:first-child]:bg-purple-500/20 [&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>4</span><span>20</span>
          </div>
        </div>

        {/* Mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quality Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['basic', 'high_quality'] as PPTMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  mode === m
                    ? 'border-purple-500/60 bg-purple-500/15 text-purple-300'
                    : 'border-white/8 bg-white/3 text-muted-foreground hover:border-white/20'
                }`}
              >
                {m === 'basic' ? '⚡ Basic' : '✨ High Quality'}
              </button>
            ))}
          </div>
          {mode === 'high_quality' && (
            <p className="text-[10px] text-purple-400/70 leading-snug">
              Storytelling arc • Speaker notes • Visual suggestions
            </p>
          )}
        </div>

        {/* Presentation Type */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
          <Select value={presentationType} onValueChange={v => setPresentationType(v as PresentationType)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic">🎓 Academic</SelectItem>
              <SelectItem value="business">💼 Business</SelectItem>
              <SelectItem value="creative">🎨 Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
        >
          {isGenerating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Sparkles className="w-4 h-4" /> Generate PPT</>}
        </Button>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Slide thumbnails */}
        {ppt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{ppt.slides.length} slides</span>
              <Badge variant="outline" className="text-[10px] border-white/10">{ppt.design_theme}</Badge>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {ppt.slides.map((s, i) => (
                <SlideCard
                  key={i} slide={s} index={i}
                  isActive={activeSlide === i}
                  onClick={() => setActiveSlide(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {ppt && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Presentation className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold truncate max-w-xs">{ppt.title}</h2>
              <SaveIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-2">
              {/* Version history */}
              <Sheet open={showVersions} onOpenChange={setShowVersions}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                    <History className="w-3.5 h-3.5" /> History
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-background border-white/10 w-80">
                  <SheetHeader>
                    <SheetTitle className="text-sm">Version History</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No versions saved yet.</p>
                    ) : (
                      versions.map((v, i) => (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                          <div>
                            <p className="text-xs font-medium">Version {v.version}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(v.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => restoreVersion(v)}
                            className="text-xs gap-1 h-7">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Export */}
              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {isExporting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                Download PPTX
              </Button>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-hidden p-6">
          {/* Empty state */}
          {!ppt && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <LayoutGrid className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your slides will appear here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Enter a topic and click Generate</p>
              </div>
            </motion.div>
          )}

          {/* Generating skeleton */}
          {isGenerating && (
            <div className="h-full flex flex-col gap-4 animate-pulse">
              <div className="glass-card rounded-2xl p-8 flex-1 flex flex-col gap-4">
                <div className="h-0.5 w-12 bg-white/10 rounded-full" />
                <div className="h-8 bg-white/8 rounded-xl w-3/4" />
                <div className="h-4 bg-white/5 rounded-xl w-1/2" />
                <div className="space-y-2 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-4 bg-white/5 rounded-xl w-${['full','5/6','4/5','3/4'][i-1]}`} />
                  ))}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Generating {slideCount} slides with {mode === 'high_quality' ? 'Gamma-level' : 'basic'} quality…
              </p>
            </div>
          )}

          {/* Slide preview */}
          {ppt && slide && !isGenerating && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <SlidePreview
                  slide={slide}
                  index={activeSlide}
                  total={ppt.slides.length}
                  mode={mode}
                  onUpdate={(field, value) => updateSlide(activeSlide, field, value)}
                  onRegenerate={handleRegenSlide}
                  isRegenerating={isRegenerating}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Slide nav arrows */}
        {ppt && (
          <div className="flex items-center justify-center gap-4 py-3 border-t border-white/5">
            <button
              onClick={() => setActiveSlide(i => Math.max(0, i - 1))}
              disabled={activeSlide === 0}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground">
              {activeSlide + 1} / {ppt.slides.length}
            </span>
            <button
              onClick={() => setActiveSlide(i => Math.min(ppt.slides.length - 1, i + 1))}
              disabled={activeSlide === ppt.slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
