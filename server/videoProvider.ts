import fs from 'fs';
import path from 'path';
import { GoogleGenAI, GenerateContentConfig } from '@google/genai';
import { execAsync } from './execAsync.js';

export interface VisualAssetResult {
  assetPath: string;
  type: 'video' | 'image';
  source: 'uploaded_flow' | 'bespoke_scene_visual' | 'matched_asset' | 'ai_generated_visual';
  // Populated only when AI image generation was attempted and failed, so the
  // downgrade to the offline placeholder graphic is reported instead of
  // silently passing as if it were the intended cinematic visual.
  fallbackReason?: string;
}

export interface ResolveVisualParams {
  sceneNumber: number;
  totalScenes?: number;
  topic?: string;
  voiceover?: string;
  caption?: string;
  keyMessage?: string;
  visualObjective?: string;
  subject?: string;
  action?: string;
  environment?: string;
  cameraComposition?: string;
  visualPrompt?: string;
  flowPrompt?: string;
  visualKeywords?: string[];
  visualUrl?: string;
  videoUrl?: string;
  outputDir?: string;
  previousAsset?: string;
  usedAssets?: string[];
}

/**
 * Palette archetypes for high-contrast, topic-grounded 9:16 visuals.
 * Every domain has distinct background stops, accent glow, and border illumination.
 */
interface ColorTheme {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  primary: string;
  secondary: string;
  lightText: string;
}

function getTopicTheme(context: string): ColorTheme {
  const c = context.toLowerCase();

  if (c.includes('beer') || c.includes('farm') || c.includes('agri') || c.includes('dalag') || c.includes('waraab')) {
    // Agriculture & Environment
    return {
      bgStart: '#011c14',
      bgMid: '#064e3b',
      bgEnd: '#02120d',
      primary: '#10b981',
      secondary: '#34d399',
      lightText: '#ecfdf5',
    };
  }

  if (c.includes('ammaan') || c.includes('security') || c.includes('hack') || c.includes('phish') || c.includes('threat')) {
    // Cyber Security
    return {
      bgStart: '#1a040b',
      bgMid: '#4c0519',
      bgEnd: '#0f0206',
      primary: '#f43f5e',
      secondary: '#fb7185',
      lightText: '#fff1f2',
    };
  }

  if (c.includes('lacag') || c.includes('zaad') || c.includes('evc') || c.includes('fintech') || c.includes('bangi')) {
    // FinTech & Mobile Money
    return {
      bgStart: '#191203',
      bgMid: '#453307',
      bgEnd: '#0d0901',
      primary: '#f59e0b',
      secondary: '#fbbf24',
      lightText: '#fffbeb',
    };
  }

  if (c.includes('luuqad') || c.includes('af-soomaali') || c.includes('soundwave') || c.includes('cod') || c.includes('voice')) {
    // Somali Language & NLP / Voice
    return {
      bgStart: '#080c24',
      bgMid: '#1e1b4b',
      bgEnd: '#040614',
      primary: '#06b6d4',
      secondary: '#38bdf8',
      lightText: '#f0fdfa',
    };
  }

  if (c.includes('arday') || c.includes('student') || c.includes('study') || c.includes('exam') || c.includes('waxbarasho')) {
    // Education & Students
    return {
      bgStart: '#110726',
      bgMid: '#3b0764',
      bgEnd: '#080314',
      primary: '#a855f7',
      secondary: '#c084fc',
      lightText: '#faf5ff',
    };
  }

  if (c.includes('code') || c.includes('koodh') || c.includes('software') || c.includes('developer') || c.includes('python')) {
    // Coding & Software
    return {
      bgStart: '#021516',
      bgMid: '#042f2e',
      bgEnd: '#010c0d',
      primary: '#14b8a6',
      secondary: '#2dd4bf',
      lightText: '#f0fdfa',
    };
  }

  if (c.includes('robot') || c.includes('hardware') || c.includes('automation') || c.includes('drone')) {
    // Robotics & Automation
    return {
      bgStart: '#1a0e05',
      bgMid: '#431407',
      bgEnd: '#0e0702',
      primary: '#f97316',
      secondary: '#fb923c',
      lightText: '#fff7ed',
    };
  }

  if (c.includes('caafimaad') || c.includes('dhakhtar') || c.includes('bukaan') || c.includes('cudur') || c.includes('health') || c.includes('isbitaal')) {
    // Healthcare & Medicine
    return {
      bgStart: '#04140f',
      bgMid: '#0f3d30',
      bgEnd: '#020c09',
      primary: '#2dd4bf',
      secondary: '#5eead4',
      lightText: '#f0fdfa',
    };
  }

  if (c.includes('ganacsi') || c.includes('shaqo') || c.includes('business') || c.includes('warshad') || c.includes('macmiil') || c.includes('suuq')) {
    // Business, Work & Entrepreneurship
    return {
      bgStart: '#170a02',
      bgMid: '#4a2007',
      bgEnd: '#0c0501',
      primary: '#eab308',
      secondary: '#facc15',
      lightText: '#fefce8',
    };
  }

  // Default: Sleek Xeero AI Deep Cyan & Obsidian
  return {
    bgStart: '#020d1c',
    bgMid: '#082f49',
    bgEnd: '#01060e',
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    lightText: '#f0f9ff',
  };
}

/**
 * Escapes XML text safely for SVG rendering.
 */
function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Greedy word-wraps raw (unescaped) text into up to `maxLines` lines of at
 * most `maxChars` characters each, ellipsizing the last line if the text
 * doesn't fit — keeps the caption card readable regardless of how long the
 * script generator's key message happens to be, instead of one long line
 * running off the edge of the card.
 */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const clean = (text || '').trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1].slice(0, Math.max(0, maxChars - 1));
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

// Errors worth retrying rather than immediately downgrading the scene to the
// offline placeholder: six images are generated back to back per reel, which
// trips per-minute rate limits easily, and model-overload/timeout responses
// are routinely fine a few seconds later.
const TRANSIENT_IMAGE_ERROR = /\b429\b|\b503\b|\b500\b|rate.?limit|quota|resource.?exhausted|overloaded|unavailable|deadline|timed? ?out|ETIMEDOUT|ECONNRESET|socket hang up/i;

// Bounds how long one scene may spend trying to get a real AI image before
// giving up and using the offline graphic, so a persistently failing model
// can't stretch a six-scene reel into a multi-minute stall.
const PER_SCENE_IMAGE_DEADLINE_MS = 210_000;

// Last-resort model IDs, only used if asking the API for its real model list
// fails. Names here can go stale at any time — discovery above is what keeps
// this working.
const FALLBACK_IMAGE_MODELS = [
  'gemini-3.1-flash-image', // Nano Banana 2 — generalist workhorse
  'gemini-3-pro-image', // Nano Banana Pro — highest quality
  'gemini-2.5-flash-image', // Nano Banana — legacy, widest availability
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildGenAI(apiKey: string, timeout: number) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' }, timeout },
  });
}

// Hardcoded model IDs rot: Google renames and retires image models, and a
// guessed name fails with a 404 that looks identical to "image generation is
// broken". Asking the API which models this key can actually use, and which
// of those generate images, keeps this working across renames instead of
// silently degrading every scene to the offline placeholder graphic.
let cachedImageModels: { models: string[]; at: number } | null = null;
const MODEL_DISCOVERY_TTL_MS = 30 * 60 * 1000;

export async function discoverImageCapableModels(apiKey: string, force = false): Promise<string[]> {
  if (!force && cachedImageModels && Date.now() - cachedImageModels.at < MODEL_DISCOVERY_TTL_MS) {
    return cachedImageModels.models;
  }

  const ai = buildGenAI(apiKey, 30_000);
  const collected: Array<{ name: string; displayName: string; description: string; actions: string[] }> = [];

  const pager = await ai.models.list();
  let page = pager.page;
  for (let guard = 0; guard < 10; guard++) {
    for (const model of page) {
      const name = (model.name || '').replace(/^models\//, '');
      if (!name) continue;
      collected.push({
        name,
        displayName: model.displayName || '',
        description: model.description || '',
        actions: model.supportedActions || [],
      });
    }
    if (!pager.hasNextPage()) break;
    page = await pager.nextPage();
  }

  // An image model is identified by its own advertised capabilities where
  // available, and otherwise by the naming/description conventions Google
  // uses for them ("...-image", "image generation", Imagen).
  const imageModels = collected
    .filter((m) => {
      const haystack = `${m.name} ${m.displayName} ${m.description}`.toLowerCase();
      const advertises = m.actions.some((a) => /image/i.test(a) && !/embed/i.test(a));
      const namedLikeImageModel = /(^|[-_])image|imagen|image generation|nano.?banana/.test(haystack);
      const isEmbeddingOrVision = /embed|aqa/.test(haystack);
      return (advertises || namedLikeImageModel) && !isEmbeddingOrVision;
    })
    .map((m) => m.name);

  // Prefer flash-class image models (fast and cheap enough to run six times
  // per reel), then pro-class, then anything else; within each group prefer
  // stable IDs over -preview/-exp ones.
  const isPreview = (m: string) => /preview|exp/.test(m);
  const rank = (m: string) => (/flash/.test(m) ? 0 : /pro/.test(m) ? 1 : 2) * 2 + (isPreview(m) ? 1 : 0);
  const ranked = [...new Set(imageModels)].sort((a, b) => rank(a) - rank(b));

  console.log(`[VideoProvider] Model discovery: ${collected.length} models visible, ${ranked.length} image-capable: ${ranked.join(', ') || 'none'}`);
  cachedImageModels = { models: ranked, at: Date.now() };
  return ranked;
}

/**
 * Full picture of why scene visuals are or aren't being generated: whether a
 * key is configured, which models it can actually see, which of those look
 * image-capable, and the verbatim error from a real generation attempt.
 */
export async function diagnoseImageGeneration(): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { keyConfigured: false, verdict: 'GEMINI_API_KEY is not set on this server, so every scene uses the offline placeholder graphic.' };
  }

  const report: Record<string, unknown> = { keyConfigured: true, keyLength: apiKey.length };

  // Text generation is checked first and separately: if it fails too, the
  // problem is the key/quota itself rather than anything specific to image
  // models, and the reel's script is silently falling back to the canned
  // offline template as well.
  try {
    const ai = buildGenAI(apiKey, 30_000);
    const textResponse = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash',
      contents: 'Reply with the single word: OK',
    });
    report.textGeneration = { ok: !!textResponse.text?.trim(), sample: (textResponse.text || '').trim().slice(0, 40) };
  } catch (err: any) {
    report.textGeneration = { ok: false, error: (err?.message || String(err)).slice(0, 300) };
  }

  let discovered: string[] = [];
  try {
    discovered = await discoverImageCapableModels(apiKey, true);
    report.imageCapableModels = discovered;
  } catch (err: any) {
    report.modelListError = err?.message || String(err);
  }

  const toTry = [...discovered, ...FALLBACK_IMAGE_MODELS].filter((m, i, arr) => arr.indexOf(m) === i).slice(0, 6);
  const attempts: Array<Record<string, unknown>> = [];

  for (const model of toTry) {
    try {
      const ai = buildGenAI(apiKey, 60_000);
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: 'A single ripe red apple on a plain wooden table, cinematic lighting, photorealistic.' }] },
        config: { imageConfig: { aspectRatio: '9:16' } },
      });
      const hasImage = (response.candidates || []).some((c) =>
        (c.content?.parts || []).some((p) => p.inlineData?.data)
      );
      attempts.push({
        model,
        ok: hasImage,
        blockReason: response.promptFeedback?.blockReason,
        finishReason: response.candidates?.[0]?.finishReason,
      });
      if (hasImage) break;
    } catch (err: any) {
      attempts.push({ model, ok: false, error: (err?.message || String(err)).slice(0, 300) });
    }
  }

  report.attempts = attempts;
  const working = attempts.find((a) => a.ok);
  const textOk = (report.textGeneration as { ok?: boolean } | undefined)?.ok;

  if (working) {
    report.verdict = `Image generation works with "${working.model}".`;
  } else if (!textOk) {
    report.verdict = 'Neither text nor image generation works with this key — the key itself is rejected or out of quota, so scripts fall back to the canned template and scenes to the placeholder graphic.';
  } else if (discovered.length === 0) {
    report.verdict = 'Text generation works but this key can see no image-capable model — image generation is likely not enabled for this project (it usually requires billing enabled).';
  } else {
    report.verdict = 'Text works, image models are visible, but none produced an image — see attempts[] for the exact error from each.';
  }
  return report;
}

/**
 * Generates a real AI image for a scene using its visualPrompt/flowPrompt
 * (written by the script generator as a still-image-generator prompt).
 *
 * Uses `generateContent` on image-capable Gemini models, explicitly asking
 * for IMAGE output and a 9:16 frame, and extracts the inline image data from
 * the response candidates.
 *
 * Each model is tried at a high-detail config first, then a baseline config
 * (in case a model rejects the richer options), retrying once on transient
 * errors. Only when every option is exhausted does it throw, letting the
 * caller fall back to the offline bespoke SVG visual.
 */
export async function generateAIImageVisual(params: ResolveVisualParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const {
    sceneNumber,
    topic = 'Xeero AI Reel',
    visualPrompt = '',
    flowPrompt = '',
    subject = '',
    action = '',
    environment = '',
    cameraComposition = '',
    outputDir = '/tmp',
  } = params;

  const promptText = (visualPrompt || flowPrompt || `${subject} ${action} ${environment}`.trim() || topic).trim();
  if (!promptText) {
    throw new Error(`Scene ${sceneNumber}: No visual prompt available for AI image generation`);
  }

  // Direction is written as positive description of the wanted image. Listing
  // unwanted artifacts ("no distorted anatomy", "no malformed objects")
  // instead both biases image models toward the very thing being named and
  // reads to safety classifiers as content the prompt is about — which
  // returns a blocked, image-less response, and every scene then silently
  // degrades to the offline placeholder graphic.
  const fullPrompt = [
    promptText,
    cameraComposition ? `Shot: ${cameraComposition}.` : '',
    'Premium cinematic editorial photography for a technology news brand: photorealistic, highly detailed, sharp focus, dramatic professional lighting, authentic real-world materials, natural proportions, rich depth of field.',
    'Vertical 9:16 portrait composition with the subject clearly framed. Clean image with no lettering, captions, subtitles, logos or watermarks anywhere in the frame.',
  ].filter(Boolean).join(' ');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const jpgPath = path.join(outputDir, `scene_${sceneNumber}_ai_visual.jpg`);

  // Generous per-request bound: a slow but successful high-quality
  // generation must never be cut off (that downgrades the scene to the
  // placeholder graphic), while a genuinely hung request still can't stall
  // the reel. Total time per scene is capped by PER_SCENE_IMAGE_DEADLINE_MS.
  const ai = buildGenAI(apiKey, 120_000);

  // Models this key can really use come first (asked once, then cached);
  // an explicit override and the static list are only backstops. Previously
  // this was a hardcoded guess at model IDs, so a single rename silently
  // turned every scene into the offline placeholder.
  let discoveredModels: string[] = [];
  try {
    discoveredModels = await discoverImageCapableModels(apiKey);
  } catch (err: any) {
    console.warn(`[VideoProvider] Could not list available models, using fallback IDs: ${err?.message || err}`);
  }

  const envModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const candidateModels: string[] = [
    ...(envModel ? [envModel] : []),
    ...discoveredModels,
    ...FALLBACK_IMAGE_MODELS,
  ].filter((m, idx, arr): m is string => !!m && arr.indexOf(m) === idx).slice(0, 3);

  if (candidateModels.length === 0) {
    throw new Error(`Scene ${sceneNumber}: no image-capable Gemini model is available to this API key`);
  }

  // Config tiers, tried in order, each a strict step down from the last.
  // responseModalities is kept for both of the first two: without asking for
  // IMAGE output explicitly, an image-capable model can answer with text and
  // the scene silently falls back to the placeholder graphic. Only the last
  // tier drops it, for an endpoint that rejects the field outright.
  const configVariants: Array<{ label: string; config: GenerateContentConfig }> = [
    {
      label: 'high-detail',
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '9:16',
          imageSize: '2K',
          personGeneration: 'ALLOW_ADULT',
        },
      },
    },
    {
      label: 'image-modality',
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '9:16' },
      },
    },
    {
      label: 'baseline',
      config: {
        imageConfig: { aspectRatio: '9:16' },
      },
    },
  ];

  const deadline = Date.now() + PER_SCENE_IMAGE_DEADLINE_MS;
  let lastError: any = null;

  for (const model of candidateModels) {
    for (const variant of configVariants) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (Date.now() > deadline) {
          throw new Error(
            `AI image generation for Scene ${sceneNumber} exceeded its ${Math.round(PER_SCENE_IMAGE_DEADLINE_MS / 1000)}s budget: ${lastError?.message || 'no successful model'}`
          );
        }

        try {
          const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: fullPrompt }] },
            config: variant.config,
          });

          const candidates = response.candidates || [];
          let imageBytes: string | undefined;

          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                imageBytes = part.inlineData.data;
                break;
              }
            }
            if (imageBytes) break;
          }

          if (!imageBytes) {
            // Report *why* an image-less response came back — a safety block,
            // a truncated generation and an empty candidate list are very
            // different problems, and "no image bytes" alone hides which.
            const blockReason = response.promptFeedback?.blockReason;
            const finishReason = candidates[0]?.finishReason;
            const detail = blockReason
              ? `blocked: ${blockReason}${response.promptFeedback?.blockReasonMessage ? ` (${response.promptFeedback.blockReasonMessage})` : ''}`
              : finishReason
              ? `finishReason: ${finishReason}`
              : candidates.length === 0
              ? 'no candidates returned'
              : 'candidates contained no inline image data';
            throw new Error(`${model} returned no image — ${detail}`);
          }

          fs.writeFileSync(jpgPath, Buffer.from(imageBytes, 'base64'));

          if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
            throw new Error(`AI image for Scene ${sceneNumber} was written but appears invalid`);
          }

          console.log(
            `[VideoProvider] Generated AI image for Scene ${sceneNumber} using ${model} (${variant.label}, ${Math.round(fs.statSync(jpgPath).size / 1024)}KB)`
          );
          return jpgPath;
        } catch (err: any) {
          lastError = err;
          const message = err?.message || String(err);
          const transient = TRANSIENT_IMAGE_ERROR.test(message);
          console.warn(
            `[VideoProvider] Scene ${sceneNumber} image attempt failed [${model} / ${variant.label} / try ${attempt}]${transient ? ' (transient)' : ''}: ${message}`
          );

          // Retry the same model/config once for transient failures (rate
          // limits especially — six scenes generate back to back), otherwise
          // move straight on to the next configuration.
          if (transient && attempt === 1 && Date.now() + 6_000 < deadline) {
            await sleep(5_000);
            continue;
          }
          break;
        }
      }
    }
  }

  throw new Error(`All AI image models failed for Scene ${sceneNumber}: ${lastError?.message || 'unknown error'}`);
}

/**
 * Dynamically generates a scene-specific visual graphic (1080x1920, 9:16)
 * specifically illustrating that scene's narration, key message, subject, and action.
 */
/**
 * A small library of topic-relevant line-icon glyphs, each drawn centered at
 * local (0,0) within a roughly ±140px box. Used to give middle scenes a
 * visual identity tied to what that specific scene is actually about,
 * instead of every scene sharing one identical generic icon.
 */
function renderIconGlyph(iconKey: string, theme: ColorTheme): string {
  const { primary, secondary } = theme;

  switch (iconKey) {
    case 'code':
      return `
        <path d="M -90 -60 L -145 0 L -90 60" fill="none" stroke="${primary}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 90 -60 L 145 0 L 90 60" fill="none" stroke="${primary}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="28" y1="-95" x2="-28" y2="95" stroke="${secondary}" stroke-width="14" stroke-linecap="round" />
      `;
    case 'shield':
      return `
        <path d="M 0 -140 L 108 -88 L 108 18 C 108 96 58 148 0 168 C -58 148 -108 96 -108 18 L -108 -88 Z" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="10" stroke-linejoin="round" />
        <path d="M -48 8 L -8 52 L 62 -34" fill="none" stroke="${secondary}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
      `;
    case 'coin':
      return `
        <circle cx="-25" cy="38" r="82" fill="${theme.bgMid}" stroke="${primary}" stroke-width="8" />
        <circle cx="25" cy="-18" r="82" fill="${primary}" fill-opacity="0.22" stroke="${primary}" stroke-width="10" />
        <circle cx="25" cy="-18" r="42" fill="none" stroke="${secondary}" stroke-width="8" />
      `;
    case 'leaf':
      return `
        <path d="M 0 130 C -110 108 -120 -42 0 -140 C 120 -42 110 108 0 130 Z" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="10" stroke-linejoin="round" />
        <path d="M 0 118 L 0 -118" stroke="${secondary}" stroke-width="8" stroke-linecap="round" />
      `;
    case 'pulse':
      return `
        <path d="M -150 0 L -70 0 L -40 -80 L 0 70 L 30 -30 L 60 0 L 150 0" fill="none" stroke="${primary}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="0" cy="70" r="14" fill="${secondary}" />
      `;
    case 'book':
      return `
        <path d="M -120 -80 C -62 -110 -12 -100 0 -80 C 12 -100 62 -110 120 -80 L 120 90 C 62 65 12 75 0 95 C -12 75 -62 65 -120 90 Z" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="9" stroke-linejoin="round" />
        <line x1="0" y1="-78" x2="0" y2="93" stroke="${secondary}" stroke-width="6" />
      `;
    case 'robot':
      return `
        <rect x="-90" y="-70" width="180" height="140" rx="28" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="10" />
        <circle cx="-35" cy="-5" r="16" fill="${secondary}" />
        <circle cx="35" cy="-5" r="16" fill="${secondary}" />
        <line x1="-40" y1="45" x2="40" y2="45" stroke="${secondary}" stroke-width="10" stroke-linecap="round" />
        <line x1="0" y1="-70" x2="0" y2="-115" stroke="${primary}" stroke-width="8" stroke-linecap="round" />
        <circle cx="0" cy="-128" r="14" fill="${secondary}" />
      `;
    case 'wave':
      return `
        <rect x="-140" y="-25" width="18" height="50" rx="9" fill="${secondary}" opacity="0.6" />
        <rect x="-100" y="-55" width="18" height="110" rx="9" fill="${secondary}" opacity="0.85" />
        <rect x="-60" y="-90" width="18" height="180" rx="9" fill="${primary}" />
        <rect x="-10" y="-60" width="18" height="120" rx="9" fill="${primary}" />
        <rect x="30" y="-100" width="18" height="200" rx="9" fill="${secondary}" />
        <rect x="70" y="-50" width="18" height="100" rx="9" fill="${primary}" opacity="0.85" />
        <rect x="110" y="-30" width="18" height="60" rx="9" fill="${secondary}" opacity="0.6" />
      `;
    case 'briefcase':
      return `
        <rect x="-110" y="-30" width="220" height="150" rx="18" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="10" />
        <path d="M -50 -30 L -50 -70 C -50 -85 -38 -97 -23 -97 L 23 -97 C 38 -97 50 -85 50 -70 L 50 -30" fill="none" stroke="${primary}" stroke-width="10" stroke-linejoin="round" />
        <rect x="-18" y="20" width="36" height="28" rx="6" fill="${secondary}" />
      `;
    case 'chart':
      return `
        <line x1="-130" y1="110" x2="130" y2="110" stroke="${secondary}" stroke-width="8" stroke-linecap="round" />
        <rect x="-110" y="20" width="42" height="90" rx="8" fill="${primary}" fill-opacity="0.55" />
        <rect x="-38" y="-30" width="42" height="140" rx="8" fill="${primary}" fill-opacity="0.75" />
        <rect x="34" y="-70" width="42" height="180" rx="8" fill="${primary}" />
        <path d="M -110 -20 L -30 -80 L 40 -40 L 110 -120" fill="none" stroke="${secondary}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
        <polygon points="110,-120 82,-112 104,-90" fill="${secondary}" />
      `;
    case 'fingerprint':
      return `
        <path d="M -90 40 A 100 100 0 1 1 90 40" fill="none" stroke="${primary}" stroke-width="10" stroke-linecap="round" />
        <path d="M -60 55 A 68 68 0 1 1 60 55" fill="none" stroke="${secondary}" stroke-width="9" stroke-linecap="round" />
        <path d="M -32 65 A 38 38 0 1 1 32 65" fill="none" stroke="${primary}" stroke-width="8" stroke-linecap="round" />
        <circle cx="0" cy="70" r="10" fill="${secondary}" />
      `;
    case 'network':
    default:
      return `
        <circle cx="0" cy="0" r="34" fill="${primary}" />
        <circle cx="-95" cy="70" r="22" fill="${secondary}" />
        <circle cx="95" cy="70" r="22" fill="${secondary}" />
        <circle cx="0" cy="-110" r="22" fill="${secondary}" />
        <line x1="0" y1="0" x2="-95" y2="70" stroke="${primary}" stroke-width="7" opacity="0.8" />
        <line x1="0" y1="0" x2="95" y2="70" stroke="${primary}" stroke-width="7" opacity="0.8" />
        <line x1="0" y1="0" x2="0" y2="-110" stroke="${primary}" stroke-width="7" opacity="0.8" />
      `;
  }
}

/**
 * Picks the most relevant icon glyph for a middle (non-hook, non-outro) scene
 * by matching its own subject/action/environment text first (so scenes within
 * the same topic can still look different from each other), then falling
 * back to the scene's own caption/key-message/voiceover (deliberately
 * excluding `topic`, which is identical for every scene in the reel and
 * would otherwise pull every scene toward the same icon). If nothing
 * matches at all, rotates through a small set of generic AI/tech glyphs by
 * scene number instead of always landing on the same default.
 */
function pickIconKey(params: ResolveVisualParams): string {
  const { sceneNumber, subject = '', action = '', environment = '', caption = '', keyMessage = '', voiceover = '', visualKeywords = [] } = params;
  const scoped = `${subject} ${action} ${environment}`.toLowerCase();
  // visualKeywords are short English tags from the script generator and are
  // the most reliably-populated per-scene signal, so they're weighted with
  // caption/keyMessage/voiceover here rather than only used as a last resort.
  const broad = `${caption} ${keyMessage} ${voiceover} ${visualKeywords.join(' ')}`.toLowerCase();

  const rules: Array<[string, string[]]> = [
    ['code', ['code', 'koodh', 'software', 'barnaamij', 'app', 'developer', 'python', 'website', 'coding', 'programming']],
    ['fingerprint', ['wejiga', 'wajiga', 'farta', 'faraha', 'aqoonsi', 'biometric', 'fingerprint', 'face id', 'identity', 'authentication', 'facial recognition']],
    // Note: 'sirdoon' is deliberately excluded — this app's own generated
    // Somali scripts use it both for "security/intelligence agency" and,
    // confusingly, as a generic word for "AI/intelligence" itself (e.g.
    // "Sirdoonka macmalka ah" = "the artificial intelligence"), so it isn't
    // a reliable signal for the security icon specifically.
    ['shield', ['ammaan', 'security', 'hack', 'threat', 'privacy', 'difaac', 'weerar', 'joojin', 'shaki', 'khiyaano', 'ilaali', 'dahsoon', 'fraud', 'scam', 'cybersecurity', 'protection']],
    ['coin', ['lacag', 'money', 'bank', 'fintech', 'payment', 'zaad', 'evc', 'currency', 'dollar', 'finance', 'mobile money', 'transaction']],
    ['leaf', ['beer', 'farm', 'agri', 'dalag', 'waraab', 'crop', 'agriculture', 'farming']],
    ['pulse', ['caafimaad', 'health', 'doctor', 'dhakhtar', 'hospital', 'bukaan', 'cudur', 'isbitaal', 'patient', 'joogto', '24/7', 'medical', 'monitoring', 'wellness']],
    ['book', ['arday', 'student', 'school', 'education', 'waxbarasho', 'study', 'class', 'jaamacad', 'university', 'learning', 'exam']],
    ['robot', ['robot', 'drone', 'hardware', 'automation', 'machine', 'mishiin']],
    ['wave', ['luuqad', 'language', 'voice', 'cod', 'speak', 'hadal', 'dhawaaq', 'af-soomaali', 'audio', 'speech']],
    ['briefcase', ['shaqo', 'office', 'meeting', 'team', 'shaqaale', 'employee', 'kalkaal', 'workplace']],
    ['chart', ['ganacsi', 'business', 'growth', 'economy', 'market', 'suuq', 'data', 'horumar', 'koror', 'falanqee', 'falanqayn', 'dhaqan', 'dhaqdhaqaaq', 'analytics', 'trend', 'pattern']],
  ];

  for (const [icon, keywords] of rules) {
    if (keywords.some((kw) => scoped.includes(kw))) return icon;
  }
  for (const [icon, keywords] of rules) {
    if (keywords.some((kw) => broad.includes(kw))) return icon;
  }
  const fallbacks = ['network', 'chart', 'pulse'];
  return fallbacks[sceneNumber % fallbacks.length];
}

export async function generateBespokeSceneVisual(params: ResolveVisualParams): Promise<string> {
  const {
    sceneNumber,
    totalScenes = 6,
    topic = 'Xeero AI Reel',
    caption = '',
    voiceover = '',
    keyMessage = '',
    subject = '',
    action = '',
    environment = '',
    cameraComposition = '',
    visualKeywords = [],
    outputDir = '/tmp',
  } = params;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgPath = path.join(outputDir, `scene_${sceneNumber}_visual.svg`);
  const jpgPath = path.join(outputDir, `scene_${sceneNumber}_visual.jpg`);

  const combinedContext = `${topic} ${caption} ${voiceover} ${subject} ${environment} ${visualKeywords.join(' ')}`;
  const theme = getTopicTheme(combinedContext);

  const safeTopic = escapeXml((topic || 'XEERO AI').toUpperCase());
  const safeCaption = escapeXml((caption || `MUUQAALKA ${sceneNumber}`).toUpperCase());
  const messageLines = wrapText(keyMessage || voiceover.slice(0, 140), 34, 2).map(escapeXml);
  // subject/action can land empty if the scene metadata didn't survive the
  // pipeline up to this point — visualKeywords is the more reliable signal
  // (always populated by the script generator), so prefer it for the kicker
  // line before falling back to the generic placeholder text.
  const keywordKicker = visualKeywords.length > 0 ? visualKeywords.slice(0, 3).join(' • ') : '';
  const safeSubject = escapeXml(subject || (keywordKicker ? '' : 'Habka Tignoolajiyada AI'));
  const safeAction = escapeXml(action || (keywordKicker ? keywordKicker : 'Falanqeynta xogta iyo horumarka'));
  const safeEnv = escapeXml(environment || 'Xarunta Hal-abuurka');
  const kickerLine = safeSubject ? `${safeSubject} — ${safeAction}` : safeAction;
  const safeCamera = escapeXml(cameraComposition || 'Dynamic 9:16 Cinematic Angle');

  // Scene-specific focal geometry according to scene sequence. Every branch
  // below unconditionally assigns this before it's read (if/else-if/else is
  // exhaustive), so no initializer is needed.
  let focalGraphic: string;
  if (sceneNumber === 1) {
    // Scene 1: Hook / Problem Reticle
    focalGraphic = `
      <circle cx="0" cy="0" r="260" fill="none" stroke="${theme.primary}" stroke-width="3" stroke-dasharray="20 10" opacity="0.5" />
      <circle cx="0" cy="0" r="220" fill="${theme.bgMid}" fill-opacity="0.3" stroke="${theme.secondary}" stroke-width="4" />
      <circle cx="0" cy="0" r="140" fill="none" stroke="${theme.primary}" stroke-width="2" />
      <!-- Target reticle crosshairs -->
      <line x1="-280" y1="0" x2="-180" y2="0" stroke="${theme.secondary}" stroke-width="4" />
      <line x1="180" y1="0" x2="280" y2="0" stroke="${theme.secondary}" stroke-width="4" />
      <line x1="0" y1="-280" x2="0" y2="-180" stroke="${theme.secondary}" stroke-width="4" />
      <line x1="0" y1="180" x2="0" y2="280" stroke="${theme.secondary}" stroke-width="4" />
      <!-- Warning / Focal Icon -->
      <polygon points="0,-70 65,50 -65,50" fill="${theme.primary}" fill-opacity="0.25" stroke="${theme.primary}" stroke-width="4" />
      <text x="0" y="35" fill="${theme.lightText}" font-size="60" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle">!</text>
    `;
  } else if (sceneNumber === totalScenes) {
    // Outro / CTA: Xeero AI Studio Portal
    focalGraphic = `
      <circle cx="0" cy="0" r="280" fill="none" stroke="${theme.primary}" stroke-width="4" opacity="0.6" />
      <circle cx="0" cy="0" r="230" fill="${theme.bgMid}" fill-opacity="0.4" stroke="${theme.secondary}" stroke-width="3" stroke-dasharray="14 8" />
      <polygon points="0,-120 100,-40 100,70 0,130 -100,70 -100,-40" fill="${theme.primary}" fill-opacity="0.2" stroke="${theme.primary}" stroke-width="4" />
      <circle cx="0" cy="0" r="70" fill="${theme.primary}" />
      <polygon points="-20,-35 40,0 -20,35" fill="${theme.bgStart}" />
    `;
  } else {
    // Informational / Mechanism Scenes: topic-relevant icon inside the
    // same data-hub ring frame, so each scene reads distinctly instead of
    // repeating one identical generic icon across the whole reel.
    const iconKey = pickIconKey(params);
    const evenScene = sceneNumber % 2 === 0;
    focalGraphic = `
      <circle cx="0" cy="0" r="270" fill="none" stroke="${theme.primary}" stroke-width="2" stroke-dasharray="16 8" opacity="0.4" />
      <circle cx="0" cy="0" r="220" fill="${theme.bgMid}" fill-opacity="0.3" stroke="${theme.secondary}" stroke-width="3" />
      <!-- Orbital telemetry connectors (alternate orientation by scene parity) -->
      <line x1="0" y1="${evenScene ? -80 : 80}" x2="0" y2="${evenScene ? -210 : 210}" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="0" cy="${evenScene ? -210 : 210}" r="16" fill="${theme.secondary}" />
      <line x1="${evenScene ? -80 : 80}" y1="0" x2="${evenScene ? -210 : 210}" y2="0" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="${evenScene ? -210 : 210}" cy="0" r="16" fill="${theme.secondary}" />
      <!-- Topic-relevant icon glyph -->
      <g>
        ${renderIconGlyph(iconKey, theme)}
      </g>
    `;
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${theme.bgStart}" />
      <stop offset="45%" stop-color="${theme.bgMid}" />
      <stop offset="85%" stop-color="${theme.bgEnd}" />
      <stop offset="100%" stop-color="#010408" />
    </linearGradient>
    <pattern id="grid" width="70" height="70" patternUnits="userSpaceOnUse">
      <path d="M 70 0 L 0 0 0 70" fill="none" stroke="${theme.primary}" stroke-width="1" stroke-opacity="0.07" />
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1920" fill="url(#bgGrad)" />
  <rect width="1080" height="1920" fill="url(#grid)" />

  <!-- Ambient Glow -->
  <circle cx="540" cy="620" r="420" fill="${theme.primary}" opacity="0.14" />
  <circle cx="200" cy="1500" r="280" fill="${theme.secondary}" opacity="0.08" />

  <!-- Top Studio Header & Badge -->
  <rect x="70" y="80" width="940" height="76" rx="38" fill="#000000" fill-opacity="0.65" stroke="${theme.primary}" stroke-width="2" />
  <text x="120" y="128" fill="${theme.primary}" font-size="24" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="4">XEERO AI REEL STUDIO</text>
  <rect x="760" y="94" width="220" height="48" rx="24" fill="${theme.primary}" />
  <text x="870" y="127" fill="${theme.bgStart}" font-size="22" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">SCENE ${sceneNumber} / ${totalScenes}</text>

  <!-- Topic Subtitle Tag -->
  <rect x="140" y="180" width="800" height="44" rx="22" fill="${theme.primary}" fill-opacity="0.15" stroke="${theme.primary}" stroke-width="1" />
  <text x="540" y="210" fill="${theme.secondary}" font-size="18" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="3">${safeTopic}</text>

  <!-- Central Visual Showcase Area -->
  <g transform="translate(540, 680)">
    ${focalGraphic}
  </g>

  <!-- High-Impact Scene Title (Somali Headline) -->
  <text x="540" y="1060" fill="${theme.lightText}" font-size="52" font-family="system-ui, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">${safeCaption}</text>

  <!-- Editorial Caption Card: kicker line + key message, broadcast-caption style -->
  <g transform="translate(70, 1130)">
    <!-- Main Card Box -->
    <rect width="940" height="380" rx="24" fill="#000000" fill-opacity="0.78" stroke="${theme.primary}" stroke-width="2" stroke-opacity="0.6" />

    <!-- Accent rule -->
    <rect x="0" y="0" width="8" height="380" rx="4" fill="${theme.primary}" />

    <!-- Kicker: what's on screen -->
    <text x="44" y="58" fill="${theme.secondary}" font-size="21" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="2">${kickerLine}</text>

    <line x1="44" y1="86" x2="896" y2="86" stroke="${theme.primary}" stroke-width="1" stroke-opacity="0.3" />

    <!-- Key message: the actual editorial caption, larger and readable -->
    <text x="44" y="150" fill="${theme.lightText}" font-size="32" font-family="system-ui, sans-serif" font-weight="700">${messageLines
      .map((line, i) => `<tspan x="44" dy="${i === 0 ? 0 : 42}">${line}</tspan>`)
      .join('')}</text>

    <!-- Footer: setting tag, quiet and small -->
    <text x="44" y="345" fill="${theme.primary}" font-size="18" font-family="system-ui, sans-serif" font-weight="600" letter-spacing="1">${safeEnv} • ${safeCamera}</text>
  </g>

  <!-- Bottom Brand Footer -->
  <rect x="240" y="1770" width="600" height="50" rx="25" fill="${theme.primary}" fill-opacity="0.15" stroke="${theme.primary}" stroke-width="1" />
  <text x="540" y="1803" fill="${theme.primary}" font-size="22" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle" letter-spacing="4">BARO AI • AF-SOOMAALI • XEERO.AI</text>
</svg>`;

  fs.writeFileSync(svgPath, svgContent, 'utf8');

  try {
    // Render 1080x1920 JPG using FFmpeg librsvg in milliseconds
    await execAsync(
      `ffmpeg -y -i "${svgPath}" -vf "scale=1080:1920" -q:v 2 "${jpgPath}"`
    );

    if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
      throw new Error(`FFmpeg did not create valid image at ${jpgPath}`);
    }

    return jpgPath;
  } catch (err: any) {
    console.error(`[VideoProvider] Failed to render bespoke scene visual for Scene ${sceneNumber}:`, err?.message);
    throw new Error(`Scene ${sceneNumber} visual generation failed: ${err?.message}`, { cause: err });
  }
}

/**
 * Resolves or dynamically generates the visual asset for a specific Reel scene.
 * 
 * Strict Production Rules:
 * 1. ZERO SILENT FALLBACKS: Never secretly substitute generic office or datacenter images.
 * 2. NEVER reuse banned generic assets (/images/somali_office_ai.jpg, /images/datacenter_africa.jpg).
 * 3. USER UPLOADS: If user uploaded custom video/image, use it.
 * 4. DYNAMIC BESPOKE GENERATION: If no custom asset is attached, dynamically generate a 1080x1920
 *    visual card specifically explaining that scene's narration, subject, and action.
 * 5. If visual cannot be generated, throws an explicit error!
 */
export async function resolveSceneVisual(params: ResolveVisualParams): Promise<VisualAssetResult> {
  const publicDir = path.join(process.cwd(), 'public');

  // Case 1: Custom user-uploaded file (e.g. /uploads/flow_video.mp4 or /uploads/image.png).
  // Only the basename is trusted from the client-supplied URL — it is joined
  // directly onto the uploads directory so a "../" in the requested URL can
  // never resolve to a path outside it (path traversal / arbitrary file read).
  const requestedUrl = params.visualUrl || params.videoUrl;
  if (requestedUrl && requestedUrl.startsWith('/uploads/')) {
    const safeName = path.basename(requestedUrl);
    const candidatePath = safeName ? path.join(publicDir, 'uploads', safeName) : '';

    if (candidatePath && fs.existsSync(candidatePath)) {
      const ext = path.extname(candidatePath).toLowerCase();
      const isVideo = ['.mp4', '.webm', '.mov', '.mkv'].includes(ext);
      return {
        assetPath: candidatePath,
        type: isVideo ? 'video' : 'image',
        source: 'uploaded_flow',
      };
    }
  }

  // Case 2: Specific allowed domain asset (ONLY if explicitly set and NOT one of the banned generic assets)
  const BANNED_ASSETS = ['somali_office_ai.jpg', 'datacenter_africa.jpg'];
  if (requestedUrl && requestedUrl.startsWith('/images/')) {
    const requestedFilename = path.basename(requestedUrl);
    if (!BANNED_ASSETS.includes(requestedFilename)) {
      const candidatePath = path.join(publicDir, 'images', requestedFilename);
      const isUsed = (params.usedAssets || []).some(a => path.basename(a) === requestedFilename);
      if (fs.existsSync(candidatePath) && !isUsed) {
        return {
          assetPath: candidatePath,
          type: 'image',
          source: 'matched_asset',
        };
      }
    }
  }

  // Case 3: Real AI-generated image, using the scene's own visualPrompt/flowPrompt.
  // Only attempted when a Gemini key is configured; any failure (missing key,
  // model unavailable, quota/billing not enabled, network) falls through to
  // the guaranteed-to-work SVG bespoke visual below rather than breaking the reel.
  let aiFailureReason: string | undefined;
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`[VideoProvider] Attempting AI image generation for Scene ${params.sceneNumber} (${params.caption || params.topic})...`);
      const aiJpg = await generateAIImageVisual(params);
      return {
        assetPath: aiJpg,
        type: 'image',
        source: 'ai_generated_visual',
      };
    } catch (aiErr: any) {
      aiFailureReason = aiErr?.message || 'AI image generation failed';
      console.warn(`[VideoProvider] AI image generation unavailable for Scene ${params.sceneNumber}, falling back to bespoke visual: ${aiFailureReason}`);
    }
  } else {
    aiFailureReason = 'GEMINI_API_KEY is not configured on the server';
    console.warn(`[VideoProvider] Scene ${params.sceneNumber}: ${aiFailureReason} — using offline placeholder graphic.`);
  }

  // Case 4: Dynamic Bespoke Visual Generation (Explaining what this scene is actually saying)
  try {
    console.log(`[VideoProvider] Dynamically generating bespoke visual for Scene ${params.sceneNumber} (${params.caption || params.topic})...`);
    const bespokeJpg = await generateBespokeSceneVisual(params);
    return {
      assetPath: bespokeJpg,
      type: 'image',
      source: 'bespoke_scene_visual',
      fallbackReason: aiFailureReason,
    };
  } catch (genErr: any) {
    console.error(`[VideoProvider] Failed to generate visual for Scene ${params.sceneNumber}:`, genErr?.message);
    throw new Error(
      `Visual asset generation failed for Scene ${params.sceneNumber}: ${genErr?.message || 'Unable to generate scene visual'}`,
      { cause: genErr }
    );
  }
}

