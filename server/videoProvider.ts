import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export interface VisualAssetResult {
  assetPath: string;
  type: 'video' | 'image';
  source: 'uploaded_flow' | 'bespoke_scene_visual' | 'matched_asset' | 'ai_generated_visual';
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
 * Generates a real AI image for a scene using its visualPrompt/flowPrompt
 * (written by the script generator as a still-image-generator prompt).
 *
 * Uses `generateContent` on image-capable Gemini models (such as
 * `gemini-3.1-flash-lite-image` or `gemini-3.1-flash-image`), extracting
 * the inline image data from the response candidates.
 *
 * Falls through to the next candidate on any error, and throws only if every candidate
 * fails, allowing the caller to fall back to the offline bespoke SVG visual.
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
    outputDir = '/tmp',
  } = params;

  const promptText = (visualPrompt || flowPrompt || `${subject} ${action} ${environment}`.trim() || topic).trim();
  if (!promptText) {
    throw new Error(`Scene ${sceneNumber}: No visual prompt available for AI image generation`);
  }

  const fullPrompt = `${promptText}. Vertical 9:16 portrait aspect ratio, premium cinematic editorial photography, sharp focus, no on-image text, no captions, no watermark.`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const jpgPath = path.join(outputDir, `scene_${sceneNumber}_ai_visual.jpg`);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const envModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const isDeprecated = envModel && (
    envModel.includes('2.5') ||
    envModel.includes('2.0') ||
    envModel.includes('1.5')
  );

  // Preferred image models: nano banana series models
  const candidateModels: string[] = [
    envModel && !isDeprecated ? envModel : 'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image-preview',
    'gemini-3-pro-image',
  ].filter((m, idx, arr): m is string => !!m && arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '9:16',
          },
        },
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
        throw new Error(`Model ${model} returned no image bytes in candidates`);
      }

      fs.writeFileSync(jpgPath, Buffer.from(imageBytes, 'base64'));

      if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
        throw new Error(`AI image for Scene ${sceneNumber} was written but appears invalid`);
      }

      console.log(`[VideoProvider] Generated AI image for Scene ${sceneNumber} using model: ${model}`);
      return jpgPath;
    } catch (err: any) {
      lastError = err;
      console.warn(`[VideoProvider] AI image generation with ${model} failed for Scene ${sceneNumber}: ${err?.message || err}`);
    }
  }

  throw new Error(`All AI image models failed for Scene ${sceneNumber}: ${lastError?.message || 'unknown error'}`);
}

/**
 * Dynamically generates a scene-specific visual graphic (1080x1920, 9:16)
 * specifically illustrating that scene's narration, key message, subject, and action.
 */
export async function generateBespokeSceneVisual(params: ResolveVisualParams): Promise<string> {
  const {
    sceneNumber,
    totalScenes = 6,
    topic = 'Xeero AI Reel',
    caption = '',
    voiceover = '',
    keyMessage = '',
    visualObjective = '',
    subject = '',
    action = '',
    environment = '',
    cameraComposition = '',
    outputDir = '/tmp',
  } = params;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgPath = path.join(outputDir, `scene_${sceneNumber}_visual.svg`);
  const jpgPath = path.join(outputDir, `scene_${sceneNumber}_visual.jpg`);

  const combinedContext = `${topic} ${caption} ${voiceover} ${subject} ${environment}`;
  const theme = getTopicTheme(combinedContext);

  const safeTopic = escapeXml((topic || 'XEERO AI').toUpperCase());
  const safeCaption = escapeXml((caption || `MUUQAALKA ${sceneNumber}`).toUpperCase());
  const safeMessage = escapeXml(keyMessage || voiceover.slice(0, 75));
  const safeObjective = escapeXml(visualObjective || `U kuurgalidda ${subject || topic}`);
  const safeSubject = escapeXml(subject || 'Habka Tignoolajiyada AI');
  const safeAction = escapeXml(action || 'Falanqeynta xogta iyo horumarka');
  const safeEnv = escapeXml(environment || 'Xarunta Hal-abuurka');
  const safeCamera = escapeXml(cameraComposition || 'Dynamic 9:16 Cinematic Angle');

  // Scene-specific focal geometry according to scene sequence
  let focalGraphic = '';
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
    // Informational / Mechanism Scenes: Data Flow & Telemetry Hub
    focalGraphic = `
      <circle cx="0" cy="0" r="270" fill="none" stroke="${theme.primary}" stroke-width="2" stroke-dasharray="16 8" opacity="0.4" />
      <circle cx="0" cy="0" r="220" fill="${theme.bgMid}" fill-opacity="0.3" stroke="${theme.secondary}" stroke-width="3" />
      <!-- Central processing square nodes -->
      <rect x="-80" y="-80" width="160" height="160" rx="24" fill="${theme.primary}" fill-opacity="0.2" stroke="${theme.secondary}" stroke-width="4" />
      <!-- Orbital telemetry connectors -->
      <line x1="0" y1="-80" x2="0" y2="-210" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="0" cy="-210" r="18" fill="${theme.secondary}" />
      <line x1="-80" y1="0" x2="-210" y2="0" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="-210" r="18" fill="${theme.secondary}" />
      <line x1="80" y1="0" x2="210" y2="0" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="210" r="18" fill="${theme.secondary}" />
      <line x1="0" y1="80" x2="0" y2="210" stroke="${theme.primary}" stroke-width="4" stroke-dasharray="8 6" />
      <circle cx="0" cy="210" r="18" fill="${theme.secondary}" />
      <!-- Inner core pulse -->
      <circle cx="0" cy="0" r="40" fill="${theme.primary}" />
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

  <!-- Explanatory Narrative Cards (The 6 Visual Requirements) -->
  <g transform="translate(70, 1130)">
    <!-- Main Card Box -->
    <rect width="940" height="380" rx="24" fill="#000000" fill-opacity="0.75" stroke="${theme.primary}" stroke-width="2" stroke-opacity="0.6" />

    <!-- Card 1: Key Message -->
    <text x="40" y="55" fill="${theme.secondary}" font-size="22" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="2">1. FARRIINTA MUHIIMKA AH (KEY MESSAGE)</text>
    <text x="40" y="95" fill="${theme.lightText}" font-size="26" font-family="system-ui, sans-serif" font-weight="600">${safeMessage}</text>

    <line x1="40" y1="125" x2="900" y2="125" stroke="${theme.primary}" stroke-width="1" stroke-opacity="0.25" />

    <!-- Card 2: Subject & Action -->
    <text x="40" y="165" fill="${theme.secondary}" font-size="20" font-family="system-ui, sans-serif" font-weight="700">2. WAXA MUUQDA (SUBJECT &amp; ACTION):</text>
    <text x="40" y="200" fill="${theme.lightText}" font-size="22" font-family="system-ui, sans-serif" font-weight="500">${safeSubject} — ${safeAction}</text>

    <line x1="40" y1="230" x2="900" y2="230" stroke="${theme.primary}" stroke-width="1" stroke-opacity="0.25" />

    <!-- Card 3: Visual Objective & Setting -->
    <text x="40" y="270" fill="${theme.secondary}" font-size="20" font-family="system-ui, sans-serif" font-weight="700">3. HADAFTA &amp; DEEGAANKA (OBJECTIVE &amp; SETTING):</text>
    <text x="40" y="305" fill="${theme.lightText}" font-size="22" font-family="system-ui, sans-serif" font-weight="400">${safeObjective}</text>
    <text x="40" y="340" fill="${theme.primary}" font-size="18" font-family="system-ui, sans-serif" font-weight="500">${safeEnv} • ${safeCamera}</text>
  </g>

  <!-- Bottom Brand Footer -->
  <rect x="240" y="1770" width="600" height="50" rx="25" fill="${theme.primary}" fill-opacity="0.15" stroke="${theme.primary}" stroke-width="1" />
  <text x="540" y="1803" fill="${theme.primary}" font-size="22" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle" letter-spacing="4">BARO AI • AF-SOOMAALI • XEERO.AI</text>
</svg>`;

  fs.writeFileSync(svgPath, svgContent, 'utf8');

  try {
    // Render 1080x1920 JPG using FFmpeg librsvg in milliseconds
    execSync(
      `ffmpeg -y -i "${svgPath}" -vf "scale=1080:1920" -q:v 2 "${jpgPath}"`,
      { stdio: 'pipe' }
    );

    if (!fs.existsSync(jpgPath) || fs.statSync(jpgPath).size < 1000) {
      throw new Error(`FFmpeg did not create valid image at ${jpgPath}`);
    }

    return jpgPath;
  } catch (err: any) {
    console.error(`[VideoProvider] Failed to render bespoke scene visual for Scene ${sceneNumber}:`, err?.message);
    throw new Error(`Scene ${sceneNumber} visual generation failed: ${err?.message}`);
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

  // Case 1: Custom user-uploaded file (e.g. /uploads/flow_video.mp4 or /uploads/image.png)
  const requestedUrl = params.visualUrl || params.videoUrl;
  if (requestedUrl && (requestedUrl.includes('/uploads/') || requestedUrl.startsWith('data:'))) {
    const cleanUrl = requestedUrl.replace(/^\//, '');
    const candidatePath = path.join(publicDir, cleanUrl);

    if (fs.existsSync(candidatePath)) {
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
      console.warn(`[VideoProvider] AI image generation unavailable for Scene ${params.sceneNumber}, falling back to bespoke visual: ${aiErr?.message}`);
    }
  }

  // Case 4: Dynamic Bespoke Visual Generation (Explaining what this scene is actually saying)
  try {
    console.log(`[VideoProvider] Dynamically generating bespoke visual for Scene ${params.sceneNumber} (${params.caption || params.topic})...`);
    const bespokeJpg = await generateBespokeSceneVisual(params);
    return {
      assetPath: bespokeJpg,
      type: 'image',
      source: 'bespoke_scene_visual',
    };
  } catch (genErr: any) {
    console.error(`[VideoProvider] Failed to generate visual for Scene ${params.sceneNumber}:`, genErr?.message);
    throw new Error(
      `Visual asset generation failed for Scene ${params.sceneNumber}: ${genErr?.message || 'Unable to generate scene visual'}`
    );
  }
}
