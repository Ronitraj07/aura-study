// ============================================================
// SlideThumbnail.tsx — Correctly scaled SlideCanvas thumbnail
//
// The core problem with transform: scale() is that it does NOT
// reduce the element's layout box — the element still takes up
// its original dimensions, pushing siblings down.
//
// Fix: wrap the full-size SlideCanvas (800px) in an outer div
// that is sized to the SCALED dimensions, then absolutely position
// the inner 800px canvas inside it, scaled via transform.
//
// Formula:
//   CANVAS_W = 800   (render resolution)
//   CANVAS_H = 800 / (10/5.63) = 450.4
//   THUMB_W  = target display width (e.g. 232px)
//   SCALE    = THUMB_W / CANVAS_W
//   THUMB_H  = CANVAS_H * SCALE
// ============================================================

import type { GeneratedPPT } from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';
import { SlideCanvas } from '@/components/SlideCanvas';

const CANVAS_W = 800;
const CANVAS_H = (CANVAS_W / 10) * 5.63; // 450.4

const LAYOUT_COLORS: Record<string, string> = {
  title:          'bg-purple-500/20 text-purple-300 border-purple-500/30',
  content:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'two-column':   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'image-focus':  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  quote:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
  stats:          'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

interface SlideThumbnailProps {
  slide: GeneratedSlide;
  index: number;
  total: number;
  ppt: GeneratedPPT & { topic?: string };
  isActive: boolean;
  onClick: () => void;
  slideImage?: string | null;
  /** Display width in px. Height is auto-computed at 16:9. Default: 232 */
  thumbWidth?: number;
}

export function SlideThumbnail({
  slide,
  index,
  total,
  ppt,
  isActive,
  onClick,
  slideImage,
  thumbWidth = 232,
}: SlideThumbnailProps) {
  const scale   = thumbWidth / CANVAS_W;
  const thumbH  = CANVAS_H * scale;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
          : 'border-white/5 hover:border-white/20'
      }`}
    >
      {/* Outer: sized to scaled dimensions so layout is correct */}
      <div
        style={{
          width:    thumbWidth,
          height:   thumbH,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Inner: full-size canvas, scaled down to fit */}
        <div
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            width:           CANVAS_W,
            height:          CANVAS_H,
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <SlideCanvas
            slide={slide}
            index={index}
            total={total}
            ppt={ppt}
            slideImage={slideImage}
            width={CANVAS_W}
          />
        </div>
      </div>

      {/* Slide number + layout badge + title */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-black/20">
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        {slide.layout_type && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide shrink-0 ${
              LAYOUT_COLORS[slide.layout_type] ?? 'bg-white/10 text-white/60 border-white/20'
            }`}
          >
            {slide.layout_type}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground truncate flex-1 text-right">
          {slide.title.slice(0, 22)}{slide.title.length > 22 ? '…' : ''}
        </span>
      </div>
    </button>
  );
}

export default SlideThumbnail;
