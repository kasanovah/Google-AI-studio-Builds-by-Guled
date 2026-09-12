import fs from 'fs';
import path from 'path';
import { execAsync } from './execAsync.js';

// Pexels' free API allows commercial use and permits 200 requests/hour and
// 20,000/month — about 3,300 six-scene reels a month at no cost. Their API
// guidelines ask for a visible link back to Pexels and photographer credit
// where possible, which is why every result carries its photographer through
// to the UI rather than being used anonymously.
const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

export interface PexelsImageResult {
  jpgPath: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  query: string;
}

export function isPexelsConfigured(): boolean {
  return !!process.env.PEXELS_API_KEY?.trim();
}

/**
 * Builds a photo-search query from the scene's own English visual keywords.
 *
 * Pexels matches short, concrete noun phrases; the long cinematic prompts
 * written for an image generator ("Macro ground-level POV of...") return
 * nothing useful, so only the keyword tags and subject nouns are used.
 */
function buildQuery(params: {
  visualKeywords?: string[];
  visualObjective?: string;
  topic?: string;
}): string {
  const keywords = (params.visualKeywords || [])
    .map((k) => String(k).trim())
    .filter(Boolean);

  if (keywords.length > 0) {
    // Two or three tags is the sweet spot: one is too broad, and every tag
    // ANDed together usually returns an empty set.
    return keywords.slice(0, 2).join(' ');
  }

  // visualObjective is an English sentence; its first few words are usually
  // the concrete subject ("Airborne multispectral scanning of farmland").
  const objective = (params.visualObjective || '').trim();
  if (objective) return objective.split(/\s+/).slice(0, 4).join(' ');

  return (params.topic || 'technology').trim();
}

async function searchPexels(query: string, apiKey: string): Promise<any[]> {
  const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&orientation=portrait&size=large&per_page=15`;
  const response = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${body.slice(0, 200) || 'Pexels search failed'}`);
  }

  const payload: any = await response.json().catch(() => ({}));
  return Array.isArray(payload?.photos) ? payload.photos : [];
}

/**
 * Finds a real photograph for a scene and returns it cropped to the reel's
 * 1080x1920 frame.
 *
 * This is the free visual tier: when no AI image provider has credit, a reel
 * still gets genuine professional photography instead of the offline
 * placeholder card.
 */
export async function fetchPexelsSceneImage(params: {
  sceneNumber: number;
  topic?: string;
  visualObjective?: string;
  visualKeywords?: string[];
  outputDir?: string;
  usedAssets?: string[];
}): Promise<PexelsImageResult> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is not configured');
  }

  const { sceneNumber, outputDir = '/tmp', usedAssets = [] } = params;

  // Try the specific keyword query first, then progressively broader ones, so
  // a niche scene still gets a relevant photo rather than nothing.
  const primary = buildQuery(params);
  const queries = [
    primary,
    (params.visualKeywords || [])[0] || '',
    'technology innovation',
  ].map((q) => q.trim()).filter((q, i, arr) => q && arr.indexOf(q) === i);

  let lastError: any = null;

  for (const query of queries) {
    try {
      const photos = await searchPexels(query, apiKey);
      if (photos.length === 0) {
        lastError = new Error(`No Pexels results for "${query}"`);
        continue;
      }

      // Never reuse a photo already placed in this reel — repeated stock
      // images across scenes is the tell-tale sign of automated filler.
      const unused = photos.filter((p: any) => !usedAssets.some((a) => a.includes(String(p.id))));
      const chosen = (unused.length > 0 ? unused : photos)[0];

      const sourceUrl = chosen?.src?.original || chosen?.src?.large2x || chosen?.src?.large;
      if (!sourceUrl) {
        lastError = new Error('Pexels result had no usable image URL');
        continue;
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const rawPath = path.join(outputDir, `scene_${sceneNumber}_pexels_${chosen.id}_raw.jpg`);
      const jpgPath = path.join(outputDir, `scene_${sceneNumber}_pexels_${chosen.id}.jpg`);

      const imageRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000) });
      if (!imageRes.ok) {
        lastError = new Error(`Could not download Pexels photo (HTTP ${imageRes.status})`);
        continue;
      }
      fs.writeFileSync(rawPath, Buffer.from(await imageRes.arrayBuffer()));

      // Cover-and-crop to the reel frame, the same treatment every other
      // visual source gets, so the scene renderer receives a true 9:16 image.
      await execAsync(
        `ffmpeg -y -i "${rawPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 2 "${jpgPath}"`
      );

      if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
        lastError = new Error('Pexels photo was written but appears invalid');
        continue;
      }

      try {
        fs.unlinkSync(rawPath);
      } catch {}

      console.log(`[Pexels] Scene ${sceneNumber}: "${query}" -> photo ${chosen.id} by ${chosen.photographer}`);
      return {
        jpgPath,
        photographer: chosen.photographer || 'Unknown',
        photographerUrl: chosen.photographer_url || '',
        photoUrl: chosen.url || '',
        query,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Pexels] Scene ${sceneNumber} query "${query}" failed: ${err?.message || err}`);
    }
  }

  throw new Error(`Pexels lookup failed for Scene ${sceneNumber}: ${lastError?.message || 'no usable photo found'}`);
}

/** Live check of the Pexels path for the in-app diagnostic. */
export async function diagnosePexels(): Promise<Record<string, unknown>> {
  if (!isPexelsConfigured()) {
    return { configured: false, note: 'PEXELS_API_KEY is not set on this server.' };
  }
  try {
    const photos = await searchPexels('technology innovation', process.env.PEXELS_API_KEY!.trim());
    return { configured: true, ok: photos.length > 0, results: photos.length };
  } catch (err: any) {
    return { configured: true, ok: false, error: (err?.message || String(err)).slice(0, 300) };
  }
}
