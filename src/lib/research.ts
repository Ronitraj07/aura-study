// ============================================================
// research.ts — Groq-only double-pass research layer
// Pass 1: llama-3.1-8b-instant (14,400 RPD) → fast structured facts
// Pass 2: Caller injects preamble into their main generation prompt
// Fallback: Gemini 2.5 Flash if Groq rate-limited (429)
// Falls back to empty string if both fail — generators work without it
// ============================================================

export interface ResearchResult {
  content: string;         // formatted preamble to inject into prompts
  source: 'groq' | 'gemini' | 'none';
  facts: string[];         // extracted fact list (useful for UI badge)
  keyTerms: string[];      // key vocabulary extracted
}

// ── Groq research pass (llama-3.1-8b-instant — 14,400 RPD) ───
async function fetchFromGroq(topic: string): Promise<ResearchResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set');

  const prompt = `You are a factual research assistant. Your job is to produce a structured research brief about the topic below.

Topic: "${topic}"

Return ONLY valid JSON — no markdown, no code blocks, no explanation. Strict format:
{
  "facts": [
    "<verified factual statement — 1 sentence each>",
    "<verified factual statement>",
    "<verified factual statement>",
    "<verified factual statement>",
    "<verified factual statement>",
    "<verified factual statement>",
    "<verified factual statement>",
    "<verified factual statement>"
  ],
  "definitions": {
    "<key term 1>": "<clear definition>",
    "<key term 2>": "<clear definition>",
    "<key term 3>": "<clear definition>"
  },
  "keyStats": [
    "<specific statistic or data point with context>",
    "<specific statistic or data point with context>",
    "<specific statistic or data point with context>"
  ],
  "keyTerms": ["<term1>", "<term2>", "<term3>", "<term4>", "<term5>"],
  "context": "<2-3 sentence summary of why this topic matters and its broader significance>"
}

Rules:
- facts must be accurate, specific, and non-trivial — not vague generalisations
- keyStats should include numbers, dates, percentages, or quantities where possible
- If the topic is technical, include foundational concepts in definitions
- If the topic is historical, include timeline context in facts
- If the topic is current/niche and you are uncertain, still provide your best structured knowledge`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Output ONLY valid JSON. No markdown. No explanation. No code blocks.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    throw Object.assign(new Error(err.error?.message ?? `Groq HTTP ${status}`), { status });
  }

  const data = await res.json();
  const raw = data.choices[0]?.message?.content ?? '';
  const parsed = JSON.parse(raw);

  const facts: string[] = Array.isArray(parsed.facts) ? parsed.facts : [];
  const keyTerms: string[] = Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [];
  const keyStats: string[] = Array.isArray(parsed.keyStats) ? parsed.keyStats : [];
  const definitions: Record<string, string> = parsed.definitions ?? {};
  const context: string = parsed.context ?? '';

  const defLines = Object.entries(definitions)
    .map(([term, def]) => `• ${term}: ${def}`)
    .join('\n');

  const content = [
    context ? `[Context]\n${context}` : '',
    facts.length > 0 ? `[Key Facts]\n${facts.map(f => `• ${f}`).join('\n')}` : '',
    keyStats.length > 0 ? `[Statistics & Data]\n${keyStats.map(s => `• ${s}`).join('\n')}` : '',
    defLines ? `[Key Definitions]\n${defLines}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { content, source: 'groq', facts, keyTerms };
}

// ── Gemini fallback (gemini-2.5-flash — 500 RPD, 1M context) ──
async function fetchFromGemini(topic: string): Promise<ResearchResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set — Gemini fallback unavailable');

  const prompt = `You are a factual research assistant. Produce a structured research brief about: "${topic}"

Return ONLY valid JSON:
{
  "facts": ["<fact>", "<fact>", "<fact>", "<fact>", "<fact>", "<fact>"],
  "keyStats": ["<stat>", "<stat>", "<stat>"],
  "keyTerms": ["<term>", "<term>", "<term>", "<term>"],
  "context": "<2-3 sentence summary>"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Gemini HTTP ${res.status}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = JSON.parse(raw);

  const facts: string[] = Array.isArray(parsed.facts) ? parsed.facts : [];
  const keyTerms: string[] = Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [];
  const keyStats: string[] = Array.isArray(parsed.keyStats) ? parsed.keyStats : [];
  const context: string = parsed.context ?? '';

  const content = [
    context ? `[Context]\n${context}` : '',
    facts.length > 0 ? `[Key Facts]\n${facts.map(f => `• ${f}`).join('\n')}` : '',
    keyStats.length > 0 ? `[Statistics & Data]\n${keyStats.map(s => `• ${s}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { content, source: 'gemini', facts, keyTerms };
}

// ── Main export ───────────────────────────────────────────────
export async function fetchResearch(topic: string): Promise<ResearchResult> {
  const empty: ResearchResult = { content: '', source: 'none', facts: [], keyTerms: [] };

  if (!topic || topic.trim().length < 3) return empty;

  try {
    return await fetchFromGroq(topic);
  } catch (e: any) {
    // On rate-limit (429) try Gemini fallback
    if (e?.status === 429 || e?.message?.includes('429')) {
      console.warn('[research] Groq rate-limited — falling back to Gemini');
      try {
        return await fetchFromGemini(topic);
      } catch (geminiErr) {
        console.warn('[research] Gemini fallback also failed:', geminiErr);
        return empty;
      }
    }
    // Any other error — fail silently so generators still work
    console.warn('[research] fetchResearch failed:', e?.message);
    return empty;
  }
}

// ── Prompt injection helper ───────────────────────────────────
// Wraps research into a system-level preamble for the generation prompt.
// Returns empty string if no research found — prompt stays clean.
export function buildResearchPreamble(research: ResearchResult): string {
  if (!research.content || research.source === 'none') return '';

  return `VERIFIED RESEARCH DATA (treat this as your factual foundation — do not contradict these facts):
${research.content}

---

Using the above research as your factual basis, `;
}
