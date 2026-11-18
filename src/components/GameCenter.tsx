import React, { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  Coins,
  Compass,
  Flame,
  Gem,
  HelpCircle,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  Trophy,
  Unlock,
  Volume2,
  VolumeX,
  Waves,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp, BADGES } from '../context/AppContext';
import { SUBJECT_NAMES } from '../data/i18n';
import {
  OCEAN_LOCATIONS,
  OCEAN_MODE_META,
  getLocationUnlockStatus,
  getMissionUnlockStatus,
  getSubjectDisplayName,
  selectSmartQuestQuestions,
} from '../data/oceanQuestCatalog';
import {
  GameModeId,
  OceanQuestDifficulty,
  OceanQuestEvalResponse,
  OceanQuestLocation,
  OceanQuestMission,
  OceanQuestMode,
  Question,
  SubjectId,
} from '../types/examverse';
import { soundFX } from '../lib/sound';
import { FirstTimeTip, OceanGlassCard } from './OceanTheme';

const MAP_BACKDROP_IMG = '/src/assets/images/ocean_quest_map_backdrop_1794998665910.jpg';
const SUBMARINE_IMG = '/src/assets/images/ocean_quest_submarine_1794998665527.jpg';
const GUARDIAN_IMG = '/src/assets/images/ocean_quest_guardian_1794998664612.jpg';

const DIFFICULTY_STYLES: Record<
  OceanQuestDifficulty,
  { label: string; border: string; text: string; bg: string }
> = {
  beginner: {
    label: 'Beginner',
    border: 'border-[#20C7C9]/60',
    text: 'text-[#075985] dark:text-[#55D6D0]',
    bg: 'bg-[#20C7C9]/15',
  },
  intermediate: {
    label: 'Intermediate',
    border: 'border-[#38BDF8]/60',
    text: 'text-[#0369A1] dark:text-[#7DD3FC]',
    bg: 'bg-[#38BDF8]/15',
  },
  advanced: {
    label: 'Advanced',
    border: 'border-[#FF8B78]/70',
    text: 'text-[#9A2D1F] dark:text-[#FF8B78]',
    bg: 'bg-[#FF8B78]/15',
  },
};

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const GameCenter: React.FC<{ initialMode?: GameModeId | null }> = ({
  initialMode = null,
}) => {
  const {
    questions,
    language,
    profile,
    soundMuted,
    toggleSound,
    oceanQuestMissions,
    oceanQuestProgress,
    evaluateOceanQuestRun,
    gameSessions,
    leaderboard,
    openTutorWithPrompt,
    setActiveTab,
  } = useApp();

  const publishedMissions = useMemo(
    () => oceanQuestMissions.filter((m) => m.isPublished !== false),
    [oceanQuestMissions]
  );

  // Hub Navigation State
  const [selectedLocId, setSelectedLocId] = useState<string>('coral-bay');
  const [modeFilter, setModeFilter] = useState<OceanQuestMode | 'all'>('all');
  const [showRevisionDrawer, setShowRevisionDrawer] = useState(false);

  // Mission Briefing & Active Run State
  const [briefingMission, setBriefingMission] = useState<OceanQuestMission | null>(null);
  const [activeMission, setActiveMission] = useState<OceanQuestMission | null>(null);
  const [runNonce, setRunNonce] = useState(0);
  const [deck, setDeck] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongIdsInRun, setWrongIdsInRun] = useState<string[]>([]);
  const [subjectStatsInRun, setSubjectStatsInRun] = useState<
    Partial<Record<SubjectId, { attempted: number; correct: number }>>
  >({});
  const [submittingRun, setSubmittingRun] = useState(false);
  const [evalResult, setEvalResult] = useState<OceanQuestEvalResponse | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  // Support deep link from HomeDashboard Daily Quiz button or legacy mode triggers
  useEffect(() => {
    if (!initialMode) return;
    if (initialMode === 'daily-challenge') {
      const daily = publishedMissions.find((m) => m.mode === 'daily-challenge');
      if (daily) setBriefingMission(daily);
    } else if (initialMode === 'treasure-hunt') {
      setModeFilter('treasure-hunt');
    } else if (initialMode === 'maths-speed') {
      const quantMission = publishedMissions.find((m) => m.subject === 'quant');
      if (quantMission) setBriefingMission(quantMission);
    } else if (initialMode === 'escape-room') {
      const reasonMission = publishedMissions.find((m) => m.subject === 'reasoning');
      if (reasonMission) setBriefingMission(reasonMission);
    }
  }, [initialMode, publishedMissions]);

  const unlockedLocationIds = useMemo(() => {
    const set = new Set<string>(['coral-bay']);
    OCEAN_LOCATIONS.forEach((loc) => {
      if (getLocationUnlockStatus(loc.locationId, oceanQuestProgress, publishedMissions).unlocked) {
        set.add(loc.locationId);
      }
    });
    return set;
  }, [oceanQuestProgress, publishedMissions]);

  const deepestUnlockedLocation = useMemo(() => {
    const unlocked = OCEAN_LOCATIONS.filter((l) => unlockedLocationIds.has(l.locationId));
    return unlocked[unlocked.length - 1] || OCEAN_LOCATIONS[0];
  }, [unlockedLocationIds]);

  const activeLocation: OceanQuestLocation = useMemo(
    () =>
      OCEAN_LOCATIONS.find((l) => l.locationId === selectedLocId) || OCEAN_LOCATIONS[0],
    [selectedLocId]
  );

  const locationMissions = useMemo(
    () =>
      publishedMissions
        .filter((m) => m.locationId === activeLocation.locationId && m.mode !== 'daily-challenge')
        .sort((a, b) => a.order - b.order),
    [publishedMissions, activeLocation.locationId]
  );

  const dailyMission = useMemo(
    () => publishedMissions.find((m) => m.mode === 'daily-challenge') || null,
    [publishedMissions]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyAlreadyClaimed = oceanQuestProgress.dailyCompletions.includes(todayKey);

  const filteredGlobalMissions = useMemo(() => {
    if (modeFilter === 'all') return locationMissions;
    return publishedMissions.filter((m) => m.mode === modeFilter);
  }, [modeFilter, locationMissions, publishedMissions]);

  const wrongRevisionQuestions = useMemo(
    () =>
      questions.filter((q) => oceanQuestProgress.wrongQuestionIds.includes(q.id)),
    [questions, oceanQuestProgress.wrongQuestionIds]
  );

  const recentOceanSessions = useMemo(
    () => gameSessions.filter((g) => g.gameMode === 'ocean-quest').slice(0, 5),
    [gameSessions]
  );

  const startMission = (mission: OceanQuestMission) => {
    const nextNonce = runNonce + 1;
    setRunNonce(nextNonce);
    const chosenQuestions = selectSmartQuestQuestions(
      questions,
      mission,
      oceanQuestProgress.seenQuestionIds,
      nextNonce
    );
    soundFX.playSubmarineSonar();
    setBriefingMission(null);
    setActiveMission(mission);
    setDeck(chosenQuestions);
    setQIdx(0);
    setSelectedOpt(null);
    setPaused(false);
    setTimeLeft(mission.timeLimitSec || 0);
    setHintsUsed(0);
    setHintRevealed(false);
    setCorrectCount(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongIdsInRun([]);
    setSubjectStatsInRun({});
    setEvalResult(null);
    setConfirmExit(false);
  };

  // Countdown timer for timed Ocean Quest missions
  useEffect(() => {
    if (!activeMission || evalResult || paused || activeMission.timeLimitSec <= 0) {
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          void finalizeMission(correctCount, maxCombo, hintsUsed, 0, wrongIdsInRun, subjectStatsInRun);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission, evalResult, paused]);

  const finalizeMission = async (
    finalCorrect: number,
    finalComboMax: number,
    finalHintsUsed: number,
    remainingSec: number,
    finalWrongIds: string[],
    finalSubStats: Partial<Record<SubjectId, { attempted: number; correct: number }>>
  ) => {
    if (!activeMission || submittingRun || evalResult) return;
    setSubmittingRun(true);
    const total = Math.max(1, deck.length);
    const attemptedIds = deck.map((q) => q.id);

    const res = await evaluateOceanQuestRun({
      mission: activeMission,
      correctCount: finalCorrect,
      totalQuestions: total,
      timeRemainingSec: remainingSec,
      hintsUsed: finalHintsUsed,
      comboMax: finalComboMax,
      attemptedQuestionIds: attemptedIds,
      wrongQuestionIds: finalWrongIds,
      subjectBreakdown: finalSubStats,
    });

    if (res.passed) {
      soundFX.playTreasure();
    } else {
      soundFX.playWrong();
    }
    setEvalResult(res);
    setSubmittingRun(false);
  };

  const handleSelectOption = (optIdx: number) => {
    if (!activeMission || selectedOpt !== null || paused || evalResult) return;
    const currentQ = deck[qIdx];
    if (!currentQ) return;

    setSelectedOpt(optIdx);
    const isCorrect = optIdx === currentQ.correctIndex;

    if (isCorrect) {
      if (activeMission.isBoss || activeMission.mode === 'boss-battle') {
        soundFX.playBossHit();
      } else if (activeMission.mode === 'treasure-hunt') {
        soundFX.playTreasure();
      } else {
        soundFX.playCorrect();
      }
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));
      setCorrectCount((prev) => prev + 1);
    } else {
      soundFX.playWrong();
      setCombo(0);
      setWrongIdsInRun((prev) => (prev.includes(currentQ.id) ? prev : [...prev, currentQ.id]));
    }

    setSubjectStatsInRun((prev) => {
      const cur = prev[currentQ.subject] || { attempted: 0, correct: 0 };
      return {
        ...prev,
        [currentQ.subject]: {
          attempted: cur.attempted + 1,
          correct: cur.correct + (isCorrect ? 1 : 0),
        },
      };
    });
  };

  const handleNextQuestion = () => {
    if (!activeMission) return;
    soundFX.playBubble();
    if (qIdx + 1 >= deck.length) {
      void finalizeMission(
        correctCount,
        maxCombo,
        hintsUsed,
        timeLeft,
        wrongIdsInRun,
        subjectStatsInRun
      );
      return;
    }
    setQIdx((prev) => prev + 1);
    setSelectedOpt(null);
    setHintRevealed(false);
  };

  const handleRevealHint = () => {
    if (!activeMission || hintRevealed || selectedOpt !== null) return;
    if (hintsUsed >= activeMission.hintLimit) return;
    soundFX.playBubble();
    setHintsUsed((prev) => prev + 1);
    setHintRevealed(true);
  };

  const getNextUnlockedMission = (): OceanQuestMission | null => {
    if (!activeMission) return null;
    const idx = publishedMissions.findIndex((m) => m.missionId === activeMission.missionId);
    if (idx < 0) return null;
    for (let i = idx + 1; i < publishedMissions.length; i++) {
      const candidate = publishedMissions[i];
      if (candidate.mode === 'daily-challenge') continue;
      if (getMissionUnlockStatus(candidate, oceanQuestProgress, publishedMissions).unlocked) {
        return candidate;
      }
    }
    return null;
  };

  // ==================== 1. VICTORY / RETRY SCREEN ====================
  if (activeMission && evalResult) {
    const passed = evalResult.passed;
    const loc = OCEAN_LOCATIONS.find((l) => l.locationId === activeMission.locationId);
    const nextMission = getNextUnlockedMission();
    const missedQuestions = deck.filter((q) => wrongIdsInRun.includes(q.id));
    const badgeDef = evalResult.unlockedBadgeId
      ? BADGES.find((b) => b.id === evalResult.unlockedBadgeId)
      : null;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <OceanGlassCard className="p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  passed
                    ? 'bg-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0]'
                    : 'bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]'
                }`}
              >
                {passed ? <Trophy className="w-7 h-7" /> : <Waves className="w-7 h-7" />}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#55D6D0]">
                  {loc?.name || 'Ocean Quest'} · {OCEAN_MODE_META[activeMission.mode].label}
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#062B3D] dark:text-[#F3FAFA] mt-0.5">
                  {passed
                    ? activeMission.isBoss
                      ? `${activeMission.guardianName || 'Guardian'} Defeated!`
                      : 'Mission Accomplished!'
                    : 'Dive Complete — Keep Training!'}
                </h2>
                <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3] mt-1">
                  {passed
                    ? `You cleared "${activeMission.title}" with ${evalResult.accuracy}% accuracy.`
                    : `Required ${activeMission.minAccuracyPct}% accuracy to clear. You scored ${evalResult.accuracy}% — your practice XP is still saved!`}
                </p>
              </div>
            </div>

            {/* 1-3 Stars */}
            <div className="flex items-center gap-1.5 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2 rounded-2xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= evalResult.stars
                      ? 'text-[#F59E0B] fill-[#F59E0B]'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/80 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Accuracy</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5">
                {evalResult.accuracy}%
              </div>
              <div className="text-[11px] font-mono-num text-[#073B50]/75 dark:text-[#8DE1D3]/80">
                {correctCount}/{deck.length} correct
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/80 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Quest Score</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5">
                {evalResult.score}
              </div>
              <div className="text-[11px] font-mono-num text-[#073B50]/75 dark:text-[#8DE1D3]/80">
                Best: {oceanQuestProgress.missionBestScores[activeMission.missionId] || evalResult.score}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#20C7C9]/12 border border-[#20C7C9]/35">
              <div className="text-xs text-[#075985] dark:text-[#55D6D0] font-semibold">
                XP &amp; Coins
              </div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5 text-[#075985] dark:text-[#55D6D0]">
                +{evalResult.xpEarned} XP
              </div>
              <div className="text-[11px] font-mono-num text-[#073B50] dark:text-[#8DE1D3]">
                +{evalResult.coinsEarned} Coins
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#A78BFA]/12 border border-[#A78BFA]/35">
              <div className="text-xs text-[#5B21B6] dark:text-[#C4B5FD] font-semibold">
                Sea Crystals
              </div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5 text-[#5B21B6] dark:text-[#DDD6FE] flex items-center gap-1.5">
                <Gem className="w-4 h-4" />
                +{evalResult.crystalsEarned}
              </div>
              <div className="text-[11px] text-[#5B21B6]/80 dark:text-[#C4B5FD]">
                {evalResult.alreadyClaimedDaily
                  ? 'Daily bonus already claimed'
                  : evalResult.isFirstClearClaim
                  ? 'First-Clear Bonus!'
                  : passed
                  ? 'Replay Practice Mode'
                  : 'Clear to earn crystals'}
              </div>
            </div>
          </div>

          {badgeDef && (
            <div className="p-4 rounded-2xl bg-[#20C7C9]/15 border border-[#20C7C9] flex items-center gap-3">
              <Award className="w-6 h-6 text-[#075985] dark:text-[#55D6D0] shrink-0" />
              <div className="text-xs">
                <div className="font-display font-extrabold text-sm">
                  Achievement Unlocked: {badgeDef.title}
                </div>
                <div className="text-[#073B50] dark:text-[#8DE1D3]">{badgeDef.description}</div>
              </div>
            </div>
          )}

          {/* Wrong Questions Review List */}
          {missedQuestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm flex items-center gap-2 text-[#9A2D1F] dark:text-[#FF8B78]">
                  <XCircle className="w-4 h-4" />
                  Added to Revision List ({missedQuestions.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {missedQuestions.map((mq) => (
                  <div
                    key={mq.id}
                    className="p-4 rounded-2xl border border-[#FF8B78]/40 bg-[#FF8B78]/8 text-xs space-y-2"
                  >
                    <div className="font-semibold text-[#062B3D] dark:text-[#F3FAFA]">
                      {mq.questionEn}
                    </div>
                    <div className="text-[#075985] dark:text-[#55D6D0] font-semibold">
                      Correct Answer: {String.fromCharCode(65 + mq.correctIndex)} —{' '}
                      {mq.optionsEn[mq.correctIndex]}
                    </div>
                    <p className="text-[#073B50]/90 dark:text-[#8DE1D3]">
                      {mq.explanations[language]}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        openTutorWithPrompt(
                          `Explain this missed Ocean Quest SSC CGL question step-by-step: "${mq.questionEn}"`
                        )
                      }
                      className="inline-flex items-center gap-1.5 font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      Ask Examora AI Tutor →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveMission(null);
                setEvalResult(null);
              }}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Ocean Map
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => startMission(activeMission)}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#20C7C9] text-[#075985] dark:text-[#55D6D0] text-xs font-extrabold cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Replay Mission
              </button>
              {nextMission && (
                <button
                  type="button"
                  onClick={() => startMission(nextMission)}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer shadow-md"
                >
                  Next Dive: {nextMission.title}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </OceanGlassCard>
      </div>
    );
  }

  // ==================== 2. ACTIVE GAMEPLAY SCREEN ====================
  if (activeMission) {
    const q = deck[qIdx];
    const progressPct = Math.round(((qIdx + (selectedOpt !== null ? 1 : 0)) / Math.max(1, deck.length)) * 100);
    const bossHpPct = Math.max(
      0,
      Math.round(((deck.length - correctCount) / Math.max(1, deck.length)) * 100)
    );
    const hintsLeft = Math.max(0, activeMission.hintLimit - hintsUsed);
    const diffStyle = DIFFICULTY_STYLES[activeMission.difficulty];
    const loc = OCEAN_LOCATIONS.find((l) => l.locationId === activeMission.locationId);

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Ocean Quest Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/85 dark:bg-[#073B50]/85 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Dive
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeMission.timeLimitSec > 0 ? (
              <span
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono-num text-xs font-extrabold border ${
                  timeLeft <= 30
                    ? 'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]'
                    : 'border-[#20C7C9]/50 bg-white/85 dark:bg-[#073B50]/85 text-[#075985] dark:text-[#55D6D0]'
                }`}
              >
                <Timer className="w-4 h-4" />
                {formatClock(timeLeft)}
              </span>
            ) : (
              <span className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[#20C7C9]/45 bg-[#20C7C9]/10 text-[#075985] dark:text-[#55D6D0]">
                Untimed Calm Mode
              </span>
            )}

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/85 dark:bg-[#073B50]/85 text-xs font-bold cursor-pointer"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? 'Resume' : 'Pause'}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundMuted ? 'Unmute Ocean Sound FX' : 'Mute Ocean Sound FX'}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/85 dark:bg-[#073B50]/85 cursor-pointer"
            >
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-[#FF8B78]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#20C7C9]" />
              )}
            </button>
          </div>
        </div>

        {/* Mode-Specific Underwater HUD */}
        <div className="rounded-3xl ocean-gradient-hero text-white p-5 sm:p-6 border border-[#20C7C9]/30 ocean-shadow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={
                  activeMission.isBoss || activeMission.mode === 'boss-battle'
                    ? GUARDIAN_IMG
                    : SUBMARINE_IMG
                }
                alt={activeMission.title}
                referrerPolicy="no-referrer"
                className="w-13 h-13 rounded-2xl object-cover border-2 border-[#20C7C9] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#55D6D0]">
                  <span>{loc?.name}</span>
                  <span>·</span>
                  <span>{OCEAN_MODE_META[activeMission.mode].label}</span>
                  <span>·</span>
                  <span className="uppercase">{diffStyle.label}</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold truncate">
                  {activeMission.isBoss
                    ? `${activeMission.guardianName || 'Ocean Guardian'} — ${activeMission.title}`
                    : activeMission.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono-num shrink-0">
              <div className="text-right">
                <div className="text-[#8DE1D3]">Solved</div>
                <div className="font-extrabold text-sm">
                  {correctCount}/{deck.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#8DE1D3]">Combo</div>
                <div className="font-extrabold text-sm text-[#55D6D0]">{combo}x</div>
              </div>
            </div>
          </div>

          {/* Boss HP / Treasure Locks / Submarine Depth / Crystal Meter */}
          {activeMission.isBoss || activeMission.mode === 'boss-battle' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[#FF8B78]">
                  <Swords className="w-4 h-4" />
                  Guardian Shield Integrity
                </span>
                <span className="font-mono-num text-[#8DE1D3]">{bossHpPct}% HP Left</span>
              </div>
              <div className="h-3 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8B78] to-[#F59E0B] transition-all duration-300"
                  style={{ width: `${bossHpPct}%` }}
                />
              </div>
            </div>
          ) : activeMission.mode === 'treasure-hunt' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#55D6D0]">
                <span>Treasure Chest Seals Cracked</span>
                <span className="font-mono-num">
                  {correctCount} / {deck.length} Seals
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {deck.map((item, i) => (
                  <div
                    key={item.id}
                    className={`h-2.5 rounded-full transition-all ${
                      i < correctCount
                        ? 'bg-[#20C7C9]'
                        : i === qIdx
                        ? 'bg-[#FF8B78]'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#8DE1D3]">
                <span>
                  {activeMission.mode === 'crystal-rush'
                    ? 'Crystal Vein Progress'
                    : 'Submarine Descent Path'}
                </span>
                <span className="font-mono-num">
                  Waypoint {qIdx + 1} of {deck.length}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/15 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[#20C7C9] to-[#8DE1D3] transition-all duration-300"
                  style={{ width: `${Math.max(8, progressPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Question Card (Single Question at a Time) */}
        {paused ? (
          <OceanGlassCard className="p-8 text-center space-y-4">
            <Pause className="w-10 h-10 text-[#20C7C9] mx-auto" />
            <h3 className="font-display text-xl font-extrabold">Mission Paused</h3>
            <p className="text-sm text-[#075985] dark:text-[#8DE1D3] max-w-md mx-auto">
              Your timer and submarine depth are safely held. Resume whenever you are ready.
            </p>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#20C7C9] text-[#062B3D] font-extrabold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume Mission
            </button>
          </OceanGlassCard>
        ) : q ? (
          <OceanGlassCard className="p-6 sm:p-8 space-y-5">
            {/* Provenance + Hint Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#075985] dark:text-[#55D6D0]">
                  {SUBJECT_NAMES[q.subject][language]} · {q.topic}
                </span>
                <span className="text-[#073B50]/60 dark:text-[#8DE1D3]/70">·</span>
                <span className="font-semibold text-[#073B50] dark:text-[#8DE1D3]">
                  {q.sourceType === 'PYQ'
                    ? `Official PYQ · ${q.year} ${q.tier}`
                    : 'AI Practice Question'}
                </span>
              </div>

              {activeMission.hintLimit > 0 && (
                <button
                  type="button"
                  disabled={hintRevealed || selectedOpt !== null || hintsLeft <= 0}
                  onClick={handleRevealHint}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#20C7C9]/60 text-[#075985] dark:text-[#55D6D0] text-xs font-bold disabled:opacity-45 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  Use Hint ({hintsLeft} left)
                </button>
              )}
            </div>

            {hintRevealed && (
              <div className="p-3.5 rounded-2xl bg-[#20C7C9]/12 border border-[#20C7C9]/40 text-xs text-[#062B3D] dark:text-[#F3FAFA]">
                <strong className="text-[#075985] dark:text-[#55D6D0]">Sonar Hint: </strong>
                {q.shortcutMethod ||
                  q.stepByStep?.[0] ||
                  `Focus on the core ${q.topic} rule before calculating options.`}
              </div>
            )}

            <p className="text-base sm:text-lg font-semibold leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
              {q.questionEn}
            </p>

            <div className="space-y-3">
              {q.optionsEn.map((opt, oi) => {
                const answered = selectedOpt !== null;
                const isCorrectOpt = oi === q.correctIndex;
                const isChosen = selectedOpt === oi;

                let cls =
                  'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-white/85 dark:bg-[#062B3D]/65 hover:border-[#20C7C9]';
                if (answered) {
                  if (isCorrectOpt) {
                    cls =
                      'border-[#20C7C9] bg-[#20C7C9]/15 dark:bg-[#20C7C9]/20 font-bold text-[#062B3D] dark:text-[#F3FAFA]';
                  } else if (isChosen) {
                    cls =
                      'border-[#FF8B78] bg-[#FF8B78]/15 dark:bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]';
                  }
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={answered}
                    onClick={() => handleSelectOption(oi)}
                    className={`w-full min-h-[54px] text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${cls}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num text-xs w-7 h-7 rounded-lg border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 flex items-center justify-center shrink-0 font-bold">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {answered && isCorrectOpt && (
                      <CheckCircle2 className="w-5 h-5 text-[#20C7C9] shrink-0" />
                    )}
                    {answered && isChosen && !isCorrectOpt && (
                      <XCircle className="w-5 h-5 text-[#FF8B78] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div className="p-4 rounded-2xl bg-[#20C7C9]/10 dark:bg-[#062B3D]/80 border border-[#20C7C9]/35 space-y-2.5">
                <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                  Step-by-Step Solution
                </div>
                <p className="text-sm leading-relaxed">{q.explanations[language]}</p>
                {q.shortcutMethod && (
                  <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                    {q.shortcutMethod}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                {selectedOpt === null
                  ? 'Select one answer option to proceed'
                  : qIdx + 1 >= deck.length
                  ? 'Ready to evaluate your dive rewards'
                  : 'Answer logged — dive deeper!'}
              </div>
              {selectedOpt !== null && (
                <button
                  type="button"
                  disabled={submittingRun}
                  onClick={handleNextQuestion}
                  className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] font-extrabold text-sm cursor-pointer shadow-md"
                >
                  {submittingRun
                    ? 'Calculating Rewards...'
                    : qIdx + 1 >= deck.length
                    ? 'Claim Mission Rewards'
                    : 'Next Waypoint →'}
                </button>
              )}
            </div>
          </OceanGlassCard>
        ) : (
          <OceanGlassCard className="p-8 text-center">
            <p className="text-sm">No questions loaded for this mission.</p>
          </OceanGlassCard>
        )}

        {/* Confirm Exit Dialog */}
        {confirmExit && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
            <OceanGlassCard className="max-w-sm w-full p-6 space-y-4">
              <h3 className="font-display font-extrabold text-lg">Leave Current Dive?</h3>
              <p className="text-xs text-[#073B50] dark:text-[#8DE1D3]">
                Your current mission run won&apos;t be scored if you leave before completing all waypoints.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmExit(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 text-xs font-bold cursor-pointer"
                >
                  Keep Playing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmExit(false);
                    setActiveMission(null);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF8B78] text-[#062B3D] text-xs font-extrabold cursor-pointer"
                >
                  Exit to Map
                </button>
              </div>
            </OceanGlassCard>
          </div>
        )}
      </div>
    );
  }

  // ==================== 3. OCEAN QUEST ADVENTURE HUB ====================
  return (
    <div className="space-y-6">
      <FirstTimeTip
        storageKey="ocean_quest_intro_v1"
        title="Welcome to Ocean Quest — Interactive SSC CGL Adventure"
        body="Begin at Coral Bay (Untimed Beginner), defeat zone Guardians to unlock deeper waters up to the Ocean Champion Arena, collect Sea Crystals, and turn wrong answers into instant revision."
      />

      {/* Top Ocean Quest Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <OceanGlassCard className="p-4">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
            Unlocked Zones
          </div>
          <div className="font-mono-num text-xl font-extrabold mt-0.5">
            {unlockedLocationIds.size} / {OCEAN_LOCATIONS.length}
          </div>
          <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 truncate">
            Deepest: {deepestUnlockedLocation.name}
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-4">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
            Missions Cleared
          </div>
          <div className="font-mono-num text-xl font-extrabold mt-0.5">
            {oceanQuestProgress.completedMissions.length} / {publishedMissions.length}
          </div>
          <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80">
            {oceanQuestProgress.totalRuns} total dives
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-4">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] flex items-center gap-1">
            <Gem className="w-3.5 h-3.5 text-[#20C7C9]" />
            Sea Crystals
          </div>
          <div className="font-mono-num text-xl font-extrabold mt-0.5 text-[#075985] dark:text-[#55D6D0]">
            {oceanQuestProgress.crystals}
          </div>
          <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80">
            {profile.coins} Gold Coins
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-4">
          <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
            Quest Accuracy
          </div>
          <div className="font-mono-num text-xl font-extrabold mt-0.5">
            {oceanQuestProgress.totalAttempted > 0
              ? Math.round(
                  (oceanQuestProgress.totalCorrect / oceanQuestProgress.totalAttempted) * 100
                )
              : 0}
            %
          </div>
          <div className="text-[11px] font-mono-num text-[#073B50]/75 dark:text-[#8DE1D3]/80">
            {oceanQuestProgress.totalQuestXp} Quest XP
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-4 col-span-2 lg:col-span-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowRevisionDrawer(true)}
            className="text-left cursor-pointer min-w-0"
          >
            <div className="text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
              Mistake Revision
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-0.5">
              {oceanQuestProgress.wrongQuestionIds.length} Qs
            </div>
            <div className="text-[11px] font-bold text-[#075985] dark:text-[#55D6D0] hover:underline">
              Review Queue →
            </div>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 flex items-center justify-center shrink-0 cursor-pointer"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-[#FF8B78]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#20C7C9]" />
            )}
          </button>
        </OceanGlassCard>
      </div>

      {/* Daily Tide Challenge Spotlight Banner */}
      {dailyMission && (
        <div className="rounded-3xl ocean-gradient-hero text-white p-5 sm:p-6 border border-[#20C7C9]/35 ocean-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF8B78]/20 border border-[#FF8B78]/60 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-[#FF8B78]" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#55D6D0]">
                DAILY TIDE CHALLENGE · ONCE PER DAY BONUS
              </div>
              <h2 className="font-display text-lg font-extrabold">{dailyMission.title}</h2>
              <p className="text-xs text-[#8DE1D3]">
                {dailyMission.questionCount} curated SSC CGL questions · +{dailyMission.xpReward} XP · +
                {dailyMission.crystalReward} Sea Crystals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBriefingMission(dailyMission)}
            className="min-h-[46px] inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] font-extrabold text-xs sm:text-sm cursor-pointer shadow-lg"
          >
            {dailyAlreadyClaimed ? 'Replay Daily Tide' : 'Start Daily Challenge'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive 9-Location Underwater Adventure Map */}
      <OceanGlassCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#20C7C9]" />
              Ocean Quest World Map (9 Depth Zones)
            </h2>
            <p className="text-xs text-[#075985] dark:text-[#8DE1D3] mt-0.5">
              Tap any underwater zone to inspect its missions, difficulty tier, and Guardian requirements.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]">
              1–3 Beginner
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#38BDF8]/15 text-[#0369A1] dark:text-[#7DD3FC]">
              4–6 Intermediate
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]">
              7–9 Advanced
            </span>
          </div>
        </div>

        {/* Bathymetric Map Canvas */}
        <div className="relative rounded-3xl overflow-hidden border border-[#20C7C9]/40 min-h-[340px] sm:min-h-[380px] bg-[#062B3D]">
          <img
            src={MAP_BACKDROP_IMG}
            alt="Ocean Quest Underwater World Map"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#075985]/35 via-[#073B50]/55 to-[#062B3D]/90" />

          {/* Connecting Depth Route SVG */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <polyline
              fill="none"
              stroke="#55D6D0"
              strokeOpacity="0.45"
              strokeWidth="0.6"
              strokeDasharray="1.8 1.4"
              points={OCEAN_LOCATIONS.map((l) => `${l.mapX},${l.mapY}`).join(' ')}
            />
          </svg>

          {/* Animated Submarine Marker at Deepest Unlocked Zone */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-700"
            style={{
              left: `${deepestUnlockedLocation.mapX}%`,
              top: `${Math.max(8, deepestUnlockedLocation.mapY - 9)}%`,
            }}
          >
            <img
              src={SUBMARINE_IMG}
              alt="Explorer Submarine"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border-2 border-[#55D6D0] shadow-lg animate-bounce object-cover"
            />
          </div>

          {/* 9 Interactive Location Nodes */}
          {OCEAN_LOCATIONS.map((loc) => {
            const status = getLocationUnlockStatus(loc.locationId, oceanQuestProgress, publishedMissions);
            const isSelected = loc.locationId === activeLocation.locationId;
            const locMissions = publishedMissions.filter(
              (m) => m.locationId === loc.locationId && m.mode !== 'daily-challenge'
            );
            const clearedCount = locMissions.filter((m) =>
              oceanQuestProgress.completedMissions.includes(m.missionId)
            ).length;

            return (
              <button
                key={loc.locationId}
                type="button"
                onClick={() => {
                  soundFX.playBubble();
                  setModeFilter('all');
                  setSelectedLocId(loc.locationId);
                }}
                style={{ left: `${loc.mapX}%`, top: `${loc.mapY}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 min-h-[44px] px-2.5 py-1.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md ${
                  isSelected
                    ? 'bg-[#20C7C9] text-[#062B3D] border-white scale-105 shadow-xl'
                    : status.unlocked
                    ? 'bg-[#073B50]/90 text-white border-[#55D6D0]/70 hover:border-white'
                    : 'bg-[#062B3D]/85 text-[#8DE1D3]/75 border-white/20 hover:border-white/45'
                }`}
              >
                <span className="font-mono-num text-[11px] font-extrabold w-5 h-5 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  {status.unlocked ? loc.order : <Lock className="w-3 h-3" />}
                </span>
                <div className="hidden sm:block leading-tight">
                  <div className="text-[11px] font-extrabold whitespace-nowrap">{loc.name}</div>
                  <div className="text-[9px] font-mono-num opacity-85">
                    {loc.depthMeters}m · {clearedCount}/{locMissions.length}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile/Quick Depth Zone Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {OCEAN_LOCATIONS.map((loc) => {
            const unlocked = unlockedLocationIds.has(loc.locationId);
            const isSelected = loc.locationId === activeLocation.locationId;
            return (
              <button
                key={loc.locationId}
                type="button"
                onClick={() => {
                  setModeFilter('all');
                  setSelectedLocId(loc.locationId);
                }}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                    : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                {unlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-[#20C7C9]" />
                ) : (
                  <Lock className="w-3.5 h-3.5 opacity-60" />
                )}
                {loc.order}. {loc.name}
              </button>
            );
          })}
        </div>
      </OceanGlassCard>

      {/* Mode Filter Bar (Covers All 6 Game Modes) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setModeFilter('all')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
            modeFilter === 'all'
              ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
              : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#073B50]/80'
          }`}
        >
          Zone Missions ({activeLocation.name})
        </button>
        {(
          [
            'treasure-hunt',
            'submarine-exploration',
            'crystal-rush',
            'boss-battle',
            'subject-mission',
          ] as OceanQuestMode[]
        ).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModeFilter(m)}
            className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
              modeFilter === m
                ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#073B50]/80'
            }`}
          >
            {OCEAN_MODE_META[m].shortLabel}
          </button>
        ))}
      </div>

      {/* Selected Zone Header + Missions Grid */}
      <div className="space-y-4">
        {modeFilter === 'all' && (
          <OceanGlassCard className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${DIFFICULTY_STYLES[activeLocation.difficulty].border} ${DIFFICULTY_STYLES[activeLocation.difficulty].bg} ${DIFFICULTY_STYLES[activeLocation.difficulty].text}`}
                >
                  {DIFFICULTY_STYLES[activeLocation.difficulty].label} Tier
                </span>
                <span className="font-mono-num text-xs font-bold text-[#075985] dark:text-[#8DE1D3]">
                  Depth {activeLocation.depthMeters}m
                </span>
              </div>
              <h3 className="font-display text-xl font-extrabold">
                {activeLocation.order}. {activeLocation.name} — {activeLocation.subtitle}
              </h3>
              <p className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3]">
                {activeLocation.description}
              </p>
            </div>
            {!unlockedLocationIds.has(activeLocation.locationId) && (
              <div className="p-3.5 rounded-2xl bg-[#FF8B78]/12 border border-[#FF8B78]/45 text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78] flex items-center gap-2 max-w-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {
                    getLocationUnlockStatus(
                      activeLocation.locationId,
                      oceanQuestProgress,
                      publishedMissions
                    ).reason
                  }
                </span>
              </div>
            )}
          </OceanGlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGlobalMissions.map((mission) => {
            const unlockState = getMissionUnlockStatus(mission, oceanQuestProgress, publishedMissions);
            const cleared = oceanQuestProgress.completedMissions.includes(mission.missionId);
            const stars = oceanQuestProgress.missionStars[mission.missionId] || 0;
            const bestScore = oceanQuestProgress.missionBestScores[mission.missionId] || 0;
            const diffStyle = DIFFICULTY_STYLES[mission.difficulty];
            const loc = OCEAN_LOCATIONS.find((l) => l.locationId === mission.locationId);

            return (
              <OceanGlassCard
                key={mission.missionId}
                className={`p-5 flex flex-col justify-between gap-4 border ${
                  !unlockState.unlocked ? 'opacity-80' : ''
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${diffStyle.border} ${diffStyle.bg} ${diffStyle.text}`}
                    >
                      {diffStyle.label} · {OCEAN_MODE_META[mission.mode].shortLabel}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= stars
                              ? 'text-[#F59E0B] fill-[#F59E0B]'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-extrabold text-base flex items-center gap-2">
                      {mission.isBoss && <Shield className="w-4 h-4 text-[#FF8B78]" />}
                      {mission.title}
                    </h4>
                    <p className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3] mt-1">
                      {mission.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-num text-[#075985] dark:text-[#8DE1D3]">
                    <span>{loc?.name}</span>
                    <span>· {getSubjectDisplayName(mission.subject)}</span>
                    <span>· {mission.questionCount} Qs</span>
                    <span>
                      · {mission.timeLimitSec > 0 ? formatClock(mission.timeLimitSec) : 'Untimed'}
                    </span>
                    <span>· {mission.hintLimit} Hints</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15">
                  <div className="text-xs font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                    +{mission.xpReward} XP · +{mission.crystalReward} Crystals
                    {bestScore > 0 && (
                      <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]">
                        Best: {bestScore} {cleared ? '· Cleared' : ''}
                      </div>
                    )}
                  </div>

                  {unlockState.unlocked ? (
                    <button
                      type="button"
                      onClick={() => setBriefingMission(mission)}
                      className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#075985] hover:bg-[#062B3D] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                    >
                      {cleared ? 'Replay Dive' : 'Briefing & Dive'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="text-[11px] font-semibold text-[#9A2D1F] dark:text-[#FF8B78] inline-flex items-center gap-1.5 max-w-[220px]">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>{unlockState.reason}</span>
                    </div>
                  )}
                </div>
              </OceanGlassCard>
            );
          })}
        </div>
      </div>

      {/* Ocean Leaderboard & Recent Dive History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OceanGlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#20C7C9]" />
              Top Ocean Explorers
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
            >
              Full Rankings →
            </button>
          </div>
          <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
            {leaderboard.slice(0, 5).map((row, idx) => (
              <div
                key={row.uid}
                className={`py-2.5 flex items-center justify-between text-xs ${
                  row.isCurrentUser ? 'font-extrabold text-[#075985] dark:text-[#55D6D0]' : ''
                }`}
              >
                <span className="truncate">
                  #{idx + 1} · {row.displayName}
                </span>
                <span className="font-mono-num">
                  {row.xp.toLocaleString()} XP · {row.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </OceanGlassCard>

        <OceanGlassCard className="p-5 space-y-3">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Anchor className="w-4 h-4 text-[#20C7C9]" />
            Recent Ocean Quest Dives
          </h3>
          {recentOceanSessions.length === 0 ? (
            <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
              Complete your first dive in Coral Bay to record your expedition log.
            </p>
          ) : (
            <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
              {recentOceanSessions.map((gs) => (
                <div key={gs.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold">{gs.gameTitle}</div>
                    <div className="text-[#075985] dark:text-[#8DE1D3]">
                      Accuracy {gs.accuracy}% · Combo {gs.comboMax}x
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                    +{gs.xpEarned} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </OceanGlassCard>
      </div>

      {/* Mission Briefing Modal */}
      {briefingMission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <OceanGlassCard className="max-w-lg w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${DIFFICULTY_STYLES[briefingMission.difficulty].border} ${DIFFICULTY_STYLES[briefingMission.difficulty].bg} ${DIFFICULTY_STYLES[briefingMission.difficulty].text}`}
                >
                  {DIFFICULTY_STYLES[briefingMission.difficulty].label} ·{' '}
                  {OCEAN_MODE_META[briefingMission.mode].label}
                </span>
                <h3 className="font-display text-xl font-extrabold mt-2">
                  {briefingMission.title}
                </h3>
                <p className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3] mt-1">
                  {briefingMission.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBriefingMission(null)}
                className="min-h-[36px] min-w-[36px] rounded-xl border border-[#8DE1D3]/50 flex items-center justify-center cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#20C7C9]/10 border border-[#20C7C9]/30 text-xs text-[#075985] dark:text-[#55D6D0]">
              <strong>Mission Mechanic: </strong>
              {OCEAN_MODE_META[briefingMission.mode].mechanicNote}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D]">
                <div className="text-[#075985] dark:text-[#8DE1D3]">Subject</div>
                <div className="font-bold mt-0.5 truncate">
                  {getSubjectDisplayName(briefingMission.subject)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D]">
                <div className="text-[#075985] dark:text-[#8DE1D3]">Questions &amp; Time</div>
                <div className="font-mono-num font-bold mt-0.5">
                  {briefingMission.questionCount} Qs ·{' '}
                  {briefingMission.timeLimitSec > 0
                    ? formatClock(briefingMission.timeLimitSec)
                    : 'Untimed'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D]">
                <div className="text-[#075985] dark:text-[#8DE1D3]">Pass Rule &amp; Hints</div>
                <div className="font-mono-num font-bold mt-0.5">
                  {briefingMission.minAccuracyPct}% · {briefingMission.hintLimit} Hints
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono-num">
              <div className="flex items-center gap-3 text-[#075985] dark:text-[#55D6D0] font-bold">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />+{briefingMission.xpReward} XP
                </span>
                <span className="inline-flex items-center gap-1">
                  <Coins className="w-4 h-4" />+{briefingMission.coinReward} Coins
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gem className="w-4 h-4" />+{briefingMission.crystalReward} Crystals
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBriefingMission(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startMission(briefingMission)}
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer shadow-lg"
              >
                <Zap className="w-4 h-4" />
                Launch Dive Now
              </button>
            </div>
          </OceanGlassCard>
        </div>
      )}

      {/* Wrong Questions Revision Modal */}
      {showRevisionDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <OceanGlassCard className="max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#20C7C9]" />
                Ocean Quest Mistake Revision ({wrongRevisionQuestions.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionDrawer(false)}
                className="min-h-[36px] min-w-[36px] rounded-xl border border-[#8DE1D3]/50 flex items-center justify-center cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {wrongRevisionQuestions.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#075985] dark:text-[#8DE1D3]">
                No pending mistakes in your Ocean Quest revision queue. Great accuracy!
              </div>
            ) : (
              <div className="space-y-3">
                {wrongRevisionQuestions.map((wq) => (
                  <div
                    key={wq.id}
                    className="p-4 rounded-2xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D]/70 text-xs space-y-1.5"
                  >
                    <div className="font-bold text-[#075985] dark:text-[#55D6D0]">
                      {SUBJECT_NAMES[wq.subject][language]} · {wq.topic} ·{' '}
                      {wq.sourceType === 'PYQ' ? `Official PYQ ${wq.year}` : 'Practice'}
                    </div>
                    <div className="font-semibold text-sm text-[#062B3D] dark:text-[#F3FAFA]">
                      {wq.questionEn}
                    </div>
                    <div className="font-bold text-[#075985] dark:text-[#55D6D0]">
                      Answer: {String.fromCharCode(65 + wq.correctIndex)} —{' '}
                      {wq.optionsEn[wq.correctIndex]}
                    </div>
                    <p className="text-[#073B50]/85 dark:text-[#8DE1D3]">
                      {wq.explanations[language]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </OceanGlassCard>
        </div>
      )}
    </div>
  );
};
