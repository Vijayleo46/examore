import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Bot,
  CheckCircle2,
  Gamepad2,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { GameModeId, PracticeSubView, Question, SubjectId } from '../types/examverse';
import { soundFX } from '../lib/sound';
import { GameCenter } from './GameCenter';
import { PyqLibrary } from './PyqLibrary';
import { FirstTimeTip, OceanGlassCard } from './OceanTheme';

interface PracticeCenterProps {
  subView: PracticeSubView;
  setSubView: (v: PracticeSubView) => void;
  gameInitialMode?: GameModeId | null;
}

export const PracticeCenter: React.FC<PracticeCenterProps> = ({
  subView,
  setSubView,
  gameInitialMode = null,
}) => {
  const {
    language,
    questions,
    revisionListIds,
    recordQuestionResult,
    openTutorWithPrompt,
    addAdminQuestion,
    isAdmin,
  } = useApp();

  const t = UI_TEXT[language];
  const [practiceSubject, setPracticeSubject] = useState<SubjectId>('quant');
  const [practiceTopic, setPracticeTopic] = useState<string>('all');
  const [revisionOnly, setRevisionOnly] = useState(false);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    questions
      .filter((q) => (isAdmin || q.isPublished !== false) && q.subject === practiceSubject)
      .forEach((q) => {
        if (q.topic) set.add(q.topic);
      });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [questions, practiceSubject, isAdmin]);

  const practicePool = useMemo(
    () =>
      questions.filter((q) => {
        if (!isAdmin && q.isPublished === false) return false;
        if (q.subject !== practiceSubject) return false;
        if (practiceTopic !== 'all' && q.topic !== practiceTopic) return false;
        if (revisionOnly && !revisionListIds.includes(q.id)) return false;
        return true;
      }),
    [questions, practiceSubject, practiceTopic, revisionOnly, revisionListIds, isAdmin]
  );

  const handleGenerateAiPractice = async () => {
    setGeneratingAI(true);
    setAiGenError(null);
    try {
      const res = await fetch('/api/ai/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: SUBJECT_NAMES[practiceSubject].en,
          topic: practiceSubject === 'quant' ? 'Percentage & Profit Loss' : 'High-Yield SSC CGL',
          difficulty: 'Medium',
          language,
          count: 2,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not generate new practice questions right now.');
      }
      const data = await res.json();
      const generated: Question[] = (data.questions || []).map(
        (
          item: {
            questionEn: string;
            optionsEn: [string, string, string, string];
            correctIndex: number;
            explanation: string;
          },
          i: number
        ) => ({
          id: `ai-q-${Date.now()}-${i}`,
          subject: practiceSubject,
          topic: 'Smart Practice Drill',
          year: 2026,
          shift: 'Practice Pattern',
          tier: 'Tier 1',
          difficulty: 'Medium',
          sourceType: 'AI_GENERATED',
          sourceLabel: 'Smart Practice Question',
          isVerified: false,
          isPublished: true,
          questionEn: item.questionEn,
          optionsEn: item.optionsEn.slice(0, 4) as [string, string, string, string],
          correctIndex: Math.min(3, Math.max(0, Number(item.correctIndex) || 0)),
          explanations: {
            en: item.explanation,
            ml: item.explanation,
            hi: item.explanation,
            ta: item.explanation,
          },
        })
      );
      for (const q of generated) {
        await addAdminQuestion(q, false);
      }
    } catch (err) {
      setAiGenError(
        err instanceof Error ? err.message : 'Unable to fetch extra practice questions.'
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const tabs: Array<{
    id: PracticeSubView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'drills', label: t.practiceTab, icon: Target },
    { id: 'pyqs', label: t.pyqTab, icon: Bookmark },
    { id: 'games', label: t.gamesTab, icon: Gamepad2 },
  ];

  return (
    <div className="space-y-6">
      <FirstTimeTip
        storageKey="practice_center_v1"
        title="Practice One Question at a Time"
        body="Tap Topic Practice for calm single-question drills with instant explanations, browse Previous Year Questions (2016–2026), or play timed Learning Games."
      />

      {/* Practice Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 pb-4">
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#073B50]/80 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-1.5 rounded-2xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id)}
                className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  subView === tab.id
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D] shadow-sm'
                    : 'text-[#073B50] dark:text-[#8DE1D3] hover:text-[#062B3D] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. TOPIC PRACTICE (Single-Question Friendly Flow) */}
      {subView === 'drills' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['quant', 'reasoning', 'english', 'ga', 'computer', 'statistics'] as SubjectId[]).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setPracticeSubject(sub);
                    setPracticeTopic('all');
                    setPracticeIdx(0);
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    practiceSubject === sub
                      ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#073B50]/70 text-[#073B50] dark:text-[#8DE1D3]'
                  }`}
                >
                  {SUBJECT_NAMES[sub][language]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by topic"
                value={practiceTopic}
                onChange={(e) => {
                  setPracticeTopic(e.target.value);
                  setPracticeIdx(0);
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/90 dark:bg-[#073B50]/90 text-xs font-bold text-[#062B3D] dark:text-[#F3FAFA]"
              >
                <option value="all">All Topics ({availableTopics.length})</option>
                {availableTopics.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setRevisionOnly((v) => !v);
                  setPracticeIdx(0);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  revisionOnly
                    ? 'border-[#FF8B78] bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]'
                    : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#073B50]/70 text-[#075985] dark:text-[#8DE1D3]'
                }`}
              >
                Wrong-Answer Revision ({revisionListIds.length})
              </button>

              <button
                type="button"
                disabled={generatingAI}
                onClick={handleGenerateAiPractice}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#20C7C9] text-[#075985] dark:text-[#55D6D0] text-xs font-bold hover:bg-[#20C7C9]/10 disabled:opacity-50 cursor-pointer"
              >
                {generatingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                More Practice Questions
              </button>
            </div>
          </div>

          {aiGenError && (
            <div className="p-4 rounded-2xl border border-[#FF8B78]/50 bg-[#FF8B78]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#062B3D] dark:text-[#F3FAFA] font-medium">{aiGenError}</span>
              <button
                type="button"
                onClick={handleGenerateAiPractice}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#075985] text-white font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {practicePool[practiceIdx] ? (
            (() => {
              const q = practicePool[practiceIdx];
              const chosen = practiceAnswers[q.id];
              const answered = chosen !== undefined;
              const pct = Math.round(((practiceIdx + 1) / practicePool.length) * 100);

              return (
                <OceanGlassCard className="p-6 sm:p-8 max-w-3xl space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                      <span>
                        {q.sourceLabel} · {q.topic} · {q.difficulty}
                      </span>
                      <span className="font-mono-num">
                        Question {practiceIdx + 1} of {practicePool.length}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#8DE1D3]/35 dark:bg-[#062B3D] overflow-hidden">
                      <div
                        className="h-full bg-[#20C7C9] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-base sm:text-lg font-semibold leading-relaxed">
                    {q.questionEn}
                  </p>

                  <div className="space-y-2.5">
                    {q.optionsEn.map((opt, oi) => {
                      const isCorrectOpt = oi === q.correctIndex;
                      const isSelected = chosen === oi;
                      let cls =
                        'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]';
                      if (answered) {
                        if (isCorrectOpt) {
                          cls =
                            'border-[#20C7C9] bg-[#20C7C9]/15 dark:bg-[#20C7C9]/20 font-bold text-[#062B3D] dark:text-[#F3FAFA]';
                        } else if (isSelected) {
                          cls =
                            'border-[#FF8B78] bg-[#FF8B78]/15 dark:bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]';
                        }
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={answered}
                          onClick={() => {
                            setPracticeAnswers((prev) => ({ ...prev, [q.id]: oi }));
                            const ok = oi === q.correctIndex;
                            if (ok) soundFX.playCorrect();
                            else soundFX.playWrong();
                            recordQuestionResult(q.subject, ok, 20, q.id);
                          }}
                          className={`w-full min-h-[52px] text-left px-4 py-3 rounded-2xl border-2 text-sm transition-colors flex items-center justify-between gap-3 cursor-pointer ${cls}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono-num text-xs w-7 h-7 rounded-lg border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 flex items-center justify-center shrink-0 font-bold">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {answered && isCorrectOpt && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#075985] dark:text-[#55D6D0] shrink-0">
                              <CheckCircle2 className="w-4 h-4" /> Correct
                            </span>
                          )}
                          {answered && isSelected && !isCorrectOpt && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF8B78] shrink-0">
                              <XCircle className="w-4 h-4" /> Wrong
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className="p-4 rounded-2xl bg-[#20C7C9]/10 dark:bg-[#062B3D]/80 border border-[#20C7C9]/35 space-y-2.5">
                      <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                        {t.explanationLabel}
                      </div>
                      <p className="text-sm leading-relaxed">{q.explanations[language]}</p>
                      <button
                        type="button"
                        onClick={() =>
                          openTutorWithPrompt(
                            `Explain this SSC CGL question (${q.topic}) in simple steps: "${q.questionEn}"`
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Ask Examora AI for more help →
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={practiceIdx === 0}
                      onClick={() => setPracticeIdx((i) => Math.max(0, i - 1))}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticeIdx((i) => (i + 1) % practicePool.length)}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                    >
                      Next Question →
                    </button>
                  </div>
                </OceanGlassCard>
              );
            })()
          ) : (
            <OceanGlassCard className="p-8 text-center text-sm text-[#075985] dark:text-[#8DE1D3]">
              No practice questions available for this subject yet.
            </OceanGlassCard>
          )}
        </div>
      )}

      {/* 2. PREVIOUS YEAR QUESTIONS (FULL 2016-2026 LIBRARY) */}
      {subView === 'pyqs' && <PyqLibrary embedded />}

      {/* 3. LEARNING GAMES */}
      {subView === 'games' && <GameCenter initialMode={gameInitialMode} />}
    </div>
  );
};
