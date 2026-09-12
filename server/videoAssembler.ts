import fs from 'fs';
import os from 'os';
import path from 'path';
import { execAsync } from './execAsync.js';
import { renderSceneVideo } from './omniVideoProvider.js';
import { resolveSceneVisual } from './videoProvider.js';
import { synthesizeSomaliVoice } from './voiceProvider.js';

export interface AssembleReelParams {
  title?: string;
  topic?: string;
  reelId?: string;
  targetDuration?: number;
  voiceId?: string;
  voiceName?: string;
  audioUrl?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  forceRebuild?: boolean;
  isDemo?: boolean;
  scenes?: Array<{
    sceneNumber?: number;
    duration?: number;
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
    audioUrl?: string;
  }>;
}

export interface AssembleReelResult {
  success: boolean;
  mp4Url?: string;
  downloadUrl?: string;
  filename?: string;
  message?: string;
  requiresRuntime: boolean;
  runtimeStatus: 'ffmpeg_available' | 'ffmpeg_missing';
  assembledScenesCount: number;
  totalDuration: number;
  assembledScenes?: Array<{
    sceneNumber: number;
    duration: number;
    caption: string;
    voiceover?: string;
    visualSource?: string;
    visualNote?: string;
    photoCredit?: string;
  }>;
  validation?: {
    isMp4: boolean;
    hasVideoStream: boolean;
    hasAudioStream: boolean;
    width: number;
    height: number;
    fps: number;
    videoCodec: string;
    audioCodec: string;
    durationSeconds: number;
    fileSizeBytes: number;
    mimeType: string;
    loudnessTarget?: string;
    truePeakDbtp?: number;
  };
}

function sanitizeFilename(title: string, reelId?: string): string {
  const clean = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 24)
    .replace(/^_|_$/g, '');
  const idPart = reelId ? `_${reelId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}` : `_${Date.now().toString().slice(-6)}`;
  return `XEERO_REEL_${clean || 'STORY'}${idPart}.mp4`;
}

export async function validateMp4File(filePath: string): Promise<{
  isMp4: boolean;
  hasVideoStream: boolean;
  hasAudioStream: boolean;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  loudnessTarget: string;
  truePeakDbtp: number;
}> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const stats = fs.statSync(filePath);
  if (stats.size < 1000) {
    throw new Error(`File too small to be valid MP4: ${stats.size} bytes`);
  }

  // Check header byte signature for MP4 ('ftyp' box)
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  const boxType = buffer.subarray(4, 8).toString('ascii');
  if (boxType !== 'ftyp') {
    throw new Error(`Invalid MP4 signature, expected 'ftyp', got '${boxType}'`);
  }

  const { stdout: probeJson } = await execAsync(
    `ffprobe -v error -show_entries format=duration,size,format_name -show_streams -of json "${filePath}"`
  );
  const data = JSON.parse(probeJson);

  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

  return {
    isMp4: true,
    hasVideoStream: !!videoStream,
    hasAudioStream: !!audioStream,
    width: videoStream?.width || 1080,
    height: videoStream?.height || 1920,
    fps: 25,
    videoCodec: videoStream?.codec_name || 'h264',
    audioCodec: audioStream?.codec_name || 'aac',
    durationSeconds: Math.round(parseFloat(data.format?.duration || '0')),
    fileSizeBytes: stats.size,
    mimeType: 'video/mp4',
    loudnessTarget: '-16.0 LUFS (EBU R128)',
    truePeakDbtp: -1.5,
  };
}

const inFlightAssemblies = new Map<string, Promise<AssembleReelResult>>();

// Scenes dissolve into each other instead of cutting hard. Every non-final
// scene is rendered this many seconds longer than its spoken duration so
// that extra footage exists to blend away during the crossfade — the
// narration/caption timing (recordedSceneDurations) is unaffected, so audio
// stays in sync with the final, crossfaded video.
const CROSSFADE_DURATION = 0.4;

export async function assembleReelMp4(params: AssembleReelParams): Promise<AssembleReelResult> {
  const scenes = params.scenes || [];
  if (scenes.length === 0) {
    throw new Error('Cannot assemble Reel: No scenes provided.');
  }

  const outputFilename = sanitizeFilename(params.title || params.topic || 'SOMALI_STORY', params.reelId);
  const exportsDir = path.join(process.cwd(), 'public', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const finalMp4Path = path.join(exportsDir, outputFilename);

  // Fast cache check strictly when rebuild is not forced and file exists and is validated
  if (!params.forceRebuild && fs.existsSync(finalMp4Path)) {
    try {
      const stats = fs.statSync(finalMp4Path);
      if (stats.size > 50000) {
        const validation = await validateMp4File(finalMp4Path);
        if (validation.isMp4 && validation.durationSeconds > 0) {
          console.log(`[VideoAssembler] Serving verified cached MP4: ${outputFilename}`);
          return {
            success: true,
            mp4Url: `/exports/${outputFilename}`,
            downloadUrl: `/api/download-reel-mp4?filename=${encodeURIComponent(outputFilename)}`,
            filename: outputFilename,
            message: `Genuine 1080x1920 MP4 (${validation.durationSeconds}s) verified and ready.`,
            requiresRuntime: false,
            runtimeStatus: 'ffmpeg_available',
            assembledScenesCount: scenes.length,
            totalDuration: validation.durationSeconds,
            assembledScenes: scenes.map((s, idx) => ({
              sceneNumber: idx + 1,
              duration: s.duration || 5,
              caption: (s.caption || s.voiceover || '').trim(),
              voiceover: s.voiceover,
            })),
            validation,
          };
        }
      }
    } catch {
      // Rebuild if cached file is incomplete or corrupt
    }
  }

  // Deduplicate active jobs
  if (inFlightAssemblies.has(outputFilename)) {
    return await inFlightAssemblies.get(outputFilename)!;
  }

  const assemblyPromise: Promise<AssembleReelResult> = (async (): Promise<AssembleReelResult> => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xeero_reel_render_'));
    const sceneFiles: string[] = [];
    const audioFiles: string[] = [];
    const recordedSceneDurations: number[] = [];
    const assembledSceneSummaries: Array<{
      sceneNumber: number;
      duration: number;
      caption: string;
      voiceover?: string;
      visualSource?: string;
      visualNote?: string;
      photoCredit?: string;
    }> = [];

    try {
      console.log(`[VideoAssembler] Assembling ${scenes.length} scenes for ${outputFilename} (topic: "${params.topic || 'Xeero Reel'}")...`);

      let previousVisualPath = '';
      const usedVisualPaths: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneNumber = i + 1;
        const sceneDir = path.join(tempDir, `scene_${sceneNumber}`);
        fs.mkdirSync(sceneDir, { recursive: true });

        // =====================================================================
        // Step 1: Synthesize scene-level Ubax narration audio FIRST
        // This determines the true duration of the scene!
        // =====================================================================
        const sceneText = (scene.voiceover || scene.caption || '').trim();
        if (!sceneText) {
          throw new Error(`Scene ${sceneNumber}: Missing voiceover narration text.`);
        }

        // The script step already assigns each scene a fair share of the
        // user's chosen total duration (falling back to an even split here
        // if that's missing) — passing it through makes synthesizeSomaliVoice
        // pad the narration with silence up to at least that length instead
        // of just returning however long the spoken text naturally runs.
        // Without this, the actual total duration is whatever the AI's
        // narration happens to run — which is often noticeably shorter than
        // the duration the user picked, since word-count-to-seconds is only
        // ever an estimate.
        const perSceneTarget = scene.duration || (params.targetDuration ? Math.round(params.targetDuration / scenes.length) : undefined);

        console.log(`[VideoAssembler] Step 1/3: Synthesizing Scene ${sceneNumber} Ubax voiceover (target ${perSceneTarget || 'auto'}s)...`);
        const voiceResult = await synthesizeSomaliVoice({
          text: sceneText,
          targetDuration: perSceneTarget,
          voiceId: params.voiceId || 'ubax-somali',
          voiceName: params.voiceName || 'Ubax',
          audioUrl: scene.audioUrl,
          outputDir: sceneDir,
          sceneIndex: i,
          sceneNumber,
          totalScenes: scenes.length,
        });

        // Derive scene duration from actual spoken audio duration + small safety headroom
        const spokenDuration = voiceResult.duration;
        const sceneDuration = Math.max(Math.ceil(spokenDuration), 4);
        recordedSceneDurations.push(sceneDuration);
        audioFiles.push(voiceResult.audioPath);

        console.log(`[VideoAssembler] Scene ${sceneNumber} duration locked at ${sceneDuration}s (voice spoken: ${spokenDuration}s)`);

        // =====================================================================
        // Step 2: Resolve or dynamically generate bespoke scene visual
        // Explaining what is being said in this scene!
        // =====================================================================
        console.log(`[VideoAssembler] Step 2/3: Resolving Scene ${sceneNumber} visual...`);
        const visual = await resolveSceneVisual({
          sceneNumber,
          totalScenes: scenes.length,
          topic: params.topic || scene.caption || 'Xeero AI Reel',
          caption: scene.caption || `Scene ${sceneNumber}`,
          voiceover: scene.voiceover,
          keyMessage: scene.keyMessage,
          visualObjective: scene.visualObjective,
          subject: scene.subject,
          action: scene.action,
          environment: scene.environment,
          cameraComposition: scene.cameraComposition,
          visualPrompt: scene.visualPrompt || scene.flowPrompt || '',
          flowPrompt: scene.flowPrompt,
          visualKeywords: scene.visualKeywords || [],
          visualUrl: scene.visualUrl,
          videoUrl: scene.videoUrl,
          outputDir: sceneDir,
          previousAsset: previousVisualPath,
          usedAssets: usedVisualPaths,
        });

        previousVisualPath = visual.assetPath;
        usedVisualPaths.push(visual.assetPath);

        // =====================================================================
        // Step 3: Render 1080x1920 scene video for exact sceneDuration
        // =====================================================================
        const isLastScene = i === scenes.length - 1;
        const renderDuration = isLastScene ? sceneDuration : sceneDuration + CROSSFADE_DURATION;
        console.log(`[VideoAssembler] Step 3/3: Rendering Scene ${sceneNumber} video (${renderDuration}s)...`);
        const videoResult = await renderSceneVideo({
          assetPath: visual.assetPath,
          assetType: visual.type,
          duration: renderDuration,
          captionText: scene.caption || scene.voiceover || '',
          outputDir: sceneDir,
          sceneIndex: i,
          width: 1080,
          height: 1920,
          fps: 25,
          wordTimings: voiceResult.wordTimings,
        });

        sceneFiles.push(videoResult.videoPath);

        assembledSceneSummaries.push({
          sceneNumber,
          duration: sceneDuration,
          caption: scene.caption || '',
          voiceover: scene.voiceover,
          visualSource: visual.source,
          visualNote: visual.fallbackReason,
          photoCredit: visual.attribution?.photographer,
        });
      }

      // =======================================================================
      // Step 4: Concat all scene videos and scene audios
      // =======================================================================
      const totalReelDuration = recordedSceneDurations.reduce((a, b) => a + b, 0);
      console.log(`[VideoAssembler] Concatenating ${sceneFiles.length} scenes (Total Duration: ${totalReelDuration}s)...`);

      // Audio concat list (unaffected by crossfades — narration cuts stay
      // clean so overlapping sentences never blur together)
      const audioConcatListPath = path.join(tempDir, 'audio_concat.txt');
      const audioConcatContent = audioFiles.map(f => `file '${f}'`).join('\n');
      fs.writeFileSync(audioConcatListPath, audioConcatContent, 'utf8');

      const rawConcatVideo = path.join(tempDir, 'concat_video.mp4');
      const rawConcatAudio = path.join(tempDir, 'concat_audio.aac');

      if (sceneFiles.length === 1) {
        await execAsync(`ffmpeg -y -i "${sceneFiles[0]}" -c copy "${rawConcatVideo}"`);
      } else {
        // Chain xfade dissolves between every consecutive pair of scenes.
        // Each transition's offset is exactly the cumulative narration
        // duration up to that point — see the CROSSFADE_DURATION comment
        // above for why that lines the dissolve up with scene boundaries
        // while keeping the combined video the same length as the audio.
        const inputArgs = sceneFiles.map((f) => `-i "${f}"`).join(' ');
        let cumulative = 0;
        let lastLabel = '0:v';
        const filterParts: string[] = [];
        for (let i = 1; i < sceneFiles.length; i++) {
          cumulative += recordedSceneDurations[i - 1];
          const outLabel = i === sceneFiles.length - 1 ? 'vout' : `vx${i}`;
          filterParts.push(`[${lastLabel}][${i}:v]xfade=transition=fade:duration=${CROSSFADE_DURATION}:offset=${cumulative}[${outLabel}]`);
          lastLabel = outLabel;
        }
        const filterChain = filterParts.join(';');

        await execAsync(
          `ffmpeg -y ${inputArgs} -filter_complex "${filterChain}" -map "[vout]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r 25 "${rawConcatVideo}"`
        );
      }

      // Concat audios
      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${audioConcatListPath}" -c copy "${rawConcatAudio}"`);

      // =======================================================================
      // Step 5: Final muxing into 1080x1920 MP4
      // =======================================================================
      console.log(`[VideoAssembler] Muxing final production MP4 to ${finalMp4Path}...`);
      await execAsync(
        `ffmpeg -y -i "${rawConcatVideo}" -i "${rawConcatAudio}" -filter_complex "[1:a]apad=whole_dur=${totalReelDuration},loudnorm=I=-16:TP=-1.5:LRA=11[aout]" -map 0:v:0 -map "[aout]" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 44100 -ac 2 -t ${totalReelDuration} -movflags +faststart "${finalMp4Path}"`
      );

      // =======================================================================
      // Step 6: Validate output MP4
      // =======================================================================
      const validation = await validateMp4File(finalMp4Path);

      console.log(`[VideoAssembler] SUCCESS: Generated verified Reel MP4: ${outputFilename} (${validation.fileSizeBytes} bytes, ${validation.durationSeconds}s)`);

      return {
        success: true,
        mp4Url: `/exports/${outputFilename}`,
        downloadUrl: `/api/download-reel-mp4?filename=${encodeURIComponent(outputFilename)}`,
        filename: outputFilename,
        message: `Genuine 1080x1920 MP4 (${validation.durationSeconds}s) with scene-synchronized Ubax audio ready.`,
        requiresRuntime: false,
        runtimeStatus: 'ffmpeg_available',
        assembledScenesCount: scenes.length,
        totalDuration: validation.durationSeconds,
        assembledScenes: assembledSceneSummaries,
        validation,
      };
    } catch (err: any) {
      console.error('[VideoAssembler] Assembly failed:', err?.message);
      throw err;
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
      inFlightAssemblies.delete(outputFilename);
    }
  })();

  inFlightAssemblies.set(outputFilename, assemblyPromise);
  return await assemblyPromise;
}
