import React from 'react';
import { LayoutDashboard, PlusCircle, FolderGit2, Settings as SettingsIcon } from 'lucide-react';
import { ActiveMobileTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveMobileTab;
  setActiveTab: (tab: ActiveMobileTab) => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 pb-safe"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all touch-target ${
            activeTab === 'dashboard'
              ? 'text-cyan-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        {/* Create Reel (Emphasized Center Action) */}
        <button
          onClick={() => setActiveTab('create')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all touch-target ${
            activeTab === 'create'
              ? 'text-white font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-full mb-0.5 transition-colors ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'bg-slate-800 text-slate-300'
          }`}>
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Create Reel</span>
        </button>

        {/* Projects */}
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all touch-target ${
            activeTab === 'projects'
              ? 'text-cyan-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderGit2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Projects</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all touch-target"
        >
          <SettingsIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};
