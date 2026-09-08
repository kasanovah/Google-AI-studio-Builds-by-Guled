import React from 'react';
import { LayoutDashboard, PlusCircle, FolderGit2, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import { ActiveMobileTab } from '../../types';

interface MobileBottomNavProps {
  activeTab: ActiveMobileTab;
  setActiveTab: (tab: ActiveMobileTab) => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* Item 1: HOME */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all touch-target ${
            activeTab === 'dashboard'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
            Home
          </span>
        </button>

        {/* Item 2: CREATE */}
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-target ${
            activeTab === 'create'
              ? 'text-white font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-full mb-0.5 transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-105'
                : 'bg-slate-800/90 text-slate-300'
            }`}
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
            Create
          </span>
        </button>

        {/* Item 3: PROJECTS */}
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all touch-target ${
            activeTab === 'projects'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderGit2 className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
            Projects
          </span>
        </button>

        {/* Item 4: DRIVE */}
        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all touch-target ${
            activeTab === 'drive'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
            Drive
          </span>
        </button>

        {/* Item 5: SETTINGS */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all touch-target"
        >
          <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
};
