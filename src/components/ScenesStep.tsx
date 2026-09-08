import React, { useState } from 'react';
import { 
  Layers, 
  Clock, 
  Film, 
  Copy, 
  Check, 
  Upload, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Image as ImageIcon,
  Mic
} from 'lucide-react';
import { ReelProject, Scene } from '../types';

interface ScenesStepProps {
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
}

export const ScenesStep: React.FC<ScenesStepProps> = ({ project, setProject }) => {
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; msg: string } | null>(null);

  // Copy Google Flow prompt
  const handleCopyFlowPrompt = (scene: Scene) => {
    const promptText = scene.flowPrompt || `Vertical 9:16 cinematic video, ultra realistic, 24fps smooth motion, photorealistic lighting: ${scene.visualPrompt || scene.caption}, modern Somali technology, 8k resolution`;
    navigator.clipboard.writeText(promptText);
    setCopiedSceneId(scene.id);
    setTimeout(() => setCopiedSceneId(null), 2500);
  };

  // Upload Flow video or image asset
  const handleFileUpload = async (sceneIndex: number, file: File) => {
    const scene = project.scenes[sceneIndex];
    if (!scene) return;

    setUploadingSceneId(scene.id);
    setUploadError(null);

    try {
      // Read as base64
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
        throw new Error(result.error || 'Asset upload failed');
      }

      // Update scene with the newly uploaded asset
      setProject(prev => {
        const nextScenes = [...prev.scenes];
        nextScenes[sceneIndex] = {
          ...nextScenes[sceneIndex],
          visualUrl: result.url,
          videoUrl: result.type === 'video' ? result.url : undefined,
          assetType: result.type,
          status: 'flow_ready',
        };
        return { ...prev, scenes: nextScenes };
      });
    } catch (err: any) {
      console.error('Asset upload error:', err);
      setUploadError({ id: scene.id, msg: err?.message || 'Upload failed' });
    } finally {
      setUploadingSceneId(null);
    }
  };

  const handleUpdateScene = (index: number, patch: Partial<Scene>) => {
    setProject(prev => {
      const next = [...prev.scenes];
      next[index] = { ...next[index], ...patch };
      const newDuration = next.reduce((acc, s) => acc + (s.duration || 5), 0);
      return {
        ...prev,
        scenes: next,
        targetDuration: newDuration,
      };
    });
  };

  const handleAddScene = () => {
    const newNum = project.scenes.length + 1;
    const newId = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const topic = project.topic || project.title || 'Soomaaliya & AI';
    const newScene: Scene = {
      id: newId,
      sceneNumber: newNum,
      duration: 5,
      voiceover: `Qodobka ${newNum}: Faahfaahinta xogta cusub ee la xiriirta ${topic}.`,
      caption: `Qodobka ${newNum}: Xog Cusub`,
      visualPrompt: `Vertical 9:16 cinematic video scene ${newNum} for ${topic}`,
      flowPrompt: `Vertical 9:16 cinematic video, ultra realistic, 24fps smooth motion, photorealistic lighting: East African modern innovation, focus on ${topic}, modern studio atmosphere, cinematic depth of field, 8k resolution`,
      visualKeywords: ['somali technology', 'flow video'],
      status: 'pending',
    };

    setProject(prev => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
      targetDuration: prev.targetDuration + 5,
    }));
  };

  const handleDeleteScene = (index: number) => {
    if (project.scenes.length <= 1) return;
    setProject(prev => {
      const filtered = prev.scenes.filter((_, i) => i !== index);
      const renumbered = filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      const newDur = renumbered.reduce((acc, s) => acc + (s.duration || 5), 0);
      return {
        ...prev,
        scenes: renumbered,
        targetDuration: newDur,
      };
    });
  };

  const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const attachedCount = project.scenes.filter(s => !!s.visualUrl).length;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Step Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <span>4. Habaynta Muuqaallada & Google Flow</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Koobiyeey prompt-ka Google Flow scene kasta, kadibna soo geli video-ga (MP4) ama sawirka.
          </p>
        </div>

        {/* Status Indicators & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-white">{totalDuration}s</span>
            <span className="text-slate-500">•</span>
            <span className="font-medium text-emerald-400">{attachedCount}/{project.scenes.length} Flow diyaar ah</span>
          </div>

          <button
            type="button"
            onClick={handleAddScene}
            className="touch-target px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Kudar Scene</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {project.scenes.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-3">
          <Layers className="w-10 h-10 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Ma jiraan muuqaallo weli la diyaariyay.</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Fadlan ku noqo tallaabada 2aad (Script) si aad u abuurto muuqaallada, ama guji badhanka hoose si aad gacanta ugu darto.
          </p>
          <button
            type="button"
            onClick={handleAddScene}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-sky-400 transition-all mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Abuur Scene-ka 1aad</span>
          </button>
        </div>
      ) : (
        /* Scene Cards List */
        <div className="flex flex-col gap-4">
          {project.scenes.map((scene, idx) => {
            const hasAsset = !!scene.visualUrl;
            const isVideo = scene.assetType === 'video' || (scene.visualUrl && scene.visualUrl.endsWith('.mp4'));
            const isUploading = uploadingSceneId === scene.id;
            const hasError = uploadError?.id === scene.id;

            return (
              <div
                key={scene.id || idx}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900/90 border transition-all flex flex-col gap-4 shadow-sm ${
                  hasAsset ? 'border-slate-800 hover:border-slate-700' : 'border-amber-500/30 bg-slate-900/70'
                }`}
              >
                {/* Scene Header: Badge, Duration Selector, Asset Status, Delete */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-black text-xs flex items-center justify-center border border-sky-500/30">
                      {scene.sceneNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Muuqaalka {scene.sceneNumber}
                    </h3>
                    {hasAsset ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isVideo ? 'Flow Video (MP4)' : 'Sawir Diyaar ah'}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>Sugaya Flow Asset</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Duration Picker */}
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <select
                        value={scene.duration || 5}
                        onChange={(e) => handleUpdateScene(idx, { duration: parseInt(e.target.value, 10) })}
                        className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
                        aria-label="Scene Duration"
                      >
                        <option value={3}>3s</option>
                        <option value={4}>4s</option>
                        <option value={5}>5s</option>
                        <option value={6}>6s</option>
                        <option value={8}>8s</option>
                        <option value={10}>10s</option>
                      </select>
                    </div>

                    {/* Delete button */}
                    {project.scenes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteScene(idx)}
                        aria-label={`Tirtir Scene ${scene.sceneNumber}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid: Left Column (Text & Google Flow Prompt) / Right Column (Asset Preview & Upload) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column (8 cols): Voiceover & Google Flow Prompt */}
                  <div className="md:col-span-7 flex flex-col gap-3">
                    {/* Voiceover Textarea */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Mic className="w-3 h-3 text-sky-400" />
                          Codka Soomaaliga (Voiceover Narration)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {scene.voiceover?.length || 0} xaraf
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={scene.voiceover}
                        onChange={(e) => handleUpdateScene(idx, { voiceover: e.target.value })}
                        placeholder="Qoraalka codka Af-Soomaaliga ee muuqaalkan..."
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 leading-relaxed resize-none"
                      />
                    </div>

                    {/* Screen Caption Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <span>Qoraalka Shaashadda (9:16 Caption Overlay)</span>
                      </label>
                      <input
                        type="text"
                        value={scene.caption}
                        onChange={(e) => handleUpdateScene(idx, { caption: e.target.value })}
                        placeholder="Qoraal gaaban oo shaashadda ku dul qoraya..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    {/* Scene Visual Plan Breakdown (The 6 Visual Requirements) */}
                    {(scene.keyMessage || scene.visualObjective || scene.subject) && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] flex flex-col gap-1 text-slate-400">
                        {scene.keyMessage && (
                          <div>
                            <span className="text-emerald-400 font-bold">Farriinta:</span>{' '}
                            <span className="text-slate-200">{scene.keyMessage}</span>
                          </div>
                        )}
                        {scene.subject && (
                          <div>
                            <span className="text-cyan-400 font-bold">Muuqaalka:</span>{' '}
                            <span className="text-slate-300">{scene.subject}</span>
                            {scene.action && <span className="text-slate-400"> ({scene.action})</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Google Flow Cinematic Prompt Box with 1-Click Copy */}
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/20 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Google Flow Cinematic Prompt (9:16)</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyFlowPrompt(scene)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center gap-1 border border-cyan-500/30 transition-all active:scale-95"
                        >
                          {copiedSceneId === scene.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">La Koobiyeey!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Koobiyeey Prompt-ka</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed font-mono bg-black/40 p-2 rounded-lg select-all border border-slate-800/80 max-h-20 overflow-y-auto">
                        {scene.flowPrompt || `Vertical 9:16 cinematic footage, ultra realistic, 24fps smooth motion, photorealistic lighting: ${scene.visualPrompt}, modern studio, 8k resolution`}
                      </p>
                    </div>
                  </div>

                  {/* Right Column (5 cols): Asset Preview & Upload */}
                  <div className="md:col-span-5 flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Film className="w-3 h-3 text-sky-400" />
                        Muuqaalka Flow (Flow MP4 / Sawir)
                      </span>
                    </label>

                    {/* Preview Area or Upload Dropzone */}
                    <div className="relative aspect-[9/16] max-h-[220px] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
                      {hasAsset ? (
                        isVideo ? (
                          <video
                            src={scene.visualUrl}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={scene.visualUrl}
                            alt={`Scene ${scene.sceneNumber}`}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="p-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Film className="w-8 h-8 text-slate-600 group-hover:text-sky-400 transition-colors" />
                          <p className="text-[11px] font-semibold text-slate-300">
                            Video Flow Ah Ma Jiro
                          </p>
                          <p className="text-[10px] text-slate-500 leading-snug">
                            Ka samee Google Flow kadibna halkan soo geli.
                          </p>
                        </div>
                      )}

                      {/* Upload Loading Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center z-10">
                          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-1.5" />
                          <span className="text-[11px] font-bold text-white">Soo gelinayaa...</span>
                        </div>
                      )}
                    </div>

                    {/* Upload File Input Button */}
                    <div className="flex items-center gap-2 mt-1">
                      <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>{hasAsset ? 'Beddel Video Flow' : 'Soo geli Video Flow (MP4)'}</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(idx, file);
                          }}
                          className="hidden"
                        />
                      </label>

                      {hasAsset && (
                        <button
                          type="button"
                          onClick={() => handleUpdateScene(idx, { visualUrl: undefined, videoUrl: undefined, status: 'pending' })}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/80 border border-slate-700 transition-all"
                          title="Ka saar muuqaalkan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {hasError && (
                      <span className="text-[10px] text-rose-400">{uploadError.msg}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
