import React, { useState } from 'react';
import { HardDrive, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { getOrCreateXeeroFolder, uploadVideoToDrive, GoogleDriveFile } from '../services/googleDrive';

interface SaveToDriveButtonProps {
  filename: string;
  projectTitle?: string;
  className?: string;
  compact?: boolean;
}

export const SaveToDriveButton: React.FC<SaveToDriveButtonProps> = ({
  filename,
  projectTitle,
  className = '',
  compact = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'uploading' | 'success' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<GoogleDriveFile | null>(null);

  const handleSaveToDrive = async () => {
    if (status === 'uploading' || status === 'authorizing') return;
    setErrorMessage(null);
    setStatus('authorizing');

    try {
      // 1. Ensure authenticated
      const token = await (async () => {
        try {
          const authModule = await import('../services/googleAuth');
          const currentToken = await authModule.getAccessToken();
          if (currentToken) return currentToken;
          const res = await authModule.googleSignIn();
          return res.accessToken;
        } catch (e: any) {
          throw new Error('Please authorize Google Drive access to save your Reel.', { cause: e });
        }
      })();

      if (!token) {
        throw new Error('Google Drive authorization failed.');
      }

      setStatus('uploading');
      setProgressPercent(15);

      // 2. Fetch MP4 binary
      const directUrl = `/api/download-reel-mp4?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(directUrl);
      if (!res.ok) {
        throw new Error(`Failed to download MP4 from server (${res.status}).`);
      }
      const blob = await res.blob();
      setProgressPercent(40);

      // 3. Ensure folder exists
      const folder = await getOrCreateXeeroFolder('Xeero AI Reels');

      // 4. Upload to Drive
      const uploaded = await uploadVideoToDrive({
        videoBlob: blob,
        filename,
        folderId: folder.id,
        description: `9:16 Somali AI Reel: ${projectTitle || filename}`,
        onProgress: (p) => setProgressPercent(p),
      });

      setUploadedFile(uploaded);
      setStatus('success');
      setTimeout(() => {
        // Reset to idle after 8 seconds so user can save again if desired
        setStatus('idle');
      }, 8000);
    } catch (err: any) {
      console.error('[SaveToDriveButton] Error:', err);
      setErrorMessage(err?.message || 'Failed to save Reel to Google Drive');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  if (status === 'success' && uploadedFile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <a
          href={uploadedFile.webViewLink}
          target="_blank"
          rel="noreferrer"
          className="touch-target px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Saved to Drive! View</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleSaveToDrive}
        disabled={status === 'uploading' || status === 'authorizing'}
        className={`touch-target rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 ${
          status === 'error'
            ? 'bg-rose-600 text-white'
            : 'bg-slate-900 border border-slate-700 hover:border-sky-500 text-slate-200 hover:text-white'
        } ${compact ? 'px-2.5 py-1.5 text-xs' : 'py-2.5 px-3.5 text-xs'} ${className}`}
      >
        {status === 'authorizing' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Connecting Drive...</span>
          </>
        ) : status === 'uploading' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Saving to Drive ({progressPercent}%)...</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
            <span>Retry Save to Drive</span>
          </>
        ) : (
          <>
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            <span>SAVE TO GOOGLE DRIVE</span>
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-[10px] text-rose-400 max-w-[220px] leading-tight">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
