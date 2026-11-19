import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Flame,
  HelpCircle,
  ImagePlus,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import {
  COMPLETE_SSC_SYLLABUS,
  CompleteSyllabusTopic,
  MANGLISH_WELCOME_GREETING,
  TEACHING_LANGUAGES,
  getTopicsBySubject,
} from '../data/sscMasterTeacher';
import {
  ChatMessage,
  DifficultyStage,
  MistakeAnalysisData,
  SubjectId,
  TeacherLessonData,
  TeacherMode,
  TeacherPracticeQuestion,
  TopicMasteryStatus,
} from '../types/examverse';
import { BackHomeBar, OceanGlassCard } from './OceanTheme';

interface AiTutorViewProps {
  onBack?: () => void;
  onHome?: () => void;
  onOpenMockTests?: () => void;
}

const ALL_TEACHER_SUBJECTS: Array<{ id: SubjectId; badge?: string }> = [
  { id: 'quant' },
  { id: 'reasoning' },
  { id: 'english' },
  { id: 'ga' },
  { id: 'computer', badge: 'Tier 2' },
  { id: 'statistics', badge: 'JSO Only' },
];

const TEACHER_MODES: Array<{ id: TeacherMode; label: string; hint: string }> = [
  { id: 'teach', label: 'Teach', hint: 'Lesson → Example → Quiz' },
  { id: 'practice', label: 'Practice', hint: 'Adaptive 1-by-1 Drills' },
  { id: 'pyq', label: 'PYQ', hint: 'Verified Past Papers' },
  { id: 'revision', label: 'Revision', hint: 'Weak Topics Queue' },
  { id: 'daily', label: 'Daily Study', hint: 'Today’s Guided Step' },
  { id: 'doubt', label: 'Quick Doubt', hint: 'Ask Text / Image' },
];

const LEVEL_LABELS: Record<DifficultyStage, { title: string; subtitle: string }> = {
  easy: { title: 'Level 1 · Easy', subtitle: 'Beginner Foundation' },
  medium: { title: 'Level 2 · Medium', subtitle: 'Application & Speed' },
  exam: { title: 'Level 3 · SSC Exam Level', subtitle: 'Tier 1 & Tier 2 Standard' },
};

const MASTERY_LABELS: Record<TopicMasteryStatus, { label: string; tone: string }> = {
  not_started: {
    label: 'Not Started',
    tone: 'text-[#075985]/70 dark:text-[#8DE1D3]/70',
  },
  learning: {
    label: 'Learning',
    tone: 'text-[#075985] dark:text-[#55D6D0]',
  },
  practicing: {
    label: 'Practicing',
    tone: 'text-[#20C7C9] dark:text-[#55D6D0]',
  },
  strong: {
    label: 'Strong',
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
  revision_needed: {
    label: 'Revision Needed',
    tone: 'text-[#9A2D1F] dark:text-[#FF8B78]',
  },
};

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  onBack,
  onHome,
  onOpenMockTests,
}) => {
  const {
    language,
    profile,
    chatHistory,
    setChatHistory,
    persistTutorMessage,
    clearTutorHistory,
    tutorPrefill,
    clearTutorPrefill,
    teacherPrefill,
    clearTeacherPrefill,
    teachingLanguage,
    setTeachingLanguage,
    topicMastery,
    revisionDueTopics,
    markTopicLearning,
    recordTopicPractice,
    levelInfo,
  } = useApp();

  const t = UI_TEXT[language];

  const [subject, setSubject] = useState<SubjectId>('quant');
  const subjectTopics = useMemo(() => getTopicsBySubject(subject), [subject]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    COMPLETE_SSC_SYLLABUS.find((x) => x.subject === 'quant')?.id || ''
  );
  const [mode, setMode] = useState<TeacherMode>('teach');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyStage>('easy');

  // Structured lesson + practice loop state
  const [lesson, setLesson] = useState<TeacherLessonData | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const [question, setQuestion] = useState<TeacherPracticeQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0); // 1=hint1, 2=hint2, 3=full answer
  const [analysis, setAnalysis] = useState<MistakeAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Quick Doubt / Free Chat state
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
  } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingAutoStartRef = useRef<{
    subject: SubjectId;
    topicObj: CompleteSyllabusTopic;
    mode: TeacherMode;
    level: DifficultyStage;
  } | null>(null);

  const selectedTopicObj = useMemo(
    () =>
      subjectTopics.find((item) => item.id === selectedTopicId) ||
      subjectTopics[0] ||
      COMPLETE_SSC_SYLLABUS[0],
    [subjectTopics, selectedTopicId]
  );

  // Sync when switching subject manually
  const handleSelectSubject = (nextSub: SubjectId) => {
    setSubject(nextSub);
    const first = getTopicsBySubject(nextSub)[0];
    if (first) {
      setSelectedTopicId(first.id);
      const saved = topicMastery[first.id];
      setDifficultyLevel(saved?.level || 'easy');
    }
    setLesson(null);
    setQuestion(null);
    setAnalysis(null);
    setSelectedOpt(null);
    setHintTier(0);
  };

  const handleSelectTopic = (topicItem: CompleteSyllabusTopic) => {
    setSelectedTopicId(topicItem.id);
    const saved = topicMastery[topicItem.id];
    setDifficultyLevel(saved?.level || 'easy');
    setLesson(null);
    setQuestion(null);
    setAnalysis(null);
    setSelectedOpt(null);
    setHintTier(0);
  };

  // Consume external prefills (from Syllabus "Teach This Topic" or Home/PYQs)
  useEffect(() => {
    if (teacherPrefill) {
      const targetSub = teacherPrefill.subject || 'quant';
      const list = getTopicsBySubject(targetSub);
      const matchedTopic =
        list.find((x) => x.id === teacherPrefill.topicId) ||
        list.find((x) =>
          teacherPrefill.topic
            ? x.title.toLowerCase().includes(teacherPrefill.topic.toLowerCase()) ||
              teacherPrefill.topic.toLowerCase().includes(x.title.toLowerCase())
            : false
        ) ||
        list[0];

      setSubject(targetSub);
      if (matchedTopic) setSelectedTopicId(matchedTopic.id);
      const nextMode = teacherPrefill.mode || 'teach';
      setMode(nextMode);
      const nextLvl =
        teacherPrefill.level ||
        (matchedTopic ? topicMastery[matchedTopic.id]?.level : undefined) ||
        'easy';
      setDifficultyLevel(nextLvl);
      setLesson(null);
      setQuestion(null);
      setAnalysis(null);

      if (teacherPrefill.autoStart && matchedTopic) {
        pendingAutoStartRef.current = {
          subject: targetSub,
          topicObj: matchedTopic,
          mode: nextMode,
          level: nextLvl,
        };
      }
      clearTeacherPrefill();
    }
  }, [teacherPrefill, clearTeacherPrefill, topicMastery]);

  useEffect(() => {
    if (tutorPrefill) {
      setInput(tutorPrefill);
      if (!teacherPrefill) {
        setMode('doubt');
      }
      clearTutorPrefill();
    }
  }, [tutorPrefill, clearTutorPrefill, teacherPrefill]);

  useEffect(() => {
    if (pendingAutoStartRef.current) {
      const job = pendingAutoStartRef.current;
      pendingAutoStartRef.current = null;
      if (job.mode === 'practice' || job.mode === 'pyq' || job.mode === 'revision') {
        void loadPracticeQuestion(job.topicObj, job.level, job.mode === 'pyq');
      } else {
        void loadTeacherLesson(job.topicObj, job.level, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId, subject, mode]);

  useEffect(() => {
    if (mode === 'doubt') {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading, mode]);

  const loadTeacherLesson = async (
    topicObj: CompleteSyllabusTopic = selectedTopicObj,
    levelOverride: DifficultyStage = difficultyLevel,
    isRev = mode === 'revision'
  ) => {
    setLessonLoading(true);
    setLessonError(null);
    setQuestion(null);
    setAnalysis(null);
    setSelectedOpt(null);
    setHintTier(0);

    markTopicLearning({
      topicId: topicObj.id,
      subject: topicObj.subject,
      topic: topicObj.title,
      level: levelOverride,
    });

    try {
      const res = await fetch('/api/ai/teacher-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: topicObj.subject,
          subjectTitle: SUBJECT_NAMES[topicObj.subject].en,
          topic: topicObj.title,
          level: levelOverride,
          language: teachingLanguage,
          isRevision: isRev || topicMastery[topicObj.id]?.needsRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load AI Teacher Lesson.');
      }
      setLesson(data as TeacherLessonData);
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Unable to load AI Teacher Lesson.');
    } finally {
      setLessonLoading(false);
    }
  };

  const loadPracticeQuestion = async (
    topicObj: CompleteSyllabusTopic = selectedTopicObj,
    levelOverride: DifficultyStage = difficultyLevel,
    preferPyq = mode === 'pyq'
  ) => {
    setQuestionLoading(true);
    setQuestionError(null);
    setSelectedOpt(null);
    setHintTier(0);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/ai/teacher-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: topicObj.subject,
          subjectTitle: SUBJECT_NAMES[topicObj.subject].en,
          topic: topicObj.title,
          keywords: topicObj.pyqTopicKeywords,
          level: levelOverride,
          language: teachingLanguage,
          preferPyq,
          excludeIds: seenQuestionIds.slice(-30),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to fetch practice question.');
      }
      const q = data as TeacherPracticeQuestion;
      setQuestion(q);
      setSeenQuestionIds((prev) => [...prev, q.id].slice(-40));
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Unable to fetch practice question.');
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleSubmitPracticeAnswer = async () => {
    if (!question || selectedOpt === null || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    const isCorrect = selectedOpt === question.correctIndex;

    try {
      const res = await fetch('/api/ai/mistake-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          options: question.options,
          selectedIndex: selectedOpt,
          correctIndex: question.correctIndex,
          subjectTitle: SUBJECT_NAMES[selectedTopicObj.subject].en,
          topic: selectedTopicObj.title,
          level: difficultyLevel,
          language: teachingLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not evaluate answer.');
      }
      const parsed = data as MistakeAnalysisData;
      setAnalysis(parsed);
      recordTopicPractice({
        topicId: selectedTopicObj.id,
        subject: selectedTopicObj.subject,
        topic: selectedTopicObj.title,
        isCorrect,
        level: difficultyLevel,
        wrongReason: isCorrect ? undefined : parsed.whyWrongOrRight,
        nextAction: parsed.nextAction,
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unable to run mistake analysis.');
      recordTopicPractice({
        topicId: selectedTopicObj.id,
        subject: selectedTopicObj.subject,
        topic: selectedTopicObj.title,
        isCorrect,
        level: difficultyLevel,
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAdvanceNextLevel = () => {
    const nextLvl: DifficultyStage =
      difficultyLevel === 'easy' ? 'medium' : difficultyLevel === 'medium' ? 'exam' : 'exam';
    setDifficultyLevel(nextLvl);
    void loadPracticeQuestion(selectedTopicObj, nextLvl, nextLvl === 'exam' || mode === 'pyq');
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [meta, b64] = result.split(',');
      const mimeMatch = meta?.match(/data:(.*?);base64/);
      if (b64 && mimeMatch?.[1]) {
        setAttachedImage({
          base64: b64,
          mimeType: mimeMatch[1],
          preview: result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendDoubtMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text && !attachedImage) return;
    if (chatLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text || 'Please explain the question in this image step by step.',
      language,
      imagePreview: attachedImage?.preview,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    persistTutorMessage(userMsg).catch(() => {});
    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setChatLoading(true);
    setChatError(null);
    setLastFailedText(null);

    const weakSubjects = (Object.keys(profile.subjectStats) as SubjectId[])
      .filter((s) => {
        const st = profile.subjectStats[s];
        return st && st.attempted > 0 && st.correct / st.attempted < 0.65;
      })
      .map((s) => SUBJECT_NAMES[s].en);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          language: teachingLanguage,
          subjectContext: SUBJECT_NAMES[selectedTopicObj.subject].en,
          topicContext: selectedTopicObj.title,
          mode,
          difficultyLevel,
          imageBase64: currentImage?.base64,
          imageMimeType: currentImage?.mimeType,
          studentContext: {
            level: levelInfo.current.name,
            targetPost: profile.targetPost,
            weakSubjects,
            revisionTopics: revisionDueTopics.map((r) => r.topic),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach Examora AI Personal Teacher.');
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: data.reply,
        language,
        createdAt: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, botMsg]);
      persistTutorMessage(botMsg).catch(() => {});
    } catch (err) {
      setLastFailedText(userMsg.text);
      setChatError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Examora AI Personal Teacher. Please try again.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  const askFollowUpInChat = (prompt: string) => {
    setMode('doubt');
    void sendDoubtMessage(prompt);
  };

  // Compute current active step in the 7-stage adaptive loop
  const activeLoopStep =
    analysis !== null
      ? analysis.nextAction === 'level_up'
        ? 7
        : 6
      : question !== null
      ? 5
      : lesson !== null
      ? 3
      : 2;

  const currentMastery = topicMastery[selectedTopicObj.id];
  const currentMasteryMeta = MASTERY_LABELS[currentMastery?.status || 'not_started'];

  return (
    <div className="space-y-5">
      {onHome && (
        <BackHomeBar
          title="SSC CGL AI Personal Teacher"
          onBack={onBack}
          onHome={onHome}
        />
      )}

      {/* Guided Adaptive Loop Strip */}
      <OceanGlassCard className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl ocean-gradient-accent text-[#062B3D] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base sm:text-lg text-[#062B3D] dark:text-[#F3FAFA]">
                SSC CGL Personal AI Teacher
              </h1>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                {SUBJECT_NAMES[selectedTopicObj.subject].en} · {selectedTopicObj.title} ·{' '}
                <span className={`font-bold ${currentMasteryMeta.tone}`}>
                  {currentMasteryMeta.label}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {revisionDueTopics.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstWeak = revisionDueTopics[0];
                  const match = COMPLETE_SSC_SYLLABUS.find((s) => s.id === firstWeak.topicId);
                  if (match) {
                    setSubject(match.subject);
                    setSelectedTopicId(match.id);
                    setMode('revision');
                    void loadTeacherLesson(match, firstWeak.level, true);
                  }
                }}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF8B78]/15 border border-[#FF8B78]/45 text-[#9A2D1F] dark:text-[#FF8B78] text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {revisionDueTopics.length} Revision Due
              </button>
            )}
            {onOpenMockTests && (
              <button
                type="button"
                onClick={onOpenMockTests}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/30 text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] hover:border-[#20C7C9] cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-[#20C7C9]" />
                Mock Tests
              </button>
            )}
          </div>
        </div>

        {/* 7-Step Flow Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
          {[
            { step: 1, label: '1. Subject' },
            { step: 2, label: '2. Topic' },
            { step: 3, label: '3. AI Lesson' },
            { step: 4, label: '4. Example' },
            { step: 5, label: '5. Practice' },
            { step: 6, label: '6. Mistake Fix' },
            { step: 7, label: '7. Next Level' },
          ].map((item) => {
            const done = activeLoopStep > item.step;
            const active = activeLoopStep === item.step || (activeLoopStep === 3 && item.step === 4);
            return (
              <div
                key={item.step}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border ${
                  active
                    ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#062B3D] dark:text-[#55D6D0]'
                    : done
                    ? 'border-[#8DE1D3]/45 bg-[#F3FAFA] dark:bg-[#062B3D]/60 text-[#075985] dark:text-[#8DE1D3]'
                    : 'border-transparent bg-white/50 dark:bg-[#062B3D]/30 text-[#073B50]/60 dark:text-[#8DE1D3]/55'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#20C7C9] shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-70" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </OceanGlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT RAIL: Subject, Topic Syllabus Tree, Language & Mode */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Teaching Language Style */}
          <OceanGlassCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#8DE1D3]">
                Teaching Language
              </span>
              <span className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80">
                {TEACHING_LANGUAGES.find((l) => l.code === teachingLanguage)?.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEACHING_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setTeachingLanguage(lang.code)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    teachingLanguage === lang.code
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#062B3D] dark:text-[#55D6D0] font-bold'
                      : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-[#073B50] dark:text-[#8DE1D3]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </OceanGlassCard>

          {/* 6 Practice & Study Modes */}
          <OceanGlassCard className="p-4 space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#8DE1D3]">
              Learning Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TEACHER_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMode(m.id);
                    if (m.id === 'practice') {
                      void loadPracticeQuestion(selectedTopicObj, difficultyLevel, false);
                    } else if (m.id === 'pyq') {
                      void loadPracticeQuestion(selectedTopicObj, difficultyLevel, true);
                    } else if (m.id === 'teach' || m.id === 'daily' || m.id === 'revision') {
                      void loadTeacherLesson(selectedTopicObj, difficultyLevel, m.id === 'revision');
                    }
                  }}
                  className={`text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                    mode === m.id
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#062B3D] dark:text-[#F3FAFA]'
                      : 'border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 text-[#073B50] dark:text-[#8DE1D3]'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] opacity-75 truncate">{m.hint}</div>
                </button>
              ))}
            </div>
          </OceanGlassCard>

          {/* Step 1: Subject + Step 2: Syllabus Topic Picker */}
          <OceanGlassCard className="p-4 space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#8DE1D3]">
              1. Choose Subject &amp; 2. Topic
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {ALL_TEACHER_SUBJECTS.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubject(sub.id)}
                  className={`min-h-[40px] px-2.5 py-2 rounded-xl text-left text-xs font-bold border transition-colors cursor-pointer ${
                    subject === sub.id
                      ? 'border-[#20C7C9] bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                      : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-[#073B50] dark:text-[#8DE1D3]'
                  }`}
                >
                  <div className="truncate">{SUBJECT_NAMES[sub.id].en}</div>
                  {sub.badge && (
                    <div className="text-[10px] font-semibold opacity-80">{sub.badge}</div>
                  )}
                </button>
              ))}
            </div>

            {subject === 'statistics' && (
              <p className="text-[11px] text-[#075985] dark:text-[#8DE1D3] bg-[#20C7C9]/10 rounded-xl px-3 py-2">
                Paper II (Statistics) applies only to Junior Statistical Officer (JSO) candidates.
              </p>
            )}

            <div className="max-h-[290px] overflow-y-auto space-y-1.5 pr-1">
              {subjectTopics.map((topicItem) => {
                const m = topicMastery[topicItem.id];
                const isSelected = selectedTopicObj.id === topicItem.id;
                const statusMeta = MASTERY_LABELS[m?.status || 'not_started'];
                return (
                  <button
                    key={topicItem.id}
                    type="button"
                    onClick={() => handleSelectTopic(topicItem)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#20C7C9] bg-[#20C7C9]/15'
                        : 'border-[#8DE1D3]/35 dark:border-[#20C7C9]/15 hover:border-[#20C7C9]/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-[#062B3D] dark:text-[#F3FAFA]">
                        {topicItem.title}
                      </div>
                      <div className="text-[11px] text-[#075985]/80 dark:text-[#8DE1D3]/80 truncate">
                        {topicItem.tier} · {topicItem.weightage}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${statusMeta.tone}`}>
                      {statusMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </OceanGlassCard>

          {/* Auto-Revision Queue */}
          {revisionDueTopics.length > 0 && (
            <OceanGlassCard className="p-4 space-y-2.5 border-[#FF8B78]/45">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#9A2D1F] dark:text-[#FF8B78] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  Auto-Revision Weak Topics
                </span>
                <span className="font-mono-num text-xs font-bold text-[#9A2D1F] dark:text-[#FF8B78]">
                  {revisionDueTopics.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {revisionDueTopics.slice(0, 4).map((rev) => {
                  const found = COMPLETE_SSC_SYLLABUS.find((s) => s.id === rev.topicId);
                  return (
                    <button
                      key={rev.topicId}
                      type="button"
                      onClick={() => {
                        if (!found) return;
                        setSubject(found.subject);
                        setSelectedTopicId(found.id);
                        setMode('revision');
                        setDifficultyLevel(rev.level);
                        void loadTeacherLesson(found, rev.level, true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#FF8B78]/10 hover:bg-[#FF8B78]/20 border border-[#FF8B78]/30 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{rev.topic}</div>
                        <div className="text-[10px] text-[#073B50]/75 dark:text-[#8DE1D3]">
                          {rev.correct}/{rev.attempted} correct · Revise now
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#FF8B78] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </OceanGlassCard>
          )}
        </aside>

        {/* RIGHT WORKSPACE: Structured Lesson + Worked Example + 1-by-1 Quiz + Mistake Fix OR Doubt Chat */}
        <section className="lg:col-span-8 space-y-4">
          {mode !== 'doubt' ? (
            <>
              {/* Active Topic Header & Level Switcher */}
              <OceanGlassCard className="p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0]">
                      {SUBJECT_NAMES[selectedTopicObj.subject].en} · {selectedTopicObj.tier} ·{' '}
                      {selectedTopicObj.weightage}
                    </div>
                    <h2 className="font-display text-xl font-extrabold text-[#062B3D] dark:text-[#F3FAFA]">
                      {selectedTopicObj.title}
                    </h2>
                    <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3]">
                      {selectedTopicObj.keySubtopics.join(' · ')}
                    </p>
                  </div>

                  {/* Difficulty Progression Selector */}
                  <div className="flex items-center gap-1.5 bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-1 rounded-xl">
                    {(['easy', 'medium', 'exam'] as DifficultyStage[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficultyLevel(lvl)}
                        className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          difficultyLevel === lvl
                            ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                            : 'text-[#073B50] dark:text-[#8DE1D3]'
                        }`}
                      >
                        {lvl === 'easy' ? 'Easy' : lvl === 'medium' ? 'Medium' : 'Exam Level'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Triggers */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                  <button
                    type="button"
                    disabled={lessonLoading}
                    onClick={() => void loadTeacherLesson(selectedTopicObj, difficultyLevel)}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold disabled:opacity-50 cursor-pointer"
                  >
                    {lessonLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                    {lesson ? 'Reload Lesson' : 'Start AI Teacher Lesson'}
                  </button>

                  <button
                    type="button"
                    disabled={questionLoading}
                    onClick={() =>
                      void loadPracticeQuestion(
                        selectedTopicObj,
                        difficultyLevel,
                        mode === 'pyq'
                      )
                    }
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#20C7C9] bg-[#20C7C9]/12 hover:bg-[#20C7C9]/22 text-[#062B3D] dark:text-[#55D6D0] text-xs font-extrabold disabled:opacity-50 cursor-pointer"
                  >
                    {questionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Target className="w-4 h-4" />
                    )}
                    {mode === 'pyq' ? 'Load Verified PYQ' : 'Practice Question'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('doubt')}
                    className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ask Doubt in Chat
                  </button>
                </div>
              </OceanGlassCard>

              {/* Empty Starter State before clicking Lesson or Practice */}
              {!lesson && !question && !lessonLoading && !questionLoading && !lessonError && !questionError && (
                <OceanGlassCard className="p-6 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#20C7C9]/15 text-[#20C7C9] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="font-display font-bold text-base text-[#062B3D] dark:text-[#F3FAFA]">
                        {teachingLanguage === 'manglish'
                          ? `Ready to master ${selectedTopicObj.title}?`
                          : `Ready to learn ${selectedTopicObj.title}?`}
                      </div>
                      <p className="text-sm text-[#073B50]/85 dark:text-[#8DE1D3] leading-relaxed whitespace-pre-line">
                        {teachingLanguage === 'manglish'
                          ? MANGLISH_WELCOME_GREETING
                          : `Tap "Start AI Teacher Lesson" for a simple explanation, formula, worked example, and exam shortcut at ${LEVEL_LABELS[difficultyLevel].title} — or jump straight into a 1-on-1 Practice Question.`}
                      </p>
                    </div>
                  </div>
                </OceanGlassCard>
              )}

              {/* Errors */}
              {(lessonError || questionError) && (
                <OceanGlassCard className="p-4 border-[#FF8B78]/60 bg-[#FF8B78]/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{lessonError || questionError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      lessonError
                        ? void loadTeacherLesson(selectedTopicObj, difficultyLevel)
                        : void loadPracticeQuestion(
                            selectedTopicObj,
                            difficultyLevel,
                            mode === 'pyq'
                          )
                    }
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075985] text-white text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </OceanGlassCard>
              )}

              {/* STEP 3 & 4: AI TEACHER LESSON + WORKED EXAMPLE */}
              {lessonLoading && (
                <OceanGlassCard className="p-6 flex items-center gap-3 text-sm font-semibold text-[#075985] dark:text-[#55D6D0]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#20C7C9]" />
                  Preparing your simple {LEVEL_LABELS[difficultyLevel].title} lesson for{' '}
                  {selectedTopicObj.title}...
                </OceanGlassCard>
              )}

              {lesson && !lessonLoading && (
                <OceanGlassCard className="p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#075985] dark:text-[#55D6D0]">
                      Step 3 &amp; 4 · AI Teacher Lesson + Worked Example ·{' '}
                      {LEVEL_LABELS[lesson.level].title}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        askFollowUpInChat(
                          `Please explain "${lesson.topic}" again in even simpler words with another small everyday example.`
                        )
                      }
                      className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                    >
                      Ask Follow-up →
                    </button>
                  </div>

                  {/* Easy Explanation */}
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-sm text-[#062B3D] dark:text-[#F3FAFA]">
                      Easy Explanation
                    </h3>
                    <p className="text-sm leading-relaxed text-[#073B50] dark:text-[#F3FAFA]/90 whitespace-pre-wrap">
                      {lesson.easyExplanation}
                    </p>
                  </div>

                  {/* Rule / Formula */}
                  <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 space-y-1">
                    <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                      Core Rule / Formula
                    </div>
                    <div className="font-mono-num text-sm font-semibold text-[#062B3D] dark:text-[#F3FAFA] whitespace-pre-wrap">
                      {lesson.ruleOrFormula}
                    </div>
                  </div>

                  {/* Worked Example */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#062B3D]/70 border border-[#20C7C9]/35 space-y-3">
                    <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                      Worked Example (Step-by-Step)
                    </div>
                    <div className="text-sm font-bold text-[#062B3D] dark:text-[#F3FAFA]">
                      {lesson.workedExample.problem}
                    </div>
                    <ol className="space-y-1.5 text-sm text-[#073B50] dark:text-[#8DE1D3] list-decimal list-inside">
                      {lesson.workedExample.steps.map((st, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {st}
                        </li>
                      ))}
                    </ol>
                    <div className="text-xs font-extrabold text-[#075985] dark:text-[#55D6D0] pt-1">
                      Final Answer: {lesson.workedExample.finalAnswer}
                    </div>
                  </div>

                  {/* Shortcut + Caution + Common Mistake */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#20C7C9]/10 border border-[#20C7C9]/30 space-y-2">
                      <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-[#20C7C9]" />
                        Exam Hall Shortcut
                      </div>
                      <p className="text-xs leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                        {lesson.examShortcut}
                      </p>
                      {lesson.whenNotToUseShortcut && (
                        <p className="text-[11px] font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
                          When NOT to use: {lesson.whenNotToUseShortcut}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FF8B78]/10 border border-[#FF8B78]/35 space-y-2">
                      <div className="text-xs font-bold text-[#9A2D1F] dark:text-[#FF8B78] flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Common Mistake to Avoid
                      </div>
                      <p className="text-xs leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                        {lesson.commonMistake}
                      </p>
                    </div>
                  </div>

                  {/* Understanding Check & Next Step */}
                  <div className="pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[#075985] dark:text-[#8DE1D3]">
                      {lesson.quickCheckPrompt || 'Understood this concept? Try one question now!'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void loadPracticeQuestion(
                          selectedTopicObj,
                          difficultyLevel,
                          mode === 'pyq'
                        )
                      }
                      className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
                    >
                      Try Practice Question <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </OceanGlassCard>
              )}

              {/* STEP 5 & 6: ONE-QUESTION-AT-A-TIME PRACTICE + MISTAKE ANALYSIS */}
              {questionLoading && (
                <OceanGlassCard className="p-6 flex items-center gap-3 text-sm font-semibold text-[#075985] dark:text-[#55D6D0]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#20C7C9]" />
                  Selecting {LEVEL_LABELS[difficultyLevel].title} question...
                </OceanGlassCard>
              )}

              {question && !questionLoading && (
                <OceanGlassCard className="p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                    <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                      Step 5 · Practice Question · {LEVEL_LABELS[question.level].title}
                    </div>
                    <div className="text-[11px] font-semibold text-[#073B50]/80 dark:text-[#8DE1D3]">
                      {question.provenance === 'AUTHENTIC_PYQ' && question.pyqMeta
                        ? `AUTHENTIC PYQ · SSC CGL ${question.pyqMeta.year} ${question.pyqMeta.tier}${
                            question.pyqMeta.examDate ? ` · ${question.pyqMeta.examDate}` : ''
                          } · ${question.pyqMeta.verificationStatus}`
                        : 'GENERATED PRACTICE · AI SSC-Pattern Question (Not Official PYQ)'}
                    </div>
                  </div>

                  <p className="text-base font-bold leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                    {question.question}
                  </p>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {question.options.map((opt, idx) => {
                      const letter = ['A', 'B', 'C', 'D'][idx];
                      const evaluated = analysis !== null || hintTier === 3;
                      const isCorrectOpt = idx === question.correctIndex;
                      const isChosen = selectedOpt === idx;

                      let cls =
                        'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-white/85 dark:bg-[#062B3D]/70 hover:border-[#20C7C9]';
                      if (evaluated) {
                        if (isCorrectOpt) {
                          cls =
                            'border-emerald-500 bg-emerald-500/12 text-emerald-900 dark:text-emerald-200';
                        } else if (isChosen && !isCorrectOpt) {
                          cls =
                            'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]';
                        }
                      } else if (isChosen) {
                        cls =
                          'border-[#20C7C9] bg-[#20C7C9]/15 text-[#062B3D] dark:text-[#F3FAFA]';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={evaluated}
                          onClick={() => setSelectedOpt(idx)}
                          className={`min-h-[48px] text-left px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors flex items-start gap-2.5 cursor-pointer disabled:cursor-default ${cls}`}
                        >
                          <span className="font-mono-num font-extrabold text-xs px-2 py-0.5 rounded-md bg-[#075985]/10 dark:bg-[#20C7C9]/20 shrink-0">
                            {letter}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Hints & Submit Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHintTier((prev) => (prev < 1 ? 1 : prev))}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold text-[#075985] dark:text-[#8DE1D3] cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-[#20C7C9]" />
                        Hint 1
                      </button>
                      {hintTier >= 1 && (
                        <button
                          type="button"
                          onClick={() => setHintTier((prev) => (prev < 2 ? 2 : prev))}
                          className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold text-[#075985] dark:text-[#8DE1D3] cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#20C7C9]" />
                          Hint 2 (Formula)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setHintTier(3)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] hover:underline cursor-pointer"
                      >
                        Show Full Answer
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={selectedOpt === null || analysisLoading || analysis !== null}
                      onClick={() => void handleSubmitPracticeAnswer()}
                      className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold disabled:opacity-45 cursor-pointer"
                    >
                      {analysisLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing Answer...
                        </>
                      ) : (
                        <>
                          Check Answer <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Revealed Hint Box */}
                  {hintTier >= 1 && hintTier < 3 && (
                    <div className="p-4 rounded-2xl bg-[#20C7C9]/10 border border-[#20C7C9]/30 space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-[#075985] dark:text-[#55D6D0]">
                          Hint 1:{' '}
                        </span>
                        <span>{question.hint1}</span>
                      </div>
                      {hintTier >= 2 && (
                        <div>
                          <span className="font-bold text-[#075985] dark:text-[#55D6D0]">
                            Hint 2 (Step / Formula):{' '}
                          </span>
                          <span>{question.hint2}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show Full Answer Box (if student asked for answer directly or after checking) */}
                  {(hintTier === 3 || analysis !== null) && (
                    <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 space-y-2 text-xs">
                      <div className="font-bold text-[#075985] dark:text-[#55D6D0]">
                        Correct Option: {['A', 'B', 'C', 'D'][question.correctIndex]} —{' '}
                        {question.options[question.correctIndex]}
                      </div>
                      <p className="leading-relaxed text-[#062B3D] dark:text-[#F3FAFA] whitespace-pre-wrap">
                        {question.fullSolution}
                      </p>
                      {question.memoryTip && (
                        <div className="text-[11px] font-semibold text-[#075985] dark:text-[#8DE1D3]">
                          Memory Tip: {question.memoryTip}
                        </div>
                      )}
                    </div>
                  )}

                  {analysisError && (
                    <div className="text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
                      {analysisError}
                    </div>
                  )}

                  {/* STEP 6 & 7: MISTAKE ANALYSIS + NEXT LEVEL PROGRESSION */}
                  {analysis && (
                    <div
                      className={`p-5 rounded-2xl border-2 space-y-3 ${
                        analysis.isCorrect
                          ? 'border-emerald-500/45 bg-emerald-500/8'
                          : 'border-[#FF8B78]/60 bg-[#FF8B78]/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          className={`text-sm font-extrabold flex items-center gap-2 ${
                            analysis.isCorrect
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-[#9A2D1F] dark:text-[#FF8B78]'
                          }`}
                        >
                          {analysis.isCorrect ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Well Done! Right Answer
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              Mistake Analysis · Added to Auto-Revision
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                        {analysis.whyWrongOrRight}
                      </p>

                      {!analysis.isCorrect && analysis.simpleReteach && (
                        <div className="text-xs leading-relaxed text-[#073B50] dark:text-[#8DE1D3] bg-white/75 dark:bg-[#062B3D]/60 p-3 rounded-xl">
                          <span className="font-bold">Simple Re-teach: </span>
                          {analysis.simpleReteach}
                        </div>
                      )}

                      {analysis.memoryTrick && (
                        <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0]">
                          Memory Trick: {analysis.memoryTrick}
                        </div>
                      )}

                      {analysis.checkQuestion && (
                        <div className="text-xs text-[#073B50]/85 dark:text-[#8DE1D3]">
                          Quick Check: {analysis.checkQuestion}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 pt-2">
                        {analysis.isCorrect && difficultyLevel !== 'exam' && (
                          <button
                            type="button"
                            onClick={handleAdvanceNextLevel}
                            className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
                          >
                            Advance to{' '}
                            {difficultyLevel === 'easy'
                              ? 'Level 2 · Medium'
                              : 'Level 3 · Exam Level'}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            void loadPracticeQuestion(
                              selectedTopicObj,
                              analysis.nextAction === 'step_down' && difficultyLevel !== 'easy'
                                ? 'easy'
                                : difficultyLevel,
                              mode === 'pyq'
                            )
                          }
                          className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] text-white text-xs font-bold cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Next Practice Question
                        </button>
                        {!analysis.isCorrect && (
                          <button
                            type="button"
                            onClick={() =>
                              askFollowUpInChat(
                                `Explain why my choice "${question.options[selectedOpt || 0]}" was wrong in "${question.question}" and teach me "${selectedTopicObj.title}" again simply.`
                              )
                            }
                            className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold text-[#075985] dark:text-[#8DE1D3] cursor-pointer"
                          >
                            Discuss Doubt in Chat
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </OceanGlassCard>
              )}
            </>
          ) : (
            /* QUICK DOUBT & CONVERSATIONAL TEACHER CHAT */
            <div className="bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl ocean-shadow flex flex-col h-[640px]">
              <div className="px-5 py-3.5 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                  Quick Doubt Mode ·{' '}
                  {TEACHING_LANGUAGES.find((l) => l.code === teachingLanguage)?.label} · Focus:{' '}
                  {selectedTopicObj.title}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('teach')}
                    className="min-h-[34px] px-3 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0] text-xs font-bold cursor-pointer"
                  >
                    Back to Guided Lesson
                  </button>
                  {chatHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearTutorHistory()}
                      className="min-h-[34px] inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] hover:text-[#FF8B78] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.clearChat}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="space-y-4 max-w-lg mx-auto py-6">
                    <div className="bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 rounded-2xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-line text-[#062B3D] dark:text-[#F3FAFA]">
                      {teachingLanguage === 'manglish'
                        ? MANGLISH_WELCOME_GREETING
                        : `Hi! I am your SSC CGL Personal AI Teacher. Pick any subject and topic on the left, or type any doubt below (you can also upload a question screenshot!).`}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        `Teach me ${selectedTopicObj.title} from scratch with 1 easy example`,
                        `Give me 1 SSC exam-level shortcut for ${selectedTopicObj.title}`,
                        'Give me today’s 15-minute SSC CGL study step',
                        'Compare Tier 1 vs Tier 2 marking & cut-off strategy',
                      ].map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => void sendDoubtMessage(prompt)}
                          className="text-left p-3 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 hover:border-[#20C7C9] text-xs font-medium leading-relaxed cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-[#075985] text-[#F3FAFA] dark:bg-[#20C7C9] dark:text-[#062B3D] font-medium'
                            : 'bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-[#062B3D] dark:text-[#F3FAFA]'
                        }`}
                      >
                        {msg.imagePreview && (
                          <img
                            src={msg.imagePreview}
                            alt="Uploaded question"
                            className="max-h-44 rounded-lg mb-2 object-contain"
                          />
                        )}
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#075985] dark:text-[#55D6D0]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#20C7C9]" />
                    <span>Personal AI Teacher is writing your step-by-step reply...</span>
                  </div>
                )}

                {chatError && (
                  <div className="p-3.5 rounded-xl border border-[#FF8B78]/50 bg-[#FF8B78]/12 text-xs flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[#9A2D1F] dark:text-[#FF8B78] font-medium">
                      {chatError}
                    </span>
                    {lastFailedText && (
                      <button
                        type="button"
                        onClick={() => void sendDoubtMessage(lastFailedText)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075985] text-white font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="p-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 space-y-2">
                {attachedImage && (
                  <div className="inline-flex items-center gap-2 bg-[#20C7C9]/15 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <span>Image attached</span>
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="text-[#075985] hover:text-[#FF8B78] cursor-pointer"
                      aria-label="Remove attached image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendDoubtMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImagePick}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-[#075985] dark:text-[#8DE1D3] hover:border-[#20C7C9] cursor-pointer"
                    title="Upload question image"
                    aria-label="Upload question image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.tutorPlaceholder}
                    className="flex-1 min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20C7C9]"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || (!input.trim() && !attachedImage)}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {t.sendBtn}
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
