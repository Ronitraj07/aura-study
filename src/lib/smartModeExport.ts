// ============================================================
// Smart Mode Export Utilities
// Export generated content to various formats
// ============================================================

import type { SmartModeContentType } from '@/hooks/useSmartModeGenerator';

export type ExportFormat = 'json' | 'markdown' | 'txt' | 'csv';

interface ExportOptions {
  title: string;
  contentType: SmartModeContentType;
  content: any;
  format: ExportFormat;
}

export function exportContent({ title, contentType, content, format }: ExportOptions): void {
  let blob: Blob;
  let extension: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
      extension = 'json';
      mimeType = 'application/json';
      break;

    case 'markdown':
      const mdContent = convertToMarkdown(contentType, content, title);
      blob = new Blob([mdContent], { type: 'text/markdown' });
      extension = 'md';
      mimeType = 'text/markdown';
      break;

    case 'txt':
      const txtContent = convertToText(contentType, content, title);
      blob = new Blob([txtContent], { type: 'text/plain' });
      extension = 'txt';
      mimeType = 'text/plain';
      break;

    case 'csv':
      const csvContent = convertToCSV(contentType, content);
      blob = new Blob([csvContent], { type: 'text/csv' });
      extension = 'csv';
      mimeType = 'text/csv';
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  // Create download link
  const filename = `${title.replace(/\s+/g, '_')}_${contentType}.${extension}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertToMarkdown(contentType: SmartModeContentType, content: any, title: string): string {
  let md = `# ${title}\n\n`;
  md += `_Generated: ${new Date().toLocaleDateString()}_\n\n`;

  switch (contentType) {
    case 'notes':
      if (content.summary) {
        md += `## Summary\n\n${content.summary}\n\n`;
      }
      (content.sections || []).forEach((section: any) => {
        md += `## ${section.heading}\n\n`;
        md += `${section.content}\n\n`;
        if (section.keyPoints?.length) {
          md += `**Key Points:**\n`;
          section.keyPoints.forEach((point: string) => {
            md += `- ${point}\n`;
          });
          md += '\n';
        }
      });
      break;

    case 'qa':
      md += `## Questions & Answers\n\n`;
      (content.questions || []).forEach((q: any, i: number) => {
        md += `### ${i + 1}. ${q.question}\n\n`;
        md += `**Answer:** ${q.answer}\n\n`;
        if (q.difficulty) md += `_Difficulty: ${q.difficulty}_\n\n`;
      });
      break;

    case 'interview_prep':
      if (content.behavioralQuestions?.length) {
        md += `## Behavioral Questions\n\n`;
        content.behavioralQuestions.forEach((q: any, i: number) => {
          md += `### ${i + 1}. ${q.question}\n\n`;
          md += `**Sample Answer:** ${q.sampleAnswer}\n\n`;
          if (q.tips?.length) {
            md += `**Tips:**\n`;
            q.tips.forEach((tip: string) => md += `- ${tip}\n`);
            md += '\n';
          }
        });
      }
      if (content.technicalQuestions?.length) {
        md += `## Technical Questions\n\n`;
        content.technicalQuestions.forEach((q: any, i: number) => {
          md += `### ${i + 1}. ${q.question}\n\n`;
          if (q.keyPoints?.length) {
            md += `**Key Points:**\n`;
            q.keyPoints.forEach((point: string) => md += `- ${point}\n`);
            md += '\n';
          }
        });
      }
      if (content.tips?.length) {
        md += `## General Tips\n\n`;
        content.tips.forEach((tip: string) => md += `- ${tip}\n`);
      }
      break;

    case 'exam_questions':
      if (content.multipleChoice?.length) {
        md += `## Multiple Choice Questions\n\n`;
        content.multipleChoice.forEach((q: any, i: number) => {
          md += `### ${i + 1}. ${q.question}\n\n`;
          (q.options || []).forEach((opt: string, j: number) => {
            const marker = j === q.correctAnswer ? '✓' : ' ';
            md += `${marker} ${String.fromCharCode(65 + j)}. ${opt}\n`;
          });
          if (q.explanation) md += `\n_Explanation: ${q.explanation}_\n`;
          md += '\n';
        });
      }
      if (content.shortAnswer?.length) {
        md += `## Short Answer Questions\n\n`;
        content.shortAnswer.forEach((q: any, i: number) => {
          md += `### ${i + 1}. ${q.question} (${q.points || 5} pts)\n\n`;
          md += `**Sample Answer:** ${q.sampleAnswer}\n\n`;
        });
      }
      if (content.essay?.length) {
        md += `## Essay Questions\n\n`;
        content.essay.forEach((q: any, i: number) => {
          md += `### ${i + 1}. ${q.question}\n\n`;
          if (q.timeRecommended) md += `_Recommended time: ${q.timeRecommended}_\n\n`;
          if (q.keyPoints?.length) {
            md += `**Key Points to Cover:**\n`;
            q.keyPoints.forEach((point: string, j: number) => md += `${j + 1}. ${point}\n`);
            md += '\n';
          }
        });
      }
      break;

    case 'teaching_notes':
      if (content.lessonObjectives?.length) {
        md += `## Learning Objectives\n\n`;
        content.lessonObjectives.forEach((obj: string) => md += `- ${obj}\n`);
        md += '\n';
      }
      if (content.keyTopics?.length) {
        md += `## Key Topics\n\n`;
        content.keyTopics.forEach((topic: any) => {
          md += `### ${topic.topic}\n\n`;
          md += `${topic.explanation}\n\n`;
          if (topic.examples?.length) {
            md += `**Examples:**\n`;
            topic.examples.forEach((ex: string) => md += `- ${ex}\n`);
            md += '\n';
          }
        });
      }
      if (content.activities?.length) {
        md += `## Activities\n\n`;
        content.activities.forEach((activity: any) => {
          md += `### ${activity.name}`;
          if (activity.duration) md += ` (${activity.duration})`;
          md += `\n\n${activity.description}\n\n`;
        });
      }
      if (content.assessmentIdeas?.length) {
        md += `## Assessment Ideas\n\n`;
        content.assessmentIdeas.forEach((idea: string) => md += `- ${idea}\n`);
      }
      break;

    case 'flashcards':
      md += `## Flashcards (${content.totalCards || content.cards?.length || 0} cards)\n\n`;
      (content.cards || []).forEach((card: any, i: number) => {
        md += `### Card ${i + 1}\n\n`;
        md += `**Front:** ${card.front}\n\n`;
        md += `**Back:** ${card.back}\n\n`;
        if (card.category) md += `_Category: ${card.category}_\n`;
        if (card.difficulty) md += `_Difficulty: ${card.difficulty}_\n`;
        md += '\n---\n\n';
      });
      break;
  }

  return md;
}

function convertToText(contentType: SmartModeContentType, content: any, title: string): string {
  let txt = `${title}\n${'='.repeat(title.length)}\n\n`;
  txt += `Generated: ${new Date().toLocaleDateString()}\n\n`;

  switch (contentType) {
    case 'notes':
      if (content.summary) {
        txt += `SUMMARY\n${'-'.repeat(7)}\n${content.summary}\n\n`;
      }
      (content.sections || []).forEach((section: any) => {
        txt += `${section.heading.toUpperCase()}\n${'-'.repeat(section.heading.length)}\n`;
        txt += `${section.content}\n\n`;
        if (section.keyPoints?.length) {
          txt += `Key Points:\n`;
          section.keyPoints.forEach((point: string) => txt += `  • ${point}\n`);
          txt += '\n';
        }
      });
      break;

    case 'qa':
      txt += `QUESTIONS & ANSWERS\n${'='.repeat(19)}\n\n`;
      (content.questions || []).forEach((q: any, i: number) => {
        txt += `Q${i + 1}: ${q.question}\n`;
        txt += `A: ${q.answer}\n`;
        if (q.difficulty) txt += `[Difficulty: ${q.difficulty}]\n`;
        txt += '\n';
      });
      break;

    case 'flashcards':
      txt += `FLASHCARDS (${content.totalCards || content.cards?.length || 0} cards)\n${'='.repeat(30)}\n\n`;
      (content.cards || []).forEach((card: any, i: number) => {
        txt += `Card ${i + 1}:\n`;
        txt += `  Front: ${card.front}\n`;
        txt += `  Back: ${card.back}\n`;
        txt += '\n';
      });
      break;

    default:
      // Generic text conversion
      txt += JSON.stringify(content, null, 2);
  }

  return txt;
}

function convertToCSV(contentType: SmartModeContentType, content: any): string {
  const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
  let csv = '';

  switch (contentType) {
    case 'qa':
      csv = 'Question,Answer,Difficulty,Category\n';
      (content.questions || []).forEach((q: any) => {
        csv += `${escape(q.question)},${escape(q.answer)},${escape(q.difficulty || 'medium')},${escape(q.category || '')}\n`;
      });
      break;

    case 'flashcards':
      csv = 'Front,Back,Category,Difficulty\n';
      (content.cards || []).forEach((card: any) => {
        csv += `${escape(card.front)},${escape(card.back)},${escape(card.category || '')},${escape(card.difficulty || 'medium')}\n`;
      });
      break;

    case 'exam_questions':
      csv = 'Type,Question,Answer/Explanation,Points\n';
      (content.multipleChoice || []).forEach((q: any) => {
        const correctOpt = q.options?.[q.correctAnswer] || '';
        csv += `${escape('Multiple Choice')},${escape(q.question)},${escape(correctOpt + ' - ' + (q.explanation || ''))},${escape('1')}\n`;
      });
      (content.shortAnswer || []).forEach((q: any) => {
        csv += `${escape('Short Answer')},${escape(q.question)},${escape(q.sampleAnswer || '')},${escape(String(q.points || 5))}\n`;
      });
      (content.essay || []).forEach((q: any) => {
        csv += `${escape('Essay')},${escape(q.question)},${escape((q.keyPoints || []).join('; '))},${escape('10')}\n`;
      });
      break;

    default:
      // For other types, create a generic key-value CSV
      csv = 'Key,Value\n';
      const flatten = (obj: any, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && !Array.isArray(value)) {
            flatten(value, fullKey);
          } else {
            csv += `${escape(fullKey)},${escape(String(value))}\n`;
          }
        });
      };
      flatten(content);
  }

  return csv;
}

export function getAvailableFormats(contentType: SmartModeContentType): ExportFormat[] {
  // All content types support JSON and Markdown
  const formats: ExportFormat[] = ['json', 'markdown', 'txt'];
  
  // CSV is best for tabular data
  if (['qa', 'flashcards', 'exam_questions'].includes(contentType)) {
    formats.push('csv');
  }
  
  return formats;
}