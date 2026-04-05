// ============================================================
// pexels.ts — Slide image fetching, proxied through /api/pexels
// PEXELS_API_KEY lives server-side — never in the client bundle
// urlToBase64 via canvas stays client-side (correct — it's a DOM op)
// fetchSlideImage, fetchSlideImages, clearImageCache unchanged
// ============================================================

const PEXELS_PROXY = '/api/pexels';

// Simple in-memory cache — keyed by "query:orientation"
const cache = new Map<string, string | null>();

// ── Convert remote image URL → base64 data-URI via canvas ───
// Needed so pptxgenjs can embed images without cross-origin issues.
async function urlToBase64(url: string): Promise<string | null> {
  try {
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth  || 1280;
          canvas.height = img.naturalHeight || 720;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      // Cache-bust to avoid non-CORS cached responses
      img.src = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
    });
  } catch {
    return null;
  }
}

// ── Search via proxy and return base64 of the best result ───
export async function fetchSlideImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
): Promise<string | null> {
  if (!query?.trim()) return null;

  const cacheKey = `${query}:${orientation}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({ query, orientation, per_page: '3' });
    const res    = await fetch(`${PEXELS_PROXY}?${params}`);

    if (!res.ok) {
      console.warn(`[Pexels] Proxy error ${res.status} for query "${query}"`);
      cache.set(cacheKey, null);
      return null;
    }

    const data = await res.json() as { photos?: { url: string; alt: string }[] };

    if (!data.photos?.length) {
      cache.set(cacheKey, null);
      return null;
    }

    const base64 = await urlToBase64(data.photos[0].url);
    cache.set(cacheKey, base64);
    return base64;

  } catch (e) {
    console.warn('[Pexels] fetchSlideImage error:', e);
    cache.set(cacheKey, null);
    return null;
  }
}

// ── Batch fetch — one image per slide in parallel ──────────
export async function fetchSlideImages(
  queries: string[],
): Promise<(string | null)[]> {
  if (!queries.length) return [];
  const results = await Promise.allSettled(
    queries.map(q => fetchSlideImage(q)),
  );
  return results.map(r => (r.status === 'fulfilled' ? r.value : null));
}

// ── Clear cache (useful in tests / dev hot-reload) ─────────
export function clearImageCache(): void {
  cache.clear();
}
