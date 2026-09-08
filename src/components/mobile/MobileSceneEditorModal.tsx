import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Clock, 
  Mic, 
  Type, 
  Film, 
  Copy, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Scene } from '../../types';

interface MobileSceneEditorModalProps {
  isOpen: boolean;
  scene: Scene | null;
  onClose: () => void;
  onSave: (updatedScene: Scene) => void;
}

export const MobileSceneEditorModal: React.FC<MobileSceneEditorModalProps> = ({
  isOpen,
  scene,
  onClose,
  onSave,
}) => {
  const [voiceover, setVoiceover] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(5);
  const [flowPrompt, setFlowPrompt] = useState('');
  const [visualUrl, setVisualUrl] = useState<string | undefined>(undefined);
  const [assetType, setAssetType] = useState<'video' | 'image' | 'none' | undefined>(undefined);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (scene) {
      setVoiceover(scene.voiceover || '');
      setCaption(scene.caption || '');
      setDuration(scene.duration || 5);
      setFlowPrompt(scene.flowPrompt || scene.visualPrompt || '');
      setVisualUrl(scene.visualUrl);
      setAssetType(scene.assetType);
      setUploadError(null);
    }
  }, [scene]);

  if (!isOpen || !scene) return null;

  const handleCopyFlow = () => {
    const textToCopy = flowPrompt || `Vertical 9:16 cinematic video, 24fps: ${caption}, Somali modern technology, 8k`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await fetch('/api/upload-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          data: base64Data,
          type: file.type.startsWith('video') ? 'video' : 'image',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setVisualUrl(result.url);
      setAssetType(result.type);
    } catch (err: any) {
      console.error('Modal upload error:', err);
      setUploadError(err?.message || 'Faylka lama soo gelin karin');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...scene,
      voiceover,
      caption,
      duration,
      flowPrompt,
      visualUrl,
      videoUrl: assetType === 'video' ? visualUrl : undefined,
      assetType,
      status: visualUrl ? 'flow_ready' : 'pending',
    });
    onClose();
  };

  const durationOptions = [3, 4, 5, 6, 8];
  const isVideo = assetType === 'video' || (visualUrl && visualUrl.endsWith('.mp4'));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-editor-title"
        className="w-full max-h-[92vh] sm:max-w-lg mx-auto bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h3 id="scene-editor-title" className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>SCENE {scene.sceneNumber}</span>
              <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                {duration}s
              </span>
              {visualUrl && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Flow Diyaar</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Wax ka beddel muuqaalka, Google Flow prompt & asset</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Xir (Close)"
            className="touch-target p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(92vh-130px)]">
          {/* Visual / Video Preview */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>Muuqaalka Flow (Flow MP4 / Sawir)</span>
              </span>
              {visualUrl && (
                <button
                  type="button"
                  onClick={() => { setVisualUrl(undefined); setAssetType(undefined); }}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Ka saar muuqaalka
                </button>
              )}
            </label>

            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              {visualUrl ? (
                isVideo ? (
                  <video
                    src={visualUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={visualUrl}
                    alt={`Scene ${scene.sceneNumber}`}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="p-4 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                  <Film className="w-7 h-7 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-300">Weli Ma Jirto Video Flow Ah</span>
                  <span className="text-[10px] text-slate-500">Ka samee Google Flow oo halkan ku soo geli</span>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-white font-bold">Soo gelinayaa...</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <label className="cursor-pointer py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 mt-1">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{visualUrl ? 'Beddel Video Flow (MP4)' : 'Soo Geli Video Flow (MP4)'}</span>
              <input
                type="file"
                accept="video/mp4,video/webm,image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </label>
            {uploadError && (
              <span className="text-[10px] text-rose-400">{uploadError}</span>
            )}
          </div>

          {/* Google Flow Prompt with Copy Button */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google Flow Prompt (9:16)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyFlow}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-cyan-500/30 transition-all active:scale-95"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPrompt ? 'La Koobiyeey!' : 'Koobiyeey'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={flowPrompt}
              onChange={(e) => setFlowPrompt(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Voiceover Text Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-sky-400" />
              <span>Voiceover (Codka Af-Soomaaliga ah)</span>
            </label>
            <textarea
              rows={3}
              value={voiceover}
              onChange={(e) => setVoiceover(e.target.value)}
              placeholder="Qor waxa uu ku hadlayo codka muuqaalka..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs sm:text-sm text-white placeholder-slate-500 resize-none"
            />
          </div>

          {/* Caption Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-sky-400" />
              <span>Caption (Qoraalka Shaashadda ku qoran)</span>
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Qoraalka kooban ee shaashadda dul saaran..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs sm:text-sm text-white placeholder-slate-500"
            />
          </div>

          {/* Duration Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Dhererka Muuqaalka (Duration)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {durationOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`touch-target py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    duration === d
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 touch-target py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs active:scale-95 transition-all"
          >
            Ka Noqo (Cancel)
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 touch-target py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>SAVE CHANGES</span>
          </button>
        </div>
      </div>
    </div>
  );
};
