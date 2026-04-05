// ============================================================
// SlideCanvas.tsx — WYSIWYG visual slide renderer
// Mirrors pptExport.ts layouts in HTML/CSS so what users see
// in-app matches the exported PPTX exactly.
//
// Coordinate system: pptx uses a 10" × 5.63" canvas.
// We render at a scalable width (default 800px) and map:
//   px = (inches / 10) * containerWidth
//   py = (inches / 5.63) * containerHeight
//
// Layouts: cover, content, two-column, image-focus, quote, stats
// Themes:  modern (dark), minimal (light), corporate (blue)
// ============================================================

import { useMemo } from 'react';
import type { GeneratedSlide } from '@/types/database';
import type { GeneratedPPT } from '@/hooks/usePPTGenerator';

type DesignTheme = 'modern' | 'minimal' | 'corporate';
type LayoutType  = 'title' | 'content' | 'two-column' | 'image-focus' | 'quote' | 'stats';

interface ThemeTokens {
  bg:         string;
  bgAlt:      string;
  titleColor: string;
  textColor:  string;
  mutedColor: string;
  accent1:    string;
  accent2:    string;
  accent3:    string;
}

const THEMES: Record<DesignTheme, ThemeTokens> = {
  modern: {
    bg:         '#0D0D1A',
    bgAlt:      '#12122A',
    titleColor: '#C4B5FD',
    textColor:  '#E2E8F0',
    mutedColor: '#94A3B8',
    accent1:    '#7C3AED',
    accent2:    '#A855F7',
    accent3:    '#4F46E5',
  },
  minimal: {
    bg:         '#FFFFFF',
    bgAlt:      '#F8FAFC',
    titleColor: '#0F172A',
    textColor:  '#1E293B',
    mutedColor: '#64748B',
    accent1:    '#0EA5E9',
    accent2:    '#0284C7',
    accent3:    '#7DD3FC',
  },
  corporate: {
    bg:         '#F0F4F8',
    bgAlt:      '#FFFFFF',
    titleColor: '#0C2340',
    textColor:  '#1E3A5F',
    mutedColor: '#64748B',
    accent1:    '#1D4ED8',
    accent2:    '#2563EB',
    accent3:    '#93C5FD',
  },
};

interface SlideCanvasProps {
  /** The individual slide data */
  slide: GeneratedSlide;
  /** Index in the presentation (0-based) */
  index: number;
  /** Total slide count (for footer) */
  total: number;
  /** The overall PPT for theme + cover info */
  ppt: GeneratedPPT & { topic?: string };
  /** Optional fetched Pexels image as base64 data URL */
  slideImage?: string | null;
  /** Render width in px. Height is auto-computed at 16:9. Default: 800 */
  width?: number;
  /** Whether this is a cover slide render */
  isCover?: boolean;
  /** Cover image for cover slide */
  coverImage?: string | null;
}

/** Convert pptx inches to px at the given canvas width (10" wide) */
function ix(inches: number, w: number) { return (inches / 10) * w; }
/** Convert pptx inches to px at the given canvas height (5.63" tall) */
function iy(inches: number, h: number) { return (inches / 5.63) * h; }

// ── Shared: top accent stripe + left bar + title ──────────────
function SlideHeader({
  slide, t, w, h, titleFontSize = 28,
}: {
  slide: GeneratedSlide; t: ThemeTokens; w: number; h: number; titleFontSize?: number;
}) {
  return (
    <>
      {/* Top accent stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%',
        height: iy(0.09, h), background: t.accent2,
      }} />
      {/* Left vertical bar */}
      <div style={{
        position: 'absolute',
        left: ix(0.38, w), top: iy(0.25, h),
        width: ix(0.07, w), height: iy(0.85, h),
        background: t.accent2,
      }} />
      {/* Title */}
      <div style={{
        position: 'absolute',
        left: ix(0.58, w), top: iy(0.22, h),
        width: ix(8.8, w), height: iy(0.9, h),
        fontSize: (titleFontSize / 10) * (w / 80),
        fontWeight: 700, color: t.titleColor,
        display: 'flex', alignItems: 'center',
        lineHeight: 1.2, overflow: 'hidden',
      }}>
        {slide.title}
      </div>
      {/* Subtitle */}
      {slide.subtitle && (
        <div style={{
          position: 'absolute',
          left: ix(0.58, w), top: iy(1.1, h),
          width: ix(8.8, w), height: iy(0.38, h),
          fontSize: (13 / 10) * (w / 80),
          fontWeight: 600, color: t.mutedColor,
          fontStyle: 'italic', overflow: 'hidden',
        }}>
          {slide.subtitle}
        </div>
      )}
      {/* Divider line */}
      <div style={{
        position: 'absolute',
        left: ix(0.58, w), top: iy(1.46, h),
        width: ix(8.9, w), height: iy(0.028, h),
        background: t.accent1, opacity: 0.35,
      }} />
    </>
  );
}

// ── Shared: slide footer counter ──────────────────────────────
function SlideFooter({
  index, total, t, w, h,
}: { index: number; total: number; t: ThemeTokens; w: number; h: number; }) {
  return (
    <div style={{
      position: 'absolute',
      right: ix(0.2, w), bottom: iy(0.12, h),
      fontSize: (9 / 10) * (w / 80), color: t.mutedColor,
    }}>
      {index + 1} / {total}
    </div>
  );
}

// ── Bullet list renderer ──────────────────────────────────────
function BulletList({
  items, t, fontSize = 16, maxItems = 5,
}: { items: string[]; t: ThemeTokens; fontSize?: number; maxItems?: number; }) {
  const scale = fontSize / 16;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
      {items.slice(0, maxItems).map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '0.5em', alignItems: 'flex-start', lineHeight: 1.35 }}>
          <span style={{ color: t.accent1, fontSize: `${0.55 * scale}em`, marginTop: '0.35em', flexShrink: 0 }}>▪</span>
          <span style={{ color: t.textColor, fontSize: `${scale}em` }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Cover slide ───────────────────────────────────────────────
function CoverSlide({
  ppt, t, w, h, coverImage,
}: {
  ppt: GeneratedPPT & { topic?: string };
  t: ThemeTokens; w: number; h: number; coverImage?: string | null;
}) {
  return (
    <>
      {/* Full background */}
      {coverImage ? (
        <img
          src={coverImage}
          alt="cover"
          style={{
            position: 'absolute', left: 0, top: 0,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        />
      ) : null}
      {/* Left scrim */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: ix(6.8, w), height: '100%',
        background: coverImage
          ? `linear-gradient(to right, ${t.bg}f0, ${t.bg}88)`
          : `linear-gradient(135deg, ${t.accent1}28 0%, ${t.bg} 70%)`,
      }} />
      {/* Right vignette when image present */}
      {coverImage && (
        <div style={{
          position: 'absolute', left: ix(6.0, w), top: 0,
          width: ix(4.0, w), height: '100%',
          background: `linear-gradient(to right, transparent, ${t.bg}90)`,
        }} />
      )}
      {/* Decorative right block when no image */}
      {!coverImage && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: ix(2.2, w), height: '100%',
          background: t.accent2, opacity: 0.22,
        }} />
      )}
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: ix(0.5, w), top: iy(0.35, h),
        width: ix(0.08, w), height: iy(2.6, h),
        background: t.accent3,
      }} />
      {/* Main title */}
      <div style={{
        position: 'absolute',
        left: ix(0.72, w), top: iy(0.5, h),
        width: ix(6.6, w), maxHeight: iy(2.4, h),
        fontSize: (36 / 10) * (w / 80), fontWeight: 700,
        color: t.titleColor, lineHeight: 1.15,
        overflow: 'hidden',
      }}>
        {ppt.title}
      </div>
      {/* Subtitle / topic */}
      <div style={{
        position: 'absolute',
        left: ix(0.72, w), top: iy(3.05, h),
        width: ix(6.6, w), height: iy(0.5, h),
        fontSize: (15 / 10) * (w / 80), color: t.mutedColor,
        fontStyle: 'italic', overflow: 'hidden',
      }}>
        {(ppt.topic ?? ppt.title).toLowerCase()}
      </div>
      {/* Divider line */}
      <div style={{
        position: 'absolute',
        left: ix(0.72, w), top: iy(3.65, h),
        width: ix(5.0, w), height: iy(0.045, h),
        background: t.accent1, opacity: 0.65,
      }} />
      {/* Byline */}
      <div style={{
        position: 'absolute',
        left: ix(0.72, w), top: iy(4.1, h),
        fontSize: (11 / 10) * (w / 80), color: t.mutedColor,
      }}>
        Generated by Aura Study · AI-Powered Learning
      </div>
      {/* Slide count badge */}
      <div style={{
        position: 'absolute',
        right: ix(0.4, w), bottom: iy(0.25, h),
        background: t.accent1 + '44',
        border: `1px solid ${t.accent1}`,
        borderRadius: ix(0.1, w),
        padding: `${iy(0.04, h)}px ${ix(0.18, w)}px`,
        fontSize: (11 / 10) * (w / 80), fontWeight: 700,
        color: t.titleColor,
      }}>
        {ppt.slides.length} Slides
      </div>
    </>
  );
}

// ── Content slide ─────────────────────────────────────────────
function ContentSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  const bulletW  = slideImage ? ix(5.4, w) : ix(9.0, w);
  const fontSize = (16 / 10) * (w / 80);
  return (
    <>
      <SlideHeader slide={slide} t={t} w={w} h={h} titleFontSize={28} />
      {/* Bullets */}
      <div style={{
        position: 'absolute',
        left: ix(0.55, w), top: iy(1.58, h),
        width: bulletW, maxHeight: iy(3.7, h),
        fontSize, overflow: 'hidden',
      }}>
        <BulletList items={slide.content} t={t} fontSize={16} maxItems={5} />
      </div>
      {/* Optional image */}
      {slideImage && (
        <>
          <img
            src={slideImage} alt={slide.title}
            style={{
              position: 'absolute',
              left: ix(6.1, w), top: iy(1.45, h),
              width: ix(3.6, w), height: iy(3.75, h),
              objectFit: 'cover', borderRadius: ix(0.06, w),
            }}
          />
          <div style={{
            position: 'absolute',
            left: ix(6.1, w), top: iy(1.45, h),
            width: ix(3.6, w), height: iy(3.75, h),
            background: t.bg, opacity: 0.40,
            borderRadius: ix(0.06, w),
            border: `1px solid ${t.accent1}55`,
          }} />
        </>
      )}
      <SlideFooter index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── Two-column slide ──────────────────────────────────────────
function TwoColumnSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  const COL_DIV  = ix(4.7, w);
  const RIGHT_X  = ix(4.86, w);
  const RIGHT_W  = ix(4.86, w);
  const half     = Math.ceil(slide.content.length / 2);
  const leftItems  = slide.content.slice(0, half);
  const rightItems = slideImage ? [] : slide.content.slice(half);
  const fs = (14 / 10) * (w / 80);

  return (
    <>
      {/* Top accent */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%',
        height: iy(0.09, h), background: t.accent2,
      }} />
      {/* Title */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(0.18, h),
        width: ix(9.2, w), height: iy(0.76, h),
        fontSize: (26 / 10) * (w / 80), fontWeight: 700,
        color: t.titleColor, display: 'flex', alignItems: 'center',
        overflow: 'hidden',
      }}>{slide.title}</div>
      {slide.subtitle && (
        <div style={{
          position: 'absolute',
          left: ix(0.42, w), top: iy(0.92, h),
          width: ix(9.2, w), height: iy(0.36, h),
          fontSize: (12 / 10) * (w / 80), color: t.mutedColor,
          fontStyle: 'italic', fontWeight: 600, overflow: 'hidden',
        }}>{slide.subtitle}</div>
      )}
      {/* Divider */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(1.26, h),
        width: ix(9.2, w), height: iy(0.028, h),
        background: t.accent1, opacity: 0.35,
      }} />
      {/* Column divider */}
      <div style={{
        position: 'absolute',
        left: COL_DIV, top: iy(1.34, h),
        width: ix(0.028, w), height: iy(3.85, h),
        background: t.accent1, opacity: 0.28,
      }} />
      {/* Left header chip */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(1.34, h),
        width: ix(1.4, w), height: iy(0.32, h),
        background: t.accent1 + '2e', borderRadius: ix(0.06, w),
        border: `1px solid ${t.accent1}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: (9 / 10) * (w / 80), fontWeight: 700, color: t.titleColor,
      }}>KEY POINTS</div>
      {/* Left bullets */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(1.72, h),
        width: ix(4.3, w), maxHeight: iy(3.3, h),
        fontSize: fs, overflow: 'hidden',
      }}>
        <BulletList items={leftItems} t={t} fontSize={14} maxItems={4} />
      </div>
      {/* Right side */}
      {slideImage ? (
        <>
          <img
            src={slideImage} alt={slide.title}
            style={{
              position: 'absolute',
              left: RIGHT_X, top: iy(1.34, h),
              width: RIGHT_W, height: iy(3.85, h),
              objectFit: 'cover', borderRadius: ix(0.06, w),
            }}
          />
          <div style={{
            position: 'absolute',
            left: RIGHT_X, top: iy(1.34, h),
            width: RIGHT_W, height: iy(3.85, h),
            background: t.bg, opacity: 0.40,
            borderRadius: ix(0.06, w),
            border: `1px solid ${t.accent1}55`,
          }} />
        </>
      ) : (
        <>
          <div style={{
            position: 'absolute',
            left: RIGHT_X, top: iy(1.34, h),
            width: ix(1.4, w), height: iy(0.32, h),
            background: t.accent2 + '2e', borderRadius: ix(0.06, w),
            border: `1px solid ${t.accent2}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: (9 / 10) * (w / 80), fontWeight: 700, color: t.titleColor,
          }}>DETAILS</div>
          <div style={{
            position: 'absolute',
            left: RIGHT_X, top: iy(1.72, h),
            width: RIGHT_W, maxHeight: iy(3.3, h),
            fontSize: fs, overflow: 'hidden',
          }}>
            <BulletList items={rightItems} t={t} fontSize={14} maxItems={4} />
          </div>
        </>
      )}
      <SlideFooter index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── Image-focus slide ─────────────────────────────────────────
function ImageFocusSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  return (
    <>
      <SlideHeader slide={slide} t={t} w={w} h={h} titleFontSize={28} />
      {/* Left bullets (up to 4) */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(1.58, h),
        width: ix(5.35, w), maxHeight: iy(3.55, h),
        fontSize: (16 / 10) * (w / 80), overflow: 'hidden',
      }}>
        <BulletList items={slide.content} t={t} fontSize={16} maxItems={4} />
      </div>
      {/* Right image or placeholder */}
      {slideImage ? (
        <>
          <img
            src={slideImage} alt={slide.title}
            style={{
              position: 'absolute',
              left: ix(6.0, w), top: iy(0.25, h),
              width: ix(3.7, w), height: iy(4.95, h),
              objectFit: 'cover', borderRadius: ix(0.1, w),
            }}
          />
          <div style={{
            position: 'absolute',
            left: ix(6.0, w), top: iy(0.25, h),
            width: ix(3.7, w), height: iy(4.95, h),
            background: t.bg, opacity: 0.35,
            borderRadius: ix(0.1, w),
            border: `1px solid ${t.accent1}44`,
          }} />
        </>
      ) : (
        <div style={{
          position: 'absolute',
          left: ix(6.0, w), top: iy(0.25, h),
          width: ix(3.7, w), height: iy(4.95, h),
          background: t.accent1 + '22',
          border: `1px solid ${t.accent1}55`,
          borderRadius: ix(0.15, w),
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '0.5em',
        }}>
          <div style={{
            width: ix(1.6, w), height: ix(1.6, w),
            borderRadius: '50%', background: t.accent2 + '44',
            border: `1px solid ${t.accent2}88`,
          }} />
          <span style={{ color: t.titleColor, fontWeight: 700, fontSize: (14 / 10) * (w / 80) }}>
            {slide.visual_suggestion ?? '🖼️ Visual'}
          </span>
        </div>
      )}
      <SlideFooter index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── Quote slide ───────────────────────────────────────────────
function QuoteSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  return (
    <>
      {slideImage ? (
        <>
          <img
            src={slideImage} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: t.accent1, opacity: 0.5 }} />
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', inset: 0, background: t.accent1 }} />
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: ix(1.5, w), height: iy(1.5, h),
            background: t.accent2, opacity: 0.35,
          }} />
          <div style={{
            position: 'absolute', right: 0, bottom: 0,
            width: ix(1.5, w), height: iy(1.5, h),
            background: t.accent2, opacity: 0.35,
          }} />
        </>
      )}
      {/* Large quote mark */}
      <div style={{
        position: 'absolute',
        left: ix(0.5, w), top: iy(0.2, h),
        fontSize: (90 / 10) * (w / 80),
        fontWeight: 700, color: t.titleColor,
        opacity: 0.38, lineHeight: 1,
      }}>“</div>
      {/* Quote text */}
      <div style={{
        position: 'absolute',
        left: ix(1.1, w), top: iy(0.95, h),
        width: ix(7.8, w), maxHeight: iy(2.4, h),
        fontSize: (32 / 10) * (w / 80), fontWeight: 700,
        color: t.titleColor, textAlign: 'center',
        lineHeight: 1.25, overflow: 'hidden',
      }}>
        {slide.title}
      </div>
      {slide.subtitle && (
        <div style={{
          position: 'absolute',
          left: ix(1.1, w), top: iy(3.35, h),
          width: ix(7.8, w),
          fontSize: (14 / 10) * (w / 80),
          color: t.mutedColor, textAlign: 'center',
          fontStyle: 'italic',
        }}>
          — {slide.subtitle}
        </div>
      )}
      {slide.content.length > 0 && (
        <div style={{
          position: 'absolute',
          left: ix(0.5, w), top: iy(4.1, h),
          width: ix(9.0, w),
          fontSize: (11 / 10) * (w / 80),
          color: t.mutedColor, textAlign: 'center',
        }}>
          {slide.content.slice(0, 3).join('  •  ')}
        </div>
      )}
      <SlideFooter index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── Stats slide ───────────────────────────────────────────────
function StatsSlide({
  slide, index, total, t, w, h,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number;
}) {
  const items   = slide.content.slice(0, 4);
  const cardW   = ix(2.15, w);
  const cardGap = ix(0.12, w);
  return (
    <>
      {/* Header */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%',
        height: iy(0.09, h), background: t.accent2,
      }} />
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(0.18, h),
        width: ix(9.2, w), height: iy(0.76, h),
        fontSize: (26 / 10) * (w / 80), fontWeight: 700,
        color: t.titleColor, display: 'flex', alignItems: 'center',
        overflow: 'hidden',
      }}>{slide.title}</div>
      {slide.subtitle && (
        <div style={{
          position: 'absolute',
          left: ix(0.42, w), top: iy(0.92, h),
          fontSize: (12 / 10) * (w / 80), color: t.mutedColor,
          fontStyle: 'italic', fontWeight: 600,
        }}>{slide.subtitle}</div>
      )}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(1.24, h),
        width: ix(9.2, w), height: iy(0.028, h),
        background: t.accent1, opacity: 0.35,
      }} />
      {/* Stat cards */}
      {items.map((point, i) => {
        const x = ix(0.42, w) + i * (cardW + cardGap);
        const circleSize = ix(0.68, w);
        return (
          <div key={i}>
            {/* Card background */}
            <div style={{
              position: 'absolute',
              left: x, top: iy(1.38, h),
              width: cardW, height: iy(3.85, h),
              background: t.accent1 + '20',
              border: `1px solid ${t.accent1}66`,
              borderRadius: ix(0.14, w),
            }} />
            {/* Number circle */}
            <div style={{
              position: 'absolute',
              left: x + ix(0.73, w), top: iy(1.58, h),
              width: circleSize, height: circleSize,
              borderRadius: '50%',
              background: t.accent2 + '44',
              border: `1px solid ${t.accent2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: (15 / 10) * (w / 80), fontWeight: 700, color: t.titleColor,
            }}>
              {i + 1}
            </div>
            {/* Card text */}
            <div style={{
              position: 'absolute',
              left: x + ix(0.14, w), top: iy(2.4, h),
              width: cardW - ix(0.28, w), maxHeight: iy(2.6, h),
              fontSize: (13 / 10) * (w / 80), color: t.textColor,
              lineHeight: 1.3, overflow: 'hidden',
            }}>
              {point}
            </div>
          </div>
        );
      })}
      <SlideFooter index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────
export function SlideCanvas({
  slide,
  index,
  total,
  ppt,
  slideImage,
  width = 800,
  isCover = false,
  coverImage,
}: SlideCanvasProps) {
  const h = (width / 10) * 5.63; // 16:9 height from 10" width
  const themeKey = (ppt.design_theme ?? 'modern') as DesignTheme;
  const t = THEMES[themeKey] ?? THEMES.modern;
  const bg = index % 2 === 0 ? t.bg : t.bgAlt;

  const layout = useMemo(
    () => (slide.layout_type as LayoutType) ?? 'content',
    [slide.layout_type],
  );

  const innerProps = { slide, index, total, t, w: width, h, slideImage };

  const renderInner = () => {
    if (isCover) {
      return <CoverSlide ppt={ppt} t={t} w={width} h={h} coverImage={coverImage} />;
    }
    switch (layout) {
      case 'two-column':  return <TwoColumnSlide  {...innerProps} />;
      case 'image-focus': return <ImageFocusSlide {...innerProps} />;
      case 'quote':       return <QuoteSlide       {...innerProps} />;
      case 'stats':       return <StatsSlide       index={index} total={total} slide={slide} t={t} w={width} h={h} />;
      case 'title':
      case 'content':
      default:            return <ContentSlide    {...innerProps} />;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: h,
        background: isCover ? t.bg : bg,
        overflow: 'hidden',
        fontFamily: 'Calibri, Inter, system-ui, sans-serif',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {renderInner()}
    </div>
  );
}

export default SlideCanvas;
