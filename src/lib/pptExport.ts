// ============================================================
// pptExport.ts — Gamma-level PPTX export
// Uses pptxgenjs loaded from CDN (not bundled — avoids Vite chunk issues)
// Layout-aware rendering: 6 distinct slide templates
// ============================================================

import type { GeneratedPPT } from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';

type DesignTheme = 'modern' | 'minimal' | 'corporate';
type LayoutType = 'title' | 'content' | 'two-column' | 'image-focus' | 'quote' | 'stats';

interface ThemeConfig {
  // Backgrounds
  bg:         string;
  bgAlt:      string;   // alternate slide bg for visual variety
  // Text
  titleColor: string;
  textColor:  string;
  mutedColor: string;
  // Accents
  accent1:    string;
  accent2:    string;
  accent3:    string;
  // Typography
  fontTitle:  string;
  fontBody:   string;
}

const THEMES: Record<DesignTheme, ThemeConfig> = {
  // ── Modern (dark purple, vivid) ──────────────────────────────
  modern: {
    bg:         '0D0D1A',
    bgAlt:      '12122A',
    titleColor: 'C4B5FD',  // violet-300
    textColor:  'E2E8F0',
    mutedColor: '94A3B8',
    accent1:    '7C3AED',  // violet-600
    accent2:    'A855F7',  // purple-500
    accent3:    '4F46E5',  // indigo-600
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
  // ── Minimal (white, clean) ───────────────────────────────────
  minimal: {
    bg:         'FFFFFF',
    bgAlt:      'F8FAFC',
    titleColor: '0F172A',  // slate-900
    textColor:  '1E293B',  // slate-800
    mutedColor: '64748B',  // slate-500
    accent1:    '0EA5E9',  // sky-500
    accent2:    '0284C7',  // sky-600
    accent3:    '7DD3FC',  // sky-300
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
  // ── Corporate (navy, professional) ──────────────────────────
  corporate: {
    bg:         'F0F4F8',
    bgAlt:      'FFFFFF',
    titleColor: '0C2340',  // deep navy
    textColor:  '1E3A5F',
    mutedColor: '64748B',
    accent1:    '1D4ED8',  // blue-700
    accent2:    '2563EB',  // blue-600
    accent3:    '93C5FD',  // blue-300
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
};

// Visual suggestion → human-readable label for placeholder cards
const VISUAL_LABELS: Record<string, string> = {
  'bar-chart':        '📊  Bar Chart',
  'line-chart':       '📈  Line Chart',
  'pie-chart':        '🥧  Pie Chart',
  'timeline':         '🕐  Timeline',
  'image-placeholder':'🖼️  Image',
  'icon-grid':        '🔲  Icon Grid',
  'two-column-table': '📋  Table',
  'quote-callout':    '💬  Quote',
  'stat-highlight':   '💯  Statistics',
  'diagram':          '🔷  Diagram',
};

// ── CDN loader ────────────────────────────────────────────────
const CDN_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/libs/pptxgen.bundle.js';
let loadPromise: Promise<void> | null = null;

function loadPptxGenJS(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (typeof (window as any).PptxGenJS !== 'undefined') {
    loadPromise = Promise.resolve();
    return loadPromise;
  }
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN_URL;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pptxgenjs from CDN.'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

// ── Helper: alpha hex ─────────────────────────────────────────
function alpha(hex: string, percent: number): string {
  // Returns transparency value for pptxgenjs (0 = opaque, 100 = invisible)
  return hex; // colour is passed separately; transparency param used inline
}

// ── Slide renderers ───────────────────────────────────────────

function renderCoverSlide(pres: any, ppt: GeneratedPPT & { topic?: string }, t: ThemeConfig) {
  const s = pres.addSlide();
  s.background = { color: t.bg };

  // Full-width gradient band — top portion
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 3.6,
    fill: { color: t.accent1, transparency: 15 },
    line: { color: t.accent1, transparency: 15 },
  });

  // Decorative right rectangle
  s.addShape(pres.ShapeType.rect, {
    x: 7.8, y: 0, w: 2.2, h: 5.63,
    fill: { color: t.accent2, transparency: 35 },
    line: { color: t.accent2, transparency: 35 },
  });

  // Small accent bar top-left
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 0.35, w: 0.08, h: 2.6,
    fill: { color: t.accent3, transparency: 0 },
    line: { color: t.accent3, transparency: 0 },
  });

  // Main title
  s.addText(ppt.title, {
    x: 0.7, y: 0.5, w: 6.8, h: 2.4,
    fontSize: 34,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'left',
    valign: 'middle',
    breakLine: true,
    wrap: true,
  });

  // Subtitle line
  const topic = ppt.topic ?? ppt.title;
  s.addText(topic.toLowerCase(), {
    x: 0.7, y: 3.1, w: 6.8, h: 0.5,
    fontSize: 14,
    color: t.mutedColor,
    fontFace: t.fontBody,
    align: 'left',
    italic: true,
  });

  // Horizontal divider
  s.addShape(pres.ShapeType.rect, {
    x: 0.7, y: 3.7, w: 5.0, h: 0.04,
    fill: { color: t.accent1, transparency: 40 },
    line: { color: t.accent1, transparency: 40 },
  });

  // Footer tag
  s.addText('Generated by Aura Study  ·  AI-Powered Learning', {
    x: 0.7, y: 4.1, w: 6.8, h: 0.35,
    fontSize: 10,
    color: t.mutedColor,
    fontFace: t.fontBody,
    align: 'left',
  });

  // Slide count chip
  s.addShape(pres.ShapeType.roundRect, {
    x: 7.5, y: 4.9, w: 1.5, h: 0.35,
    rectRadius: 0.1,
    fill: { color: t.accent1, transparency: 25 },
    line: { color: t.accent1, transparency: 0 },
  });
  s.addText(`${ppt.slides.length} Slides`, {
    x: 7.5, y: 4.9, w: 1.5, h: 0.35,
    fontSize: 10,
    color: t.titleColor,
    fontFace: t.fontBody,
    align: 'center',
    bold: true,
  });
}

function renderContentSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  s.background = { color: idx % 2 === 0 ? t.bg : t.bgAlt };

  // Top accent bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: t.accent1 },
    line: { color: t.accent1 },
  });

  // Left accent pillar
  s.addShape(pres.ShapeType.rect, {
    x: 0.38, y: 0.25, w: 0.06, h: 0.8,
    fill: { color: t.accent2 },
    line: { color: t.accent2 },
  });

  // Title
  s.addText(slide.title, {
    x: 0.55, y: 0.22, w: 8.4, h: 0.85,
    fontSize: 24,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'left',
    valign: 'middle',
  });

  // Subtitle
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.55, y: 1.05, w: 8.4, h: 0.38,
      fontSize: 12,
      color: t.mutedColor,
      fontFace: t.fontBody,
      italic: true,
      align: 'left',
    });
  }

  // Divider
  s.addShape(pres.ShapeType.rect, {
    x: 0.55, y: 1.42, w: 8.9, h: 0.025,
    fill: { color: t.accent1, transparency: 70 },
    line: { color: t.accent1, transparency: 70 },
  });

  // Bullet points with custom marker
  const bullets = slide.content.map((point: string) => ({
    text: point,
    options: {
      bullet: { code: '25AA' }, // filled square bullet ▪
      fontSize: 14,
      color: t.textColor,
      fontFace: t.fontBody,
      paraSpaceBefore: 4,
      paraSpaceAfter: 4,
      indentLevel: 0,
    },
  }));

  if (bullets.length) {
    const bulletH = Math.min(bullets.length * 0.62 + 0.15, 3.4);
    s.addText(bullets, {
      x: 0.55,
      y: 1.52,
      w: 8.9,
      h: bulletH,
      valign: 'top',
    });
  }

  addSlideFooter(s, slide, idx, total, t);
}

function renderTwoColumnSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  s.background = { color: t.bg };

  // Top accent bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: t.accent2 },
    line: { color: t.accent2 },
  });

  // Title (full width)
  s.addText(slide.title, {
    x: 0.4, y: 0.18, w: 9.2, h: 0.72,
    fontSize: 22,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'left',
    valign: 'middle',
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.4, y: 0.88, w: 9.2, h: 0.35,
      fontSize: 11,
      color: t.mutedColor,
      fontFace: t.fontBody,
      italic: true,
    });
  }

  // Divider
  s.addShape(pres.ShapeType.rect, {
    x: 0.4, y: 1.22, w: 9.2, h: 0.025,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });

  // Split content into two columns
  const half = Math.ceil(slide.content.length / 2);
  const leftBullets  = slide.content.slice(0, half);
  const rightBullets = slide.content.slice(half);

  // Column divider
  s.addShape(pres.ShapeType.rect, {
    x: 5.0, y: 1.3, w: 0.025, h: 3.6,
    fill: { color: t.accent1, transparency: 75 },
    line: { color: t.accent1, transparency: 75 },
  });

  // Left column header
  s.addShape(pres.ShapeType.rect, {
    x: 0.4, y: 1.3, w: 1.2, h: 0.3,
    fill: { color: t.accent1, transparency: 20 },
    line: { color: t.accent1, transparency: 20 },
  });
  s.addText('KEY POINTS', {
    x: 0.4, y: 1.3, w: 1.2, h: 0.3,
    fontSize: 8,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'center',
  });

  // Right column header
  s.addShape(pres.ShapeType.rect, {
    x: 5.15, y: 1.3, w: 1.2, h: 0.3,
    fill: { color: t.accent2, transparency: 20 },
    line: { color: t.accent2, transparency: 20 },
  });
  s.addText('DETAILS', {
    x: 5.15, y: 1.3, w: 1.2, h: 0.3,
    fontSize: 8,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'center',
  });

  const renderBullets = (items: string[], x: number, w: number) =>
    items.map(item => ({
      text: item,
      options: {
        bullet: { code: '25BA' }, // right arrow ▶
        fontSize: 13,
        color: t.textColor,
        fontFace: t.fontBody,
        paraSpaceAfter: 6,
      },
    }));

  if (leftBullets.length) {
    s.addText(renderBullets(leftBullets, 0.4, 4.4), {
      x: 0.4, y: 1.65, w: 4.4, h: 3.1, valign: 'top',
    });
  }
  if (rightBullets.length) {
    s.addText(renderBullets(rightBullets, 5.15, 4.4), {
      x: 5.15, y: 1.65, w: 4.4, h: 3.1, valign: 'top',
    });
  }

  addSlideFooter(s, slide, idx, total, t);
}

function renderImageFocusSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  s.background = { color: t.bg };

  // Top bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: t.accent1 },
    line: { color: t.accent1 },
  });

  // Title
  s.addText(slide.title, {
    x: 0.4, y: 0.18, w: 5.4, h: 0.72,
    fontSize: 22,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'left',
    valign: 'middle',
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.4, y: 0.88, w: 5.4, h: 0.35,
      fontSize: 11,
      color: t.mutedColor,
      fontFace: t.fontBody,
      italic: true,
    });
  }

  // Divider
  s.addShape(pres.ShapeType.rect, {
    x: 0.4, y: 1.22, w: 5.4, h: 0.025,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });

  // Left: top 3 bullets
  const leftItems = slide.content.slice(0, 3);
  const leftBullets = leftItems.map(item => ({
    text: item,
    options: {
      bullet: { code: '25AA' },
      fontSize: 13,
      color: t.textColor,
      fontFace: t.fontBody,
      paraSpaceAfter: 8,
    },
  }));
  if (leftBullets.length) {
    s.addText(leftBullets, { x: 0.4, y: 1.32, w: 5.3, h: 3.3, valign: 'top' });
  }

  // Right: styled visual placeholder card
  const label = VISUAL_LABELS[slide.visual_suggestion ?? ''] ?? '🖼️  Visual';

  // Card background
  s.addShape(pres.ShapeType.roundRect, {
    x: 6.0, y: 0.25, w: 3.7, h: 4.8,
    rectRadius: 0.15,
    fill: { color: t.accent1, transparency: 82 },
    line: { color: t.accent1, transparency: 40 },
  });

  // Icon area
  s.addShape(pres.ShapeType.ellipse, {
    x: 7.0, y: 0.85, w: 1.7, h: 1.7,
    fill: { color: t.accent2, transparency: 55 },
    line: { color: t.accent2, transparency: 30 },
  });

  // Visual label
  s.addText(label, {
    x: 6.1, y: 2.75, w: 3.5, h: 0.5,
    fontSize: 13,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'center',
  });

  if (slide.visual_suggestion) {
    s.addText(slide.visual_suggestion.replace(/-/g, ' ').toUpperCase(), {
      x: 6.1, y: 3.3, w: 3.5, h: 0.4,
      fontSize: 9,
      color: t.mutedColor,
      fontFace: t.fontBody,
      align: 'center',
    });
  }

  // Remaining bullets below if any
  const remaining = slide.content.slice(3);
  if (remaining.length) {
    const remainBullets = remaining.map(item => ({
      text: item,
      options: {
        bullet: { code: '25AA' },
        fontSize: 12,
        color: t.mutedColor,
        fontFace: t.fontBody,
        paraSpaceAfter: 4,
      },
    }));
    s.addText(remainBullets, { x: 0.4, y: 4.6, w: 5.3, h: 0.7, valign: 'top' });
  }

  addSlideFooter(s, slide, idx, total, t);
}

function renderQuoteSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  // Full accent background
  s.background = { color: t.accent1 };

  // Decorative corner block
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 1.5, h: 1.5,
    fill: { color: t.accent2, transparency: 55 },
    line: { color: t.accent2, transparency: 55 },
  });
  s.addShape(pres.ShapeType.rect, {
    x: 8.5, y: 4.13, w: 1.5, h: 1.5,
    fill: { color: t.accent2, transparency: 55 },
    line: { color: t.accent2, transparency: 55 },
  });

  // Large quote mark
  s.addText('\u201C', {
    x: 0.5, y: 0.3, w: 1.5, h: 1.2,
    fontSize: 72,
    color: t.titleColor,
    fontFace: t.fontTitle,
    bold: true,
    transparency: 40,
  });

  // Title as the main quote
  s.addText(slide.title, {
    x: 1.2, y: 1.0, w: 7.6, h: 2.2,
    fontSize: 26,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'center',
    valign: 'middle',
    breakLine: true,
    wrap: true,
  });

  // Attribution / subtitle
  if (slide.subtitle) {
    s.addText(`— ${slide.subtitle}`, {
      x: 1.2, y: 3.2, w: 7.6, h: 0.45,
      fontSize: 13,
      color: t.mutedColor,
      fontFace: t.fontBody,
      italic: true,
      align: 'center',
    });
  }

  // Supporting points at the bottom
  if (slide.content.length) {
    const points = slide.content.slice(0, 3).join('  •  ');
    s.addText(points, {
      x: 0.5, y: 4.0, w: 9.0, h: 0.55,
      fontSize: 10,
      color: t.mutedColor,
      fontFace: t.fontBody,
      align: 'center',
    });
  }

  // Slide number
  s.addText(`${idx + 1} / ${total}`, {
    x: 8.8, y: 5.15, w: 0.8, h: 0.25,
    fontSize: 8,
    color: t.mutedColor,
    fontFace: t.fontBody,
    align: 'right',
  });
}

function renderStatsSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  s.background = { color: t.bgAlt };

  // Top accent
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: t.accent2 },
    line: { color: t.accent2 },
  });

  // Title
  s.addText(slide.title, {
    x: 0.4, y: 0.18, w: 9.2, h: 0.72,
    fontSize: 22,
    bold: true,
    color: t.titleColor,
    fontFace: t.fontTitle,
    align: 'left',
    valign: 'middle',
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.4, y: 0.88, w: 9.2, h: 0.32,
      fontSize: 11,
      color: t.mutedColor,
      fontFace: t.fontBody,
      italic: true,
    });
  }

  s.addShape(pres.ShapeType.rect, {
    x: 0.4, y: 1.18, w: 9.2, h: 0.025,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });

  // Render stat cards — one per bullet point (max 4)
  const items = slide.content.slice(0, 4);
  const cardW = 2.05;
  const cardGap = 0.1;
  const startX = 0.4;
  const cardY = 1.35;

  items.forEach((point, i) => {
    const x = startX + i * (cardW + cardGap);

    // Card background
    s.addShape(pres.ShapeType.roundRect, {
      x, y: cardY, w: cardW, h: 3.8,
      rectRadius: 0.12,
      fill: { color: t.accent1, transparency: 88 },
      line: { color: t.accent1, transparency: 50 },
    });

    // Card number
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.7, y: cardY + 0.2, w: 0.65, h: 0.65,
      fill: { color: t.accent2, transparency: 30 },
      line: { color: t.accent2, transparency: 0 },
    });
    s.addText(String(i + 1), {
      x: x + 0.7, y: cardY + 0.2, w: 0.65, h: 0.65,
      fontSize: 14,
      bold: true,
      color: t.titleColor,
      fontFace: t.fontTitle,
      align: 'center',
      valign: 'middle',
    });

    // Card text
    s.addText(point, {
      x: x + 0.12, y: cardY + 1.0, w: cardW - 0.24, h: 2.65,
      fontSize: 12,
      color: t.textColor,
      fontFace: t.fontBody,
      align: 'left',
      valign: 'top',
      wrap: true,
      breakLine: true,
    });
  });

  addSlideFooter(s, slide, idx, total, t);
}

// ── Common footer helper ──────────────────────────────────────
function addSlideFooter(
  s: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  // Bottom accent strip
  s.addShape(s.pres?.ShapeType?.rect ?? undefined, {
    x: 0, y: 5.45, w: '100%', h: 0.18,
    fill: { color: t.accent1, transparency: 88 },
    line: { color: t.accent1, transparency: 88 },
  });

  // Slide number
  s.addText(`${idx + 1} / ${total}`, {
    x: 8.8, y: 5.22, w: 0.8, h: 0.25,
    fontSize: 8,
    color: t.mutedColor,
    fontFace: t.fontBody,
    align: 'right',
  });

  // Speaker notes in PPTX notes panel
  if (slide.speaker_notes) {
    s.addNotes(slide.speaker_notes);
  }
}

// ── Layout router ─────────────────────────────────────────────
function renderSlide(
  pres: any,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const layout = (slide.layout_type as LayoutType) ?? 'content';

  switch (layout) {
    case 'title':       return renderContentSlide(pres, slide, idx, total, t);  // same as content but used for opening slides
    case 'two-column':  return renderTwoColumnSlide(pres, slide, idx, total, t);
    case 'image-focus': return renderImageFocusSlide(pres, slide, idx, total, t);
    case 'quote':       return renderQuoteSlide(pres, slide, idx, total, t);
    case 'stats':       return renderStatsSlide(pres, slide, idx, total, t);
    case 'content':
    default:            return renderContentSlide(pres, slide, idx, total, t);
  }
}

// ── Main export ───────────────────────────────────────────────
export async function exportToPPTX(ppt: GeneratedPPT & { topic?: string }): Promise<void> {
  await loadPptxGenJS();

  const PptxGenJS = (window as any).PptxGenJS;
  if (!PptxGenJS) throw new Error('PptxGenJS not available. Refresh and try again.');

  const pres   = new PptxGenJS();
  const themeKey = (ppt.design_theme ?? 'modern') as DesignTheme;
  const t: ThemeConfig = THEMES[themeKey] ?? THEMES.modern;

  pres.layout  = 'LAYOUT_WIDE';
  pres.author  = 'Aura Study';
  pres.company = 'Aura Study';
  pres.title   = ppt.title;
  pres.subject = ppt.topic ?? ppt.title;

  // 1. Cover slide
  renderCoverSlide(pres, ppt, t);

  // 2. Content slides
  ppt.slides.forEach((slide: GeneratedSlide, idx: number) => {
    renderSlide(pres, slide, idx, ppt.slides.length, t);
  });

  const safeTitle = ppt.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
  await pres.writeFile({ fileName: `${safeTitle}_aura_study.pptx` });
}
