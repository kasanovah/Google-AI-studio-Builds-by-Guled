import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Mic,
  Volume2,
  Edit3,
  Film,
  Download,
  PlusCircle,
  CheckCircle2,
  ChevronRight,
  Wand2,
  AlertTriangle,
  Check,
  Clock
} from 'lucide-react';
import { 
  AssembledReelResult, 
  GenerationProgress, 
  MobileWorkflowStep, 
  ReelProject, 
  Scene, 
  VoiceOption 
} from '../../types';
import { CURATED_SOMALI_TOPICS, SOMALI_VOICES } from '../../data/defaultProject';
import { playSomaliVoicePreview } from '../../utils/audioSynthesizer';
import { ReelPreviewPlayer } from '../ReelPreviewPlayer';
import { MobileSceneEditorModal } from './MobileSceneEditorModal';

interface MobileCreateWorkflowProps {
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
  assembledResult: AssembledReelResult | null;
  progress: GenerationProgress;
  isGenerating: boolean;
  isGeneratingScript: boolean;
  onGenerateScript: () => Promise<void>;
  onStartGeneration: () => Promise<void>;
  onDownload: () => void;
  onNewReel: () => void;
  currentStep: MobileWorkflowStep;
  setCurrentStep: (step: MobileWorkflowStep) => void;
  onGoToDashboard: () => void;
  creationError?: string | null;
  creationStatus?: string;
  onRetry?: () => void;
}

export const MobileCreateWorkflow: React.FC<MobileCreateWorkflowProps> = ({
  project,
  setProject,
  assembledResult,
  progress,
  isGenerating,
  isGeneratingScript,
  onGenerateScript,
  onStartGeneration,
  onDownload,
  onNewReel,
  currentStep,
  setCurrentStep,
  onGoToDashboard,
  creationError,
  creationStatus,
  onRetry,
}) => {
  // State for scene editing bottom sheet
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isEditingFullScript, setIsEditingFullScript] = useState(false);
  const [customFullScript, setCustomFullScript] = useState('');

  // Voice preview helper
  const handlePreviewVoice = (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingVoiceId(voice.id);
    playSomaliVoicePreview(voice.sampleText, voice.pitch, voice.rate);
    setTimeout(() => setPlayingVoiceId(null), 1600);
  };

  const stepsList: Array<{ id: MobileWorkflowStep; label: string }> = [
    { id: 'topic', label: 'Topic' },
    { id: 'script', label: 'Script' },
    { id: 'voice', label: 'Voice' },
    { id: 'scenes', label: 'Scenes' },
    { id: 'preview', label: 'Preview' },
    { id: 'export', label: 'Export' },
  ];

  const currentStepIndex = stepsList.findIndex(s => s.id === currentStep);

  const goToNextStep = () => {
    if (currentStepIndex < stepsList.length - 1) {
      setCurrentStep(stepsList[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(stepsList[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onGoToDashboard();
    }
  };

  // Save single scene from modal
  const handleSaveScene = (updatedScene: Scene) => {
    setProject(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === updatedScene.id ? updatedScene : s),
    }));
  };

  // Full script combined text
  const combinedScriptText = project.scenes.map(s => s.voiceover).join('\n\n');

  // Apply full script edits back to scenes
  const handleSaveFullScript = () => {
    const paragraphs = customFullScript.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      setProject(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, idx) => ({
          ...s,
          voiceover: paragraphs[idx] || s.voiceover,
          caption: paragraphs[idx]?.slice(0, 45) || s.caption,
        })),
      }));
    }
    setIsEditingFullScript(false);
  };

  // Start Generation Handler from mobile workflow
  const handleTriggerGenerate = async () => {
    setCurrentStep('export');
    await onStartGeneration();
  };

  // -------------------------------------------------------------
  // DEDICATED GENERATION SCREEN (< 768px)
  // -------------------------------------------------------------
  if (isGenerating) {
    const pct = progress.percentage;
    const stages = [
      { label: 'Qoraalka Af-Soomaaliga (Script)', done: pct >= 20, active: pct < 20 },
      { label: 'Codka AI ee Soomaaliga (Somali Voice)', done: pct >= 45, active: pct >= 20 && pct < 45 },
      { label: 'Sawirrada 9:16 & Dhaqdhaqaaqa (Scenes)', done: pct >= 70, active: pct >= 45 && pct < 70 },
      { label: 'Isku-xirka Fiidiyowga MP4 (Video Assembly)', done: pct >= 90, active: pct >= 70 && pct < 90 },
      { label: 'Xaqiijinta MP4 & Xawaaraha (Final MP4)', done: pct >= 100, active: pct >= 90 },
    ];

    return (
      <div className="w-full flex flex-col items-center justify-center py-6 px-2 min-h-[65vh] animate-in fade-in duration-300">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col gap-6 shadow-2xl">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <RotateCw className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight uppercase mt-2">
              CREATING YOUR REEL
            </h2>
            <p className="text-xs text-slate-400">
              {progress.currentMessage || 'Fadlan sug, nidaamka ayaa samaynaya muuqaalkaaga 9:16...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className="text-slate-400">Heerka Samaynta</span>
              <span className="text-cyan-400">{pct}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-400 transition-all duration-300 shadow-sm shadow-cyan-500/50"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs">
                {stage.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : stage.active ? (
                  <span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={stage.done ? 'text-slate-200 font-medium' : stage.active ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DEDICATED FINAL READY SCREEN (< 768px, Step 6 when ready)
  // -------------------------------------------------------------
  if (currentStep === 'export' && assembledResult && assembledResult.success) {
    return (
      <div className="w-full flex flex-col items-center gap-4 pb-12 animate-in fade-in duration-300">
        {/* Dominant 9:16 Video Player */}
        <div className="w-full flex flex-col items-center">
          <ReelPreviewPlayer
            assembledResult={assembledResult}
            project={project}
            isGenerating={false}
          />
        </div>

        {/* Status Badge: ✓ REEL READY */}
        <div className="w-full max-w-sm flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-4 h-4" />
          <span>✓ REEL READY (1080x1920 • H.264 MP4)</span>
        </div>

        {/* Fallback-visual notice: tell the user plainly when a scene
            couldn't get a real AI image (e.g. Gemini quota/billing issue)
            and silently used the offline placeholder graphic instead,
            rather than letting it pass as if nothing went wrong. */}
        {(() => {
          const fallbackScenes = (assembledResult.assembledScenes || []).filter(
            (s) => s.visualSource === 'bespoke_scene_visual'
          );
          if (fallbackScenes.length === 0) return null;
          // The server records why the real image couldn't be generated
          // (safety block, quota, model unavailable...). Showing that exact
          // reason is the difference between "something looks off" and
          // knowing what to actually fix.
          const reason = fallbackScenes.find((s) => s.visualNote)?.visualNote;
          return (
            <div className="w-full max-w-sm flex items-start gap-2 py-2.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span>
                  Sawir AI dhab ah looma soo saarin muuqaal{fallbackScenes.length > 1 ? 'lada' : 'ka'}{' '}
                  {fallbackScenes.map((s) => s.sceneNumber).join(', ')} — waxaa loo isticmaalay sawir beddelaad.
                </span>
                {reason && (
                  <span className="text-amber-400/80 font-mono text-[10px] break-words">{reason}</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Three Mobile Buttons */}
        <div className="w-full max-w-sm flex flex-col gap-2.5">
          {/* Download MP4 */}
          <button
            type="button"
            onClick={onDownload}
            className="w-full touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-transform"
          >
            <Download className="w-5 h-5" />
            <span>DOWNLOAD MP4</span>
          </button>

          {/* Create Another */}
          <button
            type="button"
            onClick={() => {
              onNewReel();
              setCurrentStep('topic');
            }}
            className="w-full touch-target py-3 px-4 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>CREATE ANOTHER REEL</span>
          </button>

          {/* Edit Scenes Again */}
          <button
            type="button"
            onClick={() => setCurrentStep('scenes')}
            className="touch-target py-2 text-xs text-slate-400 hover:text-slate-200 text-center font-medium"
          >
            ← Wax ka beddel Muuqaallada (Edit Scenes)
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GUIDED STEP-BY-STEP CREATE FLOW (Step 1 to Step 5)
  // -------------------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-4 pb-12">
      {/* Step Progress Indicator */}
      <div className="w-full py-1">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1">
          {stepsList.map((st, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isLast = idx === stepsList.length - 1;

            return (
              <React.Fragment key={st.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.id)}
                  className="touch-target flex flex-col items-center gap-1 px-1.5 shrink-0 group"
                >
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-extrabold transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-gradient-to-br from-sky-400 to-cyan-400 text-white shadow-md shadow-cyan-500/40 ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-slate-950'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 group-hover:border-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-wide whitespace-nowrap ${
                      isCurrent ? 'text-cyan-300' : isCompleted ? 'text-emerald-400/90' : 'text-slate-500'
                    }`}
                  >
                    {st.label}
                  </span>
                </button>
                {!isLast && (
                  <span
                    className={`h-[2px] w-3 sm:w-5 shrink-0 rounded-full -mt-4 ${
                      isCompleted ? 'bg-emerald-500/70' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1 — TOPIC                                            */}
      {/* ========================================================= */}
      {currentStep === 'topic' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Xeero AI Studio
            </span>
            <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              Create Your Reel
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a topic (Dooro mowduuca aad rabto inaad ka hadasho)
            </p>
          </div>

          {/* Topic Input Box */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <label htmlFor="mobile-reel-topic" className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Mawduuca (Topic):
              </label>
              <input
                id="mobile-reel-topic"
                type="text"
                value={project.topic}
                onChange={(e) => setProject(prev => ({ ...prev, topic: e.target.value, title: e.target.value }))}
                placeholder="Tusaale: 3 siyaabood oo AI kuu badbaadin karo waqti maalin kasta..."
                className="w-full touch-target p-3.5 pr-10 rounded-2xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-white placeholder-slate-500"
              />
              {project.topic && (
                <button
                  type="button"
                  onClick={() => setProject(prev => ({ ...prev, topic: '' }))}
                  className="absolute right-3 top-9 text-slate-500 hover:text-white p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Description / Story Prompt Box */}
            <div className="flex flex-col gap-1">
              <label htmlFor="mobile-reel-description" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sharaxaadda / Sheekada (Description / Story):
              </label>
              <textarea
                id="mobile-reel-description"
                rows={3}
                value={project.description || ''}
                onChange={(e) => setProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tusaale: Create a 30–40 second Somali educational Reel explaining three practical uses of AI: 1. Qorista... 2. Soo koobidda... 3. Qorshaynta..."
                className="w-full touch-target p-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-white placeholder-slate-500"
              />
            </div>

            {/* Target Duration Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Dhererka (Duration)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 30, tag: 'Degdeg' },
                  { sec: 45, tag: 'Caadi' },
                  { sec: 60, tag: 'Faahfaahsan' },
                ].map(({ sec, tag }) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setProject(prev => ({ ...prev, targetDuration: sec }))}
                    className={`touch-target flex flex-col items-center gap-0.5 py-2.5 rounded-2xl border font-bold transition-all ${
                      project.targetDuration === sec
                        ? 'bg-gradient-to-b from-sky-500 to-cyan-500 border-transparent text-white shadow-md shadow-sky-500/25'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm">{sec}s</span>
                    <span className={`text-[10px] font-medium ${project.targetDuration === sec ? 'text-white/80' : 'text-slate-500'}`}>
                      {tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Topic Cards */}
          <div className="flex flex-col gap-2 pt-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recommended Topics (Mowduucyo Diyaar Ah)
            </h3>
            <div className="flex flex-col gap-2">
              {CURATED_SOMALI_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProject(prev => ({ ...prev, topic: item.title, title: item.title, description: item.desc }))}
                  className={`touch-target relative overflow-hidden pl-4 pr-3 py-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                    project.topic === item.title
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 active:bg-slate-800/80'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      project.topic === item.title ? 'bg-gradient-to-b from-sky-400 to-cyan-400' : 'bg-slate-700'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-sky-400 block">{item.category}</span>
                    <p className="text-xs font-bold text-white truncate mt-0.5">{item.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {creationError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-400 text-xs">
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

          {/* Primary Action: CREATE REEL */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              id="btn-mobile-create-reel"
              type="button"
              onClick={async () => {
                await onGenerateScript();
              }}
              disabled={isGeneratingScript || (!project.topic.trim() && !project.description?.trim())}
              className="w-full touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-400 hover:from-sky-400 hover:to-cyan-300 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isGeneratingScript ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{creationStatus || progress.currentMessage || 'CREATING REEL...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-yellow-300" />
                  <span>CREATE REEL ({project.targetDuration}s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2 — SCRIPT                                           */}
      {/* ========================================================= */}
      {currentStep === 'script' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
                Xeero AI Studio
              </span>
              <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                Reel Script
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Qoraalka Af-Soomaaliga ee muuqanaya laguna hadlayo
              </p>
            </div>
          </div>

          {/* A template script is generic canned content, NOT about the
              topic the user asked for — shipping that silently is worse
              than failing, so it is called out before anything else. */}
          {project.scriptSource === 'offline_template' && (
            <div className="flex items-start gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex flex-col gap-1">
                <span className="font-bold">
                  Digniin: Qoraalkani MAAHA mid AI uu ka sameeyay mawduucaaga.
                </span>
                <span>
                  Gemini lama gaari karin, markaa waxaa la isticmaalay qoraal guud oo horay loo diyaariyay. Ka hubi Settings → “Hubi Sawirada AI”.
                </span>
                {project.scriptFallbackReason && (
                  <span className="text-rose-300/80 font-mono text-[10px] break-words">
                    {project.scriptFallbackReason}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Large Readable Somali Text Area */}
          <div className="flex flex-col gap-2">
            {isEditingFullScript ? (
              <div className="flex flex-col gap-2">
                <textarea
                  rows={8}
                  value={customFullScript}
                  onChange={(e) => setCustomFullScript(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-900 border border-sky-500/80 text-sm text-white font-sans leading-relaxed resize-none focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFullScript}
                    className="flex-1 touch-target py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingFullScript(false)}
                    className="touch-target px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3">
                <div className="text-sm sm:text-base text-slate-100 leading-relaxed whitespace-pre-line font-normal">
                  {combinedScriptText || 'Weli script lama soo saarin. Riix "GENERATE SCRIPT" si aad AI ugu dhistid.'}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  <span>{project.scenes.length} Muuqaal (Scenes)</span>
                  <span>{project.targetDuration} Ilbiriqsi (Seconds)</span>
                </div>
              </div>
            )}

            {/* Action Buttons: GENERATE SCRIPT & EDIT SCRIPT */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={onGenerateScript}
                disabled={isGeneratingScript}
                className="touch-target py-3 px-3 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-850 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isGeneratingScript ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Dhisaya AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>GENERATE SCRIPT</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomFullScript(combinedScriptText);
                  setIsEditingFullScript(true);
                }}
                className="touch-target py-3 px-3 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-850 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>EDIT SCRIPT</span>
              </button>
            </div>
          </div>

          {/* Primary Action: CONTINUE & Back */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={goToPrevStep}
              className="touch-target py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="flex-1 touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-transform"
            >
              <span>CONTINUE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3 — SOMALI VOICE                                     */}
      {/* ========================================================= */}
      {currentStep === 'voice' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Xeero AI Studio
            </span>
            <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              Somali Voice
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dooro codka AI ee ku hadlaya muuqaalkaaga. Riix "Preview" si aad u dhagaysatid.
            </p>
          </div>

          {/* Large Selectable Voice Cards */}
          <div className="flex flex-col gap-2.5">
            {SOMALI_VOICES.map((voice) => {
              const isSelected = project.selectedVoice.id === voice.id;
              const isPlaying = playingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => setProject(prev => ({ ...prev, selectedVoice: voice }))}
                  className={`touch-target p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-500/20'
                      : 'bg-slate-900/70 border-slate-800 active:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-white">{voice.name}</h3>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {voice.gender === 'male' ? 'Somali Male' : 'Somali Female'} • {voice.tag || 'Dabiici'}
                        </span>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePreviewVoice(voice, e)}
                      aria-label={`Preview voice for ${voice.name}`}
                      className="touch-target px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                    >
                      <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce text-yellow-300' : ''}`} />
                      <span>{isPlaying ? 'Dhagayso...' : 'Preview'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 italic truncate pl-11">
                    "{voice.sampleText}"
                  </p>
                </div>
              );
            })}
          </div>

          {/* Primary Action: CONTINUE & Back */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={goToPrevStep}
              className="touch-target py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="flex-1 touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-transform"
            >
              <span>CONTINUE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4 — SCENES                                           */}
      {/* ========================================================= */}
      {currentStep === 'scenes' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Xeero AI Studio
            </span>
            <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              Scenes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Taabo muuqaal kasta si aad wax uga beddesho qoraalka ama sawirka
            </p>
          </div>

          {/* Compact Scene Cards */}
          <div className="flex flex-col gap-2.5">
            {project.scenes.map((scene, idx) => {
              const startSec = idx * (scene.duration || 5);
              const endSec = startSec + (scene.duration || 5);
              const sceneLabels = ['Hook', 'Explanation', 'Example', 'Call to Action'];
              const label = sceneLabels[idx] || `Scene ${idx + 1}`;

              return (
                <div
                  key={scene.id || idx}
                  onClick={() => setEditingScene(scene)}
                  className="touch-target p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Small thumbnail */}
                    <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 flex items-center justify-center">
                      {scene.visualUrl ? (
                        <img
                          src={scene.visualUrl}
                          alt={`Scene ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-slate-600" />
                      )}
                      <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-bold text-white">
                        {idx + 1}
                      </div>
                    </div>

                    {/* Scene Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-white uppercase">
                          SCENE {idx + 1}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded">
                          {startSec}–{endSec} sec
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-400 block mt-0.5">
                        {scene.caption || label}
                      </span>
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                        {scene.voiceover}
                      </p>
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingScene(scene);
                    }}
                    className="touch-target px-3 py-1.5 rounded-xl bg-slate-800 text-sky-400 hover:text-white font-bold text-xs shrink-0"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          {/* Primary Action: CONTINUE to Preview & Back */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={goToPrevStep}
              className="touch-target py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="flex-1 touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-transform"
            >
              <span>CONTINUE (PREVIEW)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 5 — PREVIEW                                          */}
      {/* ========================================================= */}
      {currentStep === 'preview' && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
          <div className="w-full text-center">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
              Xeero AI Studio
            </span>
            <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              Preview Reel
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hubi muuqaallada ka hor inta aadan bilaabin — video dhabta ah waxaa la sameeyaa marka aad taabato "GENERATE / FINALIZE REEL"
            </p>
          </div>

          {/* Scene storyboard — never a real video here: any assembledResult
              this session belongs to a *previous* render whose file may no
              longer exist on the server (redeploys and instance recycling
              both wipe exported files), so treating it as playable at this
              step risks showing a broken player. The real video only exists
              once Generate below has actually run. */}
          <div className="w-full flex flex-col items-center">
            <ReelPreviewPlayer
              assembledResult={null}
              project={project}
              isGenerating={false}
              onGenerateClick={handleTriggerGenerate}
            />
          </div>

          {/* REEL INFORMATION (Compact info cards) */}
          <div className="w-full max-w-sm rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              REEL INFORMATION
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Duration:</span>
                <span className="font-bold text-white">{project.targetDuration}s</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Resolution:</span>
                <span className="font-bold text-cyan-400">1080x1920</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Scenes:</span>
                <span className="font-bold text-white">{project.scenes.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Voice:</span>
                <span className="font-bold text-white truncate max-w-[80px]">{project.selectedVoice.name}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button: GENERATE / FINALIZE REEL */}
          <div className="w-full max-w-sm flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleTriggerGenerate}
              className="w-full touch-target py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-transform"
            >
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span>GENERATE / FINALIZE REEL</span>
            </button>

            <button
              type="button"
              onClick={goToPrevStep}
              className="touch-target py-2 text-xs text-slate-400 hover:text-slate-200 text-center font-medium"
            >
              ← Wax ka beddel Muuqaallada (Back to Scenes)
            </button>
          </div>
        </div>
      )}

      {/* DEDICATED SCENE EDITOR MODAL */}
      <MobileSceneEditorModal
        isOpen={!!editingScene}
        scene={editingScene}
        onClose={() => setEditingScene(null)}
        onSave={handleSaveScene}
      />
    </div>
  );
};
