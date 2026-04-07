import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, RefreshCw, ChevronLeft, ChevronRight,
  History, RotateCcw, Copy, Check, AlertCircle, Loader2,
  Presentation, Lightbulb, StickyNote, LayoutGrid,
  Maximize2, X, SlidersHorizontal,
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
} from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';
import { exportToPPTX } from '@/lib/pptExport';
import { SlideCanvas } from '@/components/SlideCanvas';
import { SlideThumbnail } from '@/components/SlideThumbnail';
import { SlidePreviewGrid } from '@/components/SlidePreviewGrid';
import { FollowUpPanel } from '@/components/FollowUpPanel';
import { SubtopicsInput } from '@/components/SubtopicsInput';
import { fetchSlideImages } from '@/lib/pexels';

const CANVAS_W = 800;
const CANVAS_H = (CANVAS_W / 10) * 5.63;

const LAYOUT_COLORS: Record<string, string> = {
  title:          'bg-purple-500/20 text-purple-300 border-purple-500/30',
  content:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'two-column':   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'image-focus':  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  quote:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
  stats:          'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
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
      {status === 'saving' && (
        <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Saving…</span></>
      )}
      {status === 'saved' && (
        <><Check className="w-3 h-3 text-emerald-400" />
        <span className="text-emerald-400">Saved</span></>
      )}
      {status === 'error' && (
        <><AlertCircle className="w-3 h-3 text-red-400" />
        <span className="text-red-400">Save failed</span></>
      )}
    </motion.div>
  );
}

function FullscreenModal({
  ppt, activeIndex, onClose, onNavigate, slideImages,
}: {
  ppt: any;
  activeIndex: number;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
  slideImages: (string | null)[];
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  onNavigate(1);
      if (e.key === 'ArrowLeft')   onNavigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNavigate]);

  const slide      = ppt.slides[activeIndex];
  const slideImage = slideImages[activeIndex] ?? null;
  const MODAL_W    = Math.min(1200, window.innerWidth - 80);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-white/70 font-mono">
        {activeIndex + 1} / {ppt.slides.length}
      </div>

      <div onClick={e => e.stopPropagation()} className="rounded-xl overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <SlideCanvas
              slide={slide}
              index={activeIndex}
              total={ppt.slides.length}
              ppt={ppt}
              slideImage={slideImage}
              width={MODAL_W}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onNavigate(-1); }}
        disabled={activeIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-all"
        aria-label="Previous"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onNavigate(1); }}
        disabled={activeIndex === ppt.slides.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-all"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      <div className="mt-4 text-sm text-white/60 text-center max-w-lg">
        {slide.title}
      </div>
    </div>
  );
}

function SlideEditPanel({
  slide, index, total, mode, onUpdate, onRegenerate, isRegenerating, ppt, slideImage, onOpenFullscreen,
}: {
  slide: GeneratedSlide;
  index: number;
  total: number;
  mode: PPTMode;
  onUpdate: (field: keyof GeneratedSlide, value: string | string[]) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  ppt: any;
  slideImage?: string | null;
  onOpenFullscreen: () => void;
}) {
  const [copied, setCopied]               = useState(false);
  const [showNotes, setShowNotes]         = useState(false);
  const [editingTitle, setEditingTitle]   = useState(false);
  const [editingBullet, setEditingBullet] = useState<number | null>(null);

  const previewRef  = useRef<HTMLDivElement>(null);
  const [previewW, setPreviewW] = useState(640);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setPreviewW(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setEditingTitle(false);
    setEditingBullet(null);
    setShowNotes(false);
  }, [index]);

  const copyContent = () => {
    navigator.clipboard.writeText([slide.title, '', ...slide.content].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scale    = previewW > 0 ? previewW / CANVAS_W : 1;
  const previewH = CANVAS_H * scale;

  return (
    <div className="flex flex-col h-full gap-3">
      <div
        ref={previewRef}
        className="relative group rounded-xl border border-white/8 shadow-lg flex-shrink-0 overflow-hidden"
        style={{ width: '100%' }}
      >
        <div style={{ width: previewW, height: previewH, position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute', top: 0, left: 0,
              width: CANVAS_W, height: CANVAS_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <SlideCanvas
              slide={slide} index={index} total={total} ppt={ppt}
              slideImage={slideImage} width={CANVAS_W}
            />
          </div>
        </div>

        <button
          onClick={onOpenFullscreen}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="Fullscreen preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {slide.layout_type && (
          <div className="absolute top-2 left-2">
            {/* text-xs (12px) — bumped from text-[9px] to meet 12px floor */}
            <span className={`text-xs px-1 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
              LAYOUT_COLORS[slide.layout_type] ?? 'bg-white/10 text-white/60 border-white/20'
            }`}>
              {slide.layout_type}
            </span>
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          {/* text-xs = 12px floor */}
          <span className="text-xs font-mono text-muted-foreground">Slide {index + 1} / {total}</span>
          <button onClick={copyContent} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Copy slide content">
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
              : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>

        {editingTitle ? (
          <Input
            autoFocus value={slide.title}
            onChange={e => onUpdate('title', e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            className="text-lg font-bold bg-transparent border-purple-500/50 text-foreground h-auto py-1"
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            className="text-lg font-bold text-foreground cursor-text hover:text-purple-300 transition-colors leading-snug"
            title="Click to edit"
          >
            {slide.title}
          </h2>
        )}

        <ul className="space-y-1.5">
          {slide.content.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              {editingBullet === i ? (
                <Input
                  autoFocus value={point}
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
                  title="Click to edit"
                >
                  {point}
                </span>
              )}
            </li>
          ))}
        </ul>

        {slide.visual_suggestion && mode === 'high_quality' && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <span className="text-xs text-amber-300/80">{slide.visual_suggestion}</span>
          </div>
        )}

        {slide.speaker_notes && mode === 'high_quality' && (
          <div>
            <button
              onClick={() => setShowNotes(n => !n)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" /> Speaker Notes
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
                  <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-muted-foreground leading-relaxed">{slide.speaker_notes}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Button
        variant="outline" size="sm"
        onClick={onRegenerate} disabled={isRegenerating}
        className="w-full border-white/10 hover:bg-white/5 text-xs"
      >
        {isRegenerating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
        Regenerate Slide
      </Button>
    </div>
  );
}

// ── Settings panel content (shared by sidebar and mobile bottom drawer) ──
function SettingsPanelContent({
  topic, setTopic,
  subtopics, setSubtopics, // NEW
  slideCount, setSlideCount,
  mode, setMode,
  presentationType, setPresentationType,
  isGenerating, handleGenerate,
  error, exportError, setExportError,
  ppt, fetchingImgs, slideImages, activeSlide, setActiveSlide,
}: {
  topic: string; setTopic: (v: string) => void;
  subtopics: string[]; setSubtopics: (v: string[]) => void; // NEW
  slideCount: number; setSlideCount: (v: number) => void;
  mode: PPTMode; setMode: (v: PPTMode) => void;
  presentationType: PresentationType; setPresentationType: (v: PresentationType) => void;
  isGenerating: boolean; handleGenerate: () => void;
  error: string | null; exportError: string | null; setExportError: (v: string | null) => void;
  ppt: any; fetchingImgs: boolean; slideImages: (string | null)[];
  activeSlide: number; setActiveSlide: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Topic</Label>
        <Textarea
          placeholder="e.g. The Impact of AI on Modern Education"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          className="resize-none bg-white/5 border-white/10 focus:border-purple-500/60 text-sm h-20"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Subtopics (Optional)
        </Label>
        <SubtopicsInput subtopics={subtopics} onChange={setSubtopics} />
        <p className="text-xs text-muted-foreground leading-snug">
          Focus on specific aspects of your topic
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Slides</Label>
          <span className="text-sm font-semibold text-purple-400">{slideCount}</span>
        </div>
        <Slider
          min={4} max={20} step={1}
          value={[slideCount]} onValueChange={([v]) => setSlideCount(v)}
          className="[&>span:first-child]:bg-purple-500/20 [&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400"
        />
        {/* text-xs = 12px floor */}
        <div className="flex justify-between text-xs text-muted-foreground"><span>4</span><span>20</span></div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quality Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['basic', 'high_quality'] as PPTMode[]).map(m => (
            <button
              key={m} onClick={() => setMode(m)}
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
          <p className="text-xs text-purple-400/70 leading-snug">
            Storytelling arc • Speaker notes • Visual suggestions
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
        <Select value={presentationType} onValueChange={v => setPresentationType(v as PresentationType)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="academic">🎓 Academic</SelectItem>
            <SelectItem value="business">💼 Business</SelectItem>
            <SelectItem value="creative">🎨 Creative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
      >
        {isGenerating
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating…</>
          : <><Sparkles className="w-4 h-4 mr-2" /> Generate PPT</>}
      </Button>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}
        {exportError && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-orange-400">Export failed</p>
              <p className="text-xs text-orange-400/80 mt-0.5 break-words">{exportError}</p>
            </div>
            <button onClick={() => setExportError(null)} className="text-orange-400/60 hover:text-orange-400 transition-colors shrink-0 text-xs">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {ppt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{ppt.slides.length} slides</span>
            <div className="flex items-center gap-2">
              {fetchingImgs && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              <Badge variant="outline" className="text-xs border-white/10">{ppt.design_theme}</Badge>
            </div>
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-0.5">
            {ppt.slides.map((s: any, i: number) => (
              <SlideThumbnail
                key={i} slide={s} index={i} total={ppt.slides.length} ppt={ppt}
                isActive={activeSlide === i} onClick={() => setActiveSlide(i)}
                slideImage={slideImages[i] ?? null} thumbWidth={240}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main PPT page ───────────────────────────────────────────────
export default function PPTPage() {
  const {
    ppt, setPPT, isGenerating, saveStatus, error, versions,
    activeSlide, setActiveSlide,
    generate, updateSlide, regenerateSlide,
    loadVersions, restoreVersion, savedPPTId,
    currentInputRef,
  } = usePPTGenerator();

  const [topic,            setTopic]            = useState('');
  const [subtopics,        setSubtopics]        = useState<string[]>([]);
  const [slideCount,       setSlideCount]       = useState(8);
  const [mode,             setMode]             = useState<PPTMode>('high_quality');
  const [presentationType, setPresentationType] = useState<PresentationType>('academic');
  const [isExporting,      setIsExporting]      = useState(false);
  const [isRegenerating,   setIsRegenerating]   = useState(false);
  const [exportError,      setExportError]      = useState<string | null>(null);
  const [showVersions,     setShowVersions]     = useState(false);
  const [showFullscreen,   setShowFullscreen]   = useState(false);
  const [fullscreenIdx,    setFullscreenIdx]    = useState(0);
  const [showGridView,     setShowGridView]     = useState(false);
  const [showMobilePanel,  setShowMobilePanel]  = useState(false);

  const [slideImages,  setSlideImages]  = useState<(string | null)[]>([]);
  const [fetchingImgs, setFetchingImgs] = useState(false);
  const fetchedTopicRef = useRef('');

  useEffect(() => {
    if (!ppt) return;
    const key = ppt.title;
    if (fetchedTopicRef.current === key) return;
    fetchedTopicRef.current = key;
    setFetchingImgs(true);
    const queries = ppt.slides.map((s: any) => {
      const iq = (s as any).image_query;
      if (iq && iq.trim() && iq !== s.title) return iq;
      const clean = s.title.replace(/[?!]/g, '').replace(/^(how|why|what|when|where|who)\s+/i, '');
      return clean.slice(0, 60);
    });
    fetchSlideImages(queries)
      .then(imgs => setSlideImages(imgs))
      .catch(() => setSlideImages([]))
      .finally(() => setFetchingImgs(false));
  }, [ppt?.title]);

  useEffect(() => {
    if (savedPPTId && showVersions) loadVersions(savedPPTId);
  }, [savedPPTId, showVersions, loadVersions]);

  const handleGenerate = () =>
    generate({ 
      topic, 
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      number_of_slides: slideCount, 
      mode, 
      presentation_type: presentationType 
    });

  const handleExport = async () => {
    if (!ppt) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportToPPTX(ppt);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenSlide = async () => {
    setIsRegenerating(true);
    await regenerateSlide(activeSlide, { 
      topic, 
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      number_of_slides: slideCount, 
      mode, 
      presentation_type: presentationType 
    });
    setIsRegenerating(false);
  };

  const handleReorder = useCallback((from: number, to: number) => {
    if (!ppt) return;
    const slides = [...ppt.slides];
    const [moved] = slides.splice(from, 1);
    slides.splice(to, 0, moved);
    const renumbered = slides.map((s, i) => ({ ...s, slide_number: i + 1 }));
    const imgs = [...slideImages];
    const [movedImg] = imgs.splice(from, 1);
    imgs.splice(to, 0, movedImg);
    setSlideImages(imgs);
    if (typeof setPPT === 'function') setPPT({ ...ppt, slides: renumbered });
    setActiveSlide(to);
  }, [ppt, slideImages, setPPT, setActiveSlide]);

  const openFullscreen = useCallback((idx: number) => {
    setFullscreenIdx(idx);
    setShowFullscreen(true);
  }, []);

  const navigateFullscreen = useCallback((dir: 1 | -1) => {
    if (!ppt) return;
    setFullscreenIdx(i => Math.min(Math.max(0, i + dir), ppt.slides.length - 1));
  }, [ppt]);

  const slide = ppt?.slides[activeSlide];

  const settingsProps = {
    topic, setTopic, subtopics, setSubtopics, slideCount, setSlideCount, mode, setMode,
    presentationType, setPresentationType, isGenerating, handleGenerate,
    error: error ?? null, exportError, setExportError,
    ppt, fetchingImgs, slideImages, activeSlide, setActiveSlide,
  };

  return (
    <div className="flex h-full gap-0">

      {/* ── LEFT PANEL — hidden on mobile, visible md+ ──────── */}
      <div className="hidden md:flex w-72 shrink-0 flex-col gap-4 border-r border-white/5 overflow-y-auto">
        <div className="p-5 pb-0">
          <h1 className="text-lg font-semibold gradient-text">PPT Generator</h1>
          <p className="text-xs text-muted-foreground mt-1">AI-powered Gamma-level presentations</p>
        </div>
        <div className="px-5">
          <SettingsPanelContent {...settingsProps} />
        </div>
        
        {/* Follow-up Panel (when PPT exists) */}
        {ppt && savedPPTId && (
          <div className="px-5 pb-5">
            <FollowUpPanel
              contentType="ppt"
              contentId={savedPPTId}
              contentTitle={ppt.title}
              onContentUpdated={() => {
                // Refresh the PPT data when content is updated
                if (savedPPTId) {
                  // The hook will automatically reload when the content changes
                  window.location.reload(); // Simple refresh for now
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile header row */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <h1 className="text-sm font-semibold gradient-text">PPT Generator</h1>
          <div className="flex items-center gap-2">
            {ppt && (
              <Button size="sm" onClick={handleExport} disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8">
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export
              </Button>
            )}
            {/* Mobile bottom drawer trigger */}
            <Sheet open={showMobilePanel} onOpenChange={setShowMobilePanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-white/10 gap-1.5 h-8 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="bg-background border-white/10 rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-safe"
              >
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-sm gradient-text">PPT Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6">
                  <SettingsPanelContent {...settingsProps} />
                  
                  {/* Follow-up Panel for mobile */}
                  {ppt && savedPPTId && (
                    <>
                      <hr className="border-white/10" />
                      <FollowUpPanel
                        contentType="ppt"
                        contentId={savedPPTId}
                        contentTitle={ppt.title}
                        onContentUpdated={() => {
                          setShowMobilePanel(false); // Close mobile panel
                          window.location.reload(); // Simple refresh for now
                        }}
                      />
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop toolbar (shown when ppt exists) */}
        {ppt && (
          <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <Presentation className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold truncate max-w-xs">{ppt.title}</h2>
              <SaveIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm"
                onClick={() => setShowGridView(true)}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <LayoutGrid className="w-3.5 h-3.5" /> Overview
              </Button>
              <Button variant="ghost" size="sm"
                onClick={() => openFullscreen(activeSlide)}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <Maximize2 className="w-3.5 h-3.5" /> Preview
              </Button>
              <Sheet open={showVersions} onOpenChange={setShowVersions}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                    <History className="w-3.5 h-3.5" /> History
                  </Button>
                </SheetTrigger>
                {/* Sheet width: w-[min(20rem,92vw)] prevents overflow on 375px phones */}
                <SheetContent className="bg-background border-white/10 w-[min(20rem,92vw)]">
                  <SheetHeader><SheetTitle className="text-sm">Version History</SheetTitle></SheetHeader>
                  <div className="mt-4 space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No versions saved yet.</p>
                    ) : (
                      versions.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                          <div>
                            <p className="text-xs font-medium">Version {v.version}</p>
                            {/* text-xs = 12px floor — bumped from text-[10px] */}
                            <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground/60">{v.slides?.length ?? 0} slides</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => restoreVersion(v)} className="text-xs gap-1 h-7">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Button size="sm" onClick={handleExport} disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download PPTX
              </Button>
            </div>
          </div>
        )}

        {/* Mobile ppt title bar */}
        {ppt && (
          <div className="flex md:hidden items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Presentation className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-xs font-medium truncate">{ppt.title}</span>
              <SaveIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setShowGridView(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Overview">
                <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => openFullscreen(activeSlide)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden p-3 md:p-5">
          {!ppt && !isGenerating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <LayoutGrid className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your slides will appear here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tap Settings to enter a topic</p>
              </div>
              {/* Mobile CTA */}
              <Sheet open={showMobilePanel} onOpenChange={setShowMobilePanel}>
                <SheetTrigger asChild>
                  <Button className="md:hidden bg-gradient-to-r from-purple-600 to-blue-600 text-white gap-2">
                    <Sparkles className="w-4 h-4" /> Get Started
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom"
                  className="bg-background border-white/10 rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-safe">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-sm gradient-text">PPT Settings</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6">
                    <SettingsPanelContent {...settingsProps} />
                    
                    {/* Follow-up Panel for mobile */}
                    {ppt && savedPPTId && (
                      <>
                        <hr className="border-white/10" />
                        <FollowUpPanel
                          contentType="ppt"
                          contentId={savedPPTId}
                          contentTitle={ppt.title}
                          onContentUpdated={() => {
                            setShowMobilePanel(false); // Close mobile panel
                            window.location.reload(); // Simple refresh for now
                          }}
                        />
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </motion.div>
          )}

          {isGenerating && (
            <div className="h-full flex flex-col gap-4 animate-pulse">
              <div className="glass-card rounded-2xl" style={{ aspectRatio: '16/9' }}>
                <div className="h-full bg-white/5 rounded-2xl" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Generating {slideCount} slides with {mode === 'high_quality' ? 'Gamma-level' : 'basic'} quality…
              </p>
            </div>
          )}

          {ppt && slide && !isGenerating && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <SlideEditPanel
                  slide={slide} index={activeSlide} total={ppt.slides.length} mode={mode}
                  onUpdate={(field, value) => updateSlide(activeSlide, field, value)}
                  onRegenerate={handleRegenSlide} isRegenerating={isRegenerating}
                  ppt={ppt} slideImage={slideImages[activeSlide] ?? null}
                  onOpenFullscreen={() => openFullscreen(activeSlide)}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {ppt && (
          <div className="flex items-center justify-center gap-4 py-3 border-t border-white/5 shrink-0 mb-16 md:mb-0">
            <button
              onClick={() => setActiveSlide(i => Math.max(0, i - 1))}
              disabled={activeSlide === 0}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous slide"
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
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {showFullscreen && ppt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FullscreenModal
              ppt={ppt} activeIndex={fullscreenIdx}
              onClose={() => setShowFullscreen(false)}
              onNavigate={navigateFullscreen}
              slideImages={slideImages}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid overview */}
      <AnimatePresence>
        {showGridView && ppt && (
          <SlidePreviewGrid
            ppt={ppt} activeSlide={activeSlide} slideImages={slideImages}
            onSelect={setActiveSlide} onReorder={handleReorder}
            onClose={() => setShowGridView(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
