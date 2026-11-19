import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES } from '../data/i18n';
import { MockTestConfig, Question, SubjectId, TestAttempt } from '../types/examverse';
import { soundFX } from '../lib/sound';
import { OceanGlassCard, OceanProgressRing } from './OceanTheme';

interface MockTestEngineProps {
  test: MockTestConfig;
  onExit: () => void;
  customQuestions?: Question[];
}

type Stage = 'instructions' | 'exam' | 'result';
type ReviewFilter = 'all' | 'wrong' | 'unattempted';

interface SavedDraft {
  currentIdx: number;
  answers: Record<string, number>;
  markedReview: Record<string, boolean>;
  visited: Record<string, boolean>;
  secondsLeft: number;
}

export const MockTestEngine: React.FC<MockTestEngineProps> = ({ test, onExit, customQuestions }) => {
  const { questions, language, profile, recordMockAttempt, openTutorWithPrompt } = useApp();
  const draftKey = `examora_mock_draft_${test.id}_${profile.uid}`;

  const testQuestions = useMemo(() => {
    const pool = customQuestions && customQuestions.length > 0 ? [...customQuestions, ...questions] : questions;
    return test.questionIds
      .map((id) => pool.find((q) => q.id === id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));
  }, [test.questionIds, questions, customQuestions]);

  const [savedDraft] = useState<SavedDraft | null>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as SavedDraft) : null;
    } catch {
      return null;
    }
  });

  const [stage, setStage] = useState<Stage>('instructions');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedReview, setMarkedReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(test.durationMinutes * 60);
  const [submittedAttempt, setSubmittedAttempt] = useState<TestAttempt | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  // Auto-save exam draft locally
  useEffect(() => {
    if (stage !== 'exam') return;
    try {
      const payload: SavedDraft = {
        currentIdx,
        answers,
        markedReview,
        visited,
        secondsLeft,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [stage, currentIdx, answers, markedReview, visited, secondsLeft, draftKey]);

  useEffect(() => {
    if (stage !== 'exam') return;
    const q = testQuestions[currentIdx];
    if (q) {
      setVisited((prev) => ({ ...prev, [q.id]: true }));
    }
  }, [stage, currentIdx, testQuestions]);

  useEffect(() => {
    if (stage !== 'exam') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setCurrentIdx(Math.min(Math.max(0, savedDraft.currentIdx), Math.max(0, testQuestions.length - 1)));
    setAnswers(savedDraft.answers || {});
    setMarkedReview(savedDraft.markedReview || {});
    setVisited(savedDraft.visited || {});
    setSecondsLeft(Math.max(10, savedDraft.secondsLeft || test.durationMinutes * 60));
    setStage('exam');
  };

  const handleStartFresh = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setCurrentIdx(0);
    setAnswers({});
    setMarkedReview({});
    setVisited({});
    setSecondsLeft(test.durationMinutes * 60);
    setStage('exam');
  };

  const handleSubmitExam = () => {
    if (submitting || stage === 'result') return;
    setSubmitting(true);
    setShowConfirmModal(false);

    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    const breakdown: Record<SubjectId, { correct: number; total: number }> = {
      quant: { correct: 0, total: 0 },
      reasoning: { correct: 0, total: 0 },
      english: { correct: 0, total: 0 },
      ga: { correct: 0, total: 0 },
      computer: { correct: 0, total: 0 },
      statistics: { correct: 0, total: 0 },
    };

    const wrongQuestionIds: string[] = [];
    testQuestions.forEach((q) => {
      breakdown[q.subject].total += 1;
      const ans = answers[q.id];
      if (ans === undefined) {
        unattempted += 1;
      } else if (ans === q.correctIndex) {
        correct += 1;
        breakdown[q.subject].correct += 1;
      } else {
        wrong += 1;
        wrongQuestionIds.push(q.id);
      }
    });

    const rawScore = Number(
      (correct * test.marksPerCorrect - wrong * test.negativeMarking).toFixed(2)
    );
    const attemptedCount = correct + wrong;
    const accuracy = attemptedCount > 0 ? Math.round((correct / attemptedCount) * 100) : 0;
    const timeTakenSec = Math.max(5, test.durationMinutes * 60 - secondsLeft);

    const attempt: TestAttempt = {
      id: `att-${Date.now()}`,
      testId: test.id,
      testTitle: test.title,
      score: rawScore,
      maxScore: testQuestions.length * test.marksPerCorrect,
      correctCount: correct,
      wrongCount: wrong,
      unattemptedCount: unattempted,
      accuracy,
      timeTakenSec,
      subjectBreakdown: breakdown,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }

    setSubmittedAttempt(attempt);
    setStage('result');
    soundFX.playVictory();
    recordMockAttempt(attempt, wrongQuestionIds);
    setSubmitting(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedReview).filter(Boolean).length;
  const unattemptedCount = Math.max(0, testQuestions.length - answeredCount);

  if (stage === 'instructions') {
    return (
      <OceanGlassCard className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onExit}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[#075985] dark:text-[#8DE1D3] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Mock Tests
        </button>

        <div>
          <div className="text-xs font-bold text-[#20C7C9]">
            {test.category} · Guided Mock Test
          </div>
          <h2 className="font-display text-2xl font-extrabold mt-1">{test.title}</h2>
          <p className="text-sm text-[#073B50]/85 dark:text-[#8DE1D3] mt-2">{test.description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
          <div>
            <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Questions</div>
            <div className="font-mono-num text-lg font-extrabold">{testQuestions.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Duration</div>
            <div className="font-mono-num text-lg font-extrabold">{test.durationMinutes} min</div>
          </div>
          <div>
            <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Correct Mark</div>
            <div className="font-mono-num text-lg font-extrabold text-[#075985] dark:text-[#55D6D0]">
              +{test.marksPerCorrect}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Negative Mark</div>
            <div className="font-mono-num text-lg font-extrabold text-[#FF8B78]">
              −{test.negativeMarking}
            </div>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-[#073B50] dark:text-[#8DE1D3] list-disc pl-5">
          <li>Questions appear one at a time in official SSC CGL English.</li>
          <li>Your progress is auto-saved so you can resume if interrupted.</li>
          <li>Mark tricky questions for review and check all answers before submitting.</li>
          <li>After submitting, read step-by-step explanations and filter wrong answers.</li>
        </ul>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          {savedDraft && (
            <button
              type="button"
              onClick={handleResumeDraft}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-2 border-[#20C7C9] text-[#075985] dark:text-[#55D6D0] text-sm font-bold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Resume Saved Progress ({Object.keys(savedDraft.answers || {}).length} answered)
            </button>
          )}
          <button
            type="button"
            onClick={handleStartFresh}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-sm font-extrabold cursor-pointer"
          >
            {savedDraft ? 'Start Fresh' : 'Start Mock Test'}
          </button>
        </div>
      </OceanGlassCard>
    );
  }

  if (stage === 'result' && submittedAttempt) {
    const weakSubjects = (Object.keys(submittedAttempt.subjectBreakdown) as SubjectId[]).filter(
      (s) => {
        const b = submittedAttempt.subjectBreakdown[s];
        return b.total > 0 && b.correct / b.total < 0.6;
      }
    );

    const reviewItems = testQuestions
      .map((q, idx) => ({ q, idx, userAns: answers[q.id] }))
      .filter((item) => {
        if (reviewFilter === 'wrong') {
          return item.userAns !== undefined && item.userAns !== item.q.correctIndex;
        }
        if (reviewFilter === 'unattempted') {
          return item.userAns === undefined;
        }
        return true;
      });

    return (
      <div className="space-y-6">
        <OceanGlassCard className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 pb-5 mb-6">
            <div>
              <div className="text-xs font-bold text-[#20C7C9]">
                Mock Test Submitted & Saved
              </div>
              <h2 className="font-display text-2xl font-extrabold mt-1">
                {submittedAttempt.testTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
            >
              Done & Return
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6 items-center">
            <div>
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Total Score</div>
              <div className="font-mono-num text-2xl font-extrabold">
                {submittedAttempt.score} / {submittedAttempt.maxScore}
              </div>
            </div>
            <div>
              <OceanProgressRing
                percent={submittedAttempt.accuracy}
                size={64}
                strokeWidth={6}
                label="Accuracy"
              />
            </div>
            <div>
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Correct</div>
              <div className="font-mono-num text-2xl font-extrabold text-[#20C7C9]">
                {submittedAttempt.correctCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Wrong</div>
              <div className="font-mono-num text-2xl font-extrabold text-[#FF8B78]">
                {submittedAttempt.wrongCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Time Taken</div>
              <div className="font-mono-num text-2xl font-extrabold">
                {formatTime(submittedAttempt.timeTakenSec)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">Avg Speed</div>
              <div className="font-mono-num text-2xl font-extrabold text-[#075985] dark:text-[#55D6D0]">
                {submittedAttempt.correctCount + submittedAttempt.wrongCount > 0
                  ? Math.round(
                      submittedAttempt.timeTakenSec /
                        (submittedAttempt.correctCount + submittedAttempt.wrongCount)
                    )
                  : 0}
                s/Q
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div>
              <h3 className="font-display font-bold text-sm mb-3">Subject Breakdown</h3>
              <div className="space-y-2.5">
                {(Object.keys(submittedAttempt.subjectBreakdown) as SubjectId[]).map((sub) => {
                  const br = submittedAttempt.subjectBreakdown[sub];
                  if (br.total === 0) return null;
                  const pct = Math.round((br.correct / br.total) * 100);
                  return (
                    <div key={sub}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{SUBJECT_NAMES[sub][language]}</span>
                        <span className="font-mono-num">
                          {br.correct}/{br.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#8DE1D3]/30 dark:bg-[#062B3D] overflow-hidden">
                        <div className="h-full bg-[#20C7C9]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm">Next Step Recommendation</h3>
              <p className="text-sm text-[#073B50] dark:text-[#8DE1D3] leading-relaxed">
                {weakSubjects.length > 0
                  ? `Focus your next revision session on ${weakSubjects
                      .map((s) => SUBJECT_NAMES[s][language])
                      .join(', ')}. Review your wrong answers below or ask Examora AI for simple shortcuts.`
                  : 'Strong accuracy across all tested sections! Keep up the steady momentum.'}
              </p>
            </div>
          </div>
        </OceanGlassCard>

        {/* Detailed Solutions with Wrong-Answer Filter */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-extrabold">Answer Analysis & Explanations</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: `All (${testQuestions.length})` },
                { id: 'wrong', label: `Wrong (${submittedAttempt.wrongCount})` },
                { id: 'unattempted', label: `Skipped (${submittedAttempt.unattemptedCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReviewFilter(f.id as ReviewFilter)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    reviewFilter === f.id
                      ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                      : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#073B50]/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {reviewItems.map(({ q, idx, userAns }) => {
            const isCorrect = userAns === q.correctIndex;
            const isUnattempted = userAns === undefined;
            return (
              <OceanGlassCard key={q.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#075985] dark:text-[#8DE1D3]">
                  <span className="font-semibold">
                    Q{idx + 1} · {SUBJECT_NAMES[q.subject][language]} · {q.topic}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      isUnattempted
                        ? 'text-[#073B50]/70 dark:text-[#8DE1D3]/70'
                        : isCorrect
                        ? 'text-[#075985] dark:text-[#55D6D0]'
                        : 'text-[#D94E3B] dark:text-[#FF8B78]'
                    }`}
                  >
                    {isUnattempted ? (
                      <>
                        <HelpCircle className="w-4 h-4" /> Skipped
                      </>
                    ) : isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#20C7C9]" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-[#FF8B78]" /> Incorrect
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm font-semibold">{q.questionEn}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.optionsEn.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`px-3 py-2.5 rounded-xl border-2 ${
                        oi === q.correctIndex
                          ? 'border-[#20C7C9] bg-[#20C7C9]/15 font-bold'
                          : oi === userAns
                          ? 'border-[#FF8B78] bg-[#FF8B78]/15'
                          : 'border-[#8DE1D3]/35 dark:border-[#20C7C9]/20'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </div>
                  ))}
                </div>
                <div className="text-xs pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 flex flex-wrap items-center justify-between gap-3">
                  <span>{q.explanations[language]}</span>
                  <button
                    type="button"
                    onClick={() =>
                      openTutorWithPrompt(
                        `Explain this SSC CGL ${q.topic} question step by step: "${q.questionEn}" (Correct option: ${q.optionsEn[q.correctIndex]})`
                      )
                    }
                    className="text-[#075985] dark:text-[#55D6D0] font-bold hover:underline shrink-0 cursor-pointer"
                  >
                    Ask Examora AI →
                  </button>
                </div>
              </OceanGlassCard>
            );
          })}

          {reviewItems.length === 0 && (
            <OceanGlassCard className="p-8 text-center text-sm text-[#075985] dark:text-[#8DE1D3]">
              No questions in this filter category!
            </OceanGlassCard>
          )}
        </div>
      </div>
    );
  }

  const currentQ = testQuestions[currentIdx];
  if (!currentQ) {
    return (
      <OceanGlassCard className="p-8 max-w-xl mx-auto text-center space-y-4">
        <h3 className="font-display text-lg font-extrabold">Mock Test Questions Preparing</h3>
        <p className="text-sm text-[#073B50] dark:text-[#8DE1D3]">
          No questions are linked to this mock test yet. Please go back and try another test.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Mock Tests
        </button>
      </OceanGlassCard>
    );
  }

  const progressPct = Math.round(((currentIdx + 1) / testQuestions.length) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Question Stage */}
        <OceanGlassCard className="lg:col-span-8 p-6 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="space-y-3 pb-4 border-b border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-[#075985] dark:text-[#8DE1D3]">
                  Question {currentIdx + 1} of {testQuestions.length} ·{' '}
                  {SUBJECT_NAMES[currentQ.subject][language]} · {currentQ.topic}
                </div>
                <div className="inline-flex items-center gap-1.5 font-mono-num text-sm font-extrabold px-3 py-1 rounded-xl bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]">
                  <Clock className="w-4 h-4" />
                  {formatTime(secondsLeft)}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[#8DE1D3]/30 dark:bg-[#062B3D] overflow-hidden">
                <div
                  className="h-full bg-[#20C7C9] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="py-6 space-y-5">
              <p className="text-base sm:text-lg font-semibold leading-relaxed">
                {currentQ.questionEn}
              </p>

              <div className="space-y-2.5">
                {currentQ.optionsEn.map((opt, idx) => {
                  const selected = answers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: idx }))
                      }
                      className={`w-full min-h-[52px] text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors flex items-center gap-3 cursor-pointer ${
                        selected
                          ? 'border-[#20C7C9] bg-[#20C7C9]/15 dark:bg-[#20C7C9]/20 font-bold'
                          : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 hover:border-[#20C7C9]'
                      }`}
                    >
                      <span
                        className={`font-mono-num text-xs w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 font-bold ${
                          selected
                            ? 'bg-[#20C7C9] text-[#062B3D] border-[#20C7C9]'
                            : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMarkedReview((prev) => ({
                    ...prev,
                    [currentQ.id]: !prev[currentQ.id],
                  }))
                }
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  markedReview[currentQ.id]
                    ? 'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]'
                    : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {markedReview[currentQ.id] ? 'Marked' : 'Mark Review'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAnswers((prev) => {
                    const copy = { ...prev };
                    delete copy[currentQ.id];
                    return copy;
                  })
                }
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              {currentIdx < testQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(testQuestions.length - 1, i + 1))}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                >
                  Save & Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(true)}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </OceanGlassCard>

        {/* Question Palette */}
        <OceanGlassCard className="lg:col-span-4 p-6 flex flex-col justify-between gap-6">
          <div>
            <h3 className="font-display font-extrabold text-base mb-1">Question Navigator</h3>
            <p className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] mb-4">
              Answered: {answeredCount} · Review: {markedCount}
            </p>

            <div className="grid grid-cols-5 gap-2">
              {testQuestions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined;
                const isRev = markedReview[q.id];
                const isVis = visited[q.id];
                const isCur = idx === currentIdx;

                let style = 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25';
                if (isAns) {
                  style = 'bg-[#20C7C9] border-[#20C7C9] text-[#062B3D] font-extrabold';
                } else if (isRev) {
                  style = 'bg-[#FF8B78] border-[#FF8B78] text-[#062B3D] font-extrabold';
                } else if (isVis) {
                  style = 'bg-[#075985]/15 border-[#075985] text-[#075985] dark:text-[#8DE1D3]';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`min-h-[44px] rounded-xl border-2 font-mono-num text-xs font-bold transition-transform cursor-pointer ${style} ${
                      isCur ? 'ring-2 ring-[#075985] dark:ring-white scale-105' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold mt-5 pt-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#20C7C9]" /> Answered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-[#FF8B78]" /> Marked Review
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#075985] dark:text-[#8DE1D3]" /> Visited
              </span>
              <span className="inline-flex items-center gap-1.5 opacity-70">Not Visited</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs text-[#075985] dark:text-[#8DE1D3]">
              <AlertTriangle className="w-4 h-4 text-[#FF8B78] shrink-0" />
              <span>
                Marking: +{test.marksPerCorrect} correct, −{test.negativeMarking} wrong.
              </span>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowConfirmModal(true)}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-sm font-extrabold cursor-pointer"
            >
              Submit Mock Test
            </button>
          </div>
        </OceanGlassCard>
      </div>

      {/* Confirmation Dialog Before Submitting */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#062B3D]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <OceanGlassCard className="max-w-md w-full p-6 space-y-5">
            <h3 className="font-display text-lg font-extrabold">Submit Your Mock Test?</h3>
            <p className="text-xs text-[#073B50] dark:text-[#8DE1D3] leading-relaxed">
              Review your progress summary below before locking in your answers.
            </p>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[#20C7C9]/15 border border-[#20C7C9]/35">
                <div className="font-mono-num text-lg font-extrabold">{answeredCount}</div>
                <div className="text-[11px] font-semibold">Answered</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FF8B78]/15 border border-[#FF8B78]/35">
                <div className="font-mono-num text-lg font-extrabold">{markedCount}</div>
                <div className="text-[11px] font-semibold">Review</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#075985]/10 border border-[#8DE1D3]/45">
                <div className="font-mono-num text-lg font-extrabold">{unattemptedCount}</div>
                <div className="text-[11px] font-semibold">Skipped</div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitExam}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </OceanGlassCard>
        </div>
      )}
    </div>
  );
};
