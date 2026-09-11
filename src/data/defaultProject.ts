import { CaptionStyle, ReelProject, VoiceOption } from '../types';

export const SOMALI_VOICES: VoiceOption[] = [
  {
    id: 'ubax-somali',
    name: 'Ubax (Somali Female • Edge Neural)',
    language: 'Somali (Af-Soomaali)',
    accent: 'Hargeisa / Mogadishu Clear',
    gender: 'female',
    sampleText: 'Ku soo dhawoow Xeero AI, baro sida maanta loogu faa’iidaysto garaadka macmalka ah.',
    pitch: 1.0,
    rate: 1.0,
    provider: 'edge_tts',
    tag: 'Ubax • Rasmi ah',
  },
  {
    id: 'muuse-tech',
    name: 'Muuse (Somali Male)',
    language: 'Somali (Af-Soomaali)',
    accent: 'Mogadishu Standard',
    gender: 'male',
    sampleText: 'Ku soo dhawoow mustaqbalka casriga ah ee Xeero AI.',
    pitch: 1.0,
    rate: 1.05,
    provider: 'somali_neural_local',
    tag: 'Dabiici & Dheeli-tiran',
  },
  {
    id: 'warsame-narrator',
    name: 'Warsame (Somali Male)',
    language: 'Somali (Af-Soomaali)',
    accent: 'Somali Deep',
    gender: 'male',
    sampleText: 'Dunidu si xawli ah ayay isu beddelaysaa maalin kasta.',
    pitch: 0.92,
    rate: 0.95,
    provider: 'somali_neural_local',
    tag: 'Xamaasad & Qoto-dheer',
  },
  {
    id: 'cawo-dynamic',
    name: 'Cawo (Somali Female)',
    language: 'Somali (Af-Soomaali)',
    accent: 'Urban Modern',
    gender: 'female',
    sampleText: 'Ha moogaanin fursadaha dahabiga ah ee xilligan.',
    pitch: 1.1,
    rate: 1.08,
    provider: 'somali_neural_local',
    tag: 'Diirran & Deggan',
  },
];

export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: 'xeero-cyan',
    name: 'Xeero Cyan',
    fontFamily: 'Liberation Sans, sans-serif',
    fontSize: 44,
    color: '#FFFFFF',
    backgroundColor: '#0284C7',
    boxBorderWidth: 18,
    textTransform: 'none',
    position: 'bottom',
    animation: 'pop',
    previewBg: 'bg-sky-600 text-white',
  },
  {
    id: 'tiktok-yellow',
    name: 'Viral Yellow',
    fontFamily: 'Liberation Sans, sans-serif',
    fontSize: 46,
    color: '#000000',
    backgroundColor: '#FACC15',
    boxBorderWidth: 18,
    textTransform: 'uppercase',
    position: 'bottom',
    animation: 'highlight',
    previewBg: 'bg-yellow-400 text-black font-black',
  },
  {
    id: 'sleek-dark',
    name: 'Sleek Dark',
    fontFamily: 'Liberation Sans, sans-serif',
    fontSize: 42,
    color: '#38BDF8',
    backgroundColor: '#0F172A',
    boxBorderWidth: 16,
    textTransform: 'none',
    position: 'bottom',
    animation: 'typewriter',
    previewBg: 'bg-slate-900 text-sky-400 border border-sky-500/30',
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    fontFamily: 'Liberation Sans, sans-serif',
    fontSize: 40,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    boxBorderWidth: 14,
    textTransform: 'none',
    position: 'bottom',
    animation: 'fade',
    previewBg: 'bg-black/80 text-white',
  },
];

export const CURATED_SOMALI_TOPICS = [
  {
    title: '3 Siyaabood oo AI Shaqooyin Cusub ugu Abuureyso Soomaaliya',
    category: 'Mustaqbalka Shaqada',
    desc: 'Sida dhalinyarada Soomaaliyeed u bilaabi karaan shaqooyin online ah oo AI ku saleysan.',
  },
  {
    title: 'Waa Maxay AI Agent? (Sharaxaad Fudud)',
    category: 'Teknolojiyad',
    desc: 'Fahanka caawiyayaasha madaxa-bannaan ee AI oo qaban kara hawlo adag adigoon faraha la gelin.',
  },
  {
    title: 'Sida Loogu Baro Af-Soomaaliga Models-ka Casriga ah',
    category: 'Horumarinta AI',
    desc: 'Tallaabooyinka lagu horumarinayo xogta Af-Soomaaliga si AI si hufan ugu hadasho.',
  },
  {
    title: '5 Qalab oo AI ah oo Arday Kasta u Baahan Yahay',
    category: 'Waxbarasho',
    desc: 'Qalabka ugu fiican ee cilmi-baarista, xisaabta, iyo qoraalka maqaallada cilmiga ah.',
  },
];

/**
 * Creates a clean, empty Reel project with a unique ID and isolated state.
 * Never inherits old scenes, assets, or exports. Initial scenes array is strictly empty.
 */
export function createCleanReel(topic = '', description = ''): ReelProject {
  const reelId = `xeero_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: reelId,
    title: topic || '',
    topic: topic || '',
    description: description || '',
    script: '',
    targetDuration: 35,
    aspectRatio: '9:16',
    pacing: 'dynamic',
    selectedVoice: SOMALI_VOICES[0], // Ubax
    voice: SOMALI_VOICES[0],
    selectedCaptionStyle: CAPTION_STYLES[0],
    captions: CAPTION_STYLES[0],
    showWatermark: true,
    musicVolume: 0.15,
    exportQuality: '1080p',
    scenes: [],
    audioUrl: null,
    previewUrl: null,
    exportUrl: null,
    assembledResult: null,
  };
}

export const createCleanReelProject = createCleanReel;

// Default initial state is always a clean project with scenes: []
export const DEFAULT_REEL_PROJECT: ReelProject = createCleanReel();

