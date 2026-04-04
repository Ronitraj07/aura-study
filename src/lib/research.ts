// ============================================================
// research.ts — Free research layer for all AI generators
// Sources: Wikipedia REST API + DuckDuckGo Instant Answer API
// Zero API keys needed. Falls back gracefully if both fail.
// ============================================================

export interface ResearchResult {
  content: string;       // formatted string to inject into prompts
  source: 'wikipedia' | 'duckduckgo' | 'both' | 'none';
  wikiTitle?: string;    // actual Wikipedia article title matched
  wikiUrl?: string;
}

// ── Wikipedia REST API ────────────────────────────────────────
async function fetchWikipedia(topic: string): Promise<string> {
  // First try exact match, then search for best article
  const slug = encodeURIComponent(topic.trim().replace(/\s+/g, '_'));

  try {
    // Direct summary endpoint
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.extract && data.extract.length > 100) {
        return `[Wikipedia: ${data.title}]\n${data.extract}`;
      }
    }

    // Fallback: search Wikipedia for the best matching article
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=1`
    );
    const searchData = await searchRes.json();
    const firstResult = searchData?.query?.search?.[0];

    if (!firstResult) return '';

    // Fetch that article's summary
    const articleSlug = encodeURIComponent(firstResult.title.replace(/\s+/g, '_'));
    const articleRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${articleSlug}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (articleRes.ok) {
      const articleData = await articleRes.json();
      if (articleData.extract && articleData.extract.length > 100) {
        return `[Wikipedia: ${articleData.title}]\n${articleData.extract}`;
      }
    }

    return '';
  } catch {
    return '';
  }
}

// ── DuckDuckGo Instant Answer API ────────────────────────────
async function fetchDuckDuckGo(topic: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`
    );
    if (!res.ok) return '';

    const data = await res.json();

    const parts: string[] = [];

    if (data.AbstractText && data.AbstractText.length > 80) {
      parts.push(`[Overview]\n${data.AbstractText}`);
    }

    // Related topics — extract text snippets
    if (Array.isArray(data.RelatedTopics)) {
      const snippets = data.RelatedTopics
        .filter((t: any) => t.Text && t.Text.length > 30)
        .slice(0, 4)
        .map((t: any) => `• ${t.Text}`);
      if (snippets.length > 0) {
        parts.push(`[Related Points]\n${snippets.join('\n')}`);
      }
    }

    return parts.join('\n\n');
  } catch {
    return '';
  }
}

// ── Main export ───────────────────────────────────────────────
export async function fetchResearch(topic: string): Promise<ResearchResult> {
  if (!topic || topic.trim().length < 3) {
    return { content: '', source: 'none' };
  }

  // Run both in parallel — don't wait for one before starting the other
  const [wikiResult, ddgResult] = await Promise.allSettled([
    fetchWikipedia(topic),
    fetchDuckDuckGo(topic),
  ]);

  const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : '';
  const ddg = ddgResult.status === 'fulfilled' ? ddgResult.value : '';

  // Determine which sources returned useful content
  const hasWiki = wiki.length > 100;
  const hasDdg = ddg.length > 80;

  if (!hasWiki && !hasDdg) {
    return { content: '', source: 'none' };
  }

  const parts: string[] = [];
  if (hasWiki) parts.push(wiki);
  if (hasDdg) parts.push(ddg);

  const content = parts.join('\n\n---\n\n');
  const source = hasWiki && hasDdg ? 'both' : hasWiki ? 'wikipedia' : 'duckduckgo';

  return { content, source };
}

// ── Prompt injection helper ───────────────────────────────────
// Call this to wrap research into a prompt preamble.
// Returns empty string if no research found (prompt stays clean).
export function buildResearchPreamble(research: ResearchResult): string {
  if (!research.content || research.source === 'none') return '';

  return `RESEARCH DATA (use this as your factual basis — do not contradict it):
${research.content}

---

Based on the above research, `;
}
