import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Compass,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  Filter,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  Video,
  X,
} from 'lucide-react';
import { AdminStudentSummary, useApp } from '../context/AppContext';
import { SUBJECTS_SEED, SSC_SYLLABUS } from '../data/sscCurriculum';
import { OCEAN_LOCATIONS } from '../data/oceanQuestCatalog';
import { AdminPredictorControl } from './AdminPredictorControl';
import { downloadCsvReport, downloadExcelReport } from '../lib/exportReports';
import {
  AnswerVerificationStatus,
  CourseDef,
  GameSession,
  MockTestConfig,
  OceanQuestDifficulty,
  OceanQuestMission,
  OceanQuestMode,
  OceanQuestProgress,
  Question,
  SubjectId,
  TestAttempt,
  VideoLesson,
} from '../types/examverse';

type AdminNavSection =
  | 'overview'
  | 'users'
  | 'analytics'
  | 'questions'
  | 'content'
  | 'predictor'
  | 'reports';

const SUBJECT_LABELS: Record<SubjectId, string> = {
  quant: 'Quantitative Aptitude',
  reasoning: 'Reasoning',
  english: 'English',
  ga: 'General Awareness',
  computer: 'Computer Knowledge',
};

function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(current.trim());
      current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(current.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

export const AdminPanel: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const {
    profile,
    questions,
    videos,
    mockTests,
    courses,
    announcements,
    addAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    importAdminQuestions,
    addAdminVideo,
    toggleVideoPublished,
    deleteAdminVideo,
    addAdminCourse,
    updateAdminCourse,
    deleteAdminCourse,
    addAdminMockTest,
    toggleMockTestPublished,
    deleteAdminMockTest,
    addAnnouncement,
    seedFirestoreDatabase,
    toggleStudentActive,
    oceanQuestMissions,
    upsertOceanQuestMission,
    toggleOceanQuestMissionPublished,
    deleteOceanQuestMission,
    fetchAdminAnalytics,
  } = useApp();

  const [section, setSection] = useState<AdminNavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Remote cohort state
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [allAttempts, setAllAttempts] = useState<TestAttempt[]>([]);
  const [allGameSessions, setAllGameSessions] = useState<GameSession[]>([]);
  const [allOceanProgress, setAllOceanProgress] = useState<OceanQuestProgress[]>([]);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // User Management filters & modal
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userDateFilter, setUserDateFilter] = useState<
    'all' | 'today' | '7d' | '30d' | 'custom'
  >('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentSummary | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  // Analytics selector
  const [analyticsStudentUid, setAnalyticsStudentUid] = useState<string>('all');

  // Question Bank filters & forms
  const [qFilterYear, setQFilterYear] = useState<string>('all');
  const [qFilterTier, setQFilterTier] = useState<string>('all');
  const [qFilterSubject, setQFilterSubject] = useState<string>('all');
  const [qFilterStatus, setQFilterStatus] = useState<
    'all' | 'official' | 'unofficial' | 'needs_verification' | 'drafts'
  >('all');
  const [qFilterTopic, setQFilterTopic] = useState('');
  const [qSearch, setQSearch] = useState('');
  const [showCoverageMatrix, setShowCoverageMatrix] = useState(true);
  const [showDuplicatesPanel, setShowDuplicatesPanel] = useState(false);

  const [qSub, setQSub] = useState<SubjectId>('quant');
  const [qTopic, setQTopic] = useState('Percentage');
  const [qYear, setQYear] = useState(2024);
  const [qExamDate, setQExamDate] = useState('');
  const [qShift, setQShift] = useState('Tier 1 · Shift 1');
  const [qNumber, setQNumber] = useState<string>('');
  const [qTier, setQTier] = useState<'Tier 1' | 'Tier 2'>('Tier 1');
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [qSource, setQSource] = useState<'PYQ' | 'AI_GENERATED'>('PYQ');
  const [qAnswerStatus, setQAnswerStatus] = useState<AnswerVerificationStatus>('official');
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [expEn, setExpEn] = useState('');
  const [qStepsText, setQStepsText] = useState('');
  const [qShortcut, setQShortcut] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Delete confirmation modal
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'question' | 'video' | 'course' | 'mock' | 'quest';
    id: string;
    label: string;
  } | null>(null);

  // Content Management sub-tab
  const [contentTab, setContentTab] = useState<
    'courses' | 'videos' | 'subjects' | 'mocks' | 'ocean-quest' | 'notices'
  >('courses');

  // Ocean Quest Mission Admin form state
  const [oqEditId, setOqEditId] = useState<string | null>(null);
  const [oqLocationId, setOqLocationId] = useState<string>('coral-bay');
  const [oqTitle, setOqTitle] = useState('');
  const [oqDesc, setOqDesc] = useState('');
  const [oqMode, setOqMode] = useState<OceanQuestMode>('treasure-hunt');
  const [oqDiff, setOqDiff] = useState<OceanQuestDifficulty>('beginner');
  const [oqSubject, setOqSubject] = useState<SubjectId | 'mixed'>('quant');
  const [oqQCount, setOqQCount] = useState(5);
  const [oqTimerSec, setOqTimerSec] = useState(0);
  const [oqMinAcc, setOqMinAcc] = useState(60);
  const [oqHints, setOqHints] = useState(2);
  const [oqXp, setOqXp] = useState(120);
  const [oqCoins, setOqCoins] = useState(60);
  const [oqCrystals, setOqCrystals] = useState(6);
  const [oqIsBoss, setOqIsBoss] = useState(false);
  const [oqGuardianName, setOqGuardianName] = useState('');

  // Course form + edit modal
  const [cTitle, setCTitle] = useState('');
  const [cSub, setCSub] = useState<SubjectId>('quant');
  const [cDesc, setCDesc] = useState('');
  const [editingCourse, setEditingCourse] = useState<CourseDef | null>(null);

  // Video form
  const [vTitle, setVTitle] = useState('');
  const [vSub, setVSub] = useState<SubjectId>('quant');
  const [vTopic, setVTopic] = useState('Algebra');
  const [vCourseId, setVCourseId] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vInstructor, setVInstructor] = useState('Examora Faculty');

  // Mock test form
  const [mtTitle, setMtTitle] = useState('');
  const [mtCategory, setMtCategory] = useState<MockTestConfig['category']>('Tier 1');
  const [mtDuration, setMtDuration] = useState(15);
  const [mtMarksPerQ, setMtMarksPerQ] = useState(2);
  const [mtNegMark, setMtNegMark] = useState(0.5);
  const [mtSelectedIds, setMtSelectedIds] = useState<string[]>([]);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  // Report selector
  const [reportType, setReportType] = useState<'performance' | 'registrations' | 'tests'>(
    'performance'
  );

  const loadCohortData = async () => {
    setLoadingCohort(true);
    setCohortError(null);
    try {
      const data = await fetchAdminAnalytics();
      setStudents(data.students);
      setAllAttempts(data.attempts);
      setAllGameSessions(data.gameSessions);
      setAllOceanProgress(data.oceanProgress || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch student records.';
      setCohortError(msg);
      setStatusBanner({
        type: 'err',
        text: msg,
      });
    } finally {
      setLoadingCohort(false);
    }
  };

  useEffect(() => {
    loadCohortData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showStatus = (type: 'ok' | 'err', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Computed Overview KPIs
  const overviewMetrics = useMemo(() => {
    const studentList = students.filter((s) => s.role !== 'admin');
    const total = studentList.length;
    const active = studentList.filter((s) => s.isActive).length;
    const inactive = total - active;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newRegistrations = studentList.filter((s) => {
      if (!s.createdAt) return false;
      const ms = Date.parse(s.createdAt);
      return Number.isFinite(ms) && ms >= sevenDaysAgo;
    }).length;
    const totalTests = allAttempts.length;
    const avgScore =
      totalTests > 0
        ? Math.round(allAttempts.reduce((acc, a) => acc + a.accuracy, 0) / totalTests)
        : 0;
    return { total, active, inactive, newRegistrations, totalTests, avgScore };
  }, [students, allAttempts]);

  // Last 7 days registration & attempt counts
  const sevenDayTrend = useMemo(() => {
    const days: Array<{ label: string; iso: string; regs: number; tests: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const regs = students.filter((s) => s.createdAt.startsWith(iso)).length;
      const tests = allAttempts.filter((a) => a.createdAt.startsWith(iso)).length;
      days.push({ label, iso, regs, tests });
    }
    return days;
  }, [students, allAttempts]);

  // Score distribution
  const scoreBuckets = useMemo(() => {
    const b = [
      { label: '0–39%', count: 0 },
      { label: '40–59%', count: 0 },
      { label: '60–79%', count: 0 },
      { label: '80–100%', count: 0 },
    ];
    allAttempts.forEach((a) => {
      if (a.accuracy < 40) b[0].count++;
      else if (a.accuracy < 60) b[1].count++;
      else if (a.accuracy < 80) b[2].count++;
      else b[3].count++;
    });
    return b;
  }, [allAttempts]);

  // Filtered Users (Search + Status + Registration Date)
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const todayIso = new Date().toISOString().slice(0, 10);
    const nowMs = Date.now();
    return students.filter((s) => {
      if (userStatusFilter === 'active' && !s.isActive) return false;
      if (userStatusFilter === 'inactive' && s.isActive) return false;

      if (userDateFilter !== 'all') {
        const regIso = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (!regIso) return false;
        if (userDateFilter === 'today' && regIso !== todayIso) return false;
        if (userDateFilter === '7d') {
          const ms = Date.parse(s.createdAt);
          if (!Number.isFinite(ms) || ms < nowMs - 7 * 86400000) return false;
        }
        if (userDateFilter === '30d') {
          const ms = Date.parse(s.createdAt);
          if (!Number.isFinite(ms) || ms < nowMs - 30 * 86400000) return false;
        }
        if (userDateFilter === 'custom') {
          if (customStartDate && regIso < customStartDate) return false;
          if (customEndDate && regIso > customEndDate) return false;
        }
      }

      if (!q) return true;
      return (
        s.username.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [
    students,
    userSearch,
    userStatusFilter,
    userDateFilter,
    customStartDate,
    customEndDate,
  ]);

  const bulkValidation = useMemo(() => {
    const trimmed = bulkInput.trim();
    if (!trimmed) return null;
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
          ? parsed.questions
          : null;
        if (!arr) {
          return {
            valid: false,
            message: 'JSON must be an array or an object with a "questions" array.',
          };
        }
        const validCount = arr.filter(
          (row: Record<string, unknown>) =>
            Boolean(row?.questionEn || row?.question) &&
            (Array.isArray(row?.optionsEn) ||
              Array.isArray(row?.options) ||
              (row?.optionA && row?.optionB))
        ).length;
        const skipped = arr.length - validCount;
        return {
          valid: validCount > 0,
          message:
            skipped > 0
              ? `JSON detected: ${validCount} valid question(s), ${skipped} row(s) missing question text or options.`
              : `JSON verified: ${validCount} question(s) ready to import.`,
        };
      }
      const rows = parseCsvLines(trimmed);
      if (rows.length < 2) {
        return {
          valid: false,
          message: 'CSV requires a header row plus at least 1 question row.',
        };
      }
      const validRows = rows.slice(1).filter((cols) => cols.length >= 8 && cols[5]?.trim()).length;
      const incompleteRows = rows.length - 1 - validRows;
      return {
        valid: validRows > 0,
        message:
          incompleteRows > 0
            ? `CSV detected: ${validRows} complete row(s), ${incompleteRows} row(s) have fewer than 8 columns or blank stems.`
            : `CSV verified: ${validRows} question(s) ready to import.`,
      };
    } catch {
      return {
        valid: false,
        message: 'Format error: check JSON quotes/brackets or CSV comma columns.',
      };
    }
  }, [bulkInput]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    const search = qSearch.trim().toLowerCase();
    const topicFilter = qFilterTopic.trim().toLowerCase();
    return questions.filter((q) => {
      if (qFilterYear !== 'all' && String(q.year) !== qFilterYear) return false;
      if (qFilterTier !== 'all' && q.tier !== qFilterTier) return false;
      if (qFilterSubject !== 'all' && q.subject !== qFilterSubject) return false;
      if (qFilterStatus === 'drafts' && q.isPublished !== false) return false;
      if (
        qFilterStatus === 'official' ||
        qFilterStatus === 'unofficial' ||
        qFilterStatus === 'needs_verification'
      ) {
        const effStatus: AnswerVerificationStatus =
          q.answerStatus ||
          (q.sourceType === 'AI_GENERATED'
            ? 'needs_verification'
            : q.isVerified === false
            ? 'unofficial'
            : 'official');
        if (effStatus !== qFilterStatus) return false;
      }
      if (topicFilter && !q.topic.toLowerCase().includes(topicFilter)) return false;
      if (search) {
        const matchStem = q.questionEn.toLowerCase().includes(search);
        const matchTopic = q.topic.toLowerCase().includes(search);
        const matchShift = (q.shift || '').toLowerCase().includes(search);
        if (!matchStem && !matchTopic && !matchShift) return false;
      }
      return true;
    });
  }, [questions, qFilterYear, qFilterTier, qFilterSubject, qFilterStatus, qFilterTopic, qSearch]);

  // 2016-2026 Missing Papers & Coverage Matrix
  const coverageMatrix = useMemo(() => {
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
    return years.map((yr) => {
      const yrQs = questions.filter((q) => q.year === yr);
      const t1 = yrQs.filter((q) => q.tier === 'Tier 1').length;
      const t2 = yrQs.filter((q) => q.tier === 'Tier 2').length;
      const official = yrQs.filter(
        (q) =>
          (q.answerStatus || (q.sourceType === 'AI_GENERATED' ? 'needs_verification' : 'official')) ===
          'official'
      ).length;
      const bySub: Record<SubjectId, number> = {
        quant: yrQs.filter((q) => q.subject === 'quant').length,
        reasoning: yrQs.filter((q) => q.subject === 'reasoning').length,
        english: yrQs.filter((q) => q.subject === 'english').length,
        ga: yrQs.filter((q) => q.subject === 'ga').length,
        computer: yrQs.filter((q) => q.subject === 'computer').length,
      };
      return { year: yr, total: yrQs.length, t1, t2, official, bySub };
    });
  }, [questions]);

  // Duplicate Question Detector (normalized question stem matching)
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, Question[]>();
    questions.forEach((q) => {
      const norm = q.questionEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .slice(0, 140);
      if (!norm) return;
      const list = groups.get(norm) || [];
      list.push(q);
      groups.set(norm, list);
    });
    return Array.from(groups.values()).filter((g) => g.length > 1);
  }, [questions]);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set([...questions.map((q) => q.year), 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016])
      ).sort((a, b) => b - a),
    [questions]
  );

  // Analytics computed for selected student or entire cohort
  const analyticsView = useMemo(() => {
    const selected =
      analyticsStudentUid === 'all'
        ? null
        : students.find((s) => s.uid === analyticsStudentUid) || null;

    const targetAttempts = selected
      ? allAttempts.filter((a) => a.id.startsWith(`${selected.uid}:`))
      : allAttempts;

    const targetGames = selected
      ? allGameSessions.filter((g) => g.id.startsWith(`${selected.uid}:`))
      : allGameSessions;

    const totalAttemptedQ = selected
      ? selected.questionsAttempted
      : students.reduce((acc, s) => acc + s.questionsAttempted, 0);
    const totalCorrectQ = selected
      ? selected.questionsCorrect
      : students.reduce((acc, s) => acc + s.questionsCorrect, 0);
    const totalWrongQ = Math.max(0, totalAttemptedQ - totalCorrectQ);
    const overallAcc =
      totalAttemptedQ > 0
        ? Math.round((totalCorrectQ / totalAttemptedQ) * 100)
        : targetAttempts.length > 0
        ? Math.round(
            targetAttempts.reduce((acc, a) => acc + a.accuracy, 0) / targetAttempts.length
          )
        : 0;

    const subjectOrder: SubjectId[] = ['quant', 'reasoning', 'english', 'ga', 'computer'];
    const subjectBreakdown = subjectOrder.map((sub) => {
      if (selected) {
        const st = selected.subjectStats[sub] || { attempted: 0, correct: 0 };
        const pct = st.attempted > 0 ? Math.round((st.correct / st.attempted) * 100) : 0;
        return { subject: sub, attempted: st.attempted, correct: st.correct, pct };
      }
      const attempted = students.reduce(
        (acc, s) => acc + (s.subjectStats[sub]?.attempted || 0),
        0
      );
      const correct = students.reduce(
        (acc, s) => acc + (s.subjectStats[sub]?.correct || 0),
        0
      );
      const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      return { subject: sub, attempted, correct, pct };
    });

    const weakSubjects = [...subjectBreakdown]
      .filter((s) => s.attempted > 0)
      .sort((a, b) => a.pct - b.pct);

    const weakTopics = SSC_SYLLABUS.filter((t) =>
      weakSubjects.slice(0, 2).some((w) => w.subject === t.subject)
    ).slice(0, 6);

    const chronologicalAttempts = [...targetAttempts].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );

    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count =
        targetAttempts.filter((a) => a.createdAt.startsWith(iso)).length +
        targetGames.filter((g) => g.createdAt.startsWith(iso)).length;
      return { dayLabel, count };
    });

    return {
      selected,
      targetAttempts,
      totalAttemptedQ,
      totalCorrectQ,
      totalWrongQ,
      overallAcc,
      subjectBreakdown,
      weakSubjects,
      weakTopics,
      chronologicalAttempts,
      weeklyActivity,
    };
  }, [analyticsStudentUid, students, allAttempts, allGameSessions]);

  const handleToggleUserStatus = async (student: AdminStudentSummary) => {
    setTogglingUid(student.uid);
    try {
      const next = !student.isActive;
      await toggleStudentActive(student.uid, next);
      setStudents((prev) =>
        prev.map((s) => (s.uid === student.uid ? { ...s, isActive: next } : s))
      );
      if (selectedStudent?.uid === student.uid) {
        setSelectedStudent({ ...selectedStudent, isActive: next });
      }
      showStatus(
        'ok',
        `${student.displayName} (@${student.username}) has been ${
          next ? 'activated' : 'deactivated'
        }.`
      );
    } catch (err) {
      showStatus('err', err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setTogglingUid(null);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim()) return;
    const effectiveStatus: AnswerVerificationStatus =
      qSource === 'AI_GENERATED' ? 'needs_verification' : qAnswerStatus;
    const parsedSteps = qStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedQNum = Number(qNumber);
    const item: Question = {
      id: `adm-q-${Date.now()}`,
      ...(Number.isFinite(parsedQNum) && parsedQNum > 0 ? { questionNumber: parsedQNum } : {}),
      subject: qSub,
      topic: qTopic.trim() || 'General',
      year: qYear,
      ...(qExamDate.trim() ? { examDate: qExamDate.trim() } : {}),
      shift: qShift.trim() || (qSource === 'PYQ' ? 'Verified Official Shift' : 'Practice Pattern'),
      tier: qTier,
      difficulty: qDifficulty,
      sourceType: qSource,
      sourceLabel: qSource === 'PYQ' ? `SSC CGL ${qYear} ${qTier}` : 'Practice Question',
      answerStatus: effectiveStatus,
      isVerified: qSource === 'PYQ' && effectiveStatus === 'official',
      isPublished: true,
      questionEn: qText.trim(),
      optionsEn: [optA.trim(), optB.trim(), optC.trim() || 'None', optD.trim() || 'All'],
      correctIndex: correctIdx,
      explanations: {
        en: expEn.trim() || 'Verified explanation.',
        ml: expEn.trim() || 'വിശദീകരണം പരിശോധിക്കുക.',
        hi: expEn.trim() || 'विस्तृत व्याख्या।',
        ta: expEn.trim() || 'விரிவான விளக்கம்.',
      },
      ...(parsedSteps.length > 0 ? { stepByStep: parsedSteps } : {}),
      ...(qShortcut.trim() ? { shortcutMethod: qShortcut.trim() } : {}),
    };
    await addAdminQuestion(item);
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExpEn('');
    setQStepsText('');
    setQShortcut('');
    setQNumber('');
    showStatus('ok', 'Question published to question bank.');
  };

  const handleBulkImportText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    try {
      // Detect JSON vs CSV
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        const rawArray = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
          ? parsed.questions
          : null;
        if (!rawArray) throw new Error('Expected JSON array or { questions: [...] }');

        const items: Question[] = rawArray.map((raw: Record<string, unknown>, i: number) => {
          const isBatchSchema = Array.isArray(raw.options) && typeof raw.question === 'string';
          if (isBatchSchema) {
            const opts = (raw.options as Array<{ label: string; text: string }>)
              .slice(0, 4)
              .map((o) => o.text) as [string, string, string, string];
            const optLetter = String(raw.correct_option || 'A').toUpperCase();
            const cIdx = Math.max(0, Math.min(3, optLetter.charCodeAt(0) - 65));
            const exp = String(raw.explanation || '');
            const statusRaw = String(raw.answerStatus || parsed.answerStatus || 'official');
            const answerStatus: AnswerVerificationStatus =
              statusRaw === 'unofficial' || statusRaw === 'needs_verification'
                ? statusRaw
                : 'official';
            return {
              id: String(raw.id || `bulk-${Date.now()}-${i}`),
              ...(raw.questionNumber ? { questionNumber: Number(raw.questionNumber) } : {}),
              subject: (String(parsed.subject || raw.subject || '').toLowerCase().includes('reason')
                ? 'reasoning'
                : String(parsed.subject || raw.subject || '').toLowerCase().includes('eng')
                ? 'english'
                : String(parsed.subject || raw.subject || '').toLowerCase().includes('ga')
                ? 'ga'
                : String(parsed.subject || raw.subject || '').toLowerCase().includes('comp')
                ? 'computer'
                : 'quant') as SubjectId,
              topic: String(raw.topic || 'General'),
              year: Number(raw.year || parsed.year || 2024),
              ...(raw.examDate || parsed.examDate
                ? { examDate: String(raw.examDate || parsed.examDate) }
                : {}),
              shift: String(raw.shift || `${parsed.tier || 'Tier 1'} · ${parsed.shift || 'Shift'}`),
              tier: (raw.tier || parsed.tier) === 'Tier 2' ? 'Tier 2' : 'Tier 1',
              difficulty: (['Easy', 'Medium', 'Hard'].includes(String(raw.difficulty || ''))
                ? String(raw.difficulty)
                : 'Medium') as Question['difficulty'],
              sourceType: 'PYQ',
              sourceLabel: `SSC CGL ${raw.year || parsed.year || 2024} PYQ`,
              answerStatus,
              isVerified: answerStatus === 'official',
              isPublished: true,
              questionEn: String(raw.question),
              optionsEn: opts,
              correctIndex: cIdx,
              explanations: { en: exp, ml: exp, hi: exp, ta: exp },
              ...(Array.isArray(raw.stepByStep) ? { stepByStep: raw.stepByStep.map(String) } : {}),
              ...(raw.shortcutMethod ? { shortcutMethod: String(raw.shortcutMethod) } : {}),
            };
          }

          const srcType = raw.sourceType === 'AI_GENERATED' ? 'AI_GENERATED' : 'PYQ';
          const rawAnsStatus = String(raw.answerStatus || '');
          const answerStatus: AnswerVerificationStatus =
            srcType === 'AI_GENERATED'
              ? 'needs_verification'
              : rawAnsStatus === 'unofficial' || rawAnsStatus === 'needs_verification'
              ? rawAnsStatus
              : 'official';
          const exp = String(raw.explanation || '');
          return {
            id: String(raw.id || `bulk-${Date.now()}-${i}`),
            ...(raw.questionNumber ? { questionNumber: Number(raw.questionNumber) } : {}),
            subject: (raw.subject as SubjectId) || 'quant',
            topic: String(raw.topic || 'General'),
            year: Number(raw.year) || 2024,
            ...(raw.examDate ? { examDate: String(raw.examDate) } : {}),
            shift: String(raw.shift || 'Imported'),
            tier: raw.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
            difficulty: (raw.difficulty as Question['difficulty']) || 'Medium',
            sourceType: srcType,
            sourceLabel: String(raw.sourceLabel || 'Imported Question'),
            answerStatus,
            isVerified: srcType === 'PYQ' && answerStatus === 'official',
            isPublished: true,
            questionEn: String(raw.questionEn || raw.question || ''),
            ...(raw.questionHi ? { questionHi: String(raw.questionHi) } : {}),
            optionsEn: (raw.optionsEn as [string, string, string, string]) || [
              String(raw.optionA || 'A'),
              String(raw.optionB || 'B'),
              String(raw.optionC || 'C'),
              String(raw.optionD || 'D'),
            ],
            correctIndex: Number(raw.correctIndex || 0),
            explanations: (raw.explanations as Question['explanations']) || {
              en: exp,
              ml: exp,
              hi: exp,
              ta: exp,
            },
            ...(Array.isArray(raw.stepByStep) ? { stepByStep: raw.stepByStep.map(String) } : {}),
            ...(raw.shortcutMethod ? { shortcutMethod: String(raw.shortcutMethod) } : {}),
          };
        });
        await importAdminQuestions(items);
        setBulkInput('');
        showStatus('ok', `Imported ${items.length} questions from JSON.`);
      } else {
        // Parse CSV (supports optional examDate, shift, answerStatus, stepByStep, shortcutMethod, questionNumber)
        const rows = parseCsvLines(trimmed);
        if (rows.length < 2) throw new Error('CSV needs a header row and at least 1 data row.');
        const header = rows[0].map((h) => h.toLowerCase().trim());
        const idx = (name: string, fallback: number) => {
          const found = header.findIndex((h) => h === name || h.includes(name));
          return found >= 0 ? found : fallback;
        };
        const optIdx = (name: string) => header.findIndex((h) => h === name || h.includes(name));

        const items: Question[] = rows.slice(1).map((cols, i) => {
          const rawSub = (cols[idx('subject', 0)] || 'quant').toLowerCase();
          const sub: SubjectId = rawSub.includes('reason')
            ? 'reasoning'
            : rawSub.includes('eng')
            ? 'english'
            : rawSub.includes('ga') || rawSub.includes('aware')
            ? 'ga'
            : rawSub.includes('comp')
            ? 'computer'
            : 'quant';
          const ansRaw = (cols[idx('correct', 10)] || '0').trim().toUpperCase();
          const cIdx = ['A', 'B', 'C', 'D'].includes(ansRaw)
            ? ansRaw.charCodeAt(0) - 65
            : Math.max(0, Math.min(3, Number(ansRaw) || 0));
          const exp = cols[idx('explanation', 11)] || 'Verified solution.';

          const dateCol = optIdx('examdate');
          const shiftCol = optIdx('shift');
          const statusCol = optIdx('answerstatus');
          const stepsCol = optIdx('stepbystep');
          const shortcutCol = optIdx('shortcut');
          const qNumCol = optIdx('questionnumber');

          const rawStatus = statusCol >= 0 ? (cols[statusCol] || '').trim().toLowerCase() : 'official';
          const answerStatus: AnswerVerificationStatus =
            rawStatus === 'unofficial'
              ? 'unofficial'
              : rawStatus.includes('need')
              ? 'needs_verification'
              : 'official';
          const stepList =
            stepsCol >= 0 && cols[stepsCol]
              ? cols[stepsCol]
                  .split('|')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined;
          const qNumVal = qNumCol >= 0 ? Number(cols[qNumCol]) : NaN;

          return {
            id: `csv-q-${Date.now()}-${i}`,
            ...(Number.isFinite(qNumVal) && qNumVal > 0 ? { questionNumber: qNumVal } : {}),
            subject: sub,
            topic: cols[idx('topic', 1)] || 'General',
            year: Number(cols[idx('year', 2)]) || 2024,
            ...(dateCol >= 0 && cols[dateCol] ? { examDate: cols[dateCol].trim() } : {}),
            shift: (shiftCol >= 0 && cols[shiftCol] ? cols[shiftCol].trim() : '') || 'CSV Import',
            tier: (cols[idx('tier', 3)] || '').includes('2') ? 'Tier 2' : 'Tier 1',
            difficulty: (['Easy', 'Medium', 'Hard'].includes(cols[idx('difficulty', 4)] || '')
              ? cols[idx('difficulty', 4)]
              : 'Medium') as Question['difficulty'],
            sourceType: 'PYQ',
            sourceLabel: `SSC CGL ${Number(cols[idx('year', 2)]) || 2024} CSV PYQ`,
            answerStatus,
            isVerified: answerStatus === 'official',
            isPublished: true,
            questionEn: cols[idx('question', 5)] || 'Question',
            optionsEn: [
              cols[idx('optiona', 6)] || 'Option A',
              cols[idx('optionb', 7)] || 'Option B',
              cols[idx('optionc', 8)] || 'Option C',
              cols[idx('optiond', 9)] || 'Option D',
            ],
            correctIndex: cIdx,
            explanations: { en: exp, ml: exp, hi: exp, ta: exp },
            ...(stepList && stepList.length > 0 ? { stepByStep: stepList } : {}),
            ...(shortcutCol >= 0 && cols[shortcutCol]
              ? { shortcutMethod: cols[shortcutCol].trim() }
              : {}),
          };
        });
        await importAdminQuestions(items);
        setBulkInput('');
        showStatus('ok', `Imported ${items.length} questions from CSV.`);
      }
    } catch (err) {
      showStatus(
        'err',
        err instanceof Error ? err.message : 'Invalid CSV or JSON structure.'
      );
    }
  };

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBulkInput(text);
    await handleBulkImportText(text);
    e.target.value = '';
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    if (target.kind === 'question') await deleteAdminQuestion(target.id);
    if (target.kind === 'video') await deleteAdminVideo(target.id);
    if (target.kind === 'course') await deleteAdminCourse(target.id);
    if (target.kind === 'mock') await deleteAdminMockTest(target.id);
    if (target.kind === 'quest') await deleteOceanQuestMission(target.id);
    showStatus('ok', `Deleted "${target.label}".`);
  };

  const handleExportReport = (format: 'csv' | 'xlsx') => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (reportType === 'performance') {
      const headers = [
        'Username',
        'Full Name',
        'Email',
        'Status',
        'Level',
        'Total XP',
        'Streak (Days)',
        'Mock Tests',
        'Questions Attempted',
        'Questions Correct',
        'Accuracy %',
      ];
      const rows = students.map((s) => {
        const acc =
          s.questionsAttempted > 0
            ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100)
            : 0;
        return [
          s.username,
          s.displayName,
          s.email,
          s.isActive ? 'Active' : 'Inactive',
          s.level,
          s.xp,
          s.streak,
          s.mockTestsCompleted,
          s.questionsAttempted,
          s.questionsCorrect,
          acc,
        ];
      });
      if (format === 'csv') {
        downloadCsvReport(`examora-user-performance-${dateStamp}.csv`, headers, rows);
      } else {
        downloadExcelReport(
          `examora-user-performance-${dateStamp}.xlsx`,
          'User Performance',
          headers,
          rows
        );
      }
    } else if (reportType === 'registrations') {
      const headers = [
        'Username',
        'Full Name',
        'Email',
        'Language',
        'Status',
        'Registered At',
        'Last Login',
      ];
      const rows = students.map((s) => [
        s.username,
        s.displayName,
        s.email,
        s.preferredLanguage.toUpperCase(),
        s.isActive ? 'Active' : 'Inactive',
        s.createdAt ? s.createdAt.slice(0, 19).replace('T', ' ') : 'N/A',
        s.lastLogin ? s.lastLogin.slice(0, 19).replace('T', ' ') : 'N/A',
      ]);
      if (format === 'csv') {
        downloadCsvReport(`examora-registrations-${dateStamp}.csv`, headers, rows);
      } else {
        downloadExcelReport(
          `examora-registrations-${dateStamp}.xlsx`,
          'Registrations',
          headers,
          rows
        );
      }
    } else {
      const headers = [
        'Test Title',
        'Score',
        'Max Score',
        'Accuracy %',
        'Correct',
        'Wrong',
        'Unattempted',
        'Duration (sec)',
        'Submitted At',
      ];
      const rows = allAttempts.map((a) => [
        a.testTitle,
        a.score,
        a.maxScore,
        a.accuracy,
        a.correctCount,
        a.wrongCount,
        a.unattemptedCount,
        a.timeTakenSec,
        a.createdAt ? a.createdAt.slice(0, 19).replace('T', ' ') : 'N/A',
      ]);
      if (format === 'csv') {
        downloadCsvReport(`examora-test-performance-${dateStamp}.csv`, headers, rows);
      } else {
        downloadExcelReport(
          `examora-test-performance-${dateStamp}.xlsx`,
          'Test Performance',
          headers,
          rows
        );
      }
    }
    showStatus('ok', `Exported ${reportType} report as .${format.toUpperCase()}.`);
  };

  const navItems: Array<{
    id: AdminNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Student Analytics', icon: BarChart3 },
    { id: 'questions', label: 'Question Bank', icon: Layers },
    { id: 'content', label: 'Content Management', icon: BookOpen },
    { id: 'predictor', label: 'Future Predictor Control', icon: Compass },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
  ];

  const activeNavTitle = navItems.find((n) => n.id === section)?.label || 'Admin';

  return (
    <div className="min-h-screen flex bg-[#F3FAFA] dark:bg-[#062B3D] text-[#062B3D] dark:text-[#F3FAFA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#062B3D] text-[#F3FAFA] border-r border-[#075985]/45 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-[#075985]/45">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#20C7C9] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#062B3D]" />
            </div>
            <div>
              <div className="font-display font-bold text-base leading-tight">Examora Admin</div>
              <div className="text-[11px] text-[#55D6D0]">Academy Control Center</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5" aria-label="Admin Sidebar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#20C7C9] text-[#062B3D]'
                    : 'text-[#8DE1D3] hover:bg-[#073B50] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#075985]/45 space-y-3">
          <div className="text-xs text-[#F3FAFA] truncate">
            {profile.displayName}
            <div className="text-[11px] text-[#8DE1D3] truncate">{profile.email}</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[#075985] hover:border-[#FF8B78] text-xs font-semibold text-[#F3FAFA] hover:text-[#FF8B78] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Secure Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#062B3D]/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-[#062B3D] text-[#F3FAFA] flex flex-col h-full p-4 border-r border-[#075985]/45">
            <div className="flex items-center justify-between pb-4 border-b border-[#075985]/45">
              <span className="font-display font-bold">Examora Admin</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-[#8DE1D3] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                      active ? 'bg-[#20C7C9] text-[#062B3D]' : 'text-[#8DE1D3] hover:bg-[#073B50]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#075985] text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Secure Logout
            </button>
          </aside>
        </div>
      )}

      {/* Main Admin Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-[#F3FAFA]/95 dark:bg-[#062B3D]/95 backdrop-blur-md border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 cursor-pointer"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-display text-base sm:text-lg font-extrabold">{activeNavTitle}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadCohortData}
              disabled={loadingCohort}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-semibold hover:border-[#20C7C9] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#20C7C9] ${loadingCohort ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setSeeding(true);
                try {
                  const { seededDocs } = await seedFirestoreDatabase();
                  showStatus('ok', `Published ${seededDocs} starter curriculum items.`);
                } catch (err) {
                  showStatus(
                    'err',
                    err instanceof Error ? err.message : 'Unable to seed initial content.'
                  );
                } finally {
                  setSeeding(false);
                }
              }}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {seeding ? 'Publishing...' : 'Seed Starter Content'}
              </span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="lg:hidden p-2 rounded-lg border border-[#FF8B78]/40 text-[#FF8B78] cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {cohortError && (
            <div className="p-4 rounded-2xl border border-[#FF8B78]/60 bg-[#FF8B78]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
                Could not sync student cohort metrics: {cohortError}
              </span>
              <button
                type="button"
                onClick={loadCohortData}
                disabled={loadingCohort}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#075985] text-white font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCohort ? 'animate-spin' : ''}`} />
                Retry Sync
              </button>
            </div>
          )}

          {statusBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                statusBanner.type === 'ok'
                  ? 'border-[#20C7C9]/45 bg-[#20C7C9]/12 text-[#075985] dark:text-[#55D6D0] font-semibold'
                  : 'border-[#FF8B78]/50 bg-[#FF8B78]/12 text-[#9A2D1F] dark:text-[#FF8B78] font-semibold'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Students</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overviewMetrics.total}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Active Students</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {overviewMetrics.active}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Inactive Students</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {overviewMetrics.inactive}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">New (7 Days)</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-[#075985] dark:text-[#55D6D0]">
                    +{overviewMetrics.newRegistrations}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tests Attempted</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overviewMetrics.totalTests}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Avg Student Score</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overviewMetrics.avgScore}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6">
                  <h2 className="font-display font-bold text-base mb-4">
                    7-Day Registrations & Test Activity
                  </h2>
                  <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4">
                    {sevenDayTrend.map((d) => {
                      const maxVal = Math.max(
                        1,
                        ...sevenDayTrend.map((x) => Math.max(x.regs, x.tests))
                      );
                      const regH = Math.max(6, Math.round((d.regs / maxVal) * 100));
                      const testH = Math.max(6, Math.round((d.tests / maxVal) * 100));
                      return (
                        <div key={d.iso} className="flex flex-col items-center gap-2 h-full justify-end">
                          <div className="flex items-end gap-1 h-28 w-full justify-center">
                            <div
                              title={`${d.regs} registrations`}
                              className="w-3 rounded-t bg-[#0A192F] dark:bg-slate-400 transition-all"
                              style={{ height: `${regH}%` }}
                            />
                            <div
                              title={`${d.tests} tests attempted`}
                              className="w-3 rounded-t bg-[#20C7C9] dark:bg-[#55D6D0] transition-all"
                              style={{ height: `${testH}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono-num text-slate-500">
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400 mt-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#0A192F] dark:bg-slate-400" />
                      Registrations
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#20C7C9] dark:bg-[#55D6D0]" />
                      Mock Tests Attempted
                    </span>
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6">
                  <h2 className="font-display font-bold text-base mb-4">
                    Student Accuracy Distribution
                  </h2>
                  <div className="space-y-4">
                    {scoreBuckets.map((b) => {
                      const pct =
                        allAttempts.length > 0
                          ? Math.round((b.count / allAttempts.length) * 100)
                          : 0;
                      return (
                        <div key={b.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{b.label} Accuracy</span>
                            <span className="font-mono-num text-slate-500 dark:text-slate-400">
                              {b.count} attempts ({pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-[#20C7C9] dark:bg-[#55D6D0] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-bold text-base">Recent Registrations</h2>
                    <button
                      type="button"
                      onClick={() => setSection('users')}
                      className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                    >
                      Manage Users →
                    </button>
                  </div>
                  <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                    {students.slice(0, 5).map((st) => (
                      <div key={st.uid} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold">
                            {st.displayName}{' '}
                            <span className="font-mono-num text-violet-600 dark:text-violet-300">
                              @{st.username}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">{st.email}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            st.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {st.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-xs text-slate-500 py-4">No student profiles found yet.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-bold text-base">Latest Mock Attempts</h2>
                    <button
                      type="button"
                      onClick={() => setSection('analytics')}
                      className="text-xs font-semibold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                    >
                      View Analytics →
                    </button>
                  </div>
                  <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                    {allAttempts.slice(0, 5).map((att) => (
                      <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold">{att.testTitle}</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {att.correctCount} correct · {att.wrongCount} wrong
                          </div>
                        </div>
                        <span className="font-mono-num font-bold">
                          {att.score}/{att.maxScore} ({att.accuracy}%)
                        </span>
                      </div>
                    ))}
                    {allAttempts.length === 0 && (
                      <p className="text-xs text-slate-500 py-4">No mock test attempts recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. USER MANAGEMENT */}
          {section === 'users' && (
            <div className="space-y-5">
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-5 space-y-3 ocean-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-[#075985] dark:text-[#8DE1D3] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by @username, full name, or email..."
                      className="w-full rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'active', 'inactive'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setUserStatusFilter(f)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border capitalize cursor-pointer ${
                          userStatusFilter === f
                            ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                            : 'border-[#8DE1D3]/55 dark:border-[#20C7C9]/25'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Registration Date Filter */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/15 text-xs">
                  <span className="font-semibold text-[#075985] dark:text-[#8DE1D3]">
                    Registration Date:
                  </span>
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((df) => (
                    <button
                      key={df.id}
                      type="button"
                      onClick={() => setUserDateFilter(df.id as typeof userDateFilter)}
                      className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer ${
                        userDateFilter === df.id
                          ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                          : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/20'
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}

                  {userDateFilter === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 ml-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        aria-label="Registration start date"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1 text-xs"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        aria-label="Registration end date"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1 text-xs"
                      />
                    </div>
                  )}

                  <span className="ml-auto font-mono-num text-[#075985] dark:text-[#8DE1D3]">
                    Showing {filteredUsers.length} of {students.length}
                  </span>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3FAFA] dark:bg-[#062B3D] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Student</th>
                        <th className="py-3 px-4 font-semibold">Email</th>
                        <th className="py-3 px-4 font-semibold">Progress</th>
                        <th className="py-3 px-4 font-semibold">Registered</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                      {filteredUsers.map((st) => (
                        <tr key={st.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{st.displayName}</div>
                            <div className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                              @{st.username}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {st.email}
                          </td>
                          <td className="py-3 px-4 font-mono-num">
                            <div>
                              {st.xp} XP · {st.streak}d streak
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {st.mockTestsCompleted} mocks · {st.completedLessonsCount} lessons
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono-num text-slate-500 dark:text-slate-400">
                            {st.createdAt ? st.createdAt.slice(0, 10) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold ${
                                st.isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              {st.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(st)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-500 font-semibold cursor-pointer"
                            >
                              Profile & Progress
                            </button>
                            {st.role !== 'admin' && (
                              <button
                                type="button"
                                disabled={togglingUid === st.uid}
                                onClick={() => handleToggleUserStatus(st)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                                  st.isActive
                                    ? 'border border-rose-500/40 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {st.isActive ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" /> Activate
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            No users match your search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. STUDENT ANALYTICS */}
          {section === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-base">
                    Performance & Subject Mastery Analytics
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inspect cohort trends or drill down into an individual student&apos;s accuracy and weak areas.
                  </p>
                </div>
                <select
                  value={analyticsStudentUid}
                  onChange={(e) => setAnalyticsStudentUid(e.target.value)}
                  className="rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2 text-xs font-semibold min-w-[220px]"
                >
                  <option value="all">All Students (Cohort Aggregate)</option>
                  {students.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.displayName} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tests Attempted</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {analyticsView.targetAttempts.length}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Correct Answers</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {analyticsView.totalCorrectQ}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect Answers</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {analyticsView.totalWrongQ}
                  </div>
                </div>
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-xl p-5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Overall Accuracy</div>
                  <div className="font-mono-num text-2xl font-bold mt-1 text-[#075985] dark:text-[#55D6D0]">
                    {analyticsView.overallAcc}%
                  </div>
                </div>
              </div>

              {/* Ocean Quest Gamification Telemetry Summary */}
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-base">
                    Ocean Quest Student Engagement
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live completion stats, Sea Crystals harvested, and Ocean Quest runs across the cohort.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-xs font-mono-num">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Active Quest Explorers</div>
                    <div className="text-lg font-bold">{allOceanProgress.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Total Mission Clears</div>
                    <div className="text-lg font-bold text-[#075985] dark:text-[#55D6D0]">
                      {allOceanProgress.reduce((acc, p) => acc + p.completedMissions.length, 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Ocean Quest Sessions</div>
                    <div className="text-lg font-bold">
                      {allGameSessions.filter((g) => g.gameMode === 'ocean-quest').length}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Avg Quest Accuracy</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const att = allOceanProgress.reduce((a, p) => a + p.totalAttempted, 0);
                        const cor = allOceanProgress.reduce((a, p) => a + p.totalCorrect, 0);
                        return att > 0 ? Math.round((cor / att) * 100) : 0;
                      })()}
                      %
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Subject-Wise Accuracy */}
                <div className="lg:col-span-6 bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4">
                  <h3 className="font-display font-bold text-base">Subject-Wise Performance</h3>
                  {analyticsView.subjectBreakdown.map((sb) => (
                    <div key={sb.subject}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{SUBJECT_LABELS[sb.subject]}</span>
                        <span className="font-mono-num text-slate-500 dark:text-slate-400">
                          {sb.correct}/{sb.attempted} correct · {sb.pct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-[#0A192F] dark:bg-violet-500 transition-all"
                          style={{ width: `${sb.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Daily/Weekly Activity + Weak Subjects */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6">
                    <h3 className="font-display font-bold text-base mb-4">
                      Weekly Learning Activity (Tests & Arena Sessions)
                    </h3>
                    <div className="grid grid-cols-7 gap-2 items-end h-32">
                      {analyticsView.weeklyActivity.map((d, idx) => {
                        const maxC = Math.max(
                          1,
                          ...analyticsView.weeklyActivity.map((x) => x.count)
                        );
                        const h = Math.max(8, Math.round((d.count / maxC) * 100));
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-[10px] font-mono-num text-slate-500">
                              {d.count}
                            </span>
                            <div
                              className="w-5 rounded-t bg-[#20C7C9] dark:bg-[#55D6D0]"
                              style={{ height: `${h}%` }}
                            />
                            <span className="text-[11px] text-slate-500">{d.dayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3">
                    <h3 className="font-display font-bold text-base">
                      Weak Subjects & Focus Topics
                    </h3>
                    {analyticsView.weakSubjects.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {analyticsView.weakSubjects.slice(0, 2).map((w) => (
                          <div
                            key={w.subject}
                            className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-500/20 flex items-center justify-between"
                          >
                            <span className="font-semibold">{SUBJECT_LABELS[w.subject]}</span>
                            <span className="font-mono-num text-rose-600 dark:text-rose-300 font-bold">
                              {w.pct}% accuracy
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 text-slate-500 dark:text-slate-400">
                          Recommended revision topics:{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {analyticsView.weakTopics.map((t) => t.title).join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Not enough attempted question data yet to highlight weak topics.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Over Time & Mock Test Scores */}
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4">
                <h3 className="font-display font-bold text-base">
                  Progress Over Time & Mock Test Scores ({analyticsView.targetAttempts.length})
                </h3>
                {analyticsView.chronologicalAttempts.length > 0 ? (
                  <>
                    <div className="flex items-end gap-2 h-28 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto">
                      {analyticsView.chronologicalAttempts.slice(-14).map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-col items-center gap-1 min-w-[36px] h-full justify-end"
                        >
                          <span className="text-[10px] font-mono-num">{a.accuracy}%</span>
                          <div
                            className="w-6 rounded-t bg-[#0A192F] dark:bg-violet-400"
                            style={{ height: `${Math.max(10, a.accuracy)}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15 max-h-72 overflow-y-auto">
                      {analyticsView.targetAttempts.map((att) => (
                        <div
                          key={att.id}
                          className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-semibold">{att.testTitle}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              Correct: {att.correctCount} · Wrong: {att.wrongCount} ·{' '}
                              {att.createdAt ? att.createdAt.slice(0, 10) : ''}
                            </div>
                          </div>
                          <div className="font-mono-num font-bold">
                            {att.score}/{att.maxScore} ({att.accuracy}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No mock test attempts recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* 4. QUESTION BANK MANAGEMENT */}
          {section === 'questions' && (
            <div className="space-y-6">
              {/* Coverage Matrix & Duplicate Detector Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCoverageMatrix((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      showCoverageMatrix
                        ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                        : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                    }`}
                  >
                    2016–2026 Missing Papers &amp; Coverage Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDuplicatesPanel((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      showDuplicatesPanel
                        ? 'bg-[#FF8B78] text-[#062B3D] border-[#FF8B78]'
                        : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                    }`}
                  >
                    Duplicate Detector ({duplicateGroups.length})
                  </button>
                </div>
                <span className="text-xs font-mono-num font-semibold text-[#075985] dark:text-[#8DE1D3]">
                  Total Stored: {questions.length} Questions
                </span>
              </div>

              {/* 2016-2026 Coverage & Missing Papers Table */}
              {showCoverageMatrix && (
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-5 space-y-3 overflow-x-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-sm">
                      2016–2026 SSC CGL Collection Coverage &amp; Missing Papers
                    </h2>
                    <span className="text-[11px] text-slate-500 dark:text-[#8DE1D3]">
                      Years with 0 questions need CSV/JSON paper import
                    </span>
                  </div>
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="border-b border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 text-[#075985] dark:text-[#8DE1D3]">
                      <tr>
                        <th className="py-2 pr-3">Year</th>
                        <th className="py-2 px-2">Total</th>
                        <th className="py-2 px-2">Tier 1</th>
                        <th className="py-2 px-2">Tier 2</th>
                        <th className="py-2 px-2">Official Keys</th>
                        <th className="py-2 px-2">Quant</th>
                        <th className="py-2 px-2">Reason</th>
                        <th className="py-2 px-2">English</th>
                        <th className="py-2 px-2">GA</th>
                        <th className="py-2 px-2">Comp</th>
                        <th className="py-2 pl-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8DE1D3]/25 dark:divide-[#20C7C9]/15">
                      {coverageMatrix.map((row) => (
                        <tr key={row.year}>
                          <td className="py-2 pr-3 font-mono-num font-bold">{row.year}</td>
                          <td className="py-2 px-2 font-mono-num font-bold">{row.total}</td>
                          <td className="py-2 px-2 font-mono-num">{row.t1}</td>
                          <td className="py-2 px-2 font-mono-num">{row.t2}</td>
                          <td className="py-2 px-2 font-mono-num text-emerald-600 dark:text-emerald-300">
                            {row.official}
                          </td>
                          <td className="py-2 px-2 font-mono-num">{row.bySub.quant}</td>
                          <td className="py-2 px-2 font-mono-num">{row.bySub.reasoning}</td>
                          <td className="py-2 px-2 font-mono-num">{row.bySub.english}</td>
                          <td className="py-2 px-2 font-mono-num">{row.bySub.ga}</td>
                          <td className="py-2 px-2 font-mono-num">{row.bySub.computer}</td>
                          <td className="py-2 pl-2">
                            {row.total === 0 ? (
                              <span className="text-[#9A2D1F] dark:text-[#FF8B78] font-bold">
                                Missing Papers (0)
                              </span>
                            ) : row.t1 === 0 || row.t2 === 0 ? (
                              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                                Partial ({row.t1 === 0 ? 'Missing Tier 1' : 'Missing Tier 2'})
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                                Active (T1 + T2)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Duplicate Detector Panel */}
              {showDuplicatesPanel && (
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#FF8B78]/45 rounded-2xl p-5 space-y-3">
                  <h2 className="font-display font-bold text-sm">
                    Duplicate Question Stem Detector
                  </h2>
                  {duplicateGroups.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold">
                      Zero duplicate question stems detected across {questions.length} stored questions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {duplicateGroups.map((group, gIdx) => (
                        <div
                          key={gIdx}
                          className="p-3 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 space-y-2 text-xs"
                        >
                          <div className="font-semibold">{group[0].questionEn}</div>
                          <div className="divide-y divide-[#8DE1D3]/25">
                            {group.map((dup) => (
                              <div
                                key={dup.id}
                                className="py-1.5 flex items-center justify-between gap-2"
                              >
                                <span className="font-mono-num text-[11px] text-slate-500 dark:text-[#8DE1D3]">
                                  ID: {dup.id} · {dup.year} · {dup.tier} · {dup.shift}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDelete({
                                      kind: 'question',
                                      id: dup.id,
                                      label: dup.questionEn.slice(0, 60),
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-[#FF8B78]/50 text-[#9A2D1F] dark:text-[#FF8B78] font-bold cursor-pointer"
                                >
                                  Delete Copy
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleAddQuestion}
                  className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="font-display font-bold text-base flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#20C7C9] dark:text-[#55D6D0]" />
                    Add New PYQ / Question
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={qSub}
                      onChange={(e) => setQSub(e.target.value as SubjectId)}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    >
                      <option value="quant">Quant</option>
                      <option value="reasoning">Reasoning</option>
                      <option value="english">English</option>
                      <option value="ga">GA</option>
                      <option value="computer">Computer</option>
                    </select>
                    <input
                      type="text"
                      value={qTopic}
                      onChange={(e) => setQTopic(e.target.value)}
                      placeholder="Topic"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    />
                    <input
                      type="number"
                      min={2016}
                      max={2026}
                      value={qYear}
                      onChange={(e) => setQYear(Number(e.target.value))}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    />
                    <select
                      value={qTier}
                      onChange={(e) => setQTier(e.target.value as 'Tier 1' | 'Tier 2')}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    >
                      <option value="Tier 1">Tier 1</option>
                      <option value="Tier 2">Tier 2</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={qExamDate}
                      onChange={(e) => setQExamDate(e.target.value)}
                      placeholder="Exam Date (e.g. 2024-09-24)"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    />
                    <input
                      type="text"
                      value={qShift}
                      onChange={(e) => setQShift(e.target.value)}
                      placeholder="Shift (e.g. Shift 2 · 12:30 PM)"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      value={qNumber}
                      onChange={(e) => setQNumber(e.target.value)}
                      placeholder="Q. No (optional)"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={qSource}
                      onChange={(e) => {
                        const val = e.target.value as 'PYQ' | 'AI_GENERATED';
                        setQSource(val);
                        if (val === 'AI_GENERATED') {
                          setQAnswerStatus('needs_verification');
                        }
                      }}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    >
                      <option value="PYQ">Previous Year Question</option>
                      <option value="AI_GENERATED">Practice Question</option>
                    </select>
                    <select
                      value={qSource === 'AI_GENERATED' ? 'needs_verification' : qAnswerStatus}
                      disabled={qSource === 'AI_GENERATED'}
                      onChange={(e) =>
                        setQAnswerStatus(e.target.value as AnswerVerificationStatus)
                      }
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs disabled:opacity-60"
                    >
                      <option value="official">Official Final Key</option>
                      <option value="unofficial">Unofficial Key</option>
                      <option value="needs_verification">Needs Verification</option>
                    </select>
                    <select
                      value={qDifficulty}
                      onChange={(e) =>
                        setQDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')
                      }
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    rows={3}
                    placeholder="Official English question stem..."
                    required
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={optA}
                      onChange={(e) => setOptA(e.target.value)}
                      placeholder="Option A"
                      required
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <input
                      value={optB}
                      onChange={(e) => setOptB(e.target.value)}
                      placeholder="Option B"
                      required
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <input
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      placeholder="Option C"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <input
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      placeholder="Option D"
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span>Answer Key:</span>
                    {[0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCorrectIdx(idx)}
                        className={`px-3 py-1 rounded border cursor-pointer ${
                          correctIdx === idx
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={expEn}
                    onChange={(e) => setExpEn(e.target.value)}
                    rows={2}
                    placeholder="Detailed explanation..."
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                  />

                  <textarea
                    value={qStepsText}
                    onChange={(e) => setQStepsText(e.target.value)}
                    rows={2}
                    placeholder="Step-by-step solution lines (one step per line, optional)..."
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                  />

                  <input
                    type="text"
                    value={qShortcut}
                    onChange={(e) => setQShortcut(e.target.value)}
                    placeholder="Shortcut method / trick (optional)"
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                  >
                    Publish Question
                  </button>
                </form>

                {/* CSV & JSON Bulk Import */}
                <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-base flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-[#20C7C9] dark:text-[#55D6D0]" />
                      Import Questions (CSV / JSON)
                    </h2>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-600 text-[#075985] dark:text-[#55D6D0] text-xs font-semibold cursor-pointer">
                      <FileUp className="w-3.5 h-3.5" />
                      Upload File
                      <input
                        type="file"
                        accept=".csv,.json,application/json,text/csv"
                        onChange={handleBulkFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    CSV columns: <code>subject,topic,year,tier,difficulty,question,optionA,optionB,optionC,optionD,correct,explanation</code> (+ optional <code>examDate,shift,answerStatus,stepByStep,shortcutMethod,questionNumber</code>). Separate <code>stepByStep</code> steps with <code>|</code>.
                  </p>
                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    rows={12}
                    placeholder='Paste JSON array or CSV rows...'
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs font-mono-num"
                  />
                  {bulkValidation && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-semibold ${
                        bulkValidation.valid
                          ? 'border-[#20C7C9]/45 bg-[#20C7C9]/10 text-[#075985] dark:text-[#55D6D0]'
                          : 'border-[#FF8B78]/50 bg-[#FF8B78]/12 text-[#9A2D1F] dark:text-[#FF8B78]'
                      }`}
                    >
                      {bulkValidation.message}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(bulkValidation && !bulkValidation.valid)}
                    onClick={() => handleBulkImportText(bulkInput)}
                    className="w-full py-2.5 rounded-xl bg-[#075985] hover:bg-[#062B3D] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-bold disabled:opacity-45 cursor-pointer"
                  >
                    Import Questions
                  </button>
                </div>
              </div>

              {/* Filterable Question Bank Table */}
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display font-bold text-base flex items-center gap-2">
                    <Filter className="w-4 h-4 text-violet-600" />
                    Question Bank ({filteredQuestions.length} of {questions.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      placeholder="Search stem, topic, shift..."
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-1.5 text-xs"
                    />
                    <select
                      value={qFilterYear}
                      onChange={(e) => setQFilterYear(e.target.value)}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1.5 text-xs"
                    >
                      <option value="all">All Years</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={String(yr)}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <select
                      value={qFilterTier}
                      onChange={(e) => setQFilterTier(e.target.value)}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1.5 text-xs"
                    >
                      <option value="all">All Tiers</option>
                      <option value="Tier 1">Tier 1</option>
                      <option value="Tier 2">Tier 2</option>
                    </select>
                    <select
                      value={qFilterSubject}
                      onChange={(e) => setQFilterSubject(e.target.value)}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1.5 text-xs"
                    >
                      <option value="all">All Subjects</option>
                      <option value="quant">Quant</option>
                      <option value="reasoning">Reasoning</option>
                      <option value="english">English</option>
                      <option value="ga">GA</option>
                      <option value="computer">Computer</option>
                    </select>
                    <select
                      value={qFilterStatus}
                      onChange={(e) => setQFilterStatus(e.target.value as typeof qFilterStatus)}
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1.5 text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="official">Official Final Key</option>
                      <option value="unofficial">Unofficial Key</option>
                      <option value="needs_verification">Needs Verification</option>
                      <option value="drafts">Unpublished Drafts</option>
                    </select>
                    <input
                      value={qFilterTopic}
                      onChange={(e) => setQFilterTopic(e.target.value)}
                      placeholder="Filter topic..."
                      className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-1.5 text-xs w-32"
                    />
                  </div>
                </div>

                <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15 max-h-[520px] overflow-y-auto">
                  {filteredQuestions.map((q) => {
                    const effStatus: AnswerVerificationStatus =
                      q.answerStatus ||
                      (q.sourceType === 'AI_GENERATED'
                        ? 'needs_verification'
                        : q.isVerified === false
                        ? 'unofficial'
                        : 'official');
                    return (
                      <div
                        key={q.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{q.questionEn}</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {SUBJECT_LABELS[q.subject]} · {q.topic} · {q.year} · {q.tier}
                            {q.examDate ? ` · ${q.examDate}` : ''} · {q.shift} · Key:{' '}
                            <span className="font-mono-num font-semibold">
                              {String.fromCharCode(65 + q.correctIndex)}
                            </span>{' '}
                            ·{' '}
                            {effStatus === 'official'
                              ? 'Official Key'
                              : effStatus === 'unofficial'
                              ? 'Unofficial Key'
                              : 'Needs Verification'}{' '}
                            · {q.isPublished === false ? 'Draft' : 'Published'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingQuestion(q)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-500 cursor-pointer"
                            title="Edit question, shift & answer key"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateAdminQuestion(q.id, { isPublished: q.isPublished === false })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title={q.isPublished === false ? 'Publish' : 'Unpublish'}
                          >
                            {q.isPublished === false ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                kind: 'question',
                                id: q.id,
                                label: q.questionEn.slice(0, 60),
                              })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#FF8B78] cursor-pointer"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No questions match the selected filters.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. CONTENT MANAGEMENT */}
          {section === 'content' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'courses', label: `Courses (${courses.length})` },
                  { id: 'videos', label: `Video Lessons (${videos.length})` },
                  { id: 'subjects', label: `Subjects & Topics (${SUBJECTS_SEED.length})` },
                  { id: 'mocks', label: `Mock Tests & PYQ Papers (${mockTests.length})` },
                  { id: 'ocean-quest', label: `Ocean Quest (${oceanQuestMissions.length})` },
                  { id: 'notices', label: `Notices (${announcements.length})` },
                ].map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setContentTab(ct.id as typeof contentTab)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      contentTab === ct.id
                        ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              {contentTab === 'courses' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!cTitle.trim()) return;
                      await addAdminCourse({
                        courseId: `course-${Date.now()}`,
                        subjectId: cSub,
                        title: cTitle.trim(),
                        description: cDesc.trim() || `${cTitle.trim()} SSC CGL module`,
                        order: courses.length + 1,
                        isPublished: true,
                        createdAt: new Date().toISOString(),
                      });
                      setCTitle('');
                      setCDesc('');
                      showStatus('ok', 'Course created and published.');
                    }}
                    className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4"
                  >
                    <h2 className="font-display font-bold text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-violet-600" />
                      Create Course
                    </h2>
                    <input
                      value={cTitle}
                      onChange={(e) => setCTitle(e.target.value)}
                      placeholder="Course Title (e.g., Tier 2 Advanced Geometry)"
                      required
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <select
                      value={cSub}
                      onChange={(e) => setCSub(e.target.value as SubjectId)}
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    >
                      <option value="quant">Quantitative Aptitude</option>
                      <option value="reasoning">Reasoning</option>
                      <option value="english">English</option>
                      <option value="ga">General Awareness</option>
                      <option value="computer">Computer Knowledge</option>
                    </select>
                    <textarea
                      value={cDesc}
                      onChange={(e) => setCDesc(e.target.value)}
                      rows={3}
                      placeholder="Course description..."
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                    >
                      Create Course
                    </button>
                  </form>

                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3">
                    <h2 className="font-display font-bold text-base">Published Courses</h2>
                    <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                      {courses.map((c) => (
                        <div
                          key={c.courseId}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold">{c.title}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {SUBJECT_LABELS[c.subjectId]} ·{' '}
                              {c.isPublished ? 'Published' : 'Draft'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCourse(c)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  kind: 'course',
                                  id: c.courseId,
                                  label: c.title,
                                })
                              }
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#FF8B78] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {contentTab === 'videos' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!vTitle.trim()) return;
                      const vid: VideoLesson = {
                        id: `adm-vid-${Date.now()}`,
                        courseId: vCourseId || undefined,
                        title: vTitle.trim(),
                        subject: vSub,
                        topic: vTopic,
                        playlist: 'Faculty Uploads',
                        durationSec: 180,
                        instructor: vInstructor,
                        videoUrl: vUrl.trim() || undefined,
                        isPublished: true,
                        summary: {
                          en: `${vTopic} structured lesson added by ${vInstructor}.`,
                          ml: `${vTopic} പാഠം.`,
                          hi: `${vTopic} पाठ।`,
                          ta: `${vTopic} பாடம்.`,
                        },
                        steps: [
                          {
                            timestampSec: 0,
                            heading: '01. Core Concept',
                            visualNote: vTitle.trim(),
                            subtitles: {
                              en: vTitle.trim(),
                              ml: vTitle.trim(),
                              hi: vTitle.trim(),
                              ta: vTitle.trim(),
                            },
                          },
                        ],
                        relatedQuestionIds: [questions[0]?.id || 'q-quant-1'],
                      };
                      await addAdminVideo(vid);
                      setVTitle('');
                      setVUrl('');
                      showStatus('ok', 'Video lesson added.');
                    }}
                    className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4"
                  >
                    <h2 className="font-display font-bold text-base flex items-center gap-2">
                      <Video className="w-4 h-4 text-violet-600" />
                      Add Video Lesson
                    </h2>
                    <input
                      value={vTitle}
                      onChange={(e) => setVTitle(e.target.value)}
                      placeholder="Lesson Title"
                      required
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={vSub}
                        onChange={(e) => setVSub(e.target.value as SubjectId)}
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                      >
                        <option value="quant">Quantitative Aptitude</option>
                        <option value="reasoning">Reasoning</option>
                        <option value="english">English</option>
                        <option value="ga">General Awareness</option>
                        <option value="computer">Computer Knowledge</option>
                      </select>
                      <input
                        value={vTopic}
                        onChange={(e) => setVTopic(e.target.value)}
                        placeholder="Topic"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                      />
                    </div>
                    <select
                      value={vCourseId}
                      onChange={(e) => setVCourseId(e.target.value)}
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    >
                      <option value="">Attach to Course (Optional)</option>
                      {courses.map((c) => (
                        <option key={c.courseId} value={c.courseId}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <input
                      value={vInstructor}
                      onChange={(e) => setVInstructor(e.target.value)}
                      placeholder="Instructor Name"
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <input
                      value={vUrl}
                      onChange={(e) => setVUrl(e.target.value)}
                      placeholder="Hosted Video MP4 / Stream URL"
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                    >
                      Publish Video Lesson
                    </button>
                  </form>

                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3">
                    <h2 className="font-display font-bold text-base">Video Lessons Library</h2>
                    <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15 max-h-96 overflow-y-auto">
                      {videos.map((v) => (
                        <div
                          key={v.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold">{v.title}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {SUBJECT_LABELS[v.subject]} · {v.topic} ·{' '}
                              {v.isPublished === false ? 'Draft' : 'Published'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleVideoPublished(v.id, v.isPublished === false)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              {v.isPublished === false ? 'Publish' : 'Unpublish'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({ kind: 'video', id: v.id, label: v.title })
                              }
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#FF8B78] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {contentTab === 'subjects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SUBJECTS_SEED.map((sub) => {
                    const topics = SSC_SYLLABUS.filter((t) => t.subject === sub.subjectId);
                    const qCount = questions.filter((q) => q.subject === sub.subjectId).length;
                    return (
                      <div
                        key={sub.subjectId}
                        className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-bold text-sm">{sub.title}</h3>
                          <span className="text-xs font-mono-num text-[#075985] dark:text-[#55D6D0] font-semibold">
                            {qCount} Qs
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sub.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {topics.map((tp) => (
                            <span
                              key={tp.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]"
                            >
                              {tp.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {contentTab === 'mocks' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!mtTitle.trim() || mtSelectedIds.length === 0) {
                        showStatus('err', 'Enter a title and select at least 1 question.');
                        return;
                      }
                      await addAdminMockTest({
                        id: `mock-${Date.now()}`,
                        title: mtTitle.trim(),
                        category: mtCategory,
                        subjectIds: Array.from(
                          new Set(
                            questions
                              .filter((q) => mtSelectedIds.includes(q.id))
                              .map((q) => q.subject)
                          )
                        ),
                        durationMinutes: mtDuration,
                        totalMarks: mtSelectedIds.length * mtMarksPerQ,
                        marksPerCorrect: mtMarksPerQ,
                        negativeMarking: mtNegMark,
                        questionIds: mtSelectedIds,
                        description: `${mtCategory} (${mtSelectedIds.length} questions)`,
                        isPublished: true,
                      });
                      setMtTitle('');
                      setMtSelectedIds([]);
                      showStatus('ok', 'Mock test / PYQ paper published.');
                    }}
                    className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4"
                  >
                    <h2 className="font-display font-bold text-base flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-violet-600" />
                      Create Mock Test / Previous-Year Paper
                    </h2>
                    <input
                      value={mtTitle}
                      onChange={(e) => setMtTitle(e.target.value)}
                      placeholder="Test or Paper Title (e.g. SSC CGL 2024 Shift 2 Paper)"
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select
                        value={mtCategory}
                        onChange={(e) =>
                          setMtCategory(e.target.value as MockTestConfig['category'])
                        }
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      >
                        <option value="Tier 1">Tier 1</option>
                        <option value="Tier 2">Tier 2</option>
                        <option value="Sectional">Sectional</option>
                        <option value="Previous Year Paper">Previous Year Paper</option>
                      </select>
                      <input
                        type="number"
                        value={mtDuration}
                        onChange={(e) => setMtDuration(Number(e.target.value))}
                        placeholder="Minutes"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={mtMarksPerQ}
                        onChange={(e) => setMtMarksPerQ(Number(e.target.value))}
                        placeholder="+Marks"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      />
                      <input
                        type="number"
                        step="0.25"
                        value={mtNegMark}
                        onChange={(e) => setMtNegMark(Number(e.target.value))}
                        placeholder="-Neg"
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                      {questions.slice(0, 60).map((q) => {
                        const checked = mtSelectedIds.includes(q.id);
                        return (
                          <label
                            key={q.id}
                            className="flex items-start gap-2.5 p-2.5 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setMtSelectedIds((prev) =>
                                  checked ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                                )
                              }
                            />
                            <span className="line-clamp-1">
                              [{q.subject} · {q.year}] {q.questionEn}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                    >
                      Publish Test ({mtSelectedIds.length} selected)
                    </button>
                  </form>

                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3">
                    <h2 className="font-display font-bold text-base">
                      Mock Tests & Previous-Year Papers
                    </h2>
                    <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                      {mockTests.map((mt) => (
                        <div
                          key={mt.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold">{mt.title}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {mt.category} · {mt.questionIds.length} Qs · {mt.durationMinutes}m ·{' '}
                              {mt.isPublished === false ? 'Draft' : 'Published'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                toggleMockTestPublished(mt.id, mt.isPublished === false)
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              {mt.isPublished === false ? 'Publish' : 'Unpublish'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({ kind: 'mock', id: mt.id, label: mt.title })
                              }
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#FF8B78] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {contentTab === 'ocean-quest' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!oqTitle.trim()) {
                        showStatus('err', 'Enter a mission title.');
                        return;
                      }
                      const loc = OCEAN_LOCATIONS.find((l) => l.locationId === oqLocationId);
                      const mission: OceanQuestMission = {
                        missionId: oqEditId || `oq-adm-${Date.now()}`,
                        locationId: oqLocationId,
                        locationOrder: loc?.order || 1,
                        title: oqTitle.trim(),
                        description: oqDesc.trim() || `${oqTitle.trim()} underwater SSC challenge.`,
                        mode: oqMode,
                        difficulty: oqDiff,
                        subject: oqSubject,
                        questionCount: Math.max(1, Math.min(30, oqQCount)),
                        timeLimitSec: Math.max(0, Math.min(1800, oqTimerSec)),
                        minAccuracyPct: Math.max(30, Math.min(100, oqMinAcc)),
                        hintLimit: Math.max(0, Math.min(10, oqHints)),
                        xpReward: Math.max(10, Math.min(600, oqXp)),
                        coinReward: Math.max(5, Math.min(300, oqCoins)),
                        crystalReward: Math.max(1, Math.min(100, oqCrystals)),
                        prerequisiteMissionIds: [],
                        isBoss: oqIsBoss || oqMode === 'boss-battle',
                        ...(oqGuardianName.trim() ? { guardianName: oqGuardianName.trim() } : {}),
                        isPublished: true,
                        order: oceanQuestMissions.length + 1,
                      };
                      await upsertOceanQuestMission(mission);
                      setOqEditId(null);
                      setOqTitle('');
                      setOqDesc('');
                      setOqGuardianName('');
                      showStatus('ok', 'Ocean Quest mission saved and published.');
                    }}
                    className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-display font-bold text-base">
                        {oqEditId ? 'Edit Ocean Quest Mission' : 'Create Ocean Quest Mission'}
                      </h2>
                      {oqEditId && (
                        <button
                          type="button"
                          onClick={() => {
                            setOqEditId(null);
                            setOqTitle('');
                            setOqDesc('');
                          }}
                          className="text-xs text-[#FF8B78] font-semibold cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <input
                      value={oqTitle}
                      onChange={(e) => setOqTitle(e.target.value)}
                      placeholder="Mission Title (e.g., Coral Trench Ratio Dive)"
                      required
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                    />
                    <textarea
                      value={oqDesc}
                      onChange={(e) => setOqDesc(e.target.value)}
                      rows={2}
                      placeholder="Briefing description..."
                      className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select
                        value={oqLocationId}
                        onChange={(e) => setOqLocationId(e.target.value)}
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      >
                        {OCEAN_LOCATIONS.map((loc) => (
                          <option key={loc.locationId} value={loc.locationId}>
                            {loc.order}. {loc.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={oqMode}
                        onChange={(e) => setOqMode(e.target.value as OceanQuestMode)}
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      >
                        <option value="treasure-hunt">Treasure Hunt</option>
                        <option value="submarine-exploration">Submarine Dive</option>
                        <option value="crystal-rush">Crystal Rush</option>
                        <option value="boss-battle">Boss Battle</option>
                        <option value="subject-mission">Subject Mission</option>
                        <option value="daily-challenge">Daily Challenge</option>
                      </select>

                      <select
                        value={oqDiff}
                        onChange={(e) => setOqDiff(e.target.value as OceanQuestDifficulty)}
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>

                      <select
                        value={oqSubject}
                        onChange={(e) => setOqSubject(e.target.value as SubjectId | 'mixed')}
                        className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
                      >
                        <option value="mixed">Mixed Subjects</option>
                        <option value="quant">Quantitative</option>
                        <option value="reasoning">Reasoning</option>
                        <option value="english">English</option>
                        <option value="ga">General Awareness</option>
                        <option value="computer">Computer</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
                      <label className="space-y-1">
                        <span>Questions</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={oqQCount}
                          onChange={(e) => setOqQCount(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span>Timer (s)</span>
                        <input
                          type="number"
                          min={0}
                          max={1800}
                          value={oqTimerSec}
                          onChange={(e) => setOqTimerSec(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span>Min Acc %</span>
                        <input
                          type="number"
                          min={30}
                          max={100}
                          value={oqMinAcc}
                          onChange={(e) => setOqMinAcc(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span>Hints</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={oqHints}
                          onChange={(e) => setOqHints(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span>XP</span>
                        <input
                          type="number"
                          min={10}
                          max={600}
                          value={oqXp}
                          onChange={(e) => setOqXp(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span>Crystals</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={oqCrystals}
                          onChange={(e) => setOqCrystals(Number(e.target.value))}
                          className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2 py-1.5 text-xs"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={oqIsBoss}
                          onChange={(e) => setOqIsBoss(e.target.checked)}
                        />
                        Boss Guardian Battle
                      </label>
                      {(oqIsBoss || oqMode === 'boss-battle') && (
                        <input
                          value={oqGuardianName}
                          onChange={(e) => setOqGuardianName(e.target.value)}
                          placeholder="Guardian Boss Name"
                          className="flex-1 rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-1.5 text-xs"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                    >
                      {oqEditId ? 'Save Mission Updates' : 'Publish Ocean Quest Mission'}
                    </button>
                  </form>

                  <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-3">
                    <h2 className="font-display font-bold text-base">
                      Ocean Quest Missions ({oceanQuestMissions.length})
                    </h2>
                    <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15 max-h-[460px] overflow-y-auto">
                      {oceanQuestMissions.map((m) => (
                        <div
                          key={m.missionId}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{m.title}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {m.locationId} · {m.difficulty} · {m.questionCount} Qs ·{' '}
                              {m.isPublished === false ? 'Draft' : 'Published'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setOqEditId(m.missionId);
                                setOqLocationId(m.locationId);
                                setOqTitle(m.title);
                                setOqDesc(m.description);
                                setOqMode(m.mode);
                                setOqDiff(m.difficulty);
                                setOqSubject(m.subject);
                                setOqQCount(m.questionCount);
                                setOqTimerSec(m.timeLimitSec);
                                setOqMinAcc(m.minAccuracyPct);
                                setOqHints(m.hintLimit);
                                setOqXp(m.xpReward);
                                setOqCoins(m.coinReward);
                                setOqCrystals(m.crystalReward);
                                setOqIsBoss(Boolean(m.isBoss));
                                setOqGuardianName(m.guardianName || '');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Edit mission"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleOceanQuestMissionPublished(m.missionId, !m.isPublished)
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              {m.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  kind: 'quest',
                                  id: m.missionId,
                                  label: m.title,
                                })
                              }
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#FF8B78] cursor-pointer"
                              title="Delete mission"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {contentTab === 'notices' && (
                <div className="max-w-xl bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-600" />
                    Publish Student Announcement
                  </h2>
                  <input
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement Title"
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                  />
                  <textarea
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    rows={3}
                    placeholder="Details for SSC CGL aspirants..."
                    className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!annTitle.trim() || !annBody.trim()) return;
                      await addAnnouncement(annTitle.trim(), annBody.trim());
                      setAnnTitle('');
                      setAnnBody('');
                      showStatus('ok', 'Announcement published.');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-semibold cursor-pointer"
                  >
                    Publish Notice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 6. REPORTS & EXPORT */}
          {section === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'performance', label: 'User Performance Report' },
                    { id: 'registrations', label: 'Registration Report' },
                    { id: 'tests', label: 'Test Performance Report' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReportType(r.id as typeof reportType)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                        reportType === r.id
                          ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleExportReport('csv')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-violet-500 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportReport('xlsx')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-semibold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Excel (.xlsx)
                  </button>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  {reportType === 'performance' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F3FAFA] dark:bg-[#062B3D] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
                        <tr>
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">XP</th>
                          <th className="py-3 px-4">Mocks</th>
                          <th className="py-3 px-4">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                        {students.map((s) => {
                          const acc =
                            s.questionsAttempted > 0
                              ? Math.round((s.questionsCorrect / s.questionsAttempted) * 100)
                              : 0;
                          return (
                            <tr key={s.uid}>
                              <td className="py-2.5 px-4 font-mono-num">@{s.username}</td>
                              <td className="py-2.5 px-4 font-semibold">{s.displayName}</td>
                              <td className="py-2.5 px-4">
                                {s.isActive ? 'Active' : 'Inactive'}
                              </td>
                              <td className="py-2.5 px-4 font-mono-num">{s.xp}</td>
                              <td className="py-2.5 px-4 font-mono-num">{s.mockTestsCompleted}</td>
                              <td className="py-2.5 px-4 font-mono-num font-bold">{acc}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {reportType === 'registrations' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F3FAFA] dark:bg-[#062B3D] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
                        <tr>
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Language</th>
                          <th className="py-3 px-4">Registered At</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                        {students.map((s) => (
                          <tr key={s.uid}>
                            <td className="py-2.5 px-4 font-mono-num">@{s.username}</td>
                            <td className="py-2.5 px-4 font-semibold">{s.displayName}</td>
                            <td className="py-2.5 px-4">{s.email}</td>
                            <td className="py-2.5 px-4">{s.preferredLanguage.toUpperCase()}</td>
                            <td className="py-2.5 px-4 font-mono-num">
                              {s.createdAt ? s.createdAt.slice(0, 10) : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              {s.isActive ? 'Active' : 'Inactive'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportType === 'tests' && (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F3FAFA] dark:bg-[#062B3D] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
                        <tr>
                          <th className="py-3 px-4">Test Title</th>
                          <th className="py-3 px-4">Score</th>
                          <th className="py-3 px-4">Accuracy</th>
                          <th className="py-3 px-4">Correct / Wrong</th>
                          <th className="py-3 px-4">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                        {allAttempts.map((a) => (
                          <tr key={a.id}>
                            <td className="py-2.5 px-4 font-semibold">{a.testTitle}</td>
                            <td className="py-2.5 px-4 font-mono-num">
                              {a.score}/{a.maxScore}
                            </td>
                            <td className="py-2.5 px-4 font-mono-num font-bold">{a.accuracy}%</td>
                            <td className="py-2.5 px-4 font-mono-num">
                              {a.correctCount} / {a.wrongCount}
                            </td>
                            <td className="py-2.5 px-4 font-mono-num">
                              {a.createdAt ? a.createdAt.slice(0, 10) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
          {section === 'predictor' && (
            <AdminPredictorControl onStatus={showStatus} />
          )}
        </main>
      </div>

      {/* Student Profile & Progress Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">{selectedStudent.displayName}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  @{selectedStudent.username} · {selectedStudent.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#081221]">
                <div className="text-slate-500">Registered</div>
                <div className="font-mono-num font-semibold mt-0.5">
                  {selectedStudent.createdAt ? selectedStudent.createdAt.slice(0, 10) : '—'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#081221]">
                <div className="text-slate-500">XP / Streak</div>
                <div className="font-mono-num font-semibold mt-0.5">
                  {selectedStudent.xp} XP · {selectedStudent.streak}d
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#081221]">
                <div className="text-slate-500">Lessons Done</div>
                <div className="font-mono-num font-semibold mt-0.5">
                  {selectedStudent.completedLessonsCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#081221]">
                <div className="text-slate-500">Questions Acc.</div>
                <div className="font-mono-num font-semibold mt-0.5">
                  {selectedStudent.questionsAttempted > 0
                    ? `${Math.round(
                        (selectedStudent.questionsCorrect / selectedStudent.questionsAttempted) * 100
                      )}%`
                    : '—'}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold">Subject-Wise Learning Progress</div>
              {(['quant', 'reasoning', 'english', 'ga', 'computer'] as SubjectId[]).map((sub) => {
                const st = selectedStudent.subjectStats[sub] || { attempted: 0, correct: 0 };
                const pct = st.attempted > 0 ? Math.round((st.correct / st.attempted) * 100) : 0;
                return (
                  <div key={sub} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span>{SUBJECT_LABELS[sub]}</span>
                      <span className="font-mono-num">
                        {st.correct}/{st.attempted} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-violet-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    selectedStudent.isActive ? 'text-emerald-500' : 'text-[#FF8B78]'
                  }`}
                />
                Account is {selectedStudent.isActive ? 'Active' : 'Inactive'}
              </span>
              {selectedStudent.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => handleToggleUserStatus(selectedStudent)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    selectedStudent.isActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedStudent.isActive ? 'Deactivate Account' : 'Activate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const safeStatus: AnswerVerificationStatus =
                editingQuestion.sourceType === 'AI_GENERATED'
                  ? 'needs_verification'
                  : editingQuestion.answerStatus || 'official';
              const payload: Question = {
                ...editingQuestion,
                answerStatus: safeStatus,
                isVerified:
                  editingQuestion.sourceType === 'PYQ' && safeStatus === 'official',
              };
              await updateAdminQuestion(editingQuestion.id, payload);
              setEditingQuestion(null);
              showStatus('ok', 'Question and answer key updated.');
            }}
            className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Edit Question &amp; Answer Key</h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={editingQuestion.subject}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    subject: e.target.value as SubjectId,
                  })
                }
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              >
                <option value="quant">Quant</option>
                <option value="reasoning">Reasoning</option>
                <option value="english">English</option>
                <option value="ga">GA</option>
                <option value="computer">Computer</option>
              </select>
              <input
                value={editingQuestion.topic}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                }
                placeholder="Topic"
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              />
              <input
                type="number"
                value={editingQuestion.year}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, year: Number(e.target.value) })
                }
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              />
              <select
                value={editingQuestion.tier}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    tier: e.target.value as 'Tier 1' | 'Tier 2',
                  })
                }
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              >
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={editingQuestion.examDate || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, examDate: e.target.value })
                }
                placeholder="Exam Date (YYYY-MM-DD)"
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              />
              <input
                value={editingQuestion.shift}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, shift: e.target.value })
                }
                placeholder="Shift"
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs"
              />
              <select
                value={
                  editingQuestion.sourceType === 'AI_GENERATED'
                    ? 'needs_verification'
                    : editingQuestion.answerStatus || 'official'
                }
                disabled={editingQuestion.sourceType === 'AI_GENERATED'}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    answerStatus: e.target.value as AnswerVerificationStatus,
                  })
                }
                className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-2.5 py-2 text-xs disabled:opacity-60"
              >
                <option value="official">Official Final Key</option>
                <option value="unofficial">Unofficial Key</option>
                <option value="needs_verification">Needs Verification</option>
              </select>
            </div>
            <textarea
              value={editingQuestion.questionEn}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, questionEn: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              {editingQuestion.optionsEn.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) => {
                    const nextOpts = [...editingQuestion.optionsEn] as [
                      string,
                      string,
                      string,
                      string,
                    ];
                    nextOpts[idx] = e.target.value;
                    setEditingQuestion({ ...editingQuestion, optionsEn: nextOpts });
                  }}
                  className="rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>Correct Key:</span>
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setEditingQuestion({ ...editingQuestion, correctIndex: idx })
                  }
                  className={`px-3 py-1 rounded border cursor-pointer ${
                    editingQuestion.correctIndex === idx
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </button>
              ))}
            </div>
            <textarea
              value={editingQuestion.explanations.en}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  explanations: {
                    ...editingQuestion.explanations,
                    en: e.target.value,
                  },
                })
              }
              rows={2}
              placeholder="Explanation"
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
            />
            <textarea
              value={(editingQuestion.stepByStep || []).join('\n')}
              onChange={(e) =>
                setEditingQuestion({
                  ...editingQuestion,
                  stepByStep: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={2}
              placeholder="Step-by-step lines (one step per line)"
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
            />
            <input
              value={editingQuestion.shortcutMethod || ''}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, shortcutMethod: e.target.value })
              }
              placeholder="Shortcut method (optional)"
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateAdminCourse(editingCourse.courseId, {
                title: editingCourse.title,
                description: editingCourse.description,
                isPublished: editingCourse.isPublished,
              });
              setEditingCourse(null);
              showStatus('ok', 'Course updated.');
            }}
            className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-display text-base font-bold">Edit Course</h3>
            <input
              value={editingCourse.title}
              onChange={(e) =>
                setEditingCourse({ ...editingCourse, title: e.target.value })
              }
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-xs"
            />
            <textarea
              value={editingCourse.description}
              onChange={(e) =>
                setEditingCourse({ ...editingCourse, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] p-3 text-xs"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editingCourse.isPublished}
                onChange={(e) =>
                  setEditingCourse({ ...editingCourse, isPublished: e.target.checked })
                }
              />
              Published to students
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold cursor-pointer"
              >
                Save Course
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-rose-600 dark:text-rose-400">
              Confirm Deletion
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently remove &ldquo;{confirmDelete.label}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
