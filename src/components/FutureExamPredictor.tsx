import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileCheck2,
  Flame,
  Globe,
  Home,
  Info,
  Layers,
  Loader2,
  Newspaper,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES } from '../data/i18n';
import {
  analyzeHistoricalPyqs,
  buildPersonalizedPredictorPlan,
  buildPredictedMockTest,
  buildTopicPredictions,
  getExamYearNotice,
  OFFICIAL_TOPIC_TAXONOMY,
  PersonalizedPredictorPlan,
  PREDICTOR_YEARS,
  toStudyPlanDocument,
} from '../data/futurePredictorEngine';
import {
  AI_EXPECTED_QUESTION_NOTICE,
  CurrentAffairsCategory,
  CurrentAffairsItem,
  ExamTier,
  PredictionConfidence,
  PredictorQuestion,
  PreparationPriority,
  SubjectId,
} from '../types/examverse';
import { MockTestEngine } from './MockTestEngine';
import { FirstTimeTip, OceanGlassCard, OceanWaveBackdrop } from './OceanTheme';

type PredictorSubTab =
  | 'overview'
  | 'topics'
  | 'expected'
  | 'mock'
  | 'affairs'
  | 'plan'
  | 'accuracy';

const CURRENT_AFFAIRS_CATEGORIES: Array<CurrentAffairsCategory | 'All'> = [
  'All',
  'National',
  'International',
  'Government Schemes',
  'Awards & Appointments',
  'Science & Technology',
  'Economy & Reports',
  'Sports & Major Events',
];

interface FutureExamPredictorProps {
  onBackHome: () => void;
  onOpenPyqs: () => void;
}

export const FutureExamPredictor: React.FC<FutureExamPredictorProps> = ({
  onBackHome,
  onOpenPyqs,
}) => {
  const {
    language,
    questions,
    profile,
    testAttempts,
    predictorQuestions,
    predictorCategories,
    predictionReports,
    currentAffairs,
    savePredictorQuestion,
    saveStudyPlan,
    openTutorWithPrompt,
  } = useApp();

  const [examYear, setExamYear] = useState<number>(2026);
  const [tier, setTier] = useState<ExamTier>('Tier 1');
  const [subTab, setSubTab] = useState<PredictorSubTab>('overview');

  // Topic predictions filters
  const [topicSubjectFilter, setTopicSubjectFilter] = useState<SubjectId | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<PredictionConfidence | 'All'>('All');

  // Expected Question Generator state
  const [genSubject, setGenSubject] = useState<SubjectId>('quant');
  const [genTopic, setGenTopic] = useState<string>('Percentage');
  const [genDifficulty, setGenDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [genCount, setGenCount] = useState<number>(2);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedSteps, setRevealedSteps] = useState<Record<string, boolean>>({});

  // Predicted Mock runner
  const [runningPredictedMock, setRunningPredictedMock] = useState(false);

  // Current Affairs state
  const [caCategory, setCaCategory] = useState<CurrentAffairsCategory | 'All'>('All');
  const [liveAffairs, setLiveAffairs] = useState<CurrentAffairsItem[]>([]);
  const [loadingLiveCa, setLoadingLiveCa] = useState(false);
  const [caError, setCaError] = useState<string | null>(null);

  // Study Plan state
  const [hoursPerDay, setHoursPerDay] = useState<number>(
    Math.max(1, Math.min(10, Math.round((profile.dailyGoalMinutes / 60) * 10) / 10 || 3))
  );
  const [daysUntilExam, setDaysUntilExam] = useState<number>(120);
  const [aiEnhancedPlan, setAiEnhancedPlan] = useState<PersonalizedPredictorPlan | null>(null);
  const [enhancingPlan, setEnhancingPlan] = useState(false);
  const [planSavedNotice, setPlanSavedNotice] = useState<string | null>(null);

  const yearNotice = useMemo(() => getExamYearNotice(examYear, tier), [examYear, tier]);
  const historicalReport = useMemo(
    () => analyzeHistoricalPyqs(questions, tier),
    [questions, tier]
  );
  const predictions = useMemo(
    () => buildTopicPredictions(questions, examYear, tier, predictorCategories),
    [questions, examYear, tier, predictorCategories]
  );

  const approvedAiQuestions = useMemo(
    () =>
      predictorQuestions.filter(
        (pq) => pq.reviewStatus === 'approved' && pq.isPublished && pq.tier === tier
      ),
    [predictorQuestions, tier]
  );

  const sessionAndApprovedQuestions = useMemo(() => {
    return predictorQuestions.filter(
      (pq) =>
        pq.tier === tier &&
        (pq.isPublished || pq.createdByUid === profile.uid || !pq.createdByUid)
    );
  }, [predictorQuestions, tier, profile.uid]);

  const predictedMockBundle = useMemo(
    () => buildPredictedMockTest(examYear, tier, questions, predictions, approvedAiQuestions),
    [examYear, tier, questions, predictions, approvedAiQuestions]
  );

  const deterministicPlan = useMemo(
    () =>
      buildPersonalizedPredictorPlan({
        profile,
        testAttempts,
        predictions,
        examYear,
        tier,
        hoursPerDay,
        daysUntilExam,
        language,
      }),
    [profile, testAttempts, predictions, examYear, tier, hoursPerDay, daysUntilExam, language]
  );

  const activePlan = aiEnhancedPlan || deterministicPlan;

  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      if (topicSubjectFilter !== 'all' && p.subject !== topicSubjectFilter) return false;
      if (confidenceFilter !== 'All' && p.confidence !== confidenceFilter) return false;
      return true;
    });
  }, [predictions, topicSubjectFilter, confidenceFilter]);

  const availableTopicsForSubject = useMemo(
    () =>
      OFFICIAL_TOPIC_TAXONOMY.filter(
        (def) => def.subject === genSubject && def.tiers.includes(tier)
      ),
    [genSubject, tier]
  );

  const handleSubjectChange = (sub: SubjectId) => {
    setGenSubject(sub);
    const first = OFFICIAL_TOPIC_TAXONOMY.find(
      (d) => d.subject === sub && d.tiers.includes(tier)
    );
    if (first) setGenTopic(first.topic);
  };

  const handleGenerateExpectedQuestions = async (
    overrideSubject?: SubjectId,
    overrideTopic?: string
  ) => {
    const targetSub = overrideSubject || genSubject;
    const targetTopic = overrideTopic || genTopic;
    if (overrideSubject) setGenSubject(overrideSubject);
    if (overrideTopic) setGenTopic(overrideTopic);
    setSubTab('expected');
    setGeneratingQs(true);
    setGenError(null);
    try {
      const res = await fetch('/api/predictor/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examYear,
          tier,
          subject: targetSub,
          topic: targetTopic,
          difficulty: genDifficulty,
          count: genCount,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Unable to generate expected practice questions right now.');
      }
      const data = await res.json();
      const items: Array<Partial<PredictorQuestion>> = Array.isArray(data.questions)
        ? data.questions
        : [];
      if (items.length === 0) {
        throw new Error('No expected practice questions were returned. Please try again.');
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const pq: PredictorQuestion = {
          id: `pred-q-${examYear}-${Date.now()}-${i}`,
          examYear,
          tier,
          subject: targetSub,
          topic: String(item.topic || targetTopic),
          difficulty: (item.difficulty as PredictorQuestion['difficulty']) || genDifficulty,
          questionEn: String(item.questionEn || ''),
          optionsEn: (Array.isArray(item.optionsEn) && item.optionsEn.length === 4
            ? item.optionsEn
            : ['Option A', 'Option B', 'Option C', 'Option D']) as [string, string, string, string],
          correctIndex: Math.min(3, Math.max(0, Number(item.correctIndex || 0))),
          explanation: String(item.explanation || ''),
          stepByStep: Array.isArray(item.stepByStep) ? item.stepByStep.map(String) : [],
          usefulnessReason: String(
            item.usefulnessReason ||
              `Aligned with recurring SSC CGL ${tier} ${targetTopic} problem patterns.`
          ),
          sourceType: 'AI_GENERATED',
          isOfficialPyq: false,
          aiNoticeLabel: AI_EXPECTED_QUESTION_NOTICE,
          reviewStatus: 'pending',
          isPublished: false,
          createdByUid: profile.uid,
          createdAt: new Date().toISOString(),
        };
        if (pq.questionEn) {
          await savePredictorQuestion(pq);
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGeneratingQs(false);
    }
  };

  const handleFetchLiveCurrentAffairs = async () => {
    setLoadingLiveCa(true);
    setCaError(null);
    try {
      const res = await fetch('/api/predictor/current-affairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetYear: examYear,
          category: caCategory,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not fetch live Current Affairs updates.');
      }
      const data = await res.json();
      const fetched: CurrentAffairsItem[] = (Array.isArray(data.items) ? data.items : []).map(
        (it: Partial<CurrentAffairsItem>, idx: number) => ({
          id: `ca-live-${Date.now()}-${idx}`,
          category: (it.category as CurrentAffairsCategory) || 'National',
          title: String(it.title || 'Verified Current Affairs Brief'),
          summary: String(it.summary || ''),
          examRelevance: String(it.examRelevance || 'Relevant for SSC CGL General Awareness'),
          publishedDate: String(it.publishedDate || new Date().toISOString().slice(0, 10)),
          sourceName: String(it.sourceName || 'Verified News Source'),
          sourceUrl: String(it.sourceUrl || 'https://www.pib.gov.in'),
          targetYear: examYear,
          isPublished: true,
          createdAt: new Date().toISOString(),
        })
      );
      setLiveAffairs(fetched);
    } catch (err) {
      setCaError(err instanceof Error ? err.message : 'Unable to fetch live updates.');
    } finally {
      setLoadingLiveCa(false);
    }
  };

  const handleEnhanceStudyPlanWithAi = async () => {
    setEnhancingPlan(true);
    setPlanSavedNotice(null);
    try {
      const res = await fetch('/api/predictor/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examYear,
          tier,
          hoursPerDay,
          daysUntilExam,
          weakTopics: deterministicPlan.weakSubjects,
          strongTopics: deterministicPlan.strongSubjects,
          predictedTopics: deterministicPlan.predictedFocusTopics,
        }),
      });
      if (!res.ok) throw new Error('Could not reach AI roadmap service.');
      const data = await res.json();
      setAiEnhancedPlan({
        ...deterministicPlan,
        summary: String(data.summary || deterministicPlan.summary),
        weeklyTarget: String(data.weeklyTarget || deterministicPlan.weeklyTarget),
        dailyBlocks:
          Array.isArray(data.dailyBlocks) && data.dailyBlocks.length > 0
            ? data.dailyBlocks
            : deterministicPlan.dailyBlocks,
        weeklySchedule:
          Array.isArray(data.weeklySchedule) && data.weeklySchedule.length > 0
            ? data.weeklySchedule
            : deterministicPlan.weeklySchedule,
      });
    } catch {
      setPlanSavedNotice(
        'Showing evidence-calibrated study roadmap offline (live AI enhancer unavailable right now).'
      );
    } finally {
      setEnhancingPlan(false);
    }
  };

  const handleSaveToStudyPlanner = async () => {
    const docPlan = toStudyPlanDocument(activePlan, language);
    await saveStudyPlan(docPlan);
    setPlanSavedNotice('Saved to your Examora Smart Study Planner!');
  };

  const combinedCurrentAffairs = useMemo(() => {
    const map = new Map<string, CurrentAffairsItem>();
    [...liveAffairs, ...currentAffairs].forEach((item) => {
      map.set(item.id, item);
    });
    return Array.from(map.values()).filter((item) =>
      caCategory === 'All' ? true : item.category === caCategory
    );
  }, [liveAffairs, currentAffairs, caCategory]);

  if (runningPredictedMock) {
    return (
      <MockTestEngine
        test={predictedMockBundle.mock}
        customQuestions={predictedMockBundle.embeddedQuestions}
        onExit={() => setRunningPredictedMock(false)}
      />
    );
  }

  const confidenceStyle = (c: PredictionConfidence) => {
    if (c === 'High') {
      return 'bg-[#20C7C9]/18 text-[#075985] dark:text-[#55D6D0] border-[#20C7C9]/40';
    }
    if (c === 'Medium') {
      return 'bg-[#075985]/12 text-[#075985] dark:text-[#8DE1D3] border-[#075985]/30';
    }
    return 'bg-slate-200/70 dark:bg-[#062B3D] text-[#073B50] dark:text-[#8DE1D3]/80 border-slate-300/60 dark:border-[#20C7C9]/20';
  };

  const priorityStyle = (p: PreparationPriority) => {
    if (p === 'Critical') {
      return 'bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78] border-[#FF8B78]/45';
    }
    if (p === 'High') {
      return 'bg-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0] border-[#20C7C9]/45';
    }
    return 'bg-[#F3FAFA] dark:bg-[#062B3D] text-[#073B50] dark:text-[#8DE1D3] border-[#8DE1D3]/45 dark:border-[#20C7C9]/25';
  };

  const subTabs: Array<{
    id: PredictorSubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: '2016–2025 Trends', icon: BarChart3 },
    { id: 'topics', label: 'Topic Predictions', icon: TrendingUp },
    { id: 'expected', label: 'Expected Q&A (AI)', icon: Sparkles },
    { id: 'mock', label: 'Predicted Mock', icon: Play },
    { id: 'affairs', label: 'Current Affairs', icon: Newspaper },
    { id: 'plan', label: 'Study Roadmap', icon: Calendar },
    { id: 'accuracy', label: 'Accuracy Tracker', icon: FileCheck2 },
  ];

  const maxYearTotal = Math.max(1, ...historicalReport.yearTrends.map((y) => y.total));

  return (
    <div className="space-y-6">
      <FirstTimeTip
        storageKey="future_predictor_v1"
        title="How Future Exam Predictor Works"
        body="We analyze real verified 2016–2025 SSC CGL questions alongside official syllabus weightage to highlight high-yield preparation topics. Predictions guide focused revision — never a claim of exact future exam papers."
      />

      {/* Top Back & Home Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/85 dark:bg-[#073B50]/85 text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:border-[#20C7C9] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/85 dark:bg-[#073B50]/85 text-xs font-bold text-[#062B3D] dark:text-[#F3FAFA] hover:border-[#20C7C9] cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#20C7C9]" />
            Home
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenPyqs}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          Browse 2016–2025 PYQs
        </button>
      </div>

      {/* Ocean Hero Header with Year & Tier Selectors */}
      <section className="relative overflow-hidden ocean-gradient-hero text-[#F3FAFA] rounded-3xl p-6 sm:p-8 border border-[#20C7C9]/30 ocean-shadow space-y-5">
        <OceanWaveBackdrop />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#55D6D0]">
              <Compass className="w-4 h-4" />
              Examora AI Future Exam Predictor
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              SSC CGL {examYear} · {tier} Trend &amp; Preparation Radar
            </h1>
            <p className="text-xs sm:text-sm text-[#F3FAFA]/85 leading-relaxed">
              Evidence-backed topic prioritization built strictly from verified 2016–2025 PYQ
              frequencies, syllabus shift analysis, and curated expected practice.
            </p>
          </div>

          {/* Year & Tier Controls */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-[#8DE1D3]/25 rounded-2xl p-1.5 flex items-center gap-1 flex-wrap">
              {PREDICTOR_YEARS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setExamYear(yr)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono-num transition-colors cursor-pointer ${
                    examYear === yr
                      ? 'bg-[#20C7C9] text-[#062B3D]'
                      : 'text-[#F3FAFA]/85 hover:bg-white/10'
                  }`}
                >
                  CGL {yr}
                </button>
              ))}
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-[#8DE1D3]/25 rounded-2xl p-1.5 grid grid-cols-2 gap-1">
              {(['Tier 1', 'Tier 2'] as ExamTier[]).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTier(tr)}
                  className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                    tier === tr
                      ? 'bg-[#F3FAFA] text-[#062B3D]'
                      : 'text-[#F3FAFA]/85 hover:bg-white/10'
                  }`}
                >
                  {tr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Official Schedule & Epistemic Transparency Banner */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl bg-[#062B3D]/70 border border-[#8DE1D3]/25 p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8DE1D3]">
                Official Schedule &amp; Pattern Status
              </span>
              <span
                className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg ${
                  yearNotice.notificationStatus === 'tentative'
                    ? 'bg-[#FF8B78]/25 text-[#FF8B78]'
                    : 'bg-white/15 text-[#F3FAFA]'
                }`}
              >
                {yearNotice.notificationStatus}
              </span>
            </div>
            <div className="text-xs font-semibold text-white">{yearNotice.examDateLabel}</div>
            <div className="text-[11px] text-[#8DE1D3]/90 leading-relaxed">
              {yearNotice.patternSummary}
            </div>
            <a
              href={yearNotice.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#55D6D0] hover:underline pt-0.5"
            >
              {yearNotice.sourceLabel}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="rounded-2xl bg-[#062B3D]/70 border border-[#20C7C9]/35 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#55D6D0]">
              <ShieldCheck className="w-4 h-4" />
              Evidence-Based Transparency Notice
            </div>
            <p className="text-xs text-[#F3FAFA]/90 leading-relaxed">
              Examora never claims to know exact future SSC questions. Confidence ratings measure
              historical recurrence across{' '}
              <span className="font-mono-num font-bold text-[#55D6D0]">
                {historicalReport.totalVerifiedPyqs}
              </span>{' '}
              verified 2016–2025 PYQs plus syllabus weightage—not guaranteed exam probabilities.
            </p>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-white/85 dark:bg-[#073B50]/85 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-1.5 rounded-2xl overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D] shadow-sm'
                  : 'text-[#073B50] dark:text-[#8DE1D3] hover:text-[#062B3D] dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW & HISTORICAL DATA ANALYSIS */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <OceanGlassCard className="p-5">
              <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                Verified 2016–2025 PYQs
              </div>
              <div className="font-mono-num text-2xl font-extrabold mt-1">
                {historicalReport.totalVerifiedPyqs}
              </div>
              <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5">
                {historicalReport.totalTierPyqs} tagged {tier}
              </div>
            </OceanGlassCard>

            <OceanGlassCard className="p-5">
              <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                Years With Imported Data
              </div>
              <div className="font-mono-num text-2xl font-extrabold mt-1">
                {historicalReport.yearsWithData.length}/10
              </div>
              <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5 truncate">
                {historicalReport.yearsWithData.join(', ') || 'None yet'}
              </div>
            </OceanGlassCard>

            <OceanGlassCard className="p-5">
              <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                High-Confidence Topics
              </div>
              <div className="font-mono-num text-2xl font-extrabold mt-1 text-[#075985] dark:text-[#55D6D0]">
                {predictions.filter((p) => p.confidence === 'High').length}
              </div>
              <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5">
                Out of {predictions.length} syllabus topics
              </div>
            </OceanGlassCard>

            <OceanGlassCard className="p-5">
              <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                Approved Expected Qs
              </div>
              <div className="font-mono-num text-2xl font-extrabold mt-1">
                {approvedAiQuestions.length}
              </div>
              <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80 mt-0.5">
                Admin-verified AI practice
              </div>
            </OceanGlassCard>
          </div>

          {/* Dataset Honesty Notice */}
          {historicalReport.missingYears.length > 0 && (
            <div className="rounded-2xl border border-[#FF8B78]/45 bg-[#FF8B78]/10 dark:bg-[#073B50]/80 p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#FF8B78] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-[#062B3D] dark:text-[#F3FAFA]">
                  Transparent Dataset Coverage Notice (2016–2025)
                </div>
                <p className="text-[#073B50]/85 dark:text-[#8DE1D3]">
                  Counts below reflect only actual verified PYQs currently in Examora. Years with 0
                  imported questions right now:{' '}
                  <span className="font-mono-num font-bold">
                    {historicalReport.missingYears.join(', ')}
                  </span>
                  . Official taxonomy weighting supplements missing years without fabricating past counts.
                </p>
              </div>
            </div>
          )}

          {/* Year-by-Year Trend + Subject Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <OceanGlassCard className="lg:col-span-7 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#20C7C9]" />
                  2016–2025 Imported PYQ Volume
                </h2>
                <span className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
                  Verified Archive Only
                </span>
              </div>

              <div className="space-y-2.5">
                {historicalReport.yearTrends.map((row) => {
                  const pct = Math.round((row.total / maxYearTotal) * 100);
                  return (
                    <div key={row.year} className="grid grid-cols-12 items-center gap-3 text-xs">
                      <span className="col-span-2 font-mono-num font-bold">{row.year}</span>
                      <div className="col-span-7 h-3 rounded-full bg-[#F3FAFA] dark:bg-[#062B3D] overflow-hidden border border-[#8DE1D3]/35 dark:border-[#20C7C9]/15">
                        <div
                          className="h-full bg-gradient-to-r from-[#075985] to-[#20C7C9] rounded-full transition-all"
                          style={{ width: `${row.total > 0 ? Math.max(6, pct) : 0}%` }}
                        />
                      </div>
                      <span className="col-span-3 text-right font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                        {row.total} Qs ({row.tier1} T1 · {row.tier2} T2)
                      </span>
                    </div>
                  );
                })}
              </div>
            </OceanGlassCard>

            <OceanGlassCard className="lg:col-span-5 p-6 space-y-5">
              <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#20C7C9]" />
                {tier} Subject &amp; Difficulty Mix
              </h2>

              <div className="space-y-2.5">
                {(['quant', 'reasoning', 'english', 'ga', 'computer'] as SubjectId[]).map((sub) => {
                  const count = historicalReport.subjectCounts[sub] || 0;
                  const pct =
                    historicalReport.totalTierPyqs > 0
                      ? Math.round((count / historicalReport.totalTierPyqs) * 100)
                      : 0;
                  return (
                    <div key={sub} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{SUBJECT_NAMES[sub][language]}</span>
                        <span className="font-mono-num">
                          {count} Qs ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F3FAFA] dark:bg-[#062B3D] overflow-hidden">
                        <div
                          className="h-full bg-[#20C7C9] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 space-y-2">
                <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                  Pattern Shift Observations
                </div>
                <ul className="space-y-1.5 text-xs text-[#073B50]/85 dark:text-[#8DE1D3]">
                  {historicalReport.tierShiftInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20C7C9] mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </OceanGlassCard>
          </div>

          {/* Repeated vs Recent Surge Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <OceanGlassCard className="p-6 space-y-3">
              <h3 className="font-display text-base font-extrabold flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF8B78]" />
                Frequently Repeated {tier} Topics
              </h3>
              {historicalReport.topRepeatedTopics.length === 0 ? (
                <p className="text-xs text-[#073B50]/80 dark:text-[#8DE1D3]">
                  No {tier}-tagged PYQs imported yet. Check Topic Predictions for full syllabus
                  priorities.
                </p>
              ) : (
                <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                  {historicalReport.topRepeatedTopics.slice(0, 6).map((stat) => (
                    <div
                      key={`${stat.subject}-${stat.topic}`}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold">{stat.topic}</div>
                        <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                          {SUBJECT_NAMES[stat.subject][language]} · Years:{' '}
                          {stat.yearsAppeared.join(', ')}
                        </div>
                      </div>
                      <span className="font-mono-num font-extrabold px-2.5 py-1 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]">
                        {stat.totalCount} Qs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </OceanGlassCard>

            <OceanGlassCard className="p-6 space-y-3">
              <h3 className="font-display text-base font-extrabold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#20C7C9]" />
                Recent 2023–2025 Surge &amp; Selective Topics
              </h3>
              <div className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                {historicalReport.recentSurgeTopics.slice(0, 4).map((stat) => (
                  <div
                    key={`surge-${stat.subject}-${stat.topic}`}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold">{stat.topic}</div>
                      <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                        Recent 2023–2025 surge · {SUBJECT_NAMES[stat.subject][language]}
                      </div>
                    </div>
                    <span className="font-mono-num font-extrabold px-2.5 py-1 rounded-lg bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]">
                      {stat.recentCount} Recent
                    </span>
                  </div>
                ))}
                {historicalReport.lessFrequentTopics.slice(0, 2).map((stat) => (
                  <div
                    key={`rare-${stat.subject}-${stat.topic}`}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold">{stat.topic}</div>
                      <div className="text-[11px] text-[#073B50]/75 dark:text-[#8DE1D3]/80">
                        Lower imported count so far ({stat.totalCount} Q)
                      </div>
                    </div>
                    <span className="font-mono-num text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
                      Selective
                    </span>
                  </div>
                ))}
              </div>
            </OceanGlassCard>
          </div>
        </div>
      )}

      {/* 2. AI TOPIC PREDICTIONS & CONFIDENCE */}
      {subTab === 'topics' && (
        <div className="space-y-5">
          <OceanGlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'quant', 'reasoning', 'english', 'ga', 'computer'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setTopicSubjectFilter(sub)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    topicSubjectFilter === sub
                      ? 'bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D]'
                      : 'border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-[#073B50] dark:text-[#8DE1D3]'
                  }`}
                >
                  {sub === 'all' ? 'All Subjects' : SUBJECT_NAMES[sub][language]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {(['All', 'High', 'Medium', 'Low'] as const).map((conf) => (
                <button
                  key={conf}
                  type="button"
                  onClick={() => setConfidenceFilter(conf)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    confidenceFilter === conf
                      ? 'bg-[#20C7C9] text-[#062B3D]'
                      : 'border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {conf === 'All' ? 'All Confidence' : `${conf} Conf`}
                </button>
              ))}
            </div>
          </OceanGlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPredictions.map((pred) => (
              <OceanGlassCard key={`${pred.subject}-${pred.topic}`} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-[#075985] dark:text-[#55D6D0]">
                      {SUBJECT_NAMES[pred.subject][language]} · {pred.tier}
                    </div>
                    <h3 className="font-display text-base font-extrabold mt-0.5">
                      {pred.topic}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${confidenceStyle(
                        pred.confidence
                      )}`}
                    >
                      {pred.confidence} Confidence
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${priorityStyle(
                        pred.priority
                      )}`}
                    >
                      {pred.priority} Priority
                    </span>
                  </div>
                </div>

                {pred.isOutdated && (
                  <div className="p-2.5 rounded-xl bg-[#FF8B78]/15 border border-[#FF8B78]/40 text-xs text-[#9A2D1F] dark:text-[#FF8B78] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Outdated Trend Flag: {pred.outdatedNote || 'Flagged by Admin review.'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center bg-[#F3FAFA] dark:bg-[#062B3D] rounded-xl p-2.5 border border-[#8DE1D3]/35 dark:border-[#20C7C9]/15">
                  <div>
                    <div className="text-[10px] text-[#075985] dark:text-[#8DE1D3]">
                      Historical Freq
                    </div>
                    <div className="font-mono-num text-sm font-extrabold">
                      {pred.historicalFrequency} Qs
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#075985] dark:text-[#8DE1D3]">
                      2023–25 Trend
                    </div>
                    <div className="text-xs font-extrabold">{pred.recentTrendLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#075985] dark:text-[#8DE1D3]">
                      Recent Count
                    </div>
                    <div className="font-mono-num text-sm font-extrabold">
                      {pred.recentAppearanceCount} Qs
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#073B50]/90 dark:text-[#F3FAFA]/90 space-y-1">
                  <div>
                    <span className="font-bold">Evidence:</span> {pred.evidenceSummary}
                  </div>
                  <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                    {pred.rationale}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateExpectedQuestions(pred.subject, pred.topic)}
                    className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Expected Qs
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPyqs}
                    className="min-h-[38px] px-3 py-2 rounded-xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-xs font-bold cursor-pointer"
                  >
                    Study PYQs
                  </button>
                </div>
              </OceanGlassCard>
            ))}
          </div>
        </div>
      )}

      {/* 3. EXPECTED QUESTION GENERATOR (AI) */}
      {subTab === 'expected' && (
        <div className="space-y-5">
          {/* Mandatory AI Epistemic Disclaimer */}
          <div className="rounded-2xl border-2 border-[#FF8B78]/60 bg-[#FF8B78]/12 dark:bg-[#073B50] p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF8B78] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-extrabold tracking-wide text-[#9A2D1F] dark:text-[#FF8B78]">
                {AI_EXPECTED_QUESTION_NOTICE}
              </div>
              <p className="text-[#073B50] dark:text-[#F3FAFA]/85">
                Questions generated here are original AI-created exam-style drills inspired by historical
                SSC CGL patterns. Unreviewed student drafts remain isolated from the Verified 2016–2025
                PYQ Library until approved by an authorized Administrator.
              </p>
            </div>
          </div>

          {/* Generator Form */}
          <OceanGlassCard className="p-6 space-y-4">
            <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#20C7C9]" />
              Generate Expected SSC CGL {examYear} ({tier}) Questions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                  Subject
                </label>
                <select
                  value={genSubject}
                  onChange={(e) => handleSubjectChange(e.target.value as SubjectId)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs font-semibold"
                >
                  {(['quant', 'reasoning', 'english', 'ga', ...(tier === 'Tier 2' ? ['computer'] : [])] as SubjectId[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {SUBJECT_NAMES[s][language]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                  Canonical Topic
                </label>
                <select
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs font-semibold"
                >
                  {availableTopicsForSubject.map((def) => (
                    <option key={def.topic} value={def.topic}>
                      {def.topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                  Difficulty Level
                </label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs font-semibold"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                  Questions Count
                </label>
                <select
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] text-xs font-semibold"
                >
                  <option value={2}>2 Questions</option>
                  <option value={3}>3 Questions</option>
                  <option value={4}>4 Questions</option>
                  <option value={5}>5 Questions</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {genError ? (
                <span className="text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
                  {genError}
                </span>
              ) : (
                <span className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                  Includes 4 SSC-style options, step-by-step solution, and preparation rationale.
                </span>
              )}
              <button
                type="button"
                disabled={generatingQs}
                onClick={() => handleGenerateExpectedQuestions()}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] hover:bg-[#062B3D] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-extrabold disabled:opacity-60 cursor-pointer"
              >
                {generatingQs ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Expected Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Expected Practice Questions
                  </>
                )}
              </button>
            </div>
          </OceanGlassCard>

          {/* Rendered Expected Practice Questions */}
          {sessionAndApprovedQuestions.length === 0 ? (
            <OceanGlassCard className="p-8 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-[#20C7C9] mx-auto" />
              <div className="font-display font-bold text-base">
                No Expected {tier} Questions Generated Yet
              </div>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3] max-w-md mx-auto">
                Select any high-priority topic above and tap “Generate Expected Practice Questions”
                to practice fresh exam-style MCQs with step-by-step explanations.
              </p>
            </OceanGlassCard>
          ) : (
            <div className="space-y-4">
              {sessionAndApprovedQuestions.map((pq) => {
                const chosenIdx = selectedAnswers[pq.id];
                const answered = chosenIdx !== undefined;
                const stepsOpen = revealedSteps[pq.id] || answered;
                return (
                  <OceanGlassCard key={pq.id} className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                      <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-1 rounded-lg bg-[#FF8B78]/18 text-[#9A2D1F] dark:text-[#FF8B78] border border-[#FF8B78]/40">
                        {AI_EXPECTED_QUESTION_NOTICE}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]">
                          {SUBJECT_NAMES[pq.subject][language]} · {pq.topic}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25">
                          {pq.difficulty}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg ${
                            pq.reviewStatus === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200/70 dark:bg-[#062B3D] text-[#075985] dark:text-[#8DE1D3]'
                          }`}
                        >
                          {pq.reviewStatus === 'approved' ? 'Admin Approved' : 'Practice Draft'}
                        </span>
                      </div>
                    </div>

                    <div className="font-display font-bold text-sm sm:text-base leading-relaxed">
                      {pq.questionEn}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pq.optionsEn.map((opt, oIdx) => {
                        const isCorrectOpt = oIdx === pq.correctIndex;
                        const isPicked = chosenIdx === oIdx;
                        let style =
                          'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/70 hover:border-[#20C7C9]';
                        if (answered) {
                          if (isCorrectOpt) {
                            style =
                              'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isPicked) {
                            style =
                              'border-[#FF8B78] bg-[#FF8B78]/18 text-[#9A2D1F] dark:text-[#FF8B78]';
                          }
                        }
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [pq.id]: oIdx }))
                            }
                            className={`min-h-[44px] p-3 rounded-xl border text-left text-xs sm:text-sm flex items-center gap-2.5 transition-colors cursor-pointer ${style}`}
                          >
                            <span className="font-mono-num font-bold w-6 h-6 rounded-lg bg-[#075985]/10 dark:bg-[#20C7C9]/15 flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedSteps((prev) => ({ ...prev, [pq.id]: !prev[pq.id] }))
                        }
                        className="text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                      >
                        {stepsOpen ? 'Hide Step-by-Step Solution' : 'View Answer & Solution'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openTutorWithPrompt(
                            `Explain this expected SSC CGL ${pq.tier} (${pq.topic}) practice question step by step:\n${pq.questionEn}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075985] dark:text-[#55D6D0] hover:underline cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Ask Examora AI Tutor
                      </button>
                    </div>

                    {stepsOpen && (
                      <div className="rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-4 space-y-2.5 text-xs">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          Correct Answer: ({String.fromCharCode(65 + pq.correctIndex)}){' '}
                          {pq.optionsEn[pq.correctIndex]}
                        </div>
                        <p className="leading-relaxed">{pq.explanation}</p>
                        {pq.stepByStep.length > 0 && (
                          <ol className="list-decimal list-inside space-y-1 text-[#073B50] dark:text-[#8DE1D3]">
                            {pq.stepByStep.map((s, si) => (
                              <li key={si}>{s}</li>
                            ))}
                          </ol>
                        )}
                        <div className="pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 text-[11px] font-semibold text-[#075985] dark:text-[#55D6D0]">
                          Why this prepares you: {pq.usefulnessReason}
                        </div>
                      </div>
                    )}
                  </OceanGlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. PREDICTED MOCK TEST */}
      {subTab === 'mock' && (
        <OceanGlassCard className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#FF8B78]">
                <AlertTriangle className="w-4 h-4" />
                {predictedMockBundle.isEstimatedFormat
                  ? 'Estimated Practice Format (Official Pattern Unannounced)'
                  : 'Official Exam Pattern Format'}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold">
                {predictedMockBundle.mock.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#073B50]/85 dark:text-[#8DE1D3] max-w-2xl">
                {predictedMockBundle.mock.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRunningPredictedMock(true)}
              className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-sm font-extrabold shadow-lg cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              Start {tier} Predicted Mock
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
              <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">Questions</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5">
                {predictedMockBundle.embeddedQuestions.length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
              <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">Duration</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5">
                {predictedMockBundle.mock.durationMinutes} mins
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
              <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">Max Marks</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5">
                {predictedMockBundle.mock.totalMarks}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
              <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">Negative Rule</div>
              <div className="font-mono-num text-xl font-extrabold mt-0.5 text-[#FF8B78]">
                +{predictedMockBundle.mock.marksPerCorrect}/-{predictedMockBundle.mock.negativeMarking}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#075985] dark:text-[#8DE1D3] space-y-1.5">
            <div className="font-bold text-[#062B3D] dark:text-[#F3FAFA]">
              Prioritized Topics Included in This Mock:
            </div>
            <p>
              {predictions
                .slice(0, 10)
                .map((p) => `${p.topic} (${p.confidence})`)
                .join(' · ')}
            </p>
          </div>
        </OceanGlassCard>
      )}

      {/* 5. CURRENT AFFAIRS ANALYSIS */}
      {subTab === 'affairs' && (
        <div className="space-y-5">
          <OceanGlassCard className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {CURRENT_AFFAIRS_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCaCategory(cat)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    caCategory === cat
                      ? 'bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D]'
                      : 'border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={loadingLiveCa}
              onClick={handleFetchLiveCurrentAffairs}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold disabled:opacity-60 cursor-pointer shrink-0"
            >
              {loadingLiveCa ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching Verified Sources...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Fetch Live Verified Updates
                </>
              )}
            </button>
          </OceanGlassCard>

          {caError && (
            <div className="p-3 rounded-xl bg-[#FF8B78]/15 border border-[#FF8B78]/40 text-xs font-semibold text-[#9A2D1F] dark:text-[#FF8B78]">
              {caError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {combinedCurrentAffairs.map((item) => (
              <OceanGlassCard key={item.id} className="p-5 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]">
                      {item.category}
                    </span>
                    <span className="font-mono-num text-[#073B50]/75 dark:text-[#8DE1D3]">
                      {item.publishedDate || 'Verified Brief'}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-base leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#073B50]/90 dark:text-[#F3FAFA]/85 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#8DE1D3]/30 dark:border-[#20C7C9]/20 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-[#075985] dark:text-[#55D6D0]">
                    Exam Focus: {item.examRelevance}
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#075985] dark:text-[#20C7C9] hover:underline"
                  >
                    Source: {item.sourceName}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </OceanGlassCard>
            ))}
          </div>
        </div>
      )}

      {/* 6. PERSONALIZED STUDY PLAN */}
      {subTab === 'plan' && (
        <div className="space-y-5">
          <OceanGlassCard className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#20C7C9]" />
                  Personalized SSC CGL {examYear} ({tier}) Study Roadmap
                </h2>
                <p className="text-xs text-[#075985] dark:text-[#8DE1D3] mt-0.5">
                  Calibrated from your mock scores, weak accuracy subjects (
                  {activePlan.weakSubjects.map((s) => s.toUpperCase()).join(', ')}), and predicted
                  topic priorities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={enhancingPlan}
                  onClick={handleEnhanceStudyPlanWithAi}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#20C7C9]/60 text-xs font-bold text-[#075985] dark:text-[#55D6D0] cursor-pointer"
                >
                  {enhancingPlan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Refine With AI
                </button>
                <button
                  type="button"
                  onClick={handleSaveToStudyPlanner}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save to My Study Planner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Daily Study Hours ({hoursPerDay} hrs/day)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => {
                    setHoursPerDay(Number(e.target.value));
                    setAiEnhancedPlan(null);
                  }}
                  className="w-full accent-[#20C7C9]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Days Remaining Until Exam ({daysUntilExam} days)
                </label>
                <input
                  type="range"
                  min={14}
                  max={365}
                  step={7}
                  value={daysUntilExam}
                  onChange={(e) => {
                    setDaysUntilExam(Number(e.target.value));
                    setAiEnhancedPlan(null);
                  }}
                  className="w-full accent-[#20C7C9]"
                />
              </div>
            </div>

            {planSavedNotice && (
              <div className="p-3 rounded-xl bg-[#20C7C9]/15 border border-[#20C7C9]/45 text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                {planSavedNotice}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-xs space-y-1">
              <div className="font-bold text-[#075985] dark:text-[#55D6D0]">Strategy Summary</div>
              <p>{activePlan.summary}</p>
              <p className="font-semibold pt-1">Weekly Target: {activePlan.weeklyTarget}</p>
            </div>
          </OceanGlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <OceanGlassCard className="lg:col-span-5 p-6 space-y-3">
              <h3 className="font-display font-extrabold text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-[#20C7C9]" />
                Daily Schedule ({hoursPerDay} hrs)
              </h3>
              <div className="space-y-2.5">
                {activePlan.dailyBlocks.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold">{b.topic}</div>
                      <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                        {b.timeSlot} · {b.activityType} · {b.subject}
                      </div>
                    </div>
                    <span className="font-mono-num font-extrabold shrink-0">
                      {b.durationMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            </OceanGlassCard>

            <OceanGlassCard className="lg:col-span-7 p-6 space-y-3">
              <h3 className="font-display font-extrabold text-base">Weekly 7-Day Roadmap</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePlan.weeklySchedule.map((dayItem, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{dayItem.day}</span>
                      <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                        {dayItem.hours}h
                      </span>
                    </div>
                    <div className="font-semibold text-[#075985] dark:text-[#8DE1D3]">
                      {dayItem.focus}
                    </div>
                    <ul className="space-y-0.5 text-[11px] text-[#073B50]/85 dark:text-[#F3FAFA]/85">
                      {dayItem.tasks.map((tk, ti) => (
                        <li key={ti}>• {tk}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </OceanGlassCard>
          </div>
        </div>
      )}

      {/* 7. PREDICTION ACCURACY TRACKING */}
      {subTab === 'accuracy' && (
        <div className="space-y-4">
          <OceanGlassCard className="p-5 text-xs text-[#073B50]/90 dark:text-[#8DE1D3] leading-relaxed">
            <span className="font-bold text-[#062B3D] dark:text-[#F3FAFA]">
              Calibration &amp; Retrospective Audit:
            </span>{' '}
            After official SSC CGL exams conclude and papers are imported, Administrators compare our
            prior topic forecasts against actual observed exam topics to refine subject weightage—without
            claiming guarantees for future shifts.
          </OceanGlassCard>

          {predictionReports.map((rep) => (
            <OceanGlassCard key={rep.id} className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#075985] dark:text-[#55D6D0]">
                    SSC CGL {rep.examYear} · {rep.tier}
                  </div>
                  <h3 className="font-display text-lg font-extrabold mt-0.5">{rep.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {rep.isOutdated && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]">
                      Outdated Report
                    </span>
                  )}
                  <span className="font-mono-num text-lg font-extrabold px-3 py-1 rounded-xl bg-[#20C7C9]/18 text-[#075985] dark:text-[#55D6D0]">
                    {rep.coveragePct}% Topic Match
                  </span>
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-[#F3FAFA] dark:bg-[#062B3D] overflow-hidden border border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
                <div
                  className="h-full bg-gradient-to-r from-[#075985] to-[#20C7C9]"
                  style={{ width: `${Math.min(100, rep.coveragePct)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    Matched Topics ({rep.matchedTopics.length})
                  </div>
                  <p>{rep.matchedTopics.join(', ') || 'None'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/40 dark:border-[#20C7C9]/20">
                  <div className="font-bold text-[#9A2D1F] dark:text-[#FF8B78] mb-1">
                    Missed / Additional Actual Topics ({rep.missedTopics.length})
                  </div>
                  <p>{rep.missedTopics.join(', ') || 'None'}</p>
                </div>
              </div>

              <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">{rep.notes}</p>
            </OceanGlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
