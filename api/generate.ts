// ============================================================
// Vercel Edge Function — /api/generate
// Dual-AI strategy: Groq + Gemini ALWAYS run in parallel
//
// Research pass  → Groq 8b + Gemini 2.5 Flash fire simultaneously
//                  Results are MERGED (deduped facts, defs, stats)
//                  Merged brief feeds Groq 70b for main generation
//
// Generation pass → Groq 70b (primary, fastest structured JSON)
//                   On hard failure → Gemini 2.5 Flash full generation
//                   On rate-limit   → Groq fallback 8b
//
// Supported types:
//   'ppt'                — slide generation       (Groq 70b)
//   'assignment'         — assignment generation  (Groq 70b)
//   'assignment_block'   — single block regen     (Groq 70b)
//   'notes'              — notes generation       (Groq 70b)
//   'notes_section'      — single section regen   (Groq 70b)
//   'timetable'          — schedule generation    (Groq 70b)
//   'checklist'          — checklist generation   (Groq 70b)
//   'research'           — dual research pre-pass (Groq 8b ‖ Gemini merged)
//   'smart_mode'         — topic analysis         (Groq 8b)
//   'ppt_follow_up'      — PPT modifications      (Groq 70b)
//   'assignment_follow_up' — assignment mods      (Groq 70b)
//   'notes_follow_up'    — notes modifications    (Groq 70b)
// ============================================================

declare const process: {
  env: Record<string, string | undefined>;
};

export const config = { runtime: 'edge' };

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const MODEL_MAP: Record<string, string> = {
  research:             'llama-3.1-8b-instant',
  smart_mode:           'llama-3.1-8b-instant',
  ppt:                  'llama-3.3-70b-versatile',
  assignment:           'llama-3.3-70b-versatile',
  assignment_block:     'llama-3.3-70b-versatile',
  notes:                'llama-3.3-70b-versatile',
  notes_stream:         'llama-3.3-70b-versatile', // Phase 1: streaming generation
  notes_section:        'llama-3.3-70b-versatile',
  timetable:            'llama-3.3-70b-versatile',
  checklist:            'llama-3.3-70b-versatile',
  ppt_follow_up:        'llama-3.3-70b-versatile',
  assignment_follow_up: 'llama-3.3-70b-versatile',
  notes_follow_up:      'llama-3.3-70b-versatile',
};

const FALLBACK_MODEL = 'llama3-8b-8192';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.VERCEL_ENV === 'production'
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
    throw Object.assign(
      new Error(err.error?.message ?? `Groq HTTP ${res.status}`),
      { status: res.status },
    );
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '{}';
}

// ── Gemini caller (JSON mode) ──────────────────────────────────
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 6000,
  temperature = 0.75,
): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
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

// ── Merge two research JSON strings into one richer brief ─────
function mergeResearch(
  groqRaw: string | null,
  geminiRaw: string | null,
): string {
  const parse = (s: string | null) => {
    if (!s) return null;
    try { return JSON.parse(s) as Record<string, unknown>; } catch { return null; }
  };

  const g = parse(groqRaw);
  const m = parse(geminiRaw);

  if (!g && !m) return '{}';
  if (!g) return geminiRaw!;
  if (!m) return groqRaw!;

  const mergeArr = (a: unknown, b: unknown): string[] => {
    const arr = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])] as string[];
    const seen = new Set<string>();
    return arr.filter(s => {
      const key = String(s).toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const mergeDefs = (a: unknown, b: unknown): Record<string, string> => ({
    ...((typeof b === 'object' && b !== null) ? b as Record<string, string> : {}),
    ...((typeof a === 'object' && a !== null) ? a as Record<string, string> : {}),
  });

  const merged = {
    facts:       mergeArr(g.facts,    m.facts).slice(0, 12),
    keyStats:    mergeArr(g.keyStats, m.keyStats).slice(0, 6),
    keyTerms:    mergeArr(g.keyTerms, m.keyTerms).slice(0, 8),
    definitions: mergeDefs(g.definitions, m.definitions),
    context: (typeof m.context === 'string' && m.context.length > 10)
      ? m.context
      : (typeof g.context === 'string' ? g.context : ''),
    _sources: 'groq+gemini',
  };

  return JSON.stringify(merged);
}

// ── Dual research: fires Groq 8b + Gemini simultaneously ──────
async function dualResearch(
  groqKey: string,
  geminiKey: string | undefined,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const groqPromise = callGroq(groqKey, 'llama-3.1-8b-instant', systemPrompt, userPrompt, 1500, 0.15)
    .catch((e) => { console.warn('[research] Groq 8b failed:', e?.message); return null; });

  const geminiPromise = geminiKey
    ? callGemini(geminiKey, systemPrompt, userPrompt, 1500, 0.15)
        .catch((e) => { console.warn('[research] Gemini research failed:', e?.message); return null; })
    : Promise.resolve(null);

  const [groqRaw, geminiRaw] = await Promise.all([groqPromise, geminiPromise]);

  if (!groqRaw && !geminiRaw) {
    return callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, 1500, 0.15)
      .catch(() => '{}');
  }

  return mergeResearch(groqRaw, geminiRaw);
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

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

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
    // ── STREAMING: pipe Groq SSE directly to the client ──────
    if (type === 'notes_stream') {
      const groqStream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
          stream: true,
          max_tokens: maxTokens ?? 4500,
          temperature: temperature ?? 0.35,
          response_format: { type: 'json_object' },
        }),
      });

      if (!groqStream.ok) {
        const err = await groqStream.json().catch(() => ({})) as { error?: { message?: string } };
        return new Response(
          JSON.stringify({ error: err.error?.message ?? `Groq HTTP ${groqStream.status}` }),
          { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(groqStream.body, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // ── RESEARCH: dual parallel pass ─────────────────────────
    if (type === 'research') {
      raw = await dualResearch(groqKey, geminiKey, systemPrompt, userPrompt);

    // ── GENERATION: Groq 70b primary, Gemini full fallback ───
    } else {
      try {
        raw = await callGroq(groqKey, primaryModel, systemPrompt, userPrompt, maxTokens, temperature);
      } catch (e: any) {
        const is429 = e?.status === 429 || String(e?.message).includes('429');

        if (is429 && geminiKey) {
          console.warn(`[generate] Groq ${primaryModel} rate-limited — trying Gemini 2.5 Flash`);
          try {
            raw = await callGemini(geminiKey, systemPrompt, userPrompt, maxTokens, temperature);
          } catch (geminiErr: any) {
            console.warn('[generate] Gemini fallback failed — trying Groq 8b:', geminiErr?.message);
            raw = await callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
          }
        } else {
          if (primaryModel === FALLBACK_MODEL) throw e;
          console.warn(`[generate] ${primaryModel} failed — trying Groq fallback 8b`);
          try {
            raw = await callGroq(groqKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature);
          } catch (fallbackErr: any) {
            if (!geminiKey) throw fallbackErr;
            console.warn('[generate] Groq 8b also failed — trying Gemini 2.5 Flash');
            raw = await callGemini(geminiKey, systemPrompt, userPrompt, maxTokens, temperature);
          }
        }
      }
    }

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
