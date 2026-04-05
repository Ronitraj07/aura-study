// ============================================================
// SlideThumbnail.tsx — Scaled SlideCanvas thumbnail
//
// Outer div is sized to scaled dimensions so layout is correct.
// Inner 800px canvas is absolutely positioned and scaled down.
//
//   SCALE    = thumbWidth / CANVAS_W
//   thumbH   = CANVAS_H * SCALE
// ============================================================

import type { GeneratedPPT } from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';
import { SlideCanvas } from '@/components/SlideCanvas';

const CANVAS_W = 800;
const CANVAS_H = (CANVAS_W / 10) * 5.63; // 450.4 — 16:9

// Layout dot color per layout type
const LAYOUT_DOT: Record<string, string> = {
  title:          '#A78BFA',
  content:        '#60A5FA',
  'two-column':   '#34D399',
  'image-focus':  '#FBBF24',
  quote:          '#F472B6',
  stats:          '#22D3EE',
};

const LAYOUT_LABEL: Record<string, string> = {
  title:          'TL',
  content:        'CT',
  'two-column':   '2C',
  'image-focus':  'IM',
  quote:          'QT',
  stats:          'ST',
};

interface SlideThumbnailProps {
  slide:      GeneratedSlide;
  index:      number;
  total:      number;
  ppt:        GeneratedPPT & { topic?: string };
  isActive:   boolean;
  onClick:    () => void;
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
  const scale  = thumbWidth / CANVAS_W;
  const thumbH = CANVAS_H * scale;
  const dot    = LAYOUT_DOT[slide.layout_type ?? ''] ?? '#7C8CA8';
  const label  = LAYOUT_LABEL[slide.layout_type ?? ''] ?? '--';

  return (
    <button
      onClick={onClick}
      style={{ width: thumbWidth }}
      className={`
        group text-left rounded-xl border transition-all duration-200 overflow-hidden
        ${
          isActive
            ? 'border-purple-500/50 shadow-[0_0_18px_rgba(139,92,246,0.22)] ring-1 ring-purple-500/25'
            : 'border-white/6 hover:border-white/18 hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
        }
      `}
    >
      {/* ── Canvas preview ──────────────────────────────── */}
      <div
        style={{
          width:         thumbWidth,
          height:        thumbH,
          position:      'relative',
          overflow:      'hidden',
          flexShrink:    0,
          pointerEvents: 'none',
        }}
      >
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

        {/* Active indicator — left glow bar */}
        {isActive && (
          <div
            style={{
              position:     'absolute',
              left:         0,
              top:          0,
              width:        2,
              height:       '100%',
              background:   'linear-gradient(to bottom, transparent, #8B5CF6, #A78BFA, transparent)',
              boxShadow:    '0 0 8px rgba(139,92,246,0.8)',
            }}
          />
        )}

        {/* Slide index overlay — top-left corner */}
        <div
          style={{
            position:   'absolute',
            top:        4,
            left:       isActive ? 6 : 4,
            padding:    '1px 5px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            fontSize:   9,
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            color:      isActive ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
      </div>

      {/* ── Info bar ────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          padding:        '5px 8px',
          background:     isActive
            ? 'rgba(139,92,246,0.10)'
            : 'rgba(0,0,0,0.28)',
          borderTop:      `1px solid ${
            isActive ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.04)'
          }`,
          transition:     'background 200ms, border-color 200ms',
        }}
      >
        {/* Layout type dot + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   dot,
            boxShadow:    `0 0 5px ${dot}99`,
            flexShrink:   0,
          }} />
          <span style={{
            fontSize:      8.5,
            fontWeight:    700,
            fontFamily:    "'Plus Jakarta Sans', system-ui, sans-serif",
            color:         dot,
            letterSpacing: '0.08em',
            opacity:       0.9,
          }}>
            {label}
          </span>
        </div>

        {/* Title — truncated */}
        <span style={{
          flex:         1,
          fontSize:     9.5,
          fontFamily:   "'Plus Jakarta Sans', system-ui, sans-serif",
          color:        isActive ? 'rgba(224,212,255,0.85)' : 'rgba(148,163,184,0.75)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          fontWeight:   isActive ? 600 : 400,
          transition:   'color 200ms',
        }}>
          {slide.title.slice(0, 28)}{slide.title.length > 28 ? '\u2026' : ''}
        </span>
      </div>
    </button>
  );
}

export default SlideThumbnail;
