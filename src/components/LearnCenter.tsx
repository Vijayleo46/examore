import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import {
  COMPLETE_SSC_SYLLABUS,
  SSC_CUTOFF_TRENDS,
  SSC_TIER1_PATTERN,
  SSC_TIER2_PATTERN,
} from '../data/sscMasterTeacher';
import { LearnSubView, MockTestConfig, SubjectId, VideoLesson } from '../types/examverse';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MockTestEngine } from './MockTestEngine';
import {
  FirstTimeTip,
  OceanGlassCard,
  OceanProgressRing,
  formatLessonDuration,
} from './OceanTheme';

interface LearnCenterProps {
  subView: LearnSubView;
  setSubView: (v: LearnSubView) => void;
}

export const LearnCenter: React.FC<LearnCenterProps> = ({ subView, setSubView }) => {
  const {
    language,
    profile,
    videos,
    mockTests,
    bookmarks,
    toggleBookmark,
    toggleSyllabusTopic,
    topicMastery,
    openAiTeacherWithContext,
    isAdmin,
  } = useApp();

  const t = UI_TEXT[language];
  const [selectedSubject, setSelectedSubject] = useState<'all' | SubjectId>('all');
  const [showPatternGuide, setShowPatternGuide] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [activeMock, setActiveMock] = useState<MockTestConfig | null>(null);

  const filteredVideos = useMemo(
    () =>
      videos.filter((v) => {
        if (!isAdmin && v.isPublished === false) return false;
        return selectedSubject === 'all' ? true : v.subject === selectedSubject;
      }),
    [videos, selectedSubject, isAdmin]
  );

  const syllabusTopics = useMemo(
    () =>
      COMPLETE_SSC_SYLLABUS.filter(
        (s) => selectedSubject === 'all' || s.subject === selectedSubject
      ),
    [selectedSubject]
  );

  const completedLessonsCount = videos.filter((v) =>
    profile.completedLessons.includes(v.id)
  ).length;
  const videoCompletionPct = Math.round(
    (completedLessonsCount / Math.max(1, videos.length)) * 100
  );

  const syllabusDoneCount = syllabusTopics.filter((topic) =>
    profile.completedSyllabusTopics.includes(topic.id)
  ).length;
  const syllabusPct = Math.round((syllabusDoneCount / Math.max(1, syllabusTopics.length)) * 100);

  if (activeMock) {
    return <MockTestEngine test={activeMock} onExit={() => setActiveMock(null)} />;
  }

  const subTabs: Array<{ id: LearnSubView; label: string }> = [
    { id: 'videos', label: t.videosTab },
    { id: 'syllabus', label: t.syllabusTab },
    { id: 'mock-tests', label: t.mockTestsTab },
  ];

  const subjects: Array<'all' | SubjectId> =
    subView === 'syllabus'
      ? ['all', 'quant', 'reasoning', 'english', 'ga', 'computer', 'statistics']
      : ['all', 'quant', 'reasoning', 'english', 'ga', 'computer'];

  return (
    <div className="space-y-6">
      <FirstTimeTip
        storageKey="learn_center_v1"
        title="Learn at Your Own Pace"
        body="Choose a subject filter below, watch short concept video lessons (your progress auto-saves so you can resume anytime), track your syllabus, or take a full Mock Test."
      />

      {/* Sub-navigation & Progress Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 pb-4">
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#073B50]/80 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-1.5 rounded-2xl overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subView === tab.id
                  ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D] shadow-sm'
                  : 'text-[#073B50] dark:text-[#8DE1D3] hover:text-[#062B3D] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <OceanProgressRing
          percent={subView === 'syllabus' ? syllabusPct : videoCompletionPct}
          size={54}
          strokeWidth={5}
          label={subView === 'syllabus' ? 'Syllabus Progress' : 'Lessons Completed'}
          sublabel={
            subView === 'syllabus'
              ? `${syllabusDoneCount} of ${syllabusTopics.length} topics`
              : `${completedLessonsCount} of ${videos.length} videos`
          }
        />
      </div>

      {/* Subject Filter Bar for Videos & Syllabus */}
      {(subView === 'videos' || subView === 'syllabus') && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {subjects.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                selectedSubject === sub
                  ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0] font-bold'
                  : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/70 dark:bg-[#073B50]/60 text-[#073B50] dark:text-[#8DE1D3]'
              }`}
            >
              {sub === 'all' ? 'All Subjects' : SUBJECT_NAMES[sub][language]}
            </button>
          ))}
        </div>
      )}

      {/* 1. VIDEO LESSONS */}
      {subView === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((vid) => {
            const prog = profile.videoProgress[vid.id];
            const isWatched = profile.completedLessons.includes(vid.id) || prog?.completed;
            const isBm = bookmarks.some((b) => b.itemType === 'video' && b.itemId === vid.id);
            const watchedPct = isWatched
              ? 100
              : prog?.lastSec
              ? Math.min(95, Math.round((prog.lastSec / Math.max(1, vid.durationSec)) * 100))
              : 0;

            return (
              <OceanGlassCard key={vid.id} className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#075985] dark:text-[#8DE1D3] mb-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#20C7C9]" />
                      {SUBJECT_NAMES[vid.subject][language]} · {formatLessonDuration(vid.durationSec)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark('video', vid.id, vid.title, vid.subject)}
                      className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg cursor-pointer ${
                        isBm ? 'text-[#FF8B78]' : 'text-[#075985]/60 dark:text-[#8DE1D3]/60'
                      }`}
                      aria-label="Bookmark video"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-display font-bold text-base leading-snug">{vid.title}</h3>
                  <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3]/90 mt-2 line-clamp-2 leading-relaxed">
                    {vid.summary[language]}
                  </p>
                  <div className="text-[11px] font-medium text-[#075985] dark:text-[#55D6D0] mt-3">
                    Topic: {vid.topic} · {vid.instructor}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                  <div className="h-1.5 rounded-full bg-[#8DE1D3]/30 dark:bg-[#062B3D] overflow-hidden">
                    <div
                      className="h-full bg-[#20C7C9] transition-all"
                      style={{ width: `${watchedPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      {isWatched ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#20C7C9]" />
                          <span className="text-[#075985] dark:text-[#55D6D0]">Completed</span>
                        </>
                      ) : prog?.lastSec ? (
                        <>
                          <Circle className="w-4 h-4 text-[#FF8B78]" />
                          <span className="text-[#073B50] dark:text-[#8DE1D3]">
                            Paused at {prog.lastSec}s
                          </span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-[#8DE1D3]" />
                          <span className="text-[#073B50]/75 dark:text-[#8DE1D3]/75">Pending</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveVideo(vid)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {prog?.lastSec && !isWatched ? 'Resume' : isWatched ? 'Rewatch' : 'Start Lesson'}
                    </button>
                  </div>
                </div>
              </OceanGlassCard>
            );
          })}
        </div>
      )}

      {/* 2. COMPLETE SYLLABUS TRACKER + EXAM PATTERN & CUT-OFF REFERENCE */}
      {subView === 'syllabus' && (
        <div className="space-y-4">
          <OceanGlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-[#062B3D] dark:text-[#F3FAFA]">
                Official SSC CGL Tier 1 &amp; Tier 2 Syllabus ({syllabusTopics.length} Topics)
              </div>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                Tap &ldquo;Teach with AI&rdquo; on any topic for step-by-step lessons, worked examples &amp; adaptive drills.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPatternGuide((p) => !p)}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-[#20C7C9] bg-[#20C7C9]/12 text-xs font-bold text-[#062B3D] dark:text-[#55D6D0] cursor-pointer"
            >
              {showPatternGuide ? 'Hide Exam Pattern & Cut-offs' : 'View Exam Pattern & Cut-offs'}
            </button>
          </OceanGlassCard>

          {showPatternGuide && (
            <OceanGlassCard className="p-5 space-y-5">
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-base text-[#062B3D] dark:text-[#F3FAFA]">
                  SSC CGL Tier 1 Exam Pattern (Screening · 100 Qs · 200 Marks · 60 Mins)
                </h3>
                <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                  Negative Marking: −0.50 per wrong answer · Qualifying Minimum: UR 30% · OBC/EWS 25% · SC/ST/Others 20%
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0]">
                        <th className="py-2 pr-3">Section</th>
                        <th className="py-2 pr-3">Questions</th>
                        <th className="py-2 pr-3">Max Marks</th>
                        <th className="py-2">Section Timing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/25 dark:divide-[#20C7C9]/15">
                      {SSC_TIER1_PATTERN.map((row) => (
                        <tr key={row.section}>
                          <td className="py-2 pr-3 font-semibold">{row.section}</td>
                          <td className="py-2 pr-3 font-mono-num">{row.questions}</td>
                          <td className="py-2 pr-3 font-mono-num">{row.marks}</td>
                          <td className="py-2 font-mono-num">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                <h3 className="font-display font-extrabold text-base text-[#062B3D] dark:text-[#F3FAFA]">
                  SSC CGL Tier 2 Pattern (Paper I Merit + Qualifying + Optional JSO Paper II)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0]">
                        <th className="py-2 pr-3">Paper / Section</th>
                        <th className="py-2 pr-3">Subjects / Modules</th>
                        <th className="py-2 pr-3">Qs &amp; Marks</th>
                        <th className="py-2">Duration &amp; Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/25 dark:divide-[#20C7C9]/15">
                      {SSC_TIER2_PATTERN.map((row) => (
                        <tr key={row.paper}>
                          <td className="py-2 pr-3 font-bold whitespace-nowrap">{row.paper}</td>
                          <td className="py-2 pr-3">{row.module}</td>
                          <td className="py-2 pr-3 font-mono-num">
                            {row.questions} · {row.marks}
                          </td>
                          <td className="py-2">
                            {row.duration} · {row.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                <div>
                  <h4 className="font-display font-bold text-sm mb-2">
                    Tier 1 Cut-Off Trend (All Other Posts · Out of 200)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#8DE1D3]/45 text-[#075985] dark:text-[#55D6D0]">
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5 font-mono-num">2023</th>
                        <th className="py-1.5 font-mono-num">2024</th>
                        <th className="py-1.5 font-mono-num">2025</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/20">
                      {SSC_CUTOFF_TRENDS.tier1AllOtherPostsOutOf200.map((c) => (
                        <tr key={c.category}>
                          <td className="py-1.5 font-bold">{c.category}</td>
                          <td className="py-1.5 font-mono-num">{c.y2023}</td>
                          <td className="py-1.5 font-mono-num">{c.y2024}</td>
                          <td className="py-1.5 font-mono-num">{c.y2025}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm mb-2">
                    Tier 2 Final Cut-Off Benchmark (2024 · Out of 450)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#8DE1D3]/45 text-[#075985] dark:text-[#55D6D0]">
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5 font-mono-num">Final Cut-Off</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/20">
                      {SSC_CUTOFF_TRENDS.tier2Final2024OutOf450.map((c) => (
                        <tr key={c.category}>
                          <td className="py-1.5 font-bold">{c.category}</td>
                          <td className="py-1.5 font-mono-num">{c.cutoff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </OceanGlassCard>
          )}

          <div className="space-y-3">
            {syllabusTopics.map((topic) => {
              const done = profile.completedSyllabusTopics.includes(topic.id);
              const mastery = topicMastery[topic.id];
              return (
                <OceanGlassCard
                  key={topic.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0]">
                      {SUBJECT_NAMES[topic.subject][language]} · {topic.tier} · Weightage:{' '}
                      {topic.weightage}
                      {topic.tierNote ? ` · ${topic.tierNote}` : ''}
                      {mastery ? ` · Mastery: ${mastery.status.replace('_', ' ')}` : ''}
                    </div>
                    <h3 className="font-display font-bold text-base">{topic.title}</h3>
                    <div className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3]">
                      {topic.keySubtopics.join(' · ')}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        openAiTeacherWithContext({
                          subject: topic.subject,
                          topic: topic.title,
                          topicId: topic.id,
                          mode: mastery?.needsRevision ? 'revision' : 'teach',
                          level: mastery?.level || 'easy',
                          autoStart: true,
                        })
                      }
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                    >
                      <Bot className="w-4 h-4" />
                      Teach with AI
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSyllabusTopic(topic.id)}
                      className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-bold cursor-pointer transition-colors ${
                        done
                          ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                          : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/25 text-[#073B50] dark:text-[#8DE1D3]'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {done ? 'Completed' : 'Mark Completed'}
                    </button>
                  </div>
                </OceanGlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MOCK TESTS */}
      {subView === 'mock-tests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {mockTests
            .filter((mt) => isAdmin || mt.isPublished !== false)
            .map((mt) => (
              <OceanGlassCard key={mt.id} className="p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                    {mt.category} · {mt.questionIds.length} Questions · {mt.durationMinutes} Mins
                  </div>
                  <h3 className="font-display font-extrabold text-lg mt-1">{mt.title}</h3>
                  <p className="text-sm text-[#073B50]/85 dark:text-[#8DE1D3] mt-2 leading-relaxed">
                    {mt.description}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                  <span className="text-xs font-mono-num font-semibold text-[#075985] dark:text-[#8DE1D3]">
                    +{mt.marksPerCorrect} / −{mt.negativeMarking} marking
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveMock(mt)}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    Start Mock Test
                  </button>
                </div>
              </OceanGlassCard>
            ))}
        </div>
      )}

      {activeVideo && (
        <VideoPlayerModal lesson={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
};
