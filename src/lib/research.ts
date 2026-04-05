// ============================================================
// research.ts — research pre-pass, proxied through /api/generate
// Groq (llama-3.1-8b-instant) → Gemini 2.5 Flash on 429
// Both keys live server-side — nothing exposed to client bundle
// buildResearchPreamble unchanged — callers unaffected
// ============================================================

export interface ResearchResult {
  content: string;
  source: 'groq' | 'gemini' | 'none';
  facts: string[];
  keyTerms: string[];
}

const RESEARCH_SYSTEM_PROMPT =
  'You are a research assistant. Output ONLY valid JSON. No markdown. No explanation. No code blocks.';

function buildResearchUserPrompt(topic: string): string {
  return `You are a factual research assistant. Your job is to produce a structured research brief about the topic below.

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
}

// ── Parse raw JSON from either Groq or Gemini into ResearchResult ──
function parseResearchJson(
  raw: Record<string, unknown>,
  source: 'groq' | 'gemini',
): ResearchResult {
  const facts: string[]    = Array.isArray(raw.facts)    ? (raw.facts as string[])    : [];
  const keyTerms: string[] = Array.isArray(raw.keyTerms) ? (raw.keyTerms as string[]) : [];
  const keyStats: string[] = Array.isArray(raw.keyStats) ? (raw.keyStats as string[]) : [];
  const definitions        = (raw.definitions ?? {}) as Record<string, string>;
  const context            = typeof raw.context === 'string' ? raw.context : '';

  const defLines = Object.entries(definitions)
    .map(([term, def]) => `• ${term}: ${def}`)
    .join('\n');

  const content = [
    context     ? `[Context]\n${context}` : '',
    facts.length    > 0 ? `[Key Facts]\n${facts.map(f => `• ${f}`).join('\n')}`       : '',
    keyStats.length > 0 ? `[Statistics & Data]\n${keyStats.map(s => `• ${s}`).join('\n')}` : '',
    defLines        ? `[Key Definitions]\n${defLines}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { content, source, facts, keyTerms };
}

// ── Main export ───────────────────────────────────────────────
export async function fetchResearch(topic: string): Promise<ResearchResult> {
  const empty: ResearchResult = { content: '', source: 'none', facts: [], keyTerms: [] };

  if (!topic || topic.trim().length < 3) return empty;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'research',
        systemPrompt: RESEARCH_SYSTEM_PROMPT,
        userPrompt:   buildResearchUserPrompt(topic),
        maxTokens:    1500,
        temperature:  0.15,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      console.warn('[research] /api/generate failed:', err.error);
      return empty;
    }

    const raw = await res.json() as Record<string, unknown>;

    // Detect which model responded by checking for a 'source' hint
    // The edge function doesn't send a source tag — we infer from structure:
    // Gemini responses omit 'definitions' key; Groq always includes it.
    const source: 'groq' | 'gemini' = 'definitions' in raw ? 'groq' : 'gemini';

    return parseResearchJson(raw, source);

  } catch (e: any) {
    console.warn('[research] fetchResearch error:', e?.message);
    return empty;
  }
}

// ── Prompt injection helper ───────────────────────────────────
export function buildResearchPreamble(research: ResearchResult): string {
  if (!research.content || research.source === 'none') return '';

  return `VERIFIED RESEARCH DATA (treat this as your factual foundation — do not contradict these facts):
${research.content}

---

Using the above research as your factual basis, `;
}
