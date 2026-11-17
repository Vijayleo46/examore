import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES } from '../data/i18n';
import { MockTestConfig, SubjectId, TestAttempt } from '../types/examverse';
import { soundFX } from '../lib/sound';

interface MockTestEngineProps {
  test: MockTestConfig;
  onExit: () => void;
}

type Stage = 'instructions' | 'exam' | 'result';

export const MockTestEngine: React.FC<MockTestEngineProps> = ({ test, onExit }) => {
  const { questions, language, recordMockAttempt, openTutorWithPrompt } = useApp();
  const testQuestions = useMemo(
    () =>
      test.questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [test.questionIds, questions]
  );

  const [stage, setStage] = useState<Stage>('instructions');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedReview, setMarkedReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(test.durationMinutes * 60);
  const [submittedAttempt, setSubmittedAttempt] = useState<TestAttempt | null>(null);

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

  const handleSubmitExam = () => {
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    const breakdown: Record<SubjectId, { correct: number; total: number }> = {
      quant: { correct: 0, total: 0 },
      reasoning: { correct: 0, total: 0 },
      english: { correct: 0, total: 0 },
      ga: { correct: 0, total: 0 },
      computer: { correct: 0, total: 0 },
    };

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
      }
    });

    const rawScore = Number(
      (correct * test.marksPerCorrect - wrong * test.negativeMarking).toFixed(2)
    );
    const attemptedCount = correct + wrong;
    const accuracy =
      attemptedCount > 0 ? Math.round((correct / attemptedCount) * 100) : 0;
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

    setSubmittedAttempt(attempt);
    setStage('result');
    soundFX.playVictory();
    recordMockAttempt(attempt);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (stage === 'instructions') {
    return (
      <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Mock Tests
        </button>

        <div>
          <div className="text-xs font-medium text-blue-700 dark:text-amber-400">
            {test.category} · Official CBT Simulation
          </div>
          <h2 className="font-display text-2xl font-bold mt-1">{test.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{test.description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Questions</div>
            <div className="font-mono-num text-lg font-bold">{testQuestions.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Duration</div>
            <div className="font-mono-num text-lg font-bold">{test.durationMinutes} min</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
            <div className="font-mono-num text-lg font-bold text-emerald-600">
              +{test.marksPerCorrect}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Negative</div>
            <div className="font-mono-num text-lg font-bold text-rose-600">
              −{test.negativeMarking}
            </div>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
          <li>Questions appear in standard SSC CGL English to match official exam conditions.</li>
          <li>Use the Question Palette to jump between questions or Mark for Review.</li>
          <li>The exam auto-submits when the countdown timer reaches 00:00.</li>
          <li>After submission, view step-by-step explanations in your selected language.</li>
        </ul>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setStage('exam')}
            className="px-6 py-2.5 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-sm font-semibold cursor-pointer"
          >
            Start Mock Test
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'result' && submittedAttempt) {
    const weakSubjects = (Object.keys(submittedAttempt.subjectBreakdown) as SubjectId[]).filter(
      (s) => {
        const b = submittedAttempt.subjectBreakdown[s];
        return b.total > 0 && b.correct / b.total < 0.6;
      }
    );

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
            <div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Mock Test Submitted & Recorded
              </div>
              <h2 className="font-display text-2xl font-bold mt-1">
                {submittedAttempt.testTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
            >
              Done & Return
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Score</div>
              <div className="font-mono-num text-2xl font-bold">
                {submittedAttempt.score} / {submittedAttempt.maxScore}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
              <div className="font-mono-num text-2xl font-bold">{submittedAttempt.accuracy}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
              <div className="font-mono-num text-2xl font-bold text-emerald-600">
                {submittedAttempt.correctCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Wrong</div>
              <div className="font-mono-num text-2xl font-bold text-rose-600">
                {submittedAttempt.wrongCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Time Taken</div>
              <div className="font-mono-num text-2xl font-bold">
                {formatTime(submittedAttempt.timeTakenSec)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
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
                        <span>{SUBJECT_NAMES[sub][language]}</span>
                        <span className="font-mono-num">
                          {br.correct}/{br.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-blue-700 dark:bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm">Improvement Recommendation</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {weakSubjects.length > 0
                  ? `Focus your next revision block on ${weakSubjects
                      .map((s) => SUBJECT_NAMES[s][language])
                      .join(', ')}. Watch the concept videos and ask ExamVerse AI Tutor for shortcut drills.`
                  : 'Strong accuracy across all tested sections. Attempt Tier 2 timed drills to maintain peak speed.'}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Solutions */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold">Detailed Question Review</h3>
          {testQuestions.map((q, idx) => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctIndex;
            const isUnattempted = userAns === undefined;
            return (
              <div
                key={q.id}
                className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Q{idx + 1} · {SUBJECT_NAMES[q.subject][language]} · {q.topic} · {q.sourceLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      isUnattempted
                        ? 'text-slate-500'
                        : isCorrect
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isUnattempted ? (
                      <>
                        <HelpCircle className="w-3.5 h-3.5" /> Unattempted
                      </>
                    ) : isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Wrong
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm font-medium">{q.questionEn}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.optionsEn.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`px-3 py-2 rounded-lg border ${
                        oi === q.correctIndex
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 font-semibold'
                          : oi === userAns
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span>{q.explanations[language]}</span>
                  <button
                    type="button"
                    onClick={() =>
                      openTutorWithPrompt(
                        `Explain this SSC CGL ${q.topic} question step by step: "${q.questionEn}" (Correct option: ${q.optionsEn[q.correctIndex]})`
                      )
                    }
                    className="text-blue-700 dark:text-amber-400 font-semibold hover:underline shrink-0 cursor-pointer"
                  >
                    Ask AI Tutor →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = testQuestions[currentIdx];
  if (!currentQ) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Question Stage */}
      <div className="lg:col-span-8 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[440px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Question {currentIdx + 1} of {testQuestions.length} · {SUBJECT_NAMES[currentQ.subject][language]} · {currentQ.topic}
            </div>
            <div className="inline-flex items-center gap-1.5 font-mono-num text-sm font-bold text-rose-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              {formatTime(secondsLeft)}
            </div>
          </div>

          <div className="py-6 space-y-5">
            <p className="text-base font-medium leading-relaxed">{currentQ.questionEn}</p>

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
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-colors flex items-center gap-3 cursor-pointer ${
                      selected
                        ? 'border-blue-700 bg-blue-50/70 dark:border-amber-400 dark:bg-amber-500/10 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-mono-num text-xs w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setMarkedReview((prev) => ({
                  ...prev,
                  [currentQ.id]: !prev[currentQ.id],
                }))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                markedReview[currentQ.id]
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700'
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
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
            >
              Clear Response
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            {currentIdx < testQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.min(testQuestions.length - 1, i + 1))}
                className="px-5 py-2 rounded-lg bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
              >
                Save & Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question Palette */}
      <div className="lg:col-span-4 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-6">
        <div>
          <h3 className="font-display font-bold text-base mb-1">Question Palette</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Answered: {Object.keys(answers).length} · Review: {Object.values(markedReview).filter(Boolean).length}
          </p>

          <div className="grid grid-cols-5 gap-2">
            {testQuestions.map((q, idx) => {
              const isAns = answers[q.id] !== undefined;
              const isRev = markedReview[q.id];
              const isVis = visited[q.id];
              const isCur = idx === currentIdx;

              let style = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
              if (isAns) {
                style = 'bg-emerald-600 border-emerald-600 text-white';
              } else if (isRev) {
                style = 'bg-amber-500 border-amber-500 text-[#081221] font-bold';
              } else if (isVis) {
                style = 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-lg border font-mono-num text-xs font-semibold transition-transform cursor-pointer ${style} ${
                    isCur ? 'ring-2 ring-blue-600 dark:ring-white' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span>Green: Answered</span>
            <span>Amber: Marked</span>
            <span>Red: Not Answered</span>
            <span>Plain: Not Visited</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Marking: +{test.marksPerCorrect} correct, −{test.negativeMarking} wrong.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmitExam}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
          >
            Submit Mock Test
          </button>
        </div>
      </div>
    </div>
  );
};
