import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Flame,
  Gamepad2,
  Play,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { MOCK_TESTS, SSC_SYLLABUS } from '../data/sscCurriculum';
import { SubjectId } from '../types/examverse';

const HERO_IMG = '/src/assets/images/hero_examverse_academy_1794828673071.jpg';
const AVATAR_IMG = '/src/assets/images/avatar_scholar_emblem_1794828673745.jpg';

interface HomeDashboardProps {
  onOpenLearnSection: (sub: 'videos' | 'syllabus' | 'pyqs' | 'practice' | 'mock-tests') => void;
  onStartDailyQuiz: () => void;
  onOpenPlanner: () => void;
  onOpenAnalytics: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenLearnSection,
  onStartDailyQuiz,
  onOpenPlanner,
  onOpenAnalytics,
}) => {
  const {
    language,
    profile,
    levelInfo,
    videos,
    testAttempts,
    leaderboard,
    studyPlan,
    announcements,
    setActiveTab,
  } = useApp();

  const t = UI_TEXT[language];
  const langMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const resumeVideo = videos.find((v) => !profile.completedLessons.includes(v.id)) || videos[0];
  const goalPct = Math.min(
    100,
    Math.round((profile.studyMinutesToday / Math.max(1, profile.dailyGoalMinutes)) * 100)
  );
  const tier1Topics = SSC_SYLLABUS.filter((s) => s.tier === 'Tier 1' || s.tier === 'Both');
  const tier1Done = tier1Topics.filter((s) => profile.completedSyllabusTopics.includes(s.id)).length;
  const tier1Pct = Math.round((tier1Done / Math.max(1, tier1Topics.length)) * 100);

  const tier2Topics = SSC_SYLLABUS.filter((s) => s.tier === 'Tier 2' || s.tier === 'Both');
  const tier2Done = tier2Topics.filter((s) => profile.completedSyllabusTopics.includes(s.id)).length;
  const tier2Pct = Math.round((tier2Done / Math.max(1, tier2Topics.length)) * 100);

  const latestMock = testAttempts[0];
  const subjects: SubjectId[] = ['quant', 'reasoning', 'english', 'ga', 'computer'];

  return (
    <div className="space-y-8">
      {/* Hero Mission Control Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#0A192F] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img
                src={AVATAR_IMG}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-violet-400/50"
              />
              <div>
                <div className="text-xs text-violet-300 font-medium">
                  {langMeta.greeting} · {levelInfo.current.name}
                </div>
                <div className="font-display text-lg font-bold text-white flex flex-wrap items-center gap-2">
                  <span>{profile.displayName}</span>
                  {profile.username && (
                    <span className="text-xs font-mono-num text-violet-300 font-medium">
                      @{profile.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-balance leading-tight">
              {profile.targetPost}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl">
              {t.welcomeSub}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {/* Level Progress */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>
                  Level: <strong className="text-white">{levelInfo.current.name}</strong>
                </span>
                <span className="font-mono-num">
                  {profile.xp} XP {levelInfo.next ? `/ ${levelInfo.next.minXp} XP` : '(Max Tier)'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${levelInfo.progressPct}%` }}
                />
              </div>
            </div>

            {/* Primary CTA + Secondary Shortcuts */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenLearnSection('videos')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {t.continueLearning}
              </button>
              <button
                type="button"
                onClick={onStartDailyQuiz}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-violet-400 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                {t.dailyQuiz}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('play')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-violet-400 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4 text-violet-300" />
                {t.quickPlay}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Architectural Side Card */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[240px]">
          <img
            src={HERO_IMG}
            alt="Examora Academy Hall"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081221]/90 via-[#081221]/40 to-transparent flex flex-col justify-end p-6 text-white">
            <div className="text-xs text-violet-300 font-medium">
              {t.resumeVideo}
            </div>
            <div className="font-display text-lg font-bold mt-1">
              {resumeVideo.title}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {SUBJECT_NAMES[resumeVideo.subject][language]} · {resumeVideo.playlist} · {resumeVideo.durationSec}s lesson
            </div>
            <button
              type="button"
              onClick={() => onOpenLearnSection('videos')}
              className="mt-4 self-start inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 cursor-pointer"
            >
              Watch lesson & take quiz <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Metric Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.currentXp}</div>
          <div className="font-mono-num text-2xl font-bold mt-1">{profile.xp.toLocaleString()} XP</div>
          <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 font-mono-num">
            {profile.coins} Coins · {profile.earnedBadges.length} Badges
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.streakDays}</div>
          <div className="font-mono-num text-2xl font-bold mt-1 flex items-center gap-2">
            <Flame className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            {profile.streak} Days
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {profile.dailyChallengeDoneDate === new Date().toISOString().slice(0, 10)
              ? 'Daily challenge completed'
              : 'Daily challenge ready'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.dailyGoal}</div>
          <div className="font-mono-num text-2xl font-bold mt-1">
            {profile.studyMinutesToday} / {profile.dailyGoalMinutes}m
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
            <div className="h-full bg-violet-600 dark:bg-violet-400" style={{ width: `${goalPct}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.latestMockScore}</div>
          <div className="font-mono-num text-2xl font-bold mt-1">
            {latestMock ? `${latestMock.score}/${latestMock.maxScore}` : 'Not attempted'}
          </div>
          <button
            type="button"
            onClick={() => onOpenLearnSection('mock-tests')}
            className="text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline mt-1 cursor-pointer"
          >
            {latestMock ? `${latestMock.accuracy}% accuracy · Retake` : 'Launch Tier 1 Mock Test'}
          </button>
        </div>
      </section>

      {/* Tier 1 / Tier 2 Progress & Subject Mastery */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t.subjectPerformance}</h2>
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
            >
              Full Analytics →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium">{t.tier1Progress}</span>
                <span className="font-mono-num font-semibold">{tier1Pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-[#0A192F] dark:bg-violet-500" style={{ width: `${tier1Pct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium">{t.tier2Progress}</span>
                <span className="font-mono-num font-semibold">{tier2Pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-violet-600" style={{ width: `${tier2Pct}%` }} />
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {subjects.map((sub) => {
              const st = profile.subjectStats[sub] || { attempted: 0, correct: 0 };
              const acc = st.attempted > 0 ? Math.round((st.correct / st.attempted) * 100) : 0;
              return (
                <div key={sub}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{SUBJECT_NAMES[sub][language]}</span>
                    <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      {st.correct}/{st.attempted} correct · {acc}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#0A192F] dark:bg-violet-400 transition-all"
                      style={{ width: `${Math.max(acc, st.attempted > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Plan + Leaderboard Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                {t.todaysPlan}
              </h2>
              <button
                type="button"
                onClick={onOpenPlanner}
                className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
              >
                {studyPlan ? 'Edit Plan' : 'Build AI Plan'}
              </button>
            </div>

            {studyPlan && studyPlan.blocks.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {studyPlan.blocks.slice(0, 3).map((b, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{b.topic}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {b.timeSlot} · {b.subject}
                      </div>
                    </div>
                    <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400 shrink-0">
                      {b.durationMinutes}m
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
                <p>No custom daily plan saved yet. Let Examora build your SSC CGL timetable based on your weak subjects.</p>
                <button
                  type="button"
                  onClick={onOpenPlanner}
                  className="px-4 py-2 rounded-lg bg-[#0A192F] dark:bg-violet-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Open Smart Study Planner
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                {t.leaderboardPreview}
              </h2>
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.slice(0, 4).map((entry, idx) => (
                <li
                  key={entry.uid}
                  className={`py-2.5 flex items-center justify-between text-sm ${
                    entry.isCurrentUser ? 'font-semibold text-violet-700 dark:text-violet-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-num text-xs w-5 text-slate-400">#{idx + 1}</span>
                    <span className="truncate">{entry.displayName}</span>
                  </div>
                  <span className="font-mono-num text-xs shrink-0">
                    {entry.xp.toLocaleString()} XP · {entry.streak}d
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Action Directory & Official Notices */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onOpenLearnSection('pyqs')}
          className="text-left bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 hover:border-violet-600 dark:hover:border-violet-400 rounded-xl p-5 transition-colors cursor-pointer"
        >
          <BookOpen className="w-5 h-5 text-violet-700 dark:text-violet-400 mb-3" />
          <div className="font-display font-bold text-base">2016–2025 PYQ Bank</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Original English papers with separate {langMeta.nativeName} explanations.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onOpenLearnSection('mock-tests')}
          className="text-left bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 hover:border-violet-600 dark:hover:border-violet-400 rounded-xl p-5 transition-colors cursor-pointer"
        >
          <Trophy className="w-5 h-5 text-violet-700 dark:text-violet-400 mb-3" />
          <div className="font-display font-bold text-base">{MOCK_TESTS.length} Official Mock Tests</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Timed CBT exam interface with question palette and negative marking.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tutor')}
          className="text-left bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 hover:border-violet-600 dark:hover:border-violet-400 rounded-xl p-5 transition-colors cursor-pointer"
        >
          <Bot className="w-5 h-5 text-violet-700 dark:text-violet-400 mb-3" />
          <div className="font-display font-bold text-base">{t.tutorTitle}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Step-by-step Maths, Reasoning & Grammar doubts in {langMeta.nativeName}.
          </p>
        </button>
      </section>

      {announcements.length > 0 && (
        <section className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <Bell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Academy Notices
          </div>
          <div className="font-display font-semibold text-sm">{announcements[0].title}</div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{announcements[0].body}</p>
        </section>
      )}
    </div>
  );
};
