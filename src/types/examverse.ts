export type LanguageCode = 'en' | 'ml' | 'hi' | 'ta';

export type SubjectId =
  | 'quant'
  | 'reasoning'
  | 'english'
  | 'ga'
  | 'computer';

export type MainTab = 'home' | 'learn' | 'play' | 'tutor' | 'profile';

export type LearnSubView = 'videos' | 'syllabus' | 'pyqs' | 'practice' | 'mock-tests';

export type GameModeId =
  | 'quiz-battle'
  | 'maths-speed'
  | 'escape-room'
  | 'treasure-hunt'
  | 'exam-survival'
  | 'vocab-challenge'
  | 'daily-challenge'
  | 'duel-arena';

export interface Question {
  id: string;
  subject: SubjectId;
  topic: string;
  year: number;
  shift: string;
  tier: 'Tier 1' | 'Tier 2';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  sourceType: 'PYQ' | 'AI_GENERATED';
  sourceLabel: string;
  isVerified?: boolean;
  isPublished?: boolean;
  sourceUrls?: string[];
  questionEn: string;
  optionsEn: [string, string, string, string];
  correctIndex: number;
  explanations: Record<LanguageCode, string>;
  localizedHint?: Partial<Record<LanguageCode, string>>;
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
}
