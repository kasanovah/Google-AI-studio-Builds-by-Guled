import React, { useEffect, useState } from 'react';
import { FolderGit2, Film, Download, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ExportedReel, formatReelTitle, formatFileSize, formatReelDateSomali } from '../utils/reelFormat';

interface ProjectsViewProps {
  onSelectReelForPlayback: (filename: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onSelectReelForPlayback,
}) => {
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [reels, setReels] = useState<ExportedReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/list-reels')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success) {
          setReels(data.reels || []);
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load reels:', err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportedFiles = reels.map((reel) => ({
    filename: reel.filename,
    title: formatReelTitle(reel.filename),
    resolution: '1080x1920 (9:16)',
    size: formatFileSize(reel.sizeBytes),
    created: formatReelDateSomali(reel.createdAtMs),
  }));

  const handleDownloadDirect = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      // Direct binary download via blob URL
      const url = `/api/download-reel-mp4?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(objUrl);
        }, 2000);
      } else {
        // Base64 fallback
        const b64Res = await fetch(`/api/download-reel-mp4?filename=${encodeURIComponent(filename)}&b64=1`);
        const b64Json = await b64Res.json();
        if (b64Json.success && b64Json.base64) {
          const byteChars = atob(b64Json.base64);
          const byteNums = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNums[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'video/mp4' });
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = objUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objUrl);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingFile(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <FolderGit2 className="w-6 h-6 text-sky-400" />
          Reels-kaaga Diyaar Ah (Projects)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Dhammaan muuqaallada la soo saaray ee MP4-ga ah oo diyaar u ah daawasho iyo dajin.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Soo raraya reels-kaaga...</span>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl bg-slate-900/60 border border-amber-800/50 p-4 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Ma soo raadinin liiska reels-ka. Isku day mar kale.</span>
        </div>
      ) : exportedFiles.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 text-center text-sm text-slate-400">
          Weli ma jiraan reels la sameeyay ee diyaar ah.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exportedFiles.map((file, idx) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
            >
              {/* Visual placeholder & title */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  onClick={() => onSelectReelForPlayback(file.filename)}
                  className="relative w-14 xs:w-16 aspect-[9/16] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 cursor-pointer group flex items-center justify-center"
                >
                  <Film className="w-5 h-5 text-slate-700" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    {file.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {file.created}
                    </span>
                    <span>{file.resolution}</span>
                    <span>{file.size}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {file.filename}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <button
                  type="button"
                  onClick={() => onSelectReelForPlayback(file.filename)}
                  className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Daawa (Preview)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDirect(file.filename)}
                  disabled={downloadingFile === file.filename}
                  className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
                >
                  {downloadingFile === file.filename ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dajinaya...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Daji MP4</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
      size: '2.5 MB',
      created: 'Hore',
      thumb: '/images/african_fiber_cables.jpg',
    },
  ];

  const handleDownloadDirect = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      // Direct binary download via blob URL
      const url = `/api/download-reel-mp4?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(objUrl);
        }, 2000);
      } else {
        // Base64 fallback
        const b64Res = await fetch(`/api/download-reel-mp4?filename=${encodeURIComponent(filename)}&b64=1`);
        const b64Json = await b64Res.json();
        if (b64Json.success && b64Json.base64) {
          const byteChars = atob(b64Json.base64);
          const byteNums = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNums[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'video/mp4' });
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = objUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objUrl);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingFile(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <FolderGit2 className="w-6 h-6 text-sky-400" />
          Reels-kaaga Diyaar Ah (Projects)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Dhammaan muuqaallada la soo saaray ee MP4-ga ah oo diyaar u ah daawasho iyo dajin.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {exportedFiles.map((file, idx) => (
          <div
            key={idx}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
          >
            {/* Visual thumbnail & title */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div
                onClick={() => onSelectReelForPlayback(file.filename)}
                className="relative w-14 xs:w-16 aspect-[9/16] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 cursor-pointer group"
              >
                <img src={file.thumb} alt={file.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {file.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {file.duration}
                  </span>
                  <span>{file.resolution}</span>
                  <span>{file.size}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                  {file.filename}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={() => onSelectReelForPlayback(file.filename)}
                className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Daawa (Preview)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadDirect(file.filename)}
                disabled={downloadingFile === file.filename}
                className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
              >
                {downloadingFile === file.filename ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dajinaya...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Daji MP4</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
