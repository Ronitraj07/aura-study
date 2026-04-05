// ============================================================
// Vercel Edge Function — /api/generate
// Fix #13: Groq key stays server-side, never in client bundle
//
// Replaces all direct VITE_GROQ_API_KEY fetch() calls in the
// browser. Client POSTs { type, payload } here; this function
// calls Groq and returns the raw JSON result.
//
// Supported types:
//   'ppt'        — slide generation
//   'assignment' — assignment generation
//   'notes'      — notes generation
//   'timetable'  — timetable generation
//   'research'   — research pre-pass (8b model)
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'edge' };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODEL_MAP: Record<string, string> = {
  research:   'llama3-8b-8192',
  ppt:        'llama-3.3-70b-versatile',
  assignment: 'llama-3.3-70b-versatile',
  notes:      'llama-3.3-70b-versatile',
  timetable:  'llama-3.3-70b-versatile',
};

const FALLBACK_MODEL = 'llama3-8b-8192';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.VERCEL_ENV === 'production'
    ? 'https://aura-study.vercel.app'   // tighten to your prod domain
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function callGroq(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 6000,
  temperature = 0.75,
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq HTTP ${res.status}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

export default async function handler(req: Request): Promise<Response> {
  // ── CORS preflight ──────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured on server' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { type?: string; systemPrompt?: string; userPrompt?: string; maxTokens?: number; temperature?: number };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { type, systemPrompt, userPrompt, maxTokens, temperature } = body;

  if (!type || !systemPrompt || !userPrompt) {
    return new Response(JSON.stringify({ error: 'Missing required fields: type, systemPrompt, userPrompt' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const primaryModel = MODEL_MAP[type] ?? MODEL_MAP.ppt;

  // ── Try primary model, fall back to 8b if it fails ──────────
  let raw: string;
  try {
    raw = await callGroq(apiKey, primaryModel, systemPrompt, userPrompt, maxTokens, temperature);
  } catch (e) {
    if (primaryModel === FALLBACK_MODEL) throw e;
    console.warn(`[generate] Primary model ${primaryModel} failed, trying fallback...`, e);
    raw = await callGroq(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
  }

  // ── Validate it's parseable JSON before returning ───────────
  try {
    JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'Groq returned non-JSON response', raw }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(raw, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
