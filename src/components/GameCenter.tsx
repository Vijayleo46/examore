import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Flame,
  Gamepad2,
  Heart,
  KeyRound,
  Shield,
  Swords,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { GameModeId, Question } from '../types/examverse';
import { soundFX } from '../lib/sound';

const TREASURE_MAP_IMG = '/src/assets/images/game_treasure_hunt_map_1794828673770.jpg';
const ESCAPE_VAULT_IMG = '/src/assets/images/game_escape_room_vault_1794828674327.jpg';

interface GameDef {
  id: GameModeId;
  title: string;
  subtitle: string;
  rewardHint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GAMES: GameDef[] = [
  {
    id: 'quiz-battle',
    title: 'SSC Quiz Battle',
    subtitle: 'Timed MCQs with combo multipliers and escalating rounds.',
    rewardHint: 'Up to 180 XP · 60 Coins',
    icon: Zap,
  },
  {
    id: 'maths-speed',
    title: 'Maths Speed Challenge',
    subtitle: '60-second Quantitative Aptitude sprint against the clock.',
    rewardHint: 'Speed Bonus XP',
    icon: Timer,
  },
  {
    id: 'escape-room',
    title: 'Reasoning Escape Room',
    subtitle: 'Unlock 5 cipher vault doors using coding-decoding & logic.',
    rewardHint: '150 XP + Genius Badge',
    icon: KeyRound,
  },
  {
    id: 'treasure-hunt',
    title: 'Knowledge Treasure Hunt',
    subtitle: 'Explore 5 fortress checkpoints across the ExamVerse archipelago.',
    rewardHint: '160 XP · 80 Coins',
    icon: Compass,
  },
  {
    id: 'exam-survival',
    title: 'Exam Survival',
    subtitle: '3 lives only — survive escalating rounds to beat the Final Boss.',
    rewardHint: 'Up to 220 XP',
    icon: Shield,
  },
  {
    id: 'vocab-challenge',
    title: 'English Vocab Challenge',
    subtitle: 'Synonyms, antonyms, idioms, and error spotting blitz.',
    rewardHint: '120 XP + Wizard Progress',
    icon: Gamepad2,
  },
  {
    id: 'daily-challenge',
    title: 'Daily 10Q Challenge',
    subtitle: 'Today’s curated 10-question sprint for your daily streak bonus.',
    rewardHint: 'Streak Bonus + 150 XP',
    icon: Flame,
  },
  {
    id: 'duel-arena',
    title: 'Duel Arena (1v1 Bot)',
    subtitle: 'Real-time paced 1v1 quiz battle against an adaptive SSC Scholar.',
    rewardHint: 'Victory Bonus 140 XP',
    icon: Swords,
  },
];

const TREASURE_NODES = [
  { name: 'Library Isle', top: '42%', left: '16%' },
  { name: 'Oracle Grounds', top: '76%', left: '28%' },
  { name: 'Academy Peak', top: '48%', left: '50%' },
  { name: 'Fort of Enlightenment', top: '72%', left: '70%' },
  { name: 'Citadel Summit', top: '26%', left: '80%' },
];

export const GameCenter: React.FC<{ initialMode?: GameModeId | null }> = ({
  initialMode = null,
}) => {
  const {
    questions,
    language,
    recordGameSession,
    recordQuestionResult,
    gameSessions,
  } = useApp();

  const t = UI_TEXT[language];
  const [activeGame, setActiveGame] = useState<GameModeId | null>(initialMode);
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [rivalScore, setRivalScore] = useState(0);

  useEffect(() => {
    if (initialMode) {
      startGame(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  const deck: Question[] = useMemo(() => {
    if (!activeGame) return [];
    let pool = [...questions];
    if (activeGame === 'maths-speed') {
      pool = questions.filter((q) => q.subject === 'quant');
    } else if (activeGame === 'escape-room') {
      pool = questions.filter((q) => q.subject === 'reasoning');
    } else if (activeGame === 'vocab-challenge') {
      pool = questions.filter((q) => q.subject === 'english');
    }
    while (pool.length < 6 && questions.length > 0) {
      pool = [...pool, ...questions];
    }
    if (activeGame === 'daily-challenge') {
      return pool.slice(0, Math.min(10, pool.length));
    }
    if (activeGame === 'escape-room' || activeGame === 'treasure-hunt') {
      return pool.slice(0, 5);
    }
    return pool.slice(0, 6);
  }, [activeGame, questions]);

  const startGame = (mode: GameModeId) => {
    setActiveGame(mode);
    setRoundIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setLives(3);
    setTimeLeft(mode === 'maths-speed' ? 60 : mode === 'daily-challenge' ? 120 : 90);
    setSelectedOpt(null);
    setGameOver(false);
    setRivalScore(0);
  };

  useEffect(() => {
    if (!activeGame || gameOver) return;
    if (
      activeGame !== 'maths-speed' &&
      activeGame !== 'quiz-battle' &&
      activeGame !== 'daily-challenge' &&
      activeGame !== 'duel-arena'
    ) {
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame(score, correctCount, answeredCount, maxCombo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame, gameOver]);

  const finishGame = (
    finalScore: number,
    finalCorrect: number,
    finalAnswered: number,
    bestCombo: number
  ) => {
    if (gameOver || !activeGame) return;
    setGameOver(true);
    soundFX.playVictory();
    const def = GAMES.find((g) => g.id === activeGame)!;
    const accuracy = finalAnswered > 0 ? Math.round((finalCorrect / finalAnswered) * 100) : 0;
    const xpEarned = Math.max(25, Math.round(finalScore / 2) + finalCorrect * 15);
    const coinsEarned = Math.max(10, finalCorrect * 8 + bestCombo * 3);
    recordGameSession(activeGame, def.title, finalScore, xpEarned, coinsEarned, accuracy, bestCombo);
  };

  const handleAnswer = (optIdx: number) => {
    if (selectedOpt !== null || gameOver) return;
    const q = deck[roundIdx];
    if (!q) return;
    setSelectedOpt(optIdx);

    const isCorrect = optIdx === q.correctIndex;
    const nextAnswered = answeredCount + 1;
    setAnsweredCount(nextAnswered);
    recordQuestionResult(q.subject, isCorrect, 10);

    let nextScore = score;
    let nextCorrect = correctCount;
    let nextCombo = combo;
    let nextMaxCombo = maxCombo;
    let nextLives = lives;

    if (isCorrect) {
      soundFX.playCorrect();
      nextCombo = combo + 1;
      nextMaxCombo = Math.max(maxCombo, nextCombo);
      const multiplier = Math.min(4, 1 + Math.floor(nextCombo / 2));
      nextScore = score + 25 * multiplier;
      nextCorrect = correctCount + 1;
    } else {
      soundFX.playWrong();
      nextCombo = 0;
      if (activeGame === 'exam-survival') {
        nextLives = lives - 1;
        setLives(nextLives);
      }
    }

    if (activeGame === 'duel-arena') {
      const botGotRight = Math.random() > 0.35;
      if (botGotRight) setRivalScore((r) => r + 30);
    }

    setScore(nextScore);
    setCombo(nextCombo);
    setMaxCombo(nextMaxCombo);
    setCorrectCount(nextCorrect);

    if (activeGame === 'exam-survival' && nextLives <= 0) {
      setTimeout(() => finishGame(nextScore, nextCorrect, nextAnswered, nextMaxCombo), 850);
    }
  };

  const handleNextRound = () => {
    if (roundIdx + 1 >= deck.length) {
      finishGame(score, correctCount, answeredCount, maxCombo);
    } else {
      setRoundIdx((i) => i + 1);
      setSelectedOpt(null);
    }
  };

  if (!activeGame) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.gameCenterTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {t.gameCenterSub}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAMES.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-blue-600 dark:hover:border-amber-400 transition-colors"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#0A192F] dark:bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="font-display font-bold text-base">{g.title}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {g.subtitle}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-num text-amber-600 dark:text-amber-400">
                    {g.rewardHint}
                  </span>
                  <button
                    type="button"
                    onClick={() => startGame(g.id)}
                    className="px-3.5 py-2 rounded-lg bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
                  >
                    Play
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {gameSessions.length > 0 && (
          <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="font-display font-bold text-base mb-4">Recent Arena Runs</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {gameSessions.slice(0, 5).map((gs) => (
                <div key={gs.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{gs.gameTitle}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      · {gs.accuracy}% accuracy · Max {gs.comboMax}x combo
                    </span>
                  </div>
                  <span className="font-mono-num text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {gs.score} pts · +{gs.xpEarned} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const gameDef = GAMES.find((g) => g.id === activeGame)!;
  const currentQ = deck[roundIdx];

  if (gameOver) {
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const duelWon = activeGame === 'duel-arena' && score >= rivalScore;
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
        <div>
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {gameDef.title} Complete
          </div>
          <h2 className="font-display text-2xl font-extrabold mt-1">
            {activeGame === 'duel-arena'
              ? duelWon
                ? 'Victory in the Duel Arena'
                : 'Close Duel — Train & Rematch'
              : 'Mission Accomplished'}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
            <div className="font-mono-num text-xl font-bold">{score}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
            <div className="font-mono-num text-xl font-bold">{accuracy}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Max Combo</div>
            <div className="font-mono-num text-xl font-bold">{maxCombo}x</div>
          </div>
        </div>

        {activeGame === 'duel-arena' && (
          <div className="text-sm font-mono-num text-slate-600 dark:text-slate-300">
            You: {score} pts vs Rival Bot: {rivalScore} pts
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium cursor-pointer"
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => startGame(activeGame)}
            className="px-6 py-2.5 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-sm font-semibold cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Arena HUD */}
      <div className="bg-[#0A192F] text-white rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="p-2 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer"
            aria-label="Exit game"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="font-display font-bold text-base">{gameDef.title}</div>
            <div className="text-xs text-slate-300 font-mono-num">
              Stage {roundIdx + 1} / {deck.length} · Score: {score} · Combo: {combo}x
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono-num text-sm">
          {activeGame === 'exam-survival' && (
            <div className="flex items-center gap-1 text-rose-400">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-4 h-4 ${idx < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
                />
              ))}
            </div>
          )}
          {activeGame === 'duel-arena' && (
            <span className="text-xs text-amber-300">Rival Bot: {rivalScore} pts</span>
          )}
          {(activeGame === 'maths-speed' ||
            activeGame === 'quiz-battle' ||
            activeGame === 'daily-challenge' ||
            activeGame === 'duel-arena') && (
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
              <Timer className="w-4 h-4" /> {timeLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Special Visual Stage for Escape Room & Treasure Hunt */}
      {activeGame === 'escape-room' && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-52 sm:h-64">
          <img
            src={ESCAPE_VAULT_IMG}
            alt="Reasoning Escape Room Vault"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081221]/90 via-[#081221]/30 to-transparent flex items-end justify-between p-5 text-white">
            <div>
              <div className="text-xs text-amber-300 font-mono-num">
                CIPHER DOOR {roundIdx + 1} OF {deck.length}
              </div>
              <div className="font-display font-bold text-lg">
                Crack the Reasoning Lock to Escape
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {deck.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < roundIdx
                      ? 'bg-emerald-400'
                      : i === roundIdx
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeGame === 'treasure-hunt' && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56 sm:h-72">
          <img
            src={TREASURE_MAP_IMG}
            alt="ExamVerse Treasure Hunt Map"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          {TREASURE_NODES.map((node, idx) => {
            const unlocked = idx < roundIdx;
            const current = idx === roundIdx;
            return (
              <div
                key={node.name}
                style={{ top: node.top, left: node.left }}
                className={`-translate-x-1/2 -translate-y-1/2 absolute px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-transform ${
                  current
                    ? 'bg-amber-400 text-[#081221] border-white scale-110 shadow-lg'
                    : unlocked
                    ? 'bg-emerald-600 text-white border-emerald-300'
                    : 'bg-[#081221]/85 text-slate-300 border-slate-600'
                }`}
              >
                {idx + 1}. {node.name}
              </div>
            );
          })}
        </div>
      )}

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {SUBJECT_NAMES[currentQ.subject][language]} · {currentQ.topic} · {currentQ.difficulty}
            {activeGame === 'exam-survival' && roundIdx === deck.length - 1 ? ' · FINAL BOSS QUESTION' : ''}
          </div>

          <p className="text-base sm:text-lg font-medium leading-relaxed">
            {currentQ.questionEn}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.optionsEn.map((opt, oi) => {
              const answered = selectedOpt !== null;
              let cls =
                'border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-amber-400';
              if (answered) {
                if (oi === currentQ.correctIndex) {
                  cls =
                    'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold';
                } else if (selectedOpt === oi) {
                  cls =
                    'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300';
                }
              }
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={answered}
                  onClick={() => handleAnswer(oi)}
                  className={`text-left px-4 py-3.5 rounded-xl border text-sm transition-colors cursor-pointer ${cls}`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              );
            })}
          </div>

          {selectedOpt !== null && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {currentQ.explanations[language]}
              </p>
              <button
                type="button"
                onClick={handleNextRound}
                className="px-5 py-2.5 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold shrink-0 cursor-pointer"
              >
                {roundIdx + 1 >= deck.length ? 'Finish & Collect Rewards' : 'Next Stage →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
