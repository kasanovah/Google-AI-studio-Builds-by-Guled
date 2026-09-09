import fs from 'fs';
import path from 'path';
import { execAsync } from './execAsync.js';

export interface SceneRenderResult {
  videoPath: string;
  duration: number;
}

interface CaptionLayout {
  formattedText: string;
  fontSize: number;
  lineSpacing: number;
  boxHeight: number;
  boxY: number;
  textY: number;
}

/**
 * Robust fit-to-box/wrap calculation for vertical 9:16 Somali reels.
 * 1. Wraps text naturally by words without breaking words mid-character.
 * 2. Calculates available width and height inside safe margins.
 * 3. Dynamically reduces font size when text is long.
 * 4. Allows background text container to expand vertically.
 * 5. Keeps 100% of text visible inside safe margins.
 */
function computeCaptionLayout(
  caption: string,
  frameWidth = 1080,
  frameHeight = 1920
): CaptionLayout {
  const cleanCaption = (caption || '').replace(/\r?\n/g, ' ').trim();
  const charCount = cleanCaption.length;

  // 1. Determine font size and line character budget based on length
  let fontSize = 42;
  let lineSpacing = 14;
  let maxCharsPerLine = 26;

  if (charCount > 105) {
    fontSize = 26;
    lineSpacing = 8;
    maxCharsPerLine = 44;
  } else if (charCount > 70) {
    fontSize = 30;
    lineSpacing = 10;
    maxCharsPerLine = 38;
  } else if (charCount > 35) {
    fontSize = 36;
    lineSpacing = 12;
    maxCharsPerLine = 32;
  }

  // 2. Natural word wrapping (never splits words mid-character)
  const words = cleanCaption.split(/\s+/);
  let lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  if (lines.length === 0) {
    lines = [cleanCaption];
  }

  // 3. Multi-line safety check: if line count > 3, step down font size to prevent overflow
  if (lines.length > 3 && fontSize > 28) {
    fontSize = Math.max(26, fontSize - 6);
    lineSpacing = Math.max(8, lineSpacing - 4);
    maxCharsPerLine = Math.round(maxCharsPerLine * 1.25);
    const reWrapped: string[] = [];
    let cur = '';
    for (const word of words) {
      if (!word) continue;
      const test = cur ? `${cur} ${word}` : word;
      if (test.length <= maxCharsPerLine) {
        cur = test;
      } else {
        if (cur) reWrapped.push(cur);
        cur = word;
      }
    }
    if (cur) reWrapped.push(cur);
    lines = reWrapped.length > 0 ? reWrapped : lines;
  }

  // 4. Calculate dynamic container height and safe vertical placement
  const numLines = Math.max(1, lines.length);
  const totalTextHeight = numLines * fontSize + (numLines - 1) * lineSpacing;
  const verticalPadding = 34;
  const boxHeight = Math.max(180, totalTextHeight + verticalPadding * 2);

  // Safe bottom margin: 160px from bottom edge (reserves room for standard TikTok/IG reel controls)
  const bottomMargin = 160;
  const boxY = Math.max(1150, frameHeight - boxHeight - bottomMargin);
  const textY = boxY + Math.round((boxHeight - totalTextHeight) / 2);

  return {
    formattedText: lines.join('\n'),
    fontSize,
    lineSpacing,
    boxHeight,
    boxY,
    textY,
  };
}

export async function renderSceneVideo(params: {
  assetPath: string;
  assetType?: 'video' | 'image';
  duration: number;
  captionText: string;
  outputDir: string;
  sceneIndex: number;
  width?: number;
  height?: number;
  fps?: number;
}): Promise<SceneRenderResult> {
  const {
    assetPath,
    assetType = assetPath.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
    duration,
    captionText,
    outputDir,
    sceneIndex,
    width = 1080,
    height = 1920,
    fps = 25,
  } = params;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const rawVideoPath = path.join(outputDir, 'video_raw.mp4');
  const captionFilePath = path.join(outputDir, 'caption.txt');

  // Compute robust fit-to-box layout and write wrapped text
  const layout = computeCaptionLayout(captionText, width, height);
  fs.writeFileSync(captionFilePath, layout.formattedText, 'utf8');

  // Font fallback check
  let fontArg = '';
  const fontPaths = [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
  ];
  for (const fp of fontPaths) {
    if (fs.existsSync(fp)) {
      fontArg = `fontfile='${fp}':`;
      break;
    }
  }

  // Draw overlay: Top brand pill + Bottom dynamic high-contrast caption
  const topBrandFilter = `drawbox=x=0:y=0:w=${width}:h=200:color=black@0.65:t=fill,drawtext=${fontArg}text='XEERO AI • BARO AI AF SOOMAALI':fontcolor=#38BDF8:fontsize=34:x=(w-text_w)/2:y=80:box=1:boxcolor=black@0.6:boxborderw=12`;
  const captionFilter = `drawbox=x=0:y=${layout.boxY}:w=${width}:h=${layout.boxHeight}:color=black@0.75:t=fill,drawtext=${fontArg}textfile='${captionFilePath}':fontcolor=#FFFFFF:fontsize=${layout.fontSize}:line_spacing=${layout.lineSpacing}:box=1:boxcolor=#0284C7@0.92:boxborderw=16:fix_bounds=true:x=(w-text_w)/2:y=${layout.textY}:shadowcolor=black@0.85:shadowx=2:shadowy=2`;

  try {
    if (assetType === 'video') {
      // Flow MP4 Video Clip processing: scale & center crop to 9:16 vertical (1080x1920)
      const videoFilters = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,${topBrandFilter},${captionFilter}`;
      const cmd = `ffmpeg -y -stream_loop -1 -i "${assetPath}" -vf "${videoFilters}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r ${fps} -an -t ${duration} "${rawVideoPath}"`;
      await execAsync(cmd);
    } else {
      // Image processing with subtle dynamic motion
      const totalFrames = Math.max(25, Math.round(duration * fps));
      const zoomDirection = sceneIndex % 2 === 0
        ? `zoompan=z='min(zoom+0.0018,1.25)':d=${totalFrames}:x='if(lte(on,1),(iw/2)-(iw/zoom/2),max(0,x-1.0))':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`
        : `zoompan=z='min(zoom+0.0020,1.28)':d=${totalFrames}:x='if(lte(on,1),(iw/2)-(iw/zoom/2),min(iw-iw/zoom,x+1.0))':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;

      const videoFilter = `${zoomDirection},${topBrandFilter},${captionFilter}`;
      const cmd = `ffmpeg -y -i "${assetPath}" -vf "${videoFilter}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r ${fps} -t ${duration} "${rawVideoPath}"`;
      await execAsync(cmd);
    }
  } catch (err: any) {
    console.warn('[OmniVideo] Complex filter failed, attempting fallback simple scale:', err?.message);
    const simpleFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
    if (assetType === 'video') {
      await execAsync(
        `ffmpeg -y -stream_loop -1 -i "${assetPath}" -vf "${simpleFilter}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r ${fps} -an -t ${duration} "${rawVideoPath}"`
      );
    } else {
      await execAsync(
        `ffmpeg -y -loop 1 -i "${assetPath}" -vf "${simpleFilter}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r ${fps} -t ${duration} "${rawVideoPath}"`
      );
    }
  }

  return {
    videoPath: rawVideoPath,
    duration,
  };
}
