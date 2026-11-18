export type LanguageCode = 'en' | 'ml' | 'hi' | 'ta';

export type SubjectId =
  | 'quant'
  | 'reasoning'
  | 'english'
  | 'ga'
  | 'computer';

export type MainTab =
  | 'home'
  | 'learn'
  | 'practice'
  | 'pyqs'
  | 'repeats'
  | 'predictor'
  | 'analytics'
  | 'profile';

export type LearnSubView = 'videos' | 'syllabus' | 'mock-tests';

export type PracticeSubView = 'drills' | 'pyqs' | 'games';

export type AnswerVerificationStatus = 'official' | 'unofficial' | 'needs_verification';

export interface RepeatPaperOccurrence {
  year: number;
  tier: 'Tier 1' | 'Tier 2';
  examDate: string;
  shift: string;
  paperRef: string;
  answerStatus: AnswerVerificationStatus;
  variantNote?: string;
}

export interface RepeatedQuestionEntry {
  id: string;
  subject: SubjectId;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionEn: string;
  optionsEn: [string, string, string, string];
  correctIndex: number;
  correctAnswerText: string;
  explanationEn: string;
  shortcutMethod?: string;
  yearsAppeared: number[];
  occurrences: RepeatPaperOccurrence[];
}

export interface NotificationPreferences {
  dailyReminder: boolean;
  mockAlerts: boolean;
  streakAlerts: boolean;
  reminderTime: string; // HH:mm in local 24h time, e.g. '19:00'
  browserPushEnabled: boolean;
}

export interface LocalReminderNotification {
  id: string;
  kind: 'goal-kickoff' | 'goal-halfway' | 'goal-streak' | 'goal-complete' | 'mock-alert';
  title: string;
  body: string;
  ctaLabel: string;
  ctaTab: MainTab;
  createdAt: string;
  read: boolean;
  goalPct: number;
}

export type GameModeId =
  | 'quiz-battle'
  | 'maths-speed'
  | 'escape-room'
  | 'treasure-hunt'
  | 'exam-survival'
  | 'vocab-challenge'
  | 'daily-challenge'
  | 'duel-arena'
  | 'ocean-quest';

export type OceanQuestDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type OceanQuestMode =
  | 'treasure-hunt'
  | 'submarine-exploration'
  | 'crystal-rush'
  | 'boss-battle'
  | 'daily-challenge'
  | 'subject-mission';

export interface OceanQuestLocation {
  locationId: string;
  order: number;
  name: string;
  difficulty: OceanQuestDifficulty;
  depthMeters: number;
  subtitle: string;
  description: string;
  accentHex: string;
  mapX: number; // percentage 0..100
  mapY: number; // percentage 0..100
  unlockHint: string;
  requiredLocationId?: string;
  minCompletedInPrevLocation?: number;
}

export interface OceanQuestMission {
  missionId: string;
  locationId: string;
  locationOrder: number;
  title: string;
  description: string;
  mode: OceanQuestMode;
  difficulty: OceanQuestDifficulty;
  subject: SubjectId | 'mixed';
  questionCount: number;
  timeLimitSec: number; // 0 = untimed (encouraged for early Beginner missions)
  minAccuracyPct: number;
  hintLimit: number;
  xpReward: number;
  coinReward: number;
  crystalReward: number;
  badgeId?: string;
  prerequisiteMissionIds: string[];
  isBoss?: boolean;
  guardianName?: string;
  isPublished: boolean;
  order: number;
  updatedAt?: string;
}

export interface OceanQuestProgress {
  uid: string;
  unlockedLocations: string[];
  completedMissions: string[];
  missionBestScores: Record<string, number>;
  missionStars: Record<string, number>;
  seenQuestionIds: string[];
  wrongQuestionIds: string[];
  crystals: number;
  totalQuestXp: number;
  questBadges: string[];
  dailyCompletions: string[]; // YYYY-MM-DD dates claimed
  totalRuns: number;
  totalCorrect: number;
  totalAttempted: number;
  updatedAt: string;
}

export interface OceanQuestEvalResponse {
  missionId: string;
  passed: boolean;
  accuracy: number;
  stars: number;
  score: number;
  xpEarned: number;
  coinsEarned: number;
  crystalsEarned: number;
  isFirstClearClaim: boolean;
  alreadyClaimedDaily: boolean;
  unlockedBadgeId?: string;
  claimId?: string;
  claimType?: 'first-clear' | 'daily-challenge';
}

export interface Question {
  id: string;
  questionNumber?: number;
  subject: SubjectId;
  topic: string;
  year: number;
  examDate?: string;
  shift: string;
  tier: 'Tier 1' | 'Tier 2';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  sourceType: 'PYQ' | 'AI_GENERATED';
  sourceLabel: string;
  answerStatus?: AnswerVerificationStatus;
  isVerified?: boolean;
  isPublished?: boolean;
  sourceUrls?: string[];
  questionEn: string;
  questionHi?: string;
  optionsEn: [string, string, string, string];
  correctIndex: number;
  explanations: Record<LanguageCode, string>;
  stepByStep?: string[];
  shortcutMethod?: string;
  localizedHint?: Partial<Record<LanguageCode, string>>;
}

export interface PyqAttemptRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  attemptedAt: string;
  subject: SubjectId;
}

export interface SubjectDef {
  subjectId: SubjectId;
  title: string;
  description: string;
  icon: string;
  order: number;
  isPublished: boolean;
}

export interface CourseDef {
  courseId: string;
  subjectId: SubjectId;
  title: string;
  description: string;
  thumbnailUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
}

export interface VideoStep {
  timestampSec: number;
  heading: string;
  formula?: string;
  visualNote: string;
  subtitles: Record<LanguageCode, string>;
}

export interface VideoLesson {
  id: string;
  courseId?: string;
  title: string;
  subject: SubjectId;
  topic: string;
  playlist: string;
  durationSec: number;
  lessonOrder?: number;
  instructor: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isPublished?: boolean;
  summary: Record<LanguageCode, string>;
  steps: VideoStep[];
  relatedQuestionIds: string[];
}

export interface MockTestConfig {
  id: string;
  title: string;
  category: 'Tier 1' | 'Tier 2' | 'Sectional' | 'Previous Year Paper';
  subjectIds?: SubjectId[];
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  marksPerCorrect: number;
  questionIds: string[];
  description: string;
  isPublished?: boolean;
}

export interface UserProgressRecord {
  uid: string;
  completedLessonIds: string[];
  completedTopics: string[];
  subjectProgress: Record<SubjectId, { attempted: number; correct: number }>;
  totalStudyMinutes: number;
  lastStudiedAt: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  accuracy: number;
  timeTakenSec: number;
  subjectBreakdown: Record<SubjectId, { correct: number; total: number }>;
  createdAt: string;
}

export interface GameSession {
  id: string;
  gameMode: GameModeId;
  gameTitle: string;
  score: number;
  xpEarned: number;
  coinsEarned: number;
  accuracy: number;
  comboMax: number;
  createdAt: string;
}

export interface StudyBlock {
  timeSlot: string;
  activityType: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  completed?: boolean;
}

export interface StudyPlan {
  hoursPerDay: number;
  examTarget: string;
  weakSubjects: SubjectId[];
  strongSubjects: SubjectId[];
  preferredLanguage: LanguageCode;
  examDate: string;
  summary: string;
  weeklyTarget: string;
  blocks: StudyBlock[];
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  itemType: 'question' | 'video';
  itemId: string;
  title: string;
  subject: SubjectId;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  language: LanguageCode;
  imagePreview?: string;
  createdAt: string;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  requirement: string;
  xpReward: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
  streak: number;
  level: string;
  accuracy: number;
  isCurrentUser?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  username?: string;
  displayName: string;
  email: string;
  preferredLanguage: LanguageCode;
  targetPost: string;
  dailyGoalMinutes: number;
  xp: number;
  coins: number;
  streak: number;
  role: 'student' | 'admin';
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
  completedLessons: string[];
  completedSyllabusTopics: string[];
  earnedBadges: string[];
  studyMinutesToday: number;
  questionsAttempted: number;
  questionsCorrect: number;
  subjectStats: Record<SubjectId, { attempted: number; correct: number }>;
  videoProgress: Record<string, { lastSec: number; completed: boolean; notes: string }>;
  dailyChallengeDoneDate?: string;
  lastLessonId?: string;
}

export type ExamTier = 'Tier 1' | 'Tier 2';

export type ExamScheduleStatus = 'confirmed' | 'tentative' | 'unavailable';

export interface ExamYearNotice {
  examYear: number;
  tier: ExamTier;
  notificationStatus: ExamScheduleStatus;
  examDateLabel: string;
  patternStatus: ExamScheduleStatus;
  patternSummary: string;
  sourceLabel: string;
  sourceUrl?: string;
}

export type PredictionConfidence = 'High' | 'Medium' | 'Low';
export type PreparationPriority = 'Critical' | 'High' | 'Moderate' | 'Maintain';
export type PredictorReviewStatus = 'pending' | 'approved' | 'rejected';

export const AI_EXPECTED_QUESTION_NOTICE =
  'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION';

export interface PredictorTopicDefinition {
  topic: string;
  subject: SubjectId;
  tiers: ExamTier[];
  syllabusWeightageNote: string;
  aliases: string[];
}

export interface YearTrendStat {
  year: number;
  total: number;
  tier1: number;
  tier2: number;
  easy: number;
  medium: number;
  hard: number;
}

export interface TopicHistoricalStat {
  topic: string;
  subject: SubjectId;
  totalCount: number;
  tier1Count: number;
  tier2Count: number;
  recentCount: number; // 2023-2025
  olderCount: number;  // 2016-2022
  yearsAppeared: number[];
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

export interface HistoricalAnalysisReport {
  totalVerifiedPyqs: number;
  totalTierPyqs: number;
  yearsWithData: number[];
  missingYears: number[];
  subjectCounts: Record<SubjectId, number>;
  yearTrends: YearTrendStat[];
  difficultyCounts: Record<'Easy' | 'Medium' | 'Hard', number>;
  topRepeatedTopics: TopicHistoricalStat[];
  recentSurgeTopics: TopicHistoricalStat[];
  lessFrequentTopics: TopicHistoricalStat[];
  tierShiftInsights: string[];
}

export interface TopicPrediction {
  topic: string;
  subject: SubjectId;
  tier: ExamTier;
  examYear: number;
  historicalFrequency: number;
  recentAppearanceCount: number;
  recentTrendLabel: 'Rising' | 'Steady' | 'Selective' | 'Low Data';
  evidenceSummary: string;
  confidence: PredictionConfidence;
  priority: PreparationPriority;
  priorityScore: number;
  rationale: string;
  isOutdated?: boolean;
  outdatedNote?: string;
}

export interface PredictorQuestion {
  id: string;
  examYear: number;
  tier: ExamTier;
  subject: SubjectId;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionEn: string;
  optionsEn: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  stepByStep: string[];
  relatedTopic?: string;
  usefulnessReason: string;
  aiNoticeLabel: typeof AI_EXPECTED_QUESTION_NOTICE;
  sourceType: 'AI_GENERATED';
  isOfficialPyq: false;
  reviewStatus: PredictorReviewStatus;
  isPublished: boolean;
  createdByUid?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
}

export type CurrentAffairsCategory =
  | 'National'
  | 'International'
  | 'Government Schemes'
  | 'Awards & Appointments'
  | 'Science & Technology'
  | 'Economy & Reports'
  | 'Sports & Major Events';

export interface CurrentAffairsItem {
  id: string;
  category: CurrentAffairsCategory;
  title: string;
  summary: string;
  examRelevance: string;
  publishedDate: string;
  sourceName: string;
  sourceUrl: string;
  targetYear: number;
  isPublished: boolean;
  createdAt: string;
}

export interface PredictorCategoryOverride {
  id: string;
  subject: SubjectId;
  topic: string;
  tier: ExamTier;
  targetYear: number;
  priorityOverride?: PreparationPriority;
  isOutdated: boolean;
  outdatedNote?: string;
  syllabusWeightage?: string;
  updatedAt: string;
}

export interface PredictionAccuracyReport {
  id: string;
  examYear: number;
  tier: ExamTier;
  title: string;
  predictedTopics: string[];
  actualTopics: string[];
  matchedTopics: string[];
  missedTopics: string[];
  coveragePct: number;
  notes: string;
  isOutdated: boolean;
  createdAt: string;
  updatedAt?: string;
}

