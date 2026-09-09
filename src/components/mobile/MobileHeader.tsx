import React from 'react';
import { ChevronLeft, Settings as SettingsIcon, Film } from 'lucide-react';
import { ActiveMobileTab, MobileWorkflowStep } from '../../types';

interface MobileHeaderProps {
  activeTab: ActiveMobileTab;
  currentStep?: MobileWorkflowStep;
  onBack?: () => void;
  onOpenSettings: () => void;
  backendOnline: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  currentStep,
  onBack,
  onOpenSettings,
  backendOnline,
}) => {
  const isWorkflowStepWithBack = activeTab === 'create' && currentStep && currentStep !== 'topic';

  const stepLabels: Record<MobileWorkflowStep, string> = {
    topic: '1/6 Topic',
    script: '2/6 Script',
    voice: '3/6 Voice',
    scenes: '4/6 Scenes',
    preview: '5/6 Preview',
    export: '6/6 Export',
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-3 flex items-center justify-between">
      {isWorkflowStepWithBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Dib u noqo (Back)"
          className="touch-target flex items-center gap-1 text-slate-300 hover:text-white active:scale-95 transition-all text-xs font-semibold px-1"
        >
          <ChevronLeft className="w-5 h-5 text-sky-400" />
          <span>Back</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/25">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-tight text-white leading-none">
              XEERO <span className="text-cyan-400">AI</span>
            </span>
            <span className="text-[9px] text-slate-400 tracking-wider uppercase leading-none mt-0.5 font-medium">
              Reel Studio
            </span>
          </div>
        </div>
      )}

      {/* Center status or workflow step indicator */}
      {activeTab === 'create' && currentStep ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-sky-400">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>{stepLabels[currentStep]}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{backendOnline ? 'AI Online' : 'Connecting'}</span>
        </div>
      )}

      {/* Right Controls: Settings button */}
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        className="touch-target p-2 rounded-xl text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>
    </header>
  );
};
