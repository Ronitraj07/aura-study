// ============================================================
// Aura Study — Shared PDF Export Module (C4 + C5)
// Covers: Assignments, Notes, Exam Notes (extensible to Research)
// Strategy: build an off-screen HTML element → html2canvas → jsPDF
// No external font CDN needed — uses system sans-serif stack
// ============================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Shared types ────────────────────────────────────────────────

export interface PdfBlock {
  type: 'heading' | 'body' | 'bullets' | 'summary';
  heading?: string;
  badge?: string;
  badgeColor?: string;
  accentColor?: string;
  content?: string;
  bullets?: string[];
}

export interface ExamTipPdf {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MnemonicPdf {
  concept: string;
  device: string;
  explanation: string;
}

export interface CheatsheetEntryPdf {
  label: string;
  value: string;
}

// ─── Shared render helpers ────────────────────────────────────────

const PAGE_W = 794;   // A4 @ 96dpi ≈ 794px
const PAGE_H = 1123;  // A4 @ 96dpi ≈ 1123px
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

function makeContainer(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    `width:${PAGE_W}px`,
    'position:fixed',
    'top:-99999px',
    'left:-99999px',
    'background:#0f1117',
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif`,
    'font-size:14px',
    'color:#e2e4e9',
    'line-height:1.6',
    '-webkit-font-smoothing:antialiased',
  ].join(';');
  document.body.appendChild(el);
  return el;
}

function pageHeader(topic: string, accentHsl: string): string {
  return `
    <div style="
      padding:${MARGIN}px ${MARGIN}px 24px;
      border-bottom:1px solid #2a2d35;
      margin-bottom:32px;
    ">
      <div style="
        display:inline-block;
        font-size:10px;
        font-weight:600;
        letter-spacing:0.08em;
        text-transform:uppercase;
        color:${accentHsl};
        margin-bottom:8px;
      ">Aura Study</div>
      <h1 style="
        margin:0;
        font-size:22px;
        font-weight:700;
        color:#f0f1f5;
        line-height:1.25;
        max-width:${CONTENT_W}px;
      ">${escHtml(topic)}</h1>
    </div>
  `;
}

function pageFooter(pageNum: number, total: number): string {
  return `
    <div style="
      position:absolute;
      bottom:${MARGIN - 16}px;
      left:${MARGIN}px;
      right:${MARGIN}px;
      display:flex;
      justify-content:space-between;
      font-size:10px;
      color:#5a5f6e;
    ">
      <span>Aura Study — AI-generated document</span>
      <span>Page ${pageNum} of ${total}</span>
    </div>
  `;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderPagesToPdf(
  pages: string[],
  filename: string
): Promise<void> {
  const pdf = new jsPDF({ unit: 'px', format: 'a4', orientation: 'portrait' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const container = makeContainer();
    container.style.minHeight = `${PAGE_H}px`;
    container.innerHTML = pages[i] + pageFooter(i + 1, pages.length);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f1117',
      logging: false,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  }

  pdf.save(filename);
}

// ─── Split blocks across pages ────────────────────────────────────
function estimateBlockHeight(block: string): number {
  const lineEstimate = (block.match(/<br|<p|<li|<div/gi) ?? []).length;
  return Math.max(80, lineEstimate * 22 + 48);
}

function paginateBlocks(
  headerHtml: string,
  blockHtmls: string[],
  printableH: number
): string[] {
  const pages: string[] = [];
  let current = headerHtml;
  let used = 160;

  for (const block of blockHtmls) {
    const bh = estimateBlockHeight(block);
    if (used + bh > printableH && current !== headerHtml) {
      pages.push(current);
      current = `<div style="height:${MARGIN}px"></div>`;
      used = MARGIN;
    }
    current += block;
    used += bh;
  }
  if (current) pages.push(current);
  return pages;
}

// ─── Assignment PDF ───────────────────────────────────────────────

interface AssignmentParagraph {
  id: number;
  heading: string;
  body: string;
  type: 'intro' | 'body' | 'conclusion';
}

export async function exportAssignmentPDF(
  topic: string,
  paragraphs: AssignmentParagraph[]
): Promise<void> {
  const ACCENT = 'hsl(220,85%,65%)';

  const typeColor: Record<string, string> = {
    intro:      'hsl(160,70%,48%)',
    body:       'hsl(220,85%,65%)',
    conclusion: 'hsl(262,80%,65%)',
  };
  const typeLabel: Record<string, string> = {
    intro:      'Introduction',
    body:       'Body',
    conclusion: 'Conclusion',
  };

  const headerHtml = pageHeader(topic, ACCENT);

  const blockHtmls = paragraphs.map((para) => {
    const tc = typeColor[para.type] ?? ACCENT;
    const tl = typeLabel[para.type] ?? para.type;
    return `
      <div style="
        margin:0 ${MARGIN}px 24px;
        background:#161920;
        border-radius:12px;
        overflow:hidden;
        border:1px solid #2a2d35;
      ">
        <div style="height:3px;background:${tc};"></div>
        <div style="padding:18px 20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="
              font-size:9px;
              font-weight:700;
              letter-spacing:0.07em;
              text-transform:uppercase;
              padding:3px 8px;
              border-radius:20px;
              background:${tc}22;
              border:1px solid ${tc}44;
              color:${tc};
            ">${escHtml(tl)}</span>
            <span style="
              font-size:15px;
              font-weight:700;
              color:#f0f1f5;
              line-height:1.2;
            ">${escHtml(para.heading)}</span>
          </div>
          <p style="
            margin:0;
            font-size:13px;
            color:#b0b5c0;
            line-height:1.7;
          ">${escHtml(para.body)}</p>
          <p style="
            margin:10px 0 0;
            font-size:10px;
            color:#3d4050;
            text-align:right;
          ">~${para.body.split(' ').length} words</p>
        </div>
      </div>
    `;
  });

  const PRINTABLE_H = PAGE_H - MARGIN * 2;
  const pages = paginateBlocks(headerHtml, blockHtmls, PRINTABLE_H);
  const slug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  await renderPagesToPdf(pages, `assignment-${slug}.pdf`);
}

// ─── Notes PDF ────────────────────────────────────────────────────

interface NoteSection {
  id: number;
  heading: string;
  bullets: string[];
  color: string;
  difficulty?: 'intro' | 'core' | 'advanced'; // Phase 5A
}

interface ConceptConnectionPdf {
  from: string;
  to: string;
  relationship: string;
}

interface NoteTablePdf {
  caption: string;
  headers: string[];
  rows: string[][];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  intro: 'Intro', core: 'Core', advanced: 'Advanced',
};
const DIFFICULTY_COLOR: Record<string, string> = {
  intro: 'hsl(160,70%,48%)', core: 'hsl(220,85%,65%)', advanced: 'hsl(340,75%,58%)',
};

export async function exportNotesPDF(
  topic: string,
  sections: NoteSection[],
  summary: string[],
  connections?: ConceptConnectionPdf[],
  tables?: NoteTablePdf[]
): Promise<void> {
  const ACCENT = 'hsl(160,70%,50%)';
  const headerHtml = pageHeader(topic, ACCENT);

  // Phase 5A: Table of Contents page
  const tocItems = sections.map((sec) => {
    const dc = sec.difficulty ? DIFFICULTY_COLOR[sec.difficulty] : sec.color;
    const dl = sec.difficulty ? DIFFICULTY_LABEL[sec.difficulty] : '';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e2028;">
        <span style="width:24px;height:24px;border-radius:50%;background:${sec.color}22;color:${sec.color};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${sec.id}</span>
        <span style="flex:1;font-size:13px;color:#d0d2da;font-weight:500;">${escHtml(sec.heading)}</span>
        ${dl ? `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${dc}22;border:1px solid ${dc}44;color:${dc};text-transform:uppercase;letter-spacing:0.06em;">${dl}</span>` : ''}
      </div>
    `;
  }).join('');

  const tocBlock = `
    <div style="margin:0 ${MARGIN}px 24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <span style="font-size:13px;">📋</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Table of Contents</h3>
      </div>
      <div style="background:#161920;border-radius:12px;padding:16px 18px;border:1px solid #2a2d35;">
        ${tocItems}
      </div>
    </div>
  `;

  const sectionBlocks = sections.map((sec) => {
    const dc = sec.difficulty ? DIFFICULTY_COLOR[sec.difficulty] : null;
    const dl = sec.difficulty ? DIFFICULTY_LABEL[sec.difficulty] : null;
    const bulletItems = sec.bullets
      .map((b) => `
        <li style="
          display:flex;
          align-items:flex-start;
          gap:8px;
          margin-bottom:6px;
          font-size:13px;
          color:#b0b5c0;
          line-height:1.6;
        ">
          <span style="
            color:${sec.color};
            font-size:10px;
            margin-top:4px;
            flex-shrink:0;
          ">▶</span>
          <span>${escHtml(b)}</span>
        </li>
      `)
      .join('');

    return `
      <div style="
        margin:0 ${MARGIN}px 20px;
        background:#161920;
        border-radius:12px;
        overflow:hidden;
        border:1px solid #2a2d35;
        display:flex;
      ">
        <div style="width:4px;flex-shrink:0;background:${dc ?? sec.color};"></div>
        <div style="flex:1;padding:16px 18px;">
          <div style="
            display:flex;
            align-items:center;
            gap:7px;
            margin-bottom:10px;
          ">
            <span style="color:${sec.color};font-size:12px;">#</span>
            <h3 style="
              margin:0;
              font-size:14px;
              font-weight:700;
              color:#f0f1f5;
              flex:1;
            ">${escHtml(sec.heading)}</h3>
            ${dl ? `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${dc}22;border:1px solid ${dc}44;color:${dc};text-transform:uppercase;letter-spacing:0.06em;">${dl}</span>` : ''}
          </div>
          <ul style="margin:0;padding:0;list-style:none;">${bulletItems}</ul>
        </div>
      </div>
    `;
  });

  const summaryItems = summary
    .map((line, idx) => `
      <li style="
        display:flex;
        align-items:flex-start;
        gap:10px;
        margin-bottom:8px;
        font-size:13px;
        color:#b0b5c0;
        line-height:1.6;
      ">
        <span style="
          width:20px;height:20px;
          border-radius:50%;
          background:hsl(262,80%,60%,0.18);
          color:hsl(262,80%,65%);
          font-size:10px;
          font-weight:700;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
          margin-top:2px;
        ">${idx + 1}</span>
        <span>${escHtml(line)}</span>
      </li>
    `)
    .join('');

  const summaryBlock = `
    <div style="
      margin:0 ${MARGIN}px 20px;
      background:#161920;
      border-radius:12px;
      overflow:hidden;
      border:1px solid hsl(262,80%,60%,0.3);
    ">
      <div style="height:3px;background:linear-gradient(90deg,hsl(262,80%,60%),hsl(220,85%,60%));"></div>
      <div style="padding:16px 18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:13px;">💡</span>
          <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Summary</h3>
          <span style="
            font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
            padding:3px 8px;border-radius:20px;
            background:hsl(262,80%,60%,0.15);border:1px solid hsl(262,80%,60%,0.3);
            color:hsl(262,80%,65%);
          ">Key Takeaways</span>
        </div>
        <ul style="margin:0;padding:0;list-style:none;">${summaryItems}</ul>
      </div>
    </div>
  `;

  // Phase 5A: Concept connections section
  const connectionsBlock = connections?.length ? `
    <div style="margin:0 ${MARGIN}px 20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:13px;">🔗</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Concept Connections</h3>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${connections.map(c => `
          <div style="display:flex;align-items:flex-start;gap:8px;background:#161920;border-radius:10px;padding:10px 14px;border:1px solid #2a2d35;">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:hsl(262,80%,60%,0.15);border:1px solid hsl(262,80%,60%,0.3);color:hsl(262,80%,65%);flex-shrink:0;">${escHtml(c.from)}</span>
            <span style="color:#5a5f6e;font-size:11px;margin-top:1px;">→</span>
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:hsl(160,70%,45%,0.15);border:1px solid hsl(160,70%,45%,0.3);color:hsl(160,70%,55%);flex-shrink:0;">${escHtml(c.to)}</span>
            <span style="font-size:12px;color:#b0b5c0;flex:1;">${escHtml(c.relationship)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Academy: comparison tables
  const tablesBlock = tables?.length ? `
    <div style="margin:0 ${MARGIN}px 20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:13px;">📊</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Reference Tables</h3>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${tables.map(t => `
          <div>
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:hsl(220,85%,65%);">${escHtml(t.caption)}</p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #2a2d35;border-radius:8px;overflow:hidden;font-size:12px;">
              <thead>
                <tr style="background:hsl(220,85%,60%,0.12);">
                  ${t.headers.map(h => `<th style="text-align:left;padding:8px 10px;font-weight:600;color:#e0e2e8;border-bottom:1px solid #2a2d35;border-right:1px solid #2a2d35;">${escHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${t.rows.map((row, ri) => `
                  <tr style="background:${ri % 2 === 0 ? '#161920' : '#1a1d24'};">
                    ${row.map(cell => `<td style="padding:7px 10px;color:#b0b5c0;border-bottom:1px solid #2a2d35;border-right:1px solid #2a2d35;">${escHtml(cell)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const allBlocks = [tocBlock, ...sectionBlocks, summaryBlock, connectionsBlock, tablesBlock].filter(Boolean);
  const PRINTABLE_H = PAGE_H - MARGIN * 2;
  const pages = paginateBlocks(headerHtml, allBlocks, PRINTABLE_H);
  const slug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  await renderPagesToPdf(pages, `notes-${slug}.pdf`);
}

// ─── Exam Notes PDF (C5) ──────────────────────────────────────────

export async function exportExamNotesPDF(
  topic: string,
  sections: NoteSection[],
  examTips: ExamTipPdf[],
  mnemonics: MnemonicPdf[],
  cheatsheet: CheatsheetEntryPdf[]
): Promise<void> {
  const ACCENT = 'hsl(30,80%,58%)';
  const headerHtml = pageHeader(`${topic} — Exam Cheatsheet`, ACCENT);

  const diffColor: Record<string, string> = {
    easy:   'hsl(160,70%,48%)',
    medium: 'hsl(30,80%,58%)',
    hard:   'hsl(340,75%,58%)',
  };

  // Section blocks (same as notes)
  const sectionBlocks = sections.map((sec) => {
    const bulletItems = sec.bullets.map((b) => `
      <li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:12px;color:#b0b5c0;line-height:1.6;">
        <span style="color:${sec.color};font-size:9px;margin-top:4px;flex-shrink:0;">▶</span>
        <span>${escHtml(b)}</span>
      </li>
    `).join('');
    return `
      <div style="margin:0 ${MARGIN}px 16px;background:#161920;border-radius:10px;overflow:hidden;border:1px solid #2a2d35;display:flex;">
        <div style="width:3px;flex-shrink:0;background:${sec.color};"></div>
        <div style="flex:1;padding:13px 16px;">
          <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;color:#f0f1f5;">${escHtml(sec.heading)}</h3>
          <ul style="margin:0;padding:0;list-style:none;">${bulletItems}</ul>
        </div>
      </div>
    `;
  });

  // Cheatsheet block
  const cheatRows = cheatsheet.map((entry, i) => `
    <tr style="background:${i % 2 === 0 ? '#161920' : '#1a1d24'};">
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#e0e2e8;border-right:1px solid #2a2d35;width:40%;">${escHtml(entry.label)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#b0b5c0;">${escHtml(entry.value)}</td>
    </tr>
  `).join('');

  const cheatsheetBlock = cheatsheet.length ? `
    <div style="margin:0 ${MARGIN}px 20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:13px;">📋</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Quick Reference</h3>
        <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${ACCENT}22;border:1px solid ${ACCENT}44;color:${ACCENT};text-transform:uppercase;letter-spacing:0.06em;">Cheatsheet</span>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #2a2d35;">
        ${cheatRows}
      </table>
    </div>
  ` : '';

  // Exam tips block
  const tipItems = examTips.map((tip) => {
    const dc = diffColor[tip.difficulty] ?? ACCENT;
    return `
      <div style="margin-bottom:10px;background:#161920;border-radius:10px;padding:13px 16px;border:1px solid #2a2d35;">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;">
          <span style="
            font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;
            background:${dc}22;border:1px solid ${dc}44;color:${dc};
            text-transform:uppercase;letter-spacing:0.06em;flex-shrink:0;margin-top:1px;
          ">${tip.difficulty}</span>
          <span style="font-size:13px;font-weight:600;color:#f0f1f5;line-height:1.4;">${escHtml(tip.question)}</span>
        </div>
        <p style="margin:0 0 0 46px;font-size:12px;color:#b0b5c0;line-height:1.6;">${escHtml(tip.answer)}</p>
      </div>
    `;
  }).join('');

  const tipsBlock = examTips.length ? `
    <div style="margin:0 ${MARGIN}px 20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:13px;">🎯</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Exam Q&amp;A</h3>
        <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:hsl(340,75%,58%,0.15);border:1px solid hsl(340,75%,58%,0.3);color:hsl(340,75%,60%);text-transform:uppercase;letter-spacing:0.06em;">${examTips.length} questions</span>
      </div>
      ${tipItems}
    </div>
  ` : '';

  // Mnemonics block
  const mnemonicItems = mnemonics.map((m) => `
    <div style="margin-bottom:10px;background:#161920;border-radius:10px;padding:13px 16px;border:1px solid hsl(220,85%,60%,0.25);">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:hsl(220,85%,65%);">Concept: ${escHtml(m.concept)}</p>
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f0f1f5;font-style:italic;">&ldquo;${escHtml(m.device)}&rdquo;</p>
      <p style="margin:0;font-size:12px;color:#b0b5c0;line-height:1.5;">${escHtml(m.explanation)}</p>
    </div>
  `).join('');

  const mnemonicsBlock = mnemonics.length ? `
    <div style="margin:0 ${MARGIN}px 20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:13px;">🧠</span>
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#f0f1f5;">Memory Devices</h3>
      </div>
      ${mnemonicItems}
    </div>
  ` : '';

  const allBlocks = [...sectionBlocks, cheatsheetBlock, tipsBlock, mnemonicsBlock].filter(Boolean);
  const PRINTABLE_H = PAGE_H - MARGIN * 2;
  const pages = paginateBlocks(headerHtml, allBlocks, PRINTABLE_H);
  const slug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  await renderPagesToPdf(pages, `exam-notes-${slug}.pdf`);
}

// ─── Generic PDF (for future pages: Research, etc.) ───────────────

export async function exportGenericPDF(
  title: string,
  blocks: PdfBlock[],
  accentHsl = 'hsl(220,85%,65%)'
): Promise<void> {
  const headerHtml = pageHeader(title, accentHsl);

  const blockHtmls = blocks.map((block) => {
    if (block.type === 'heading') {
      return `
        <div style="margin:0 ${MARGIN}px 16px;">
          <h2 style="
            margin:0;
            font-size:16px;
            font-weight:700;
            color:#f0f1f5;
            border-bottom:1px solid #2a2d35;
            padding-bottom:8px;
          ">${escHtml(block.heading ?? '')}</h2>
        </div>
      `;
    }
    if (block.type === 'body') {
      return `
        <div style="margin:0 ${MARGIN}px 16px;">
          <p style="margin:0;font-size:13px;color:#b0b5c0;line-height:1.7;">
            ${escHtml(block.content ?? '')}
          </p>
        </div>
      `;
    }
    if (block.type === 'bullets') {
      const items = (block.bullets ?? []).map((b) => `
        <li style="
          display:flex;align-items:flex-start;gap:8px;
          margin-bottom:6px;font-size:13px;color:#b0b5c0;line-height:1.6;
        ">
          <span style="color:${accentHsl};font-size:10px;margin-top:4px;">▶</span>
          <span>${escHtml(b)}</span>
        </li>
      `).join('');
      return `
        <div style="margin:0 ${MARGIN}px 16px;">
          ${block.heading ? `<h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#f0f1f5;">${escHtml(block.heading)}</h3>` : ''}
          <ul style="margin:0;padding:0;list-style:none;">${items}</ul>
        </div>
      `;
    }
    if (block.type === 'summary') {
      const items = (block.bullets ?? []).map((b, i) => `
        <li style="
          display:flex;align-items:flex-start;gap:10px;
          margin-bottom:8px;font-size:13px;color:#b0b5c0;line-height:1.6;
        ">
          <span style="
            width:20px;height:20px;border-radius:50%;
            background:${accentHsl}22;color:${accentHsl};
            font-size:10px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
            flex-shrink:0;margin-top:2px;
          ">${i + 1}</span>
          <span>${escHtml(b)}</span>
        </li>
      `).join('');
      return `
        <div style="
          margin:0 ${MARGIN}px 16px;
          background:#161920;border-radius:12px;
          border:1px solid ${accentHsl}44;padding:16px 18px;
        ">
          ${block.heading ? `<h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f0f1f5;">${escHtml(block.heading)}</h3>` : ''}
          <ul style="margin:0;padding:0;list-style:none;">${items}</ul>
        </div>
      `;
    }
    return '';
  });

  const PRINTABLE_H = PAGE_H - MARGIN * 2;
  const pages = paginateBlocks(headerHtml, blockHtmls, PRINTABLE_H);
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  await renderPagesToPdf(pages, `${slug}.pdf`);
}
