import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Upload,
  ExternalLink,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Film,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { subscribeAuth } from '../services/googleAuth';
import { 
  getOrCreateXeeroFolder, 
  listDriveFiles, 
  uploadVideoToDrive, 
  uploadScriptToDrive, 
  deleteDriveFile, 
  GoogleDriveFile 
} from '../services/googleDrive';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AssembledReelResult, ReelProject } from '../types';

interface GoogleDriveViewProps {
  project?: ReelProject;
  assembledResult?: AssembledReelResult | null;
  onSelectReelForPlayback?: (filename: string) => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  project,
  assembledResult,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [xeeroFolder, setXeeroFolder] = useState<GoogleDriveFile | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'videos' | 'docs'>('all');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Destructive Action Confirmation Modal state (MANDATORY per SKILL.md)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((currentUser, currentToken) => {
      setUser(currentUser);
      setToken(currentToken);
    });
    return () => unsub();
  }, []);

  // Fetch or initialize folder & files when signed in
  useEffect(() => {
    if (user && token) {
      loadDriveData();
    } else {
      setFiles([]);
      setXeeroFolder(null);
    }
  }, [user, token]);

  const loadDriveData = async () => {
    setLoadingFiles(true);
    setUploadError(null);
    try {
      // 1. Get or create Xeero AI Reels folder
      const folder = await getOrCreateXeeroFolder('Xeero AI Reels');
      setXeeroFolder(folder);

      // 2. List files
      const items = await listDriveFiles({
        folderId: folder.id,
        mimeTypeFilter: filterType,
        query: searchQuery,
      });
      setFiles(items);
    } catch (err: any) {
      console.error('[GoogleDriveView] Error loading drive data:', err);
      setUploadError(err?.message || 'Failed to load files from Google Drive.');
    } finally {
      setLoadingFiles(false);
    }
  };

  // Upload current reel MP4 to Google Drive
  const handleUploadCurrentReel = async () => {
    if (!token) return;
    setIsUploading(true);
    setUploadPercent(5);
    setUploadMessage('Checking MP4 reel file...');
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const filename = assembledResult?.filename || `${(project?.title || 'XEERO_AI_REEL').replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      
      // Obtain MP4 blob from the server
      const directUrl = `/api/download-reel-mp4?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(directUrl);
      if (!res.ok) {
        throw new Error(`Failed to load MP4 binary from server (${res.status}). Please ensure the Reel is assembled.`);
      }

      const blob = await res.blob();
      if (blob.size < 1000) {
        throw new Error('Downloaded file too small to be a valid MP4.');
      }

      setUploadPercent(30);
      setUploadMessage(`Uploading "${filename}" (${Math.round(blob.size / 1024 / 1024 * 10) / 10} MB) to Google Drive...`);

      const folder = xeeroFolder || await getOrCreateXeeroFolder('Xeero AI Reels');
      setXeeroFolder(folder);

      const uploaded = await uploadVideoToDrive({
        videoBlob: blob,
        filename,
        folderId: folder.id,
        description: `9:16 Somali Reel: ${project?.title || 'Xeero AI'} (${project?.scenes?.length || 0} scenes)`,
        onProgress: (p, msg) => {
          setUploadPercent(p);
          setUploadMessage(msg);
        },
      });

      setUploadSuccess(`Muuqaalka "${uploaded.name}" waxaa si guul leh loogu keydiyay Google Drive!`);
      // Reload file list
      await loadDriveData();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      console.error('[GoogleDriveView] Upload error:', err);
      setUploadError(err?.message || 'Failed to upload Reel to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload current script and storyboard to Google Drive
  const handleUploadCurrentScript = async () => {
    if (!token || !project) return;
    setIsUploading(true);
    setUploadPercent(20);
    setUploadMessage('Diyaarinta qoraalka Af-Soomaaliga & Storyboard...');
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const folder = xeeroFolder || await getOrCreateXeeroFolder('Xeero AI Reels');
      setXeeroFolder(folder);

      const scriptLines = [
        `============================================================`,
        `XEERO AI REEL STUDIO — SOMALI SCRIPT & STORYBOARD`,
        `============================================================`,
        `Title: ${project.title || 'Xeero AI Reel'}`,
        `Topic: ${project.topic || 'Af-Soomaali Reel'}`,
        `Target Duration: ${project.targetDuration || 30}s | Aspect Ratio: 9:16`,
        `Voice: ${project.selectedVoice?.name || 'Ubax (Somali Neural)'}`,
        `Date: ${new Date().toLocaleString()}`,
        `============================================================\n`,
        `FULL VOICEOVER NARRATION:`,
        `------------------------------------------------------------`,
        project.script || project.scenes.map(s => s.voiceover).join('\n\n'),
        `\n\n============================================================`,
        `SCENE-BY-SCENE STORYBOARD & VISUAL PLAN:`,
        `============================================================`,
      ];

      project.scenes.forEach((s) => {
        scriptLines.push(`\n[SCENE ${s.sceneNumber}] Duration: ${s.duration}s`);
        scriptLines.push(`- Caption: ${s.caption}`);
        scriptLines.push(`- Somali Voiceover: ${s.voiceover}`);
        if (s.keyMessage) scriptLines.push(`- Key Message: ${s.keyMessage}`);
        if (s.subject) scriptLines.push(`- Visual Subject: ${s.subject}`);
        if (s.action) scriptLines.push(`- Action: ${s.action}`);
        if (s.environment) scriptLines.push(`- Environment: ${s.environment}`);
        if (s.cameraComposition) scriptLines.push(`- Camera Framing: ${s.cameraComposition}`);
        if (s.flowPrompt) scriptLines.push(`- Google Flow Prompt: ${s.flowPrompt}`);
      });

      const content = scriptLines.join('\n');
      const uploaded = await uploadScriptToDrive({
        title: project.title || 'XEERO_REEL',
        content,
        folderId: folder.id,
      });

      setUploadSuccess(`Qoraalkii "${uploaded.name}" waxaa si guul leh loogu keydiyay Google Drive!`);
      await loadDriveData();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      console.error('[GoogleDriveView] Script upload error:', err);
      setUploadError(err?.message || 'Failed to upload script to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  // Perform confirmed deletion
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDriveFile(fileToDelete.id);
      setFileToDelete(null);
      await loadDriveData();
    } catch (err: any) {
      console.error('[GoogleDriveView] Delete error:', err);
      setDeleteError(err?.message || 'Failed to delete file from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFiles = files.filter(f => {
    if (filterType === 'videos') return f.mimeType.includes('video');
    if (filterType === 'docs') return f.mimeType.includes('text') || f.mimeType.includes('document');
    return true;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Top Banner / Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/40 border border-sky-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-sky-400 p-0.5 shadow-lg shadow-sky-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Google Drive Storage Hub
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                OAuth Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Si toos ah ugu kaydi muuqaallada 9:16, codadka, iyo qoraallada Google Drive-kaaga.
            </p>
          </div>
        </div>

        {/* Auth control */}
        <div className="self-stretch sm:self-auto flex items-center justify-end">
          <GoogleSignInButton />
        </div>
      </div>

      {/* When NOT signed in */}
      {!user || !token ? (
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <HardDrive className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Ku Xir Akoonkaaga Google Drive
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Guji &quot;Sign in with Google&quot; si aad awood ugu yeelato kaydinta tooska ah ee muuqaallada MP4 iyo script-yada Af-Soomaaliga ee aad samaysay.
            </p>
          </div>
          <div className="mt-2">
            <GoogleSignInButton />
          </div>
        </div>
      ) : (
        /* When SIGNED IN: Full Drive Workspace */
        <div className="flex flex-col gap-5">
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action 1: Upload Assembled Reel */}
            <button
              type="button"
              onClick={handleUploadCurrentReel}
              disabled={isUploading}
              className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-400 text-white shadow-lg shadow-sky-600/20 flex items-center justify-between group transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Film className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Kaydi Muuqaalka (MP4)</span>
                  <span className="text-[11px] text-sky-100/80 block">Toos ugu shub Google Drive</span>
                </div>
              </div>
              <Upload className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Action 2: Upload Script / Storyboard */}
            <button
              type="button"
              onClick={handleUploadCurrentScript}
              disabled={isUploading || !project}
              className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-between group transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Kaydi Script-ka & Storyboard</span>
                  <span className="text-[11px] text-slate-400 block">Somali Text Document</span>
                </div>
              </div>
              <Upload className="w-4 h-4 text-slate-400 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Action 3: Open Dedicated Drive Folder */}
            {xeeroFolder?.webViewLink ? (
              <a
                href={xeeroFolder.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Folder-ka: Xeero AI Reels</span>
                    <span className="text-[11px] text-emerald-400/80 block">Ka fur Google Drive</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3 text-slate-400">
                <FolderPlus className="w-5 h-5 text-slate-500" />
                <span className="text-xs">Folder-ka waxaa la samaynayaa marka la shubo.</span>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sky-300 font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  {uploadMessage}
                </span>
                <span className="font-mono text-sky-400 font-bold">{uploadPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {uploadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drive Files List / Browser */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Faylasha Google Drive ({filteredFiles.length})
                </h3>
              </div>

              {/* Filters & Refresh */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Raadi fayl..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadDriveData()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      filterType === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dhammaan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('videos')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      filterType === 'videos' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Muuqaal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('docs')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      filterType === 'docs' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Qoraal
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadDriveData}
                  disabled={loadingFiles}
                  title="Cusboonaysii faylasha (Refresh)"
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-sky-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* File Items Grid / List */}
            {loadingFiles ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span>Soo kaxaynaya faylasha Google Drive...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <HardDrive className="w-8 h-8 text-slate-600" />
                <span>Wax fayl ah lagama helin folder-ka &quot;Xeero AI Reels&quot;.</span>
                <span className="text-[11px] text-slate-500">
                  Guji &quot;Kaydi Muuqaalka (MP4)&quot; kor ku xusan si aad faylkaagii ugu horeeyay ugu shubto.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredFiles.map((file) => {
                  const isVideo = file.mimeType.includes('video');
                  const sizeMb = file.size ? `${(parseInt(file.size, 10) / (1024 * 1024)).toFixed(1)} MB` : '';
                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isVideo
                              ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {isVideo ? <Film className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate">
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            {sizeMb && <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">{sizeMb}</span>}
                            <span>{isVideo ? '1080x1920 (9:16)' : 'Text Document'}</span>
                            {file.modifiedTime && (
                              <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* Open in Google Drive */}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                            <span>Fur Drive</span>
                          </a>
                        )}

                        {/* Delete from Drive (Triggers MANDATORY confirmation dialog) */}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          aria-label={`Delete ${file.name} from Google Drive`}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION DIALOG FOR DESTRUCTIVE OPERATIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">
                  Ma hubtaa inaad tirtirto faylkan?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Faylkan waxaa si joogto ah looga tirtirayaa Google Drive-kaaga. Ficilkan dib looma celin karo.
                </p>
                <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300 truncate">
                  {fileToDelete.name}
                </div>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
              >
                Ka Noqo (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Tirtiraya...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xaqiiji Tirtirka (Delete File)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
