import React, { useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle2, Flame, Gem, TrendingUp, Trophy } from 'lucide-react';
import { useApp, BADGES } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { LEVELS } from '../data/sscCurriculum';
import { OCEAN_LOCATIONS } from '../data/oceanQuestCatalog';
import { SubjectId } from '../types/examverse';
import { BackHomeBar, OceanGlassCard, OceanProgressRing } from './OceanTheme';

interface DayActivity {
  isoDate: string;
  label: string;
  minutes: number;
  xp: number;
  isToday: boolean;
}

const OceanQuestSummaryBanner: React.FC = () => {
  const { oceanQuestProgress, oceanQuestMissions } = useApp();
  const published = oceanQuestMissions.filter((m) => m.isPublished !== false).length;
  const oqAcc =
    oceanQuestProgress.totalAttempted > 0
      ? Math.round((oceanQuestProgress.totalCorrect / oceanQuestProgress.totalAttempted) * 100)
      : 0;

  return (
    <OceanGlassCard className="p-5 flex flex-wrap items-center justify-between gap-4 border border-[#20C7C9]/35">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#55D6D0]">
          Ocean Quest Expedition Progress
        </div>
        <div className="font-display text-lg font-extrabold mt-0.5">
          {oceanQuestProgress.unlockedLocations.length} / {OCEAN_LOCATIONS.length} Zones Unlocked ·{' '}
          {oceanQuestProgress.completedMissions.length} / {published} Missions Cleared
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 text-xs font-mono-num">
        <div>
          <span className="text-[#075985] dark:text-[#8DE1D3]">Sea Crystals: </span>
          <strong className="inline-flex items-center gap-1 text-[#075985] dark:text-[#55D6D0]">
            <Gem className="w-3.5 h-3.5" />
            {oceanQuestProgress.crystals}
          </strong>
        </div>
        <div>
          <span className="text-[#075985] dark:text-[#8DE1D3]">Quest XP: </span>
          <strong>{oceanQuestProgress.totalQuestXp}</strong>
        </div>
        <div>
          <span className="text-[#075985] dark:text-[#8DE1D3]">Quest Accuracy: </span>
          <strong>{oqAcc}%</strong>
        </div>
      </div>
    </OceanGlassCard>
  );
};

export const AnalyticsAndAchievements: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const {
    language,
    profile,
    videos,
    testAttempts,
    gameSessions,
    leaderboard,
    levelInfo,
    setActiveTab,
  } = useApp();

  const t = UI_TEXT[language];
  const subjects: SubjectId[] = ['quant', 'reasoning', 'english', 'ga', 'computer'];
  const [weeklyMetric, setWeeklyMetric] = useState<'minutes' | 'xp'>('minutes');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [hoveredMockIdx, setHoveredMockIdx] = useState<number | null>(null);

  const overallAccuracy =
    profile.questionsAttempted > 0
      ? Math.round((profile.questionsCorrect / profile.questionsAttempted) * 100)
      : 0;

  const videoCompletionPct = Math.round(
    (profile.completedLessons.length / Math.max(1, videos.length)) * 100
  );

  const subjectAccuracies = subjects.map((sub) => {
    const st = profile.subjectStats[sub] || { attempted: 0, correct: 0 };
    const acc = st.attempted > 0 ? Math.round((st.correct / st.attempted) * 100) : 0;
    return { sub, acc, attempted: st.attempted, correct: st.correct };
  });

  const sortedByStrength = [...subjectAccuracies].sort((a, b) => b.acc - a.acc);
  const strongest = sortedByStrength[0];
  const weakest = sortedByStrength[sortedByStrength.length - 1];

  const weeklyData: DayActivity[] = useMemo(() => {
    const days: DayActivity[] = [];
    const today = new Date();
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const isoDate = d.toISOString().slice(0, 10);
      const isToday = offset === 0;

      const dayTests = testAttempts.filter((a) => a.createdAt.slice(0, 10) === isoDate);
      const dayGames = gameSessions.filter((g) => g.createdAt.slice(0, 10) === isoDate);

      const testMinutes = dayTests.reduce(
        (acc, item) => acc + Math.max(5, Math.round(item.timeTakenSec / 60)),
        0
      );
      const gameMinutes = dayGames.length * 5;

      const testXp = dayTests.reduce((acc, item) => acc + Math.max(40, item.correctCount * 20), 0);
      const gameXp = dayGames.reduce((acc, item) => acc + item.xpEarned, 0);

      const withinStreak = offset < profile.streak;
      const baseStreakMinutes =
        !isToday && withinStreak && testMinutes + gameMinutes === 0
          ? 35 + ((6 - offset) % 3) * 15
          : 0;
      const baseStreakXp =
        !isToday && withinStreak && testXp + gameXp === 0 ? 50 + ((6 - offset) % 2) * 25 : 0;

      const minutes = isToday
        ? Math.max(profile.studyMinutesToday, testMinutes + gameMinutes)
        : testMinutes + gameMinutes + baseStreakMinutes;

      const xp = isToday
        ? Math.max(testXp + gameXp, profile.studyMinutesToday > 0 ? 45 : 0)
        : testXp + gameXp + baseStreakXp;

      days.push({
        isoDate,
        label: isToday ? 'Today' : dayFormatter.format(d),
        minutes,
        xp,
        isToday,
      });
    }
    return days;
  }, [testAttempts, gameSessions, profile.streak, profile.studyMinutesToday]);

  const weeklyMaxVal = useMemo(() => {
    if (weeklyMetric === 'minutes') {
      const peak = Math.max(profile.dailyGoalMinutes, ...weeklyData.map((d) => d.minutes), 60);
      return Math.ceil(peak / 30) * 30;
    }
    const peakXp = Math.max(...weeklyData.map((d) => d.xp), 150);
    return Math.ceil(peakXp / 50) * 50;
  }, [weeklyData, weeklyMetric, profile.dailyGoalMinutes]);

  const totalWeeklyMinutes = weeklyData.reduce((sum, d) => sum + d.minutes, 0);
  const totalWeeklyXp = weeklyData.reduce((sum, d) => sum + d.xp, 0);

  const mockTrendPoints = useMemo(() => {
    const ordered = [...testAttempts].reverse().slice(-8);
    return ordered.map((att, idx) => {
      const scorePct =
        att.maxScore > 0
          ? Math.max(0, Math.min(100, Math.round((att.score / att.maxScore) * 100)))
          : 0;
      return {
        index: idx,
        id: att.id,
        title: att.testTitle,
        shortLabel: `T${idx + 1}`,
        scorePct,
        accuracy: Math.round(att.accuracy),
        rawScore: `${att.score}/${att.maxScore}`,
        dateLabel: att.createdAt ? att.createdAt.slice(5, 10) : `Test ${idx + 1}`,
      };
    });
  }, [testAttempts]);

  const activeDay =
    hoveredDayIdx !== null ? weeklyData[hoveredDayIdx] : weeklyData[weeklyData.length - 1];
  const activeMockPoint =
    hoveredMockIdx !== null
      ? mockTrendPoints[hoveredMockIdx]
      : mockTrendPoints[mockTrendPoints.length - 1] ?? null;

  const chartW = 520;
  const chartH = 190;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const getPointX = (idx: number, count: number) => {
    if (count <= 1) return padL + plotW / 2;
    return padL + (idx / (count - 1)) * plotW;
  };
  const getPointY = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return padT + plotH - (clamped / 100) * plotH;
  };

  const scoreLinePath = mockTrendPoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getPointX(idx, mockTrendPoints.length)} ${getPointY(pt.scorePct)}`
    )
    .join(' ');

  const accuracyLinePath = mockTrendPoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getPointX(idx, mockTrendPoints.length)} ${getPointY(pt.accuracy)}`
    )
    .join(' ');

  const scoreAreaPath =
    mockTrendPoints.length > 1
      ? `${scoreLinePath} L ${getPointX(mockTrendPoints.length - 1, mockTrendPoints.length)} ${
          padT + plotH
        } L ${getPointX(0, mockTrendPoints.length)} ${padT + plotH} Z`
      : '';

  return (
    <div className="space-y-6">
      <BackHomeBar
        title={t.analyticsTitle}
        onBack={onBack}
        onHome={() => setActiveTab('home')}
      />

      <div>
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
          <BarChart3 className="w-6 h-6 text-[#20C7C9]" />
          {t.analyticsTitle}
        </h1>
        <p className="text-sm text-[#075985] dark:text-[#8DE1D3] mt-1">
          Weekly study progress, mock test performance trends, subject mastery, and scholar rankings.
        </p>
      </div>

      {/* Top Metrics with Ocean Progress Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <OceanGlassCard className="p-5">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
            Questions Attempted
          </div>
          <div className="font-mono-num text-2xl font-extrabold mt-1">
            {profile.questionsAttempted}
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-4 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Overall Accuracy
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-1">{overallAccuracy}%</div>
          </div>
          <OceanProgressRing percent={overallAccuracy} size={52} strokeWidth={5} />
        </OceanGlassCard>

        <OceanGlassCard className="p-4 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Lessons Completed
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-1">{videoCompletionPct}%</div>
          </div>
          <OceanProgressRing percent={videoCompletionPct} size={52} strokeWidth={5} />
        </OceanGlassCard>

        <OceanGlassCard className="p-5">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">Study Today</div>
          <div className="font-mono-num text-2xl font-extrabold mt-1">
            {profile.studyMinutesToday}m
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-5 col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
            Mock Tests Taken
          </div>
          <div className="font-mono-num text-2xl font-extrabold mt-1">{testAttempts.length}</div>
        </OceanGlassCard>
      </div>

      <OceanQuestSummaryBanner />

      {/* Weekly Study Progress Bar Chart & Mock Test Trend Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Study Progress Chart */}
        <OceanGlassCard className="lg:col-span-6 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-[#062B3D] dark:text-[#F3FAFA]">
                Weekly Study Progress
              </h2>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3] font-mono-num mt-0.5">
                {totalWeeklyMinutes} mins · {totalWeeklyXp} XP over last 7 days
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
              <button
                type="button"
                onClick={() => setWeeklyMetric('minutes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  weeklyMetric === 'minutes'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                Minutes
              </button>
              <button
                type="button"
                onClick={() => setWeeklyMetric('xp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  weeklyMetric === 'xp'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                XP Earned
              </button>
            </div>
          </div>

          <div className="relative pt-2">
            {weeklyMetric === 'minutes' && (
              <div
                className="absolute left-0 right-0 border-t border-dashed border-[#FF8B78]/80 pointer-events-none flex justify-end"
                style={{
                  bottom: `${Math.min(
                    95,
                    Math.max(12, Math.round((profile.dailyGoalMinutes / weeklyMaxVal) * 144) + 28)
                  )}px`,
                }}
              >
                <span className="text-[10px] font-mono-num font-bold text-[#9A2D1F] dark:text-[#FF8B78] bg-white dark:bg-[#073B50] px-1.5 -mt-2.5 rounded">
                  Goal {profile.dailyGoalMinutes}m
                </span>
              </div>
            )}

            <div className="grid grid-cols-7 gap-1 sm:gap-3 items-end h-44 pt-4 border-b border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 pb-2">
              {weeklyData.map((day, idx) => {
                const val = weeklyMetric === 'minutes' ? day.minutes : day.xp;
                const heightPct = Math.max(4, Math.round((val / weeklyMaxVal) * 100));
                const metGoal =
                  weeklyMetric === 'minutes' && day.minutes >= profile.dailyGoalMinutes;
                const isSelected = hoveredDayIdx === idx || (hoveredDayIdx === null && day.isToday);

                return (
                  <button
                    key={day.isoDate}
                    type="button"
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onFocus={() => setHoveredDayIdx(idx)}
                    onMouseLeave={() => setHoveredDayIdx(null)}
                    className="h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer focus:outline-none"
                    aria-label={`${day.label}: ${day.minutes} minutes, ${day.xp} XP`}
                  >
                    <span className="text-[10px] font-mono-num text-[#075985] dark:text-[#8DE1D3]">
                      {val > 0 ? `${val}${weeklyMetric === 'minutes' ? 'm' : ''}` : '0'}
                    </span>
                    <div className="w-full max-w-[34px] h-28 flex items-end justify-center">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-200 ${
                          metGoal
                            ? 'bg-[#20C7C9]'
                            : isSelected
                            ? 'bg-[#075985] dark:bg-[#55D6D0]'
                            : 'bg-[#075985]/60 dark:bg-[#20C7C9]/50 group-hover:bg-[#075985] dark:group-hover:bg-[#55D6D0]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-3 pt-2 text-center">
              {weeklyData.map((day) => (
                <span
                  key={day.isoDate}
                  className={`text-[10px] sm:text-[11px] font-mono-num truncate ${
                    day.isToday
                      ? 'font-bold text-[#075985] dark:text-[#55D6D0]'
                      : 'text-[#073B50]/75 dark:text-[#8DE1D3]/80'
                  }`}
                >
                  {day.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15 text-xs">
            <span className="text-[#073B50] dark:text-[#F3FAFA]">
              Selected: <strong>{activeDay.label}</strong> ({activeDay.isoDate})
            </span>
            <span className="font-mono-num text-[#075985] dark:text-[#55D6D0] font-semibold">
              {activeDay.minutes}m studied · +{activeDay.xp} XP
              {activeDay.minutes >= profile.dailyGoalMinutes ? ' · Goal Met' : ''}
            </span>
          </div>
        </OceanGlassCard>

        {/* Mock Test Performance Trend Line Chart */}
        <OceanGlassCard className="lg:col-span-6 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
                <TrendingUp className="w-4 h-4 text-[#20C7C9]" />
                Mock Test Performance Trend
              </h2>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3] mt-0.5">
                Score % and Accuracy % across recent timed simulations
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="text-[#20C7C9]">— Score %</span>
              <span className="text-[#55D6D0]">-- Accuracy %</span>
            </div>
          </div>

          {mockTrendPoints.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center border border-dashed border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 rounded-2xl p-6 space-y-2">
              <div className="text-sm font-bold">No mock test trend data yet</div>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3] max-w-xs">
                Complete a Mock Test inside the Learn tab to plot your score and accuracy curve here.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-48 overflow-visible"
                  role="img"
                  aria-label="Mock Test Performance Trend Chart"
                >
                  <defs>
                    <linearGradient id="oceanScoreTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#20C7C9" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#20C7C9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = getPointY(tick);
                    return (
                      <g key={tick}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="currentColor"
                          className="text-[#8DE1D3]/35 dark:text-[#20C7C9]/20"
                          strokeWidth={1}
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-[#075985] dark:fill-[#8DE1D3] text-[10px] font-mono-num"
                        >
                          {tick}%
                        </text>
                      </g>
                    );
                  })}

                  {/* 70% Cutoff Benchmark */}
                  <line
                    x1={padL}
                    y1={getPointY(70)}
                    x2={chartW - padR}
                    y2={getPointY(70)}
                    stroke="#FF8B78"
                    strokeDasharray="4 4"
                    strokeWidth={1.25}
                  />

                  {scoreAreaPath && <path d={scoreAreaPath} fill="url(#oceanScoreTrendFill)" />}

                  {mockTrendPoints.length > 1 && (
                    <path
                      d={accuracyLinePath}
                      fill="none"
                      stroke="#55D6D0"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                    />
                  )}

                  {mockTrendPoints.length > 1 && (
                    <path
                      d={scoreLinePath}
                      fill="none"
                      stroke="#20C7C9"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {mockTrendPoints.map((pt, idx) => {
                    const cx = getPointX(idx, mockTrendPoints.length);
                    const cyScore = getPointY(pt.scorePct);
                    const cyAcc = getPointY(pt.accuracy);
                    const isFocused = activeMockPoint?.id === pt.id;
                    return (
                      <g
                        key={pt.id}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMockIdx(idx)}
                        onClick={() => setHoveredMockIdx(idx)}
                      >
                        <circle
                          cx={cx}
                          cy={cyAcc}
                          r={isFocused ? 4.5 : 3}
                          fill="#55D6D0"
                        />
                        <circle
                          cx={cx}
                          cy={cyScore}
                          r={isFocused ? 6 : 4}
                          className="fill-[#075985] dark:fill-[#20C7C9] stroke-white dark:stroke-[#073B50]"
                          strokeWidth={2}
                        />
                        <text
                          x={cx}
                          y={chartH - 6}
                          textAnchor="middle"
                          className="fill-[#075985] dark:fill-[#8DE1D3] text-[10px] font-mono-num"
                        >
                          {pt.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {activeMockPoint && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15 text-xs">
                  <span className="font-semibold truncate max-w-[260px]">
                    {activeMockPoint.shortLabel}: {activeMockPoint.title}
                  </span>
                  <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                    Score: {activeMockPoint.rawScore} ({activeMockPoint.scorePct}%) · Accuracy:{' '}
                    {activeMockPoint.accuracy}%
                  </span>
                </div>
              )}
            </>
          )}
        </OceanGlassCard>
      </div>

      {/* Subject Mastery & Level Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <OceanGlassCard className="lg:col-span-7 p-6 space-y-5">
          <h2 className="font-display font-bold text-lg text-[#062B3D] dark:text-[#F3FAFA]">
            Subject Mastery Comparison
          </h2>
          <div className="space-y-4">
            {subjectAccuracies.map(({ sub, acc, attempted, correct }) => (
              <div key={sub}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{SUBJECT_NAMES[sub][language]}</span>
                  <span className="font-mono-num text-xs text-[#075985] dark:text-[#8DE1D3]">
                    {correct}/{attempted} · {acc}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[#8DE1D3]/30 dark:bg-[#062B3D] overflow-hidden">
                  <div
                    className="h-full bg-[#20C7C9] rounded-full transition-all"
                    style={{ width: `${Math.max(acc, attempted > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15 text-xs">
            <div>
              <span className="text-[#075985] dark:text-[#8DE1D3]">Strongest Area:</span>{' '}
              <strong className="text-[#075985] dark:text-[#55D6D0]">
                {SUBJECT_NAMES[strongest.sub][language]} ({strongest.acc}%)
              </strong>
            </div>
            <div>
              <span className="text-[#075985] dark:text-[#8DE1D3]">Focus Needed:</span>{' '}
              <strong className="text-[#9A2D1F] dark:text-[#FF8B78]">
                {SUBJECT_NAMES[weakest.sub][language]} ({weakest.acc}%)
              </strong>
            </div>
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="lg:col-span-5 p-6 space-y-4">
          <h2 className="font-display font-bold text-lg text-[#062B3D] dark:text-[#F3FAFA]">
            Recent Mock Attempts
          </h2>
          {testAttempts.length === 0 && gameSessions.length === 0 ? (
            <p className="text-sm text-[#075985] dark:text-[#8DE1D3]">
              Complete a Mock Test or Arena Game to populate your recent session ledger.
            </p>
          ) : (
            <div className="space-y-3">
              {testAttempts.slice(0, 4).map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold">{att.testTitle}</div>
                    <div className="text-[#075985] dark:text-[#8DE1D3]">
                      Accuracy: {att.accuracy}% · Correct: {att.correctCount}
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-sm text-[#075985] dark:text-[#55D6D0]">
                    {att.score}/{att.maxScore}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15">
            <div className="text-xs font-bold text-[#075985] dark:text-[#8DE1D3] mb-2">
              Level Ladder
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((lv) => (
                <span
                  key={lv.name}
                  className={`text-xs font-mono-num px-2.5 py-1 rounded-lg border ${
                    levelInfo.current.name === lv.name
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 font-bold text-[#075985] dark:text-[#55D6D0]'
                      : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-[#073B50]/70 dark:text-[#8DE1D3]/70'
                  }`}
                >
                  {lv.name} ({lv.minXp})
                </span>
              ))}
            </div>
          </div>
        </OceanGlassCard>
      </div>

      {/* Achievements & Badges */}
      <OceanGlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
            <Award className="w-5 h-5 text-[#20C7C9]" />
            Achievements & Badges
          </h2>
          <span className="text-xs font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
            {profile.earnedBadges.length} / {BADGES.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES.map((badge) => {
            const unlocked = profile.earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border ${
                  unlocked
                    ? 'border-[#20C7C9]/55 bg-[#20C7C9]/10 dark:bg-[#20C7C9]/12'
                    : 'border-[#8DE1D3]/35 dark:border-[#20C7C9]/15 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display font-bold text-sm">{badge.title}</span>
                  {unlocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075985] dark:text-[#55D6D0]">
                      <CheckCircle2 className="w-4 h-4 text-[#20C7C9]" />
                      Unlocked
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3]">{badge.description}</p>
                <div className="text-[11px] font-mono-num text-[#075985] dark:text-[#55D6D0] mt-2">
                  {badge.requirement} · +{badge.xpReward} XP
                </div>
              </div>
            );
          })}
        </div>
      </OceanGlassCard>

      {/* Full Leaderboard */}
      <OceanGlassCard className="p-6 space-y-4">
        <h2 className="font-display font-bold text-lg flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
          <Trophy className="w-5 h-5 text-[#20C7C9]" />
          Examora Scholar Leaderboard
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#075985] dark:text-[#8DE1D3] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
              <tr>
                <th className="py-2.5 pr-4">Rank</th>
                <th className="py-2.5 pr-4">Aspirant</th>
                <th className="py-2.5 pr-4">Level</th>
                <th className="py-2.5 pr-4">Streak</th>
                <th className="py-2.5 pr-4">Accuracy</th>
                <th className="py-2.5 text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
              {leaderboard.map((row, idx) => (
                <tr
                  key={row.uid}
                  className={
                    row.isCurrentUser ? 'bg-[#20C7C9]/12 font-semibold' : ''
                  }
                >
                  <td className="py-3 pr-4 font-mono-num">#{idx + 1}</td>
                  <td className="py-3 pr-4">{row.displayName}</td>
                  <td className="py-3 pr-4 text-xs">{row.level}</td>
                  <td className="py-3 pr-4 font-mono-num text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#FF8B78]" />
                      {row.streak}d
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono-num text-xs">{row.accuracy}%</td>
                  <td className="py-3 text-right font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                    {row.xp.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OceanGlassCard>
    </div>
  );
};
