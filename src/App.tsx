import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { OnboardingFlow, SplashOverlay } from './components/SplashAndOnboarding';
import { AppShell } from './components/AppShell';
import { HomeDashboard } from './components/HomeDashboard';
import { LearnCenter } from './components/LearnCenter';
import { GameCenter } from './components/GameCenter';
import { AiTutorView } from './components/AiTutorView';
import { ProfileAndSettings } from './components/ProfileAndSettings';
import { StudyPlannerView } from './components/StudyPlannerView';
import { AnalyticsAndAchievements } from './components/AnalyticsAndAchievements';
import { AdminPanel } from './components/AdminPanel';
import { GameModeId, LearnSubView } from './types/examverse';
import { LogOut, ShieldAlert } from 'lucide-react';

const MainWorkspace: React.FC = () => {
  const {
    authLoading,
    firebaseUser,
    onboarded,
    activeTab,
    setActiveTab,
    isVerifiedCloudAdmin,
    profile,
    signOut,
  } = useApp();

  const [learnSubView, setLearnSubView] = useState<LearnSubView>('videos');
  const [gameInitialMode, setGameInitialMode] = useState<GameModeId | null>(null);
  const [homeSubPage, setHomeSubPage] = useState<'dashboard' | 'planner' | 'analytics'>('dashboard');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A192F] text-white flex flex-col items-center justify-center px-6">
        <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mb-4" />
        <div className="font-display text-lg font-bold">Examora</div>
        <div className="text-xs text-slate-300 mt-1">Preparing your workspace...</div>
      </div>
    );
  }

  // Strictly isolated Admin Dashboard for server-verified administrators only
  if (isVerifiedCloudAdmin) {
    return <AdminPanel onSignOut={signOut} />;
  }

  // Deactivated student account check
  if (firebaseUser && profile.isActive === false) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#081221] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-[#0A192F] dark:text-white">
            Account Deactivated
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your student account ({profile.username ? `@${profile.username}` : profile.email}) is currently inactive. Contact your academy administrator to restore access.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] text-white text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !onboarded) {
    return (
      <>
        <SplashOverlay />
        <OnboardingFlow />
      </>
    );
  }

  const handleOpenLearnSection = (sub: LearnSubView) => {
    setLearnSubView(sub);
    setActiveTab('learn');
  };

  const handleStartDailyQuiz = () => {
    setGameInitialMode('daily-challenge');
    setActiveTab('play');
  };

  const renderContent = () => {
    if (activeTab === 'home') {
      if (homeSubPage === 'planner') {
        return <StudyPlannerView onBack={() => setHomeSubPage('dashboard')} />;
      }
      if (homeSubPage === 'analytics') {
        return <AnalyticsAndAchievements onBack={() => setHomeSubPage('dashboard')} />;
      }
      return (
        <HomeDashboard
          onOpenLearnSection={handleOpenLearnSection}
          onStartDailyQuiz={handleStartDailyQuiz}
          onOpenPlanner={() => setHomeSubPage('planner')}
          onOpenAnalytics={() => setHomeSubPage('analytics')}
        />
      );
    }

    if (activeTab === 'learn') {
      return <LearnCenter subView={learnSubView} setSubView={setLearnSubView} />;
    }

    if (activeTab === 'play') {
      return <GameCenter initialMode={gameInitialMode} />;
    }

    if (activeTab === 'tutor') {
      return <AiTutorView />;
    }

    return (
      <ProfileAndSettings
        onOpenAnalytics={() => {
          setHomeSubPage('analytics');
          setActiveTab('home');
        }}
        onOpenPlanner={() => {
          setHomeSubPage('planner');
          setActiveTab('home');
        }}
      />
    );
  };

  return (
    <>
      <SplashOverlay />
      <AppShell>{renderContent()}</AppShell>
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainWorkspace />
    </AppProvider>
  );
}
