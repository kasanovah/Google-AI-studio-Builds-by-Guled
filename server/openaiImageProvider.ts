import fs from 'fs';
import path from 'path';
import { execAsync } from './execAsync.js';

// Cheapest first. gpt-image-1-mini at low quality is ~$0.006 per image, so a
// six-scene reel costs about 4 US cents; the larger models are several times
// that for output which is then downscaled into a 1080x1920 frame anyway.
const FALLBACK_OPENAI_MODELS = [
  'gpt-image-1-mini',
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
];

// OpenAI renders portrait at 2:3, the closest it offers to the 9:16 a reel
// needs. The extra width is cropped off after generation, so the prompt has
// to keep the subject away from the edges — see buildPrompt below.
const OPENAI_PORTRAIT_SIZE = '1024x1536';

const TRANSIENT_OPENAI_ERROR = /\b429\b|\b5\d\d\b|rate.?limit|overloaded|server.?error|timeout|timed? ?out|ETIMEDOUT|ECONNRESET/i;
const BILLING_OPENAI_ERROR = /insufficient_quota|billing_hard_limit|exceeded your current quota|billing/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

function candidateModels(): string[] {
  const override = process.env.OPENAI_IMAGE_MODEL?.trim();
  return [...(override ? [override] : []), ...FALLBACK_OPENAI_MODELS]
    .filter((m, i, arr) => arr.indexOf(m) === i);
}

/**
 * Calls OpenAI's image generation endpoint and returns the raw PNG bytes.
 * Throws with the API's own error message so the caller can tell a billing
 * problem apart from a transient one.
 */
async function requestImage(model: string, prompt: string, apiKey: string): Promise<Buffer> {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, '') || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: OPENAI_PORTRAIT_SIZE,
      quality: process.env.OPENAI_IMAGE_QUALITY?.trim() || 'low',
      n: 1,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = payload?.error?.message || payload?.error?.code || `HTTP ${response.status}`;
    throw new Error(`${response.status} ${apiMessage}`);
  }

  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }

  // Older/alternate models can hand back a URL instead of inline base64.
  if (item?.url) {
    const imageRes = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!imageRes.ok) throw new Error(`Could not download generated image (HTTP ${imageRes.status})`);
    return Buffer.from(await imageRes.arrayBuffer());
  }

  throw new Error(`${model} returned no image data`);
}

function buildPrompt(promptText: string, cameraComposition?: string): string {
  return [
    promptText,
    cameraComposition ? `Shot: ${cameraComposition}.` : '',
    'Premium cinematic editorial photography for a technology news brand: photorealistic, highly detailed, sharp focus, dramatic professional lighting, authentic real-world materials, natural proportions.',
    // Measured: a 1024x1536 render scaled to cover 1080x1920 loses exactly
    // 15.6% of its width (80px per edge) and nothing vertically, so the
    // instruction names a concrete safe area rather than "leave a margin".
    'Vertical portrait composition. Keep the subject and every important detail within the central 70% of the image width — the left and right edges are cropped away — with clean empty space either side.',
    'Clean image with no lettering, captions, subtitles, logos or watermarks anywhere in the frame.',
  ].filter(Boolean).join(' ');
}

/**
 * Generates a scene visual through OpenAI and returns a 1080x1920 JPG, ready
 * for the same render path as a Gemini-generated image.
 *
 * Used as the second provider: when Gemini is out of credit every scene would
 * otherwise drop to the offline placeholder graphic, which looks nothing like
 * the cinematic visuals the reel is supposed to have.
 */
export async function generateOpenAIImageVisual(params: {
  sceneNumber: number;
  topic?: string;
  visualPrompt?: string;
  flowPrompt?: string;
  subject?: string;
  action?: string;
  environment?: string;
  cameraComposition?: string;
  outputDir?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
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
    throw new Error(`Scene ${sceneNumber}: No visual prompt available for OpenAI image generation`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const rawPngPath = path.join(outputDir, `scene_${sceneNumber}_openai_raw.png`);
  const jpgPath = path.join(outputDir, `scene_${sceneNumber}_openai_visual.jpg`);
  const fullPrompt = buildPrompt(promptText, cameraComposition);

  let lastError: any = null;

  for (const model of candidateModels()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const bytes = await requestImage(model, fullPrompt, apiKey);
        fs.writeFileSync(rawPngPath, bytes);

        // Cover-and-crop to the reel's 9:16 frame, the same treatment the
        // video path uses, so the scene renderer receives exactly what it
        // expects instead of a 2:3 image it would stretch.
        await execAsync(
          `ffmpeg -y -i "${rawPngPath}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 2 "${jpgPath}"`
        );

        if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
          throw new Error(`OpenAI image for Scene ${sceneNumber} was written but appears invalid`);
        }

        try {
          fs.unlinkSync(rawPngPath);
        } catch {}

        console.log(
          `[OpenAIImage] Generated image for Scene ${sceneNumber} using ${model} (${Math.round(fs.statSync(jpgPath).size / 1024)}KB)`
        );
        return jpgPath;
      } catch (err: any) {
        lastError = err;
        const message = err?.message || String(err);

        // A spent balance rejects every model the same way — no point paging
        // through the rest of the list to be told so four more times.
        if (BILLING_OPENAI_ERROR.test(message)) {
          console.error(`[OpenAIImage] OpenAI billing/quota exhausted: ${message}`);
          throw new Error(`OpenAI image generation unavailable: ${message}`, { cause: err });
        }

        const transient = TRANSIENT_OPENAI_ERROR.test(message);
        console.warn(`[OpenAIImage] Scene ${sceneNumber} attempt failed [${model} / try ${attempt}]${transient ? ' (transient)' : ''}: ${message}`);

        if (transient && attempt === 1) {
          await sleep(4_000);
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`All OpenAI image models failed for Scene ${sceneNumber}: ${lastError?.message || 'unknown error'}`);
}

/**
 * Live check of the OpenAI image path for the in-app diagnostic: reports
 * whether a key is present and the verbatim error from a real generation.
 */
export async function diagnoseOpenAIImage(): Promise<Record<string, unknown>> {
  if (!isOpenAIConfigured()) {
    return { configured: false, note: 'OPENAI_API_KEY is not set on this server.' };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const model = candidateModels()[0];
  try {
    const bytes = await requestImage(model, 'A single ripe red apple on a plain wooden table, cinematic lighting, photorealistic.', apiKey);
    return { configured: true, model, ok: bytes.length > 1000, bytes: bytes.length };
  } catch (err: any) {
    return { configured: true, model, ok: false, error: (err?.message || String(err)).slice(0, 300) };
  }
}
