import React, { useState } from 'react';
import { 
  Mic, 
  Volume2, 
  CheckCircle, 
  Sliders, 
  Play, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  FileAudio, 
  AlertCircle 
} from 'lucide-react';
import { SOMALI_VOICES } from '../data/defaultProject';
import { ReelProject, VoiceOption } from '../types';
import { playSomaliVoicePreview } from '../utils/audioSynthesizer';

interface VoiceStepProps {
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
}

export const VoiceStep: React.FC<VoiceStepProps> = ({ project, setProject }) => {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadSuccess, setAudioUploadSuccess] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);

  const handleSelectVoice = (voice: VoiceOption) => {
    setProject(prev => ({
      ...prev,
      selectedVoice: voice,
    }));
  };

  const handlePreviewVoice = (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingVoiceId(voice.id);
    playSomaliVoicePreview(voice.sampleText, voice.pitch, voice.rate);
    setTimeout(() => setPlayingVoiceId(null), 1800);
  };

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true);
    setAudioUploadError(null);

    try {
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
          type: 'audio',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Audio upload failed');
      }

      setProject(prev => ({
        ...prev,
        audioUrl: result.url,
      }));
      setAudioUploadSuccess(true);
      setTimeout(() => setAudioUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setAudioUploadError(err?.message || 'Codka lama soo gelin karin');
    } finally {
      setUploadingAudio(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Title & Description */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Mic className="w-5 h-5 text-sky-400" />
          <span>3. Codka Af-Soomaaliga (Ubax / ElevenLabs)</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Codka Soomaaliga ee Ubax ayaa ah doorashada rasmiga ah ee Reel Studio.
        </p>
      </div>

      {/* Provider & Language Status Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">Bixiye:</span>
          <span className="font-bold text-white">ElevenLabs / Ubax Somali AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Luqadda:</span>
          <span className="font-bold text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
            Af-Soomaali (Standard Clear)
          </span>
        </div>
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SOMALI_VOICES.map((voice) => {
          const isSelected = project.selectedVoice.id === voice.id;
          const isPlaying = playingVoiceId === voice.id;
          const isUbax = voice.id.includes('ubax');

          return (
            <div
              key={voice.id}
              onClick={() => handleSelectVoice(voice)}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all touch-target flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-white">
                      {voice.name}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Lahjadda: {voice.accent}
                  </p>
                </div>

                {voice.tag && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isUbax 
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {voice.tag}
                  </span>
                )}
              </div>

              {/* Sample Text & Preview Audio Button */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 min-w-0">
                <p className="text-[11px] text-slate-300 italic truncate flex-1 min-w-0">
                  "{voice.sampleText}"
                </p>
                <button
                  type="button"
                  onClick={(e) => handlePreviewVoice(voice, e)}
                  aria-label={`Play audio sample for ${voice.name}`}
                  className="touch-target px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce text-yellow-300' : ''}`} />
                  <span>{isPlaying ? 'Dhagayso...' : 'Muunad'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Speed Slider */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Xawaaraha Hadalka (Speech Rate):
          </span>
          <span className="font-mono font-bold text-sky-400">
            {project.selectedVoice.rate.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.8"
          max="1.3"
          step="0.05"
          value={project.selectedVoice.rate}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setProject(prev => ({
              ...prev,
              selectedVoice: { ...prev.selectedVoice, rate: val },
            }));
          }}
          aria-label="Speech rate slider"
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
          <span>Deggan (0.8x)</span>
          <span>Dabiici (1.0x)</span>
          <span>Degdeg (1.3x)</span>
        </div>
      </div>

      {/* Optional: Upload ElevenLabs Audio File */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <FileAudio className="w-4 h-4 text-cyan-400" />
            <span>Soo Geli Codka Ubax (MP3/WAV) - Ikhtiyaari</span>
          </span>
          {project.audioUrl && (
            <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Cod Diyaar ah
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Haddii aad codka Ubax si gaar ah uga soo duubatay ElevenLabs, waxaad toos ugu dari kartaa halkan si loogu lifaaqo muuqaalkaaga.
        </p>

        <label className="cursor-pointer py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
          {uploadingAudio ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Soo gelinayaa codka...</span>
            </>
          ) : audioUploadSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Codka Si Guul Leh Ayaa Loo Soo Geliyay!</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{project.audioUrl ? 'Beddel Faylka Codka (MP3/WAV)' : 'Soo Geli Codka Ubax (MP3/WAV)'}</span>
            </>
          )}
          <input
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAudioUpload(file);
            }}
            className="hidden"
          />
        </label>

        {audioUploadError && (
          <span className="text-[10px] text-rose-400">{audioUploadError}</span>
        )}
      </div>
    </div>
  );
};
