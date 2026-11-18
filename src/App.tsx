import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { OnboardingFlow, SplashOverlay } from './components/SplashAndOnboarding';
import { AppShell } from './components/AppShell';
import { HomeDashboard } from './components/HomeDashboard';
import { LearnCenter } from './components/LearnCenter';
import { PracticeCenter } from './components/PracticeCenter';
import { AiTutorView } from './components/AiTutorView';
import { ProfileAndSettings } from './components/ProfileAndSettings';
import { StudyPlannerView } from './components/StudyPlannerView';
import { AnalyticsAndAchievements } from './components/AnalyticsAndAchievements';
import { AdminPanel } from './components/AdminPanel';
import { PyqLibrary } from './components/PyqLibrary';
import { FutureExamPredictor } from './components/FutureExamPredictor';
import { GameModeId, LearnSubView, PracticeSubView } from './types/examverse';
import { LogOut, ShieldAlert } from 'lucide-react';

const MainWorkspace: React.FC = () => {
  const {
    authLoading,
    firebaseUser,
    onboarded,
    activeTab,
    setActiveTab,
    tutorOpen,
    closeAiTutor,
    isVerifiedCloudAdmin,
    profile,
    signOut,
  } = useApp();

  const [learnSubView, setLearnSubView] = useState<LearnSubView>('videos');
  const [practiceSubView, setPracticeSubView] = useState<PracticeSubView>('drills');
  const [gameInitialMode, setGameInitialMode] = useState<GameModeId | null>(null);
  const [homeSubPage, setHomeSubPage] = useState<'dashboard' | 'planner'>('dashboard');

  if (authLoading) {
    return (
      <div className="min-h-screen ocean-gradient-hero text-[#F3FAFA] flex flex-col items-center justify-center px-6">
        <div className="w-11 h-11 rounded-full border-2 border-[#20C7C9] border-t-transparent animate-spin mb-4" />
        <div className="font-display text-xl font-extrabold tracking-tight">Examora</div>
        <div className="text-xs text-[#8DE1D3] mt-1">Learn Smart. Play Hard. Rank Higher.</div>
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
      <div className="min-h-screen bg-[#F3FAFA] dark:bg-[#062B3D] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 rounded-3xl p-8 text-center space-y-4 ocean-shadow">
          <div className="w-12 h-12 rounded-2xl bg-[#FF8B78]/15 text-[#FF8B78] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-extrabold text-[#062B3D] dark:text-[#F3FAFA]">
            Account Deactivated
          </h1>
          <p className="text-sm text-[#073B50] dark:text-[#8DE1D3]">
            Your student account ({profile.username ? `@${profile.username}` : profile.email}) is currently inactive. Contact your academy administrator to restore access.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] text-white text-xs font-bold cursor-pointer"
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

  const handleOpenPracticeSection = (sub: PracticeSubView) => {
    setPracticeSubView(sub);
    setActiveTab('practice');
  };

  const handleStartDailyQuiz = () => {
    setGameInitialMode('daily-challenge');
    setPracticeSubView('games');
    setActiveTab('practice');
  };

  const renderContent = () => {
    if (tutorOpen) {
      return (
        <AiTutorView
          onBack={closeAiTutor}
          onHome={() => {
            closeAiTutor();
            setHomeSubPage('dashboard');
            setActiveTab('home');
          }}
        />
      );
    }

    if (activeTab === 'home') {
      if (homeSubPage === 'planner') {
        return <StudyPlannerView onBack={() => setHomeSubPage('dashboard')} />;
      }
      return (
        <HomeDashboard
          onOpenLearnSection={handleOpenLearnSection}
          onOpenPracticeSection={handleOpenPracticeSection}
          onStartDailyQuiz={handleStartDailyQuiz}
          onOpenPlanner={() => setHomeSubPage('planner')}
        />
      );
    }

    if (activeTab === 'learn') {
      return <LearnCenter subView={learnSubView} setSubView={setLearnSubView} />;
    }

    if (activeTab === 'pyqs') {
      return <PyqLibrary onBackHome={() => setActiveTab('home')} />;
    }

    if (activeTab === 'predictor') {
      return (
        <FutureExamPredictor
          onBackHome={() => setActiveTab('home')}
          onOpenPyqs={() => setActiveTab('pyqs')}
        />
      );
    }

    if (activeTab === 'practice') {
      return (
        <PracticeCenter
          subView={practiceSubView}
          setSubView={setPracticeSubView}
          gameInitialMode={gameInitialMode}
        />
      );
    }

    if (activeTab === 'analytics') {
      return <AnalyticsAndAchievements onBack={() => setActiveTab('home')} />;
    }

    return (
      <ProfileAndSettings
        onOpenAnalytics={() => setActiveTab('analytics')}
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
