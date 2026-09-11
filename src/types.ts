export type AspectRatio = '9:16' | '16:9' | '1:1';

export type ReelPacing = 'fast' | 'dynamic' | 'balanced' | 'cinematic';

export interface Scene {
  id: string;
  sceneNumber: number;
  duration: number; // in seconds (typically 4-8s)
  voiceover: string; // Somali narration
  caption: string; // Text to overlay
  keyMessage?: string; // Core educational message of the scene
  visualObjective?: string; // Specific visual objective
  subject?: string; // Main visual subject
  action?: string; // Action occurring in the scene
  environment?: string; // Setting / backdrop
  cameraComposition?: string; // Camera framing and composition
  visualPrompt: string;
  flowPrompt?: string; // Google Flow cinematic prompt
  visualKeywords: string[];
  visualUrl?: string; // Attached Flow MP4 or image asset
  videoUrl?: string; // Attached Flow MP4 video asset
  audioUrl?: string; // Attached Ubax voiceover audio asset
  assetType?: 'video' | 'image' | 'none';
  status?: 'pending' | 'flow_ready' | 'ready' | 'error';
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: 'male' | 'female';
  sampleText: string;
  pitch: number;
  rate: number;
  provider: 'somali_neural_local' | 'custom_upload' | 'edge_tts';
  tag?: string;
  audioUrl?: string;
}

export interface CaptionStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  boxBorderWidth: number;
  textTransform: 'uppercase' | 'none' | 'capitalize';
  position: 'center' | 'bottom' | 'top';
  animation: 'pop' | 'typewriter' | 'highlight' | 'fade';
  previewBg: string;
}

export interface ReelProject {
  id: string;
  title: string;
  topic: string;
  description?: string;
  script?: string;
  targetDuration: number; // e.g. 30, 45, 60 seconds
  aspectRatio: AspectRatio;
  pacing: ReelPacing;
  scenes: Scene[];
  selectedVoice: VoiceOption;
  voice?: VoiceOption;
  selectedCaptionStyle: CaptionStyle;
  captions?: CaptionStyle;
  showWatermark: boolean;
  backgroundMusic?: string;
  musicVolume?: number; // 0.0 - 1.0
  exportQuality?: '1080p' | '720p';
  audioUrl?: string | null;
  previewUrl?: string | null;
  exportUrl?: string | null;
  assembledResult?: AssembledReelResult | null;
  isDemo?: boolean;
}

export type GenerationStep =
  | 'idle'
  | 'creating_reel'
  | 'creating_script'
  | 'creating_scenes'
  | 'validating_script'
  | 'generating_voiceover'
  | 'generating_visuals'
  | 'rendering_captions'
  | 'normalizing_audio'
  | 'assembling_mp4'
  | 'validating_mp4'
  | 'ready'
  | 'failed';

export interface GenerationProgress {
  step: GenerationStep;
  percentage: number;
  currentMessage: string;
  sceneProgress?: {
    current: number;
    total: number;
  };
  audioProgress?: {
    status: 'idle' | 'generating' | 'normalizing' | 'done';
  };
  videoProgress?: {
    status: 'idle' | 'rendering_scenes' | 'concatenating' | 'done';
  };
  error?: string;
}

export interface AssembledReelResult {
  success: boolean;
  mp4Url?: string;
  downloadUrl?: string;
  filename?: string;
  message?: string;
  requiresRuntime?: boolean;
  runtimeStatus?: 'ffmpeg_available' | 'ffmpeg_missing';
  assembledScenesCount?: number;
  totalDuration?: number;
  assembledScenes?: Array<{
    sceneNumber: number;
    duration: number;
    caption: string;
    visualSource?: 'uploaded_flow' | 'bespoke_scene_visual' | 'matched_asset' | 'ai_generated_visual';
  }>;
  validation?: {
    isMp4: boolean;
    hasVideoStream: boolean;
    hasAudioStream: boolean;
    width: number;
    height: number;
    fps: number;
    videoCodec: string;
    audioCodec: string;
    durationSeconds: number;
    fileSizeBytes: number;
    mimeType: string;
    loudnessTarget?: string;
    truePeakDbtp?: number;
  };
}

export type ActiveMobileTab = 'dashboard' | 'create' | 'projects' | 'drive' | 'settings';

export type WorkflowStepId = 'topic' | 'script' | 'voice' | 'scenes' | 'video' | 'captions' | 'generate';

export type MobileWorkflowStep = 'topic' | 'script' | 'voice' | 'scenes' | 'preview' | 'export';
