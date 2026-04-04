// ============================================================
// pexels.ts — Slide image fetching via Pexels API
// ✔ Raw fetch (avoids Pexels-JS CORS bug on Firefox/Safari)
// ✔ Converts to base64 via canvas so pptxgenjs can embed it
// ✔ Never throws — returns null on any failure (graceful)
// ✔ In-memory cache so same query doesn't hit API twice
// ============================================================

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;
const BASE_URL = 'https://api.pexels.com/v1';

interface PexelsPhoto {
  id: number;
  src: {
    large:    string;
    medium:   string;
    original: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

// Simple in-memory cache — keyed by query string
const cache = new Map<string, string | null>();

// ── Convert remote image URL → base64 data-URI via canvas ────
// This sidesteps pptxgenjs's internal fetch which can fail on
// cross-origin redirects in some browsers.
async function urlToBase64(url: string): Promise<string | null> {
  try {
    // Use a proxy-friendly approach: draw onto canvas → toDataURL
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          // dataUrl = "data:image/jpeg;base64,..."
          resolve(dataUrl);
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);

      // Add cache-busting param so browser doesn't use a cached
      // non-CORS response
      img.src = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
    });
  } catch {
    return null;
  }
}

// ── Search Pexels and return base64 of the best result ───────
export async function fetchSlideImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn('[Pexels] VITE_PEXELS_API_KEY not set — skipping image fetch.');
    return null;
  }

  const cacheKey = `${query}:${orientation}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({
      query,
      per_page:    '3',   // fetch 3, pick the best one
      orientation,
      size:        'large',
    });

    const res = await fetch(`${BASE_URL}/search?${params}`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!res.ok) {
      console.warn(`[Pexels] API error ${res.status} for query "${query}"`);
      cache.set(cacheKey, null);
      return null;
    }

    const data: PexelsSearchResponse = await res.json();
    if (!data.photos?.length) {
      cache.set(cacheKey, null);
      return null;
    }

    // Pick the first photo; use .large (1280px wide) for good quality
    const photo = data.photos[0];
    const imageUrl = photo.src.large;

    const base64 = await urlToBase64(imageUrl);
    cache.set(cacheKey, base64);
    return base64;
  } catch (e) {
    console.warn('[Pexels] fetch failed:', e);
    cache.set(cacheKey, null);
    return null;
  }
}

// ── Batch fetch — one image per slide in parallel ─────────────
// Returns array in the same order as queries.
// Any failed fetch → null at that index (slide gets no image).
export async function fetchSlideImages(
  queries: string[],
): Promise<(string | null)[]> {
  if (!queries.length) return [];
  const results = await Promise.allSettled(
    queries.map(q => fetchSlideImage(q))
  );
  return results.map(r => (r.status === 'fulfilled' ? r.value : null));
}

// ── Clear cache (useful after tests / dev hot-reload) ─────────
export function clearImageCache(): void {
  cache.clear();
}
