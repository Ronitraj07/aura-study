// ============================================================
// pptExport.ts — Gamma/Chronicle-level PPTX export
// ✔ pptxgenjs loaded via npm import (NOT CDN — fixes Vercel/CSP)
// ✔ Layout-aware rendering: 6 distinct slide templates
// ✔ Optional Pexels images embedded as base64 per slide
// ✔ Bullet density cap (max 5), generous spacing, 16pt body
// ✔ Full-bleed cover image with scrim overlay
// ✔ Asymmetric two-column split (43/52)
// ✔ Consistent y=1.58" body start across all layouts
// ============================================================

import pptxgen from 'pptxgenjs';
import type { GeneratedPPT } from '@/hooks/usePPTGenerator';
import type { GeneratedSlide } from '@/types/database';
import { fetchSlideImages } from '@/lib/pexels';

type DesignTheme = 'modern' | 'minimal' | 'corporate';
type LayoutType  = 'title' | 'content' | 'two-column' | 'image-focus' | 'quote' | 'stats';

interface ThemeConfig {
  bg:         string;
  bgAlt:      string;
  titleColor: string;
  textColor:  string;
  mutedColor: string;
  accent1:    string;
  accent2:    string;
  accent3:    string;
  fontTitle:  string;
  fontBody:   string;
}

const THEMES: Record<DesignTheme, ThemeConfig> = {
  modern: {
    bg:         '0D0D1A',
    bgAlt:      '12122A',
    titleColor: 'C4B5FD',
    textColor:  'E2E8F0',
    mutedColor: '94A3B8',
    accent1:    '7C3AED',
    accent2:    'A855F7',
    accent3:    '4F46E5',
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
  minimal: {
    bg:         'FFFFFF',
    bgAlt:      'F8FAFC',
    titleColor: '0F172A',
    textColor:  '1E293B',
    mutedColor: '64748B',
    accent1:    '0EA5E9',
    accent2:    '0284C7',
    accent3:    '7DD3FC',
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
  corporate: {
    bg:         'F0F4F8',
    bgAlt:      'FFFFFF',
    titleColor: '0C2340',
    textColor:  '1E3A5F',
    mutedColor: '64748B',
    accent1:    '1D4ED8',
    accent2:    '2563EB',
    accent3:    '93C5FD',
    fontTitle:  'Calibri',
    fontBody:   'Calibri',
  },
};

const VISUAL_LABELS: Record<string, string> = {
  'bar-chart':         '📊  Bar Chart',
  'line-chart':        '📈  Line Chart',
  'pie-chart':         '🥧  Pie Chart',
  'timeline':          '🕐  Timeline',
  'image-placeholder': '🖼️  Image',
  'icon-grid':         '🔲  Icon Grid',
  'two-column-table':  '📋  Table',
  'quote-callout':     '💬  Quote',
  'stat-highlight':    '💯  Statistics',
  'diagram':           '🔷  Diagram',
};

// ── Gamma-quality bullet builder ──────────────────────────────
// Cap at 5 bullets, 16pt, generous line spacing — prevents cramming
function makeBullets(
  items: string[],
  t: ThemeConfig,
  bulletCode = '25AA',
  maxItems = 5,
) {
  return items.slice(0, maxItems).map(text => ({
    text,
    options: {
      bullet:                { code: bulletCode },
      fontSize:              16,
      color:                 t.textColor,
      fontFace:              t.fontBody,
      paraSpaceBefore:       8,
      paraSpaceAfter:        6,
      lineSpacingMultiple:   1.3,
    },
  }));
}

// ── Cover slide — full-bleed background with left scrim ───────
function renderCoverSlide(
  pres: pptxgen,
  ppt: GeneratedPPT & { topic?: string },
  t: ThemeConfig,
  coverImage: string | null,
) {
  const s = pres.addSlide();
  s.background = { color: t.bg };

  if (coverImage) {
    // Full-bleed background image
    s.addImage({ data: coverImage, x: 0, y: 0, w: '100%', h: '100%' });
    // Dark scrim over left 65% so title text stays crisp
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: 6.8, h: '100%',
      fill: { color: t.bg, transparency: 8 },
      line: { color: t.bg, transparency: 100 },
    });
    // Soft vignette on right edge
    s.addShape(pres.ShapeType.rect, {
      x: 6.0, y: 0, w: 4.0, h: '100%',
      fill: { color: t.bg, transparency: 55 },
      line: { color: t.bg, transparency: 100 },
    });
  } else {
    // Fallback: gradient band + decorative right block
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 3.6,
      fill: { color: t.accent1, transparency: 15 },
      line: { color: t.accent1, transparency: 15 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 7.8, y: 0, w: 2.2, h: '100%',
      fill: { color: t.accent2, transparency: 35 },
      line: { color: t.accent2, transparency: 35 },
    });
  }

  // Left accent bar
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 0.35, w: 0.08, h: 2.6,
    fill: { color: t.accent3, transparency: 0 },
    line: { color: t.accent3, transparency: 0 },
  });

  // Title — large, bold, left-aligned
  s.addText(ppt.title, {
    x: 0.72, y: 0.5, w: 6.6, h: 2.4,
    fontSize: 36, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'left', valign: 'middle',
    breakLine: true, wrap: true,
  });

  const topic = ppt.topic ?? ppt.title;
  s.addText(topic.toLowerCase(), {
    x: 0.72, y: 3.05, w: 6.6, h: 0.5,
    fontSize: 15, color: t.mutedColor,
    fontFace: t.fontBody, align: 'left', italic: true,
  });

  s.addShape(pres.ShapeType.rect, {
    x: 0.72, y: 3.65, w: 5.0, h: 0.045,
    fill: { color: t.accent1, transparency: 35 },
    line: { color: t.accent1, transparency: 35 },
  });

  s.addText('Generated by Aura Study  ·  AI-Powered Learning', {
    x: 0.72, y: 4.1, w: 6.6, h: 0.35,
    fontSize: 11, color: t.mutedColor,
    fontFace: t.fontBody, align: 'left',
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.5, y: 4.9, w: 1.6, h: 0.38,
    rectRadius: 0.1,
    fill: { color: t.accent1, transparency: 20 },
    line: { color: t.accent1, transparency: 0 },
  });
  s.addText(`${ppt.slides.length} Slides`, {
    x: 7.5, y: 4.9, w: 1.6, h: 0.38,
    fontSize: 11, bold: true, color: t.titleColor,
    fontFace: t.fontBody, align: 'center',
  });
}

// ── Shared header helper ──────────────────────────────────────
function addSlideHeader(
  pres: pptxgen,
  s: ReturnType<pptxgen['addSlide']>,
  slide: GeneratedSlide,
  t: ThemeConfig,
  accentColor?: string,
) {
  const color = accentColor ?? t.accent1;

  // Top accent stripe
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.09,
    fill: { color }, line: { color },
  });
  // Left title bar
  s.addShape(pres.ShapeType.rect, {
    x: 0.38, y: 0.25, w: 0.07, h: 0.85,
    fill: { color: t.accent2 }, line: { color: t.accent2 },
  });
  // Title — 28pt for body slides
  s.addText(slide.title, {
    x: 0.58, y: 0.22, w: 8.8, h: 0.9,
    fontSize: 28, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'left', valign: 'middle',
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.58, y: 1.1, w: 8.8, h: 0.38,
      fontSize: 13, bold: true, color: t.mutedColor,
      fontFace: t.fontBody, italic: true, align: 'left',
    });
  }
  // Divider line
  s.addShape(pres.ShapeType.rect, {
    x: 0.58, y: 1.46, w: 8.9, h: 0.028,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });
}

// ── Shared footer helper ──────────────────────────────────────
function addSlideFooter(
  s: ReturnType<pptxgen['addSlide']>,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  s.addText(`${idx + 1} / ${total}`, {
    x: 8.8, y: 5.22, w: 0.8, h: 0.25,
    fontSize: 9, color: t.mutedColor,
    fontFace: t.fontBody, align: 'right',
  });
  if (slide.speaker_notes) s.addNotes(slide.speaker_notes);
}

// ── Content slide ────────────────────────────────────────────
function renderContentSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
  slideImage: string | null,
) {
  const s = pres.addSlide();
  s.background = { color: idx % 2 === 0 ? t.bg : t.bgAlt };
  addSlideHeader(pres, s, slide, t);

  if (slideImage) {
    // Bullets left (55%), image right (40%) with reduced overlay
    const bullets = makeBullets(slide.content, t);
    if (bullets.length) {
      s.addText(bullets, { x: 0.55, y: 1.58, w: 5.4, h: 3.7, valign: 'top' });
    }
    s.addImage({ data: slideImage, x: 6.1, y: 1.45, w: 3.6, h: 3.75 });
    // Lighter overlay — 40% so images actually show (was 65%, too washed out)
    s.addShape(pres.ShapeType.rect, {
      x: 6.1, y: 1.45, w: 3.6, h: 3.75,
      fill: { color: t.bg, transparency: 40 },
      line: { color: t.accent1, transparency: 55 },
    });
  } else {
    const bullets = makeBullets(slide.content, t);
    if (bullets.length) {
      // Dynamic height based on capped bullet count (max 5)
      const bulletH = Math.min(bullets.length * 0.72 + 0.2, 3.7);
      s.addText(bullets, { x: 0.55, y: 1.58, w: 9.0, h: bulletH, valign: 'top' });
    }
  }

  addSlideFooter(s, slide, idx, total, t);
}

// ── Two-column slide — asymmetric 43/52 split ─────────────────
function renderTwoColumnSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
  slideImage: string | null,
) {
  const s = pres.addSlide();
  s.background = { color: t.bg };

  // Top accent bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.09,
    fill: { color: t.accent2 }, line: { color: t.accent2 },
  });
  s.addText(slide.title, {
    x: 0.42, y: 0.18, w: 9.2, h: 0.76,
    fontSize: 26, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'left', valign: 'middle',
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.42, y: 0.92, w: 9.2, h: 0.36,
      fontSize: 12, bold: true, color: t.mutedColor,
      fontFace: t.fontBody, italic: true,
    });
  }
  s.addShape(pres.ShapeType.rect, {
    x: 0.42, y: 1.26, w: 9.2, h: 0.028,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });

  // Asymmetric: left=4.3", right=5.2" with 0.18" gap
  const LEFT_W  = 4.3;
  const RIGHT_X = 4.86; // 0.42 + 4.3 + 0.14 gap
  const RIGHT_W = 4.86;
  const COL_DIV = 4.7;  // divider x position

  const half      = Math.ceil(slide.content.length / 2);
  const leftItems = slide.content.slice(0, half);
  const rightItems = slideImage ? [] : slide.content.slice(half);

  // Column divider
  s.addShape(pres.ShapeType.rect, {
    x: COL_DIV, y: 1.34, w: 0.028, h: 3.85,
    fill: { color: t.accent1, transparency: 72 },
    line: { color: t.accent1, transparency: 72 },
  });

  // Left column header chip
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.42, y: 1.34, w: 1.4, h: 0.32,
    rectRadius: 0.06,
    fill: { color: t.accent1, transparency: 18 },
    line: { color: t.accent1, transparency: 30 },
  });
  s.addText('KEY POINTS', {
    x: 0.42, y: 1.34, w: 1.4, h: 0.32,
    fontSize: 9, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'center',
  });

  const makeTwoColBullets = (items: string[]) =>
    items.slice(0, 4).map(text => ({
      text,
      options: {
        bullet:              { code: '25BA' },
        fontSize:            14,
        color:               t.textColor,
        fontFace:            t.fontBody,
        paraSpaceAfter:      8,
        lineSpacingMultiple: 1.25,
      },
    }));

  if (leftItems.length) {
    s.addText(makeTwoColBullets(leftItems), {
      x: 0.42, y: 1.72, w: LEFT_W, h: 3.3, valign: 'top',
    });
  }

  // Right side: image OR bullets
  if (slideImage) {
    s.addImage({ data: slideImage, x: RIGHT_X, y: 1.34, w: RIGHT_W, h: 3.85 });
    // Reduced overlay — 40% so image is clearly visible
    s.addShape(pres.ShapeType.rect, {
      x: RIGHT_X, y: 1.34, w: RIGHT_W, h: 3.85,
      fill: { color: t.bg, transparency: 40 },
      line: { color: t.accent1, transparency: 45 },
    });
  } else {
    s.addShape(pres.ShapeType.roundRect, {
      x: RIGHT_X, y: 1.34, w: 1.4, h: 0.32,
      rectRadius: 0.06,
      fill: { color: t.accent2, transparency: 18 },
      line: { color: t.accent2, transparency: 30 },
    });
    s.addText('DETAILS', {
      x: RIGHT_X, y: 1.34, w: 1.4, h: 0.32,
      fontSize: 9, bold: true, color: t.titleColor,
      fontFace: t.fontTitle, align: 'center',
    });
    if (rightItems.length) {
      s.addText(makeTwoColBullets(rightItems), {
        x: RIGHT_X, y: 1.72, w: RIGHT_W, h: 3.3, valign: 'top',
      });
    }
  }

  addSlideFooter(s, slide, idx, total, t);
}

// ── Image-focus slide ────────────────────────────────────────
function renderImageFocusSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
  slideImage: string | null,
) {
  const s = pres.addSlide();
  s.background = { color: t.bg };
  addSlideHeader(pres, s, slide, t);

  // Left: up to 4 bullets (image-focus — text is secondary)
  const leftItems = slide.content.slice(0, 4);
  if (leftItems.length) {
    s.addText(makeBullets(leftItems, t, '25AA', 4), {
      x: 0.42, y: 1.58, w: 5.35, h: 3.55, valign: 'top',
    });
  }

  // Right panel: real image or styled placeholder
  if (slideImage) {
    s.addImage({ data: slideImage, x: 6.0, y: 0.25, w: 3.7, h: 4.95 });
    // Minimal overlay — 35% keeps image dominant as intended for this layout
    s.addShape(pres.ShapeType.rect, {
      x: 6.0, y: 0.25, w: 3.7, h: 4.95,
      fill: { color: t.bg, transparency: 35 },
      line: { color: t.accent1, transparency: 25 },
    });
  } else {
    const label = VISUAL_LABELS[slide.visual_suggestion ?? ''] ?? '🖼️  Visual';
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.0, y: 0.25, w: 3.7, h: 4.95,
      rectRadius: 0.15,
      fill: { color: t.accent1, transparency: 82 },
      line: { color: t.accent1, transparency: 38 },
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: 7.05, y: 0.9, w: 1.6, h: 1.6,
      fill: { color: t.accent2, transparency: 52 },
      line: { color: t.accent2, transparency: 28 },
    });
    s.addText(label, {
      x: 6.1, y: 2.85, w: 3.5, h: 0.5,
      fontSize: 14, bold: true, color: t.titleColor,
      fontFace: t.fontTitle, align: 'center',
    });
    if (slide.visual_suggestion) {
      s.addText(slide.visual_suggestion.replace(/-/g, ' ').toUpperCase(), {
        x: 6.1, y: 3.42, w: 3.5, h: 0.4,
        fontSize: 10, color: t.mutedColor,
        fontFace: t.fontBody, align: 'center',
      });
    }
  }

  addSlideFooter(s, slide, idx, total, t);
}

// ── Quote slide ───────────────────────────────────────────────
function renderQuoteSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
  slideImage: string | null,
) {
  const s = pres.addSlide();

  if (slideImage) {
    s.addImage({ data: slideImage, x: 0, y: 0, w: '100%', h: '100%' });
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: t.accent1, transparency: 25 },
      line: { color: t.accent1, transparency: 25 },
    });
  } else {
    s.background = { color: t.accent1 };
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: 1.5, h: 1.5,
      fill: { color: t.accent2, transparency: 52 },
      line: { color: t.accent2, transparency: 52 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 8.5, y: 4.13, w: 1.5, h: 1.5,
      fill: { color: t.accent2, transparency: 52 },
      line: { color: t.accent2, transparency: 52 },
    });
  }

  // Large opening quote mark — 90pt for visual drama
  s.addText('\u201C', {
    x: 0.5, y: 0.2, w: 1.5, h: 1.2,
    fontSize: 90, color: t.titleColor,
    fontFace: t.fontTitle, bold: true, transparency: 38,
  });
  // Quote title — 32pt, centered, ample vertical space
  s.addText(slide.title, {
    x: 1.1, y: 0.95, w: 7.8, h: 2.4,
    fontSize: 32, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'center', valign: 'middle',
    breakLine: true, wrap: true,
  });
  if (slide.subtitle) {
    s.addText(`— ${slide.subtitle}`, {
      x: 1.1, y: 3.35, w: 7.8, h: 0.48,
      fontSize: 14, color: t.mutedColor,
      fontFace: t.fontBody, italic: true, align: 'center',
    });
  }
  if (slide.content.length) {
    s.addText(slide.content.slice(0, 3).join('  •  '), {
      x: 0.5, y: 4.1, w: 9.0, h: 0.55,
      fontSize: 11, color: t.mutedColor,
      fontFace: t.fontBody, align: 'center',
    });
  }
  s.addText(`${idx + 1} / ${total}`, {
    x: 8.8, y: 5.15, w: 0.8, h: 0.28,
    fontSize: 9, color: t.mutedColor,
    fontFace: t.fontBody, align: 'right',
  });
}

// ── Stats slide ───────────────────────────────────────────────
function renderStatsSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
) {
  const s = pres.addSlide();
  s.background = { color: t.bgAlt };

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.09,
    fill: { color: t.accent2 }, line: { color: t.accent2 },
  });
  s.addText(slide.title, {
    x: 0.42, y: 0.18, w: 9.2, h: 0.76,
    fontSize: 26, bold: true, color: t.titleColor,
    fontFace: t.fontTitle, align: 'left', valign: 'middle',
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.42, y: 0.92, w: 9.2, h: 0.34,
      fontSize: 12, bold: true, color: t.mutedColor,
      fontFace: t.fontBody, italic: true,
    });
  }
  s.addShape(pres.ShapeType.rect, {
    x: 0.42, y: 1.24, w: 9.2, h: 0.028,
    fill: { color: t.accent1, transparency: 65 },
    line: { color: t.accent1, transparency: 65 },
  });

  // 4 cards: w=2.15, gap=0.12 — total = 4×2.15 + 3×0.12 = 8.96 (fits within margins)
  const items  = slide.content.slice(0, 4);
  const cardW  = 2.15;
  const cardGap = 0.12;

  items.forEach((point, i) => {
    const x = 0.42 + i * (cardW + cardGap);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.38, w: cardW, h: 3.85,
      rectRadius: 0.14,
      fill: { color: t.accent1, transparency: 86 },
      line: { color: t.accent1, transparency: 45 },
    });
    // Number circle
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.73, y: 1.58, w: 0.68, h: 0.68,
      fill: { color: t.accent2, transparency: 25 },
      line: { color: t.accent2, transparency: 0 },
    });
    s.addText(String(i + 1), {
      x: x + 0.73, y: 1.58, w: 0.68, h: 0.68,
      fontSize: 15, bold: true, color: t.titleColor,
      fontFace: t.fontTitle, align: 'center', valign: 'middle',
    });
    s.addText(point, {
      x: x + 0.14, y: 2.4, w: cardW - 0.28, h: 2.6,
      fontSize: 13, color: t.textColor,
      fontFace: t.fontBody, align: 'left', valign: 'top',
      wrap: true, breakLine: true,
      lineSpacingMultiple: 1.25,
    });
  });

  addSlideFooter(s, slide, idx, total, t);
}

// ── Layout router ───────────────────────────────────────────────
function renderSlide(
  pres: pptxgen,
  slide: GeneratedSlide,
  idx: number,
  total: number,
  t: ThemeConfig,
  slideImage: string | null,
) {
  switch ((slide.layout_type as LayoutType) ?? 'content') {
    case 'two-column':  return renderTwoColumnSlide(pres, slide, idx, total, t, slideImage);
    case 'image-focus': return renderImageFocusSlide(pres, slide, idx, total, t, slideImage);
    case 'quote':       return renderQuoteSlide(pres, slide, idx, total, t, slideImage);
    case 'stats':       return renderStatsSlide(pres, slide, idx, total, t);
    case 'title':
    case 'content':
    default:            return renderContentSlide(pres, slide, idx, total, t, slideImage);
  }
}

// ── Main export ───────────────────────────────────────────────
export async function exportToPPTX(
  ppt: GeneratedPPT & { topic?: string },
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Fetching slide images...');

  const queries    = ppt.slides.map(slide => (slide as any).image_query ?? slide.title);
  const allQueries = [ppt.topic ?? ppt.title, ...queries];
  const allImages  = await fetchSlideImages(allQueries);
  const coverImage = allImages[0];
  const slideImages = allImages.slice(1);

  onProgress?.('Building presentation...');

  const pres = new pptxgen();
  const themeKey = (ppt.design_theme ?? 'modern') as DesignTheme;
  const t: ThemeConfig = THEMES[themeKey] ?? THEMES.modern;

  pres.layout  = 'LAYOUT_WIDE';
  pres.author  = 'Aura Study';
  pres.company = 'Aura Study';
  pres.title   = ppt.title;
  pres.subject = ppt.topic ?? ppt.title;

  renderCoverSlide(pres, ppt, t, coverImage);

  ppt.slides.forEach((slide: GeneratedSlide, idx: number) => {
    renderSlide(pres, slide, idx, ppt.slides.length, t, slideImages[idx] ?? null);
  });

  onProgress?.('Saving file...');
  const safeTitle = ppt.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
  await pres.writeFile({ fileName: `${safeTitle}_aura_study.pptx` });
}
