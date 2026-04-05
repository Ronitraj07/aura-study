// ============================================================
// Vercel Edge Function — /api/pexels
// Proxies Pexels image search server-side.
// PEXELS_API_KEY lives in env — never reaches the client bundle.
//
// GET /api/pexels?query=<topic>&orientation=landscape&per_page=3
// Returns: { photos: [{ url: string, alt: string }] }
// ============================================================

export const config = { runtime: 'edge' };

const PEXELS_BASE = 'https://api.pexels.com/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return json({ error: 'PEXELS_API_KEY not configured on server' }, 500);
  }

  const url     = new URL(req.url);
  const query   = url.searchParams.get('query')?.trim();
  const orient  = url.searchParams.get('orientation') ?? 'landscape';
  const perPage = url.searchParams.get('per_page')    ?? '3';

  if (!query) {
    return json({ error: 'Missing required query param: query' }, 400);
  }

  const params = new URLSearchParams({
    query,
    per_page:    perPage,
    orientation: orient,
    size:        'large',
  });

  try {
    const res = await fetch(`${PEXELS_BASE}/search?${params}`, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      return json({ error: err.error ?? `Pexels HTTP ${res.status}` }, 502);
    }

    const data = await res.json() as {
      photos: { id: number; src: { large: string; medium: string }; alt: string }[];
    };

    // Only return what the client needs — no extra Pexels metadata
    const photos = (data.photos ?? []).map(p => ({
      url: p.src.large,
      alt: p.alt ?? '',
    }));

    return json({ photos });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Pexels fetch failed' }, 502);
  }
}
