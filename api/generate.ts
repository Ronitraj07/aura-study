// ============================================================
// Vercel Edge Function — /api/generate
// Handles all AI generation server-side — keys never reach client
//
// Supported types:
//   'ppt'                — slide generation       (llama-3.3-70b)
//   'assignment'         — assignment generation  (llama-3.3-70b)
//   'assignment_block'   — single block regeneration (llama-3.3-70b)
//   'notes'              — notes generation       (llama-3.3-70b)
//   'notes_section'      — single section regeneration (llama-3.3-70b)
//   'timetable'          — schedule generation    (llama-3.3-70b)
//   'checklist'          — checklist generation   (llama-3.3-70b)
//   'research'           — research pre-pass      (llama-3.1-8b-instant → Gemini 2.5 Flash on 429)
//   'ppt_follow_up'      — PPT follow-up modifications (llama-3.3-70b)
//   'assignment_follow_up' — Assignment follow-up modifications (llama-3.3-70b)
//   'notes_follow_up'    — Notes follow-up modifications (llama-3.3-70b)
// ============================================================

declare const process: {
  env: Record<string, string | undefined>;
};

export const config = { runtime: 'edge' };

const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const MODEL_MAP: Record<string, string> = {
  research:           'llama-3.1-8b-instant',
  ppt:                'llama-3.3-70b-versatile',
  assignment:         'llama-3.3-70b-versatile',
  assignment_block:   'llama-3.3-70b-versatile',
  notes:              'llama-3.3-70b-versatile',
  notes_section:      'llama-3.3-70b-versatile',
  timetable:          'llama-3.3-70b-versatile',
  checklist:          'llama-3.3-70b-versatile',
  // Follow-up system types
  ppt_follow_up:      'llama-3.3-70b-versatile',
  assignment_follow_up: 'llama-3.3-70b-versatile',
  notes_follow_up:    'llama-3.3-70b-versatile',
};

const FALLBACK_MODEL = 'llama3-8b-8192';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Groq caller ────────────────────────────────────────────────
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
    const status = res.status;
    throw Object.assign(
      new Error(err.error?.message ?? `Groq HTTP ${status}`),
      { status },
    );
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

// ── Gemini fallback (research only — 429 rate-limit escape) ───
async function callGeminiResearch(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Gemini HTTP ${res.status}`);
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

// ── Main handler ───────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured on server' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    type?: string;
    systemPrompt?: string;
    userPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  };

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

  let raw: string;

  try {
    // ── Primary Groq call ────────────────────────────────────
    try {
      raw = await callGroq(groqKey, primaryModel, systemPrompt, userPrompt, maxTokens, temperature);
    } catch (e: any) {
      // For non-research types: try fallback 8b model
      if (type !== 'research') {
        if (primaryModel === FALLBACK_MODEL) throw e;
        console.warn(`[generate] ${primaryModel} failed, trying fallback...`);
        raw = await callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
      } else {
        // For research: on 429 try Gemini, otherwise try fallback 8b
        const is429 = e?.status === 429 || String(e?.message).includes('429');
        if (is429) {
          const geminiKey = process.env.GEMINI_API_KEY;
          if (!geminiKey) {
            console.warn('[generate] Groq rate-limited but GEMINI_API_KEY not set — falling back to 8b');
            raw = await callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
          } else {
            console.warn('[generate] Groq rate-limited — falling back to Gemini');
            raw = await callGeminiResearch(geminiKey, userPrompt);
          }
        } else {
          // Non-429 research failure — try fallback 8b before giving up
          if (primaryModel === FALLBACK_MODEL) throw e;
          raw = await callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
        }
      }
    }

    // ── Validate parseable JSON ──────────────────────────────
    JSON.parse(raw);

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? 'AI generation failed' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(raw, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
