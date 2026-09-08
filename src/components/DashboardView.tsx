import React from 'react';
import { PlusCircle, Sparkles, Video, Film, TrendingUp, Compass, Play } from 'lucide-react';
import { CURATED_SOMALI_TOPICS } from '../data/defaultProject';

interface DashboardViewProps {
  onStartCreate: (topic?: string) => void;
  onSelectSavedReel: (filename: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartCreate,
  onSelectSavedReel,
}) => {
  const stats = [
    { label: 'Reels Diyaar Ah', value: '4', icon: Film, color: 'text-sky-400' },
    { label: 'Standard Resolution', value: '1080x1920', icon: Video, color: 'text-cyan-400' },
    { label: 'Aspect Ratio', value: '9:16 Vertical', icon: TrendingUp, color: 'text-emerald-400' },
  ];

  const recentReels = [
    {
      title: 'Mustaqbalka AI 20s',
      duration: '20s',
      filename: 'XEERO_AI_REEL_MUSTAQBALKA_AI_20S.mp4',
      size: '23.7 MB',
      thumb: '/images/somali_tech_hub.jpg',
    },
    {
      title: 'Baro AI Af-Soomaali',
      duration: '20s',
      filename: 'XEERO_AI_REEL_BARO_AI_20S.mp4',
      size: '19.4 MB',
      thumb: '/images/somali_ai_student.jpg',
    },
    {
      title: '300 Milyan oo Afrikaan ah',
      duration: '15s',
      filename: 'XEERO_AI_REEL_300_MILYAN_AFRIKA.mp4',
      size: '2.5 MB',
      thumb: '/images/african_fiber_cables.jpg',
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Hero Welcome Card for Mobile & Desktop */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-950 border border-sky-900/40 p-5 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Xeero AI Mobile Reel Studio</span>
          </div>

          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              U Samee Muuqaallo 9:16 AI ah oo Af-Soomaali ah
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Ku abuuro Reels xirfad leh oo leh cod AI Soomaali ah, captions toos ah, iyo muuqaallo casri ah adigoo isticmaalaya talefankaaga gacanta.
            </p>
          </div>

          <button
            onClick={() => onStartCreate()}
            className="touch-target px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Bilow Reel Cusub (Create Reel)</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                  {s.label}
                </span>
                <Icon className={`w-4 h-4 ${s.color} shrink-0 hidden xs:block`} />
              </div>
              <div className="text-xs sm:text-lg font-extrabold text-white truncate">
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Reels Showcase */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            Reels-kii Ugu Dambeeyay (Recent Reels)
          </h2>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
          {recentReels.map((reel, idx) => (
            <div
              key={idx}
              onClick={() => onSelectSavedReel(reel.filename)}
              className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 p-2.5 transition-all touch-target flex flex-col justify-between"
            >
              <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 mb-2">
                <img
                  src={reel.thumb}
                  alt={reel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <div className="w-10 h-10 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-cyan-300">
                  {reel.duration}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white truncate">{reel.title}</h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                  <span>1080x1920</span>
                  <span>{reel.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Topics for Quick Creation */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Compass className="w-4 h-4 text-sky-400" />
          Fikrado Diyaar Ah (Quick Templates)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CURATED_SOMALI_TOPICS.map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onStartCreate(topic.title)}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/40 text-left transition-all touch-target flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {topic.category}
                </span>
                <h3 className="font-bold text-xs sm:text-sm text-white mt-1.5">
                  {topic.title}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {topic.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
