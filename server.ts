
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { requireFirebaseAuth } from './server/authMiddleware.js';
import { generateSomaliScript } from './server/scriptGenerator.js';
import { assembleReelMp4, AssembleReelResult } from './server/videoAssembler.js';

const app = express();
// Hosting platforms like Render assign a port at runtime via the PORT env
// var and expect the app to bind to it — falls back to 3000 for local dev.
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// The frontend and this API are always served from the same origin (this
// same Express app, in both dev and prod), so no cross-origin requests are
// ever legitimate here. A wide-open `Access-Control-Allow-Origin: *` would
// let any website on the internet call these endpoints — including the
// ones that invoke paid Gemini APIs and spawn ffmpeg — directly
// from a visitor's browser. Omitting CORS headers entirely means the
// browser's default same-origin policy blocks any such cross-site call.
app.use(express.json({ limit: '50mb' }));

// Minimal in-memory per-IP rate limiter for the expensive endpoints below
// (AI script generation, ffmpeg/TTS reel assembly, asset uploads). This is a
// single-process app, so an in-memory window counter is sufficient; it
// exists to blunt casual abuse/cost-runup, not as a substitute for auth.
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (now > bucket.resetAt) rateLimitBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Key by the authenticated user when available (set by requireFirebaseAuth,
    // which always runs first on these routes) rather than IP, so a shared IP
    // doesn't throttle multiple different signed-in users and a single user
    // can't dodge the limit by switching networks.
    const key = req.user?.uid || req.ip || 'unknown';
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (bucket.count >= options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    bucket.count += 1;
    next();
  };
}

const exportsDir = path.join(process.cwd(), 'public', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ffmpeg: true,
    platform: 'xeero-ai-reel-studio-flow-optimized',
  });
});

// Script generation endpoint (offline / deterministic, no Gemini)
app.post('/api/generate-script', requireFirebaseAuth(), rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }), async (req: Request, res: Response) => {
  try {
    const { topic, description, targetDuration, pacing, tone, customScript } = req.body;
    if (!topic && !description && !customScript) {
      return res.status(400).json({ error: 'Topic or description is required' });
    }
    const result = await generateSomaliScript({
      topic: topic || (description ? description.slice(0, 45) : 'Xeero AI Reel'),
      description,
      targetDuration: targetDuration || 35,
      pacing,
      tone,
      customScript,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Error generating script:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate Somali script' });
  }
});

// Asset upload endpoint for Google Flow MP4 clips, images, and Ubax voice audio
const UPLOAD_MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/aac': '.aac',
};
const MAX_UPLOAD_ASSET_BYTES = 40 * 1024 * 1024; // 40MB decoded

app.post('/api/upload-asset', requireFirebaseAuth(), rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }), async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Asset data is required' });
    }

    // Trust only the declared MIME type against an explicit allowlist — never
    // fall back to a guessed/default extension for an unrecognized or
    // missing MIME type, which previously let arbitrary content be stored
    // (and immediately web-served) under a trusted-looking extension.
    if (!data.includes(';base64,')) {
      return res.status(400).json({ error: 'Asset data must be a data URL (data:<mime>;base64,...)' });
    }
    const [header, base64Data] = data.split(';base64,');
    const mime = header.replace('data:', '').toLowerCase();
    const extension = UPLOAD_MIME_EXTENSIONS[mime];
    if (!extension) {
      return res.status(400).json({ error: `Unsupported asset type: ${mime || 'unknown'}` });
    }

    const approxBytes = Math.floor((base64Data || '').length * 0.75);
    if (approxBytes > MAX_UPLOAD_ASSET_BYTES) {
      return res.status(413).json({ error: 'Asset exceeds the maximum allowed size (40MB)' });
    }

    const safeName = `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${extension}`;
    const targetPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

    const isVideo = ['.mp4', '.webm', '.mov'].includes(extension);
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension);
    const assetType = isVideo ? 'video' : isImage ? 'image' : 'audio';

    res.json({
      success: true,
      url: `/uploads/${safeName}`,
      filename: safeName,
      type: assetType,
    });
  } catch (err: any) {
    console.error('Error uploading asset:', err);
    res.status(500).json({ error: err?.message || 'Failed to upload asset' });
  }
});

// Reel Assembly: runs as a background job rather than one long HTTP request.
// assembleReelMp4() drives several minutes of ffmpeg/TTS work; even now that
// those calls are non-blocking (execAsync instead of execSync), the render
// itself is still slow, so the client starts a job here and polls
// GET /api/assemble-reel/:jobId for its status instead of holding one
// request open for the whole duration.
interface AssembleJob {
  status: 'queued' | 'running' | 'done' | 'error';
  result?: AssembleReelResult;
  error?: string;
  ownerUid: string;
  updatedAt: number;
}
const assembleJobs = new Map<string, AssembleJob>();

// Sweep finished jobs after 30 minutes so this map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of assembleJobs) {
    if (job.status !== 'queued' && job.status !== 'running' && now - job.updatedAt > 30 * 60 * 1000) {
      assembleJobs.delete(id);
    }
  }
}, 10 * 60 * 1000).unref();

app.post('/api/assemble-reel', requireFirebaseAuth(), rateLimit({ windowMs: 10 * 60 * 1000, max: 6 }), (req: Request, res: Response) => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const job: AssembleJob = { status: 'queued', ownerUid: req.user!.uid, updatedAt: Date.now() };
  assembleJobs.set(jobId, job);

  // Fire-and-forget: intentionally not awaited, so this request returns
  // immediately and the render proceeds in the background.
  (async () => {
    job.status = 'running';
    job.updatedAt = Date.now();
    try {
      job.result = await assembleReelMp4(req.body);
      job.status = 'done';
    } catch (err: any) {
      console.error('[AssembleJob] Failed:', err?.message);
      job.status = 'error';
      job.error = err?.message || 'Failed to assemble Reel MP4';
    } finally {
      job.updatedAt = Date.now();
    }
  })();

  res.status(202).json({ success: true, jobId, status: 'queued' });
});

app.get('/api/assemble-reel/:jobId', requireFirebaseAuth(), (req: Request, res: Response) => {
  const job = assembleJobs.get(req.params.jobId);
  if (!job || job.ownerUid !== req.user!.uid) {
    return res.status(404).json({ error: 'Job not found (it may have expired).' });
  }
  if (job.status === 'done') {
    return res.json({ ...job.result, success: true, status: 'done' });
  }
  if (job.status === 'error') {
    return res.status(500).json({ success: false, status: 'error', error: job.error });
  }
  res.json({ success: true, status: job.status });
});

// Hardened MP4 download and streaming endpoint
app.get('/api/download-reel-mp4', async (req: Request, res: Response) => {
  try {
    const requestedFile = (req.query.filename as string) || '';

    let resolvedPath = '';
    if (requestedFile) {
      const sanitized = path.basename(requestedFile);
      const target = path.join(exportsDir, sanitized);
      if (fs.existsSync(target)) {
        resolvedPath = target;
      }
    }

    // If not found, find latest valid MP4 in exports
    if (!resolvedPath) {
      const files = fs.readdirSync(exportsDir)
        .filter(f => f.endsWith('.mp4'))
        .map(f => ({ name: f, time: fs.statSync(path.join(exportsDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 0) {
        resolvedPath = path.join(exportsDir, files[0].name);
      }
    }

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'MP4 file not found' });
    }

    const stats = fs.statSync(resolvedPath);
    const filename = path.basename(resolvedPath);

    // HTTP Range request support for mobile streaming
    const range = req.headers.range;
    if (range) {
      // A suffix range (`bytes=-500`, meaning "last 500 bytes") has an empty
      // start; everything else is a normal `bytes=start-end` (end optional).
      const parts = range.replace(/bytes=/, '').split('-');
      const isSuffix = parts[0] === '';
      const start = isSuffix ? Math.max(0, stats.size - parseInt(parts[1], 10)) : parseInt(parts[0], 10);
      let end = isSuffix || !parts[1] ? stats.size - 1 : parseInt(parts[1], 10);

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stats.size) {
        res.setHeader('Content-Range', `bytes */${stats.size}`);
        return res.status(416).end();
      }
      end = Math.min(end, stats.size - 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
      });
      return pipeWithErrorHandling(fs.createReadStream(resolvedPath, { start, end }), res);
    }

    // Full file download. Content-Length is intentionally omitted: Cloud Run
    // caps a single non-chunked response at 32MB, which these 30-50MB reel
    // MP4s exceed — omitting it lets the response stream as chunked
    // transfer-encoding instead, which isn't subject to that cap.
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });

    pipeWithErrorHandling(fs.createReadStream(resolvedPath), res);
  } catch (err: any) {
    console.error('Error serving MP4:', err);
    res.status(500).json({ error: 'Failed to deliver MP4 file' });
  }
});

// Real reel library listing endpoint — reads the actual exports folder
// instead of a hardcoded list, so the dashboard/projects views always
// reflect what has really been generated.
app.get('/api/list-reels', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(exportsDir)
      .filter((f) => f.toLowerCase().endsWith('.mp4'))
      .map((f) => {
        const stats = fs.statSync(path.join(exportsDir, f));
        return {
          filename: f,
          sizeBytes: stats.size,
          createdAtMs: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    res.json({ success: true, reels: files });
  } catch (err: any) {
    console.error('Error listing reels:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to list reels' });
  }
});

// Cloud Run (and similar platforms) cap a single non-chunked HTTP response at
// 32MB; express.static sends a Content-Length for a plain GET with no Range
// header, which puts our 30-50MB reel MP4s over that cap and gets the
// response killed mid-transfer. Serving exports through this dedicated route
// instead — omitting Content-Length so the response streams as chunked
// transfer-encoding when no Range is requested — keeps it under that limit
// regardless of whether the player asks for a Range up front.
function pipeWithErrorHandling(stream: fs.ReadStream, res: Response) {
  stream.on('error', (err) => {
    console.error('Error streaming file:', err);
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

app.get('/exports/:filename', (req: Request, res: Response) => {
  const filePath = path.join(exportsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }

  const stats = fs.statSync(filePath);
  const range = req.headers.range;
  res.setHeader('Last-Modified', stats.mtime.toUTCString());
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(stats.mtime.toUTCString())) {
    return res.status(304).end();
  }

  if (range) {
    // A suffix range (`bytes=-500`, meaning "last 500 bytes") has an empty
    // start; everything else is a normal `bytes=start-end` (end optional).
    const parts = range.replace(/bytes=/, '').split('-');
    const isSuffix = parts[0] === '';
    const start = isSuffix ? Math.max(0, stats.size - parseInt(parts[1], 10)) : parseInt(parts[0], 10);
    let end = isSuffix || !parts[1] ? stats.size - 1 : parseInt(parts[1], 10);

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stats.size) {
      res.setHeader('Content-Range', `bytes */${stats.size}`);
      return res.status(416).end();
    }
    end = Math.min(end, stats.size - 1);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });
    pipeWithErrorHandling(fs.createReadStream(filePath, { start, end }), res);
  } else {
    res.writeHead(200, {
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });
    pipeWithErrorHandling(fs.createReadStream(filePath), res);
  }
});

// Serve public static directory (including exports and images)
app.use(express.static(path.join(process.cwd(), 'public')));

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Xeero AI Reel Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
