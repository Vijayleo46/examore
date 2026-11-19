import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Compass,
  Flame,
  Play,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { COMPLETE_SSC_SYLLABUS } from '../data/sscMasterTeacher';
import { formatTime12h } from '../lib/localNotifications';
import { LearnSubView, PracticeSubView, SubjectId, VideoLesson } from '../types/examverse';
import { VideoPlayerModal } from './VideoPlayerModal';
import {
  FirstTimeTip,
  OceanGlassCard,
  OceanProgressRing,
  OceanWaveBackdrop,
  formatLessonDuration,
} from './OceanTheme';

const HERO_IMG = '/src/assets/images/hero_examverse_academy_1794828673071.jpg';
const AVATAR_IMG = '/src/assets/images/avatar_scholar_emblem_1794828673745.jpg';

interface HomeDashboardProps {
  onOpenLearnSection: (sub: LearnSubView) => void;
  onOpenPracticeSection: (sub: PracticeSubView) => void;
  onStartDailyQuiz: () => void;
  onOpenPlanner: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenLearnSection,
  onOpenPracticeSection,
  onStartDailyQuiz,
  onOpenPlanner,
}) => {
  const {
    language,
    profile,
    levelInfo,
    videos,
    mockTests,
    testAttempts,
    leaderboard,
    studyPlan,
    announcements,
    notificationPrefs,
    setActiveTab,
    openAiTutor,
    openAiTeacherWithContext,
    revisionDueTopics,
  } = useApp();

  const t = UI_TEXT[language];
  const langMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const [resumeVideo, setResumeVideo] = React.useState<VideoLesson | null>(null);

  // Recently studied / resume lesson
  const lastStartedLesson = useMemo(() => {
    if (profile.lastLessonId) {
      const found = videos.find((v) => v.id === profile.lastLessonId);
      if (found) return found;
    }
    const inProgress = videos.find((v) => {
      const prog = profile.videoProgress[v.id];
      return prog && prog.lastSec > 0 && !prog.completed;
    });
    return inProgress || videos.find((v) => !profile.completedLessons.includes(v.id)) || videos[0];
  }, [videos, profile.lastLessonId, profile.videoProgress, profile.completedLessons]);

  const recentLessons = useMemo(() => {
    const studiedIds = Object.keys(profile.videoProgress || {});
    const list = videos.filter((v) => studiedIds.includes(v.id) || profile.completedLessons.includes(v.id));
    if (list.length > 0) return list.slice(0, 3);
    return videos.slice(0, 3);
  }, [videos, profile.videoProgress, profile.completedLessons]);

  const upcomingMock = useMemo(() => {
    const takenIds = new Set(testAttempts.map((a) => a.testId));
    return mockTests.find((m) => m.isPublished !== false && !takenIds.has(m.id)) || mockTests[0];
  }, [mockTests, testAttempts]);

  const goalPct = Math.min(
    100,
    Math.round((profile.studyMinutesToday / Math.max(1, profile.dailyGoalMinutes)) * 100)
  );

  // Recommended topics based on weak/revision-due topics first, then lowest subject accuracy
  const recommendedTopics = useMemo(() => {
    const revMatches = revisionDueTopics
      .map((r) => COMPLETE_SSC_SYLLABUS.find((s) => s.id === r.topicId))
      .filter((x): x is (typeof COMPLETE_SSC_SYLLABUS)[number] => Boolean(x));

    const subjects: SubjectId[] = ['quant', 'reasoning', 'english', 'ga', 'computer'];
    const sorted = [...subjects].sort((a, b) => {
      const sa = profile.subjectStats[a];
      const sb = profile.subjectStats[b];
      const accA = sa && sa.attempted > 0 ? sa.correct / sa.attempted : 0.5;
      const accB = sb && sb.attempted > 0 ? sb.correct / sb.attempted : 0.5;
      return accA - accB;
    });
    const weakSub = sorted[0];
    const pending = COMPLETE_SSC_SYLLABUS.filter(
      (topic) => !topic.isJsoOnly && !profile.completedSyllabusTopics.includes(topic.id)
    );
    const weakMatches = pending.filter((tItem) => tItem.subject === weakSub);
    const combined = [...revMatches, ...(weakMatches.length > 0 ? weakMatches : pending)];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 3);
  }, [profile.subjectStats, profile.completedSyllabusTopics, revisionDueTopics]);

  const greetingHandle = profile.username ? `@${profile.username}` : profile.displayName;
  const encouragingMessage =
    goalPct >= 100
      ? 'Daily goal reached! Great consistency today.'
      : goalPct >= 50
      ? 'Over halfway to your daily goal — keep going!'
      : 'A calm 15-minute session builds lasting exam confidence.';

  return (
    <div className="space-y-6">
      <FirstTimeTip
        storageKey="home_welcome_v1"
        title="Welcome to Examora — Your Simple SSC CGL Home"
        body="Tap Continue Learning to watch your next lesson, or tap Quick Practice for bite-sized questions. Everything you need is 1 tap away at the bottom."
      />

      {/* Ocean Hero Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 relative overflow-hidden ocean-gradient-hero text-[#F3FAFA] rounded-3xl p-6 sm:p-8 flex flex-col justify-between ocean-shadow border border-[#20C7C9]/25">
          <OceanWaveBackdrop />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <img
                src={AVATAR_IMG}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-13 h-13 rounded-2xl object-cover border-2 border-[#20C7C9]"
              />
              <div>
                <div className="text-xs font-semibold text-[#55D6D0]">
                  {langMeta.greeting} · {levelInfo.current.name}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
                  Hi, {greetingHandle}
                </h1>
                <p className="text-xs text-[#8DE1D3] mt-0.5">
                  Goal: {profile.targetPost}
                </p>
              </div>
            </div>

            {/* Animated Daily Progress Ring */}
            <div className="bg-white/10 backdrop-blur-md border border-[#8DE1D3]/25 rounded-2xl px-4 py-3">
              <OceanProgressRing
                percent={goalPct}
                size={68}
                strokeWidth={6}
                label={t.dailyGoal}
                sublabel={`${profile.studyMinutesToday}/${profile.dailyGoalMinutes} mins`}
                darkSurface
              />
            </div>
          </div>

          <div className="relative z-10 mt-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-[#F3FAFA]/90 font-medium">{encouragingMessage}</p>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="inline-flex items-center gap-1.5 text-xs text-[#8DE1D3] hover:text-white transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#55D6D0]" />
                <span>
                  {notificationPrefs.dailyReminder
                    ? `Gentle Study Tide reminder at ${formatTime12h(
                        notificationPrefs.reminderTime
                      )} · Adjust goal`
                    : 'Study Tide reminders paused · Enable in Profile'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (lastStartedLesson) {
                    setResumeVideo(lastStartedLesson);
                  } else {
                    onOpenLearnSection('videos');
                  }
                }}
                className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] font-extrabold text-sm transition-colors shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {t.continueLearning}
              </button>
              <button
                type="button"
                onClick={() => onOpenPracticeSection('drills')}
                className="min-h-[48px] inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-[#8DE1D3]/40 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#55D6D0]" />
                {t.quickPractice}
              </button>
              <button
                type="button"
                onClick={onStartDailyQuiz}
                className="min-h-[48px] inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#FF8B78]/60 bg-[#FF8B78]/15 hover:bg-[#FF8B78]/25 text-[#F3FAFA] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#FF8B78]" />
                {t.dailyQuiz}
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Mock Test Card */}
        <div className="lg:col-span-4 relative rounded-3xl overflow-hidden border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 min-h-[240px] flex flex-col justify-between bg-[#073B50] text-[#F3FAFA] ocean-shadow">
          <img
            src={HERO_IMG}
            alt="Examora Mock Arena"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="relative z-10 p-6 flex flex-col justify-between h-full bg-gradient-to-t from-[#062B3D] via-[#062B3D]/75 to-transparent">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55D6D0]">
                <Trophy className="w-4 h-4" />
                Upcoming Mock Test
              </span>
              <span className="font-mono-num text-xs font-semibold text-[#8DE1D3]">
                {upcomingMock?.durationMinutes ?? 15} mins
              </span>
            </div>

            <div className="mt-4">
              <h2 className="font-display text-lg font-extrabold leading-snug text-white">
                {upcomingMock?.title || 'SSC CGL Tier 1 Full Mock'}
              </h2>
              <p className="text-xs text-[#8DE1D3] mt-1.5 line-clamp-2">
                {upcomingMock?.description || 'Simulated exam with calm step-by-step review.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenLearnSection('mock-tests')}
              className="mt-5 min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold transition-colors cursor-pointer"
            >
              Open Mock Tests <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Ocean Quest + Future Exam Predictor Quick Launchers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/95 dark:bg-[#073B50]/90 border border-[#20C7C9]/40 p-4 sm:p-5 ocean-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/src/assets/images/ocean_quest_submarine_1794998665527.jpg"
              alt="Ocean Quest Submarine"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-[#20C7C9] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#075985] dark:text-[#55D6D0]">
                Ocean Quest · Interactive SSC CGL Game
              </div>
              <div className="font-display font-extrabold text-sm sm:text-base truncate">
                Explore 9 Underwater Zones &amp; Collect Sea Crystals
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenPracticeSection('games')}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#075985] hover:bg-[#062B3D] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer shrink-0"
          >
            Play Ocean Quest
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-white/95 dark:bg-[#073B50]/90 border border-[#20C7C9]/40 p-4 sm:p-5 ocean-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#20C7C9]/15 border-2 border-[#20C7C9]/50 text-[#075985] dark:text-[#55D6D0] flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#075985] dark:text-[#55D6D0]">
                Future Exam Predictor · 2026 / 2027 / 2028
              </div>
              <div className="font-display font-extrabold text-sm sm:text-base truncate">
                2016–2026 Trend Analysis, Topic Confidence &amp; Predicted Mocks
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('predictor')}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer shrink-0"
          >
            Open Predictor
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Clean 3-Stat Overview Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <OceanGlassCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              {t.streakDays}
            </div>
            <div className="font-mono-num text-2xl font-extrabold mt-1">
              {profile.streak} Days
            </div>
            <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5">
              {profile.dailyChallengeDoneDate === new Date().toISOString().slice(0, 10)
                ? 'Today’s challenge completed'
                : 'Daily challenge ready'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF8B78]/15 text-[#FF8B78] flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              {t.currentXp}
            </div>
            <div className="font-mono-num text-2xl font-extrabold mt-1">
              {profile.xp.toLocaleString()} pts
            </div>
            <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5">
              {profile.completedLessons.length} lessons · {testAttempts.length} mocks done
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0] flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Overall Accuracy
            </div>
            <div className="font-mono-num text-2xl font-extrabold mt-1">
              {profile.questionsAttempted > 0
                ? Math.round((profile.questionsCorrect / profile.questionsAttempted) * 100)
                : 0}
              %
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="text-[11px] font-bold text-[#075985] dark:text-[#55D6D0] hover:underline mt-0.5 cursor-pointer"
            >
              View full analytics →
            </button>
          </div>
          <OceanProgressRing
            percent={
              profile.questionsAttempted > 0
                ? Math.round((profile.questionsCorrect / profile.questionsAttempted) * 100)
                : 0
            }
            size={56}
            strokeWidth={5}
          />
        </OceanGlassCard>
      </section>

      {/* Recently Studied Lessons + Recommended Topics */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <OceanGlassCard className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#20C7C9]" />
              Recently Studied Lessons
            </h2>
            <button
              type="button"
              onClick={() => onOpenLearnSection('videos')}
              className="min-h-[36px] text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
            >
              All Lessons →
            </button>
          </div>

          {lastStartedLesson && (
            <div className="p-4 rounded-2xl bg-[#20C7C9]/10 dark:bg-[#062B3D]/70 border border-[#20C7C9]/35 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#075985] dark:text-[#55D6D0]">
                  {t.resumeVideo}
                </div>
                <div className="font-display font-bold text-sm truncate mt-0.5">
                  {lastStartedLesson.title}
                </div>
                <div className="text-xs text-[#073B50]/75 dark:text-[#8DE1D3] mt-0.5">
                  {SUBJECT_NAMES[lastStartedLesson.subject][language]} ·{' '}
                  {formatLessonDuration(lastStartedLesson.durationSec)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResumeVideo(lastStartedLesson)}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            </div>
          )}

          <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
            {recentLessons.map((vid) => {
              const done = profile.completedLessons.includes(vid.id);
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setResumeVideo(vid)}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left hover:opacity-85 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{vid.title}</div>
                    <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                      {SUBJECT_NAMES[vid.subject][language]} · {vid.topic} ·{' '}
                      {formatLessonDuration(vid.durationSec)}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      done
                        ? 'bg-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0]'
                        : 'bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]'
                    }`}
                  >
                    {done ? 'Completed' : 'In Progress'}
                  </span>
                </button>
              );
            })}
          </div>
        </OceanGlassCard>

        {/* Recommended Topics & Today's Plan */}
        <div className="lg:col-span-5 space-y-5">
          <OceanGlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#20C7C9]" />
                Recommended Topics
              </h2>
              <button
                type="button"
                onClick={() => onOpenLearnSection('syllabus')}
                className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
              >
                Syllabus →
              </button>
            </div>
            <div className="space-y-2.5">
              {recommendedTopics.map((topic) => {
                const needsRev = revisionDueTopics.some((r) => r.topicId === topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() =>
                      openAiTeacherWithContext({
                        subject: topic.subject,
                        topic: topic.title,
                        topicId: topic.id,
                        mode: needsRev ? 'revision' : 'teach',
                        autoStart: true,
                      })
                    }
                    className="w-full min-h-[52px] text-left p-3.5 rounded-2xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 hover:border-[#20C7C9] transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{topic.title}</div>
                      <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                        {SUBJECT_NAMES[topic.subject][language]} · {topic.tier}
                        {needsRev ? ' · Revision Due' : ''}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#20C7C9] shrink-0">
                      {needsRev ? 'Revise →' : 'Teach Me →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </OceanGlassCard>

          <OceanGlassCard className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#20C7C9]" />
                {t.todaysPlan}
              </h2>
              <button
                type="button"
                onClick={onOpenPlanner}
                className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
              >
                {studyPlan ? 'Edit Plan' : 'Build Plan'}
              </button>
            </div>

            {studyPlan && studyPlan.blocks.length > 0 ? (
              <ul className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                {studyPlan.blocks.slice(0, 2).map((b, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{b.topic}</div>
                      <div className="text-[#075985] dark:text-[#8DE1D3]">
                        {b.timeSlot} · {b.subject}
                      </div>
                    </div>
                    <span className="font-mono-num font-bold shrink-0">{b.durationMinutes}m</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3]">
                Create a calm daily timetable tailored to your available study hours.
              </p>
            )}
          </OceanGlassCard>
        </div>
      </section>

      {/* Quick Help + Top Scholars + Notices */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={openAiTutor}
          className="text-left bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 hover:border-[#20C7C9] rounded-2xl p-5 ocean-shadow transition-all cursor-pointer"
        >
          <Bot className="w-5 h-5 text-[#20C7C9] mb-2.5" />
          <div className="font-display font-bold text-base">{t.tutorTitle}</div>
          <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3] mt-1">
            Ask any Maths, Reasoning, or English doubt in {langMeta.nativeName}.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pyqs')}
          className="text-left bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 hover:border-[#20C7C9] rounded-2xl p-5 ocean-shadow transition-all cursor-pointer"
        >
          <BookOpen className="w-5 h-5 text-[#075985] dark:text-[#55D6D0] mb-2.5" />
          <div className="font-display font-bold text-base">2016–2026 PYQ Library</div>
          <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3] mt-1">
            Browse all SSC CGL questions &amp; answers with step-by-step solutions and shortcuts.
          </p>
        </button>

        <div className="bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 rounded-2xl p-5 ocean-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#FF8B78]" />
                Academy Notice
              </span>
              <span className="text-[11px] font-mono-num text-[#073B50]/70 dark:text-[#8DE1D3]">
                Rank #{Math.max(1, leaderboard.findIndex((l) => l.isCurrentUser) + 1)}
              </span>
            </div>
            <div className="font-display font-bold text-sm">
              {announcements[0]?.title || 'SSC CGL Study Notice'}
            </div>
            <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3] mt-1 line-clamp-2">
              {announcements[0]?.body || 'Stay consistent with daily quizzes and mock tests.'}
            </p>
          </div>
        </div>
      </section>

      {resumeVideo && (
        <VideoPlayerModal lesson={resumeVideo} onClose={() => setResumeVideo(null)} />
      )}
    </div>
  );
};
