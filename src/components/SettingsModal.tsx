import React, { useState } from 'react';
import { X, Settings, CheckCircle2, Volume2, Cpu } from 'lucide-react';
import { ReelProject } from '../types';
import { apiFetch } from '../services/apiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ReelProject;
  setProject: React.Dispatch<React.SetStateAction<ReelProject>>;
  backendOnline: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
}) => {
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);

  const runVisualDiagnostic = async () => {
    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const res = await apiFetch('/api/diagnose-visuals');
      const data = await res.json();
      // Errors come first: the actual failure text is the whole point of
      // running this, and burying it under a long model list pushes it off
      // screen on a phone exactly when it matters most.
      const lines: string[] = [data.verdict || 'No verdict returned.'];

      if (data.textGeneration) {
        lines.push('', `TEXT: ${data.textGeneration.ok ? 'OK' : 'FAILED'}`);
        if (data.textGeneration.error) lines.push(`  ${data.textGeneration.error}`);
      }

      for (const attempt of data.attempts || []) {
        lines.push('', `IMAGE ${attempt.ok ? 'OK' : 'FAILED'} — ${attempt.model}`);
        if (attempt.error) lines.push(`  ${attempt.error}`);
        if (attempt.blockReason) lines.push(`  blocked: ${attempt.blockReason}`);
        if (attempt.finishReason) lines.push(`  finishReason: ${attempt.finishReason}`);
      }

      if (data.openai) {
        if (!data.openai.configured) {
          lines.push('', 'OPENAI: not configured (no OPENAI_API_KEY set)');
        } else {
          lines.push('', `OPENAI ${data.openai.ok ? 'OK' : 'FAILED'} — ${data.openai.model}`);
          if (data.openai.error) lines.push(`  ${data.openai.error}`);
        }
      }

      if (data.pexels) {
        if (!data.pexels.configured) {
          lines.push('', 'PEXELS: not configured (no PEXELS_API_KEY set)');
        } else {
          lines.push('', `PEXELS ${data.pexels.ok ? 'OK' : 'FAILED'}${data.pexels.results ? ` — ${data.pexels.results} photos found` : ''}`);
          if (data.pexels.error) lines.push(`  ${data.pexels.error}`);
        }
      }

      if (data.modelListError) lines.push('', `Model list error: ${data.modelListError}`);
      if (Array.isArray(data.imageCapableModels)) {
        lines.push('', `Models available (${data.imageCapableModels.length}): ${data.imageCapableModels.join(', ') || 'none'}`);
      }
      setDiagnosis(lines.join('\n'));
    } catch (err: any) {
      setDiagnosis(`Diagnostic failed: ${err?.message || err}`);
    } finally {
      setDiagnosing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base text-white">
              Dejinta Reel Studio (Settings)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="touch-target p-1.5 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* Engine Status */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Xaaladda Mashiinka (Engine Status):
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                FFmpeg & H.264 Encoder
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Diyaar (Active)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                EBU R128 Normalization (-16 LUFS)
              </span>
              <span className="text-emerald-400 font-bold">Daaran (Active)</span>
            </div>
          </div>

          {/* Export Quality */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Tayada Muuqaalka (Export Resolution):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProject(prev => ({ ...prev, exportQuality: '1080p' }))}
                className={`touch-target p-3 rounded-xl border text-left transition-all ${
                  project.exportQuality === '1080p' || !project.exportQuality
                    ? 'bg-sky-950/40 border-sky-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-white">1080x1920 (Full HD)</div>
                <div className="text-[10px] text-sky-400 mt-0.5">Lagu talinayaa (Recommended)</div>
              </button>

              <button
                type="button"
                onClick={() => setProject(prev => ({ ...prev, exportQuality: '720p' }))}
                className={`touch-target p-3 rounded-xl border text-left transition-all ${
                  project.exportQuality === '720p'
                    ? 'bg-sky-950/40 border-sky-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-white">720x1280 (HD)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Xajmi yar (Faster export)</div>
              </button>
            </div>
          </div>

          {/* Brand Watermark Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">
                Sumadda Xeero AI (Top Branding)
              </div>
              <div className="text-[11px] text-slate-400">
                Ku muuji calaamadda XEERO AI dusha sare ee muuqaalka
              </div>
            </div>
            <input
              type="checkbox"
              checked={project.showWatermark}
              onChange={(e) => setProject(prev => ({ ...prev, showWatermark: e.target.checked }))}
              className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          {/* AI image self-check: when scenes come out as the offline
              placeholder graphic instead of real cinematic visuals, this
              reports the actual cause (missing key, quota, safety block,
              no image-capable model) rather than leaving it a mystery. */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <div>
              <div className="text-xs font-bold text-white">Hubi Sawirada AI (Check AI visuals)</div>
              <div className="text-[11px] text-slate-400">
                Tijaabi in sawirada Gemini si sax ah u shaqeynayaan
              </div>
            </div>
            <button
              type="button"
              onClick={runVisualDiagnostic}
              disabled={diagnosing}
              className="touch-target w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>{diagnosing ? 'Waa la hubinayaa...' : 'Bilow Hubinta'}</span>
            </button>
            {diagnosis && (
              <pre className="text-[10px] leading-relaxed text-slate-300 bg-black/50 border border-slate-800 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-words max-h-56">
                {diagnosis}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
          >
            Waayahay (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
