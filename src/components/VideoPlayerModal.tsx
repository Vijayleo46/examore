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
  XCircle,
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
    <div className="fixed inset-0 z-50 bg-[#062B3D]/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div
        ref={containerRef}
        className="w-full max-w-5xl bg-[#F3FAFA] dark:bg-[#073B50] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/30 rounded-3xl overflow-hidden shadow-2xl my-auto"
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 flex items-center justify-between gap-4 bg-white/80 dark:bg-[#062B3D]/70">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0] truncate">
              {SUBJECT_NAMES[lesson.subject][language]} · {lesson.topic} · {lesson.instructor}
            </div>
            <h3 className="font-display font-extrabold text-base sm:text-lg truncate">
              {lesson.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleBookmark('video', lesson.id, lesson.title, lesson.subject)}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border text-xs cursor-pointer ${
                isBookmarked
                  ? 'border-[#FF8B78] text-[#FF8B78]'
                  : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
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
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 cursor-pointer"
              aria-label="Close video player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Interactive Ocean Video Stage */}
          <div className="lg:col-span-8 ocean-gradient-hero text-[#F3FAFA] p-5 sm:p-8 flex flex-col justify-between min-h-[340px]">
            {lesson.videoUrl ? (
              <video
                src={lesson.videoUrl}
                controls
                className="w-full rounded-2xl max-h-[320px] bg-black"
              />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs text-[#55D6D0] font-mono-num font-bold">
                  <span>CONCEPT BOARD · {lesson.playlist}</span>
                  <span>
                    {Math.floor(currentSec)}s / {lesson.durationSec}s
                  </span>
                </div>

                <div className="bg-[#073B50]/90 border border-[#20C7C9]/35 rounded-2xl p-5 sm:p-6 space-y-4">
                  <h4 className="font-display text-lg sm:text-xl font-extrabold text-[#55D6D0]">
                    {activeStep.heading}
                  </h4>
                  {activeStep.formula && (
                    <div className="font-mono-num text-sm sm:text-base bg-[#062B3D] border border-[#20C7C9]/30 rounded-xl px-4 py-3 text-[#8DE1D3]">
                      {activeStep.formula}
                    </div>
                  )}
                  <p className="text-sm text-[#F3FAFA]/90 leading-relaxed">
                    {activeStep.visualNote}
                  </p>
                </div>

                {/* Subtitle Bar */}
                <div className="bg-[#062B3D]/80 border border-[#20C7C9]/25 rounded-xl px-4 py-3 text-center">
                  <div className="text-sm text-[#F3FAFA] leading-relaxed">
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
                className="w-full accent-[#20C7C9] cursor-pointer"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#20C7C9] text-[#062B3D] font-extrabold text-xs cursor-pointer"
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
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-[#8DE1D3]/35 text-[#8DE1D3] hover:text-white cursor-pointer"
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
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#55D6D0]/50 text-xs font-bold text-[#F3FAFA] hover:border-[#20C7C9] cursor-pointer"
                  >
                    Finish & Check Quiz
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    aria-label="Playback speed"
                    className="min-h-[36px] bg-[#073B50] border border-[#20C7C9]/35 rounded-xl px-2.5 py-1 text-xs font-mono-num text-white"
                  >
                    {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}x
                      </option>
                    ))}
                  </select>

                  <select
                    value={subtitleLang}
                    onChange={(e) => setSubtitleLang(e.target.value as typeof subtitleLang)}
                    aria-label="Subtitle language"
                    className="min-h-[36px] bg-[#073B50] border border-[#20C7C9]/35 rounded-xl px-2.5 py-1 text-xs text-white"
                  >
                    <option value="en">Sub: English</option>
                    <option value="ml">Sub: മലയാളം</option>
                    <option value="hi">Sub: हिन्दी</option>
                    <option value="ta">Sub: தமிழ்</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border border-[#8DE1D3]/35 text-[#8DE1D3] hover:text-white cursor-pointer"
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
          <div className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 max-h-[540px] overflow-y-auto bg-white/85 dark:bg-[#073B50]">
            {showPostQuiz ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#075985] dark:text-[#55D6D0] font-display font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-[#20C7C9] shrink-0" />
                  <span>{t.postVideoPrompt}</span>
                </div>
                {relatedQuestions.map((q) => {
                  const chosen = quizAnswers[q.id];
                  const answered = chosen !== undefined;
                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-2xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 space-y-2.5"
                    >
                      <div className="text-xs font-semibold leading-relaxed">{q.questionEn}</div>
                      <div className="space-y-1.5">
                        {q.optionsEn.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = chosen === idx;
                          let cls = 'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 hover:border-[#20C7C9]';
                          if (answered) {
                            if (isCorrect) {
                              cls = 'border-[#20C7C9] bg-[#20C7C9]/15 font-bold';
                            } else if (isSelected) {
                              cls = 'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]';
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
                              className={`w-full min-h-[44px] text-left px-3 py-2 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${cls}`}
                            >
                              <span>{opt}</span>
                              {answered && isCorrect && (
                                <span className="inline-flex items-center gap-1 font-bold text-[#075985] dark:text-[#55D6D0] shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#20C7C9]" /> Correct
                                </span>
                              )}
                              {answered && isSelected && !isCorrect && (
                                <span className="inline-flex items-center gap-1 font-bold text-[#FF8B78] shrink-0">
                                  <XCircle className="w-3.5 h-3.5" /> Wrong
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="text-xs text-[#073B50] dark:text-[#8DE1D3] pt-1 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
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
                  <div className="font-display font-extrabold text-sm">Lesson Summary</div>
                  <p className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3] leading-relaxed">
                    {lesson.summary[language]}
                  </p>
                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                      Jump to Concept
                    </div>
                    {lesson.steps.map((st, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSec(st.timestampSec)}
                        className="w-full min-h-[40px] text-left px-3 py-2 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 hover:border-[#20C7C9] text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{st.heading}</span>
                        <span className="font-mono-num text-[#075985] dark:text-[#55D6D0] shrink-0 ml-2">
                          {st.timestampSec}s
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                  <label className="block text-xs font-bold">Study Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Jot down formulas or shortcut tricks..."
                    className="w-full rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#20C7C9]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
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
