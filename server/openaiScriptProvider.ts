import { SceneBlueprint, buildScriptPrompt } from './scriptGenerator.js';

// Cheapest capable models first. Script generation is one call per reel, so
// this is a rounding error next to the six images, but there is no reason to
// pay for a frontier model to write six short Somali paragraphs.
const FALLBACK_OPENAI_TEXT_MODELS = [
  'gpt-5.4-mini',
  'gpt-5-mini',
  'gpt-5.4-nano',
  'gpt-5.5',
  'gpt-4.1-mini',
];

const SCENE_COUNT = 6;

// Mirrors GEMINI_SCRIPT_SCHEMA. OpenAI structured outputs require every
// property to be listed in `required` and additionalProperties:false, so the
// model cannot quietly omit a field the render pipeline depends on.
const OPENAI_SCRIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'scenes'],
  properties: {
    title: { type: 'string', description: 'Short, scroll-stopping Somali title for the reel (max ~8 words).' },
    scenes: {
      type: 'array',
      minItems: SCENE_COUNT,
      maxItems: SCENE_COUNT,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'voiceover', 'caption', 'keyMessage', 'visualObjective', 'subject',
          'action', 'environment', 'cameraComposition', 'visualPrompt', 'flowPrompt', 'visualKeywords',
        ],
        properties: {
          voiceover: { type: 'string', description: 'Natural spoken Somali narration for this scene, one or two sentences.' },
          caption: { type: 'string', description: 'Short on-screen Somali caption for this scene, numbered for scenes 1-5, exactly "Ku Xirnow Xeero AI!" for the final scene.' },
          keyMessage: { type: 'string', description: "One-sentence Somali summary of this scene's core point." },
          visualObjective: { type: 'string', description: 'English description of what the visual should communicate.' },
          subject: { type: 'string', description: 'Somali description of the main visual subject.' },
          action: { type: 'string', description: 'Somali description of what is happening in the shot.' },
          environment: { type: 'string', description: 'Somali description of the setting.' },
          cameraComposition: { type: 'string', description: 'English camera/shot description.' },
          visualPrompt: { type: 'string', description: 'English cinematic image-generation prompt for a 9:16 still.' },
          flowPrompt: { type: 'string', description: 'English 9:16 24fps video-generation prompt, starting "Vertical 9:16 cinematic" and ending "24fps".' },
          visualKeywords: { type: 'array', items: { type: 'string' }, description: "Short English tag words for this scene's visual." },
        },
      },
    },
  },
};

const BILLING_ERROR = /insufficient_quota|billing_hard_limit|exceeded your current quota|billing/i;
const TRANSIENT_ERROR = /\b429\b|\b5\d\d\b|rate.?limit|overloaded|server.?error|timeout|timed? ?out|ETIMEDOUT|ECONNRESET/i;

function candidateModels(): string[] {
  const override = process.env.OPENAI_SCRIPT_MODEL?.trim();
  return [...(override ? [override] : []), ...FALLBACK_OPENAI_TEXT_MODELS]
    .filter((m, i, arr) => arr.indexOf(m) === i);
}

async function requestScript(model: string, prompt: string, apiKey: string): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, '') || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'xeero_reel_script', strict: true, schema: OPENAI_SCRIPT_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${response.status} ${payload?.error?.message || payload?.error?.code || 'request failed'}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error(`${model} returned an empty script`);
  }
  return String(content);
}

/**
 * Writes the reel script through OpenAI, returning the same shape as the
 * Gemini generator so the rest of the pipeline cannot tell them apart.
 *
 * Exists because a script is the one thing with no acceptable fallback: the
 * offline templates are canned content about a fixed set of subjects, so a
 * reel built from them is about the wrong topic entirely.
 */
export async function generateScenesWithOpenAI(params: {
  topic: string;
  description?: string;
  targetDuration: number;
}): Promise<{ title: string; scenes: SceneBlueprint[] }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const { topic, description = '', targetDuration } = params;
  const prompt = buildScriptPrompt({ topic, description, targetDuration });

  let lastError: any = null;
  let rawText: string | undefined;
  let usedModel = '';

  outer: for (const model of candidateModels()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        rawText = await requestScript(model, prompt, apiKey);
        usedModel = model;
        break outer;
      } catch (err: any) {
        lastError = err;
        const message = err?.message || String(err);

        if (BILLING_ERROR.test(message)) {
          throw new Error(`OpenAI script generation unavailable: ${message}`, { cause: err });
        }

        const transient = TRANSIENT_ERROR.test(message);
        console.warn(`[OpenAIScript] "${model}" attempt ${attempt} failed${transient ? ' (transient)' : ''}: ${message}`);
        if (transient && attempt === 1) {
          await new Promise((r) => setTimeout(r, 4_000));
          continue;
        }
        break;
      }
    }
  }

  if (!rawText) {
    throw new Error(`All OpenAI script models failed: ${lastError?.message || 'unknown error'}`);
  }

  let parsed: { title?: string; scenes?: any[] };
  try {
    parsed = JSON.parse(rawText);
  } catch (err: any) {
    throw new Error(`OpenAI returned invalid JSON: ${err?.message}`, { cause: err });
  }

  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length !== SCENE_COUNT) {
    throw new Error(`OpenAI returned ${parsed.scenes?.length ?? 0} scenes, expected ${SCENE_COUNT}`);
  }

  const required = ['voiceover', 'caption', 'keyMessage', 'visualObjective', 'subject', 'action', 'environment', 'cameraComposition', 'visualPrompt', 'flowPrompt'];
  const scenes: SceneBlueprint[] = parsed.scenes.map((s: any, idx: number) => {
    for (const field of required) {
      if (!s[field] || typeof s[field] !== 'string' || !s[field].trim()) {
        throw new Error(`OpenAI scene ${idx + 1} is missing required field "${field}"`);
      }
    }
    return {
      voiceover: s.voiceover.trim(),
      caption: s.caption.trim(),
      keyMessage: s.keyMessage.trim(),
      visualObjective: s.visualObjective.trim(),
      subject: s.subject.trim(),
      action: s.action.trim(),
      environment: s.environment.trim(),
      cameraComposition: s.cameraComposition.trim(),
      visualPrompt: s.visualPrompt.trim(),
      flowPrompt: s.flowPrompt.trim(),
      visualKeywords: Array.isArray(s.visualKeywords) && s.visualKeywords.length > 0
        ? s.visualKeywords.map((k: any) => String(k))
        : ['xeero ai', topic.slice(0, 15), `scene ${idx + 1}`],
    };
  });

  console.log(`[OpenAIScript] Generated script using model: ${usedModel}`);
  return { title: (parsed.title || topic || 'Xeero AI Reel').trim(), scenes };
}
