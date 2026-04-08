// ============================================================
// Vercel Edge Function — /api/generate
// Enhanced with Multi-AI Routing and Service Validation
//
// Supported types:
//   'ppt_creative'       — creative slide generation       (Grok → Groq 70b)
//   'ppt_basic'          — basic slide generation          (Groq 70b → Gemini Flash)
//   'assignment'         — assignment generation           (Groq 70b → Gemini Flash)
//   'assignment_block'   — single block regeneration      (Groq 70b → Gemini Flash)
//   'notes'              — notes generation               (Groq 70b → Gemini Flash)
//   'notes_exam'         — exam-focused notes             (Gemini Flash → Groq 70b)
//   'notes_section'      — single section regeneration    (Groq 70b → Gemini Flash)
//   'timetable'          — schedule generation            (Gemini Flash → Groq Fast)
//   'checklist'          — checklist generation           (Gemini Flash → Groq Fast)
//   'research'           — research pre-pass              (Gemini Flash → Groq Fast)
//   'ppt_follow_up'      — PPT follow-up modifications    (Grok → Groq 70b)
//   'assignment_follow_up' — Assignment follow-up modifications (Groq 70b → Gemini Flash)
//   'subtopic_suggestions' — AI subtopic suggestions      (Groq Fast → Gemini Flash)
// ============================================================

import { routeToAI, type ContentType, type AIMessage } from './ai-router';
import { validateService } from './ai-health';

declare const process: {
  env: Record<string, string | undefined>;
};

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Main handler with AI Routing & Validation ─────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    type?: string;
    systemPrompt?: string;
    userPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    mode?: 'creative' | 'basic' | 'exam' | 'section' | 'block' | 'follow_up';
    options?: {
      forceService?: string;
      skipValidation?: boolean;
      skipFallback?: boolean;
    };
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { type, systemPrompt, userPrompt, maxTokens, temperature, mode, options = {} } = body;

  if (!type || !systemPrompt || !userPrompt) {
    return new Response(JSON.stringify({ error: 'Missing required fields: type, systemPrompt, userPrompt' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Map type and mode to ContentType
  let contentType: ContentType;
  
  if (type === 'ppt') {
    contentType = mode === 'creative' ? 'ppt_creative' : 
                 mode === 'follow_up' ? 'ppt_follow_up' : 'ppt_basic';
  } else if (type === 'notes') {
    contentType = mode === 'exam' ? 'notes_exam' : 
                 mode === 'section' ? 'notes_section' : 'notes';
  } else if (type === 'assignment') {
    contentType = mode === 'block' ? 'assignment_block' :
                 mode === 'follow_up' ? 'assignment_follow_up' : 'assignment';
  } else if (['checklist', 'timetable', 'research', 'subtopic_suggestions'].includes(type)) {
    contentType = type as ContentType;
  } else {
    contentType = 'notes'; // Default fallback
  }

  // Validate content type
  const validTypes: ContentType[] = [
    'notes', 'notes_exam', 'notes_section', 
    'ppt_creative', 'ppt_basic', 'ppt_follow_up',
    'assignment', 'assignment_block', 'assignment_follow_up',
    'research', 'checklist', 'timetable', 'subtopic_suggestions'
  ];

  if (!validTypes.includes(contentType)) {
    return new Response(JSON.stringify({ error: `Unsupported content type: ${type}` }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Prepare messages for AI router
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  console.log(`🚀 Generate request: ${contentType} (${type}/${mode || 'default'})`);

  // Pre-validate primary service if specified (for debugging)
  if (options.forceService && !options.skipValidation) {
    console.log(`🔍 Pre-validating forced service: ${options.forceService}`);
    try {
      const isValid = await validateService(options.forceService);
      if (!isValid) {
        console.log(`⚠️ Warning: Forced service ${options.forceService} validation failed, continuing anyway`);
      }
    } catch (validationError) {
      console.log(`⚠️ Service validation error: ${validationError}`);
    }
  }

  try {
    // Use AI router for intelligent service selection with validation
    const result = await routeToAI(contentType, messages, {
      forceService: options.forceService as any,
      skipValidation: options.skipValidation,
      skipFallback: options.skipFallback,
    });

    if (!result.success) {
      console.error(`❌ Generation failed for ${contentType}: ${result.error}`);
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        metadata: {
          service: result.service,
          contentType,
          fallbackUsed: result.fallbackUsed,
        }
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const raw = result.content || '{}';
    
    console.log(`✅ Generated ${contentType} using ${result.service}`);

    // Log usage if available
    if (result.usage) {
      console.log(`📊 Token usage:`, result.usage);
    }

    // Validate parseable JSON
    try {
      JSON.parse(raw);
    } catch (parseError) {
      console.error(`❌ Invalid JSON response from ${result.service}:`, parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'AI service returned invalid JSON',
        metadata: {
          service: result.service,
          contentType,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(raw, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`❌ Generate API error:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
