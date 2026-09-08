import React from 'react';
import { Sparkles, Clock, Compass, Wand2, FileText } from 'lucide-react';
import { CURATED_SOMALI_TOPICS } from '../data/defaultProject';
import { ReelPacing, ReelProject } from '../types';

interface TopicStepProps {
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
  onGenerateScript: () => void;
  isGeneratingScript: boolean;
  creationError?: string | null;
  creationStatus?: string;
  onRetry?: () => void;
}

export const TopicStep: React.FC<TopicStepProps> = ({
  project,
  setProject,
  onGenerateScript,
  isGeneratingScript,
  creationError,
  creationStatus,
  onRetry,
}) => {
  const durations = [30, 45, 60];
  const pacings: Array<{ id: ReelPacing; label: string; desc: string }> = [
    { id: 'dynamic', label: 'Dynamic (Reels)', desc: 'Isbeddel degdeg ah oo soo jiidasho leh' },
    { id: 'fast', label: 'Fast (TikTok)', desc: 'Xawaare sare oo dhalinyarada ku habboon' },
    { id: 'balanced', label: 'Balanced (Waxbarasho)', desc: 'Heer dhex-dhexaad ah oo sharaxaad leh' },
  ];

  const handleSelectCurated = (topic: typeof CURATED_SOMALI_TOPICS[0]) => {
    setProject(prev => ({
      ...prev,
      title: topic.title,
      topic: topic.title,
      description: prev.description || topic.desc,
    }));
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Title & Description */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-400" />
          <span>1. Dooro Mawduuca & Faahfaahinta Reel-ka</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Gali mawduuca iyo sharaxaadda Reel-kaaga si loogu habeeyo script-ka iyo muuqaallada Google Flow.
        </p>
      </div>

      {/* Curated Somali AI Topics */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Mawduucyo Diyaar Ah (Curated Somali AI Topics):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CURATED_SOMALI_TOPICS.map((item, idx) => {
            const isSelected = project.topic === item.title;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCurated(item)}
                className={`p-3 rounded-xl border text-left transition-all touch-target flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-sky-400">
                    {item.category}
                  </span>
                  <h3 className="font-semibold text-xs sm:text-sm text-white mt-1.5 line-clamp-2">
                    {item.title}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Topic Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-topic" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Mawduuca Reel-ka (Topic):</span>
          <span className="text-[11px] font-normal text-slate-500">Mawduuca ugu muhiimsan</span>
        </label>
        <input
          type="text"
          id="custom-topic"
          value={project.topic}
          onChange={(e) => setProject(prev => ({ 
            ...prev, 
            topic: e.target.value, 
            title: e.target.value.slice(0, 45) 
          }))}
          placeholder="Tusaale: 3 siyaabood oo AI kuu badbaadin karo waqti maalin kasta..."
          className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-500"
        />
      </div>

      {/* Description / Story / Prompt Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reel-description" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Sharaxaadda / Sheekada (Description / Story prompt):</span>
          <span className="text-[11px] font-normal text-slate-500">Tilmaamaha qoraalka ama qodobada</span>
        </label>
        <textarea
          id="reel-description"
          rows={3}
          value={project.description || ''}
          onChange={(e) => setProject(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Tusaale: Create a 30–40 second Somali educational Reel explaining three practical uses of AI: 1. Qorista... 2. Soo koobidda... 3. Qorshaynta..."
          className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-500"
        />
      </div>

      {/* Duration and Pacing Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Waqtiga Reel-ka (30-45s Target):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {durations.map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setProject(prev => ({ ...prev, targetDuration: dur }))}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all touch-target ${
                  project.targetDuration === dur
                    ? 'bg-sky-600 border-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-sm sm:text-base font-extrabold">{dur}s</div>
                <div className="text-[10px] opacity-80">
                  {dur === 30 ? 'Reel 30s' : dur === 45 ? 'Deep 45s' : 'Long 60s'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pacing */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Xawaaraha (Pacing):
          </label>
          <div className="flex flex-col gap-1.5">
            {pacings.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProject(prev => ({ ...prev, pacing: p.id }))}
                className={`py-2 px-3 rounded-xl border text-left transition-all touch-target flex items-center justify-between ${
                  project.pacing === p.id
                    ? 'bg-sky-950/40 border-sky-500 text-white font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-medium text-slate-200">{p.label}</span>
                <span className="text-[10px] text-slate-500 hidden xs:inline">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Creation Error Banner */}
      {creationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-400 text-xs">
          <div>
            <span className="font-bold block">CREATION FAILED</span>
            <span>{creationError}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Script Generation / CREATE Trigger */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          id="btn-create-reel"
          data-testid="create-reel-btn"
          type="button"
          onClick={onGenerateScript}
          disabled={isGeneratingScript || (!project.topic.trim() && !project.description?.trim())}
          className="w-full touch-target py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-500 hover:from-sky-500 hover:to-cyan-400 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingScript ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{creationStatus || 'CREATING REEL...'}</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 text-yellow-300" />
              <span>CREATE REEL — Bilow Reel-ka ({project.targetDuration}s)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
