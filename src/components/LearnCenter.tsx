import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { SSC_SYLLABUS } from '../data/sscCurriculum';
import { LearnSubView, MockTestConfig, Question, SubjectId, VideoLesson } from '../types/examverse';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MockTestEngine } from './MockTestEngine';
import { soundFX } from '../lib/sound';

interface LearnCenterProps {
  subView: LearnSubView;
  setSubView: (v: LearnSubView) => void;
}

export const LearnCenter: React.FC<LearnCenterProps> = ({ subView, setSubView }) => {
  const {
    language,
    profile,
    videos,
    questions,
    mockTests,
    bookmarks,
    toggleBookmark,
    toggleSyllabusTopic,
    recordQuestionResult,
    openTutorWithPrompt,
    addAdminQuestion,
    isAdmin,
  } = useApp();

  const t = UI_TEXT[language];
  const [selectedSubject, setSelectedSubject] = useState<'all' | SubjectId>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'PYQ' | 'AI_GENERATED'>('all');
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [activeMock, setActiveMock] = useState<MockTestConfig | null>(null);

  // Practice mode state
  const [practiceSubject, setPracticeSubject] = useState<SubjectId>('quant');
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // PYQ inline interactive check
  const [pyqAnswers, setPyqAnswers] = useState<Record<string, number>>({});

  const filteredVideos = useMemo(
    () =>
      videos.filter((v) => {
        if (!isAdmin && v.isPublished === false) return false;
        return selectedSubject === 'all' ? true : v.subject === selectedSubject;
      }),
    [videos, selectedSubject, isAdmin]
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (!isAdmin && q.isPublished === false) return false;
        if (selectedSubject !== 'all' && q.subject !== selectedSubject) return false;
        if (selectedYear !== 'all' && String(q.year) !== selectedYear) return false;
        if (selectedSource !== 'all' && q.sourceType !== selectedSource) return false;
        return true;
      }),
    [questions, selectedSubject, selectedYear, selectedSource, isAdmin]
  );

  const practicePool = useMemo(
    () => questions.filter((q) => q.subject === practiceSubject),
    [questions, practiceSubject]
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
        throw new Error(err.error || 'Could not generate AI practice questions');
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
          topic: 'AI Practice Drill',
          year: 2026,
          shift: 'AI-Generated',
          tier: 'Tier 1',
          difficulty: 'Medium',
          sourceType: 'AI_GENERATED',
          sourceLabel: 'AI-Generated Practice Question',
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
      setAiGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (activeMock) {
    return <MockTestEngine test={activeMock} onExit={() => setActiveMock(null)} />;
  }

  const subTabs: Array<{ id: LearnSubView; label: string }> = [
    { id: 'videos', label: t.videosTab },
    { id: 'syllabus', label: t.syllabusTab },
    { id: 'pyqs', label: t.pyqTab },
    { id: 'practice', label: t.practiceTab },
    { id: 'mock-tests', label: t.mockTestsTab },
  ];

  const subjects: Array<'all' | SubjectId> = ['all', 'quant', 'reasoning', 'english', 'ga', 'computer'];

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0F1E36] p-1 rounded-xl overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subView === tab.id
                  ? 'bg-white dark:bg-[#0A192F] text-[#0A192F] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(subView === 'videos' || subView === 'pyqs' || subView === 'syllabus') && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  selectedSubject === sub
                    ? 'border-blue-700 bg-blue-50 text-blue-800 dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {sub === 'all' ? 'All Subjects' : SUBJECT_NAMES[sub][language]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. VIDEO LEARNING CENTER */}
      {subView === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((vid) => {
            const prog = profile.videoProgress[vid.id];
            const isWatched = profile.completedLessons.includes(vid.id) || prog?.completed;
            const isBm = bookmarks.some((b) => b.itemType === 'video' && b.itemId === vid.id);
            return (
              <div
                key={vid.id}
                className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>
                      {SUBJECT_NAMES[vid.subject][language]} · {vid.durationSec}s
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark('video', vid.id, vid.title, vid.subject)}
                      className={`cursor-pointer ${isBm ? 'text-amber-500' : 'text-slate-400'}`}
                      aria-label="Bookmark video"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-display font-bold text-base leading-snug">{vid.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {vid.summary[language]}
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                    {vid.playlist} · {vid.instructor}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isWatched ? 'Watched · Quiz Ready' : prog?.lastSec ? `Resume at ${prog.lastSec}s` : 'Not started'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {prog?.lastSec && !isWatched ? 'Resume' : 'Watch'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. SYLLABUS TRACKER */}
      {subView === 'syllabus' && (
        <div className="space-y-3">
          {SSC_SYLLABUS.filter((s) => selectedSubject === 'all' || s.subject === selectedSubject).map(
            (topic) => {
              const done = profile.completedSyllabusTopics.includes(topic.id);
              return (
                <div
                  key={topic.id}
                  className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {SUBJECT_NAMES[topic.subject][language]} · {topic.tier} · Weightage: {topic.weightage}
                    </div>
                    <h3 className="font-display font-bold text-base">{topic.title}</h3>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {topic.keySubtopics.join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSyllabusTopic(topic.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer ${
                      done
                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {done ? 'Completed' : 'Mark Done'}
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* 3. PYQ QUESTION BANK */}
      {subView === 'pyqs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter by Year"
              className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium"
            >
              <option value="all">All Years (2016–2026)</option>
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as typeof selectedSource)}
              aria-label="Filter by Source Type"
              className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium"
            >
              <option value="all">All Sources (PYQ + AI Practice)</option>
              <option value="PYQ">Previous Year Questions Only</option>
              <option value="AI_GENERATED">AI-Generated Practice Only</option>
            </select>

            <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
              Showing {filteredQuestions.length} questions
            </span>
          </div>

          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const chosen = pyqAnswers[q.id];
              const answered = chosen !== undefined;
              const isBm = bookmarks.some((b) => b.itemType === 'question' && b.itemId === q.id);

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {q.sourceLabel} · {q.sourceType === 'PYQ' && q.isVerified !== false ? 'Verified PYQ' : 'AI Practice (Unverified)'} · {SUBJECT_NAMES[q.subject][language]} · {q.topic} · {q.difficulty}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        toggleBookmark('question', q.id, q.questionEn.slice(0, 70), q.subject)
                      }
                      className={`cursor-pointer ${isBm ? 'text-amber-500' : 'text-slate-400'}`}
                      aria-label="Bookmark question"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">
                      {t.originalQuestionLabel}
                    </div>
                    <p className="text-sm sm:text-base font-medium leading-relaxed">
                      {q.questionEn}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.optionsEn.map((opt, oi) => {
                      let cls =
                        'border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-amber-400';
                      if (answered) {
                        if (oi === q.correctIndex) {
                          cls =
                            'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold';
                        } else if (chosen === oi) {
                          cls =
                            'border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300';
                        }
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={answered}
                          onClick={() => {
                            setPyqAnswers((prev) => ({ ...prev, [q.id]: oi }));
                            const ok = oi === q.correctIndex;
                            if (ok) soundFX.playCorrect();
                            else soundFX.playWrong();
                            recordQuestionResult(q.subject, ok);
                          }}
                          className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${cls}`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5 max-w-3xl">
                        <div className="text-xs font-semibold text-blue-700 dark:text-amber-400">
                          {t.explanationLabel}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {q.explanations[language]}
                        </p>
                        {q.sourceUrls && q.sourceUrls.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Archive source:{' '}
                            <a
                              href={q.sourceUrls[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-700 dark:hover:text-amber-400"
                            >
                              {new URL(q.sourceUrls[0]).hostname}
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openTutorWithPrompt(
                            `Explain this SSC CGL question (${q.topic}) in detail and why the other options are wrong: "${q.questionEn}"`
                          )
                        }
                        className="text-xs font-semibold text-blue-700 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Ask ExamVerse AI →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TOPIC PRACTICE + AI GENERATOR */}
      {subView === 'practice' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['quant', 'reasoning', 'english', 'ga', 'computer'] as SubjectId[]).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setPracticeSubject(sub);
                    setPracticeIdx(0);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    practiceSubject === sub
                      ? 'bg-[#0A192F] text-white border-[#0A192F] dark:bg-amber-500 dark:text-[#081221] dark:border-amber-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {SUBJECT_NAMES[sub][language]}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={generatingAI}
              onClick={handleGenerateAiPractice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-700 dark:border-amber-400 text-blue-700 dark:text-amber-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-amber-500/10 disabled:opacity-50 cursor-pointer"
            >
              {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate AI Practice Questions
            </button>
          </div>

          {aiGenError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300">
              {aiGenError}
            </div>
          )}

          {practicePool[practiceIdx] ? (
            (() => {
              const q = practicePool[practiceIdx];
              const chosen = practiceAnswers[q.id];
              const answered = chosen !== undefined;
              return (
                <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-3xl space-y-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {q.sourceLabel} · {q.topic} · {q.difficulty}
                    </span>
                    <span className="font-mono-num">
                      {practiceIdx + 1} / {practicePool.length}
                    </span>
                  </div>
                  <p className="text-base font-medium leading-relaxed">{q.questionEn}</p>
                  <div className="space-y-2.5">
                    {q.optionsEn.map((opt, oi) => {
                      let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-600';
                      if (answered) {
                        if (oi === q.correctIndex) {
                          cls = 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 font-semibold';
                        } else if (chosen === oi) {
                          cls = 'border-rose-600 bg-rose-50 dark:bg-rose-950/30';
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
                            recordQuestionResult(q.subject, ok, 20);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer ${cls}`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                        </button>
                      );
                    })}
                  </div>
                  {answered && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081221] border border-slate-200 dark:border-slate-800 text-sm">
                      {q.explanations[language]}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={practiceIdx === 0}
                      onClick={() => setPracticeIdx((i) => Math.max(0, i - 1))}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPracticeIdx((i) => (i + 1) % practicePool.length)
                      }
                      className="px-5 py-2 rounded-lg bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
                    >
                      Next Question
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-slate-500">No questions available for this subject.</div>
          )}
        </div>
      )}

      {/* 5. MOCK TESTS */}
      {subView === 'mock-tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {mockTests
            .filter((mt) => isAdmin || mt.isPublished !== false)
            .map((mt) => (
            <div
              key={mt.id}
              className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="text-xs font-semibold text-blue-700 dark:text-amber-400">
                  {mt.category} · {mt.questionIds.length} Questions · {mt.durationMinutes} Mins
                </div>
                <h3 className="font-display font-bold text-lg mt-1">{mt.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{mt.description}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                  +{mt.marksPerCorrect} / −{mt.negativeMarking} marking
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMock(mt)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Launch Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeVideo && (
        <VideoPlayerModal lesson={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
};
