// ============================================================
// SlideCanvas.tsx — Premium WYSIWYG slide renderer
// Gamma / Chronicle level visual quality.
//
// Coordinate system: 10" × 5.63" pptx canvas.
//   px = (inches / 10) * containerWidth
//   py = (inches / 5.63) * containerHeight
//
// Layouts: cover, content, two-column, image-focus, quote, stats
// Themes:  modern (dark neon), minimal (editorial light), corporate (navy)
// ============================================================

import { useMemo } from 'react';
import type { GeneratedSlide } from '@/types/database';
import type { GeneratedPPT } from '@/hooks/usePPTGenerator';

type DesignTheme = 'modern' | 'minimal' | 'corporate';
type LayoutType  = 'title' | 'content' | 'two-column' | 'image-focus' | 'quote' | 'stats';

interface ThemeTokens {
  // Backgrounds
  bg:           string;
  bgAlt:        string;
  bgGradient:   string;      // mesh gradient on top of bg
  // Text
  titleColor:   string;
  textColor:    string;
  mutedColor:   string;
  faintColor:   string;
  // Accents
  accent1:      string;      // primary
  accent2:      string;      // secondary / lighter
  accent3:      string;      // tertiary / glow
  accentRgb:    string;      // r,g,b of accent1 for rgba()
  // Glass surface
  glass:        string;
  glassBorder:  string;
  // Noise overlay opacity
  noiseOpacity: number;
  // Fonts
  displayFont:  string;
  bodyFont:     string;
}

const THEMES: Record<DesignTheme, ThemeTokens> = {
  modern: {
    bg:           '#080B14',
    bgAlt:        '#0C0F1E',
    bgGradient:   'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(124,58,237,0.22) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(79,70,229,0.18) 0%, transparent 55%)',
    titleColor:   '#F0ECFF',
    textColor:    '#CBD5E1',
    mutedColor:   '#7C8CA8',
    faintColor:   '#3D4A60',
    accent1:      '#8B5CF6',
    accent2:      '#A78BFA',
    accent3:      '#C4B5FD',
    accentRgb:    '139,92,246',
    glass:        'rgba(255,255,255,0.04)',
    glassBorder:  'rgba(139,92,246,0.25)',
    noiseOpacity: 0.025,
    displayFont:  "'Syne', 'DM Sans', sans-serif",
    bodyFont:     "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  minimal: {
    bg:           '#FAFAFA',
    bgAlt:        '#F4F4F5',
    bgGradient:   'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,165,233,0.07) 0%, transparent 60%)',
    titleColor:   '#09090B',
    textColor:    '#27272A',
    mutedColor:   '#71717A',
    faintColor:   '#D4D4D8',
    accent1:      '#0EA5E9',
    accent2:      '#38BDF8',
    accent3:      '#BAE6FD',
    accentRgb:    '14,165,233',
    glass:        'rgba(0,0,0,0.03)',
    glassBorder:  'rgba(14,165,233,0.20)',
    noiseOpacity: 0.015,
    displayFont:  "'Instrument Serif', 'Georgia', serif",
    bodyFont:     "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  corporate: {
    bg:           '#05101F',
    bgAlt:        '#071528',
    bgGradient:   'radial-gradient(ellipse 90% 60% at 10% 50%, rgba(29,78,216,0.20) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(6,182,212,0.12) 0%, transparent 50%)',
    titleColor:   '#E0EFFF',
    textColor:    '#BFCFE0',
    mutedColor:   '#5B7A9A',
    faintColor:   '#1E3450',
    accent1:      '#1D4ED8',
    accent2:      '#3B82F6',
    accent3:      '#93C5FD',
    accentRgb:    '29,78,216',
    glass:        'rgba(255,255,255,0.04)',
    glassBorder:  'rgba(59,130,246,0.28)',
    noiseOpacity: 0.02,
    displayFont:  "'Syne', 'DM Sans', sans-serif",
    bodyFont:     "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
};

interface SlideCanvasProps {
  slide:       GeneratedSlide;
  index:       number;
  total:       number;
  ppt:         GeneratedPPT & { topic?: string };
  slideImage?: string | null;
  width?:      number;
  isCover?:    boolean;
  coverImage?: string | null;
}

/** inches → px at canvas width (10") */
function ix(inches: number, w: number) { return (inches / 10) * w; }
/** inches → px at canvas height (5.63") */
function iy(inches: number, h: number) { return (inches / 5.63) * h; }
/** font size: (ptSize / 10) * (w / 80) */
function fs(pt: number, w: number) { return (pt / 10) * (w / 80); }

// ── Noise texture overlay (SVG feTurbulence) ──────────────────
function NoiseOverlay({ opacity }: { opacity: number }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}

// ── Slide number pill ─────────────────────────────────────────
function SlideNumber({ index, total, t, w, h }: { index: number; total: number; t: ThemeTokens; w: number; h: number }) {
  return (
    <div style={{
      position:   'absolute',
      right:      ix(0.28, w),
      bottom:     iy(0.16, h),
      display:    'flex', alignItems: 'center', gap: ix(0.06, w),
      fontSize:   fs(8.5, w),
      fontFamily: t.bodyFont,
      color:      t.faintColor,
      letterSpacing: '0.06em',
    }}>
      <span style={{ color: t.mutedColor, fontWeight: 600 }}>{index + 1}</span>
      <span>/{total}</span>
    </div>
  );
}

// ── Gradient accent dot (bullet marker) ──────────────────────
function AccentDot({ t, size }: { t: ThemeTokens; size: number }) {
  return (
    <div style={{
      flexShrink: 0,
      width:      size,
      height:     size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${t.accent2} 0%, ${t.accent1} 100%)`,
      boxShadow:  `0 0 ${size * 1.5}px rgba(${t.accentRgb},0.55)`,
      marginTop:  size * 0.55,
    }}
    />
  );
}

// ── Bullet list — premium version ────────────────────────────
function BulletList({
  items, t, w, fontSize = 15, maxItems = 5, gap = 0.46,
}: { items: string[]; t: ThemeTokens; w: number; fontSize?: number; maxItems?: number; gap?: number }) {
  const dotSize = fs(5, w);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}em` }}>
      {items.slice(0, maxItems).map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: `${fs(8, w)}px`, alignItems: 'flex-start', lineHeight: 1.45 }}>
          <AccentDot t={t} size={dotSize} />
          <span style={{
            color:      t.textColor,
            fontSize:   fs(fontSize, w),
            fontFamily: t.bodyFont,
            fontWeight: 400,
            flex:       1,
          }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── Glass card surface ────────────────────────────────────────
function GlassCard({
  left, top, width, height, t, radius, children, style = {},
}: {
  left: number; top: number; width: number; height: number;
  t: ThemeTokens; radius?: number; children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      position:    'absolute',
      left, top, width, height,
      background:  t.glass,
      border:      `1px solid ${t.glassBorder}`,
      borderRadius: radius ?? 8,
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Section label chip ────────────────────────────────────────
function Chip({
  label, left, top, t, w, h,
}: { label: string; left: number; top: number; t: ThemeTokens; w: number; h: number }) {
  return (
    <div style={{
      position:   'absolute',
      left, top,
      padding:    `${iy(0.06, h)}px ${ix(0.18, w)}px`,
      background: `rgba(${t.accentRgb},0.12)`,
      border:     `1px solid rgba(${t.accentRgb},0.35)`,
      borderRadius: ix(0.5, w),
      fontSize:   fs(7.5, w),
      fontWeight: 700,
      fontFamily: t.bodyFont,
      color:      t.accent2,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    }}>
      {label}
    </div>
  );
}

// ── COVER SLIDE ───────────────────────────────────────────────
function CoverSlide({
  ppt, t, w, h, coverImage,
}: {
  ppt: GeneratedPPT & { topic?: string };
  t: ThemeTokens; w: number; h: number;
  coverImage?: string | null;
}) {
  const hasImg = !!coverImage;
  return (
    <>
      {/* Hero image — right 55% */}
      {hasImg && (
        <>
          <img
            src={coverImage!}
            alt="cover"
            style={{
              position: 'absolute',
              left: ix(4.5, w), top: 0,
              width: ix(5.5, w), height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Gradient feather left edge of image */}
          <div style={{
            position: 'absolute',
            left: ix(4.0, w), top: 0,
            width: ix(2.5, w), height: '100%',
            background: `linear-gradient(to right, ${t.bg} 0%, transparent 100%)`,
          }} />
          {/* Subtle vignette top/bottom on image */}
          <div style={{
            position: 'absolute',
            left: ix(4.5, w), top: 0,
            width: ix(5.5, w), height: '100%',
            background: `linear-gradient(to bottom, ${t.bg}55 0%, transparent 30%, transparent 70%, ${t.bg}55 100%)`,
          }} />
        </>
      )}

      {/* Left half — no image fallback grad */}
      {!hasImg && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: ix(4.5, w), height: '100%',
          background: `linear-gradient(135deg, rgba(${t.accentRgb},0.18) 0%, transparent 60%)`,
        }} />
      )}

      {/* Decorative corner grid lines */}
      <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.06 }}>
        {[0.2, 0.4, 0.6, 0.8].map(x => (
          <line key={x} x1={`${x * 100}%`} y1="0" x2={`${x * 100}%`} y2="100%" stroke={t.accent1} strokeWidth="0.5" />
        ))}
        {[0.25, 0.5, 0.75].map(y => (
          <line key={y} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`} stroke={t.accent1} strokeWidth="0.5" />
        ))}
      </svg>

      {/* Left accent bar — glowing */}
      <div style={{
        position: 'absolute',
        left: ix(0.42, w), top: iy(0.55, h),
        width: ix(0.055, w), height: iy(3.0, h),
        background: `linear-gradient(to bottom, transparent, ${t.accent1}, ${t.accent2}, transparent)`,
        boxShadow: `0 0 ${ix(0.35, w)}px rgba(${t.accentRgb},0.6)`,
        borderRadius: ix(0.1, w),
      }} />

      {/* Topic chip */}
      <Chip
        label={(ppt.topic ?? ppt.title).slice(0, 28).toUpperCase()}
        left={ix(0.65, w)} top={iy(0.55, h)}
        t={t} w={w} h={h}
      />

      {/* Main title */}
      <div style={{
        position:   'absolute',
        left:       ix(0.65, w),
        top:        iy(1.05, h),
        width:      ix(hasImg ? 4.2 : 7.5, w),
        maxHeight:  iy(2.55, h),
        fontSize:   fs(38, w),
        fontWeight: 700,
        fontFamily: t.displayFont,
        color:      t.titleColor,
        lineHeight: 1.12,
        letterSpacing: '-0.01em',
        overflow:   'hidden',
      }}>
        {ppt.title}
      </div>

      {/* Divider */}
      <div style={{
        position: 'absolute',
        left: ix(0.65, w), top: iy(3.68, h),
        width: ix(3.8, w), height: iy(0.028, h),
        background: `linear-gradient(to right, ${t.accent1}, transparent)`,
      }} />

      {/* Byline row */}
      <div style={{
        position:   'absolute',
        left:       ix(0.65, w),
        top:        iy(3.86, h),
        fontSize:   fs(10, w),
        fontFamily: t.bodyFont,
        color:      t.mutedColor,
        display:    'flex', alignItems: 'center', gap: ix(0.2, w),
      }}>
        <span style={{
          display: 'inline-block',
          width: ix(0.12, w), height: ix(0.12, w),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${t.accent2}, ${t.accent1})`,
          boxShadow: `0 0 ${ix(0.18, w)}px rgba(${t.accentRgb},0.7)`,
          flexShrink: 0,
        }} />
        Aura Study · AI-Powered Learning
      </div>

      {/* Slide count badge */}
      <div style={{
        position:   'absolute',
        left:       ix(0.65, w),
        top:        iy(4.45, h),
        padding:    `${iy(0.07, h)}px ${ix(0.22, w)}px`,
        background: `rgba(${t.accentRgb},0.10)`,
        border:     `1px solid rgba(${t.accentRgb},0.30)`,
        borderRadius: ix(0.5, w),
        fontSize:   fs(9, w),
        fontWeight: 700,
        fontFamily: t.bodyFont,
        color:      t.accent3,
        letterSpacing: '0.04em',
      }}>
        {ppt.slides.length} SLIDES
      </div>
    </>
  );
}

// ── CONTENT SLIDE ─────────────────────────────────────────────
function ContentSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  const hasImg = !!slideImage;
  const contentW = hasImg ? ix(5.3, w) : ix(8.9, w);

  return (
    <>
      {/* Title area glass card */}
      <GlassCard
        left={ix(0.38, w)} top={iy(0.22, h)}
        width={ix(9.24, w)} height={iy(1.12, h)}
        t={t} radius={ix(0.1, w)}
        style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${ix(0.35, w)}px`,
          borderLeft: `${ix(0.055, w)}px solid ${t.accent1}`,
          boxShadow: `inset ${ix(0.055, w)}px 0 ${ix(0.3, w)}px rgba(${t.accentRgb},0.3)`,
        }}
      >
        <div style={{
          fontSize:   fs(26, w),
          fontWeight: 700,
          fontFamily: t.displayFont,
          color:      t.titleColor,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}>
          {slide.title}
        </div>
        {slide.subtitle && (
          <div style={{
            fontSize:   fs(11, w),
            fontFamily: t.bodyFont,
            color:      t.mutedColor,
            fontWeight: 500,
            marginTop:  iy(0.05, h),
            fontStyle:  'italic',
          }}>
            {slide.subtitle}
          </div>
        )}
      </GlassCard>

      {/* Glowing divider line */}
      <div style={{
        position: 'absolute',
        left: ix(0.38, w), top: iy(1.46, h),
        width: ix(9.24, w), height: 1,
        background: `linear-gradient(to right, ${t.accent1}, rgba(${t.accentRgb},0.15), transparent)`,
      }} />

      {/* Bullet content card */}
      <GlassCard
        left={ix(0.38, w)} top={iy(1.56, h)}
        width={contentW} height={iy(3.65, h)}
        t={t} radius={ix(0.1, w)}
        style={{ padding: `${iy(0.28, h)}px ${ix(0.32, w)}px` }}
      >
        <BulletList
          items={slide.content} t={t} w={w}
          fontSize={15} maxItems={5}
        />
      </GlassCard>

      {/* Image — right side */}
      {hasImg && (
        <div style={{
          position: 'absolute',
          left: ix(5.88, w), top: iy(1.56, h),
          width: ix(3.74, w), height: iy(3.65, h),
          borderRadius: ix(0.1, w),
          overflow: 'hidden',
          border: `1px solid rgba(${t.accentRgb},0.2)`,
          boxShadow: `0 0 ${ix(0.6, w)}px rgba(${t.accentRgb},0.12)`,
        }}>
          <img
            src={slideImage!} alt={slide.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Soft overlay to blend with theme */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to bottom right, rgba(${t.accentRgb},0.18) 0%, transparent 50%)`,
          }} />
        </div>
      )}

      <SlideNumber index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── TWO-COLUMN SLIDE ──────────────────────────────────────────
function TwoColumnSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  const half       = Math.ceil(slide.content.length / 2);
  const leftItems  = slide.content.slice(0, half);
  const rightItems = slide.content.slice(half);
  const COL_W      = ix(4.48, w);
  const COL_GAP    = ix(0.24, w);
  const COL2_LEFT  = ix(0.38, w) + COL_W + COL_GAP;

  return (
    <>
      {/* Title */}
      <div style={{
        position:   'absolute',
        left:       ix(0.38, w), top: iy(0.2, h),
        width:      ix(9.24, w), height: iy(0.96, h),
        fontSize:   fs(24, w),
        fontWeight: 700,
        fontFamily: t.displayFont,
        color:      t.titleColor,
        display:    'flex', alignItems: 'center',
        letterSpacing: '-0.01em',
      }}>
        {slide.title}
      </div>

      {slide.subtitle && (
        <div style={{
          position:   'absolute',
          left:       ix(0.38, w), top: iy(1.12, h),
          fontSize:   fs(10.5, w),
          fontFamily: t.bodyFont,
          color:      t.mutedColor,
          fontStyle:  'italic',
        }}>{slide.subtitle}</div>
      )}

      {/* Divider */}
      <div style={{
        position: 'absolute',
        left: ix(0.38, w), top: iy(1.35, h),
        width: ix(9.24, w), height: 1,
        background: `linear-gradient(to right, ${t.accent1}, rgba(${t.accentRgb},0.1), transparent)`,
      }} />

      {/* Left column card */}
      <GlassCard
        left={ix(0.38, w)} top={iy(1.46, h)}
        width={COL_W} height={iy(3.75, h)}
        t={t} radius={ix(0.1, w)}
        style={{ padding: `${iy(0.24, h)}px ${ix(0.28, w)}px` }}
      >
        <Chip label="Key Points" left={0} top={0} t={t} w={w} h={h} />
        <div style={{ marginTop: iy(0.46, h) }}>
          <BulletList items={leftItems} t={t} w={w} fontSize={13.5} maxItems={4} gap={0.42} />
        </div>
      </GlassCard>

      {/* Right column — image or second bullet card */}
      {slideImage ? (
        <div style={{
          position: 'absolute',
          left: COL2_LEFT, top: iy(1.46, h),
          width: COL_W, height: iy(3.75, h),
          borderRadius: ix(0.1, w),
          overflow: 'hidden',
          border: `1px solid rgba(${t.accentRgb},0.22)`,
          boxShadow: `0 0 ${ix(0.5, w)}px rgba(${t.accentRgb},0.12)`,
        }}>
          <img src={slideImage} alt={slide.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(160deg, rgba(${t.accentRgb},0.20) 0%, transparent 60%)`,
          }} />
        </div>
      ) : (
        <GlassCard
          left={COL2_LEFT} top={iy(1.46, h)}
          width={COL_W} height={iy(3.75, h)}
          t={t} radius={ix(0.1, w)}
          style={{ padding: `${iy(0.24, h)}px ${ix(0.28, w)}px` }}
        >
          <Chip label="Details" left={0} top={0} t={t} w={w} h={h} />
          <div style={{ marginTop: iy(0.46, h) }}>
            <BulletList items={rightItems} t={t} w={w} fontSize={13.5} maxItems={4} gap={0.42} />
          </div>
        </GlassCard>
      )}

      <SlideNumber index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── IMAGE-FOCUS SLIDE ─────────────────────────────────────────
function ImageFocusSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  return (
    <>
      {/* Full-bleed background image */}
      {slideImage && (
        <>
          <img
            src={slideImage} alt={slide.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Gradient overlay — strong on left for text legibility */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, ${t.bg}F2 0%, ${t.bg}CC 38%, ${t.bg}44 65%, transparent 100%)`,
          }} />
          {/* Bottom vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top, ${t.bg}88 0%, transparent 40%)`,
          }} />
        </>
      )}

      {/* Accent glow bar left edge */}
      <div style={{
        position: 'absolute',
        left: ix(0.38, w), top: iy(0.5, h),
        width: ix(0.055, w), height: iy(4.5, h),
        background: `linear-gradient(to bottom, transparent, ${t.accent1}, ${t.accent2}, transparent)`,
        boxShadow: `0 0 ${ix(0.3, w)}px rgba(${t.accentRgb},0.6)`,
        borderRadius: ix(0.1, w),
      }} />

      {/* Title */}
      <div style={{
        position:   'absolute',
        left:       ix(0.62, w), top: iy(0.5, h),
        width:      slideImage ? ix(5.5, w) : ix(9.0, w),
        fontSize:   fs(28, w),
        fontWeight: 700,
        fontFamily: t.displayFont,
        color:      t.titleColor,
        lineHeight: 1.15,
        letterSpacing: '-0.01em',
      }}>
        {slide.title}
      </div>

      {slide.subtitle && (
        <div style={{
          position:   'absolute',
          left:       ix(0.62, w), top: iy(1.4, h),
          width:      ix(5.2, w),
          fontSize:   fs(11, w),
          fontFamily: t.bodyFont,
          color:      t.mutedColor,
          fontStyle:  'italic',
        }}>{slide.subtitle}</div>
      )}

      {/* Content card — bottom left */}
      <GlassCard
        left={ix(0.38, w)} top={iy(1.72, h)}
        width={ix(5.4, w)} height={iy(3.4, h)}
        t={t} radius={ix(0.1, w)}
        style={{ padding: `${iy(0.26, h)}px ${ix(0.3, w)}px` }}
      >
        <BulletList items={slide.content} t={t} w={w} fontSize={14} maxItems={5} />
      </GlassCard>

      {!slideImage && (
        <div style={{
          position: 'absolute',
          right: ix(0.38, w), top: iy(0.22, h),
          width: ix(3.5, w), height: iy(4.9, h),
          borderRadius: ix(0.12, w),
          background: `rgba(${t.accentRgb},0.06)`,
          border: `1px solid rgba(${t.accentRgb},0.18)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: iy(0.3, h),
        }}>
          <div style={{
            width: ix(1.2, w), height: ix(1.2, w),
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${t.accentRgb},0.35) 0%, transparent 70%)`,
            border: `1px solid rgba(${t.accentRgb},0.4)`,
          }} />
          <span style={{ fontSize: fs(11, w), color: t.mutedColor, fontFamily: t.bodyFont }}>
            {slide.visual_suggestion ?? 'Visual'}
          </span>
        </div>
      )}

      <SlideNumber index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── QUOTE SLIDE ───────────────────────────────────────────────
function QuoteSlide({
  slide, index, total, t, w, h, slideImage,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number; slideImage?: string | null;
}) {
  return (
    <>
      {/* Background */}
      {slideImage ? (
        <>
          <img
            src={slideImage} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${t.bg}E8 0%, ${t.bg}B0 60%, ${t.bg}55 100%)`,
          }} />
        </>
      ) : (
        <>
          {/* Radial glow centers */}
          <div style={{
            position: 'absolute',
            left: ix(-0.5, w), top: iy(-0.5, h),
            width: ix(5, w), height: iy(4, h),
            background: `radial-gradient(ellipse, rgba(${t.accentRgb},0.28) 0%, transparent 70%)`,
          }} />
          <div style={{
            position: 'absolute',
            right: ix(-0.5, w), bottom: iy(-0.5, h),
            width: ix(4, w), height: iy(3.5, h),
            background: `radial-gradient(ellipse, rgba(${t.accentRgb},0.18) 0%, transparent 70%)`,
          }} />
        </>
      )}

      {/* Giant decorative quote mark */}
      <div style={{
        position:   'absolute',
        left:       ix(0.3, w), top: iy(-0.05, h),
        fontSize:   fs(160, w),
        fontFamily: t.displayFont,
        fontWeight: 700,
        color:      t.accent1,
        opacity:    0.12,
        lineHeight: 1,
        userSelect: 'none',
      }}>“</div>

      {/* Quote text — large centered */}
      <div style={{
        position:   'absolute',
        left:       ix(0.9, w), top: iy(0.85, h),
        width:      ix(8.2, w), maxHeight: iy(2.6, h),
        fontSize:   fs(30, w),
        fontWeight: 700,
        fontFamily: t.displayFont,
        color:      t.titleColor,
        textAlign:  'center',
        lineHeight: 1.25,
        letterSpacing: '-0.01em',
        overflow:   'hidden',
      }}>
        {slide.title}
      </div>

      {/* Attribution line */}
      {slide.subtitle && (
        <>
          {/* Short decorative dash */}
          <div style={{
            position: 'absolute',
            left: '50%', transform: 'translateX(-50%)',
            top: iy(3.58, h),
            width: ix(0.55, w), height: 1,
            background: t.accent1,
          }} />
          <div style={{
            position:   'absolute',
            left:       ix(0.9, w), top: iy(3.75, h),
            width:      ix(8.2, w),
            fontSize:   fs(12, w),
            fontFamily: t.bodyFont,
            color:      t.accent2,
            textAlign:  'center',
            fontStyle:  'italic',
            fontWeight: 500,
          }}>
            — {slide.subtitle}
          </div>
        </>
      )}

      {/* Content tags at bottom */}
      {slide.content.length > 0 && (
        <div style={{
          position: 'absolute',
          left: ix(0.9, w), top: iy(4.3, h),
          width: ix(8.2, w),
          display: 'flex', justifyContent: 'center',
          gap: ix(0.18, w), flexWrap: 'wrap',
        }}>
          {slide.content.slice(0, 4).map((tag, i) => (
            <span key={i} style={{
              padding:    `${iy(0.04, h)}px ${ix(0.18, w)}px`,
              background: `rgba(${t.accentRgb},0.10)`,
              border:     `1px solid rgba(${t.accentRgb},0.25)`,
              borderRadius: ix(0.5, w),
              fontSize:   fs(9, w),
              fontFamily: t.bodyFont,
              color:      t.mutedColor,
            }}>{tag}</span>
          ))}
        </div>
      )}

      <SlideNumber index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── STATS SLIDE ───────────────────────────────────────────────
function StatsSlide({
  slide, index, total, t, w, h,
}: {
  slide: GeneratedSlide; index: number; total: number;
  t: ThemeTokens; w: number; h: number;
}) {
  const items   = slide.content.slice(0, 4);
  const count   = items.length || 1;
  const gap     = ix(0.18, w);
  const totalGap = gap * (count - 1);
  const cardW   = (ix(9.24, w) - totalGap) / count;
  const startX  = ix(0.38, w);

  return (
    <>
      {/* Title */}
      <div style={{
        position:   'absolute',
        left:       ix(0.38, w), top: iy(0.2, h),
        width:      ix(9.24, w), height: iy(0.9, h),
        fontSize:   fs(24, w),
        fontWeight: 700,
        fontFamily: t.displayFont,
        color:      t.titleColor,
        display:    'flex', alignItems: 'center',
        letterSpacing: '-0.01em',
      }}>
        {slide.title}
      </div>

      {slide.subtitle && (
        <div style={{
          position:   'absolute',
          left:       ix(0.38, w), top: iy(1.1, h),
          fontSize:   fs(10.5, w),
          fontFamily: t.bodyFont,
          color:      t.mutedColor,
          fontStyle:  'italic',
        }}>{slide.subtitle}</div>
      )}

      {/* Divider */}
      <div style={{
        position: 'absolute',
        left: ix(0.38, w), top: iy(1.32, h),
        width: ix(9.24, w), height: 1,
        background: `linear-gradient(to right, ${t.accent1}, rgba(${t.accentRgb},0.1), transparent)`,
      }} />

      {/* Stat cards */}
      {items.map((point, i) => {
        const x = startX + i * (cardW + gap);
        // Try to extract a leading number/stat from the point text
        const numMatch = point.match(/^(\d[\d.,kKmMbB%+×x\-]*)/i);
        const statNum  = numMatch ? numMatch[1] : String(i + 1);
        const statText = numMatch ? point.slice(numMatch[0].length).trim().replace(/^[:\-–]\s*/, '') : point;

        return (
          <GlassCard
            key={i}
            left={x} top={iy(1.44, h)}
            width={cardW} height={iy(3.76, h)}
            t={t} radius={ix(0.1, w)}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', left: 0, top: 0,
              width: '100%', height: ix(0.045, w),
              background: `linear-gradient(to right, ${t.accent1}, ${t.accent2})`,
              borderRadius: `${ix(0.1, w)}px ${ix(0.1, w)}px 0 0`,
              boxShadow: `0 0 ${ix(0.25, w)}px rgba(${t.accentRgb},0.55)`,
            }} />

            {/* Large stat number */}
            <div style={{
              position:   'absolute',
              left:       ix(0.14, w), top: iy(0.18, h),
              width:      cardW - ix(0.28, w),
              fontSize:   fs(38, w),
              fontWeight: 800,
              fontFamily: t.displayFont,
              color:      t.accent2,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {statNum}
            </div>

            {/* Description text */}
            <div style={{
              position:   'absolute',
              left:       ix(0.14, w), top: iy(1.38, h),
              width:      cardW - ix(0.28, w),
              maxHeight:  iy(2.1, h),
              fontSize:   fs(12.5, w),
              fontFamily: t.bodyFont,
              color:      t.textColor,
              lineHeight: 1.35,
              overflow:   'hidden',
            }}>
              {statText || point}
            </div>
          </GlassCard>
        );
      })}

      <SlideNumber index={index} total={total} t={t} w={w} h={h} />
    </>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
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
  const h         = (width / 10) * 5.63;
  const themeKey  = (ppt.design_theme ?? 'modern') as DesignTheme;
  const t         = THEMES[themeKey] ?? THEMES.modern;
  const bg        = index % 2 === 0 ? t.bg : t.bgAlt;

  const layout = useMemo(
    () => (slide?.layout_type as LayoutType) ?? 'content',
    [slide?.layout_type],
  );

  const inner = () => {
    if (isCover) return <CoverSlide ppt={ppt} t={t} w={width} h={h} coverImage={coverImage} />;
    const p = { slide, index, total, t, w: width, h, slideImage };
    switch (layout) {
      case 'two-column':  return <TwoColumnSlide  {...p} />;
      case 'image-focus': return <ImageFocusSlide {...p} />;
      case 'quote':       return <QuoteSlide       {...p} />;
      case 'stats':       return <StatsSlide       slide={slide} index={index} total={total} t={t} w={width} h={h} />;
      default:            return <ContentSlide    {...p} />;
    }
  };

  return (
    <div
      style={{
        position:   'relative',
        width,
        height:     h,
        background: isCover ? t.bg : bg,
        overflow:   'hidden',
        fontFamily: t.bodyFont,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Mesh gradient background */}
      <div style={{
        position:   'absolute', inset: 0,
        background: t.bgGradient,
        pointerEvents: 'none',
      }} />

      {/* Film grain texture */}
      <NoiseOverlay opacity={t.noiseOpacity} />

      {/* Slide content */}
      {inner()}
    </div>
  );
}

export default SlideCanvas;
