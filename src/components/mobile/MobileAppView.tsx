import React from 'react';
import { 
  ActiveMobileTab, 
  AssembledReelResult, 
  GenerationProgress, 
  MobileWorkflowStep, 
  ReelProject 
} from '../../types';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDashboard } from './MobileDashboard';
import { MobileCreateWorkflow } from './MobileCreateWorkflow';
import { ProjectsView } from '../ProjectsView';
import { GoogleDriveView } from '../GoogleDriveView';

interface MobileAppViewProps {
  activeTab: ActiveMobileTab;
  setActiveTab: (tab: ActiveMobileTab) => void;
  mobileStep: MobileWorkflowStep;
  setMobileStep: (step: MobileWorkflowStep) => void;
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
  onSelectSavedReel: (filename: string) => void;
  onOpenSettings: () => void;
  backendOnline: boolean;
  creationError?: string | null;
  creationStatus?: string;
  onRetry?: () => void;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  activeTab,
  setActiveTab,
  mobileStep,
  setMobileStep,
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
  onSelectSavedReel,
  onOpenSettings,
  backendOnline,
  creationError,
  creationStatus,
  onRetry,
}) => {
  // Step navigation helper for header back button
  const handleHeaderBack = () => {
    const steps: MobileWorkflowStep[] = ['topic', 'script', 'voice', 'scenes', 'preview', 'export'];
    const idx = steps.indexOf(mobileStep);
    if (idx > 0) {
      setMobileStep(steps[idx - 1]);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleStartCreateWithTopic = (topic?: string) => {
    onNewReel();
    if (topic) {
      setProject(prev => ({ ...prev, topic, title: topic }));
    }
    setMobileStep('topic');
    setActiveTab('create');
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* 1. Compact Native-Style Mobile Header */}
      <MobileHeader
        activeTab={activeTab}
        currentStep={activeTab === 'create' ? mobileStep : undefined}
        onBack={handleHeaderBack}
        onOpenSettings={onOpenSettings}
        backendOnline={backendOnline}
      />

      {/* 2. Scrollable Body Content (100% width, generous spacing, safe bottom padding) */}
      <main className="flex-1 w-full px-3.5 pt-3 pb-24 max-w-lg mx-auto">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <MobileDashboard
            onStartCreate={handleStartCreateWithTopic}
            onSelectSavedReel={(filename) => {
              onSelectSavedReel(filename);
              setMobileStep('preview');
              setActiveTab('create');
            }}
          />
        )}

        {/* TAB 2: CREATE REEL (Step-by-step guided flow) */}
        {activeTab === 'create' && (
          <MobileCreateWorkflow
            project={project}
            setProject={setProject}
            assembledResult={assembledResult}
            progress={progress}
            isGenerating={isGenerating}
            isGeneratingScript={isGeneratingScript}
            onGenerateScript={onGenerateScript}
            onStartGeneration={onStartGeneration}
            onDownload={onDownload}
            onNewReel={() => {
              onNewReel();
              setMobileStep('topic');
            }}
            currentStep={mobileStep}
            setCurrentStep={setMobileStep}
            onGoToDashboard={() => setActiveTab('dashboard')}
            creationError={creationError}
            creationStatus={creationStatus}
            onRetry={onGenerateScript}
          />
        )}

        {/* TAB 3: PROJECTS (Mobile Projects List) */}
        {activeTab === 'projects' && (
          <div className="flex flex-col gap-4">
            <ProjectsView
              onSelectReelForPlayback={(filename) => {
                onSelectSavedReel(filename);
                setMobileStep('preview');
                setActiveTab('create');
              }}
            />
          </div>
        )}

        {/* TAB 4: GOOGLE DRIVE (Storage & Cloud Export) */}
        {activeTab === 'drive' && (
          <div className="flex flex-col gap-4">
            <GoogleDriveView
              project={project}
              assembledResult={assembledResult}
              onSelectReelForPlayback={(filename) => {
                onSelectSavedReel(filename);
                setMobileStep('preview');
                setActiveTab('create');
              }}
            />
          </div>
        )}
      </main>

      {/* 3. Fixed Bottom Navigation Bar (< 768px) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};
