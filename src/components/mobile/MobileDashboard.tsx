import React, { useEffect, useState } from 'react';
import { PlusCircle, Film, Play, Sparkles, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { CURATED_SOMALI_TOPICS } from '../../data/defaultProject';
import { ExportedReel, formatReelTitle, formatFileSize, formatReelDateSomali } from '../../utils/reelFormat';

interface MobileDashboardProps {
  onStartCreate: (topic?: string) => void;
  onSelectSavedReel: (filename: string) => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  onStartCreate,
  onSelectSavedReel,
}) => {
  const [reels, setReels] = useState<ExportedReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/list-reels')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setReels(data.reels || []);
        }
      })
      .catch((err) => console.error('Failed to load recent reels:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentReels = reels.slice(0, 3).map((reel) => ({
    title: formatReelTitle(reel.filename),
    filename: reel.filename,
    size: formatFileSize(reel.sizeBytes),
    created: formatReelDateSomali(reel.createdAtMs),
    status: 'Ready (Diyaar)',
  }));

  return (
    <div className="flex flex-col gap-5 w-full pb-6">
      {/* 1. Top Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-semibold w-fit">
            <Sparkles className="w-3 h-3" />
            <span>Somali AI Video Creator</span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight uppercase">
              XEERO AI <span className="text-cyan-400 block">REEL STUDIO</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Ku dhis muuqaallo 9:16 ah oo xirfad leh adigoo isticmaalaya cod AI Soomaali ah iyo qoraallo toos ah.
            </p>
          </div>

          {/* Prominent Primary Button: + CREATE REEL */}
          <button
            type="button"
            onClick={() => onStartCreate()}
            className="w-full touch-target py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-sky-500/30 active:scale-[0.98] transition-transform mt-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ CREATE REEL</span>
          </button>
        </div>
      </div>

      {/* 2. RECENT REELS Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            <span>RECENT REELS</span>
          </h2>
          {!isLoading && (
            <span className="text-[11px] text-slate-400 font-medium">
              {reels.length} Reel{reels.length === 1 ? '' : 's'} Diyaar Ah
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Soo raraya reels-kaaga...</span>
          </div>
        ) : recentReels.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 text-center text-xs text-slate-400">
            Weli ma jiraan reels la sameeyay. Riix "+ CREATE REEL" si aad u bilowdo.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentReels.map((reel, idx) => (
              <div
                key={idx}
                onClick={() => onSelectSavedReel(reel.filename)}
                className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800/90 active:border-sky-500/60 p-2.5 transition-all touch-target flex items-center gap-3.5"
              >
                {/* Thumbnail placeholder 9:16 Compact */}
                <div className="relative w-16 h-24 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 flex items-center justify-center">
                  <Film className="w-5 h-5 text-slate-700" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-md">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Reel Information */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {reel.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" />
                        {reel.created}
                      </span>
                      <span>•</span>
                      <span>{reel.size}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{reel.status}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Quick Topics Inspiration */}
      <div className="flex flex-col gap-2.5 pt-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Fikrado Degdeg Ah (Quick Topics)
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {CURATED_SOMALI_TOPICS.slice(0, 3).map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onStartCreate(topic.title)}
              className="touch-target p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-left active:bg-slate-800 active:border-sky-500/40 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-400">{topic.category}</span>
                <p className="text-xs font-bold text-white truncate mt-0.5">{topic.title}</p>
              </div>
              <span className="text-xs text-slate-500 font-bold shrink-0">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
      status: 'Ready (Diyaar)',
    },
  ];

  return (
    <div className="flex flex-col gap-5 w-full pb-6">
      {/* 1. Top Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-semibold w-fit">
            <Sparkles className="w-3 h-3" />
            <span>Somali AI Video Creator</span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight uppercase">
              XEERO AI <span className="text-cyan-400 block">REEL STUDIO</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Ku dhis muuqaallo 9:16 ah oo xirfad leh adigoo isticmaalaya cod AI Soomaali ah iyo qoraallo toos ah.
            </p>
          </div>

          {/* Prominent Primary Button: + CREATE REEL */}
          <button
            type="button"
            onClick={() => onStartCreate()}
            className="w-full touch-target py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-sky-500/30 active:scale-[0.98] transition-transform mt-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ CREATE REEL</span>
          </button>
        </div>
      </div>

      {/* 2. RECENT REELS Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            <span>RECENT REELS</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">3 Reels Diyaar Ah</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {recentReels.map((reel, idx) => (
            <div
              key={idx}
              onClick={() => onSelectSavedReel(reel.filename)}
              className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800/90 active:border-sky-500/60 p-2.5 transition-all touch-target flex items-center gap-3.5"
            >
              {/* Thumbnail 9:16 Compact */}
              <div className="relative w-16 h-24 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                <img
                  src={reel.thumb}
                  alt={reel.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-md">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Reel Information */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {reel.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      {reel.duration}
                    </span>
                    <span>•</span>
                    <span>1080x1920</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{reel.status}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quick Topics Inspiration */}
      <div className="flex flex-col gap-2.5 pt-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Fikrado Degdeg Ah (Quick Topics)
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {CURATED_SOMALI_TOPICS.slice(0, 3).map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onStartCreate(topic.title)}
              className="touch-target p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-left active:bg-slate-800 active:border-sky-500/40 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-sky-400">{topic.category}</span>
                <p className="text-xs font-bold text-white truncate mt-0.5">{topic.title}</p>
              </div>
              <span className="text-xs text-slate-500 font-bold shrink-0">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
