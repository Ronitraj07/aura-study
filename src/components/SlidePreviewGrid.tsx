// ============================================================
// SlidePreviewGrid.tsx — Birds-eye deck overview
//
// Shows all slides as a draggable grid. Click to jump to a slide.
// Drag to reorder (swap on drop — no external dep needed).
// Shows the same SlideCanvas thumbnails used in the sidebar.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import type { GeneratedPPT } from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';
import { SlideCanvas } from '@/components/SlideCanvas';

const CANVAS_W = 800;
const CANVAS_H = (CANVAS_W / 10) * 5.63;
const THUMB_W  = 200;
const THUMB_H  = CANVAS_H * (THUMB_W / CANVAS_W);
const SCALE    = THUMB_W / CANVAS_W;

const LAYOUT_DOT: Record<string, string> = {
  title:        '#A78BFA',
  content:      '#60A5FA',
  'two-column': '#34D399',
  'image-focus':'#FBBF24',
  quote:        '#F472B6',
  stats:        '#22D3EE',
};

interface SlidePreviewGridProps {
  ppt:          GeneratedPPT & { topic?: string };
  activeSlide:  number;
  slideImages:  (string | null)[];
  onSelect:     (index: number) => void;
  onReorder:    (from: number, to: number) => void;
  onClose:      () => void;
}

export function SlidePreviewGrid({
  ppt,
  activeSlide,
  slideImages,
  onSelect,
  onReorder,
  onClose,
}: SlidePreviewGridProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragNodeRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragNodeRef.current = index;
    setDragFrom(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragNodeRef.current !== index) setDragOver(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragNodeRef.current;
    if (from !== null && from !== index) {
      onReorder(from, index);
    }
    setDragFrom(null);
    setDragOver(null);
    dragNodeRef.current = null;
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragFrom(null);
    setDragOver(null);
    dragNodeRef.current = null;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: 'rgba(10,9,12,0.97)', backdropFilter: 'blur(12px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{ppt.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ppt.slides.length} slides · drag to reorder · click to edit
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/8 transition-all"
          aria-label="Close overview"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_W}px, 1fr))`,
            gap: 20,
          }}
        >
          {ppt.slides.map((slide, i) => {
            const isActive  = i === activeSlide;
            const isDragged = dragFrom === i;
            const isTarget  = dragOver === i;
            const dot       = LAYOUT_DOT[slide.layout_type ?? ''] ?? '#7C8CA8';

            return (
              <motion.div
                key={i}
                layout
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onClick={() => { onSelect(i); onClose(); }}
                style={{
                  opacity:    isDragged ? 0.4 : 1,
                  cursor:     'grab',
                  transform:  isTarget ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 150ms ease, opacity 150ms ease',
                }}
                className={`
                  rounded-xl border overflow-hidden select-none
                  ${
                    isActive
                      ? 'border-purple-500/60 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                      : isTarget
                        ? 'border-blue-400/50 shadow-[0_0_16px_rgba(96,165,250,0.20)]'
                        : 'border-white/8 hover:border-white/20'
                  }
                `}
              >
                {/* Canvas thumbnail */}
                <div
                  style={{
                    width:         THUMB_W,
                    height:        THUMB_H,
                    position:      'relative',
                    overflow:      'hidden',
                    pointerEvents: 'none',
                    flexShrink:    0,
                  }}
                >
                  <div
                    style={{
                      position:        'absolute',
                      top:             0,
                      left:            0,
                      width:           CANVAS_W,
                      height:          CANVAS_H,
                      transform:       `scale(${SCALE})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <SlideCanvas
                      slide={slide}
                      index={i}
                      total={ppt.slides.length}
                      ppt={ppt}
                      slideImage={slideImages[i] ?? null}
                      width={CANVAS_W}
                    />
                  </div>

                  {/* Active glow bar */}
                  {isActive && (
                    <div style={{
                      position:   'absolute',
                      left: 0, top: 0,
                      width:      2,
                      height:     '100%',
                      background: 'linear-gradient(to bottom, transparent, #8B5CF6, #A78BFA, transparent)',
                      boxShadow:  '0 0 8px rgba(139,92,246,0.8)',
                    }} />
                  )}

                  {/* Slide number badge */}
                  <div style={{
                    position:       'absolute',
                    top:            4,
                    left:           6,
                    padding:        '1px 6px',
                    borderRadius:   4,
                    background:     'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    fontSize:       9,
                    fontWeight:     700,
                    fontFamily:     "'Plus Jakarta Sans', system-ui, sans-serif",
                    color:          isActive ? '#C4B5FD' : 'rgba(255,255,255,0.55)',
                    letterSpacing:  '0.04em',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  {/* Drag handle hint */}
                  <div style={{
                    position:   'absolute',
                    top:        4,
                    right:      4,
                    opacity:    0.4,
                    pointerEvents: 'none',
                  }}>
                    <GripVertical style={{ width: 10, height: 10, color: 'white' }} />
                  </div>
                </div>

                {/* Info bar */}
                <div style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         6,
                  padding:     '5px 8px',
                  background:  isActive ? 'rgba(139,92,246,0.12)' : 'rgba(0,0,0,0.35)',
                  borderTop:   `1px solid ${ isActive ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.05)' }`,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, boxShadow: `0 0 5px ${dot}88`, flexShrink: 0 }} />
                  <span style={{
                    flex:         1,
                    fontSize:     9.5,
                    fontFamily:   "'Plus Jakarta Sans', system-ui, sans-serif",
                    color:        isActive ? 'rgba(220,210,255,0.9)' : 'rgba(148,163,184,0.7)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    fontWeight:   isActive ? 600 : 400,
                  }}>
                    {slide.title.slice(0, 26)}{slide.title.length > 26 ? '\u2026' : ''}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default SlidePreviewGrid;
