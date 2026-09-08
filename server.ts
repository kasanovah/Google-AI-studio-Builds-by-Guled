import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { generateSomaliScript } from './server/scriptGenerator.js';
import { assembleReelMp4, validateMp4File } from './server/videoAssembler.js';

const app = express();
const PORT = 3000;

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  next();
});
app.use(express.json({ limit: '50mb' }));

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
app.post('/api/generate-script', async (req: Request, res: Response) => {
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
app.post('/api/upload-asset', async (req: Request, res: Response) => {
  try {
    const { filename, data, type } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Asset data is required' });
    }

    let base64Data = data;
    let extension = '.mp4';
    if (data.includes(';base64,')) {
      const parts = data.split(';base64,');
      const mime = parts[0].replace('data:', '');
      base64Data = parts[1];
      if (mime.includes('video/mp4')) extension = '.mp4';
      else if (mime.includes('video/webm')) extension = '.webm';
      else if (mime.includes('image/jpeg')) extension = '.jpg';
      else if (mime.includes('image/png')) extension = '.png';
      else if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) extension = '.mp3';
      else if (mime.includes('audio/wav')) extension = '.wav';
    } else if (filename) {
      const ext = path.extname(filename).toLowerCase();
      if (ext) extension = ext;
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

// Reel Assembly endpoint
app.post('/api/assemble-reel', async (req: Request, res: Response) => {
  try {
    const result = await assembleReelMp4(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Error assembling reel:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to assemble Reel MP4',
    });
  }
});

// Hardened MP4 download and streaming endpoint
app.get('/api/download-reel-mp4', async (req: Request, res: Response) => {
  try {
    const requestedFile = (req.query.filename as string) || '';
    const isBase64Fallback = req.query.b64 === '1';

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

    // Base64 JSON fallback for safe iframe memory extraction
    if (isBase64Fallback) {
      const fileBuffer = fs.readFileSync(resolvedPath);
      return res.json({
        success: true,
        filename,
        size: stats.size,
        mimeType: 'video/mp4',
        base64: fileBuffer.toString('base64'),
      });
    }

    // HTTP Range request support for mobile streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
      });
      const stream = fs.createReadStream(resolvedPath, { start, end });
      return stream.pipe(res);
    }

    // Full file download
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error serving MP4:', err);
    res.status(500).json({ error: 'Failed to deliver MP4 file' });
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
