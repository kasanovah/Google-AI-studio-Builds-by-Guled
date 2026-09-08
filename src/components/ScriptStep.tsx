import React, { useState } from 'react';
import { FileText, Edit3, Check, RotateCw } from 'lucide-react';
import { ReelProject } from '../types';

interface ScriptStepProps {
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
  onRegenerate: () => void;
  isGeneratingScript: boolean;
}

export const ScriptStep: React.FC<ScriptStepProps> = ({
  project,
  setProject,
  onRegenerate,
  isGeneratingScript,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleUpdateVoiceover = (index: number, val: string) => {
    setProject(prev => {
      const nextScenes = [...prev.scenes];
      nextScenes[index] = { ...nextScenes[index], voiceover: val };
      return { ...prev, scenes: nextScenes };
    });
  };

  const handleUpdateCaption = (index: number, val: string) => {
    setProject(prev => {
      const nextScenes = [...prev.scenes];
      nextScenes[index] = { ...nextScenes[index], caption: val };
      return { ...prev, scenes: nextScenes };
    });
  };

  const totalWords = project.scenes.reduce((acc, s) => acc + s.voiceover.trim().split(/\s+/).length, 0);
  const wordsPerSec = (totalWords / (project.targetDuration || 20)).toFixed(1);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            2. Qoraalka & Xogta Script-ka
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Daawo ama wax ka beddel qoraalka Af-Soomaaliga ee muuqanaya laguna hadlayo.
          </p>
        </div>

        {/* Pacing Badge */}
        <div className="flex items-center gap-2 text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-slate-400">Pacing:</span>
          <span className="font-bold text-cyan-400">{wordsPerSec} eray/sec</span>
          <span className="text-emerald-400 font-semibold">(Fiican)</span>
        </div>
      </div>

      {/* Scenes Script List */}
      <div className="flex flex-col gap-3">
        {project.scenes.map((scene, idx) => (
          <div
            key={scene.id || idx}
            className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  Muuqaalka {idx + 1} ({scene.duration}s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 touch-target px-2"
              >
                {editingIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{editingIndex === idx ? 'Xir' : 'Wax ka beddel'}</span>
              </button>
            </div>

            {/* Voiceover Text */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hadalka (Voiceover Somali):
              </label>
              {editingIndex === idx ? (
                <textarea
                  rows={2}
                  value={scene.voiceover}
                  onChange={(e) => handleUpdateVoiceover(idx, e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-sky-500/50 text-white text-xs focus:outline-none"
                />
              ) : (
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                  "{scene.voiceover}"
                </p>
              )}
            </div>

            {/* Caption Text */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Qoraalka Shaashadda (Caption Overlay):
              </label>
              {editingIndex === idx ? (
                <input
                  type="text"
                  value={scene.caption}
                  onChange={(e) => handleUpdateCaption(idx, e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-sky-500/50 text-white text-xs focus:outline-none"
                />
              ) : (
                <div className="text-xs font-semibold text-cyan-300 bg-sky-950/40 px-2.5 py-1.5 rounded-lg border border-sky-900/60 inline-block">
                  {scene.caption}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Regenerate Script Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGeneratingScript}
          className="w-full touch-target py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 text-sky-400 ${isGeneratingScript ? 'animate-spin' : ''}`} />
          <span>Dib U Cusbooneysii Script-ka AI</span>
        </button>
      </div>
    </div>
  );
};
