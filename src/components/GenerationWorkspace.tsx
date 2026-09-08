import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Film, 
  Mic, 
  Layers, 
  SlidersHorizontal,
  Download,
  Eye,
  PlusCircle
} from 'lucide-react';
import { AssembledReelResult, GenerationProgress, ReelProject } from '../types';

interface GenerationWorkspaceProps {
  progress: GenerationProgress;
  isGenerating: boolean;
  assembledResult: AssembledReelResult | null;
  project: ReelProject;
  onStartGeneration: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onNewReel: () => void;
}

export const GenerationWorkspace: React.FC<GenerationWorkspaceProps> = ({
  progress,
  isGenerating,
  assembledResult,
  project,
  onStartGeneration,
  onPreview,
  onDownload,
  onNewReel,
}) => {
  const isFailed = progress.step === 'failed';
  const isReady = progress.step === 'ready' || (assembledResult && assembledResult.success);

  // Generation Stage Checklist
  const stages = [
    {
      id: 'script',
      title: '1. Hubinta & Habaynta Script-ka Af-Soomaaliga',
      active: progress.step === 'validating_script',
      done: progress.percentage > 15 || isReady,
      icon: Layers,
    },
    {
      id: 'voice',
      title: '2. Duubista Codka AI & Isu-dheellitirka',
      active: progress.step === 'generating_voiceover' || progress.step === 'normalizing_audio',
      done: progress.percentage > 40 || isReady,
      icon: Mic,
    },
    {
      id: 'visuals',
      title: '3. Dhaqdhaqaaqa Sawirrada 9:16 & Captions',
      active: progress.step === 'generating_visuals' || progress.step === 'rendering_captions',
      done: progress.percentage > 70 || isReady,
      icon: Film,
    },
    {
      id: 'assembly',
      title: '4. Isku-xirka MP4 (H.264 + AAC 1080x1920)',
      active: progress.step === 'assembling_mp4' || progress.step === 'validating_mp4',
      done: progress.percentage >= 100 || isReady,
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Title */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          6. Xaaladda Samaynta Reel-ka (Generation Status)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Halkan waxaad si toos ah ugala socon kartaa diyaarinta muuqaalkaaga.
        </p>
      </div>

      {/* Progress Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-4">
        {/* Progress Bar & Percentage */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-slate-200 truncate pr-2">
              {progress.currentMessage || 'Diyaar u ah samaynta Reel-ka'}
            </span>
            <span className="font-mono font-extrabold text-sky-400 shrink-0">
              {progress.percentage}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFailed
                  ? 'bg-rose-500'
                  : isReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-600'
              }`}
              style={{ width: `${Math.max(4, progress.percentage)}%` }}
            />
          </div>
        </div>

        {/* Live Stage Checklist */}
        <div className="flex flex-col gap-2.5 pt-1">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  stage.active
                    ? 'bg-sky-950/40 border-sky-500 text-white'
                    : stage.done
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                    : 'bg-slate-950/20 border-slate-850 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${stage.active ? 'text-sky-400 animate-pulse' : stage.done ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className="font-medium text-xs truncate max-w-[220px] xs:max-w-[270px]">
                    {stage.title}
                  </span>
                </div>

                <div>
                  {stage.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : stage.active ? (
                    <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[10px] text-slate-600 font-mono">sugaya</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification with Mobile "TRY AGAIN" button */}
        {isFailed && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2.5">
            <div className="flex items-start gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm">Khalad ayaa dhacay intii lagu jiray samaynta</h4>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  {progress.error || 'Fadlan hubi isku-xirka internet-ka ama dib u tijaabi.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onStartGeneration}
              className="touch-target self-start px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>TRY AGAIN (Dib U Tijaabi)</span>
            </button>
          </div>
        )}

        {/* Ready Success Banner */}
        {isReady && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold block">Reel-kaagii 9:16 Wuu Diyaar Yahay!</span>
              <span className="text-emerald-400/80 text-[11px]">
                Waxaad ka daawan kartaa shaashadda hoose ama waad dagsan kartaa.
              </span>
            </div>
          </div>
        )}

        {/* Manual Assemble Action if scenes are present and reel not yet assembled */}
        {!isReady && !isGenerating && !isFailed && project.scenes.length > 0 && (
          <button
            type="button"
            onClick={onStartGeneration}
            className="touch-target w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-500 hover:from-sky-500 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>BILOW SAMAYNTA (ASSEMBLE REEL MP4)</span>
          </button>
        )}
      </div>

      {/* Final Reel Actions Grid */}
      {isReady && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            7. Ficillada Reel-ka (Final Reel Actions):
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
            {/* Preview */}
            <button
              type="button"
              onClick={onPreview}
              className="touch-target py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span>PREVIEW</span>
            </button>

            {/* Download MP4 */}
            <button
              type="button"
              onClick={onDownload}
              className="touch-target py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD MP4</span>
            </button>

            {/* New Reel */}
            <button
              type="button"
              onClick={onNewReel}
              className="touch-target py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>NEW REEL</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
