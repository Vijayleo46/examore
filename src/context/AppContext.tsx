import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AI_EXPECTED_QUESTION_NOTICE,
  Announcement,
  AnswerVerificationStatus,
  BookmarkItem,
  ChatMessage,
  CourseDef,
  CurrentAffairsCategory,
  CurrentAffairsItem,
  ExamTier,
  GameModeId,
  GameSession,
  LanguageCode,
  LeaderboardEntry,
  LocalReminderNotification,
  MainTab,
  MockTestConfig,
  NotificationPreferences,
  OceanQuestEvalResponse,
  OceanQuestMission,
  OceanQuestProgress,
  PredictionAccuracyReport,
  PredictorCategoryOverride,
  PredictorQuestion,
  PredictorReviewStatus,
  PyqAttemptRecord,
  Question,
  StudyPlan,
  SubjectId,
  TestAttempt,
  UserProfile,
  VideoLesson,
} from '../types/examverse';
import {
  CURATED_CURRENT_AFFAIRS_SEED,
  HISTORICAL_ACCURACY_BENCHMARK_SEED,
} from '../data/futurePredictorEngine';
import {
  OCEAN_LOCATIONS,
  OCEAN_MISSIONS_SEED,
  createDefaultOceanQuestProgress,
  getLocationUnlockStatus,
} from '../data/oceanQuestCatalog';
import {
  buildOceanStudyReminder,
  shouldFireDailyScheduledReminder,
  triggerBrowserLocalNotification,
} from '../lib/localNotifications';
import {
  auth,
  checkUsernameAvailable,
  db,
  googleProvider,
  handleFirestoreError,
  loginWithUsernameOrEmail,
  normalizeUsername,
  OperationType,
  refreshAuthUser,
  registerWithEmail,
  resendVerificationEmail,
  resetPassword,
  testFirestoreConnection,
  verifyServerAdminAccess,
} from '../lib/firebase';
import {
  BADGES,
  computeLevel,
  COURSES_SEED,
  INITIAL_LEADERBOARD,
  MOCK_TESTS,
  QUESTIONS_BANK,
  SUBJECTS_SEED,
  VIDEO_LESSONS,
} from '../data/sscCurriculum';
import { soundFX } from '../lib/sound';

const STORAGE_KEY = 'examverse_state_v1';

interface PersistedLocal {
  onboarded: boolean;
  theme: 'light' | 'dark';
  soundMuted: boolean;
  notificationPrefs: NotificationPreferences;
  localReminders: LocalReminderNotification[];
  lastDailyReminderDate: string | null;
  lastGoalCelebrationDate: string | null;
  profile: UserProfile;
  testAttempts: TestAttempt[];
  gameSessions: GameSession[];
  bookmarks: BookmarkItem[];
  difficultQuestionIds: string[];
  revisionListIds: string[];
  pyqAttempts: Record<string, PyqAttemptRecord>;
  studyPlan: StudyPlan | null;
  chatHistory: ChatMessage[];
  customQuestions: Question[];
  customVideos: VideoLesson[];
  customMockTests: MockTestConfig[];
  customCourses: CourseDef[];
  customOceanMissions: OceanQuestMission[];
  oceanQuestProgress: OceanQuestProgress;
  announcements: Announcement[];
  customPredictorQuestions?: PredictorQuestion[];
  customPredictorCategories?: PredictorCategoryOverride[];
  customPredictionReports?: PredictionAccuracyReport[];
  customCurrentAffairs?: CurrentAffairsItem[];
}

export interface AdminStudentSummary {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  xp: number;
  streak: number;
  level: string;
  role: string;
  isActive: boolean;
  preferredLanguage: string;
  mockTestsCompleted: number;
  completedLessonsCount: number;
  studyMinutesToday: number;
  questionsAttempted: number;
  questionsCorrect: number;
  subjectStats: Record<SubjectId, { attempted: number; correct: number }>;
  createdAt: string;
  lastLogin: string;
}

const DEFAULT_PROFILE: UserProfile = {
  uid: 'guest-scholar',
  displayName: 'Aspirant Scholar',
  email: '',
  preferredLanguage: 'en',
  targetPost: 'Income Tax Inspector (CBDT)',
  dailyGoalMinutes: 90,
  xp: 240,
  coins: 120,
  streak: 3,
  role: 'student',
  completedLessons: [],
  completedSyllabusTopics: ['syl-q-pct'],
  earnedBadges: ['badge-first-step'],
  studyMinutesToday: 35,
  questionsAttempted: 14,
  questionsCorrect: 11,
  subjectStats: {
    quant: { attempted: 5, correct: 4 },
    reasoning: { attempted: 4, correct: 3 },
    english: { attempted: 3, correct: 2 },
    ga: { attempted: 2, correct: 2 },
    computer: { attempted: 0, correct: 0 },
  },
  videoProgress: {},
};

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'SSC CGL Tier 1 & Tier 2 2025–2026 Pattern Ready',
    body: 'All mock tests follow official +2/-0.50 (Tier 1) and +3/-1 (Tier 2) marking rules with Computer Module II coverage and verified 2024 Shift-2 PYQs.',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  dailyReminder: true,
  mockAlerts: true,
  streakAlerts: true,
  reminderTime: '19:00',
  browserPushEnabled: false,
};

function loadInitialState(): PersistedLocal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedLocal>;
      return {
        onboarded: parsed.onboarded ?? false,
        theme: parsed.theme ?? 'light',
        soundMuted: parsed.soundMuted ?? false,
        notificationPrefs: { ...DEFAULT_NOTIFICATIONS, ...(parsed.notificationPrefs || {}) },
        localReminders: parsed.localReminders ?? [],
        lastDailyReminderDate: parsed.lastDailyReminderDate ?? null,
        lastGoalCelebrationDate: parsed.lastGoalCelebrationDate ?? null,
        profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
        testAttempts: parsed.testAttempts ?? [],
        gameSessions: parsed.gameSessions ?? [],
        bookmarks: parsed.bookmarks ?? [],
        difficultQuestionIds: parsed.difficultQuestionIds ?? [],
        revisionListIds: parsed.revisionListIds ?? [],
        pyqAttempts: parsed.pyqAttempts ?? {},
        studyPlan: parsed.studyPlan ?? null,
        chatHistory: parsed.chatHistory ?? [],
        customQuestions: parsed.customQuestions ?? [],
        customVideos: parsed.customVideos ?? [],
        customMockTests: parsed.customMockTests ?? [],
        customCourses: parsed.customCourses ?? [],
        customOceanMissions: parsed.customOceanMissions ?? [],
        oceanQuestProgress: {
          ...createDefaultOceanQuestProgress(parsed.profile?.uid || DEFAULT_PROFILE.uid),
          ...(parsed.oceanQuestProgress || {}),
        },
        announcements: parsed.announcements ?? DEFAULT_ANNOUNCEMENTS,
        customPredictorQuestions: parsed.customPredictorQuestions ?? [],
        customPredictorCategories: parsed.customPredictorCategories ?? [],
        customPredictionReports: parsed.customPredictionReports ?? [],
        customCurrentAffairs: parsed.customCurrentAffairs ?? [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    onboarded: false,
    theme: 'light',
    soundMuted: false,
    notificationPrefs: DEFAULT_NOTIFICATIONS,
    localReminders: [],
    lastDailyReminderDate: null,
    lastGoalCelebrationDate: null,
    profile: DEFAULT_PROFILE,
    testAttempts: [],
    gameSessions: [],
    bookmarks: [],
    difficultQuestionIds: [],
    revisionListIds: [],
    pyqAttempts: {},
    studyPlan: null,
    chatHistory: [],
    customQuestions: [],
    customVideos: [],
    customMockTests: [],
    customCourses: [],
    customOceanMissions: [],
    oceanQuestProgress: createDefaultOceanQuestProgress(DEFAULT_PROFILE.uid),
    announcements: DEFAULT_ANNOUNCEMENTS,
  };
}

interface RewardToast {
  id: string;
  title: string;
  xp: number;
  coins: number;
}

interface AppContextValue {
  showSplash: boolean;
  dismissSplash: () => void;
  onboarded: boolean;
  completeOnboarding: (lang: LanguageCode, targetPost: string, goalMinutes: number) => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  tutorOpen: boolean;
  openAiTutor: () => void;
  closeAiTutor: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  soundMuted: boolean;
  toggleSound: () => void;
  notificationPrefs: NotificationPreferences;
  updateNotificationPrefs: (patch: Partial<NotificationPreferences>) => void;
  localReminders: LocalReminderNotification[];
  activeReminderBanner: LocalReminderNotification | null;
  dismissReminderBanner: () => void;
  markAllRemindersRead: () => void;
  triggerGoalReminder: (forceKind?: LocalReminderNotification['kind']) => LocalReminderNotification;
  publicDataError: string | null;
  retryPublicLoad: () => Promise<void>;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  firebaseUser: User | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  checkUsernameUnique: (username: string) => Promise<boolean>;
  registerEmailAccount: (
    username: string,
    fullName: string,
    email: string,
    password: string
  ) => Promise<void>;
  loginEmailAccount: (identifier: string, password: string) => Promise<void>;
  sendPasswordReset: (identifier: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  signOut: () => Promise<void>;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  questions: Question[];
  videos: VideoLesson[];
  mockTests: MockTestConfig[];
  courses: CourseDef[];
  testAttempts: TestAttempt[];
  gameSessions: GameSession[];
  bookmarks: BookmarkItem[];
  difficultQuestionIds: string[];
  revisionListIds: string[];
  pyqAttempts: Record<string, PyqAttemptRecord>;
  loadingQuestions: boolean;
  studyPlan: StudyPlan | null;
  saveStudyPlan: (plan: StudyPlan) => Promise<void>;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  persistTutorMessage: (msg: ChatMessage) => Promise<void>;
  clearTutorHistory: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  announcements: Announcement[];
  recordQuestionResult: (subject: SubjectId, isCorrect: boolean, xpBonus?: number) => void;
  recordPyqAttempt: (question: Question, selectedIndex: number) => void;
  toggleDifficultQuestion: (questionId: string) => void;
  toggleRevisionQuestion: (questionId: string) => void;
  recordGameSession: (
    gameMode: GameModeId,
    gameTitle: string,
    score: number,
    xpEarned: number,
    coinsEarned: number,
    accuracy: number,
    comboMax: number
  ) => Promise<void>;
  recordMockAttempt: (attempt: TestAttempt) => Promise<void>;
  updateVideoProgress: (lessonId: string, lastSec: number, completed: boolean, notes?: string) => void;
  toggleSyllabusTopic: (topicId: string) => void;
  toggleBookmark: (itemType: 'question' | 'video', itemId: string, title: string, subject: SubjectId) => void;
  addAdminQuestion: (q: Question, persistToFirestore?: boolean) => Promise<void>;
  updateAdminQuestion: (id: string, patch: Partial<Question>) => Promise<void>;
  deleteAdminQuestion: (id: string) => Promise<void>;
  importAdminQuestions: (qs: Question[]) => Promise<void>;
  addAdminVideo: (v: VideoLesson) => Promise<void>;
  toggleVideoPublished: (id: string, isPublished: boolean) => Promise<void>;
  deleteAdminVideo: (id: string) => Promise<void>;
  addAdminCourse: (c: CourseDef) => Promise<void>;
  updateAdminCourse: (courseId: string, patch: Partial<CourseDef>) => Promise<void>;
  deleteAdminCourse: (courseId: string) => Promise<void>;
  addAdminMockTest: (mt: MockTestConfig) => Promise<void>;
  toggleMockTestPublished: (id: string, isPublished: boolean) => Promise<void>;
  deleteAdminMockTest: (id: string) => Promise<void>;
  addAnnouncement: (title: string, body: string) => Promise<void>;
  seedFirestoreDatabase: () => Promise<{ seededDocs: number }>;
  toggleStudentActive: (uid: string, nextActive: boolean) => Promise<void>;
  oceanQuestMissions: OceanQuestMission[];
  oceanQuestProgress: OceanQuestProgress;
  evaluateOceanQuestRun: (input: {
    mission: OceanQuestMission;
    correctCount: number;
    totalQuestions: number;
    timeRemainingSec: number;
    hintsUsed: number;
    comboMax: number;
    attemptedQuestionIds: string[];
    wrongQuestionIds: string[];
    subjectBreakdown: Partial<Record<SubjectId, { attempted: number; correct: number }>>;
  }) => Promise<OceanQuestEvalResponse>;
  upsertOceanQuestMission: (mission: OceanQuestMission) => Promise<void>;
  toggleOceanQuestMissionPublished: (missionId: string, isPublished: boolean) => Promise<void>;
  deleteOceanQuestMission: (missionId: string) => Promise<void>;
  fetchAdminAnalytics: () => Promise<{
    students: AdminStudentSummary[];
    attempts: TestAttempt[];
    gameSessions: GameSession[];
    oceanProgress: OceanQuestProgress[];
  }>;
  predictorQuestions: PredictorQuestion[];
  predictorCategories: PredictorCategoryOverride[];
  predictionReports: PredictionAccuracyReport[];
  currentAffairs: CurrentAffairsItem[];
  savePredictorQuestion: (q: PredictorQuestion) => Promise<void>;
  reviewPredictorQuestion: (
    id: string,
    status: PredictorReviewStatus,
    patch?: Partial<PredictorQuestion>
  ) => Promise<void>;
  deletePredictorQuestion: (id: string) => Promise<void>;
  upsertPredictorCategory: (cat: PredictorCategoryOverride) => Promise<void>;
  savePredictionReport: (report: PredictionAccuracyReport) => Promise<void>;
  togglePredictionReportOutdated: (id: string, isOutdated: boolean) => Promise<void>;
  upsertCurrentAffairsItem: (item: CurrentAffairsItem) => Promise<void>;
  deleteCurrentAffairsItem: (id: string) => Promise<void>;
  tutorPrefill: string | null;
  openTutorWithPrompt: (prompt: string) => void;
  clearTutorPrefill: () => void;
  rewardToast: RewardToast | null;
  dismissToast: () => void;
  levelInfo: ReturnType<typeof computeLevel>;
  isAdmin: boolean;
  isVerifiedCloudAdmin: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedLocal>(loadInitialState);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTabState, setActiveTabState] = useState<MainTab>('home');
  const [tutorOpen, setTutorOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isServerAdmin, setIsServerAdmin] = useState(false);
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [remoteQuestions, setRemoteQuestions] = useState<Question[]>([]);
  const [remoteVideos, setRemoteVideos] = useState<VideoLesson[]>([]);
  const [remoteMockTests, setRemoteMockTests] = useState<MockTestConfig[]>([]);
  const [remoteCourses, setRemoteCourses] = useState<CourseDef[]>([]);
  const [remoteOceanMissions, setRemoteOceanMissions] = useState<OceanQuestMission[]>([]);
  const [remoteAnnouncements, setRemoteAnnouncements] = useState<Announcement[]>([]);
  const [remotePredictorQuestions, setRemotePredictorQuestions] = useState<PredictorQuestion[]>([]);
  const [remotePredictorCategories, setRemotePredictorCategories] = useState<PredictorCategoryOverride[]>([]);
  const [remotePredictionReports, setRemotePredictionReports] = useState<PredictionAccuracyReport[]>([]);
  const [remoteCurrentAffairs, setRemoteCurrentAffairs] = useState<CurrentAffairsItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [publicDataError, setPublicDataError] = useState<string | null>(null);
  const [tutorPrefill, setTutorPrefill] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const [activeReminderBanner, setActiveReminderBanner] =
    useState<LocalReminderNotification | null>(null);

  const setActiveTab = (tab: MainTab) => {
    setTutorOpen(false);
    setActiveTabState(tab);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  useEffect(() => {
    soundFX.muted = state.soundMuted;
  }, [state.soundMuted]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const dispatchOceanReminder = (
    forceKind?: LocalReminderNotification['kind'],
    markDailySent = false,
    markCelebrated = false
  ): LocalReminderNotification => {
    const reminder = buildOceanStudyReminder({
      displayName: state.profile.displayName,
      username: state.profile.username,
      studiedMinutes: state.profile.studyMinutesToday,
      goalMinutes: state.profile.dailyGoalMinutes,
      streak: state.profile.streak,
      forceKind,
    });
    const todayIso = new Date().toISOString().slice(0, 10);
    setState((prev) => ({
      ...prev,
      localReminders: [reminder, ...prev.localReminders].slice(0, 10),
      lastDailyReminderDate: markDailySent ? todayIso : prev.lastDailyReminderDate,
      lastGoalCelebrationDate: markCelebrated ? todayIso : prev.lastGoalCelebrationDate,
    }));
    setActiveReminderBanner(reminder);
    triggerBrowserLocalNotification(reminder, state.notificationPrefs);
    setTimeout(() => {
      setActiveReminderBanner((cur) => (cur?.id === reminder.id ? null : cur));
    }, 8000);
    return reminder;
  };

  // Gentle local goal scheduler & 100% milestone ocean celebration
  useEffect(() => {
    if (!state.onboarded || showSplash) return;

    const evaluateReminders = () => {
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);

      if (
        state.notificationPrefs.dailyReminder &&
        state.profile.studyMinutesToday >= state.profile.dailyGoalMinutes &&
        state.lastGoalCelebrationDate !== todayIso
      ) {
        dispatchOceanReminder('goal-complete', false, true);
        return;
      }

      if (
        shouldFireDailyScheduledReminder(
          now,
          state.notificationPrefs,
          state.lastDailyReminderDate,
          state.profile.studyMinutesToday,
          state.profile.dailyGoalMinutes
        )
      ) {
        dispatchOceanReminder(undefined, true, false);
      }
    };

    const checkTimer = setTimeout(evaluateReminders, 12000);
    const interval = setInterval(evaluateReminders, 30000);
    return () => {
      clearTimeout(checkTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.onboarded,
    showSplash,
    state.notificationPrefs,
    state.profile.studyMinutesToday,
    state.profile.dailyGoalMinutes,
    state.lastDailyReminderDate,
    state.lastGoalCelebrationDate,
  ]);

  const showToast = (title: string, xp: number, coins: number) => {
    setRewardToast({ id: String(Date.now()), title, xp, coins });
    setTimeout(() => {
      setRewardToast((prev) => (prev ? null : prev));
    }, 3600);
  };

  const isVerifiedCloudAdmin = Boolean(
    firebaseUser && firebaseUser.emailVerified && isServerAdmin
  );

  const syncUserProgressToFirestore = async (
    prof: UserProfile,
    overrides?: {
      difficultQuestionIds?: string[];
      revisionListIds?: string[];
      pyqAttempts?: Record<string, PyqAttemptRecord>;
    }
  ) => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    if (prof.isActive === false) return;
    const uid = auth.currentUser.uid;
    const diffIds = (overrides?.difficultQuestionIds ?? state.difficultQuestionIds).slice(0, 1000);
    const revIds = (overrides?.revisionListIds ?? state.revisionListIds).slice(0, 1000);
    const rawAttempts = overrides?.pyqAttempts ?? state.pyqAttempts;
    const compactAttempts = Object.fromEntries(Object.entries(rawAttempts).slice(-400));
    try {
      await setDoc(
        doc(db, 'userProgress', uid),
        {
          uid,
          completedLessonIds: prof.completedLessons.slice(0, 500),
          completedTopics: prof.completedSyllabusTopics.slice(0, 500),
          subjectProgress: prof.subjectStats,
          difficultQuestionIds: diffIds,
          revisionListIds: revIds,
          pyqAttempts: compactAttempts,
          totalStudyMinutes: Math.max(0, Math.round(prof.studyMinutesToday)),
          lastStudiedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `userProgress/${uid}`);
    }
  };

  const syncUserToFirestore = async (
    prof: UserProfile,
    overrides?: { isNewRegistration?: boolean; mockTestsCount?: number; forceAdminRole?: boolean }
  ) => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    if (prof.isActive === false) return;
    const uid = auth.currentUser.uid;
    const levelName = computeLevel(prof.xp).current.name;
    const accuracy =
      prof.questionsAttempted > 0
        ? Math.round((prof.questionsCorrect / prof.questionsAttempted) * 100)
        : 0;
    const nowIso = new Date().toISOString();
    const safeDisplayName = (prof.displayName || auth.currentUser.displayName || 'Aspirant Scholar').slice(0, 80);
    const totalHours = Number((prof.studyMinutesToday / 60).toFixed(2));
    const mockCount = overrides?.mockTestsCount ?? state.testAttempts.length;
    const cleanUsername = prof.username?.trim();

    const userPayload: Record<string, unknown> = {
      uid,
      displayName: safeDisplayName,
      fullName: safeDisplayName,
      email: (auth.currentUser.email || prof.email || '').slice(0, 160),
      preferredLanguage: prof.preferredLanguage,
      targetPost: prof.targetPost.slice(0, 100),
      dailyGoalMinutes: Math.min(720, Math.max(10, Math.round(prof.dailyGoalMinutes))),
      xp: Math.max(0, Math.round(prof.xp)),
      totalPoints: Math.max(0, Math.round(prof.xp)),
      coins: Math.max(0, Math.round(prof.coins)),
      streak: Math.max(0, Math.round(prof.streak)),
      dailyStreak: Math.max(0, Math.round(prof.streak)),
      totalStudyHours: Math.max(0, totalHours),
      mockTestsCompleted: Math.max(0, Math.round(mockCount)),
      questionsAttempted: Math.max(0, Math.round(prof.questionsAttempted)),
      questionsCorrect: Math.max(0, Math.round(prof.questionsCorrect)),
      subjectStats: prof.subjectStats,
      level: levelName.slice(0, 40),
      role: overrides?.forceAdminRole || isServerAdmin ? 'admin' : 'student',
      isActive: true,
      completedLessons: prof.completedLessons.slice(0, 500),
      earnedBadges: prof.earnedBadges.slice(0, 100),
      lastLogin: nowIso,
      updatedAt: nowIso,
    };
    if (cleanUsername) {
      userPayload.username = cleanUsername.slice(0, 32);
      userPayload.usernameLower = normalizeUsername(cleanUsername).slice(0, 32);
    }
    if (auth.currentUser.photoURL) {
      userPayload.profileImage = auth.currentUser.photoURL.slice(0, 500);
    }
    if (overrides?.isNewRegistration) {
      userPayload.createdAt = prof.createdAt || nowIso;
    }

    try {
      await setDoc(doc(db, 'users', uid), userPayload, { merge: true });
      await setDoc(
        doc(db, 'leaderboards', uid),
        {
          uid,
          displayName: safeDisplayName,
          xp: Math.max(0, Math.round(prof.xp)),
          streak: Math.max(0, Math.round(prof.streak)),
          level: levelName.slice(0, 40),
          accuracy,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      await syncUserProgressToFirestore(prof);
    } catch (error) {
      console.warn('Profile sync warning:', error);
    }
  };

  const loadPublicCollections = async (includeDrafts = isServerAdmin) => {
    setPublicDataError(null);
    try {
      const lbSnap = await getDocs(
        query(collection(db, 'leaderboards'), orderBy('xp', 'desc'), limit(20))
      );
      const lb: LeaderboardEntry[] = [];
      lbSnap.forEach((d) => {
        const data = d.data();
        lb.push({
          uid: String(data.uid || d.id),
          displayName: String(data.displayName || 'Scholar'),
          xp: Number(data.xp || 0),
          streak: Number(data.streak || 0),
          level: String(data.level || 'Beginner'),
          accuracy: Number(data.accuracy || 0),
        });
      });
      setRemoteLeaderboard(lb);

      const annSnap = await getDocs(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10))
      );
      const anns: Announcement[] = [];
      annSnap.forEach((d) => {
        const data = d.data();
        anns.push({
          id: d.id,
          title: String(data.title || ''),
          body: String(data.body || ''),
          createdAt: String(data.createdAt || ''),
        });
      });
      if (anns.length > 0) setRemoteAnnouncements(anns);

      // Paginated loader for ALL published questions (no 100-doc truncation)
      const mapQuestionDoc = (d: QueryDocumentSnapshot<DocumentData>): Question | null => {
        const dt = d.data();
        if (!dt.questionEn || !Array.isArray(dt.optionsEn)) return null;
        const srcType = dt.sourceType === 'AI_GENERATED' ? 'AI_GENERATED' : 'PYQ';
        const verifiedFlag = srcType === 'AI_GENERATED' ? false : Boolean(dt.isVerified ?? true);
        const derivedStatus: AnswerVerificationStatus =
          dt.answerStatus === 'official' ||
          dt.answerStatus === 'unofficial' ||
          dt.answerStatus === 'needs_verification'
            ? srcType === 'AI_GENERATED'
              ? 'needs_verification'
              : dt.answerStatus
            : srcType === 'AI_GENERATED'
            ? 'needs_verification'
            : verifiedFlag
            ? 'official'
            : 'unofficial';
        return {
          id: String(dt.id || d.id),
          questionNumber: dt.questionNumber !== undefined ? Number(dt.questionNumber) : undefined,
          subject: (dt.subject as SubjectId) || 'quant',
          topic: String(dt.topic || 'General'),
          year: Number(dt.year || 2024),
          examDate: dt.examDate ? String(dt.examDate) : undefined,
          shift: String(dt.shift || 'Tier 1'),
          tier: dt.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
          difficulty: (dt.difficulty as Question['difficulty']) || 'Medium',
          sourceType: srcType,
          sourceLabel: String(dt.sourceLabel || 'Firestore Question Bank'),
          answerStatus: derivedStatus,
          isVerified: verifiedFlag,
          isPublished: dt.isPublished !== false,
          sourceUrls: Array.isArray(dt.sourceUrls) ? dt.sourceUrls : undefined,
          questionEn: String(dt.questionEn),
          questionHi: dt.questionHi ? String(dt.questionHi) : undefined,
          optionsEn: dt.optionsEn.slice(0, 4) as [string, string, string, string],
          correctIndex: Number(dt.correctIndex || 0),
          explanations: dt.explanations || {
            en: 'Verified answer.',
            ml: 'ഉത്തരം പരിശോധിക്കുക.',
            hi: 'सही उत्तर की व्याख्या।',
            ta: 'சரியான விடை விளக்கம்.',
          },
          stepByStep: Array.isArray(dt.stepByStep) ? dt.stepByStep.map(String) : undefined,
          shortcutMethod: dt.shortcutMethod ? String(dt.shortcutMethod) : undefined,
        };
      };

      const loadAllQuestionsPaginated = async (publishedOnly: boolean): Promise<Question[]> => {
        const collected: Question[] = [];
        let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
        const batchSize = 200;
        for (let page = 0; page < 50; page++) {
          const baseCol = collection(db, 'questions');
          const qRef: Query<DocumentData> = publishedOnly
            ? cursor
              ? query(baseCol, where('isPublished', '==', true), startAfter(cursor), limit(batchSize))
              : query(baseCol, where('isPublished', '==', true), limit(batchSize))
            : cursor
            ? query(baseCol, startAfter(cursor), limit(batchSize))
            : query(baseCol, limit(batchSize));
          const snap: QuerySnapshot<DocumentData> | null = await getDocs(qRef).catch(() => null);
          if (!snap || snap.empty) break;
          snap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
            const parsed = mapQuestionDoc(d);
            if (parsed) collected.push(parsed);
          });
          if (snap.docs.length < batchSize) break;
          cursor = snap.docs[snap.docs.length - 1];
        }
        return collected;
      };

      setLoadingQuestions(true);
      const [allQs, vSnap, mtSnap, cSnap, oqSnap] = await Promise.all([
        loadAllQuestionsPaginated(!includeDrafts),
        getDocs(query(collection(db, 'videoLessons'), where('isPublished', '==', true), limit(100))).catch(() => null),
        getDocs(query(collection(db, 'mockTests'), where('isPublished', '==', true), limit(60))).catch(() => null),
        getDocs(query(collection(db, 'courses'), where('isPublished', '==', true), limit(60))).catch(() => null),
        getDocs(
          includeDrafts
            ? query(collection(db, 'oceanQuestMissions'), limit(100))
            : query(collection(db, 'oceanQuestMissions'), where('isPublished', '==', true), limit(100))
        ).catch(() => null),
      ]);
      setLoadingQuestions(false);
      setRemoteQuestions(allQs);

      if (vSnap) {
        const vs: VideoLesson[] = [];
        vSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title) {
            vs.push({
              id: String(dt.id || d.id),
              courseId: dt.courseId ? String(dt.courseId) : undefined,
              title: String(dt.title),
              subject: (dt.subject as SubjectId) || 'quant',
              topic: String(dt.topic || 'Core'),
              playlist: String(dt.playlist || 'Faculty Uploads'),
              durationSec: Number(dt.durationSec || 60),
              lessonOrder: dt.lessonOrder !== undefined ? Number(dt.lessonOrder) : undefined,
              instructor: String(dt.instructor || 'Examora Faculty'),
              thumbnailUrl: dt.thumbnailUrl ? String(dt.thumbnailUrl) : undefined,
              videoUrl: dt.videoUrl ? String(dt.videoUrl) : undefined,
              isPublished: dt.isPublished !== false,
              summary: dt.summary || {
                en: String(dt.title),
                ml: String(dt.title),
                hi: String(dt.title),
                ta: String(dt.title),
              },
              steps: Array.isArray(dt.steps) ? dt.steps : [],
              relatedQuestionIds: Array.isArray(dt.relatedQuestionIds) ? dt.relatedQuestionIds : [],
            });
          }
        });
        setRemoteVideos(vs);
      }

      if (mtSnap) {
        const mts: MockTestConfig[] = [];
        mtSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title && Array.isArray(dt.questionIds)) {
            mts.push({
              id: String(dt.testId || d.id),
              title: String(dt.title),
              category: (dt.category as MockTestConfig['category']) || 'Tier 1',
              subjectIds: Array.isArray(dt.subjectIds) ? dt.subjectIds : undefined,
              durationMinutes: Number(dt.durationMinutes || 15),
              totalMarks: Number(dt.totalMarks || 20),
              marksPerCorrect: Number(dt.marksPerCorrect || 2),
              negativeMarking: Number(dt.negativeMarking || 0.5),
              questionIds: dt.questionIds,
              description: String(dt.description || ''),
              isPublished: dt.isPublished !== false,
            });
          }
        });
        setRemoteMockTests(mts);
      }

      if (cSnap) {
        const cs: CourseDef[] = [];
        cSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title) {
            cs.push({
              courseId: String(dt.courseId || d.id),
              subjectId: (dt.subjectId as SubjectId) || 'quant',
              title: String(dt.title),
              description: String(dt.description || ''),
              thumbnailUrl: dt.thumbnailUrl ? String(dt.thumbnailUrl) : undefined,
              order: Number(dt.order || 1),
              isPublished: dt.isPublished !== false,
              createdAt: String(dt.createdAt || ''),
            });
          }
        });
        setRemoteCourses(cs);
      }

      if (oqSnap) {
        const ms: OceanQuestMission[] = [];
        oqSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title && dt.locationId) {
            ms.push({
              missionId: String(dt.missionId || d.id),
              locationId: String(dt.locationId),
              locationOrder: Number(dt.locationOrder || 1),
              title: String(dt.title),
              description: String(dt.description || ''),
              mode: (dt.mode as OceanQuestMission['mode']) || 'treasure-hunt',
              difficulty: (dt.difficulty as OceanQuestMission['difficulty']) || 'beginner',
              subject: (dt.subject as OceanQuestMission['subject']) || 'mixed',
              questionCount: Number(dt.questionCount || 5),
              timeLimitSec: Number(dt.timeLimitSec || 0),
              minAccuracyPct: Number(dt.minAccuracyPct || 60),
              hintLimit: Number(dt.hintLimit || 1),
              xpReward: Number(dt.xpReward || 100),
              coinReward: Number(dt.coinReward || 50),
              crystalReward: Number(dt.crystalReward || 5),
              badgeId: dt.badgeId ? String(dt.badgeId) : undefined,
              prerequisiteMissionIds: Array.isArray(dt.prerequisiteMissionIds)
                ? dt.prerequisiteMissionIds.map(String)
                : [],
              isBoss: Boolean(dt.isBoss),
              guardianName: dt.guardianName ? String(dt.guardianName) : undefined,
              isPublished: dt.isPublished !== false,
              order: Number(dt.order || 0),
              updatedAt: dt.updatedAt ? String(dt.updatedAt) : undefined,
            });
          }
        });
        ms.sort((a, b) => a.order - b.order);
        setRemoteOceanMissions(ms);
      }

      const [pqSnap, pcSnap, prSnap, caSnap] = await Promise.all([
        getDocs(
          includeDrafts
            ? query(collection(db, 'predictorQuestions'), limit(150))
            : query(collection(db, 'predictorQuestions'), where('isPublished', '==', true), limit(150))
        ).catch(() => null),
        getDocs(query(collection(db, 'predictorCategories'), limit(100))).catch(() => null),
        getDocs(query(collection(db, 'predictionReports'), limit(60))).catch(() => null),
        getDocs(
          includeDrafts
            ? query(collection(db, 'currentAffairs'), limit(100))
            : query(collection(db, 'currentAffairs'), where('isPublished', '==', true), limit(100))
        ).catch(() => null),
      ]);

      if (pqSnap) {
        const pqs: PredictorQuestion[] = [];
        pqSnap.forEach((d) => {
          const dt = d.data();
          if (dt.questionEn && Array.isArray(dt.optionsEn)) {
            pqs.push({
              id: String(dt.questionId || d.id),
              examYear: Number(dt.examYear || 2026),
              tier: dt.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
              subject: (dt.subject as SubjectId) || 'quant',
              topic: String(dt.topic || 'General'),
              difficulty: (dt.difficulty as PredictorQuestion['difficulty']) || 'Medium',
              questionEn: String(dt.questionEn),
              optionsEn: dt.optionsEn.slice(0, 4) as [string, string, string, string],
              correctIndex: Number(dt.correctIndex || 0),
              explanation: String(dt.explanation || ''),
              stepByStep: Array.isArray(dt.stepByStep) ? dt.stepByStep.map(String) : [],
              usefulnessReason: String(dt.usefulnessReason || ''),
              sourceType: 'AI_GENERATED',
              isOfficialPyq: false,
              aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
              reviewStatus:
                dt.reviewStatus === 'approved' || dt.reviewStatus === 'rejected'
                  ? dt.reviewStatus
                  : 'pending',
              isPublished: Boolean(dt.isPublished),
              createdByUid: dt.createdByUid ? String(dt.createdByUid) : undefined,
              createdAt: String(dt.createdAt || ''),
              reviewedAt: dt.reviewedAt ? String(dt.reviewedAt) : undefined,
            });
          }
        });
        setRemotePredictorQuestions(pqs);
      }

      if (pcSnap) {
        const pcs: PredictorCategoryOverride[] = [];
        pcSnap.forEach((d) => {
          const dt = d.data();
          if (dt.topic) {
            pcs.push({
              id: String(dt.categoryId || d.id),
              topic: String(dt.topic),
              subject: (dt.subject as SubjectId) || 'quant',
              tier: dt.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
              targetYear: Number(dt.targetYear || 2026),
              priorityOverride: dt.priorityOverride as PredictorCategoryOverride['priorityOverride'],
              isOutdated: Boolean(dt.isOutdated),
              outdatedNote: dt.outdatedNote ? String(dt.outdatedNote) : undefined,
              updatedAt: String(dt.updatedAt || ''),
            });
          }
        });
        setRemotePredictorCategories(pcs);
      }

      if (prSnap) {
        const prs: PredictionAccuracyReport[] = [];
        prSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title) {
            prs.push({
              id: String(dt.reportId || d.id),
              examYear: Number(dt.examYear || 2024),
              tier: dt.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
              title: String(dt.title),
              predictedTopics: Array.isArray(dt.predictedTopics) ? dt.predictedTopics.map(String) : [],
              actualTopics: Array.isArray(dt.actualTopics) ? dt.actualTopics.map(String) : [],
              matchedTopics: Array.isArray(dt.matchedTopics) ? dt.matchedTopics.map(String) : [],
              missedTopics: Array.isArray(dt.missedTopics) ? dt.missedTopics.map(String) : [],
              coveragePct: Number(dt.coveragePct || 0),
              notes: String(dt.notes || ''),
              isOutdated: Boolean(dt.isOutdated),
              createdAt: String(dt.createdAt || ''),
            });
          }
        });
        setRemotePredictionReports(prs);
      }

      if (caSnap) {
        const cas: CurrentAffairsItem[] = [];
        caSnap.forEach((d) => {
          const dt = d.data();
          if (dt.title && dt.sourceUrl) {
            cas.push({
              id: String(dt.articleId || d.id),
              category: (dt.category as CurrentAffairsCategory) || 'National',
              title: String(dt.title),
              summary: String(dt.summary || ''),
              examRelevance: String(dt.examRelevance || ''),
              publishedDate: String(dt.publishedDate || ''),
              sourceName: String(dt.sourceName || 'Verified Source'),
              sourceUrl: String(dt.sourceUrl),
              targetYear: Number(dt.targetYear || 2026),
              isPublished: dt.isPublished !== false,
              createdAt: String(dt.createdAt || ''),
            });
          }
        });
        setRemoteCurrentAffairs(cas);
      }
    } catch {
      setPublicDataError('Having trouble loading the latest study materials. You can keep studying offline or tap Retry.');
    }
  };

  useEffect(() => {
    testFirestoreConnection();
    loadPublicCollections();

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (!user) {
        setIsServerAdmin(false);
        return;
      }

      try {
        // Server-verified authorization check via Firestore Security Rules (/adminMeta/access)
        const adminAllowed = await verifyServerAdminAccess();
        setIsServerAdmin(adminAllowed);
        if (adminAllowed) {
          void loadPublicCollections(true);
        }

        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          const isAcctActive = data.isActive !== false;
          setState((prev) => ({
            ...prev,
            onboarded: true,
            profile: {
              ...prev.profile,
              uid: user.uid,
              username: data.username ? String(data.username) : prev.profile.username,
              displayName: String(data.displayName || user.displayName || prev.profile.displayName),
              email: String(user.email || data.email || ''),
              preferredLanguage: (data.preferredLanguage as LanguageCode) || prev.profile.preferredLanguage,
              targetPost: String(data.targetPost || prev.profile.targetPost),
              dailyGoalMinutes: Number(data.dailyGoalMinutes || prev.profile.dailyGoalMinutes),
              xp: Math.max(prev.profile.xp, Number(data.xp || 0)),
              coins: Math.max(prev.profile.coins, Number(data.coins || 0)),
              streak: Math.max(prev.profile.streak, Number(data.streak || 1)),
              role: adminAllowed ? 'admin' : 'student',
              isActive: isAcctActive,
              createdAt: data.createdAt ? String(data.createdAt) : prev.profile.createdAt,
              lastLogin: data.lastLogin ? String(data.lastLogin) : prev.profile.lastLogin,
              completedLessons: Array.isArray(data.completedLessons)
                ? data.completedLessons
                : prev.profile.completedLessons,
              earnedBadges: Array.isArray(data.earnedBadges)
                ? data.earnedBadges
                : prev.profile.earnedBadges,
            },
          }));
          if (user.emailVerified && isAcctActive) {
            await setDoc(
              userDocRef,
              { lastLogin: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch(() => {});
          }
        } else {
          const nextProfile: UserProfile = {
            ...state.profile,
            uid: user.uid,
            displayName: user.displayName || state.profile.displayName,
            email: user.email || '',
            role: adminAllowed ? 'admin' : 'student',
            isActive: true,
          };
          setState((prev) => ({ ...prev, onboarded: true, profile: nextProfile }));
          if (user.emailVerified) {
            await syncUserToFirestore(nextProfile, {
              isNewRegistration: true,
              forceAdminRole: adminAllowed,
            });
          }
        }

        // Load userProgress/{uid}
        const progSnap = await getDoc(doc(db, 'userProgress', user.uid)).catch(() => null);
        if (progSnap?.exists()) {
          const pd = progSnap.data();
          setState((prev) => ({
            ...prev,
            difficultQuestionIds: Array.isArray(pd.difficultQuestionIds)
              ? Array.from(new Set([...prev.difficultQuestionIds, ...pd.difficultQuestionIds.map(String)]))
              : prev.difficultQuestionIds,
            revisionListIds: Array.isArray(pd.revisionListIds)
              ? Array.from(new Set([...prev.revisionListIds, ...pd.revisionListIds.map(String)]))
              : prev.revisionListIds,
            pyqAttempts:
              pd.pyqAttempts && typeof pd.pyqAttempts === 'object'
                ? { ...pd.pyqAttempts, ...prev.pyqAttempts }
                : prev.pyqAttempts,
            profile: {
              ...prev.profile,
              completedLessons: Array.isArray(pd.completedLessonIds)
                ? Array.from(new Set([...prev.profile.completedLessons, ...pd.completedLessonIds]))
                : prev.profile.completedLessons,
              completedSyllabusTopics: Array.isArray(pd.completedTopics)
                ? Array.from(new Set([...prev.profile.completedSyllabusTopics, ...pd.completedTopics]))
                : prev.profile.completedSyllabusTopics,
            },
          }));
        }

        // Load user's testAttempts
        const attemptsSnap = await getDocs(
          query(collection(db, 'testAttempts'), where('userId', '==', user.uid), limit(25))
        );
        const attempts: TestAttempt[] = [];
        attemptsSnap.forEach((d) => {
          const dt = d.data();
          attempts.push({
            id: d.id,
            testId: String(dt.testId || ''),
            testTitle: String(dt.testTitle || ''),
            score: Number(dt.score || 0),
            maxScore: Number(dt.maxScore || 0),
            correctCount: Number(dt.correctCount || 0),
            wrongCount: Number(dt.wrongCount || 0),
            unattemptedCount: Number(dt.unattemptedCount || 0),
            accuracy: Number(dt.accuracy || 0),
            timeTakenSec: Number(dt.timeTakenSec || 0),
            subjectBreakdown: dt.subjectBreakdown || {
              quant: { correct: 0, total: 0 },
              reasoning: { correct: 0, total: 0 },
              english: { correct: 0, total: 0 },
              ga: { correct: 0, total: 0 },
              computer: { correct: 0, total: 0 },
            },
            createdAt: String(dt.createdAt || dt.submittedAt || ''),
          });
        });
        if (attempts.length > 0) {
          setState((prev) => ({ ...prev, testAttempts: attempts }));
        }

        // Load user's AI Tutor chat history from aiTutorChats/{uid}/messages
        const chatSnap = await getDocs(
          query(
            collection(db, 'aiTutorChats', user.uid, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(50)
          )
        ).catch(() => null);
        if (chatSnap && !chatSnap.empty) {
          const loadedMsgs: ChatMessage[] = [];
          chatSnap.forEach((d) => {
            const dt = d.data();
            loadedMsgs.push({
              id: String(dt.messageId || d.id),
              role: dt.role === 'user' ? 'user' : 'assistant',
              text: String(dt.message || ''),
              language: (dt.language as LanguageCode) || 'en',
              createdAt: String(dt.timestamp || ''),
            });
          });
          setState((prev) => ({ ...prev, chatHistory: loadedMsgs }));
        }

        // Load Ocean Quest Progress (non-destructive merge)
        const oqSnap = await getDoc(doc(db, 'oceanQuestProgress', user.uid)).catch(() => null);
        if (oqSnap?.exists()) {
          const od = oqSnap.data();
          setState((prev) => ({
            ...prev,
            oceanQuestProgress: {
              ...prev.oceanQuestProgress,
              uid: user.uid,
              unlockedLocations: Array.from(
                new Set([
                  'coral-bay',
                  ...prev.oceanQuestProgress.unlockedLocations,
                  ...(Array.isArray(od.unlockedLocations) ? od.unlockedLocations.map(String) : []),
                ])
              ),
              completedMissions: Array.from(
                new Set([
                  ...prev.oceanQuestProgress.completedMissions,
                  ...(Array.isArray(od.completedMissions) ? od.completedMissions.map(String) : []),
                ])
              ),
              missionBestScores: {
                ...(od.missionBestScores || {}),
                ...prev.oceanQuestProgress.missionBestScores,
              },
              missionStars: {
                ...(od.missionStars || {}),
                ...prev.oceanQuestProgress.missionStars,
              },
              seenQuestionIds: Array.from(
                new Set([
                  ...prev.oceanQuestProgress.seenQuestionIds,
                  ...(Array.isArray(od.seenQuestionIds) ? od.seenQuestionIds.map(String) : []),
                ])
              ).slice(-1500),
              wrongQuestionIds: Array.from(
                new Set([
                  ...prev.oceanQuestProgress.wrongQuestionIds,
                  ...(Array.isArray(od.wrongQuestionIds) ? od.wrongQuestionIds.map(String) : []),
                ])
              ).slice(0, 800),
              crystals: Math.max(prev.oceanQuestProgress.crystals, Number(od.crystals || 0)),
              totalQuestXp: Math.max(prev.oceanQuestProgress.totalQuestXp, Number(od.totalQuestXp || 0)),
              questBadges: Array.from(
                new Set([
                  ...prev.oceanQuestProgress.questBadges,
                  ...(Array.isArray(od.questBadges) ? od.questBadges.map(String) : []),
                ])
              ),
              dailyCompletions: Array.from(
                new Set([
                  ...prev.oceanQuestProgress.dailyCompletions,
                  ...(Array.isArray(od.dailyCompletions) ? od.dailyCompletions.map(String) : []),
                ])
              ),
              totalRuns: Math.max(prev.oceanQuestProgress.totalRuns, Number(od.totalRuns || 0)),
              totalCorrect: Math.max(prev.oceanQuestProgress.totalCorrect, Number(od.totalCorrect || 0)),
              totalAttempted: Math.max(prev.oceanQuestProgress.totalAttempted, Number(od.totalAttempted || 0)),
              updatedAt: String(od.updatedAt || new Date().toISOString()),
            },
          }));
        }
      } catch (err) {
        console.warn('Could not fetch user profile state:', err);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluateBadges = (prof: UserProfile, latestMockAccuracy?: number): string[] => {
    const badges = new Set(prof.earnedBadges);
    if (prof.xp >= 100) badges.add('badge-first-step');
    if (prof.subjectStats.quant.correct >= 10) badges.add('badge-maths-master');
    if (prof.subjectStats.reasoning.correct >= 8) badges.add('badge-reasoning-genius');
    if (prof.subjectStats.english.correct >= 8) badges.add('badge-english-wizard');
    if (prof.streak >= 7) badges.add('badge-streak-7');
    if (latestMockAccuracy !== undefined && latestMockAccuracy >= 70) {
      badges.add('badge-mock-champ');
    }
    return Array.from(badges);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      const adminAllowed = await verifyServerAdminAccess();
      setIsServerAdmin(adminAllowed);
      const nextProfile: UserProfile = {
        ...state.profile,
        uid: cred.user.uid,
        displayName: cred.user.displayName || state.profile.displayName,
        email: cred.user.email || '',
        role: adminAllowed ? 'admin' : 'student',
        isActive: true,
      };
      setState((prev) => ({ ...prev, onboarded: true, profile: nextProfile }));
      await syncUserToFirestore(nextProfile, { forceAdminRole: adminAllowed });
      showToast('Signed In Successfully', 50, 25);
    }
  };

  const checkUsernameUnique = async (username: string) => {
    return checkUsernameAvailable(username);
  };

  const registerEmailAccount = async (
    username: string,
    fullName: string,
    email: string,
    password: string
  ) => {
    const cred = await registerWithEmail(username, fullName, email, password);
    const nowIso = new Date().toISOString();
    const nextProfile: UserProfile = {
      ...state.profile,
      uid: cred.user.uid,
      username: username.trim(),
      displayName: fullName.trim() || state.profile.displayName,
      email: cred.user.email || email.trim(),
      role: 'student',
      isActive: true,
      createdAt: nowIso,
      lastLogin: nowIso,
    };
    setIsServerAdmin(false);
    setState((prev) => ({ ...prev, onboarded: true, profile: nextProfile }));
    showToast('Account Created · Verify Email', 25, 10);
  };

  const loginEmailAccount = async (identifier: string, password: string) => {
    const cred = await loginWithUsernameOrEmail(identifier, password);
    if (cred.user) {
      const adminAllowed = await verifyServerAdminAccess();
      setIsServerAdmin(adminAllowed);
      const nextProfile: UserProfile = {
        ...state.profile,
        uid: cred.user.uid,
        displayName: cred.user.displayName || state.profile.displayName,
        email: cred.user.email || '',
        role: adminAllowed ? 'admin' : 'student',
      };
      setState((prev) => ({ ...prev, onboarded: true, profile: nextProfile }));
      if (cred.user.emailVerified) {
        await syncUserToFirestore(nextProfile, { forceAdminRole: adminAllowed });
      }
      showToast('Signed In Successfully', 20, 10);
    }
  };

  const sendPasswordReset = async (identifier: string) => {
    await resetPassword(identifier);
  };

  const resendVerification = async () => {
    await resendVerificationEmail();
  };

  const checkEmailVerification = async () => {
    const verified = await refreshAuthUser();
    if (verified && auth.currentUser) {
      const adminAllowed = await verifyServerAdminAccess();
      setIsServerAdmin(adminAllowed);
      setFirebaseUser({ ...auth.currentUser } as User);
      await syncUserToFirestore(state.profile, {
        isNewRegistration: true,
        forceAdminRole: adminAllowed,
      });
      showToast('Email Verified · Cloud Sync Active', 50, 25);
    }
    return verified;
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setIsServerAdmin(false);
    setState((prev) => ({
      ...prev,
      onboarded: false,
      profile: {
        ...DEFAULT_PROFILE,
        preferredLanguage: prev.profile.preferredLanguage,
      },
    }));
  };

  const updateProfile = (patch: Partial<UserProfile>) => {
    setState((prev) => {
      const nextProfile = { ...prev.profile, ...patch };
      syncUserToFirestore(nextProfile);
      return { ...prev, profile: nextProfile };
    });
  };

  const completeOnboarding = (lang: LanguageCode, targetPost: string, goalMinutes: number) => {
    setState((prev) => {
      const nextProfile = {
        ...prev.profile,
        preferredLanguage: lang,
        targetPost,
        dailyGoalMinutes: goalMinutes,
      };
      syncUserToFirestore(nextProfile);
      return { ...prev, onboarded: true, profile: nextProfile };
    });
  };

  const recordQuestionResult = (subject: SubjectId, isCorrect: boolean, xpBonus = 15) => {
    setState((prev) => {
      const xpGain = isCorrect ? xpBonus : 3;
      const coinGain = isCorrect ? 5 : 0;
      const curSub = prev.profile.subjectStats[subject] || { attempted: 0, correct: 0 };
      const updated: UserProfile = {
        ...prev.profile,
        xp: prev.profile.xp + xpGain,
        coins: prev.profile.coins + coinGain,
        questionsAttempted: prev.profile.questionsAttempted + 1,
        questionsCorrect: prev.profile.questionsCorrect + (isCorrect ? 1 : 0),
        studyMinutesToday: prev.profile.studyMinutesToday + 2,
        subjectStats: {
          ...prev.profile.subjectStats,
          [subject]: {
            attempted: curSub.attempted + 1,
            correct: curSub.correct + (isCorrect ? 1 : 0),
          },
        },
      };
      updated.earnedBadges = evaluateBadges(updated);
      syncUserToFirestore(updated);
      return { ...prev, profile: updated };
    });
  };

  const toggleDifficultQuestion = (questionId: string) => {
    setState((prev) => {
      const exists = prev.difficultQuestionIds.includes(questionId);
      const nextDiff = exists
        ? prev.difficultQuestionIds.filter((id) => id !== questionId)
        : [questionId, ...prev.difficultQuestionIds];
      syncUserProgressToFirestore(prev.profile, { difficultQuestionIds: nextDiff }).catch(() => {});
      return { ...prev, difficultQuestionIds: nextDiff };
    });
  };

  const toggleRevisionQuestion = (questionId: string) => {
    setState((prev) => {
      const exists = prev.revisionListIds.includes(questionId);
      const nextRev = exists
        ? prev.revisionListIds.filter((id) => id !== questionId)
        : [questionId, ...prev.revisionListIds];
      syncUserProgressToFirestore(prev.profile, { revisionListIds: nextRev }).catch(() => {});
      return { ...prev, revisionListIds: nextRev };
    });
  };

  const recordPyqAttempt = (question: Question, selectedIndex: number) => {
    const isCorrect = selectedIndex === question.correctIndex;
    const record: PyqAttemptRecord = {
      questionId: question.id,
      selectedIndex,
      isCorrect,
      attemptedAt: new Date().toISOString(),
      subject: question.subject,
    };
    setState((prev) => {
      const alreadyAttempted = Boolean(prev.pyqAttempts[question.id]);
      const nextAttempts = { ...prev.pyqAttempts, [question.id]: record };
      const xpGain = alreadyAttempted ? 2 : isCorrect ? 15 : 3;
      const coinGain = !alreadyAttempted && isCorrect ? 5 : 0;
      const curSub = prev.profile.subjectStats[question.subject] || { attempted: 0, correct: 0 };
      const updatedProfile: UserProfile = alreadyAttempted
        ? prev.profile
        : {
            ...prev.profile,
            xp: prev.profile.xp + xpGain,
            coins: prev.profile.coins + coinGain,
            questionsAttempted: prev.profile.questionsAttempted + 1,
            questionsCorrect: prev.profile.questionsCorrect + (isCorrect ? 1 : 0),
            studyMinutesToday: prev.profile.studyMinutesToday + 2,
            subjectStats: {
              ...prev.profile.subjectStats,
              [question.subject]: {
                attempted: curSub.attempted + 1,
                correct: curSub.correct + (isCorrect ? 1 : 0),
              },
            },
          };
      if (!alreadyAttempted) {
        updatedProfile.earnedBadges = evaluateBadges(updatedProfile);
        syncUserToFirestore(updatedProfile);
      }
      syncUserProgressToFirestore(updatedProfile, { pyqAttempts: nextAttempts }).catch(() => {});
      return { ...prev, profile: updatedProfile, pyqAttempts: nextAttempts };
    });
  };

  const recordGameSession = async (
    gameMode: GameModeId,
    gameTitle: string,
    score: number,
    xpEarned: number,
    coinsEarned: number,
    accuracy: number,
    comboMax: number
  ) => {
    const nowIso = new Date().toISOString();
    const session: GameSession = {
      id: `gs-${Date.now()}`,
      gameMode,
      gameTitle,
      score,
      xpEarned,
      coinsEarned,
      accuracy,
      comboMax,
      createdAt: nowIso,
    };

    setState((prev) => {
      const badges = new Set(prev.profile.earnedBadges);
      if (gameMode === 'escape-room' && accuracy >= 60) {
        badges.add('badge-reasoning-genius');
      }
      const nextProfile: UserProfile = {
        ...prev.profile,
        xp: prev.profile.xp + xpEarned,
        coins: prev.profile.coins + coinsEarned,
        studyMinutesToday: prev.profile.studyMinutesToday + 5,
        dailyChallengeDoneDate:
          gameMode === 'daily-challenge'
            ? nowIso.slice(0, 10)
            : prev.profile.dailyChallengeDoneDate,
        earnedBadges: Array.from(badges),
      };
      nextProfile.earnedBadges = evaluateBadges(nextProfile);
      syncUserToFirestore(nextProfile);
      return {
        ...prev,
        profile: nextProfile,
        gameSessions: [session, ...prev.gameSessions].slice(0, 40),
      };
    });

    showToast(`${gameTitle} Complete`, xpEarned, coinsEarned);

    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'gameSessions', session.id), {
          userId: auth.currentUser.uid,
          gameMode,
          score: Math.round(score),
          xpEarned: Math.round(xpEarned),
          coinsEarned: Math.round(coinsEarned),
          accuracy: Math.round(accuracy),
          createdAt: nowIso,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `gameSessions/${session.id}`);
      }

      try {
        await setDoc(doc(db, 'gameScores', session.id), {
          userId: auth.currentUser.uid,
          gameId: gameMode,
          gameTitle: gameTitle.slice(0, 120),
          score: Math.round(score),
          xpEarned: Math.round(xpEarned),
          coinsEarned: Math.round(coinsEarned),
          accuracy: Math.round(accuracy),
          completedAt: nowIso,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `gameScores/${session.id}`);
      }
    }
  };

  const recordMockAttempt = async (attempt: TestAttempt) => {
    const xpEarned = Math.max(40, Math.round(attempt.correctCount * 20));
    const coinsEarned = Math.max(15, Math.round(attempt.correctCount * 6));
    const nextMockCount = state.testAttempts.length + 1;

    setState((prev) => {
      const nextSubjectStats = { ...prev.profile.subjectStats };
      (Object.keys(attempt.subjectBreakdown) as SubjectId[]).forEach((sub) => {
        const br = attempt.subjectBreakdown[sub];
        if (br && br.total > 0) {
          nextSubjectStats[sub] = {
            attempted: nextSubjectStats[sub].attempted + br.total,
            correct: nextSubjectStats[sub].correct + br.correct,
          };
        }
      });

      const nextProfile: UserProfile = {
        ...prev.profile,
        xp: prev.profile.xp + xpEarned,
        coins: prev.profile.coins + coinsEarned,
        questionsAttempted: prev.profile.questionsAttempted + attempt.correctCount + attempt.wrongCount,
        questionsCorrect: prev.profile.questionsCorrect + attempt.correctCount,
        studyMinutesToday: prev.profile.studyMinutesToday + Math.max(5, Math.round(attempt.timeTakenSec / 60)),
        subjectStats: nextSubjectStats,
      };
      nextProfile.earnedBadges = evaluateBadges(nextProfile, attempt.accuracy);
      syncUserToFirestore(nextProfile, { mockTestsCount: nextMockCount });
      return {
        ...prev,
        profile: nextProfile,
        testAttempts: [attempt, ...prev.testAttempts].slice(0, 30),
      };
    });

    showToast('Mock Test Evaluated', xpEarned, coinsEarned);

    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'testAttempts', attempt.id), {
          userId: auth.currentUser.uid,
          testId: attempt.testId,
          testTitle: attempt.testTitle,
          subjectBreakdown: attempt.subjectBreakdown,
          score: attempt.score,
          maxScore: attempt.maxScore,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          unattemptedCount: attempt.unattemptedCount,
          accuracy: attempt.accuracy,
          timeTakenSec: attempt.timeTakenSec,
          submittedAt: attempt.createdAt,
          createdAt: attempt.createdAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `testAttempts/${attempt.id}`);
      }
    }
  };

  const updateVideoProgress = (lessonId: string, lastSec: number, completed: boolean, notes?: string) => {
    setState((prev) => {
      const prevVid = prev.profile.videoProgress[lessonId] || { lastSec: 0, completed: false, notes: '' };
      const newlyCompleted = completed && !prev.profile.completedLessons.includes(lessonId);
      const completedLessons = newlyCompleted
        ? [...prev.profile.completedLessons, lessonId]
        : prev.profile.completedLessons;

      const nextProfile: UserProfile = {
        ...prev.profile,
        xp: prev.profile.xp + (newlyCompleted ? 40 : 0),
        coins: prev.profile.coins + (newlyCompleted ? 15 : 0),
        completedLessons,
        lastLessonId: lessonId,
        videoProgress: {
          ...prev.profile.videoProgress,
          [lessonId]: {
            lastSec,
            completed: prevVid.completed || completed,
            notes: notes !== undefined ? notes : prevVid.notes,
          },
        },
      };
      if (newlyCompleted) {
        nextProfile.earnedBadges = evaluateBadges(nextProfile);
        syncUserToFirestore(nextProfile);
        showToast('Lesson Completed', 40, 15);
      }
      return { ...prev, profile: nextProfile };
    });
  };

  const toggleSyllabusTopic = (topicId: string) => {
    setState((prev) => {
      const exists = prev.profile.completedSyllabusTopics.includes(topicId);
      const next = exists
        ? prev.profile.completedSyllabusTopics.filter((t) => t !== topicId)
        : [...prev.profile.completedSyllabusTopics, topicId];
      const nextProfile = { ...prev.profile, completedSyllabusTopics: next };
      syncUserProgressToFirestore(nextProfile).catch(() => {});
      return { ...prev, profile: nextProfile };
    });
  };

  const toggleBookmark = (
    itemType: 'question' | 'video',
    itemId: string,
    title: string,
    subject: SubjectId
  ) => {
    setState((prev) => {
      const existing = prev.bookmarks.find((b) => b.itemId === itemId && b.itemType === itemType);
      if (existing) {
        if (auth.currentUser && auth.currentUser.emailVerified) {
          deleteDoc(doc(db, 'bookmarks', existing.id)).catch(() => {});
        }
        return { ...prev, bookmarks: prev.bookmarks.filter((b) => b.id !== existing.id) };
      }
      const next: BookmarkItem = {
        id: `bm-${itemType}-${itemId}`,
        itemType,
        itemId,
        title,
        subject,
        createdAt: new Date().toISOString(),
      };
      if (auth.currentUser && auth.currentUser.emailVerified) {
        setDoc(doc(db, 'bookmarks', next.id), {
          userId: auth.currentUser.uid,
          itemType,
          itemId,
          title: title.slice(0, 200),
          createdAt: next.createdAt,
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `bookmarks/${next.id}`));
      }
      return { ...prev, bookmarks: [next, ...prev.bookmarks] };
    });
  };

  const saveStudyPlan = async (plan: StudyPlan) => {
    setState((prev) => ({ ...prev, studyPlan: plan }));
    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'studyPlans', auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          hoursPerDay: plan.hoursPerDay,
          examTarget: plan.examTarget,
          examDate: plan.examDate,
          preferredLanguage: plan.preferredLanguage,
          blocks: plan.blocks,
          updatedAt: plan.updatedAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `studyPlans/${auth.currentUser.uid}`);
      }
    }
  };

  const persistTutorMessage = async (msg: ChatMessage) => {
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const uid = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'aiTutorChats', uid, 'messages', msg.id), {
        messageId: msg.id,
        role: msg.role,
        message: msg.text.slice(0, 8000),
        timestamp: msg.createdAt,
        language: msg.language,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `aiTutorChats/${uid}/messages/${msg.id}`);
    }
  };

  const clearTutorHistory = async () => {
    setState((prev) => ({ ...prev, chatHistory: [] }));
    if (!auth.currentUser || !auth.currentUser.emailVerified) return;
    const uid = auth.currentUser.uid;
    try {
      const snap = await getDocs(collection(db, 'aiTutorChats', uid, 'messages'));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `aiTutorChats/${uid}/messages`);
    }
  };

  const addAdminQuestion = async (q: Question, persistToFirestore = true) => {
    const safeAnswerStatus: AnswerVerificationStatus =
      q.sourceType === 'AI_GENERATED'
        ? 'needs_verification'
        : q.answerStatus || (q.isVerified === false ? 'unofficial' : 'official');
    const safeQuestion: Question = {
      ...q,
      answerStatus: safeAnswerStatus,
      isVerified: q.sourceType === 'AI_GENERATED' ? false : Boolean(q.isVerified ?? true),
      isPublished: q.isPublished !== false,
    };
    setState((prev) => ({ ...prev, customQuestions: [safeQuestion, ...prev.customQuestions] }));

    if (persistToFirestore && isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'questions', safeQuestion.id), {
          id: safeQuestion.id,
          ...(safeQuestion.questionNumber !== undefined
            ? { questionNumber: safeQuestion.questionNumber }
            : {}),
          subject: safeQuestion.subject,
          topic: safeQuestion.topic,
          year: safeQuestion.year,
          ...(safeQuestion.examDate ? { examDate: safeQuestion.examDate.slice(0, 32) } : {}),
          shift: safeQuestion.shift,
          tier: safeQuestion.tier,
          difficulty: safeQuestion.difficulty,
          sourceType: safeQuestion.sourceType,
          sourceLabel: safeQuestion.sourceLabel.slice(0, 160),
          answerStatus: safeAnswerStatus,
          isVerified: safeQuestion.isVerified,
          isPublished: safeQuestion.isPublished,
          questionEn: safeQuestion.questionEn.slice(0, 1200),
          ...(safeQuestion.questionHi ? { questionHi: safeQuestion.questionHi.slice(0, 1200) } : {}),
          optionsEn: safeQuestion.optionsEn,
          correctIndex: safeQuestion.correctIndex,
          explanations: safeQuestion.explanations,
          ...(safeQuestion.stepByStep && safeQuestion.stepByStep.length > 0
            ? { stepByStep: safeQuestion.stepByStep.slice(0, 20) }
            : {}),
          ...(safeQuestion.shortcutMethod
            ? { shortcutMethod: safeQuestion.shortcutMethod.slice(0, 600) }
            : {}),
          ...(safeQuestion.sourceUrls ? { sourceUrls: safeQuestion.sourceUrls } : {}),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `questions/${safeQuestion.id}`);
      }
    }
  };

  const updateAdminQuestion = async (id: string, patch: Partial<Question>) => {
    setState((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
    setRemoteQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'questions', id), patch as Record<string, unknown>);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `questions/${id}`);
      }
    }
  };

  const deleteAdminQuestion = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((q) => q.id !== id),
    }));
    setRemoteQuestions((prev) => prev.filter((q) => q.id !== id));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'questions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `questions/${id}`);
      }
    }
  };

  const importAdminQuestions = async (qs: Question[]) => {
    for (const q of qs) {
      await addAdminQuestion(q, true);
    }
  };

  const addAdminVideo = async (v: VideoLesson) => {
    const safeVideo: VideoLesson = { ...v, isPublished: v.isPublished !== false };
    setState((prev) => ({ ...prev, customVideos: [safeVideo, ...prev.customVideos] }));
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'videoLessons', safeVideo.id), {
          id: safeVideo.id,
          title: safeVideo.title.slice(0, 160),
          subject: safeVideo.subject,
          topic: safeVideo.topic.slice(0, 80),
          playlist: safeVideo.playlist,
          durationSec: safeVideo.durationSec,
          instructor: safeVideo.instructor,
          ...(safeVideo.videoUrl ? { videoUrl: safeVideo.videoUrl.slice(0, 500) } : {}),
          isPublished: safeVideo.isPublished,
          summary: safeVideo.summary,
          steps: safeVideo.steps,
          relatedQuestionIds: safeVideo.relatedQuestionIds,
        });
        await setDoc(doc(db, 'lessons', safeVideo.id), {
          lessonId: safeVideo.id,
          courseId: safeVideo.courseId || `course-${safeVideo.subject}`,
          subjectId: safeVideo.subject,
          title: safeVideo.title.slice(0, 160),
          description: safeVideo.summary.en.slice(0, 1000),
          ...(safeVideo.videoUrl ? { videoUrl: safeVideo.videoUrl.slice(0, 500) } : {}),
          duration: safeVideo.durationSec,
          lessonOrder: safeVideo.lessonOrder ?? 1,
          isPublished: safeVideo.isPublished,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `videoLessons/${safeVideo.id}`);
      }
    }
  };

  const toggleVideoPublished = async (id: string, isPublished: boolean) => {
    setState((prev) => ({
      ...prev,
      customVideos: prev.customVideos.map((v) => (v.id === id ? { ...v, isPublished } : v)),
    }));
    setRemoteVideos((prev) => prev.map((v) => (v.id === id ? { ...v, isPublished } : v)));
    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'videoLessons', id), { isPublished });
        await updateDoc(doc(db, 'lessons', id), { isPublished }).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `videoLessons/${id}`);
      }
    }
  };

  const deleteAdminVideo = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customVideos: prev.customVideos.filter((v) => v.id !== id),
    }));
    setRemoteVideos((prev) => prev.filter((v) => v.id !== id));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'videoLessons', id));
        await deleteDoc(doc(db, 'lessons', id)).catch(() => {});
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `videoLessons/${id}`);
      }
    }
  };

  const addAdminCourse = async (c: CourseDef) => {
    setState((prev) => ({ ...prev, customCourses: [c, ...prev.customCourses] }));
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'courses', c.courseId), c);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `courses/${c.courseId}`);
      }
    }
  };

  const updateAdminCourse = async (courseId: string, patch: Partial<CourseDef>) => {
    setState((prev) => ({
      ...prev,
      customCourses: prev.customCourses.map((c) => (c.courseId === courseId ? { ...c, ...patch } : c)),
    }));
    setRemoteCourses((prev) =>
      prev.map((c) => (c.courseId === courseId ? { ...c, ...patch } : c))
    );
    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'courses', courseId), patch as Record<string, unknown>);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
      }
    }
  };

  const deleteAdminCourse = async (courseId: string) => {
    setState((prev) => ({
      ...prev,
      customCourses: prev.customCourses.filter((c) => c.courseId !== courseId),
    }));
    setRemoteCourses((prev) => prev.filter((c) => c.courseId !== courseId));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
      }
    }
  };

  const addAdminMockTest = async (mt: MockTestConfig) => {
    const safeMt: MockTestConfig = { ...mt, isPublished: mt.isPublished !== false };
    setState((prev) => ({ ...prev, customMockTests: [safeMt, ...prev.customMockTests] }));
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'mockTests', safeMt.id), {
          testId: safeMt.id,
          title: safeMt.title.slice(0, 180),
          category: safeMt.category,
          subjectIds: safeMt.subjectIds || ['quant', 'reasoning', 'english', 'ga'],
          questionIds: safeMt.questionIds,
          durationMinutes: safeMt.durationMinutes,
          totalQuestions: safeMt.questionIds.length,
          totalMarks: safeMt.totalMarks,
          marksPerCorrect: safeMt.marksPerCorrect,
          negativeMarking: safeMt.negativeMarking,
          description: safeMt.description.slice(0, 600),
          isPublished: safeMt.isPublished,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `mockTests/${safeMt.id}`);
      }
    }
  };

  const toggleMockTestPublished = async (id: string, isPublished: boolean) => {
    setState((prev) => ({
      ...prev,
      customMockTests: prev.customMockTests.map((m) => (m.id === id ? { ...m, isPublished } : m)),
    }));
    setRemoteMockTests((prev) => prev.map((m) => (m.id === id ? { ...m, isPublished } : m)));
    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'mockTests', id), { isPublished });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `mockTests/${id}`);
      }
    }
  };

  const deleteAdminMockTest = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customMockTests: prev.customMockTests.filter((m) => m.id !== id),
    }));
    setRemoteMockTests((prev) => prev.filter((m) => m.id !== id));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'mockTests', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `mockTests/${id}`);
      }
    }
  };

  const addAnnouncement = async (title: string, body: string) => {
    const ann: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      body,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, announcements: [ann, ...prev.announcements] }));
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'announcements', ann.id), {
          title: ann.title.slice(0, 140),
          body: ann.body.slice(0, 1000),
          createdAt: ann.createdAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `announcements/${ann.id}`);
      }
    }
  };

  const seedFirestoreDatabase = async () => {
    if (!isVerifiedCloudAdmin) {
      throw new Error('Verified Admin authentication required to seed Firestore.');
    }
    const batch = writeBatch(db);
    let count = 0;

    SUBJECTS_SEED.forEach((s) => {
      batch.set(doc(db, 'subjects', s.subjectId), s, { merge: true });
      count++;
    });

    COURSES_SEED.forEach((c) => {
      batch.set(doc(db, 'courses', c.courseId), c, { merge: true });
      count++;
    });

    VIDEO_LESSONS.forEach((v, idx) => {
      batch.set(
        doc(db, 'videoLessons', v.id),
        { ...v, isPublished: true },
        { merge: true }
      );
      batch.set(
        doc(db, 'lessons', v.id),
        {
          lessonId: v.id,
          courseId: v.courseId || `course-${v.subject}`,
          subjectId: v.subject,
          title: v.title,
          description: v.summary.en,
          duration: v.durationSec,
          lessonOrder: idx + 1,
          isPublished: true,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      count += 2;
    });

    QUESTIONS_BANK.forEach((q) => {
      const safeStatus: AnswerVerificationStatus =
        q.sourceType === 'AI_GENERATED'
          ? 'needs_verification'
          : q.answerStatus || 'official';
      batch.set(
        doc(db, 'questions', q.id),
        {
          id: q.id,
          ...(q.questionNumber !== undefined ? { questionNumber: q.questionNumber } : {}),
          subject: q.subject,
          topic: q.topic,
          year: q.year,
          ...(q.examDate ? { examDate: q.examDate } : {}),
          shift: q.shift,
          tier: q.tier,
          difficulty: q.difficulty,
          sourceType: q.sourceType,
          sourceLabel: q.sourceLabel,
          answerStatus: safeStatus,
          isVerified: q.sourceType === 'AI_GENERATED' ? false : Boolean(q.isVerified ?? true),
          isPublished: true,
          questionEn: q.questionEn,
          ...(q.questionHi ? { questionHi: q.questionHi } : {}),
          optionsEn: q.optionsEn,
          correctIndex: q.correctIndex,
          explanations: q.explanations,
          ...(q.stepByStep ? { stepByStep: q.stepByStep } : {}),
          ...(q.shortcutMethod ? { shortcutMethod: q.shortcutMethod } : {}),
          ...(q.sourceUrls ? { sourceUrls: q.sourceUrls } : {}),
        },
        { merge: true }
      );
      count++;
    });

    MOCK_TESTS.forEach((mt) => {
      batch.set(
        doc(db, 'mockTests', mt.id),
        {
          testId: mt.id,
          title: mt.title,
          category: mt.category,
          subjectIds: mt.subjectIds || ['quant', 'reasoning', 'english', 'ga'],
          questionIds: mt.questionIds,
          durationMinutes: mt.durationMinutes,
          totalQuestions: mt.questionIds.length,
          totalMarks: mt.totalMarks,
          marksPerCorrect: mt.marksPerCorrect,
          negativeMarking: mt.negativeMarking,
          description: mt.description,
          isPublished: true,
        },
        { merge: true }
      );
      count++;
    });

    OCEAN_MISSIONS_SEED.forEach((m) => {
      batch.set(
        doc(db, 'oceanQuestMissions', m.missionId),
        {
          ...m,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      count++;
    });

    await batch.commit();
    await loadPublicCollections(true);
    showToast(`Seeded ${count} Firestore Docs`, 50, 25);
    return { seededDocs: count };
  };

  const toggleStudentActive = async (uid: string, nextActive: boolean) => {
    if (!isVerifiedCloudAdmin) {
      throw new Error('Authorized admin session required.');
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive: nextActive,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const oceanQuestMissions = useMemo(() => {
    const map = new Map<string, OceanQuestMission>();
    [...OCEAN_MISSIONS_SEED, ...remoteOceanMissions, ...state.customOceanMissions].forEach((m) => {
      map.set(m.missionId, m);
    });
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [remoteOceanMissions, state.customOceanMissions]);

  const evaluateOceanQuestRun = async ({
    mission,
    correctCount,
    totalQuestions,
    timeRemainingSec,
    hintsUsed,
    comboMax,
    attemptedQuestionIds,
    wrongQuestionIds,
    subjectBreakdown,
  }: {
    mission: OceanQuestMission;
    correctCount: number;
    totalQuestions: number;
    timeRemainingSec: number;
    hintsUsed: number;
    comboMax: number;
    attemptedQuestionIds: string[];
    wrongQuestionIds: string[];
    subjectBreakdown: Partial<Record<SubjectId, { attempted: number; correct: number }>>;
  }): Promise<OceanQuestEvalResponse> => {
    const uid = auth.currentUser?.uid || state.profile.uid || 'guest';
    const todayKey = new Date().toISOString().slice(0, 10);

    let evalResult: OceanQuestEvalResponse;
    try {
      const resp = await fetch('/api/ocean-quest/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          missionId: mission.missionId,
          correctCount,
          totalQuestions,
          timeRemainingSec,
          hintsUsed,
          comboMax,
          missionConfig: {
            mode: mission.mode,
            minAccuracyPct: mission.minAccuracyPct,
            xpReward: mission.xpReward,
            coinReward: mission.coinReward,
            crystalReward: mission.crystalReward,
            badgeId: mission.badgeId,
            timeLimitSec: mission.timeLimitSec,
          },
        }),
      });
      if (!resp.ok) throw new Error('Eval endpoint failed');
      evalResult = (await resp.json()) as OceanQuestEvalResponse;
    } catch {
      const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
      const passed = accuracy >= mission.minAccuracyPct;
      const stars = !passed ? 0 : accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : 1;
      const alreadyCompleted = state.oceanQuestProgress.completedMissions.includes(mission.missionId);
      const isDaily = mission.mode === 'daily-challenge';
      const dailyDone = state.oceanQuestProgress.dailyCompletions.includes(todayKey);
      const grantBonus = passed && (isDaily ? !dailyDone : !alreadyCompleted);
      evalResult = {
        missionId: mission.missionId,
        passed,
        accuracy,
        stars,
        score: correctCount * 100 + comboMax * 25,
        xpEarned: grantBonus ? mission.xpReward : passed ? Math.min(60, correctCount * 6) : Math.min(25, correctCount * 4),
        coinsEarned: grantBonus ? mission.coinReward : passed ? Math.min(25, correctCount * 3) : Math.min(10, correctCount * 2),
        crystalsEarned: grantBonus ? mission.crystalReward : 0,
        isFirstClearClaim: grantBonus && !isDaily,
        alreadyClaimedDaily: isDaily && dailyDone,
        unlockedBadgeId: grantBonus ? mission.badgeId : undefined,
        claimType: isDaily ? 'daily-challenge' : 'first-clear',
      };
    }

    // Double-check immutable Firestore claim doc when signed in so client state never awards duplicate first-clear/daily bonus
    if (auth.currentUser && auth.currentUser.emailVerified && evalResult.passed && evalResult.claimId) {
      const claimRef = doc(db, 'oceanQuestClaims', evalResult.claimId);
      try {
        const existingClaimSnap = await getDoc(claimRef);
        if (existingClaimSnap.exists()) {
          evalResult = {
            ...evalResult,
            xpEarned: Math.min(60, correctCount * 6),
            coinsEarned: Math.min(25, correctCount * 3),
            crystalsEarned: 0,
            isFirstClearClaim: false,
            alreadyClaimedDaily: evalResult.claimType === 'daily-challenge',
          };
        } else {
          await setDoc(claimRef, {
            claimId: evalResult.claimId,
            userId: auth.currentUser.uid,
            missionId: mission.missionId,
            claimType: evalResult.claimType || 'first-clear',
            xpEarned: Math.min(600, evalResult.xpEarned),
            coinsEarned: Math.min(300, evalResult.coinsEarned),
            crystalsEarned: Math.min(100, evalResult.crystalsEarned),
            accuracy: evalResult.accuracy,
            claimedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Claim verification warning:', err);
      }
    }

    const nowIso = new Date().toISOString();
    let updatedOceanProg!: OceanQuestProgress;
    let updatedProfileSnapshot!: UserProfile;
    let updatedRevisionIds: string[] = [];

    setState((prev) => {
      const prevOq = prev.oceanQuestProgress;
      const completedMissions = evalResult.passed
        ? Array.from(new Set([...prevOq.completedMissions, mission.missionId]))
        : prevOq.completedMissions;

      const bestScores = { ...prevOq.missionBestScores };
      bestScores[mission.missionId] = Math.max(bestScores[mission.missionId] || 0, evalResult.score);

      const starsMap = { ...prevOq.missionStars };
      starsMap[mission.missionId] = Math.max(starsMap[mission.missionId] || 0, evalResult.stars);

      const seenQuestionIds = Array.from(
        new Set([...prevOq.seenQuestionIds, ...attemptedQuestionIds])
      ).slice(-1500);

      // Remove mastered questions from wrongQuestionIds, add missed ones
      const wrongSet = new Set(prevOq.wrongQuestionIds);
      attemptedQuestionIds.forEach((qid) => {
        if (!wrongQuestionIds.includes(qid)) wrongSet.delete(qid);
      });
      wrongQuestionIds.forEach((qid) => wrongSet.add(qid));
      const nextWrongIds = Array.from(wrongSet).slice(0, 800);

      updatedRevisionIds = Array.from(new Set([...prev.revisionListIds, ...wrongQuestionIds])).slice(0, 1000);

      const questBadges = evalResult.unlockedBadgeId
        ? Array.from(new Set([...prevOq.questBadges, evalResult.unlockedBadgeId]))
        : prevOq.questBadges;

      const dailyCompletions =
        evalResult.passed && mission.mode === 'daily-challenge'
          ? Array.from(new Set([...prevOq.dailyCompletions, todayKey]))
          : prevOq.dailyCompletions;

      const draftProgress: OceanQuestProgress = {
        ...prevOq,
        uid: prev.profile.uid,
        completedMissions,
        missionBestScores: bestScores,
        missionStars: starsMap,
        seenQuestionIds,
        wrongQuestionIds: nextWrongIds,
        crystals: prevOq.crystals + evalResult.crystalsEarned,
        totalQuestXp: prevOq.totalQuestXp + evalResult.xpEarned,
        questBadges,
        dailyCompletions,
        totalRuns: prevOq.totalRuns + 1,
        totalCorrect: prevOq.totalCorrect + correctCount,
        totalAttempted: prevOq.totalAttempted + totalQuestions,
        updatedAt: nowIso,
      };

      // Recompute unlocked locations deterministically from completed missions
      const unlockedLocs = new Set(draftProgress.unlockedLocations);
      OCEAN_LOCATIONS.forEach((loc) => {
        if (getLocationUnlockStatus(loc.locationId, draftProgress, oceanQuestMissions).unlocked) {
          unlockedLocs.add(loc.locationId);
        }
      });
      draftProgress.unlockedLocations = Array.from(unlockedLocs);
      updatedOceanProg = draftProgress;

      const nextSubjectStats = { ...prev.profile.subjectStats };
      (Object.keys(subjectBreakdown) as SubjectId[]).forEach((sub) => {
        const inc = subjectBreakdown[sub];
        if (inc && inc.attempted > 0) {
          const cur = nextSubjectStats[sub] || { attempted: 0, correct: 0 };
          nextSubjectStats[sub] = {
            attempted: cur.attempted + inc.attempted,
            correct: cur.correct + inc.correct,
          };
        }
      });

      const mergedBadges = new Set([...prev.profile.earnedBadges, ...questBadges]);
      const nextProfile: UserProfile = {
        ...prev.profile,
        xp: prev.profile.xp + evalResult.xpEarned,
        coins: prev.profile.coins + evalResult.coinsEarned,
        questionsAttempted: prev.profile.questionsAttempted + totalQuestions,
        questionsCorrect: prev.profile.questionsCorrect + correctCount,
        studyMinutesToday: prev.profile.studyMinutesToday + Math.max(3, Math.round(totalQuestions * 0.8)),
        subjectStats: nextSubjectStats,
        dailyChallengeDoneDate:
          evalResult.passed && mission.mode === 'daily-challenge'
            ? todayKey
            : prev.profile.dailyChallengeDoneDate,
        earnedBadges: Array.from(mergedBadges),
      };
      nextProfile.earnedBadges = evaluateBadges(nextProfile);
      updatedProfileSnapshot = nextProfile;

      const session: GameSession = {
        id: `oq-${Date.now()}`,
        gameMode: 'ocean-quest',
        gameTitle: `Ocean Quest: ${mission.title}`,
        score: evalResult.score,
        xpEarned: evalResult.xpEarned,
        coinsEarned: evalResult.coinsEarned,
        accuracy: evalResult.accuracy,
        comboMax,
        createdAt: nowIso,
      };

      return {
        ...prev,
        profile: nextProfile,
        oceanQuestProgress: draftProgress,
        revisionListIds: updatedRevisionIds,
        gameSessions: [session, ...prev.gameSessions].slice(0, 40),
      };
    });

    showToast(
      evalResult.passed ? `${mission.title} Cleared!` : `${mission.title} · Practice Logged`,
      evalResult.xpEarned,
      evalResult.coinsEarned
    );

    if (auth.currentUser && auth.currentUser.emailVerified) {
      const fUid = auth.currentUser.uid;
      await syncUserToFirestore(updatedProfileSnapshot);
      await syncUserProgressToFirestore(updatedProfileSnapshot, {
        revisionListIds: updatedRevisionIds,
      });
      await setDoc(doc(db, 'oceanQuestProgress', fUid), {
        ...updatedOceanProg,
        uid: fUid,
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `oceanQuestProgress/${fUid}`));

      const gsId = `oq-${Date.now()}`;
      await setDoc(doc(db, 'gameSessions', gsId), {
        userId: fUid,
        gameMode: 'ocean-quest',
        score: Math.round(evalResult.score),
        xpEarned: Math.round(evalResult.xpEarned),
        coinsEarned: Math.round(evalResult.coinsEarned),
        accuracy: Math.round(evalResult.accuracy),
        createdAt: nowIso,
      }).catch(() => {});

      await setDoc(doc(db, 'gameScores', gsId), {
        userId: fUid,
        gameId: 'ocean-quest',
        gameTitle: `Ocean Quest: ${mission.title}`.slice(0, 120),
        score: Math.round(evalResult.score),
        xpEarned: Math.round(evalResult.xpEarned),
        coinsEarned: Math.round(evalResult.coinsEarned),
        accuracy: Math.round(evalResult.accuracy),
        completedAt: nowIso,
      }).catch(() => {});
    }

    return evalResult;
  };

  const upsertOceanQuestMission = async (mission: OceanQuestMission) => {
    const clean: OceanQuestMission = {
      ...mission,
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => {
      const filtered = prev.customOceanMissions.filter((m) => m.missionId !== clean.missionId);
      return { ...prev, customOceanMissions: [clean, ...filtered] };
    });
    setRemoteOceanMissions((prev) => {
      const filtered = prev.filter((m) => m.missionId !== clean.missionId);
      return [...filtered, clean].sort((a, b) => a.order - b.order);
    });
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'oceanQuestMissions', clean.missionId), clean, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `oceanQuestMissions/${clean.missionId}`);
      }
    }
  };

  const toggleOceanQuestMissionPublished = async (missionId: string, isPublished: boolean) => {
    setState((prev) => ({
      ...prev,
      customOceanMissions: prev.customOceanMissions.map((m) =>
        m.missionId === missionId ? { ...m, isPublished } : m
      ),
    }));
    setRemoteOceanMissions((prev) =>
      prev.map((m) => (m.missionId === missionId ? { ...m, isPublished } : m))
    );
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'oceanQuestMissions', missionId), { isPublished, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `oceanQuestMissions/${missionId}`);
      }
    }
  };

  const deleteOceanQuestMission = async (missionId: string) => {
    setState((prev) => ({
      ...prev,
      customOceanMissions: prev.customOceanMissions.filter((m) => m.missionId !== missionId),
    }));
    setRemoteOceanMissions((prev) => prev.filter((m) => m.missionId !== missionId));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'oceanQuestMissions', missionId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `oceanQuestMissions/${missionId}`);
      }
    }
  };

  const fetchAdminAnalytics = async () => {
    if (!isVerifiedCloudAdmin) {
      return { students: [], attempts: [], gameSessions: [], oceanProgress: [] };
    }
    try {
      const [usersSnap, attemptsSnap, gamesSnap, oqSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(200))),
        getDocs(query(collection(db, 'testAttempts'), limit(250))),
        getDocs(query(collection(db, 'gameSessions'), limit(200))).catch(() => null),
        getDocs(query(collection(db, 'oceanQuestProgress'), limit(200))).catch(() => null),
      ]);
      const students: AdminStudentSummary[] = [];
      usersSnap.forEach((d) => {
        const dt = d.data();
        const defStats = {
          quant: { attempted: 0, correct: 0 },
          reasoning: { attempted: 0, correct: 0 },
          english: { attempted: 0, correct: 0 },
          ga: { attempted: 0, correct: 0 },
          computer: { attempted: 0, correct: 0 },
        };
        students.push({
          uid: String(dt.uid || d.id),
          username: String(dt.username || dt.usernameLower || (dt.email ? String(dt.email).split('@')[0] : d.id.slice(0, 8))),
          displayName: String(dt.displayName || dt.fullName || 'Student'),
          email: String(dt.email || ''),
          xp: Number(dt.xp || 0),
          streak: Number(dt.streak || 0),
          level: String(dt.level || 'Beginner'),
          role: String(dt.role || 'student'),
          isActive: dt.isActive !== false,
          preferredLanguage: String(dt.preferredLanguage || 'en'),
          mockTestsCompleted: Number(dt.mockTestsCompleted || 0),
          completedLessonsCount: Array.isArray(dt.completedLessons) ? dt.completedLessons.length : 0,
          studyMinutesToday: Math.round(Number(dt.totalStudyHours || 0) * 60),
          questionsAttempted: Number(dt.questionsAttempted || 0),
          questionsCorrect: Number(dt.questionsCorrect || 0),
          subjectStats: dt.subjectStats || defStats,
          createdAt: String(dt.createdAt || dt.updatedAt || ''),
          lastLogin: String(dt.lastLogin || dt.updatedAt || ''),
        });
      });

      const attempts: TestAttempt[] = [];
      attemptsSnap.forEach((d) => {
        const dt = d.data();
        attempts.push({
          id: `${dt.userId || ''}:${d.id}`,
          testId: String(dt.testId || ''),
          testTitle: String(dt.testTitle || ''),
          score: Number(dt.score || 0),
          maxScore: Number(dt.maxScore || 0),
          correctCount: Number(dt.correctCount || 0),
          wrongCount: Number(dt.wrongCount || 0),
          unattemptedCount: Number(dt.unattemptedCount || 0),
          accuracy: Number(dt.accuracy || 0),
          timeTakenSec: Number(dt.timeTakenSec || 0),
          subjectBreakdown: dt.subjectBreakdown || {
            quant: { correct: 0, total: 0 },
            reasoning: { correct: 0, total: 0 },
            english: { correct: 0, total: 0 },
            ga: { correct: 0, total: 0 },
            computer: { correct: 0, total: 0 },
          },
          createdAt: String(dt.createdAt || dt.submittedAt || ''),
        });
      });

      const gameSessions: GameSession[] = [];
      gamesSnap?.forEach((d) => {
        const dt = d.data();
        gameSessions.push({
          id: `${dt.userId || ''}:${d.id}`,
          gameMode: (dt.gameMode as GameModeId) || 'quiz-battle',
          gameTitle: String(dt.gameMode || 'Arena'),
          score: Number(dt.score || 0),
          xpEarned: Number(dt.xpEarned || 0),
          coinsEarned: Number(dt.coinsEarned || 0),
          accuracy: Number(dt.accuracy || 0),
          comboMax: 0,
          createdAt: String(dt.createdAt || ''),
        });
      });

      const oceanProgress: OceanQuestProgress[] = [];
      oqSnap?.forEach((d) => {
        const od = d.data();
        oceanProgress.push({
          uid: String(od.uid || d.id),
          unlockedLocations: Array.isArray(od.unlockedLocations) ? od.unlockedLocations.map(String) : ['coral-bay'],
          completedMissions: Array.isArray(od.completedMissions) ? od.completedMissions.map(String) : [],
          missionBestScores: od.missionBestScores || {},
          missionStars: od.missionStars || {},
          seenQuestionIds: Array.isArray(od.seenQuestionIds) ? od.seenQuestionIds.map(String) : [],
          wrongQuestionIds: Array.isArray(od.wrongQuestionIds) ? od.wrongQuestionIds.map(String) : [],
          crystals: Number(od.crystals || 0),
          totalQuestXp: Number(od.totalQuestXp || 0),
          questBadges: Array.isArray(od.questBadges) ? od.questBadges.map(String) : [],
          dailyCompletions: Array.isArray(od.dailyCompletions) ? od.dailyCompletions.map(String) : [],
          totalRuns: Number(od.totalRuns || 0),
          totalCorrect: Number(od.totalCorrect || 0),
          totalAttempted: Number(od.totalAttempted || 0),
          updatedAt: String(od.updatedAt || ''),
        });
      });

      return { students, attempts, gameSessions, oceanProgress };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  };

  const predictorQuestions = useMemo(() => {
    const map = new Map<string, PredictorQuestion>();
    [...remotePredictorQuestions, ...(state.customPredictorQuestions || [])].forEach((pq) => {
      map.set(pq.id, pq);
    });
    return Array.from(map.values()).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, [remotePredictorQuestions, state.customPredictorQuestions]);

  const predictorCategories = useMemo(() => {
    const map = new Map<string, PredictorCategoryOverride>();
    [...remotePredictorCategories, ...(state.customPredictorCategories || [])].forEach((pc) => {
      map.set(pc.id, pc);
    });
    return Array.from(map.values());
  }, [remotePredictorCategories, state.customPredictorCategories]);

  const predictionReports = useMemo(() => {
    const map = new Map<string, PredictionAccuracyReport>();
    [
      ...HISTORICAL_ACCURACY_BENCHMARK_SEED,
      ...remotePredictionReports,
      ...(state.customPredictionReports || []),
    ].forEach((pr) => {
      map.set(pr.id, pr);
    });
    return Array.from(map.values()).sort((a, b) => b.examYear - a.examYear);
  }, [remotePredictionReports, state.customPredictionReports]);

  const currentAffairs = useMemo(() => {
    const map = new Map<string, CurrentAffairsItem>();
    [
      ...CURATED_CURRENT_AFFAIRS_SEED,
      ...remoteCurrentAffairs,
      ...(state.customCurrentAffairs || []),
    ].forEach((ca) => {
      map.set(ca.id, ca);
    });
    return Array.from(map.values()).sort((a, b) =>
      (b.publishedDate || '').localeCompare(a.publishedDate || '')
    );
  }, [remoteCurrentAffairs, state.customCurrentAffairs]);

  const savePredictorQuestion = async (q: PredictorQuestion) => {
    const safeQuestion: PredictorQuestion = {
      ...q,
      sourceType: 'AI_GENERATED',
      isOfficialPyq: false,
      aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
      reviewStatus: isVerifiedCloudAdmin ? q.reviewStatus : 'pending',
      isPublished: isVerifiedCloudAdmin ? q.isPublished : false,
      createdByUid: auth.currentUser?.uid || state.profile.uid,
      createdAt: q.createdAt || new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customPredictorQuestions: [
        safeQuestion,
        ...(prev.customPredictorQuestions || []).filter((item) => item.id !== safeQuestion.id),
      ].slice(0, 120),
    }));
    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'predictorQuestions', safeQuestion.id), {
          questionId: safeQuestion.id,
          examYear: safeQuestion.examYear,
          tier: safeQuestion.tier,
          subject: safeQuestion.subject,
          topic: safeQuestion.topic.slice(0, 100),
          difficulty: safeQuestion.difficulty,
          questionEn: safeQuestion.questionEn.slice(0, 1400),
          optionsEn: safeQuestion.optionsEn,
          correctIndex: safeQuestion.correctIndex,
          explanation: safeQuestion.explanation.slice(0, 2000),
          stepByStep: safeQuestion.stepByStep.slice(0, 10),
          usefulnessReason: safeQuestion.usefulnessReason.slice(0, 500),
          sourceType: 'AI_GENERATED',
          isOfficialPyq: false,
          aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
          reviewStatus: safeQuestion.reviewStatus,
          isPublished: safeQuestion.isPublished,
          createdByUid: auth.currentUser.uid,
          createdAt: safeQuestion.createdAt,
        });
      } catch (err) {
        console.warn('Could not persist predictor question draft:', err);
      }
    }
  };

  const reviewPredictorQuestion = async (
    id: string,
    status: PredictorReviewStatus,
    patch?: Partial<PredictorQuestion>
  ) => {
    const nowIso = new Date().toISOString();
    const isPublished = status === 'approved';
    const applyPatch = (item: PredictorQuestion): PredictorQuestion =>
      item.id === id
        ? {
            ...item,
            ...(patch || {}),
            reviewStatus: status,
            isPublished,
            isOfficialPyq: false,
            sourceType: 'AI_GENERATED',
            aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
            reviewedAt: nowIso,
          }
        : item;

    setState((prev) => ({
      ...prev,
      customPredictorQuestions: (prev.customPredictorQuestions || []).map(applyPatch),
    }));
    setRemotePredictorQuestions((prev) => prev.map(applyPatch));

    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'predictorQuestions', id), {
          ...(patch || {}),
          reviewStatus: status,
          isPublished,
          isOfficialPyq: false,
          sourceType: 'AI_GENERATED',
          aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
          reviewedAt: nowIso,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `predictorQuestions/${id}`);
      }
    }
  };

  const deletePredictorQuestion = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customPredictorQuestions: (prev.customPredictorQuestions || []).filter((p) => p.id !== id),
    }));
    setRemotePredictorQuestions((prev) => prev.filter((p) => p.id !== id));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'predictorQuestions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `predictorQuestions/${id}`);
      }
    }
  };

  const upsertPredictorCategory = async (cat: PredictorCategoryOverride) => {
    const clean: PredictorCategoryOverride = {
      ...cat,
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customPredictorCategories: [
        clean,
        ...(prev.customPredictorCategories || []).filter((c) => c.id !== clean.id),
      ],
    }));
    setRemotePredictorCategories((prev) => [
      clean,
      ...prev.filter((c) => c.id !== clean.id),
    ]);
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(
          doc(db, 'predictorCategories', clean.id),
          {
            categoryId: clean.id,
            topic: clean.topic.slice(0, 100),
            subject: clean.subject,
            tier: clean.tier,
            targetYear: clean.targetYear,
            ...(clean.priorityOverride ? { priorityOverride: clean.priorityOverride } : {}),
            isOutdated: Boolean(clean.isOutdated),
            ...(clean.outdatedNote ? { outdatedNote: clean.outdatedNote.slice(0, 300) } : {}),
            updatedAt: clean.updatedAt,
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `predictorCategories/${clean.id}`);
      }
    }
  };

  const savePredictionReport = async (report: PredictionAccuracyReport) => {
    setState((prev) => ({
      ...prev,
      customPredictionReports: [
        report,
        ...(prev.customPredictionReports || []).filter((r) => r.id !== report.id),
      ],
    }));
    setRemotePredictionReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'predictionReports', report.id), {
          reportId: report.id,
          examYear: report.examYear,
          tier: report.tier,
          title: report.title.slice(0, 180),
          predictedTopics: report.predictedTopics.slice(0, 40),
          actualTopics: report.actualTopics.slice(0, 40),
          matchedTopics: report.matchedTopics.slice(0, 40),
          missedTopics: report.missedTopics.slice(0, 40),
          coveragePct: report.coveragePct,
          notes: report.notes.slice(0, 1000),
          isOutdated: Boolean(report.isOutdated),
          createdAt: report.createdAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `predictionReports/${report.id}`);
      }
    }
  };

  const togglePredictionReportOutdated = async (id: string, isOutdated: boolean) => {
    setState((prev) => ({
      ...prev,
      customPredictionReports: (prev.customPredictionReports || []).map((r) =>
        r.id === id ? { ...r, isOutdated } : r
      ),
    }));
    setRemotePredictionReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isOutdated } : r))
    );
    if (isVerifiedCloudAdmin) {
      try {
        await updateDoc(doc(db, 'predictionReports', id), { isOutdated });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `predictionReports/${id}`);
      }
    }
  };

  const upsertCurrentAffairsItem = async (item: CurrentAffairsItem) => {
    const clean: CurrentAffairsItem = {
      ...item,
      isPublished: item.isPublished !== false,
      createdAt: item.createdAt || new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customCurrentAffairs: [
        clean,
        ...(prev.customCurrentAffairs || []).filter((a) => a.id !== clean.id),
      ],
    }));
    setRemoteCurrentAffairs((prev) => [clean, ...prev.filter((a) => a.id !== clean.id)]);
    if (isVerifiedCloudAdmin) {
      try {
        await setDoc(doc(db, 'currentAffairs', clean.id), {
          articleId: clean.id,
          category: clean.category,
          title: clean.title.slice(0, 200),
          summary: clean.summary.slice(0, 1500),
          examRelevance: clean.examRelevance.slice(0, 500),
          publishedDate: clean.publishedDate.slice(0, 32),
          sourceName: clean.sourceName.slice(0, 120),
          sourceUrl: clean.sourceUrl.slice(0, 500),
          targetYear: clean.targetYear,
          isPublished: clean.isPublished,
          createdAt: clean.createdAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `currentAffairs/${clean.id}`);
      }
    }
  };

  const deleteCurrentAffairsItem = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customCurrentAffairs: (prev.customCurrentAffairs || []).filter((a) => a.id !== id),
    }));
    setRemoteCurrentAffairs((prev) => prev.filter((a) => a.id !== id));
    if (isVerifiedCloudAdmin) {
      try {
        await deleteDoc(doc(db, 'currentAffairs', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `currentAffairs/${id}`);
      }
    }
  };

  const questions = useMemo(() => {
    const map = new Map<string, Question>();
    [...QUESTIONS_BANK, ...remoteQuestions, ...state.customQuestions].forEach((q) => {
      map.set(q.id, q);
    });
    return Array.from(map.values());
  }, [state.customQuestions, remoteQuestions]);

  const videos = useMemo(() => {
    const map = new Map<string, VideoLesson>();
    [...VIDEO_LESSONS, ...remoteVideos, ...state.customVideos].forEach((v) => {
      map.set(v.id, v);
    });
    return Array.from(map.values());
  }, [state.customVideos, remoteVideos]);

  const mockTests = useMemo(() => {
    const map = new Map<string, MockTestConfig>();
    [...MOCK_TESTS, ...remoteMockTests, ...state.customMockTests].forEach((m) => {
      map.set(m.id, m);
    });
    return Array.from(map.values());
  }, [state.customMockTests, remoteMockTests]);

  const courses = useMemo(() => {
    const map = new Map<string, CourseDef>();
    [...COURSES_SEED, ...remoteCourses, ...state.customCourses].forEach((c) => {
      map.set(c.courseId, c);
    });
    return Array.from(map.values());
  }, [state.customCourses, remoteCourses]);

  const announcements = useMemo(
    () => (remoteAnnouncements.length > 0 ? remoteAnnouncements : state.announcements),
    [remoteAnnouncements, state.announcements]
  );

  const levelInfo = useMemo(() => computeLevel(state.profile.xp), [state.profile.xp]);

  const leaderboard = useMemo(() => {
    const currentAccuracy =
      state.profile.questionsAttempted > 0
        ? Math.round((state.profile.questionsCorrect / state.profile.questionsAttempted) * 100)
        : 78;
    const currentEntry: LeaderboardEntry = {
      uid: state.profile.uid,
      displayName: `${state.profile.displayName} (You)`,
      xp: state.profile.xp,
      streak: state.profile.streak,
      level: levelInfo.current.name,
      accuracy: currentAccuracy,
      isCurrentUser: true,
    };
    const merged = [
      ...INITIAL_LEADERBOARD,
      ...remoteLeaderboard.filter((r) => r.uid !== state.profile.uid),
      currentEntry,
    ];
    const unique = new Map<string, LeaderboardEntry>();
    merged.forEach((m) => unique.set(m.uid, m));
    return Array.from(unique.values()).sort((a, b) => b.xp - a.xp);
  }, [remoteLeaderboard, state.profile, levelInfo.current.name]);

  const isAdmin = isVerifiedCloudAdmin;

  const value: AppContextValue = {
    showSplash,
    dismissSplash: () => setShowSplash(false),
    onboarded: state.onboarded,
    completeOnboarding,
    activeTab: activeTabState,
    setActiveTab,
    tutorOpen,
    openAiTutor: () => setTutorOpen(true),
    closeAiTutor: () => setTutorOpen(false),
    theme: state.theme,
    toggleTheme: () =>
      setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })),
    soundMuted: state.soundMuted,
    toggleSound: () => setState((prev) => ({ ...prev, soundMuted: !prev.soundMuted })),
    notificationPrefs: state.notificationPrefs,
    updateNotificationPrefs: (patch) =>
      setState((prev) => ({
        ...prev,
        notificationPrefs: { ...prev.notificationPrefs, ...patch },
      })),
    localReminders: state.localReminders,
    activeReminderBanner,
    dismissReminderBanner: () => setActiveReminderBanner(null),
    markAllRemindersRead: () =>
      setState((prev) => ({
        ...prev,
        localReminders: prev.localReminders.map((r) => ({ ...r, read: true })),
      })),
    triggerGoalReminder: (forceKind) => dispatchOceanReminder(forceKind, false, false),
    publicDataError,
    retryPublicLoad: loadPublicCollections,
    language: state.profile.preferredLanguage,
    setLanguage: (lang) => updateProfile({ preferredLanguage: lang }),
    firebaseUser,
    authLoading,
    signInWithGoogle,
    checkUsernameUnique,
    registerEmailAccount,
    loginEmailAccount,
    sendPasswordReset,
    resendVerification,
    checkEmailVerification,
    signOut,
    profile: state.profile,
    updateProfile,
    questions,
    videos,
    mockTests,
    courses,
    testAttempts: state.testAttempts,
    gameSessions: state.gameSessions,
    bookmarks: state.bookmarks,
    difficultQuestionIds: state.difficultQuestionIds,
    revisionListIds: state.revisionListIds,
    pyqAttempts: state.pyqAttempts,
    loadingQuestions,
    studyPlan: state.studyPlan,
    saveStudyPlan,
    chatHistory: state.chatHistory,
    setChatHistory: (updater) =>
      setState((prev) => ({
        ...prev,
        chatHistory: typeof updater === 'function' ? updater(prev.chatHistory) : updater,
      })),
    persistTutorMessage,
    clearTutorHistory,
    leaderboard,
    announcements,
    recordQuestionResult,
    recordPyqAttempt,
    toggleDifficultQuestion,
    toggleRevisionQuestion,
    recordGameSession,
    recordMockAttempt,
    updateVideoProgress,
    toggleSyllabusTopic,
    toggleBookmark,
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
    oceanQuestProgress: state.oceanQuestProgress,
    evaluateOceanQuestRun,
    upsertOceanQuestMission,
    toggleOceanQuestMissionPublished,
    deleteOceanQuestMission,
    fetchAdminAnalytics,
    predictorQuestions,
    predictorCategories,
    predictionReports,
    currentAffairs,
    savePredictorQuestion,
    reviewPredictorQuestion,
    deletePredictorQuestion,
    upsertPredictorCategory,
    savePredictionReport,
    togglePredictionReportOutdated,
    upsertCurrentAffairsItem,
    deleteCurrentAffairsItem,
    tutorPrefill,
    openTutorWithPrompt: (prompt) => {
      setTutorPrefill(prompt);
      setTutorOpen(true);
    },
    clearTutorPrefill: () => setTutorPrefill(null),
    rewardToast,
    dismissToast: () => setRewardToast(null),
    levelInfo,
    isAdmin,
    isVerifiedCloudAdmin,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export { BADGES };
