import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Compass,
  Home,
  Library,
  RefreshCw,
  Target,
  User as UserIcon,
  Waves,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UI_TEXT } from '../data/i18n';
import { formatTime12h, getGoalPercent } from '../lib/localNotifications';
import { MainTab } from '../types/examverse';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    tutorOpen,
    openAiTutor,
    language,
    profile,
    rewardToast,
    dismissToast,
    notificationPrefs,
    localReminders,
    activeReminderBanner,
    dismissReminderBanner,
    markAllRemindersRead,
    triggerGoalReminder,
    publicDataError,
    retryPublicLoad,
  } = useApp();

  const [remindersOpen, setRemindersOpen] = useState(false);
  const t = UI_TEXT[language];

  const unreadCount = localReminders.filter((r) => !r.read).length;
  const goalPct = getGoalPercent(profile.studyMinutesToday, profile.dailyGoalMinutes);

  const bottomNavItems: Array<{
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'learn', label: t.navLearn, icon: BookOpen },
    { id: 'practice', label: t.navPractice, icon: Target },
    { id: 'analytics', label: t.navAnalytics, icon: BarChart3 },
    { id: 'profile', label: t.navProfile, icon: UserIcon },
  ];

  const desktopNavItems: Array<{
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'learn', label: t.navLearn, icon: BookOpen },
    { id: 'pyqs', label: t.navPyqs, icon: Library },
    { id: 'predictor', label: t.navPredictor, icon: Compass },
    { id: 'practice', label: t.navPractice, icon: Target },
    { id: 'analytics', label: t.navAnalytics, icon: BarChart3 },
    { id: 'profile', label: t.navProfile, icon: UserIcon },
  ];

  const handleNav = (id: MainTab) => {
    setRemindersOpen(false);
    setActiveTab(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3FAFA] dark:bg-[#062B3D] text-[#062B3D] dark:text-[#F3FAFA]">
      {/* Sticky Ocean Top Bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 ocean-glass">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="min-h-[44px] font-display text-lg font-extrabold tracking-tight text-[#062B3D] dark:text-[#F3FAFA] whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2.5"
          >
            <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#075985] to-[#20C7C9] shadow-sm inline-block" />
            <span>Examora</span>
          </button>

          {/* Desktop Navigation including Previous Year Questions */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
            {desktopNavItems.map((item) => {
              const active = !tutorOpen && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`min-h-[44px] text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'border-[#20C7C9] text-[#075985] dark:text-[#55D6D0]'
                      : 'border-transparent text-[#073B50]/80 dark:text-[#8DE1D3]/80 hover:text-[#062B3D] dark:hover:text-[#F3FAFA]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Study Reminders + 1-Tap AI Tutor CTA */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={() => {
                const next = !remindersOpen;
                setRemindersOpen(next);
                if (next && unreadCount > 0) {
                  markAllRemindersRead();
                }
              }}
              aria-label="Study goal reminders"
              aria-expanded={remindersOpen}
              className="relative min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/70 dark:bg-[#073B50]/80 text-[#075985] dark:text-[#55D6D0] hover:border-[#20C7C9] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8B78] text-[#062B3D] text-[10px] font-mono-num font-extrabold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setRemindersOpen(false);
                openAiTutor();
              }}
              className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tutorOpen
                  ? 'bg-[#20C7C9] text-[#062B3D] shadow-md'
                  : 'bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D]'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>{t.aiTutorShortcut}</span>
            </button>

            {remindersOpen && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-12 w-[calc(100vw-24px)] sm:w-88 max-w-sm rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-[#20C7C9]" />
                    <span className="font-display font-bold text-sm text-[#062B3D] dark:text-[#F3FAFA]">
                      Ocean Study Tide Reminders
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemindersOpen(false)}
                    aria-label="Close reminders panel"
                    className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[#075985] dark:text-[#8DE1D3] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Today’s Study Goal</span>
                    <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                      {profile.studyMinutesToday}/{profile.dailyGoalMinutes} min ({goalPct}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                    {notificationPrefs.dailyReminder
                      ? `Daily nudge scheduled at ${formatTime12h(notificationPrefs.reminderTime)}`
                      : 'Daily study reminders are currently paused'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerGoalReminder();
                      setRemindersOpen(false);
                    }}
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Send Gentle Nudge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('profile')}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Preferences
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                  {localReminders.length === 0 ? (
                    <p className="py-3 text-xs text-[#075985] dark:text-[#8DE1D3]">
                      No reminders logged yet today. Tap “Send Gentle Nudge” to preview your goal-based Ocean reminder.
                    </p>
                  ) : (
                    localReminders.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setRemindersOpen(false);
                          setActiveTab(item.ctaTab);
                        }}
                        className="w-full py-2.5 text-left space-y-1 hover:opacity-85 cursor-pointer"
                      >
                        <div className="text-xs font-bold text-[#062B3D] dark:text-[#F3FAFA]">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#073B50]/85 dark:text-[#8DE1D3] leading-relaxed">
                          {item.body}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 lg:py-6 pb-24 lg:pb-10">
        {/* 1-Tap Mobile Access Bar to PYQs & Future Exam Predictor (non-sticky to preserve mobile viewport) */}
        <div className="lg:hidden mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleNav('pyqs')}
            className={`min-h-[42px] px-3 py-2 rounded-2xl border flex items-center justify-center gap-2 text-xs font-extrabold cursor-pointer transition-colors ${
              !tutorOpen && activeTab === 'pyqs'
                ? 'bg-[#20C7C9] text-[#062B3D] border-[#20C7C9]'
                : 'bg-white/90 dark:bg-[#073B50]/90 border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-[#075985] dark:text-[#55D6D0]'
            }`}
          >
            <Library className="w-4 h-4 shrink-0" />
            <span className="truncate">PYQs (2016–2026)</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('predictor')}
            className={`min-h-[42px] px-3 py-2 rounded-2xl border flex items-center justify-center gap-2 text-xs font-extrabold cursor-pointer transition-colors ${
              !tutorOpen && activeTab === 'predictor'
                ? 'bg-[#20C7C9] text-[#062B3D] border-[#20C7C9]'
                : 'bg-white/90 dark:bg-[#073B50]/90 border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-[#075985] dark:text-[#55D6D0]'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.navPredictor}</span>
          </button>
        </div>

        {publicDataError && (
          <div className="mb-5 rounded-2xl border border-[#FF8B78]/45 bg-[#FF8B78]/12 dark:bg-[#073B50] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-medium text-[#062B3D] dark:text-[#F3FAFA]">
              <WifiOff className="w-4 h-4 text-[#FF8B78] shrink-0" />
              <span>{publicDataError}</span>
            </div>
            <button
              type="button"
              onClick={() => retryPublicLoad()}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Ocean Goal Reminder Banner */}
      {activeReminderBanner && (
        <div
          role="status"
          className={`fixed ${
            rewardToast ? 'bottom-40 lg:bottom-28' : 'bottom-20 lg:bottom-6'
          } left-4 right-4 sm:left-auto sm:right-6 z-40 sm:max-w-sm ocean-gradient-hero text-[#F3FAFA] border border-[#20C7C9]/60 rounded-2xl p-4 shadow-2xl space-y-3`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#20C7C9]/20 text-[#55D6D0] flex items-center justify-center shrink-0">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#55D6D0]">
                  Examora Study Tide
                </div>
                <div className="font-display text-sm font-bold text-white mt-0.5">
                  {activeReminderBanner.title}
                </div>
                <p className="text-xs text-[#F3FAFA]/90 mt-1 leading-relaxed">
                  {activeReminderBanner.body}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissReminderBanner}
              aria-label="Dismiss study reminder"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#8DE1D3] hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismissReminderBanner}
              className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8DE1D3] hover:text-white cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => {
                const target = activeReminderBanner.ctaTab;
                dismissReminderBanner();
                setActiveTab(target);
              }}
              className="min-h-[36px] px-4 py-1.5 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
            >
              {activeReminderBanner.ctaLabel}
            </button>
          </div>
        </div>
      )}

      {/* Ocean Reward Toast */}
      {rewardToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 max-w-xs w-full bg-[#073B50] text-[#F3FAFA] border border-[#20C7C9]/60 rounded-2xl p-4 shadow-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20C7C9]/20 text-[#55D6D0] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold">{rewardToast.title}</div>
              <div className="text-xs font-mono-num text-[#8DE1D3] mt-0.5">
                +{rewardToast.xp} Points · +{rewardToast.coins} Coins
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Close reward notification"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#8DE1D3] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation: Exact 5 Student Tabs (Home, Learn, Practice, Analytics, Profile) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 ocean-glass border-t border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 grid grid-cols-5 items-center"
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = !tutorOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                active
                  ? 'text-[#075985] dark:text-[#20C7C9] font-bold'
                  : 'text-[#073B50]/65 dark:text-[#8DE1D3]/65'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-none truncate max-w-[68px]">
                {item.label}
              </span>
              {active && <span className="w-4 h-0.5 rounded-full bg-[#20C7C9]" />}
            </button>
          );
        })}
      </nav>

      {/* Quiet Desktop Footer */}
      <footer className="hidden lg:block border-t border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 py-5 text-xs text-[#075985] dark:text-[#8DE1D3]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <span>
            Examora · Learn Smart. Play Hard. Rank Higher. · {profile.targetPost}
          </span>
          <span>English · മലയാളം · हिन्दी · தமிழ்</span>
        </div>
      </footer>
    </div>
  );
};
