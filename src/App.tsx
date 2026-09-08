import React, { useEffect, useRef, useState } from 'react';
import { 
  Sparkles, 
  Download, 
  Eye, 
  PlusCircle, 
  RotateCw,
  Film
} from 'lucide-react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TopicStep } from './components/TopicStep';
import { ScriptStep } from './components/ScriptStep';
import { VoiceStep } from './components/VoiceStep';
import { ScenesStep } from './components/ScenesStep';
import { ReelPreviewPlayer } from './components/ReelPreviewPlayer';
import { GenerationWorkspace } from './components/GenerationWorkspace';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
import { GoogleDriveView } from './components/GoogleDriveView';
import { SettingsModal } from './components/SettingsModal';
import { MobileAppView } from './components/mobile/MobileAppView';
import { createCleanReel, createCleanReelProject } from './data/defaultProject';
import { 
  ActiveMobileTab, 
  AssembledReelResult, 
  GenerationProgress, 
  MobileWorkflowStep, 
  ReelProject,
  Scene 
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveMobileTab>('create');
  const [mobileStep, setMobileStep] = useState<MobileWorkflowStep>('topic');
  const [project, setProject] = useState<ReelProject>(() => createCleanReel());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    step: 'idle',
    percentage: 0,
    currentMessage: 'Reel-ku wuu diyaar u yahay samaynta.',
  });

  const [assembledResult, setAssembledResult] = useState<AssembledReelResult | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);

  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  // Health check on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Generate Script & Initialize Reel via Backend (Offline / Deterministic, no Gemini)
  const handleGenerateScript = async (autoAssemble = true) => {
    const rawTopic = (project.topic || '').trim();
    const rawDesc = (project.description || '').trim();

    if (!rawTopic && !rawDesc) {
      setCreationError('Fadlan gali mawduuca ama faahfaahinta Reel-ka (Please enter a topic or description).');
      return;
    }
    setCreationError(null);
    setIsGeneratingScript(true);

    // Step 1: CREATING REEL...
    setProgress({
      step: 'creating_reel',
      percentage: 15,
      currentMessage: 'CREATING REEL...',
    });

    try {
      // Always generate a clean, isolated unique project ID for every new submission
      const newReelId = `xeero_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Step 2: CREATING SCRIPT...
      setProgress({
        step: 'creating_script',
        percentage: 35,
        currentMessage: 'CREATING SCRIPT...',
      });

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: rawTopic || rawDesc.slice(0, 40),
          description: rawDesc,
          customScript: (project as any).customScript || project.script || (rawDesc.split('\n').filter(l => l.trim()).length > 1 ? rawDesc : undefined),
          targetDuration: project.targetDuration || 35,
          pacing: project.pacing || 'dynamic',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error ${res.status}`);
      }

      const data = await res.json();
      if (!data.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
        throw new Error('Script generator returned no scenes');
      }

      // Step 3: CREATING SCENES...
      setProgress({
        step: 'creating_scenes',
        percentage: 55,
        currentMessage: 'CREATING SCENES...',
      });

      const generatedScenes: Scene[] = data.scenes.map((s: any, idx: number) => ({
        id: `sc_${newReelId}_${idx + 1}`,
        sceneNumber: idx + 1,
        duration: s.duration || Math.round((project.targetDuration || 35) / data.scenes.length),
        voiceover: s.voiceover || '',
        caption: s.caption || '',
        visualPrompt: s.visualPrompt || `Somali AI Reel Scene ${idx + 1}`,
        flowPrompt: s.flowPrompt || `Vertical 9:16 cinematic video: ${rawTopic || 'Somali innovation'}, 24fps smooth motion`,
        visualKeywords: s.visualKeywords || ['somali reel', 'ai'],
        visualUrl: s.visualUrl || undefined,
        videoUrl: s.videoUrl || undefined,
        assetType: s.videoUrl ? 'video' : s.visualUrl ? 'image' : undefined,
        status: s.visualUrl || s.videoUrl ? 'flow_ready' : 'pending',
      }));

      const fullScript = generatedScenes.map(s => s.voiceover).join('\n\n');
      const finalTitle = data.title || rawTopic || 'Xeero AI Reel';

      // Clean state container strictly using CURRENT submitted data
      const updatedProject: ReelProject = {
        ...project,
        id: newReelId,
        title: finalTitle,
        topic: rawTopic,
        description: rawDesc,
        script: fullScript,
        scenes: generatedScenes,
        audioUrl: null,
        previewUrl: null,
        exportUrl: null,
        assembledResult: null,
        isDemo: false,
      };

      setProject(updatedProject);
      setAssembledResult(null);

      // Ensure user stays in Reel Studio
      setActiveTab('create');

      if (autoAssemble) {
        // Step 4: Continue Reel creation seamlessly by assembling the final 9:16 MP4
        await handleAssembleReel(updatedProject);
      } else {
        setProgress({
          step: 'ready',
          percentage: 100,
          currentMessage: 'READY',
        });
        setMobileStep('scenes');
        setTimeout(() => {
          handleScrollToPreview();
        }, 100);
      }

    } catch (err: any) {
      console.error('Failed to create reel/script:', err);
      const errMsg = err?.message || 'Khalad ayaa dhacay intii lagu jiray samaynta Reel-ka';
      setCreationError(errMsg);
      setProgress({
        step: 'failed',
        percentage: 0,
        currentMessage: 'CREATION FAILED',
        error: errMsg,
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Assemble Reel MP4 via Backend
  const handleAssembleReel = async (targetProject?: ReelProject) => {
    const activeProject = targetProject || project;
    if (!activeProject.scenes || activeProject.scenes.length === 0) {
      setCreationError('Fadlan marka hore samee Script-ka iyo muuqaallada (No scenes to assemble).');
      return;
    }

    setIsGenerating(true);
    setProgress({
      step: 'validating_script',
      percentage: 20,
      currentMessage: '1. Hubinta qoraalka Af-Soomaaliga...',
    });

    try {
      // Step 1: Voiceover & Audio Normalization
      setTimeout(() => {
        setProgress({
          step: 'generating_voiceover',
          percentage: 45,
          currentMessage: `2. Duubista codka (${activeProject.selectedVoice.name})...`,
        });
      }, 700);

      // Step 2: Visuals & Captions
      setTimeout(() => {
        setProgress({
          step: 'generating_visuals',
          percentage: 70,
          currentMessage: '3. Diyaarinta sawirrada 9:16 & dhaqdhaqaaqa...',
        });
      }, 1500);

      // Step 3: FFmpeg Assembly
      setTimeout(() => {
        setProgress({
          step: 'assembling_mp4',
          percentage: 88,
          currentMessage: '4. Isku-dhafka MP4 (H.264 + AAC loudnorm -16 LUFS)...',
        });
      }, 2400);

      const res = await fetch('/api/assemble-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeProject.title,
          topic: activeProject.topic,
          reelId: activeProject.id,
          targetDuration: activeProject.targetDuration,
          voiceId: activeProject.selectedVoice.id,
          voiceName: activeProject.selectedVoice.name,
          audioUrl: activeProject.audioUrl,
          aspectRatio: activeProject.aspectRatio,
          forceRebuild: true,
          isDemo: !!activeProject.isDemo,
          scenes: activeProject.scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            duration: s.duration,
            voiceover: s.voiceover,
            caption: s.caption,
            visualPrompt: s.visualPrompt,
            flowPrompt: s.flowPrompt,
            visualKeywords: s.visualKeywords,
            visualUrl: s.visualUrl,
            videoUrl: s.videoUrl,
            audioUrl: s.audioUrl,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Assembly failed with HTTP ${res.status}`);
      }

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || 'Assembly returned unsuccessful');
      }

      setAssembledResult(result);
      setProject(prev => ({
        ...prev,
        previewUrl: result.mp4Url,
        assembledResult: result,
      }));

      setProgress({
        step: 'ready',
        percentage: 100,
        currentMessage: 'Muuqaalkii 9:16 wuu diyaar yahay!',
      });

      // Move mobile view directly to preview player step
      setMobileStep('preview');

      // Scroll to preview on desktop
      setTimeout(() => {
        handleScrollToPreview();
      }, 150);
    } catch (err: any) {
      console.error('Reel generation failed:', err);
      setProgress({
        step: 'failed',
        percentage: 100,
        currentMessage: 'Khalad ayaa dhacay intii lagu jiray samaynta.',
        error: err?.message || 'Failed to assemble Reel MP4',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScrollToPreview = () => {
    if (previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartNewReel = () => {
    setProject(createCleanReelProject());
    setAssembledResult(null);
    setProgress({
      step: 'idle',
      percentage: 0,
      currentMessage: 'Diyaar u ah Reel cusub.',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadReel = () => {
    const directUrl = assembledResult?.filename
      ? `/api/download-reel-mp4?filename=${encodeURIComponent(assembledResult.filename)}`
      : '/api/download-reel-mp4';
    window.location.href = directUrl;
  };

  const handleSelectSavedReel = (filename: string) => {
    setAssembledResult({
      success: true,
      mp4Url: `/exports/${filename}`,
      downloadUrl: `/api/download-reel-mp4?filename=${encodeURIComponent(filename)}`,
      filename,
      totalDuration: 20,
      validation: {
        isMp4: true,
        hasVideoStream: true,
        hasAudioStream: true,
        width: 1080,
        height: 1920,
        fps: 25,
        videoCodec: 'h264',
        audioCodec: 'aac',
        durationSeconds: 20,
        fileSizeBytes: 24846728,
        mimeType: 'video/mp4',
      },
    });
    setActiveTab('create');
    setTimeout(() => handleScrollToPreview(), 150);
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. DEDICATED MOBILE APP EXPERIENCE (< 768px) */}
      <div className="md:hidden w-full min-h-screen flex flex-col">
        <MobileAppView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileStep={mobileStep}
          setMobileStep={setMobileStep}
          project={project}
          setProject={setProject}
          assembledResult={assembledResult}
          progress={progress}
          isGenerating={isGenerating}
          isGeneratingScript={isGeneratingScript}
          onGenerateScript={handleGenerateScript}
          onStartGeneration={handleAssembleReel}
          onDownload={handleDownloadReel}
          onNewReel={handleStartNewReel}
          onSelectSavedReel={handleSelectSavedReel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          backendOnline={backendOnline}
          creationError={creationError}
          creationStatus={progress.currentMessage}
          onRetry={handleGenerateScript}
        />
      </div>

      {/* 2. DESKTOP / STUDIO EXPERIENCE (>= 768px) */}
      <div className="hidden md:flex flex-col min-h-screen w-full">
        {/* Desktop Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          backendOnline={backendOnline}
        />

        {/* Main Desktop Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 pb-12">
          {/* VIEW 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardView
              onStartCreate={(topic) => {
                const newProject = createCleanReelProject(topic || '');
                setProject(newProject);
                setAssembledResult(null);
                setActiveTab('create');
              }}
              onSelectSavedReel={handleSelectSavedReel}
            />
          )}

          {/* VIEW 2: PROJECTS */}
          {activeTab === 'projects' && (
            <ProjectsView
              onSelectReelForPlayback={(filename) => {
                handleSelectSavedReel(filename);
              }}
            />
          )}

          {/* VIEW 3: GOOGLE DRIVE HUB */}
          {activeTab === 'drive' && (
            <GoogleDriveView
              project={project}
              assembledResult={assembledResult}
              onSelectReelForPlayback={(filename) => {
                handleSelectSavedReel(filename);
                setActiveTab('create');
              }}
            />
          )}

          {/* VIEW 3: CREATE REEL */}
          {activeTab === 'create' && (
            <div className="w-full">
              <div className="w-full grid grid-cols-12 gap-8 items-start">
                {/* Left Column: Main Content */}
                <div className="col-span-7 flex flex-col gap-8">
                  {/* Step 1: Topic / Story */}
                  <section aria-label="Step 1: Topic" className="w-full">
                    <TopicStep
                      project={project}
                      setProject={setProject}
                      onGenerateScript={handleGenerateScript}
                      isGeneratingScript={isGeneratingScript}
                      creationError={creationError}
                      creationStatus={progress.currentMessage}
                      onRetry={handleGenerateScript}
                    />
                  </section>

                  <div className="w-full h-px bg-slate-800/80" />

                  {/* Step 2: Script */}
                  <section aria-label="Step 2: Script" className="w-full">
                    <ScriptStep
                      project={project}
                      setProject={setProject}
                      onRegenerate={handleGenerateScript}
                      isGeneratingScript={isGeneratingScript}
                    />
                  </section>

                  <div className="w-full h-px bg-slate-800/80" />

                  {/* Step 3: Voice */}
                  <section aria-label="Step 3: Voice" className="w-full">
                    <VoiceStep
                      project={project}
                      setProject={setProject}
                    />
                  </section>

                  <div className="w-full h-px bg-slate-800/80" />

                  {/* Step 4: Scenes */}
                  <section aria-label="Step 4: Scenes" className="w-full">
                    <ScenesStep
                      project={project}
                      setProject={setProject}
                    />
                  </section>
                </div>

                {/* Right-Side Sticky Studio Panel (>=768px only) */}
                <aside 
                  aria-label="Xeero AI Reel Studio Panel" 
                  className="hidden md:flex col-span-5 flex-col gap-6 sticky top-20 self-start w-full"
                >
                  <div className="w-full rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-2xl flex flex-col gap-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Film className="w-5 h-5 text-sky-400" />
                        <h2 className="text-base font-bold text-white tracking-tight">
                          Xeero AI Reel Studio
                        </h2>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                        9:16 Studio Panel
                      </span>
                    </div>

                    {/* Desktop Preview Player */}
                    <div className="w-full flex flex-col items-center">
                      <ReelPreviewPlayer
                        assembledResult={assembledResult}
                        project={project}
                        isGenerating={isGenerating}
                      />
                    </div>

                    {/* Desktop Generation Workspace */}
                    <div className="border-t border-slate-800 pt-4">
                      <GenerationWorkspace
                        progress={progress}
                        isGenerating={isGenerating}
                        assembledResult={assembledResult}
                        project={project}
                        onStartGeneration={handleAssembleReel}
                        onPreview={handleScrollToPreview}
                        onDownload={handleDownloadReel}
                        onNewReel={handleStartNewReel}
                      />
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={project}
        setProject={setProject}
        backendOnline={backendOnline}
      />
    </div>
  );
}

export default App;
