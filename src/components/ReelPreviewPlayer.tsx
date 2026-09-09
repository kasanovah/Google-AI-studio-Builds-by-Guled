import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Download, 
  Maximize2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Film,
  Layers,
  Clock,
  Mic
} from 'lucide-react';
import { AssembledReelResult, ReelProject } from '../types';

interface ReelPreviewPlayerProps {
  assembledResult: AssembledReelResult | null;
  project: ReelProject;
  isGenerating?: boolean;
  onGenerateClick?: () => void;
}

export const ReelPreviewPlayer: React.FC<ReelPreviewPlayerProps> = ({
  assembledResult,
  project,
  isGenerating,
  onGenerateClick,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Strictly require a valid assembledResult URL or project previewUrl — NO OLD REEL FALLBACK
  const videoUrl = assembledResult?.mp4Url || assembledResult?.downloadUrl || project.previewUrl || null;

  // Preload video into in-memory Blob to prevent preview iframe navigation cookie errors
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadVideoBlob() {
      if (!videoUrl) {
        setBlobUrl(null);
        setBlobLoading(false);
        return;
      }
      setBlobLoading(true);
      try {
        const directUrl = assembledResult?.filename
          ? `/api/download-reel-mp4?filename=${encodeURIComponent(assembledResult.filename)}`
          : videoUrl;

        const res = await fetch(directUrl);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('video/mp4')) {
            const buf = await res.arrayBuffer();
            const view = new Uint8Array(buf.slice(0, 16));
            if (view[0] !== 0x3C && view.length > 8) { // Not HTML '<'
              const b = new Blob([buf], { type: 'video/mp4' });
              createdUrl = URL.createObjectURL(b);
              if (active) {
                setBlobUrl(createdUrl);
                setBlobLoading(false);
                return;
              }
            }
          }
        }

        // Fallback to Base64 endpoint if direct fetch was intercepted
        if (assembledResult?.filename) {
          const b64Res = await fetch(`/api/download-reel-mp4?filename=${encodeURIComponent(assembledResult.filename)}&b64=1`);
          if (b64Res.ok) {
            const b64Json = await b64Res.json();
            if (b64Json.success && b64Json.base64) {
              const byteCharacters = atob(b64Json.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const b = new Blob([byteArray], { type: 'video/mp4' });
              createdUrl = URL.createObjectURL(b);
              if (active) {
                setBlobUrl(createdUrl);
                setBlobLoading(false);
                return;
              }
            }
          }
        }

        if (active) {
          setBlobUrl(videoUrl);
          setBlobLoading(false);
        }
      } catch {
        if (active) {
          setBlobUrl(videoUrl);
          setBlobLoading(false);
        }
      }
    }

    loadVideoBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [videoUrl, assembledResult?.filename]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || project.targetDuration || 30);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const targetFilename = assembledResult?.filename || `${project.title ? project.title.replace(/[^a-zA-Z0-9]/g, '_') : 'XEERO_AI_REEL'}.mp4`;
      let downloadBlob: Blob | null = null;

      if (blobUrl && blobUrl.startsWith('blob:')) {
        const res = await fetch(blobUrl);
        if (res.ok) downloadBlob = await res.blob();
      }

      if (!downloadBlob && assembledResult?.filename) {
        const directUrl = `/api/download-reel-mp4?filename=${encodeURIComponent(assembledResult.filename)}`;
        const res = await fetch(directUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          downloadBlob = new Blob([ab], { type: 'video/mp4' });
        }
      }

      if (!downloadBlob) {
        throw new Error('Could not retrieve binary MP4 data. Please assemble the Reel first.');
      }

      const blobDownloadUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobDownloadUrl;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobDownloadUrl);
      }, 2000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 9:16 Centered Vertical Player Box */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[290px] xs:max-w-[320px] sm:max-w-[340px] md:max-w-[360px] aspect-[9/16] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800/90 shadow-2xl shadow-sky-950/40 flex items-center justify-center group"
      >
        {/* State 1: No assembled Reel yet -> Clean placeholder view */}
        {!videoUrl ? (
          <div className="p-6 text-center flex flex-col items-center justify-center gap-4 w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Film className="w-8 h-8" />
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                9:16 REEL PREVIEW
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {project.title || project.topic || 'Reel Cusub'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                {project.scenes.length === 0
                  ? 'Fadlan ku bilow samaynta script-ka iyo goobaha Flow-ga ee tallaabada 1aad.'
                  : `${project.scenes.length} scene ayaa diyaar ah. Soo geli video-yada Google Flow ama guji 'Isku-dhaf Reel-ka'.`}
              </p>
            </div>

            {/* Quick Scenes Summary */}
            {project.scenes.length > 0 && (
              <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2 text-left text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-400" />
                    {project.scenes.length} Muuqaal
                  </span>
                  <span className="flex items-center gap-1 font-mono text-cyan-400">
                    <Clock className="w-3 h-3" />
                    {project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0)}s
                  </span>
                </div>
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                  {project.scenes.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-1.5 text-slate-300">
                      <span className="truncate">S{s.sceneNumber}: {s.caption || s.voiceover}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                        s.visualUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {s.visualUrl ? 'Flow Ok' : 'Sugaya'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onGenerateClick && project.scenes.length > 0 && (
              <button
                type="button"
                onClick={onGenerateClick}
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Isku-dhaf Reel-ka Hadda</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Loading Overlay */}
            {blobLoading && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                <div className="w-10 h-10 rounded-full border-3 border-sky-500 border-t-transparent animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-200">
                  Diyaarinaya Muuqaalka 9:16...
                </p>
              </div>
            )}

            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              src={blobUrl || videoUrl}
              playsInline
              webkit-playsinline="true"
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="w-full h-full object-cover cursor-pointer select-none"
            />

            {/* Top Overlay Badges */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-sky-400">
                <Film className="w-3 h-3" />
                <span>9:16 REEL</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-slate-300">
                <span>{formatTime(currentTime)} / {formatTime(duration || project.targetDuration || 30)}</span>
              </div>
            </div>

            {/* Large Center Play/Pause Touch Button */}
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className={`absolute z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white flex items-center justify-center shadow-xl shadow-sky-950/60 backdrop-blur-md transition-all touch-target active:scale-95 ${
                isPlaying ? 'opacity-0 group-hover:opacity-100 hover:opacity-100' : 'opacity-95 scale-100'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            {/* Bottom Control Bar inside video box */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
              {/* Progress Scrubber */}
              <input
                type="range"
                min="0"
                max={duration || project.targetDuration || 30}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek video position"
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />

              {/* Quick controls row */}
              <div className="flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="touch-target p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={handleRestart}
                    aria-label="Restart video"
                    className="touch-target p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="touch-target p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleFullscreen}
                    aria-label="Toggle fullscreen"
                    className="touch-target p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* External Player Action Bar (Download, Info, Verification) */}
      <div className="w-full max-w-[360px] flex flex-col gap-2.5 mt-4">
        {videoUrl && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all touch-target active:scale-95 ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white shadow-sky-500/25'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Soo Dejinayaa MP4...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>MP4 Si Guul Leh Ayaa Loo Soo Dejiyay!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Soo Dejiso Reel MP4 (1080x1920)</span>
              </>
            )}
          </button>
        )}

        {downloadError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Reel Metadata Badges */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Mic className="w-3.5 h-3.5 text-sky-400" />
            <span>Codka: {project.selectedVoice?.name || 'Ubax (Somali)'}</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold">
            1080x1920 • 9:16
          </span>
        </div>
      </div>
    </div>
  );
};
