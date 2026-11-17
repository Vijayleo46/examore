import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { VideoLesson } from '../types/examverse';
import { soundFX } from '../lib/sound';

interface VideoPlayerModalProps {
  lesson: VideoLesson;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ lesson, onClose }) => {
  const {
    language,
    profile,
    questions,
    updateVideoProgress,
    recordQuestionResult,
    toggleBookmark,
    bookmarks,
  } = useApp();

  const saved = profile.videoProgress[lesson.id];
  const [currentSec, setCurrentSec] = useState(saved?.lastSec || 0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [subtitleLang, setSubtitleLang] = useState(language);
  const [notes, setNotes] = useState(saved?.notes || '');
  const [notesSavedMsg, setNotesSavedMsg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPostQuiz, setShowPostQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const t = UI_TEXT[language];
  const isBookmarked = bookmarks.some((b) => b.itemType === 'video' && b.itemId === lesson.id);
  const relatedQuestions = questions.filter((q) => lesson.relatedQuestionIds.includes(q.id));

  useEffect(() => {
    if (!playing || showPostQuiz) return;
    const interval = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + 0.5 * speed;
        if (next >= lesson.durationSec) {
          setPlaying(false);
          updateVideoProgress(lesson.id, lesson.durationSec, true, notes);
          setShowPostQuiz(true);
          soundFX.playVictory();
          return lesson.durationSec;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [playing, speed, lesson.durationSec, lesson.id, showPostQuiz, notes, updateVideoProgress]);

  const activeStep =
    [...lesson.steps].reverse().find((s) => currentSec >= s.timestampSec) || lesson.steps[0];

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSaveNotes = () => {
    updateVideoProgress(lesson.id, Math.round(currentSec), currentSec >= lesson.durationSec, notes);
    setNotesSavedMsg(true);
    setTimeout(() => setNotesSavedMsg(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div
        ref={containerRef}
        className="w-full max-w-5xl bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl my-auto"
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {SUBJECT_NAMES[lesson.subject][language]} · {lesson.topic} · {lesson.instructor}
            </div>
            <h3 className="font-display font-bold text-base sm:text-lg truncate">
              {lesson.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleBookmark('video', lesson.id, lesson.title, lesson.subject)}
              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                isBookmarked
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Bookmark video"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                updateVideoProgress(lesson.id, Math.round(currentSec), false, notes);
                onClose();
              }}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              aria-label="Close video player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Interactive Video Stage */}
          <div className="lg:col-span-8 bg-[#081221] text-white p-5 sm:p-8 flex flex-col justify-between min-h-[340px]">
            {lesson.videoUrl ? (
              <video
                src={lesson.videoUrl}
                controls
                className="w-full rounded-xl max-h-[320px] bg-black"
              />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-mono-num">
                  <span>CONCEPT BOARD · {lesson.playlist}</span>
                  <span>
                    {Math.floor(currentSec)}s / {lesson.durationSec}s
                  </span>
                </div>

                <div className="bg-[#0F1E36] border border-slate-700 rounded-xl p-5 sm:p-6 space-y-4">
                  <h4 className="font-display text-lg sm:text-xl font-bold text-amber-300">
                    {activeStep.heading}
                  </h4>
                  {activeStep.formula && (
                    <div className="font-mono-num text-sm sm:text-base bg-[#081221] border border-slate-800 rounded-lg px-4 py-3 text-emerald-300">
                      {activeStep.formula}
                    </div>
                  )}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeStep.visualNote}
                  </p>
                </div>

                {/* Subtitle Bar */}
                <div className="bg-black/60 border border-slate-800 rounded-lg px-4 py-3 text-center">
                  <div className="text-sm text-white leading-relaxed">
                    {activeStep.subtitles[subtitleLang]}
                  </div>
                </div>
              </div>
            )}

            {/* Player Controls */}
            <div className="mt-6 space-y-3">
              <input
                type="range"
                min={0}
                max={lesson.durationSec}
                step={1}
                value={Math.min(lesson.durationSec, Math.round(currentSec))}
                onChange={(e) => {
                  setCurrentSec(Number(e.target.value));
                  setShowPostQuiz(false);
                }}
                aria-label="Seek video progress"
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-[#081221] font-semibold text-xs cursor-pointer"
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {playing ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSec(0);
                      setShowPostQuiz(false);
                      setPlaying(true);
                    }}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Restart lesson"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSec(lesson.durationSec);
                      setPlaying(false);
                      updateVideoProgress(lesson.id, lesson.durationSec, true, notes);
                      setShowPostQuiz(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 hover:border-amber-400 cursor-pointer"
                  >
                    Finish & Quiz
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback speed */}
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    aria-label="Playback speed"
                    className="bg-[#0F1E36] border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono-num text-white"
                  >
                    {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}x
                      </option>
                    ))}
                  </select>

                  {/* Subtitles selector */}
                  <select
                    value={subtitleLang}
                    onChange={(e) => setSubtitleLang(e.target.value as typeof subtitleLang)}
                    aria-label="Subtitle language"
                    className="bg-[#0F1E36] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="en">Sub: English</option>
                    <option value="ml">Sub: മലയാളം</option>
                    <option value="hi">Sub: हिन्दी</option>
                    <option value="ta">Sub: தமிழ்</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Toggle fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Notes & Post-Video Quiz */}
          <div className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 max-h-[520px] overflow-y-auto">
            {showPostQuiz ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-display font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{t.postVideoPrompt}</span>
                </div>
                {relatedQuestions.map((q) => {
                  const chosen = quizAnswers[q.id];
                  const answered = chosen !== undefined;
                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="text-xs font-medium leading-relaxed">{q.questionEn}</div>
                      <div className="space-y-1.5">
                        {q.optionsEn.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = chosen === idx;
                          let cls =
                            'border-slate-200 dark:border-slate-700 hover:border-blue-500';
                          if (answered) {
                            if (isCorrect) {
                              cls =
                                'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
                            } else if (isSelected) {
                              cls =
                                'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300';
                            }
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={answered}
                              onClick={() => {
                                setQuizAnswers((prev) => ({ ...prev, [q.id]: idx }));
                                const ok = idx === q.correctIndex;
                                if (ok) soundFX.playCorrect();
                                else soundFX.playWrong();
                                recordQuestionResult(q.subject, ok, 20);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {q.explanations[language]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="font-display font-bold text-sm">Lesson Summary</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lesson.summary[language]}
                  </p>
                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Jump to Concept
                    </div>
                    {lesson.steps.map((st, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSec(st.timestampSec)}
                        className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-amber-400 text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{st.heading}</span>
                        <span className="font-mono-num text-slate-400 shrink-0 ml-2">
                          {st.timestampSec}s
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-semibold">Study Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Jot down formulas or shortcut tricks while watching..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {notesSavedMsg ? 'Notes Saved' : 'Save Notes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
