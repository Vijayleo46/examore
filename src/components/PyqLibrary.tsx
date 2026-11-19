import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Flag,
  Layers,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { soundFX } from '../lib/sound';
import {
  AnswerVerificationStatus,
  MockTestConfig,
  Question,
  SubjectId,
} from '../types/examverse';
import { MockTestEngine } from './MockTestEngine';
import { FirstTimeTip, OceanGlassCard } from './OceanTheme';

type StudyMode = 'study' | 'practice';
type SortOption = 'year-desc' | 'year-asc' | 'subject' | 'topic';
type CollectionScope =
  | 'all'
  | 'bookmarked'
  | 'difficult'
  | 'revision'
  | 'attempted'
  | 'incorrect';

interface PyqArchiveSummary {
  total: number;
  byYear: Record<number, number>;
  bySubject: Record<SubjectId, number>;
  byTier: { tier1: number; tier2: number };
  byStatus: { official: number; unofficial: number; needs_verification: number };
  topicsBySubject: Record<string, string[]>;
  examDates: string[];
  shifts: string[];
}

const YEARS_2016_2026 = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
const PAGE_SIZE = 20;

interface PyqLibraryProps {
  embedded?: boolean;
  onBackHome?: () => void;
}

function getVerificationBadge(q: Question): {
  status: AnswerVerificationStatus;
  label: string;
  toneClass: string;
} {
  const status: AnswerVerificationStatus =
    q.answerStatus ||
    (q.sourceType === 'AI_GENERATED'
      ? 'needs_verification'
      : q.isVerified === false
      ? 'unofficial'
      : 'official');

  if (status === 'official') {
    return {
      status,
      label: 'Official Final Key',
      toneClass:
        'text-emerald-700 dark:text-emerald-300 border-emerald-500/35 bg-emerald-500/10',
    };
  }
  if (status === 'unofficial') {
    return {
      status,
      label: 'Unofficial Key',
      toneClass:
        'text-amber-700 dark:text-amber-300 border-amber-500/35 bg-amber-500/10',
    };
  }
  return {
    status,
    label: 'Needs Verification',
    toneClass:
      'text-[#9A2D1F] dark:text-[#FF8B78] border-[#FF8B78]/40 bg-[#FF8B78]/12',
  };
}

export const PyqLibrary: React.FC<PyqLibraryProps> = ({
  embedded = false,
  onBackHome,
}) => {
  const {
    language,
    questions,
    loadingQuestions,
    bookmarks,
    difficultQuestionIds,
    revisionListIds,
    pyqAttempts,
    toggleBookmark,
    toggleDifficultQuestion,
    toggleRevisionQuestion,
    recordPyqAttempt,
    openTutorWithPrompt,
    isAdmin,
  } = useApp();

  const t = UI_TEXT[language];

  // Mode & Scope
  const [studyMode, setStudyMode] = useState<StudyMode>('study');
  const [scope, setScope] = useState<CollectionScope>('all');

  // Filters & Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<'all' | 'Tier 1' | 'Tier 2'>('all');
  const [selectedSubject, setSelectedSubject] = useState<'all' | SubjectId>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedExamDate, setSelectedExamDate] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | AnswerVerificationStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('year-desc');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pagination (never truncates total collection)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Full 20,956+ Archive Server Integration (falls back cleanly to local libraryPool if unavailable)
  const [archiveSummary, setArchiveSummary] = useState<PyqArchiveSummary | null>(null);
  const [serverItems, setServerItems] = useState<Question[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverPage, setServerPage] = useState<number>(1);
  const [loadingArchive, setLoadingArchive] = useState<boolean>(false);
  const [archiveReady, setArchiveReady] = useState<boolean>(false);
  const archiveCacheRef = useRef<Map<string, Question>>(new Map());

  // 1-Click Past Paper Mock Launcher state
  const [activeMock, setActiveMock] = useState<{
    test: MockTestConfig;
    questions: Question[];
  } | null>(null);
  const [launchingMock, setLaunchingMock] = useState(false);

  // Inline Quick Answer preview map & Active Question Detail Screen
  const [inlineAnswerVisible, setInlineAnswerVisible] = useState<Record<string, boolean>>({});
  const [detailQuestionId, setDetailQuestionId] = useState<string | null>(null);
  const [detailShowAnswer, setDetailShowAnswer] = useState(true);
  const [showHindiStem, setShowHindiStem] = useState(false);

  // Practice session state
  const [sessionSelected, setSessionSelected] = useState<Record<string, number>>({});

  // Visible pool respecting publish flag (curated 326 + any custom Firestore items)
  const libraryPool = useMemo(() => {
    return questions.filter((q) => isAdmin || q.isPublished !== false);
  }, [questions, isAdmin]);

  // Fetch archive summary once on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/pyq/summary')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Summary unavailable'))))
      .then((data: PyqArchiveSummary) => {
        if (cancelled || !data || typeof data.total !== 'number') return;
        setArchiveSummary(data);
        setArchiveReady(true);
      })
      .catch(() => {
        if (!cancelled) setArchiveReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch matching paginated questions from full archive when scope === 'all'
  useEffect(() => {
    if (!archiveReady || scope !== 'all') return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingArchive(true);
      const params = new URLSearchParams({
        year: selectedYear,
        tier: selectedTier,
        subject: selectedSubject,
        topic: selectedTopic,
        examDate: selectedExamDate,
        shift: selectedShift,
        difficulty: selectedDifficulty,
        answerStatus: selectedStatus,
        q: searchQuery.trim(),
        sort: sortBy,
        page: String(serverPage),
        limit: String(PAGE_SIZE),
      });
      fetch(`/api/pyq/questions?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Query failed'))))
        .then((data: { items?: Question[]; total?: number }) => {
          if (cancelled) return;
          const incoming = Array.isArray(data.items) ? data.items : [];
          incoming.forEach((item) => archiveCacheRef.current.set(item.id, item));
          setServerTotal(Number(data.total) || 0);
          setServerItems((prev) => {
            if (serverPage === 1) return incoming;
            const seen = new Set(prev.map((x) => x.id));
            return [...prev, ...incoming.filter((x) => !seen.has(x.id))];
          });
        })
        .catch(() => {
          if (!cancelled) setArchiveReady(false);
        })
        .finally(() => {
          if (!cancelled) setLoadingArchive(false);
        });
    }, searchQuery.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    archiveReady,
    scope,
    selectedYear,
    selectedTier,
    selectedSubject,
    selectedTopic,
    selectedExamDate,
    selectedShift,
    selectedDifficulty,
    selectedStatus,
    searchQuery,
    sortBy,
    serverPage,
  ]);

  // Reset server page to 1 whenever any filter changes
  const resetPagination = () => {
    setVisibleCount(PAGE_SIZE);
    setServerPage(1);
  };

  // Real dynamic counts (archive summary + local stats)
  const libraryStats = useMemo(() => {
    const byYear: Record<number, number> = {};
    YEARS_2016_2026.forEach((y) => {
      byYear[y] = 0;
    });
    const bySubject: Record<SubjectId, number> = {
      quant: 0,
      reasoning: 0,
      english: 0,
      ga: 0,
      computer: 0,
      statistics: 0,
    };

    const incorrectCount = Object.values(pyqAttempts).filter((a) => !a.isCorrect).length;
    const attemptedCount = Object.keys(pyqAttempts).length;
    const bookmarkedQCount = bookmarks.filter((b) => b.itemType === 'question').length;

    if (archiveReady && archiveSummary) {
      YEARS_2016_2026.forEach((y) => {
        byYear[y] = archiveSummary.byYear[y] || 0;
      });
      (['quant', 'reasoning', 'english', 'ga', 'computer', 'statistics'] as SubjectId[]).forEach((s) => {
        bySubject[s] = archiveSummary.bySubject[s] || 0;
      });
      return {
        total: archiveSummary.total,
        byYear,
        bySubject,
        officialCount: archiveSummary.byStatus.official,
        unofficialCount: archiveSummary.byStatus.unofficial,
        needsVerificationCount: archiveSummary.byStatus.needs_verification,
        tier1Count: archiveSummary.byTier.tier1,
        tier2Count: archiveSummary.byTier.tier2,
        incorrectCount,
        attemptedCount,
        bookmarkedQCount,
      };
    }

    let officialCount = 0;
    let unofficialCount = 0;
    let needsVerificationCount = 0;
    let tier1Count = 0;
    let tier2Count = 0;

    libraryPool.forEach((q) => {
      if (byYear[q.year] !== undefined) byYear[q.year] += 1;
      bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
      if (q.tier === 'Tier 2') tier2Count += 1;
      else tier1Count += 1;

      const badge = getVerificationBadge(q);
      if (badge.status === 'official') officialCount += 1;
      else if (badge.status === 'unofficial') unofficialCount += 1;
      else needsVerificationCount += 1;
    });

    return {
      total: libraryPool.length,
      byYear,
      bySubject,
      officialCount,
      unofficialCount,
      needsVerificationCount,
      tier1Count,
      tier2Count,
      incorrectCount,
      attemptedCount,
      bookmarkedQCount,
    };
  }, [archiveReady, archiveSummary, libraryPool, pyqAttempts, bookmarks]);

  // Dynamic filter dropdown options derived from archive summary or local pool
  const availableTopics = useMemo(() => {
    if (archiveReady && archiveSummary) {
      if (selectedSubject === 'all') {
        const set = new Set<string>();
        Object.values(archiveSummary.topicsBySubject || {}).forEach((arr) =>
          arr.forEach((tp) => set.add(tp))
        );
        return Array.from(set).sort((a, b) => a.localeCompare(b));
      }
      return [...(archiveSummary.topicsBySubject[selectedSubject] || [])].sort((a, b) =>
        a.localeCompare(b)
      );
    }
    const set = new Set<string>();
    libraryPool.forEach((q) => {
      if (selectedSubject === 'all' || q.subject === selectedSubject) {
        if (q.topic) set.add(q.topic);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [archiveReady, archiveSummary, libraryPool, selectedSubject]);

  const availableExamDates = useMemo(() => {
    if (archiveReady && archiveSummary?.examDates?.length) {
      return archiveSummary.examDates;
    }
    const set = new Set<string>();
    libraryPool.forEach((q) => {
      if (q.examDate) set.add(q.examDate);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [archiveReady, archiveSummary, libraryPool]);

  const availableShifts = useMemo(() => {
    if (archiveReady && archiveSummary?.shifts?.length) {
      return archiveSummary.shifts;
    }
    const set = new Set<string>();
    libraryPool.forEach((q) => {
      if (q.shift) set.add(q.shift);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [archiveReady, archiveSummary, libraryPool]);

  const bookmarkedIdsSet = useMemo(
    () =>
      new Set(
        bookmarks.filter((b) => b.itemType === 'question').map((b) => b.itemId)
      ),
    [bookmarks]
  );

  const difficultSet = useMemo(() => new Set(difficultQuestionIds), [difficultQuestionIds]);
  const revisionSet = useMemo(() => new Set(revisionListIds), [revisionListIds]);

  const combinedLocalAndCachedPool = useMemo(() => {
    const map = new Map<string, Question>();
    libraryPool.forEach((q) => map.set(q.id, q));
    archiveCacheRef.current.forEach((q, id) => {
      if (!map.has(id)) map.set(id, q);
    });
    return Array.from(map.values());
  }, [libraryPool, serverItems]);

  // Filtered + Sorted questions
  const filteredQuestions = useMemo(() => {
    if (archiveReady && scope === 'all') {
      return serverItems;
    }
    const qLower = searchQuery.trim().toLowerCase();

    const filtered = combinedLocalAndCachedPool.filter((q) => {
      if (scope === 'bookmarked' && !bookmarkedIdsSet.has(q.id)) return false;
      if (scope === 'difficult' && !difficultSet.has(q.id)) return false;
      if (scope === 'revision' && !revisionSet.has(q.id)) return false;
      if (scope === 'attempted' && !pyqAttempts[q.id]) return false;
      if (scope === 'incorrect') {
        const rec = pyqAttempts[q.id];
        if (!rec || rec.isCorrect) return false;
      }

      if (selectedYear !== 'all' && String(q.year) !== selectedYear) return false;
      if (selectedTier !== 'all' && q.tier !== selectedTier) return false;
      if (selectedSubject !== 'all' && q.subject !== selectedSubject) return false;
      if (selectedTopic !== 'all' && q.topic !== selectedTopic) return false;
      if (selectedExamDate !== 'all' && (q.examDate || '') !== selectedExamDate) return false;
      if (selectedShift !== 'all' && q.shift !== selectedShift) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;

      if (selectedStatus !== 'all') {
        const badge = getVerificationBadge(q);
        if (badge.status !== selectedStatus) return false;
      }

      if (qLower) {
        const haystack = [
          q.questionEn,
          q.questionHi || '',
          q.topic,
          q.shift,
          q.sourceLabel,
          q.explanations[language] || '',
          q.explanations.en || '',
          q.examDate || '',
          String(q.year),
          String(q.questionNumber || ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'year-desc') {
        if (b.year !== a.year) return b.year - a.year;
        return (a.questionNumber || 9999) - (b.questionNumber || 9999);
      }
      if (sortBy === 'year-asc') {
        if (a.year !== b.year) return a.year - b.year;
        return (a.questionNumber || 9999) - (b.questionNumber || 9999);
      }
      if (sortBy === 'subject') {
        const subCmp = SUBJECT_NAMES[a.subject].en.localeCompare(SUBJECT_NAMES[b.subject].en);
        if (subCmp !== 0) return subCmp;
        return b.year - a.year;
      }
      // topic-wise
      const topCmp = a.topic.localeCompare(b.topic);
      if (topCmp !== 0) return topCmp;
      return b.year - a.year;
    });

    return sorted;
  }, [
    archiveReady,
    scope,
    serverItems,
    combinedLocalAndCachedPool,
    bookmarkedIdsSet,
    difficultSet,
    revisionSet,
    pyqAttempts,
    selectedYear,
    selectedTier,
    selectedSubject,
    selectedTopic,
    selectedExamDate,
    selectedShift,
    selectedDifficulty,
    selectedStatus,
    searchQuery,
    language,
    sortBy,
  ]);

  const usingServerPagination = archiveReady && scope === 'all';
  const totalMatchingCount = usingServerPagination ? serverTotal : filteredQuestions.length;

  const displayedQuestions = useMemo(
    () => (usingServerPagination ? filteredQuestions : filteredQuestions.slice(0, visibleCount)),
    [usingServerPagination, filteredQuestions, visibleCount]
  );

  // Live Practice Session Score
  const sessionStats = useMemo(() => {
    const entries = Object.entries(sessionSelected);
    let correct = 0;
    entries.forEach(([qId, optIdx]) => {
      const q = combinedLocalAndCachedPool.find((item) => item.id === qId);
      if (q && q.correctIndex === optIdx) correct++;
    });
    const attempted = entries.length;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return { attempted, correct, accuracy };
  }, [sessionSelected, combinedLocalAndCachedPool]);

  const activeDetailIndex = useMemo(() => {
    if (!detailQuestionId) return -1;
    return filteredQuestions.findIndex((q) => q.id === detailQuestionId);
  }, [filteredQuestions, detailQuestionId]);

  const activeDetailQuestion =
    activeDetailIndex >= 0 ? filteredQuestions[activeDetailIndex] : null;

  const openQuestionDetail = (q: Question, revealAnswerInStudy = true) => {
    setDetailQuestionId(q.id);
    setShowHindiStem(false);
    if (studyMode === 'study') {
      setDetailShowAnswer(revealAnswerInStudy);
    } else {
      setDetailShowAnswer(sessionSelected[q.id] !== undefined);
    }
  };

  const handleSelectOption = (q: Question, optIdx: number) => {
    if (sessionSelected[q.id] !== undefined) return;
    setSessionSelected((prev) => ({ ...prev, [q.id]: optIdx }));
    const ok = optIdx === q.correctIndex;
    if (ok) soundFX.playCorrect();
    else soundFX.playWrong();
    recordPyqAttempt(q, optIdx);
    if (detailQuestionId === q.id) {
      setDetailShowAnswer(true);
    }
  };

  const resetAllFilters = () => {
    setScope('all');
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedTier('all');
    setSelectedSubject('all');
    setSelectedTopic('all');
    setSelectedExamDate('all');
    setSelectedShift('all');
    setSelectedDifficulty('all');
    setSelectedStatus('all');
    setSortBy('year-desc');
    resetPagination();
  };

  const handleLaunchPastPaperMock = async () => {
    setLaunchingMock(true);
    try {
      const tierParam = selectedTier === 'all' ? 'Tier 1' : selectedTier;
      let mockQs: Question[] = [];
      try {
        const params = new URLSearchParams({
          year: selectedYear,
          tier: tierParam,
          subject: selectedSubject,
          limit: '25',
        });
        const res = await fetch(`/api/pyq/mock-set?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as { questions?: Question[] };
          if (Array.isArray(data.questions)) {
            mockQs = data.questions;
          }
        }
      } catch {
        // Fallback to local pool below
      }
      if (mockQs.length === 0) {
        mockQs = filteredQuestions.slice(0, 25);
      }
      if (mockQs.length === 0) {
        return;
      }
      const marksPerQ = tierParam === 'Tier 2' ? 3 : 2;
      const negPerQ = tierParam === 'Tier 2' ? 1 : 0.5;
      const yrLabel = selectedYear === 'all' ? '2016–2026' : selectedYear;
      const subIds = Array.from(new Set(mockQs.map((q) => q.subject))) as SubjectId[];
      const test: MockTestConfig = {
        id: `pyp-mock-${yrLabel}-${tierParam.toLowerCase().replace(/\s+/g, '')}-${selectedSubject}`,
        title: `SSC CGL ${yrLabel} ${tierParam} Past Paper Mock`,
        category: tierParam,
        subjectIds: subIds.length > 0 ? subIds : ['quant', 'reasoning', 'english', 'ga'],
        durationMinutes: Math.max(10, Math.round(mockQs.length * 0.9)),
        totalMarks: mockQs.length * marksPerQ,
        marksPerCorrect: marksPerQ,
        negativeMarking: negPerQ,
        questionIds: mockQs.map((q) => q.id),
        description: `Timed past-paper test drawn from SSC CGL ${yrLabel} ${tierParam} archive (${mockQs.length} verified questions).`,
        isPublished: true,
      };
      setActiveMock({ test, questions: mockQs });
    } finally {
      setLaunchingMock(false);
    }
  };

  const hasActiveFilters =
    scope !== 'all' ||
    searchQuery.trim() !== '' ||
    selectedYear !== 'all' ||
    selectedTier !== 'all' ||
    selectedSubject !== 'all' ||
    selectedTopic !== 'all' ||
    selectedExamDate !== 'all' ||
    selectedShift !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedStatus !== 'all';

  if (activeMock) {
    return (
      <MockTestEngine
        test={activeMock.test}
        customQuestions={activeMock.questions}
        onExit={() => setActiveMock(null)}
      />
    );
  }

  // =========================================================================
  // 4. QUESTION DETAIL SCREEN (Full View with Prev/Next Navigation)
  // =========================================================================
  if (activeDetailQuestion) {
    const q = activeDetailQuestion;
    const badge = getVerificationBadge(q);
    const chosen = sessionSelected[q.id] ?? (studyMode === 'practice' ? undefined : undefined);
    const prevAttempt = pyqAttempts[q.id];
    const isAnsweredInSession = sessionSelected[q.id] !== undefined;
    const answerRevealed =
      studyMode === 'study' ? detailShowAnswer : isAnsweredInSession || detailShowAnswer;
    const isBm = bookmarkedIdsSet.has(q.id);
    const isDiff = difficultSet.has(q.id);
    const isRev = revisionSet.has(q.id);
    const prevQ = activeDetailIndex > 0 ? filteredQuestions[activeDetailIndex - 1] : null;
    const nextQ =
      activeDetailIndex >= 0 && activeDetailIndex < filteredQuestions.length - 1
        ? filteredQuestions[activeDetailIndex + 1]
        : null;

    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Top Detail Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDetailQuestionId(null)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/85 dark:bg-[#073B50]/85 text-xs font-bold hover:border-[#20C7C9] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Question List
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono-num text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Viewing {activeDetailIndex + 1} of {filteredQuestions.length}
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-[#073B50]/80 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25">
              <button
                type="button"
                onClick={() => {
                  setStudyMode('study');
                  setDetailShowAnswer(true);
                }}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  studyMode === 'study'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                Study Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudyMode('practice');
                  setDetailShowAnswer(sessionSelected[q.id] !== undefined);
                }}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  studyMode === 'practice'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                Practice Mode
              </button>
            </div>
          </div>
        </div>

        <OceanGlassCard className="p-6 sm:p-8 space-y-6">
          {/* Exam Metadata & Verification Row */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono-num font-extrabold text-[#062B3D] dark:text-white">
                  {q.questionNumber ? `Q.${q.questionNumber}` : `Q.${activeDetailIndex + 1}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>{SUBJECT_NAMES[q.subject][language]}</span>
                <span aria-hidden="true">·</span>
                <span>{q.topic}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{q.year}</span>
                <span aria-hidden="true">·</span>
                <span>{q.tier}</span>
                {q.examDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{q.examDate}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{q.shift}</span>
                <span aria-hidden="true">·</span>
                <span>{q.difficulty}</span>
              </div>
              <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80">
                Source: {q.sourceLabel}
                {prevAttempt && (
                  <span className="ml-2 font-semibold">
                    · Previously attempted ({prevAttempt.isCorrect ? 'Correct' : 'Incorrect'})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.toneClass}`}
              >
                {badge.status === 'official' ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {badge.label}
              </span>
            </div>
          </div>

          {/* 1. Complete Question Stem */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#075985] dark:text-[#8DE1D3]">
                {t.originalQuestionLabel}
              </span>
              {q.questionHi && (
                <button
                  type="button"
                  onClick={() => setShowHindiStem((s) => !s)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
                >
                  {showHindiStem ? 'Show English' : 'हिन्दी अनुवाद देखें'}
                </button>
              )}
            </div>
            <p className="text-base sm:text-lg font-semibold leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
              {showHindiStem && q.questionHi ? q.questionHi : q.questionEn}
            </p>
          </div>

          {/* 2. Four Answer Options */}
          <div className="space-y-2.5">
            {q.optionsEn.map((opt, oi) => {
              const isCorrectOpt = oi === q.correctIndex;
              const isSelected = chosen === oi;
              let cls =
                'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-white/85 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]';

              if (answerRevealed) {
                if (isCorrectOpt) {
                  cls =
                    'border-emerald-500 bg-emerald-500/12 dark:bg-emerald-500/20 font-bold text-[#062B3D] dark:text-white';
                } else if (isSelected) {
                  cls =
                    'border-[#FF8B78] bg-[#FF8B78]/15 dark:bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]';
                }
              }

              return (
                <button
                  key={oi}
                  type="button"
                  disabled={studyMode === 'practice' && isAnsweredInSession}
                  onClick={() => {
                    if (studyMode === 'practice') {
                      handleSelectOption(q, oi);
                    } else {
                      setSessionSelected((prev) => ({ ...prev, [q.id]: oi }));
                      setDetailShowAnswer(true);
                    }
                  }}
                  className={`w-full min-h-[52px] text-left px-4 py-3 rounded-2xl border-2 text-sm transition-colors flex items-center justify-between gap-3 cursor-pointer ${cls}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num text-xs w-7 h-7 rounded-lg border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 flex items-center justify-center shrink-0 font-bold">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {answerRevealed && isCorrectOpt && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Correct Answer
                    </span>
                  )}
                  {answerRevealed && isSelected && !isCorrectOpt && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF8B78] shrink-0">
                      <XCircle className="w-4 h-4" /> Your Choice
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show / Hide Answer Toggle + Revision Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailShowAnswer((v) => !v)}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
              >
                {answerRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Hide Answer
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Show Answer & Solution
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleBookmark('question', q.id, q.questionEn.slice(0, 80), q.subject)
                }
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isBm
                    ? 'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]'
                    : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                {isBm ? 'Bookmarked' : 'Bookmark'}
              </button>

              <button
                type="button"
                onClick={() => toggleDifficultQuestion(q.id)}
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDiff
                    ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                }`}
              >
                <Flag className="w-4 h-4" />
                {isDiff ? 'Marked Difficult' : 'Mark Difficult'}
              </button>

              <button
                type="button"
                onClick={() => toggleRevisionQuestion(q.id)}
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isRev
                    ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                    : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                {isRev ? 'In Revision List' : 'Save for Revision'}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                openTutorWithPrompt(
                  `Explain this SSC CGL ${q.year} ${q.tier} question (${q.topic}) step by step and show a quick exam shortcut:\n"${q.questionEn}"`
                )
              }
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#20C7C9]/50 text-[#075985] dark:text-[#55D6D0] text-xs font-bold hover:bg-[#20C7C9]/10 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              Ask Examora AI
            </button>
          </div>

          {/* 3–7. Revealed Answer + Explanation + Step-by-Step + Shortcut Method */}
          {answerRevealed && (
            <div className="space-y-4 pt-4 border-t border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Correct Answer: Option{' '}
                    <span className="font-mono-num">
                      {String.fromCharCode(65 + q.correctIndex)}
                    </span>{' '}
                    — {q.optionsEn[q.correctIndex]}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {badge.label}
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#20C7C9]/10 dark:bg-[#062B3D]/80 border border-[#20C7C9]/30 space-y-2">
                <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                  Detailed Explanation ({language.toUpperCase()})
                </div>
                <p className="text-sm leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                  {q.explanations[language] || q.explanations.en}
                </p>
              </div>

              {q.stepByStep && q.stepByStep.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-[#062B3D]/60 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 space-y-2.5">
                  <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Step-by-Step Solution
                  </div>
                  <ol className="space-y-1.5 text-sm">
                    {q.stepByStep.map((step, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="font-mono-num text-xs font-bold text-[#20C7C9] mt-0.5 shrink-0">
                          {String(sIdx + 1).padStart(2, '0')}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {q.shortcutMethod && (
                <div className="p-4 rounded-2xl bg-[#FF8B78]/10 dark:bg-[#FF8B78]/15 border border-[#FF8B78]/35 space-y-1.5">
                  <div className="text-xs font-bold text-[#9A2D1F] dark:text-[#FF8B78] flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Exam Shortcut Method
                  </div>
                  <p className="text-sm leading-relaxed text-[#062B3D] dark:text-[#F3FAFA]">
                    {q.shortcutMethod}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Previous & Next Question Footer Navigation */}
          <div className="pt-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!prevQ}
              onClick={() => prevQ && openQuestionDetail(prevQ, studyMode === 'study')}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Question
            </button>
            <button
              type="button"
              disabled={!nextQ}
              onClick={() => nextQ && openQuestionDetail(nextQ, studyMode === 'study')}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold disabled:opacity-40 cursor-pointer"
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </OceanGlassCard>
      </div>
    );
  }

  // =========================================================================
  // MAIN 11-YEAR PYQ LIBRARY LIST SCREEN (2016–2026)
  // =========================================================================
  return (
    <div className="space-y-6">
      {!embedded && (
        <FirstTimeTip
          storageKey="pyq_library_v1"
          title="11-Year SSC CGL Question & Answer Library (2016–2026)"
          body="Browse all available SSC CGL questions freely in Study Mode with View Answer, Step-by-Step solutions & Shortcut Methods, or switch to Practice Mode / Launch a Past Paper Mock."
        />
      )}

      {/* Header & Real Collection Summary */}
      <OceanGlassCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
              </button>
            )}
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#20C7C9] shrink-0" />
              <span>Previous Year Questions (2016–2026)</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#073B50]/80 dark:text-[#8DE1D3]">
              Complete open-access SSC CGL Tier 1 &amp; Tier 2 question and answer archive across 11 exam cycles. Read freely in Study Mode or launch a timed past-paper mock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={launchingMock}
              onClick={handleLaunchPastPaperMock}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FF8B78] hover:bg-[#ff7862] text-[#062B3D] text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {launchingMock
                ? 'Loading Paper...'
                : `Practice ${selectedYear === 'all' ? '2016–2026' : selectedYear} Mock (25Q)`}
            </button>

            {/* Study Mode vs Practice Mode Switch */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25">
              <button
                type="button"
                onClick={() => setStudyMode('study')}
                className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  studyMode === 'study'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D] shadow-sm'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Study Mode
              </button>
              <button
                type="button"
                onClick={() => setStudyMode('practice')}
                className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  studyMode === 'practice'
                    ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D] shadow-sm'
                    : 'text-[#073B50] dark:text-[#8DE1D3]'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Practice Mode
              </button>
            </div>
          </div>
        </div>

        {/* Real Collection Coverage Numbers (Zero Hardcoded Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/70 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div className="text-[11px] font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Total Stored Questions
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-0.5">
              {libraryStats.total}
            </div>
            <div className="text-[11px] text-[#073B50]/70 dark:text-[#8DE1D3]/75">
              Tier 1: {libraryStats.tier1Count} · Tier 2: {libraryStats.tier2Count}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/70 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Official Final Keys
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-0.5 text-emerald-700 dark:text-emerald-300">
              {libraryStats.officialCount}
            </div>
            <div className="text-[11px] text-[#073B50]/70 dark:text-[#8DE1D3]/75">
              Verified SSC answer keys
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/70 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div className="text-[11px] font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
              Needs Verification
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-0.5 text-[#9A2D1F] dark:text-[#FF8B78]">
              {libraryStats.needsVerificationCount + libraryStats.unofficialCount}
            </div>
            <div className="text-[11px] text-[#073B50]/70 dark:text-[#8DE1D3]/75">
              Expected / Unofficial keys
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D]/70 border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
            <div className="text-[11px] font-semibold text-[#075985] dark:text-[#55D6D0]">
              Your Revision Hub
            </div>
            <div className="font-mono-num text-xl font-extrabold mt-0.5">
              {libraryStats.bookmarkedQCount + revisionListIds.length}
            </div>
            <div className="text-[11px] text-[#073B50]/70 dark:text-[#8DE1D3]/75">
              {libraryStats.attemptedCount} attempted · {libraryStats.incorrectCount} wrong
            </div>
          </div>
        </div>

        {/* Practice Mode Live Score Bar */}
        {studyMode === 'practice' && (
          <div className="p-3.5 rounded-2xl bg-[#20C7C9]/12 border border-[#20C7C9]/35 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-[#075985] dark:text-[#55D6D0] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Practice Session Live Score
              </span>
              <span className="font-mono-num font-bold">
                Attempted: {sessionStats.attempted}
              </span>
              <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-300">
                Correct: {sessionStats.correct}
              </span>
              <span className="font-mono-num font-bold">
                Accuracy: {sessionStats.accuracy}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope(scope === 'incorrect' ? 'all' : 'incorrect')}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  scope === 'incorrect'
                    ? 'bg-[#FF8B78] text-[#062B3D] border-[#FF8B78]'
                    : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                }`}
              >
                Review Incorrect ({libraryStats.incorrectCount})
              </button>
              {sessionStats.attempted > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionSelected({})}
                  className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick 11-Year Strip (2016–2026) */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3]">
            Browse by Exam Year (2016–2026)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedYear('all');
                resetPagination();
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                selectedYear === 'all'
                  ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                  : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60'
              }`}
            >
              All Years{' '}
              <span className="font-mono-num opacity-80">
                ({libraryStats.total.toLocaleString()})
              </span>
            </button>
            {YEARS_2016_2026.map((y) => {
              const count = libraryStats.byYear[y] || 0;
              const active = selectedYear === String(y);
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setSelectedYear(String(y));
                    resetPagination();
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                      : count > 0
                      ? 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]'
                      : 'border-[#8DE1D3]/30 dark:border-[#20C7C9]/15 bg-white/40 dark:bg-[#062B3D]/30 opacity-65 hover:opacity-100'
                  }`}
                >
                  <span className="font-mono-num">{y}</span>{' '}
                  <span className="font-mono-num opacity-75">({count.toLocaleString()})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Revision & Bookmark Scope Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            {
              id: 'all' as CollectionScope,
              label: `All Questions (${libraryStats.total.toLocaleString()})`,
            },
            {
              id: 'bookmarked' as CollectionScope,
              label: `Bookmarked (${libraryStats.bookmarkedQCount})`,
            },
            {
              id: 'difficult' as CollectionScope,
              label: `Difficult (${difficultQuestionIds.length})`,
            },
            {
              id: 'revision' as CollectionScope,
              label: `Revision List (${revisionListIds.length})`,
            },
            {
              id: 'attempted' as CollectionScope,
              label: `Attempted (${libraryStats.attemptedCount})`,
            },
            {
              id: 'incorrect' as CollectionScope,
              label: `Incorrect (${libraryStats.incorrectCount})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setScope(tab.id);
                resetPagination();
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                scope === tab.id
                  ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                  : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 bg-white/60 dark:bg-[#062B3D]/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </OceanGlassCard>

      {/* Search + Sort + Subject Bar + Expandable Advanced Filters */}
      <OceanGlassCard className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#075985]/60 dark:text-[#8DE1D3]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPagination();
              }}
              placeholder="Search questions by keyword, topic, formula, shift, or question number..."
              aria-label="Search previous year questions"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs sm:text-sm"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              resetPagination();
            }}
            aria-label="Sort questions"
            className="min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-bold"
          >
            <option value="year-desc">Sort: Newest Year First</option>
            <option value="year-asc">Sort: Oldest Year First</option>
            <option value="subject">Sort: Subject-wise</option>
            <option value="topic">Sort: Topic-wise</option>
          </select>

          <button
            type="button"
            onClick={() => setFiltersExpanded((f) => !f)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs font-bold cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[#20C7C9]" />
            <span>{filtersExpanded ? 'Hide Filters' : 'All Filters'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold text-[#9A2D1F] dark:text-[#FF8B78] hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Subject Quick Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'quant', 'reasoning', 'english', 'ga', 'computer'] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => {
                setSelectedSubject(sub);
                setSelectedTopic('all');
                resetPagination();
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                selectedSubject === sub
                  ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0] font-bold'
                  : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 bg-white/75 dark:bg-[#062B3D]/55'
              }`}
            >
              {sub === 'all'
                ? `All Subjects (${libraryStats.total.toLocaleString()})`
                : `${SUBJECT_NAMES[sub][language]} (${(libraryStats.bySubject[sub] || 0).toLocaleString()})`}
            </button>
          ))}
        </div>

        {/* Detailed Filter Grid: Tier, Topic, Exam Date, Shift, Difficulty, Verification */}
        {filtersExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value as typeof selectedTier);
                resetPagination();
              }}
              aria-label="Filter by Tier"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Tiers</option>
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                resetPagination();
              }}
              aria-label="Filter by Topic"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Topics ({availableTopics.length})</option>
              {availableTopics.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>

            <select
              value={selectedExamDate}
              onChange={(e) => {
                setSelectedExamDate(e.target.value);
                resetPagination();
              }}
              aria-label="Filter by Exam Date"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Exam Dates ({availableExamDates.length})</option>
              {availableExamDates.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>

            <select
              value={selectedShift}
              onChange={(e) => {
                setSelectedShift(e.target.value);
                resetPagination();
              }}
              aria-label="Filter by Shift"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Shifts ({availableShifts.length})</option>
              {availableShifts.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value as typeof selectedDifficulty);
                resetPagination();
              }}
              aria-label="Filter by Difficulty"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as typeof selectedStatus);
                resetPagination();
              }}
              aria-label="Filter by Answer Status"
              className="min-h-[40px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Key Statuses</option>
              <option value="official">Official Final Key</option>
              <option value="unofficial">Unofficial Key</option>
              <option value="needs_verification">Needs Verification</option>
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#075985] dark:text-[#8DE1D3]">
          <span className="font-mono-num font-semibold">
            Showing {displayedQuestions.length.toLocaleString()} of{' '}
            {totalMatchingCount.toLocaleString()} matching questions
            {loadingQuestions || loadingArchive ? ' · Loading archive...' : ''}
          </span>
          <span>
            {studyMode === 'study'
              ? 'Study Mode: Click "View Answer" or open any question to study full solutions.'
              : 'Practice Mode: Select an option below to check your accuracy.'}
          </span>
        </div>
      </OceanGlassCard>

      {/* Question List Cards */}
      {totalMatchingCount === 0 && !loadingArchive ? (
        <OceanGlassCard className="p-8 text-center space-y-3">
          <div className="font-display text-base font-bold">
            No Questions Found for Current Filters
          </div>
          <p className="text-xs sm:text-sm text-[#073B50]/80 dark:text-[#8DE1D3] max-w-lg mx-auto leading-relaxed">
            {selectedYear !== 'all' && (libraryStats.byYear[Number(selectedYear)] || 0) === 0
              ? `Examora currently has 0 imported papers for SSC CGL ${selectedYear}. Your academy admin can upload verified ${selectedYear} Tier 1 & Tier 2 shifts via CSV/JSON in the Admin Question Bank.`
              : 'Try clearing one or more filters or switching your search keyword.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </OceanGlassCard>
      ) : (
        <div className="space-y-4">
          {displayedQuestions.map((q, idx) => {
            const badge = getVerificationBadge(q);
            const isBm = bookmarkedIdsSet.has(q.id);
            const isDiff = difficultSet.has(q.id);
            const isRev = revisionSet.has(q.id);
            const chosen = sessionSelected[q.id];
            const isAnswered = chosen !== undefined;
            const inlineOpen = Boolean(inlineAnswerVisible[q.id]);
            const prevRec = pyqAttempts[q.id];

            return (
              <OceanGlassCard key={q.id} className="p-5 sm:p-6 space-y-4">
                {/* Card Top Metadata Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0] flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono-num font-extrabold text-[#062B3D] dark:text-white">
                      Q.{q.questionNumber ?? idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{q.year}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.tier}</span>
                    <span aria-hidden="true">·</span>
                    <span>{SUBJECT_NAMES[q.subject][language]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.difficulty}</span>
                    {q.examDate && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{q.examDate}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{q.shift}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${badge.toneClass}`}
                    >
                      {badge.status === 'official' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        toggleBookmark('question', q.id, q.questionEn.slice(0, 70), q.subject)
                      }
                      aria-label={isBm ? 'Remove bookmark' : 'Bookmark question'}
                      className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border cursor-pointer ${
                        isBm
                          ? 'border-[#FF8B78]/60 bg-[#FF8B78]/15 text-[#FF8B78]'
                          : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 text-[#075985]/70 dark:text-[#8DE1D3]/70'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Stem */}
                <p
                  onClick={() => openQuestionDetail(q, studyMode === 'study')}
                  className="text-sm sm:text-base font-semibold leading-relaxed cursor-pointer hover:text-[#075985] dark:hover:text-[#55D6D0] transition-colors"
                >
                  {q.questionEn}
                </p>

                {/* Practice Mode Interactive Options OR Study Mode Quick Options */}
                {studyMode === 'practice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.optionsEn.map((opt, oi) => {
                      const isCorrectOpt = oi === q.correctIndex;
                      const isSelected = chosen === oi;
                      let cls =
                        'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 hover:border-[#20C7C9]';
                      if (isAnswered) {
                        if (isCorrectOpt) {
                          cls =
                            'border-emerald-500 bg-emerald-500/12 dark:bg-emerald-500/20 font-bold';
                        } else if (isSelected) {
                          cls =
                            'border-[#FF8B78] bg-[#FF8B78]/15 dark:bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]';
                        }
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(q, oi)}
                          className={`min-h-[48px] text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-colors flex items-center justify-between gap-2 cursor-pointer ${cls}`}
                        >
                          <span>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </span>
                          {isAnswered && isCorrectOpt && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          {isAnswered && isSelected && !isCorrectOpt && (
                            <XCircle className="w-4 h-4 text-[#FF8B78] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Inline Answer Reveal (when View Answer clicked in Study Mode OR answered in Practice Mode) */}
                {(inlineOpen || (studyMode === 'practice' && isAnswered)) && (
                  <div className="p-4 rounded-2xl bg-[#20C7C9]/10 dark:bg-[#062B3D]/80 border border-[#20C7C9]/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Correct Answer: Option {String.fromCharCode(65 + q.correctIndex)} —{' '}
                        {q.optionsEn[q.correctIndex]}
                      </span>
                      <span className="text-[11px] font-semibold text-[#075985] dark:text-[#8DE1D3]">
                        Answer Available ({badge.label})
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {q.explanations[language] || q.explanations.en}
                    </p>
                    {q.shortcutMethod && (
                      <div className="text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78] flex items-start gap-1.5 pt-1">
                        <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Shortcut: {q.shortcutMethod}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setInlineAnswerVisible((prev) => ({
                          ...prev,
                          [q.id]: !prev[q.id],
                        }))
                      }
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                    >
                      {inlineOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {inlineOpen ? 'Hide Answer' : 'View Answer'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openQuestionDetail(q, true)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold hover:border-[#20C7C9] cursor-pointer"
                    >
                      Full Solution
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDifficultQuestion(q.id)}
                      className={`min-h-[40px] inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        isDiff
                          ? 'border-amber-500/60 bg-amber-500/12 text-amber-800 dark:text-amber-300'
                          : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {isDiff ? 'Difficult' : 'Mark Difficult'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRevisionQuestion(q.id)}
                      className={`min-h-[40px] inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        isRev
                          ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                          : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20'
                      }`}
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      {isRev ? 'In Revision' : 'Revision List'}
                    </button>
                  </div>

                  {prevRec && (
                    <span
                      className={`text-[11px] font-bold ${
                        prevRec.isCorrect
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-[#9A2D1F] dark:text-[#FF8B78]'
                      }`}
                    >
                      Attempted: {prevRec.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  )}
                </div>
              </OceanGlassCard>
            );
          })}

          {/* Unbounded Pagination Controls */}
          {displayedQuestions.length < totalMatchingCount && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={loadingArchive}
                onClick={() => {
                  if (usingServerPagination) {
                    setServerPage((p) => p + 1);
                  } else {
                    setVisibleCount((c) => c + PAGE_SIZE);
                  }
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer disabled:opacity-60"
              >
                {loadingArchive
                  ? 'Loading more...'
                  : `Load More (${(totalMatchingCount - displayedQuestions.length).toLocaleString()} remaining)`}
              </button>
              {!usingServerPagination && (
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredQuestions.length)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
                >
                  Show All {filteredQuestions.length} Questions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
