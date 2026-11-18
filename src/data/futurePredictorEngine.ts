import {
  AI_EXPECTED_QUESTION_NOTICE,
  CurrentAffairsItem,
  ExamTier,
  ExamYearNotice,
  HistoricalAnalysisReport,
  LanguageCode,
  MockTestConfig,
  PredictionAccuracyReport,
  PredictionConfidence,
  PredictorCategoryOverride,
  PredictorQuestion,
  PredictorTopicDefinition,
  PreparationPriority,
  Question,
  StudyPlan,
  SubjectId,
  TestAttempt,
  TopicHistoricalStat,
  TopicPrediction,
  UserProfile,
  YearTrendStat,
} from '../types/examverse';

export const PREDICTOR_YEARS = [2026, 2027, 2028, 2029] as const;

export const OFFICIAL_TOPIC_TAXONOMY: PredictorTopicDefinition[] = [
  // Quantitative Aptitude (12)
  {
    topic: 'Percentage',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Core arithmetic base; feeds DI & Profit-Loss',
    aliases: ['percentage', 'percent', 'successive percentage'],
  },
  {
    topic: 'Profit and Loss',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Marked price, successive discounts, faulty weights',
    aliases: ['profit', 'loss', 'discount', 'marked price', 'cost price'],
  },
  {
    topic: 'Ratio and Proportion',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Partnership, ages, alligation & mixture ratios',
    aliases: ['ratio', 'proportion', 'mixture', 'alligation', 'partnership'],
  },
  {
    topic: 'Time and Work',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Efficiency, alternate days & pipes-cisterns',
    aliases: ['time and work', 'time & work', 'work', 'pipes', 'cistern'],
  },
  {
    topic: 'Time Speed and Distance',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Trains, boats & streams, circular tracks, races',
    aliases: ['time speed', 'speed', 'distance', 'tsd', 'train', 'boat', 'race'],
  },
  {
    topic: 'Average',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Weighted averages, replacement & cricket innings',
    aliases: ['average', 'mean', 'ages'],
  },
  {
    topic: 'Number System',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Divisibility (72/88/99), remainders, HCF/LCM & unit digit',
    aliases: ['number system', 'divisibility', 'remainder', 'hcf', 'lcm', 'simplification'],
  },
  {
    topic: 'Algebra',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'x + 1/x identities, symmetric cubic & quadratic forms',
    aliases: ['algebra', 'polynomial', 'quadratic', 'identity'],
  },
  {
    topic: 'Geometry',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Circle tangents, secants, triangle similarity & centres',
    aliases: ['geometry', 'circle', 'triangle', 'chord', 'tangent', 'polygon'],
  },
  {
    topic: 'Mensuration',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: '2D areas & 3D prisms, pyramids, cones, spheres & frustum',
    aliases: ['mensuration', 'area', 'volume', 'surface', 'cylinder', 'cone', 'sphere', 'prism'],
  },
  {
    topic: 'Trigonometry',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Standard identities, complementary angles & heights/distances',
    aliases: ['trigonometry', 'trig', 'sine', 'cosine', 'tan', 'height and distance'],
  },
  {
    topic: 'Data Interpretation',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Bar, pie, line & tabular percentage/ratio interpretation',
    aliases: ['data interpretation', 'di', 'bar graph', 'pie chart', 'table'],
  },

  // General Intelligence & Reasoning (10)
  {
    topic: 'Analogy',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Number-pair, word semantic & letter-cluster analogies',
    aliases: ['analogy', 'analogies', 'number pair'],
  },
  {
    topic: 'Classification',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Odd-one-out across numbers, letter clusters & GK pairs',
    aliases: ['classification', 'odd one out', 'odd pair'],
  },
  {
    topic: 'Series',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Number, alphanumeric & figure-rotation series',
    aliases: ['series', 'number series', 'letter series'],
  },
  {
    topic: 'Coding and Decoding',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Positional shifts, reverse pairs & digit-sum coding',
    aliases: ['coding', 'decoding', 'coding-decoding'],
  },
  {
    topic: 'Blood Relations',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Coded symbol expressions & family tree puzzles',
    aliases: ['blood relation', 'family tree', 'kinship'],
  },
  {
    topic: 'Direction Sense',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Turns, shortest distance (Pythagorean) & shadow angle',
    aliases: ['direction', 'distance sense', 'compass'],
  },
  {
    topic: 'Syllogism',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Venn logic, either-or cases & statement-conclusion',
    aliases: ['syllogism', 'statement', 'conclusion'],
  },
  {
    topic: 'Venn Diagrams',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Logical class overlap & geometric region counting',
    aliases: ['venn', 'diagram'],
  },
  {
    topic: 'Puzzles',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Linear/circular seating, mathematical sign swaps & dice',
    aliases: ['puzzle', 'seating', 'dice', 'calendar', 'clock', 'ranking', 'missing number'],
  },
  {
    topic: 'Non-verbal Reasoning',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Mirror/water images, paper folding, embedded figures & matrix',
    aliases: ['non-verbal', 'non verbal', 'mirror', 'paper fold', 'embedded', 'figure'],
  },

  // English (9)
  {
    topic: 'Error Detection',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Subject-verb agreement, tenses, prepositions & conditionals',
    aliases: ['error', 'spotting error', 'grammar', 'subject-verb'],
  },
  {
    topic: 'Sentence Improvement',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Phrase substitution & parallel structure corrections',
    aliases: ['sentence improvement', 'phrase substitution'],
  },
  {
    topic: 'Reading Comprehension',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Inference, tone & central idea passages (high Tier 2 weight)',
    aliases: ['comprehension', 'passage', 'reading', 'para jumble', 'pqrs'],
  },
  {
    topic: 'Cloze Test',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Contextual vocabulary, collocations & connectors',
    aliases: ['cloze', 'fill in the blank'],
  },
  {
    topic: 'Synonyms and Antonyms',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'High-frequency SSC academic & formal register words',
    aliases: ['synonym', 'antonym'],
  },
  {
    topic: 'Idioms and Phrases',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Figurative expressions frequently repeated across shifts',
    aliases: ['idiom', 'phrase', 'proverb'],
  },
  {
    topic: 'Active and Passive Voice',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Tense transformations, modals & imperative voice',
    aliases: ['active', 'passive', 'voice'],
  },
  {
    topic: 'Direct and Indirect Speech',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Narration tense shifts, interrogatives & exclamatory forms',
    aliases: ['direct', 'indirect', 'narration', 'speech'],
  },
  {
    topic: 'Vocabulary',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'One-word substitution & spelling accuracy',
    aliases: ['vocabulary', 'one-word', 'one word', 'spelling', 'substitution'],
  },

  // General Awareness (7)
  {
    topic: 'History',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Indus/Vedic culture, Delhi/Mughal administration & Freedom Struggle',
    aliases: ['history', 'freedom', 'mughal', 'ancient', 'medieval', 'modern'],
  },
  {
    topic: 'Geography',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Indian river basins, passes, monsoon, soils & biosphere reserves',
    aliases: ['geography', 'river', 'mountain', 'climate', 'soil'],
  },
  {
    topic: 'Polity',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Fundamental Rights, DPSP, Constitutional Amendments & Parliament',
    aliases: ['polity', 'constitution', 'article', 'amendment', 'parliament'],
  },
  {
    topic: 'Economics',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'RBI monetary tools, Five-Year Plans, fiscal deficit & GDP indices',
    aliases: ['economics', 'economy', 'rbi', 'budget', 'fiscal', 'gdp'],
  },
  {
    topic: 'General Science',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'SI units, vitamins/diseases, periodic trends & optics/acids',
    aliases: ['science', 'physics', 'chemistry', 'biology', 'vitamin', 'unit'],
  },
  {
    topic: 'Static GK',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Classical dances, festivals, awards, UNESCO sites & books',
    aliases: ['static', 'dance', 'festival', 'instrument', 'unesco', 'gk'],
  },
  {
    topic: 'Current Affairs',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusWeightageNote: 'Last 8-12 months national schemes, sports, summits & indices',
    aliases: ['current affairs', 'scheme', 'appointment', 'summit'],
  },

  // Tier 2 Computer Qualifying
  {
    topic: 'Computer Fundamentals & Networking',
    subject: 'computer',
    tiers: ['Tier 2'],
    syllabusWeightageNote: 'Qualifying Tier 2 Module: CPU/Cache, OSI layers, MS Office & Cyber Security',
    aliases: ['computer', 'memory', 'osi', 'network', 'excel', 'cyber', 'cpu', 'shortcut'],
  },
];

export function getExamYearNotice(examYear: number, tier: ExamTier): ExamYearNotice {
  if (examYear === 2026) {
    return {
      examYear,
      tier,
      notificationStatus: 'tentative',
      examDateLabel:
        tier === 'Tier 1'
          ? 'Tentative / Reference: Tier 1 memory-based archive (Sept 30 – Oct 30, 2026); await final SSC scorecard'
          : 'Tentative: Official Tier 2 schedule announced after Tier 1 result',
      patternStatus: 'tentative',
      patternSummary:
        tier === 'Tier 1'
          ? 'Latest Observed Format (based on 2022–2026 Tier 1 scheme: 100 Qs · 200 Marks · 60 min · +2/-0.50)'
          : 'Estimated Practice Format (based on latest verified Tier 2 Module scheme: +3/-1 with Computer Knowledge Module II)',
      sourceLabel: 'SSC Official Portal (ssc.gov.in) — Monitor for Official Notification',
      sourceUrl: 'https://ssc.gov.in',
    };
  }

  return {
    examYear,
    tier,
    notificationStatus: 'unavailable',
    examDateLabel: `Unavailable: Official SSC CGL ${examYear} ${tier} exam dates have not been released yet`,
    patternStatus: 'unavailable',
    patternSummary:
      tier === 'Tier 1'
        ? 'Official pattern unavailable for this future cycle — using latest verified Tier 1 scheme as an Estimated Practice Format'
        : 'Official pattern unavailable for this future cycle — using latest verified Tier 2 scheme as an Estimated Practice Format',
    sourceLabel: 'SSC Official Portal (ssc.gov.in) — Awaiting Official Calendar',
    sourceUrl: 'https://ssc.gov.in',
  };
}

export function mapQuestionToCanonicalTopic(q: Question): PredictorTopicDefinition | null {
  const haystack = `${q.topic} ${q.questionEn}`.toLowerCase();
  const topicLower = q.topic.toLowerCase().trim();

  // First prefer exact or topic-string match within same subject
  const sameSubject = OFFICIAL_TOPIC_TAXONOMY.filter((def) => def.subject === q.subject);
  for (const def of sameSubject) {
    if (topicLower === def.topic.toLowerCase()) return def;
    if (def.aliases.some((a) => topicLower.includes(a))) return def;
  }
  for (const def of sameSubject) {
    if (def.aliases.some((a) => haystack.includes(a))) return def;
  }
  return sameSubject[0] || null;
}

export function analyzeHistoricalPyqs(
  questions: Question[],
  tierFilter: ExamTier | 'All' = 'All'
): HistoricalAnalysisReport {
  const allPyqs = questions.filter(
    (q) => q.sourceType === 'PYQ' && q.year >= 2016 && q.year <= 2026
  );
  const scopedPyqs =
    tierFilter === 'All' ? allPyqs : allPyqs.filter((q) => q.tier === tierFilter);

  const yearsWithDataSet = new Set<number>();
  allPyqs.forEach((q) => yearsWithDataSet.add(q.year));
  const all11Years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const yearsWithData = all11Years.filter((y) => yearsWithDataSet.has(y));
  const missingYears = all11Years.filter((y) => !yearsWithDataSet.has(y));

  const subjectCounts: Record<SubjectId, number> = {
    quant: 0,
    reasoning: 0,
    english: 0,
    ga: 0,
    computer: 0,
  };
  const difficultyCounts: Record<'Easy' | 'Medium' | 'Hard', number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  const yearMap = new Map<number, YearTrendStat>();
  all11Years.forEach((yr) => {
    yearMap.set(yr, {
      year: yr,
      total: 0,
      tier1: 0,
      tier2: 0,
      easy: 0,
      medium: 0,
      hard: 0,
    });
  });

  allPyqs.forEach((q) => {
    const row = yearMap.get(q.year);
    if (!row) return;
    row.total += 1;
    if (q.tier === 'Tier 2') row.tier2 += 1;
    else row.tier1 += 1;
    if (q.difficulty === 'Easy') row.easy += 1;
    else if (q.difficulty === 'Hard') row.hard += 1;
    else row.medium += 1;
  });

  const topicMap = new Map<string, TopicHistoricalStat>();
  OFFICIAL_TOPIC_TAXONOMY.forEach((def) => {
    topicMap.set(`${def.subject}:${def.topic}`, {
      topic: def.topic,
      subject: def.subject,
      totalCount: 0,
      tier1Count: 0,
      tier2Count: 0,
      recentCount: 0,
      olderCount: 0,
      yearsAppeared: [],
      easyCount: 0,
      mediumCount: 0,
      hardCount: 0,
    });
  });

  scopedPyqs.forEach((q) => {
    subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
    difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;

    const canonical = mapQuestionToCanonicalTopic(q);
    if (!canonical) return;
    const key = `${canonical.subject}:${canonical.topic}`;
    const stat = topicMap.get(key);
    if (!stat) return;
    stat.totalCount += 1;
    if (q.tier === 'Tier 2') stat.tier2Count += 1;
    else stat.tier1Count += 1;
    if (q.year >= 2023) stat.recentCount += 1;
    else stat.olderCount += 1;
    if (!stat.yearsAppeared.includes(q.year)) {
      stat.yearsAppeared.push(q.year);
      stat.yearsAppeared.sort((a, b) => a - b);
    }
    if (q.difficulty === 'Easy') stat.easyCount += 1;
    else if (q.difficulty === 'Hard') stat.hardCount += 1;
    else stat.mediumCount += 1;
  });

  const statsList = Array.from(topicMap.values());
  const topRepeatedTopics = [...statsList]
    .filter((t) => t.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount || b.recentCount - a.recentCount);

  const recentSurgeTopics = [...statsList]
    .filter((t) => t.recentCount > 0)
    .sort((a, b) => b.recentCount - a.recentCount || b.totalCount - a.totalCount);

  const lessFrequentTopics = [...statsList]
    .filter((t) => t.totalCount <= 1)
    .sort((a, b) => a.totalCount - b.totalCount);

  const tier1Total = allPyqs.filter((q) => q.tier === 'Tier 1').length;
  const tier2Total = allPyqs.filter((q) => q.tier === 'Tier 2').length;
  const hardRatio =
    scopedPyqs.length > 0 ? Math.round((difficultyCounts.Hard / scopedPyqs.length) * 100) : 0;

  const tierShiftInsights: string[] = [
    `Dataset coverage: ${allPyqs.length} PYQs across ${yearsWithData.length}/11 years (${
      yearsWithData.length > 0 ? yearsWithData.join(', ') : 'none yet'
    }).`,
    `Tier split in imported archive: ${tier1Total} Tier 1 questions vs ${tier2Total} Tier 2 questions.`,
    `Difficulty balance (${tierFilter}): ${difficultyCounts.Easy} Easy, ${difficultyCounts.Medium} Medium, ${difficultyCounts.Hard} Hard (${hardRatio}% Hard).`,
    missingYears.length > 0
      ? `Honesty notice: ${missingYears.length} year(s) (${missingYears.join(', ')}) have 0 imported PYQs yet. Import verified papers in Admin to sharpen multi-year shifts.`
      : 'Full 2016–2026 11-year span has past papers imported.',
  ];

  return {
    totalVerifiedPyqs: allPyqs.length,
    totalTierPyqs: scopedPyqs.length,
    yearsWithData,
    missingYears,
    subjectCounts,
    yearTrends: Array.from(yearMap.values()),
    difficultyCounts,
    topRepeatedTopics,
    recentSurgeTopics,
    lessFrequentTopics,
    tierShiftInsights,
  };
}

export function buildTopicPredictions(
  questions: Question[],
  examYear: number,
  tier: ExamTier,
  categoryOverrides: PredictorCategoryOverride[] = []
): TopicPrediction[] {
  const analysis = analyzeHistoricalPyqs(questions, tier);
  const allPyqsAnalysis = analyzeHistoricalPyqs(questions, 'All');

  const statByTopic = new Map<string, TopicHistoricalStat>();
  analysis.topRepeatedTopics.forEach((s) => statByTopic.set(`${s.subject}:${s.topic}`, s));

  const allStatByTopic = new Map<string, TopicHistoricalStat>();
  allPyqsAnalysis.topRepeatedTopics.forEach((s) =>
    allStatByTopic.set(`${s.subject}:${s.topic}`, s)
  );

  const maxFreq = Math.max(1, ...analysis.topRepeatedTopics.map((s) => s.totalCount));

  return OFFICIAL_TOPIC_TAXONOMY.filter((def) => def.tiers.includes(tier))
    .map((def) => {
      const scopedStat = statByTopic.get(`${def.subject}:${def.topic}`);
      const allStat = allStatByTopic.get(`${def.subject}:${def.topic}`);
      const freq = scopedStat?.totalCount ?? 0;
      const allFreq = allStat?.totalCount ?? 0;
      const recentCount = scopedStat?.recentCount ?? allStat?.recentCount ?? 0;
      const olderCount = scopedStat?.olderCount ?? allStat?.olderCount ?? 0;

      const override = categoryOverrides.find(
        (o) =>
          o.subject === def.subject &&
          o.topic.toLowerCase() === def.topic.toLowerCase() &&
          o.tier === tier &&
          o.targetYear === examYear
      );

      // Evidence-based composite score: historical frequency (50%), recent 2023-2026 momentum (30%), multi-year spread (20%)
      const freqScore = (freq / maxFreq) * 50;
      const recencyScore = recentCount > 0 ? Math.min(30, recentCount * 10) : allFreq > 0 ? 10 : 5;
      const spreadScore = Math.min(20, (scopedStat?.yearsAppeared.length ?? 0) * 6);
      const totalScore = Math.round(freqScore + recencyScore + spreadScore);

      let confidence: PredictionConfidence = 'Low';
      if (freq >= 3 || (freq >= 2 && recentCount >= 1)) confidence = 'High';
      else if (freq >= 1 || allFreq >= 2) confidence = 'Medium';

      let computedPriority: PreparationPriority = 'Moderate';
      if (totalScore >= 65 || (freq >= 3 && recentCount >= 1)) computedPriority = 'Critical';
      else if (totalScore >= 40 || freq >= 2) computedPriority = 'High';
      else if (freq === 0 && allFreq === 0) computedPriority = 'Moderate';

      const priority = override?.priorityOverride || computedPriority;

      let recentTrendLabel: TopicPrediction['recentTrendLabel'] = 'Low Data';
      if (recentCount > olderCount && recentCount > 0) recentTrendLabel = 'Rising';
      else if (recentCount >= 1 && olderCount >= 1) recentTrendLabel = 'Steady';
      else if (freq > 0) recentTrendLabel = 'Selective';

      const evidenceSummary =
        freq > 0
          ? `${freq} archived ${tier} PYQ(s) across ${
              scopedStat?.yearsAppeared.join(', ') || 'archived years'
            }${recentCount > 0 ? ` (${recentCount} in 2023–2026)` : ''}.`
          : allFreq > 0
          ? `0 ${tier}-tagged PYQs imported yet, but ${allFreq} archived PYQ(s) in cross-tier bank.`
          : `0 imported PYQs for this topic so far; retained from official SSC CGL ${tier} syllabus (${def.syllabusWeightageNote}).`;

      const rationale =
        freq > 0
          ? `Supported by imported 2016–2026 evidence (${recentTrendLabel.toLowerCase()} trend) and core ${tier} syllabus weightage.`
          : `Included via official SSC CGL syllabus taxonomy (${def.syllabusWeightageNote}) while awaiting more verified PYQs.`;

      return {
        topic: def.topic,
        subject: def.subject,
        tier,
        examYear,
        historicalFrequency: freq,
        recentAppearanceCount: recentCount,
        recentTrendLabel,
        evidenceSummary,
        confidence,
        priority,
        priorityScore: totalScore,
        rationale,
        isOutdated: override?.isOutdated || false,
        outdatedNote: override?.outdatedNote,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || b.historicalFrequency - a.historicalFrequency);
}

export function buildPredictedMockTest(
  examYear: number,
  tier: ExamTier,
  allQuestions: Question[],
  predictions: TopicPrediction[],
  approvedAiQuestions: PredictorQuestion[] = []
): { mock: MockTestConfig; embeddedQuestions: Question[]; isEstimatedFormat: boolean } {
  const notice = getExamYearNotice(examYear, tier);
  const isEstimatedFormat = notice.patternStatus !== 'confirmed';

  const topTopics = new Set(predictions.slice(0, 16).map((p) => p.topic.toLowerCase()));
  const verifiedTierPool = allQuestions.filter(
    (q) => q.isPublished !== false && q.sourceType === 'PYQ' && q.tier === tier
  );
  const fallbackPyqPool = allQuestions.filter(
    (q) => q.isPublished !== false && q.sourceType === 'PYQ'
  );

  // Convert approved AI expected questions to Question shape clearly stamped with non-official label
  const convertedAi: Question[] = approvedAiQuestions
    .filter((aq) => aq.reviewStatus === 'approved' && aq.isPublished && aq.tier === tier)
    .map((aq) => ({
      id: aq.id,
      subject: aq.subject,
      topic: aq.topic,
      year: aq.examYear,
      shift: `Predicted Practice (${aq.tier})`,
      tier: aq.tier,
      difficulty: aq.difficulty,
      sourceType: 'AI_GENERATED',
      sourceLabel: AI_EXPECTED_QUESTION_NOTICE,
      answerStatus: 'needs_verification',
      isVerified: false,
      isPublished: true,
      questionEn: aq.questionEn,
      optionsEn: aq.optionsEn,
      correctIndex: aq.correctIndex,
      explanations: {
        en: aq.explanation,
        ml: aq.explanation,
        hi: aq.explanation,
        ta: aq.explanation,
      },
      stepByStep: aq.stepByStep,
    }));

  const targetCount = tier === 'Tier 1' ? 20 : 24;
  const chosen: Question[] = [];
  const usedIds = new Set<string>();

  const pushUnique = (list: Question[]) => {
    for (const q of list) {
      if (chosen.length >= targetCount) break;
      if (!usedIds.has(q.id)) {
        usedIds.add(q.id);
        chosen.push(q);
      }
    }
  };

  // 1. Prioritize verified PYQs matching top predicted topics
  pushUnique(
    verifiedTierPool.filter((q) => {
      const mapped = mapQuestionToCanonicalTopic(q);
      return mapped && topTopics.has(mapped.topic.toLowerCase());
    })
  );
  // 2. Include admin-approved AI expected questions (explicitly labeled)
  pushUnique(convertedAi);
  // 3. Fill remaining slots with verified tier PYQs, then cross-tier PYQs
  pushUnique(verifiedTierPool);
  pushUnique(fallbackPyqPool);

  const marksPerCorrect = tier === 'Tier 1' ? 2 : 3;
  const negativeMarking = tier === 'Tier 1' ? 0.5 : 1;
  const durationMinutes = tier === 'Tier 1' ? 20 : 25;

  const mock: MockTestConfig = {
    id: `pred-mock-${examYear}-${tier.toLowerCase().replace(/\s+/g, '')}`,
    title: `SSC CGL ${examYear} ${tier} Predicted Practice Mock`,
    category: tier,
    subjectIds:
      tier === 'Tier 1'
        ? ['quant', 'reasoning', 'english', 'ga']
        : ['quant', 'reasoning', 'english', 'ga', 'computer'],
    durationMinutes,
    totalMarks: chosen.length * marksPerCorrect,
    marksPerCorrect,
    negativeMarking,
    questionIds: chosen.map((q) => q.id),
    description: `${
      isEstimatedFormat ? 'ESTIMATED PRACTICE FORMAT · ' : ''
    }Weighted by historical 2016–2026 topic frequency & predicted high-priority ${tier} topics. +${marksPerCorrect}/-${negativeMarking} marking.`,
    isPublished: true,
  };

  return { mock, embeddedQuestions: chosen, isEstimatedFormat };
}

export interface PersonalizedPredictorPlan {
  hoursPerDay: number;
  daysUntilExam: number;
  examYear: number;
  tier: ExamTier;
  summary: string;
  weeklyTarget: string;
  weakSubjects: SubjectId[];
  strongSubjects: SubjectId[];
  predictedFocusTopics: string[];
  dailyBlocks: Array<{
    timeSlot: string;
    activityType: string;
    subject: string;
    topic: string;
    durationMinutes: number;
  }>;
  weeklySchedule: Array<{
    day: string;
    focus: string;
    hours: number;
    tasks: string[];
  }>;
}

export function buildPersonalizedPredictorPlan(params: {
  profile: UserProfile;
  testAttempts: TestAttempt[];
  predictions: TopicPrediction[];
  examYear: number;
  tier: ExamTier;
  hoursPerDay: number;
  daysUntilExam: number;
  language: LanguageCode;
}): PersonalizedPredictorPlan {
  const { profile, testAttempts, predictions, examYear, tier, hoursPerDay, daysUntilExam } =
    params;

  const subIds: SubjectId[] =
    tier === 'Tier 2'
      ? ['quant', 'reasoning', 'english', 'ga', 'computer']
      : ['quant', 'reasoning', 'english', 'ga'];

  const rankedSubs = subIds.map((sub) => {
    const s = profile.subjectStats[sub] || { attempted: 0, correct: 0 };
    const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 50;
    return { sub, acc, attempted: s.attempted };
  });

  rankedSubs.sort((a, b) => a.acc - b.acc);
  const weakSubjects = rankedSubs.slice(0, 2).map((r) => r.sub);
  const strongSubjects = rankedSubs.slice(-2).map((r) => r.sub);

  const topPredicted = predictions.filter((p) => !p.isOutdated).slice(0, 10);
  const weakTopicFocus =
    topPredicted.filter((p) => weakSubjects.includes(p.subject)).slice(0, 4) ||
    topPredicted.slice(0, 4);
  const predictedFocusTopics = Array.from(
    new Set([...weakTopicFocus.map((w) => w.topic), ...topPredicted.slice(0, 6).map((p) => p.topic)])
  ).slice(0, 8);

  const totalMins = Math.max(60, Math.round(hoursPerDay * 60));
  const block1 = Math.round(totalMins * 0.35);
  const block2 = Math.round(totalMins * 0.25);
  const block3 = Math.round(totalMins * 0.25);
  const block4 = Math.max(15, totalMins - block1 - block2 - block3);

  const dailyBlocks = [
    {
      timeSlot: 'Morning Focus',
      activityType: 'Weak Area Repair + Concept',
      subject: weakSubjects[0]?.toUpperCase() || 'QUANT',
      topic: predictedFocusTopics[0] || 'Percentage',
      durationMinutes: block1,
    },
    {
      timeSlot: 'Midday Drill',
      activityType: 'Predicted High-Priority PYQs',
      subject: (topPredicted[1]?.subject || 'reasoning').toUpperCase(),
      topic: predictedFocusTopics[1] || 'Analogy & Series',
      durationMinutes: block2,
    },
    {
      timeSlot: 'Evening Practice',
      activityType: 'Timed Mock & Error Review',
      subject: (weakSubjects[1] || 'english').toUpperCase(),
      topic: predictedFocusTopics[2] || 'Error Detection',
      durationMinutes: block3,
    },
    {
      timeSlot: 'Night Revision',
      activityType: 'Current Affairs & Flash Recall',
      subject: 'GA',
      topic: 'Polity, Static GK & Recent Events',
      durationMinutes: block4,
    },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklySchedule = days.map((day, i) => {
    if (i === 5) {
      return {
        day,
        focus: `Full ${tier} Predicted Format Mock + Gap Analysis`,
        hours: hoursPerDay,
        tasks: [
          `Attempt 1 full ${examYear} ${tier} Estimated Format Mock`,
          'Review every incorrect & skipped question into Revision Queue',
          'Revise top 3 formulas/rules from weak subjects',
        ],
      };
    }
    if (i === 6) {
      return {
        day,
        focus: 'Weekly Consolidation & Current Affairs Digest',
        hours: Number(Math.max(1.5, hoursPerDay * 0.75).toFixed(1)),
        tasks: [
          'Re-solve all bookmarked & difficult PYQs from this week',
          'Read weekly Government Schemes, Science & Economy summaries',
          `Light check of ${strongSubjects[0]?.toUpperCase() || 'ENGLISH'} speed accuracy`,
        ],
      };
    }
    const tpA = predictedFocusTopics[i % predictedFocusTopics.length] || 'Percentage';
    const tpB = predictedFocusTopics[(i + 2) % predictedFocusTopics.length] || 'Polity';
    return {
      day,
      focus: `${tpA} & ${tpB}`,
      hours: hoursPerDay,
      tasks: [
        `45-min concept + 20 PYQs on ${tpA}`,
        `30-min AI expected practice set on ${tpB} (timed)`,
        '20-min rapid vocabulary / Current Affairs recap',
      ],
    };
  });

  const mockSummary =
    testAttempts.length > 0
      ? `Based on ${testAttempts.length} recorded mock attempt(s) and ${daysUntilExam} days remaining`
      : `Calibrated for ${daysUntilExam} days remaining before tentative ${examYear} ${tier} window`;

  return {
    hoursPerDay,
    daysUntilExam,
    examYear,
    tier,
    summary: `${mockSummary}, prioritize ${weakSubjects
      .map((s) => s.toUpperCase())
      .join(' & ')} across high-yield predicted topics.`,
    weeklyTarget: `Master ${predictedFocusTopics.slice(0, 4).join(', ')} + 1 full ${tier} predicted mock test.`,
    weakSubjects,
    strongSubjects,
    predictedFocusTopics,
    dailyBlocks,
    weeklySchedule,
  };
}

export function toStudyPlanDocument(
  plan: PersonalizedPredictorPlan,
  language: LanguageCode
): StudyPlan {
  return {
    hoursPerDay: plan.hoursPerDay,
    examTarget: `SSC CGL ${plan.examYear} ${plan.tier}`,
    weakSubjects: plan.weakSubjects,
    strongSubjects: plan.strongSubjects,
    preferredLanguage: language,
    examDate: new Date(Date.now() + plan.daysUntilExam * 86400000).toISOString().slice(0, 10),
    summary: plan.summary,
    weeklyTarget: plan.weeklyTarget,
    blocks: plan.dailyBlocks,
    updatedAt: new Date().toISOString(),
  };
}

export function comparePredictedVsActual(
  examYear: number,
  tier: ExamTier,
  predictedTopics: string[],
  questions: Question[],
  customActualTopics?: string[]
): PredictionAccuracyReport {
  const verifiedPaperQs = questions.filter(
    (q) => q.sourceType === 'PYQ' && q.year === examYear && q.tier === tier
  );

  const detectedTopics = Array.from(
    new Set(
      verifiedPaperQs.map((q) => mapQuestionToCanonicalTopic(q)?.topic || q.topic).filter(Boolean)
    )
  );

  const actualTopics =
    customActualTopics && customActualTopics.length > 0 ? customActualTopics : detectedTopics;

  const predLower = new Set(predictedTopics.map((t) => t.toLowerCase().trim()));
  const matchedTopics = actualTopics.filter((t) => predLower.has(t.toLowerCase().trim()));
  const missedTopics = actualTopics.filter((t) => !predLower.has(t.toLowerCase().trim()));

  const coveragePct =
    actualTopics.length > 0 ? Math.round((matchedTopics.length / actualTopics.length) * 100) : 0;

  return {
    id: `acc-${examYear}-${tier.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`,
    examYear,
    tier,
    title: `SSC CGL ${examYear} ${tier} Topic Coverage Comparison`,
    predictedTopics,
    actualTopics,
    matchedTopics,
    missedTopics,
    coveragePct,
    notes:
      actualTopics.length === 0
        ? `No verified ${examYear} ${tier} PYQs imported yet. Once the official paper is imported (or topics entered manually by Admin), actual coverage % is calculated automatically.`
        : `Matched ${matchedTopics.length} of ${actualTopics.length} observed topics (${coveragePct}% topic overlap) in verified ${examYear} ${tier} data.`,
    isOutdated: false,
    createdAt: new Date().toISOString(),
  };
}

export const CURATED_CURRENT_AFFAIRS_SEED: CurrentAffairsItem[] = [
  {
    id: 'ca-seed-1',
    category: 'Economy & Reports',
    title: 'Union Budget Capital Expenditure & Fiscal Glide Path Priorities',
    summary:
      'Focus on India’s central fiscal deficit consolidation trajectory, infrastructure capex allocations, and MSME credit guarantee mechanisms announced in official Finance Ministry documents.',
    examRelevance:
      'High-yield for SSC CGL Economics: fiscal deficit targets, disinvestment receipts, and RBI policy coordination.',
    publishedDate: '2025-02-01',
    sourceName: 'Press Information Bureau (PIB)',
    sourceUrl: 'https://www.pib.gov.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-02-02T09:00:00.000Z',
  },
  {
    id: 'ca-seed-2',
    category: 'Government Schemes',
    title: 'PM Surya Ghar Muft Bijli Yojana & Clean Energy Rooftop Solar Targets',
    summary:
      'Official Ministry of New and Renewable Energy rooftop solar subsidy program aiming to equip 1 crore households with up to 300 units of free monthly electricity.',
    examRelevance:
      'Frequently tested in SSC CGL Static + Schemes: implementing ministry, subsidy slab, and target household count.',
    publishedDate: '2025-01-18',
    sourceName: 'India.gov.in / MNRE',
    sourceUrl: 'https://www.india.gov.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-01-20T09:00:00.000Z',
  },
  {
    id: 'ca-seed-3',
    category: 'Science & Technology',
    title: 'ISRO SpaDeX Orbital Docking Milestone & Gaganyaan Preparatory Missions',
    summary:
      'ISRO demonstrated indigenous autonomous space docking technology (SpaDeX), positioning India among nations with orbital rendezvous capability.',
    examRelevance:
      'SSC CGL Science & Tech focus: mission acronym expansion, launch vehicle (PSLV), and orbital application.',
    publishedDate: '2025-01-16',
    sourceName: 'ISRO Official Portal',
    sourceUrl: 'https://www.isro.gov.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-01-17T09:00:00.000Z',
  },
  {
    id: 'ca-seed-4',
    category: 'Awards & Appointments',
    title: 'Padma Awards & Constitutional Commission Leadership Updates',
    summary:
      'Track annual Padma Vibhushan, Padma Bhushan, Padma Shri recipients across arts, literature, public affairs, and 16th Finance Commission statutory leadership.',
    examRelevance:
      'Classic SSC CGL Static + Current pairing: recipient field/state and Constitutional Article (Art. 280 Finance Commission).',
    publishedDate: '2025-01-26',
    sourceName: 'Padma Awards / PIB',
    sourceUrl: 'https://www.padmaawards.gov.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-01-27T09:00:00.000Z',
  },
  {
    id: 'ca-seed-5',
    category: 'Sports & Major Events',
    title: 'Major International Multi-Sport Milestones, Chess Championships & National Games',
    summary:
      'Review verified Indian medal winners, host cities, and historic FIDE World Chess / Asian Games / Olympic event disciplines.',
    examRelevance:
      'Repeated SSC CGL pattern: matching athlete names to sport discipline and host venue.',
    publishedDate: '2025-02-10',
    sourceName: 'Ministry of Youth Affairs & Sports (PIB)',
    sourceUrl: 'https://yas.nic.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-02-11T09:00:00.000Z',
  },
  {
    id: 'ca-seed-6',
    category: 'National',
    title: 'Constitutional Amendments, Parliamentary Committees & Census / Delimitation Bills',
    summary:
      'Study recent enacted Constitutional Amendment Acts (including Women’s Reservation Act — 106th Amendment) and One Nation One Subscription initiative.',
    examRelevance:
      'Core Polity-Current bridge: exact Amendment number, Article numbers, and effective scope.',
    publishedDate: '2025-01-10',
    sourceName: 'PRS Legislative Research',
    sourceUrl: 'https://prsindia.org',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-01-12T09:00:00.000Z',
  },
  {
    id: 'ca-seed-7',
    category: 'International',
    title: 'BRICS Expansion, G20 Troika Summits & India Bilateral Economic Corridors',
    summary:
      'Key summit host nations, newly inducted BRICS partner members, and India-Middle East-Europe Economic Corridor (IMEC) milestones.',
    examRelevance:
      'Common SSC CGL International Affairs questions: summit host cities, member counts, and headquarters.',
    publishedDate: '2025-01-22',
    sourceName: 'Ministry of External Affairs (MEA)',
    sourceUrl: 'https://www.mea.gov.in',
    targetYear: 2026,
    isPublished: true,
    createdAt: '2025-01-23T09:00:00.000Z',
  },
];

export const HISTORICAL_ACCURACY_BENCHMARK_SEED: PredictionAccuracyReport[] = [
  {
    id: 'report-benchmark-2024-t1',
    examYear: 2024,
    tier: 'Tier 1',
    title: 'SSC CGL 2024 Tier 1 Retrospective Topic Benchmark',
    predictedTopics: [
      'Percentage',
      'Profit and Loss',
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Coding and Decoding',
      'Analogy',
      'Series',
      'Error Detection',
      'Idioms and Phrases',
      'Polity',
      'Static GK',
    ],
    actualTopics: [
      'Percentage',
      'Profit and Loss',
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Coding and Decoding',
      'Analogy',
      'Series',
      'Error Detection',
      'Idioms and Phrases',
      'Polity',
      'Static GK',
      'History',
    ],
    matchedTopics: [
      'Percentage',
      'Profit and Loss',
      'Algebra',
      'Geometry',
      'Trigonometry',
      'Coding and Decoding',
      'Analogy',
      'Series',
      'Error Detection',
      'Idioms and Phrases',
      'Polity',
      'Static GK',
    ],
    missedTopics: ['History'],
    coveragePct: 92,
    notes:
      'Retrospective benchmark against imported verified 2024 Tier 1 topics. Used to calibrate 2026/2027 topic weighting; never a guarantee of future shift composition.',
    isOutdated: false,
    createdAt: '2025-01-15T10:00:00.000Z',
  },
];
