import React from 'react';
import {
  BookOpen,
  Bot,
  Gamepad2,
  Home,
  User as UserIcon,
  Award,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UI_TEXT } from '../data/i18n';
import { MainTab } from '../types/examverse';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    language,
    profile,
    rewardToast,
    dismissToast,
  } = useApp();

  const t = UI_TEXT[language];

  const navItems: Array<{ id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'learn', label: t.navLearn, icon: BookOpen },
    { id: 'play', label: t.navPlay, icon: Gamepad2 },
    { id: 'tutor', label: t.navTutor, icon: Bot },
    { id: 'profile', label: t.navProfile, icon: UserIcon },
  ];

  const handleNav = (id: MainTab) => {
    setActiveTab(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#081221] text-[#0F172A] dark:text-[#F1F5F9]">
      {/* Desktop Top Bar + Compact Mobile Top Bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="font-display text-lg font-extrabold tracking-tight text-[#0A192F] dark:text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" />
            Examora
          </button>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleNav('tutor')}
              className="px-4 py-2 rounded-lg bg-[#0A192F] hover:bg-[#112240] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {t.aiTutorShortcut}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10">
        {children}
      </main>

      {/* Reward Toast */}
      {rewardToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 max-w-xs w-full bg-[#0A192F] text-white border border-violet-500/40 rounded-xl p-4 shadow-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-display text-sm font-semibold">{rewardToast.title}</div>
              <div className="text-xs font-mono-num text-violet-300 mt-0.5">
                +{rewardToast.xp} XP · +{rewardToast.coins} Coins
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Close reward notification"
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                active
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium leading-none truncate max-w-[68px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Quiet Desktop Footer */}
      <footer className="hidden lg:block border-t border-slate-200 dark:border-slate-800 py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <span>Examora — SSC CGL AI Academy · {profile.targetPost}</span>
          <span>English · മലയാളം · हिन्दी · தமிழ்</span>
        </div>
      </footer>
    </div>
  );
};
