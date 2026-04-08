// ============================================================
// AI Router — Intelligent service selection with fallback
// ============================================================

import { callGroq, groqTechnical, groqFast, groqCreative } from './groq.js';
import { callGemini, geminiFast, geminiPro } from './gemini.js';
import { validateService } from './ai-health.js';

export type ContentType =
  | 'notes' | 'notes_exam' | 'notes_section'
  | 'ppt_creative' | 'ppt_basic' | 'ppt_follow_up'
  | 'assignment' | 'assignment_block' | 'assignment_follow_up'
  | 'research' | 'checklist' | 'timetable' | 'subtopic_suggestions';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResult {
  success: boolean;
  content?: string;
  error?: string;
  service?: string;
  fallbackUsed?: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

interface RouteOptions {
  forceService?: string;
  skipValidation?: boolean;
  skipFallback?: boolean;
}

// Service priority map per content type
const SERVICE_ROUTES: Record<ContentType, string[]> = {
  ppt_creative:          ['groq-creative', 'groq-70b', 'gemini-flash'],
  ppt_basic:             ['groq-70b', 'gemini-flash', 'groq-fast'],
  ppt_follow_up:         ['groq-creative', 'groq-70b', 'gemini-flash'],
  assignment:            ['groq-70b', 'gemini-flash', 'groq-fast'],
  assignment_block:      ['groq-70b', 'gemini-flash', 'groq-fast'],
  assignment_follow_up:  ['groq-70b', 'gemini-flash', 'groq-fast'],
  notes:                 ['groq-70b', 'gemini-flash', 'groq-fast'],
  notes_exam:            ['gemini-flash', 'groq-70b', 'groq-fast'],
  notes_section:         ['groq-70b', 'gemini-flash', 'groq-fast'],
  timetable:             ['gemini-flash', 'groq-fast', 'groq-70b'],
  checklist:             ['gemini-flash', 'groq-fast', 'groq-70b'],
  research:              ['gemini-flash', 'groq-fast', 'groq-70b'],
  subtopic_suggestions:  ['groq-fast', 'gemini-flash', 'groq-70b'],
};

const SERVICE_FUNCTIONS: Record<string, (messages: AIMessage[]) => Promise<AIResult>> = {
  'groq-70b':      groqTechnical as any,
  'groq-fast':     groqFast as any,
  'groq-creative': groqCreative as any,
  'gemini-flash':  geminiFast as any,
  'gemini-pro':    geminiPro as any,
};

export async function routeToAI(
  contentType: ContentType,
  messages: AIMessage[],
  options: RouteOptions = {}
): Promise<AIResult> {
  const { forceService, skipValidation = false, skipFallback = false } = options;

  const services = forceService
    ? [forceService, ...(skipFallback ? [] : (SERVICE_ROUTES[contentType] || []).filter(s => s !== forceService))]
    : SERVICE_ROUTES[contentType] || ['groq-70b'];

  let lastError = '';

  for (const serviceName of services) {
    const serviceFunc = SERVICE_FUNCTIONS[serviceName];
    if (!serviceFunc) {
      console.warn(`Unknown service: ${serviceName}`);
      continue;
    }

    if (!skipValidation && serviceName !== services[0]) {
      try {
        const isValid = await validateService(serviceName);
        if (!isValid) {
          console.warn(`Service ${serviceName} failed validation, skipping`);
          continue;
        }
      } catch {
        console.warn(`Validation error for ${serviceName}, skipping`);
        continue;
      }
    }

    try {
      console.log(`🤖 Trying ${serviceName} for ${contentType}`);
      const result = await serviceFunc(messages);

      if (result.success) {
        return {
          ...result,
          service: serviceName,
          fallbackUsed: serviceName !== services[0],
        };
      }

      lastError = result.error || `${serviceName} returned failure`;
      console.warn(`${serviceName} failed: ${lastError}`);

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`${serviceName} threw: ${lastError}`);
    }

    if (skipFallback) break;
  }

  return {
    success: false,
    error: lastError || 'All AI services failed',
    service: 'none',
    fallbackUsed: false,
  };
}
