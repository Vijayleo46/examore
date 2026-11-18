import 'dart:math';

const String aiExpectedQuestionNotice =
    'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION';

const List<int> predictorYears = [2026, 2027, 2028, 2029];

const List<String> currentAffairsCategories = [
  'All',
  'National',
  'International',
  'Government Schemes',
  'Awards & Appointments',
  'Science & Technology',
  'Economy & Reports',
  'Sports & Major Events',
];

class PredictorTopicDef {
  final String topic;
  final String subject;
  final List<String> tiers;
  final String syllabusNote;
  final List<String> aliases;

  const PredictorTopicDef({
    required this.topic,
    required this.subject,
    required this.tiers,
    required this.syllabusNote,
    required this.aliases,
  });
}

const List<PredictorTopicDef> officialTopicTaxonomy = [
  // Quantitative Aptitude (12)
  PredictorTopicDef(
    topic: 'Percentage',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Core arithmetic base; feeds DI & Profit-Loss',
    aliases: ['percentage', 'percent', 'successive'],
  ),
  PredictorTopicDef(
    topic: 'Profit and Loss',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Marked price, successive discounts, faulty weights',
    aliases: ['profit', 'loss', 'discount', 'marked price'],
  ),
  PredictorTopicDef(
    topic: 'Ratio and Proportion',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Partnership, ages, alligation & mixture ratios',
    aliases: ['ratio', 'proportion', 'mixture', 'alligation', 'partnership'],
  ),
  PredictorTopicDef(
    topic: 'Time and Work',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Efficiency, alternate days & pipes-cisterns',
    aliases: ['time and work', 'time & work', 'work', 'pipes', 'cistern'],
  ),
  PredictorTopicDef(
    topic: 'Time Speed and Distance',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Trains, boats & streams, circular tracks, races',
    aliases: ['time speed', 'speed', 'distance', 'tsd', 'train', 'boat', 'race'],
  ),
  PredictorTopicDef(
    topic: 'Average',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Weighted averages, replacement & innings',
    aliases: ['average', 'mean', 'ages'],
  ),
  PredictorTopicDef(
    topic: 'Number System',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Divisibility (72/88/99), remainders, HCF/LCM & unit digit',
    aliases: ['number system', 'divisibility', 'remainder', 'hcf', 'lcm', 'simplification'],
  ),
  PredictorTopicDef(
    topic: 'Algebra',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'x + 1/x identities, symmetric cubic & quadratic forms',
    aliases: ['algebra', 'polynomial', 'quadratic', 'identity'],
  ),
  PredictorTopicDef(
    topic: 'Geometry',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Circle tangents, secants, triangle similarity & centres',
    aliases: ['geometry', 'circle', 'triangle', 'chord', 'tangent', 'polygon'],
  ),
  PredictorTopicDef(
    topic: 'Mensuration',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: '2D areas & 3D prisms, pyramids, cones, spheres & frustum',
    aliases: ['mensuration', 'area', 'volume', 'surface', 'cylinder', 'cone', 'sphere', 'prism'],
  ),
  PredictorTopicDef(
    topic: 'Trigonometry',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Standard identities, complementary angles & heights/distances',
    aliases: ['trigonometry', 'trig', 'sine', 'cosine', 'tan', 'height and distance'],
  ),
  PredictorTopicDef(
    topic: 'Data Interpretation',
    subject: 'quant',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Bar, pie, line & tabular percentage/ratio interpretation',
    aliases: ['data interpretation', 'di', 'bar graph', 'pie chart', 'table'],
  ),

  // General Intelligence & Reasoning (10)
  PredictorTopicDef(
    topic: 'Analogy',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Number-pair, word semantic & letter-cluster analogies',
    aliases: ['analogy', 'analogies', 'number pair'],
  ),
  PredictorTopicDef(
    topic: 'Classification',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Odd-one-out across numbers, letter clusters & GK pairs',
    aliases: ['classification', 'odd one out', 'odd pair'],
  ),
  PredictorTopicDef(
    topic: 'Series',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Number, alphanumeric & figure-rotation series',
    aliases: ['series', 'number series', 'letter series'],
  ),
  PredictorTopicDef(
    topic: 'Coding and Decoding',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Positional shifts, reverse pairs & digit-sum coding',
    aliases: ['coding', 'decoding', 'coding-decoding'],
  ),
  PredictorTopicDef(
    topic: 'Blood Relations',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Coded symbol expressions & family tree puzzles',
    aliases: ['blood relation', 'family tree', 'kinship'],
  ),
  PredictorTopicDef(
    topic: 'Direction Sense',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Turns, shortest distance (Pythagorean) & shadow angle',
    aliases: ['direction', 'distance sense', 'compass'],
  ),
  PredictorTopicDef(
    topic: 'Syllogism',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Venn logic, either-or cases & statement-conclusion',
    aliases: ['syllogism', 'statement', 'conclusion'],
  ),
  PredictorTopicDef(
    topic: 'Venn Diagrams',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Logical class overlap & geometric region counting',
    aliases: ['venn', 'diagram'],
  ),
  PredictorTopicDef(
    topic: 'Puzzles',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Linear/circular seating, mathematical sign swaps & dice',
    aliases: ['puzzle', 'seating', 'dice', 'calendar', 'clock', 'ranking', 'missing number'],
  ),
  PredictorTopicDef(
    topic: 'Non-verbal Reasoning',
    subject: 'reasoning',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Mirror/water images, paper folding, embedded figures & matrix',
    aliases: ['non-verbal', 'non verbal', 'mirror', 'paper fold', 'embedded', 'figure'],
  ),

  // English (9)
  PredictorTopicDef(
    topic: 'Error Detection',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Subject-verb agreement, tenses, prepositions & conditionals',
    aliases: ['error', 'spotting error', 'grammar', 'subject-verb'],
  ),
  PredictorTopicDef(
    topic: 'Sentence Improvement',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Phrase substitution & parallel structure corrections',
    aliases: ['sentence improvement', 'phrase substitution'],
  ),
  PredictorTopicDef(
    topic: 'Reading Comprehension',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Inference, tone & central idea passages (high Tier 2 weight)',
    aliases: ['comprehension', 'passage', 'reading', 'para jumble', 'pqrs'],
  ),
  PredictorTopicDef(
    topic: 'Cloze Test',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Contextual vocabulary, collocations & connectors',
    aliases: ['cloze', 'fill in the blank'],
  ),
  PredictorTopicDef(
    topic: 'Synonyms and Antonyms',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'High-frequency SSC academic & formal register words',
    aliases: ['synonym', 'antonym'],
  ),
  PredictorTopicDef(
    topic: 'Idioms and Phrases',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Figurative expressions frequently repeated across shifts',
    aliases: ['idiom', 'phrase', 'proverb'],
  ),
  PredictorTopicDef(
    topic: 'Active and Passive Voice',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Tense transformations, modals & imperative voice',
    aliases: ['active', 'passive', 'voice'],
  ),
  PredictorTopicDef(
    topic: 'Direct and Indirect Speech',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Narration tense shifts, interrogatives & exclamatory forms',
    aliases: ['direct', 'indirect', 'narration', 'speech'],
  ),
  PredictorTopicDef(
    topic: 'Vocabulary',
    subject: 'english',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'One-word substitution & spelling accuracy',
    aliases: ['vocabulary', 'one-word', 'one word', 'spelling', 'substitution'],
  ),

  // General Awareness (7)
  PredictorTopicDef(
    topic: 'History',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Indus/Vedic culture, Delhi/Mughal administration & Freedom Struggle',
    aliases: ['history', 'freedom', 'mughal', 'ancient', 'medieval', 'modern'],
  ),
  PredictorTopicDef(
    topic: 'Geography',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Indian river basins, passes, monsoon, soils & biosphere reserves',
    aliases: ['geography', 'river', 'mountain', 'climate', 'soil'],
  ),
  PredictorTopicDef(
    topic: 'Polity',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Fundamental Rights, DPSP, Constitutional Amendments & Parliament',
    aliases: ['polity', 'constitution', 'article', 'amendment', 'parliament'],
  ),
  PredictorTopicDef(
    topic: 'Economics',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'RBI monetary tools, Five-Year Plans, fiscal deficit & GDP indices',
    aliases: ['economics', 'economy', 'rbi', 'budget', 'fiscal', 'gdp'],
  ),
  PredictorTopicDef(
    topic: 'General Science',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'SI units, vitamins/diseases, periodic trends & optics/acids',
    aliases: ['science', 'physics', 'chemistry', 'biology', 'vitamin', 'unit'],
  ),
  PredictorTopicDef(
    topic: 'Static GK',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Classical dances, festivals, awards, UNESCO sites & books',
    aliases: ['static', 'dance', 'festival', 'instrument', 'unesco', 'gk'],
  ),
  PredictorTopicDef(
    topic: 'Current Affairs',
    subject: 'ga',
    tiers: ['Tier 1', 'Tier 2'],
    syllabusNote: 'Last 8-12 months national schemes, sports, summits & indices',
    aliases: ['current affairs', 'scheme', 'appointment', 'summit'],
  ),

  // Tier 2 Computer Qualifying
  PredictorTopicDef(
    topic: 'Computer Fundamentals & Networking',
    subject: 'computer',
    tiers: ['Tier 2'],
    syllabusNote: 'Qualifying Tier 2 Module: CPU/Cache, OSI layers, MS Office & Cyber Security',
    aliases: ['computer', 'memory', 'osi', 'network', 'excel', 'cyber', 'cpu', 'shortcut'],
  ),
];

class ExamYearNotice {
  final int examYear;
  final String tier;
  final String notificationStatus; // 'confirmed' | 'tentative' | 'unavailable'
  final String examDateLabel;
  final String patternStatus; // 'confirmed' | 'tentative' | 'unavailable'
  final String patternSummary;
  final String sourceLabel;
  final String sourceUrl;

  const ExamYearNotice({
    required this.examYear,
    required this.tier,
    required this.notificationStatus,
    required this.examDateLabel,
    required this.patternStatus,
    required this.patternSummary,
    required this.sourceLabel,
    required this.sourceUrl,
  });
}

ExamYearNotice getExamYearNotice(int examYear, String tier) {
  if (examYear == 2026) {
    return ExamYearNotice(
      examYear: examYear,
      tier: tier,
      notificationStatus: 'tentative',
      examDateLabel: tier == 'Tier 1'
          ? 'Tentative: Official SSC CGL 2026 calendar notification pending confirmation'
          : 'Tentative: Official Tier 2 schedule announced after Tier 1 result',
      patternStatus: 'tentative',
      patternSummary: tier == 'Tier 1'
          ? 'Estimated Practice Format (based on verified 2022–2025 Tier 1 scheme: 100 Qs · 200 Marks · 60 min · +2/-0.50)'
          : 'Estimated Practice Format (based on verified Tier 2 Module scheme: +3/-1 with Computer Knowledge Module II)',
      sourceLabel: 'SSC Official Portal (ssc.gov.in)',
      sourceUrl: 'https://ssc.gov.in',
    );
  }
  return ExamYearNotice(
    examYear: examYear,
    tier: tier,
    notificationStatus: 'unavailable',
    examDateLabel:
        'Unavailable: Official SSC CGL $examYear $tier exam dates have not been released yet',
    patternStatus: 'unavailable',
    patternSummary: tier == 'Tier 1'
        ? 'Official pattern unavailable — using latest verified Tier 1 scheme as an Estimated Practice Format'
        : 'Official pattern unavailable — using latest verified Tier 2 scheme as an Estimated Practice Format',
    sourceLabel: 'SSC Official Portal (ssc.gov.in)',
    sourceUrl: 'https://ssc.gov.in',
  );
}

PredictorTopicDef? mapQuestionToCanonicalTopic(Map<String, dynamic> q) {
  final subject = (q['subject'] ?? 'quant').toString().toLowerCase();
  final topicStr = (q['topic'] ?? '').toString().toLowerCase().trim();
  final qText = (q['questionEn'] ?? '').toString().toLowerCase();
  final haystack = '$topicStr $qText';

  final sameSub = officialTopicTaxonomy
      .where((def) => def.subject == subject)
      .toList();
  for (final def in sameSub) {
    if (topicStr == def.topic.toLowerCase()) return def;
    if (def.aliases.any((a) => topicStr.contains(a))) return def;
  }
  for (final def in sameSub) {
    if (def.aliases.any((a) => haystack.contains(a))) return def;
  }
  return sameSub.isNotEmpty ? sameSub.first : null;
}

class TopicHistoricalStat {
  final String topic;
  final String subject;
  int totalCount = 0;
  int tier1Count = 0;
  int tier2Count = 0;
  int recentCount = 0;
  int olderCount = 0;
  final List<int> yearsAppeared = [];

  TopicHistoricalStat({required this.topic, required this.subject});
}

class YearTrendStat {
  final int year;
  int total = 0;
  int tier1 = 0;
  int tier2 = 0;

  YearTrendStat(this.year);
}

class HistoricalAnalysisReport {
  final int totalVerifiedPyqs;
  final int totalTierPyqs;
  final List<int> yearsWithData;
  final List<int> missingYears;
  final Map<String, int> subjectCounts;
  final Map<String, int> difficultyCounts;
  final List<YearTrendStat> yearTrends;
  final List<TopicHistoricalStat> topRepeatedTopics;
  final List<TopicHistoricalStat> recentSurgeTopics;
  final List<TopicHistoricalStat> lessFrequentTopics;
  final List<String> tierShiftInsights;

  const HistoricalAnalysisReport({
    required this.totalVerifiedPyqs,
    required this.totalTierPyqs,
    required this.yearsWithData,
    required this.missingYears,
    required this.subjectCounts,
    required this.difficultyCounts,
    required this.yearTrends,
    required this.topRepeatedTopics,
    required this.recentSurgeTopics,
    required this.lessFrequentTopics,
    required this.tierShiftInsights,
  });
}

HistoricalAnalysisReport analyzeHistoricalPyqs(
  List<Map<String, dynamic>> questions,
  String tierFilter,
) {
  final allPyqs = questions.where((q) {
    final src = (q['sourceType'] ?? 'PYQ').toString();
    final yr = int.tryParse((q['year'] ?? 0).toString()) ?? 0;
    return src == 'PYQ' && yr >= 2016 && yr <= 2025;
  }).toList();

  final scopedPyqs = tierFilter == 'All'
      ? allPyqs
      : allPyqs.where((q) => (q['tier'] ?? 'Tier 1').toString() == tierFilter).toList();

  const all10Years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  final yearsPresent = <int>{};
  final yearMap = <int, YearTrendStat>{
    for (final y in all10Years) y: YearTrendStat(y),
  };

  for (final q in allPyqs) {
    final yr = int.tryParse((q['year'] ?? 0).toString()) ?? 0;
    if (yearMap.containsKey(yr)) {
      yearsPresent.add(yr);
      final stat = yearMap[yr]!;
      stat.total += 1;
      if ((q['tier'] ?? 'Tier 1').toString() == 'Tier 2') {
        stat.tier2 += 1;
      } else {
        stat.tier1 += 1;
      }
    }
  }

  final yearsWithData = all10Years.where(yearsPresent.contains).toList();
  final missingYears = all10Years.where((y) => !yearsPresent.contains(y)).toList();

  final subjectCounts = <String, int>{
    'quant': 0,
    'reasoning': 0,
    'english': 0,
    'ga': 0,
    'computer': 0,
  };
  final difficultyCounts = <String, int>{'Easy': 0, 'Medium': 0, 'Hard': 0};
  final topicMap = <String, TopicHistoricalStat>{
    for (final def in officialTopicTaxonomy)
      '${def.subject}:${def.topic}':
          TopicHistoricalStat(topic: def.topic, subject: def.subject),
  };

  for (final q in scopedPyqs) {
    final sub = (q['subject'] ?? 'quant').toString().toLowerCase();
    subjectCounts[sub] = (subjectCounts[sub] ?? 0) + 1;
    final diff = (q['difficulty'] ?? 'Medium').toString();
    difficultyCounts[diff] = (difficultyCounts[diff] ?? 0) + 1;

    final canonical = mapQuestionToCanonicalTopic(q);
    if (canonical != null) {
      final stat = topicMap['${canonical.subject}:${canonical.topic}'];
      if (stat != null) {
        stat.totalCount += 1;
        if ((q['tier'] ?? 'Tier 1').toString() == 'Tier 2') {
          stat.tier2Count += 1;
        } else {
          stat.tier1Count += 1;
        }
        final yr = int.tryParse((q['year'] ?? 2024).toString()) ?? 2024;
        if (yr >= 2023) {
          stat.recentCount += 1;
        } else {
          stat.olderCount += 1;
        }
        if (!stat.yearsAppeared.contains(yr)) {
          stat.yearsAppeared.add(yr);
          stat.yearsAppeared.sort();
        }
      }
    }
  }

  final stats = topicMap.values.toList();
  final topRepeated = stats.where((s) => s.totalCount > 0).toList()
    ..sort((a, b) {
      final c = b.totalCount.compareTo(a.totalCount);
      return c != 0 ? c : b.recentCount.compareTo(a.recentCount);
    });
  final recentSurge = stats.where((s) => s.recentCount > 0).toList()
    ..sort((a, b) {
      final c = b.recentCount.compareTo(a.recentCount);
      return c != 0 ? c : b.totalCount.compareTo(a.totalCount);
    });
  final lessFrequent = stats.where((s) => s.totalCount <= 1).toList()
    ..sort((a, b) => a.totalCount.compareTo(b.totalCount));

  final t1Total = allPyqs.where((q) => (q['tier'] ?? 'Tier 1') == 'Tier 1').length;
  final t2Total = allPyqs.where((q) => (q['tier'] ?? 'Tier 1') == 'Tier 2').length;
  final hardPct = scopedPyqs.isEmpty
      ? 0
      : (((difficultyCounts['Hard'] ?? 0) / scopedPyqs.length) * 100).round();

  final insights = [
    'Archive coverage: ${allPyqs.length} verified PYQs across ${yearsWithData.length}/10 years.',
    'Tier split: $t1Total Tier 1 PYQs vs $t2Total Tier 2 PYQs.',
    'Difficulty mix ($tierFilter): ${difficultyCounts['Easy']} Easy, ${difficultyCounts['Medium']} Medium, ${difficultyCounts['Hard']} Hard ($hardPct% Hard).',
    if (missingYears.isNotEmpty)
      'Missing years with 0 imported PYQs yet: ${missingYears.join(', ')}. Syllabus weights supplement those cycles honestly.'
    else
      'Full 2016–2025 year range has imported verified PYQs.',
  ];

  return HistoricalAnalysisReport(
    totalVerifiedPyqs: allPyqs.length,
    totalTierPyqs: scopedPyqs.length,
    yearsWithData: yearsWithData,
    missingYears: missingYears,
    subjectCounts: subjectCounts,
    difficultyCounts: difficultyCounts,
    yearTrends: all10Years.map((y) => yearMap[y]!).toList(),
    topRepeatedTopics: topRepeated,
    recentSurgeTopics: recentSurge,
    lessFrequentTopics: lessFrequent,
    tierShiftInsights: insights,
  );
}

class TopicPredictionItem {
  final String topic;
  final String subject;
  final String tier;
  final int examYear;
  final int historicalFrequency;
  final int recentAppearanceCount;
  final String recentTrendLabel;
  final String evidenceSummary;
  final String confidence; // 'High' | 'Medium' | 'Low'
  final String priority; // 'Critical' | 'High' | 'Moderate' | 'Maintain'
  final int priorityScore;
  final String rationale;
  final bool isOutdated;
  final String? outdatedNote;

  const TopicPredictionItem({
    required this.topic,
    required this.subject,
    required this.tier,
    required this.examYear,
    required this.historicalFrequency,
    required this.recentAppearanceCount,
    required this.recentTrendLabel,
    required this.evidenceSummary,
    required this.confidence,
    required this.priority,
    required this.priorityScore,
    required this.rationale,
    this.isOutdated = false,
    this.outdatedNote,
  });
}

List<TopicPredictionItem> buildTopicPredictions({
  required List<Map<String, dynamic>> questions,
  required int examYear,
  required String tier,
  List<Map<String, dynamic>> categoryOverrides = const [],
}) {
  final scoped = analyzeHistoricalPyqs(questions, tier);
  final allScoped = analyzeHistoricalPyqs(questions, 'All');

  final statMap = <String, TopicHistoricalStat>{
    for (final s in scoped.topRepeatedTopics) '${s.subject}:${s.topic}': s,
  };
  final allStatMap = <String, TopicHistoricalStat>{
    for (final s in allScoped.topRepeatedTopics) '${s.subject}:${s.topic}': s,
  };
  final maxFreq = scoped.topRepeatedTopics.isEmpty
      ? 1
      : max(1, scoped.topRepeatedTopics.map((s) => s.totalCount).reduce(max));

  final list = officialTopicTaxonomy.where((def) => def.tiers.contains(tier)).map((def) {
    final s = statMap['${def.subject}:${def.topic}'];
    final allS = allStatMap['${def.subject}:${def.topic}'];
    final freq = s?.totalCount ?? 0;
    final allFreq = allS?.totalCount ?? 0;
    final recentCount = s?.recentCount ?? allS?.recentCount ?? 0;
    final olderCount = s?.olderCount ?? allS?.olderCount ?? 0;

    Map<String, dynamic>? override;
    for (final o in categoryOverrides) {
      if ((o['subject'] ?? '').toString() == def.subject &&
          (o['topic'] ?? '').toString().toLowerCase() == def.topic.toLowerCase() &&
          (o['tier'] ?? '').toString() == tier &&
          (int.tryParse((o['targetYear'] ?? 0).toString()) ?? 0) == examYear) {
        override = o;
        break;
      }
    }

    final freqScore = (freq / maxFreq) * 50;
    final recencyScore = recentCount > 0 ? min(30, recentCount * 10) : (allFreq > 0 ? 10 : 5);
    final spreadScore = min(20, (s?.yearsAppeared.length ?? 0) * 6);
    final totalScore = (freqScore + recencyScore + spreadScore).round();

    String confidence = 'Low';
    if (freq >= 3 || (freq >= 2 && recentCount >= 1)) {
      confidence = 'High';
    } else if (freq >= 1 || allFreq >= 2) {
      confidence = 'Medium';
    }

    String priority = 'Moderate';
    if (totalScore >= 65 || (freq >= 3 && recentCount >= 1)) {
      priority = 'Critical';
    } else if (totalScore >= 40 || freq >= 2) {
      priority = 'High';
    }
    if (override != null && (override['priorityOverride'] ?? '').toString().isNotEmpty) {
      priority = override['priorityOverride'].toString();
    }

    String trend = 'Low Data';
    if (recentCount > olderCount && recentCount > 0) {
      trend = 'Rising';
    } else if (recentCount >= 1 && olderCount >= 1) {
      trend = 'Steady';
    } else if (freq > 0) {
      trend = 'Selective';
    }

    final evidence = freq > 0
        ? '$freq verified $tier PYQ(s) across ${(s?.yearsAppeared ?? []).join(', ')}.'
        : (allFreq > 0
            ? '0 $tier-tagged PYQs yet, but $allFreq verified PYQ(s) across other shifts.'
            : '0 imported PYQs yet; retained from official $tier syllabus (${def.syllabusNote}).');

    final rationale = freq > 0
        ? 'Backed by imported 2016–2025 PYQ frequency (${trend.toLowerCase()} trend) & syllabus weight.'
        : 'Included via official SSC CGL syllabus weightage (${def.syllabusNote}).';

    return TopicPredictionItem(
      topic: def.topic,
      subject: def.subject,
      tier: tier,
      examYear: examYear,
      historicalFrequency: freq,
      recentAppearanceCount: recentCount,
      recentTrendLabel: trend,
      evidenceSummary: evidence,
      confidence: confidence,
      priority: priority,
      priorityScore: totalScore,
      rationale: rationale,
      isOutdated: override?['isOutdated'] == true,
      outdatedNote: override?['outdatedNote']?.toString(),
    );
  }).toList();

  list.sort((a, b) {
    final c = b.priorityScore.compareTo(a.priorityScore);
    return c != 0 ? c : b.historicalFrequency.compareTo(a.historicalFrequency);
  });
  return list;
}

class PredictedMockBundle {
  final Map<String, dynamic> mockTest;
  final List<Map<String, dynamic>> questions;
  final bool isEstimatedFormat;

  const PredictedMockBundle({
    required this.mockTest,
    required this.questions,
    required this.isEstimatedFormat,
  });
}

PredictedMockBundle buildPredictedMockTest({
  required int examYear,
  required String tier,
  required List<Map<String, dynamic>> pyqPool,
  required List<TopicPredictionItem> predictions,
  List<Map<String, dynamic>> approvedAiQuestions = const [],
}) {
  final notice = getExamYearNotice(examYear, tier);
  final isEstimated = notice.patternStatus != 'confirmed';
  final topTopics = predictions.take(14).map((p) => p.topic.toLowerCase()).toSet();

  final tierPyqs = pyqPool
      .where((q) =>
          q['isPublished'] != false &&
          (q['sourceType'] ?? 'PYQ') == 'PYQ' &&
          (q['tier'] ?? 'Tier 1') == tier)
      .toList();
  final anyPyqs = pyqPool
      .where((q) => q['isPublished'] != false && (q['sourceType'] ?? 'PYQ') == 'PYQ')
      .toList();

  final aiConverted = approvedAiQuestions
      .where((aq) =>
          aq['reviewStatus'] == 'approved' &&
          aq['isPublished'] == true &&
          (aq['tier'] ?? 'Tier 1') == tier)
      .map((aq) => {
            'id': (aq['questionId'] ?? aq['id'] ?? '').toString(),
            'subject': (aq['subject'] ?? 'quant').toString(),
            'topic': (aq['topic'] ?? 'Expected Practice').toString(),
            'year': aq['examYear'] ?? examYear,
            'tier': tier,
            'difficulty': (aq['difficulty'] ?? 'Medium').toString(),
            'sourceType': 'AI_GENERATED',
            'sourceLabel': aiExpectedQuestionNotice,
            'answerStatus': 'needs_verification',
            'isVerified': false,
            'questionEn': (aq['questionEn'] ?? '').toString(),
            'optionsEn': List<String>.from(aq['optionsEn'] as List? ?? []),
            'correctIndex': int.tryParse((aq['correctIndex'] ?? 0).toString()) ?? 0,
            'explanations': {
              'en': (aq['explanation'] ?? '').toString(),
              'ml': (aq['explanation'] ?? '').toString(),
              'hi': (aq['explanation'] ?? '').toString(),
              'ta': (aq['explanation'] ?? '').toString(),
            },
            if (aq['stepByStep'] is List) 'stepByStep': aq['stepByStep'],
          })
      .toList();

  final targetCount = tier == 'Tier 1' ? 20 : 24;
  final chosen = <Map<String, dynamic>>[];
  final usedIds = <String>{};

  void addUnique(List<Map<String, dynamic>> src) {
    for (final q in src) {
      if (chosen.length >= targetCount) break;
      final id = (q['id'] ?? '').toString();
      if (id.isNotEmpty && !usedIds.contains(id)) {
        usedIds.add(id);
        chosen.add(q);
      }
    }
  }

  addUnique(tierPyqs.where((q) {
    final mapped = mapQuestionToCanonicalTopic(q);
    return mapped != null && topTopics.contains(mapped.topic.toLowerCase());
  }).toList());
  addUnique(aiConverted);
  addUnique(tierPyqs);
  addUnique(anyPyqs);

  final marksPerCorrect = tier == 'Tier 1' ? 2.0 : 3.0;
  final negativeMark = tier == 'Tier 1' ? 0.5 : 1.0;
  final durationMins = tier == 'Tier 1' ? 20 : 25;

  final mock = <String, dynamic>{
    'testId': 'pred_mock_${examYear}_${tier.toLowerCase().replaceAll(' ', '')}',
    'id': 'pred_mock_${examYear}_${tier.toLowerCase().replaceAll(' ', '')}',
    'title': 'SSC CGL $examYear $tier Predicted Practice Mock',
    'category': tier,
    'durationMinutes': durationMins,
    'totalQuestions': chosen.length,
    'totalMarks': (chosen.length * marksPerCorrect).round(),
    'marksPerCorrect': marksPerCorrect,
    'negativeMarking': negativeMark,
    'questionIds': chosen.map((q) => q['id'].toString()).toList(),
    'description':
        '${isEstimated ? "ESTIMATED PRACTICE FORMAT · " : ""}Weighted by historical 2016–2025 frequency & top predicted $tier topics.',
    'isPublished': true,
  };

  return PredictedMockBundle(
    mockTest: mock,
    questions: chosen,
    isEstimatedFormat: isEstimated,
  );
}

Map<String, dynamic> comparePredictedVsActualTopics({
  required int examYear,
  required String tier,
  required List<String> predictedTopics,
  required List<Map<String, dynamic>> questions,
  List<String> customActualTopics = const [],
}) {
  final paperQs = questions.where((q) {
    return (q['sourceType'] ?? 'PYQ') == 'PYQ' &&
        (int.tryParse((q['year'] ?? 0).toString()) ?? 0) == examYear &&
        (q['tier'] ?? 'Tier 1') == tier;
  }).toList();

  final detected = paperQs
      .map((q) => mapQuestionToCanonicalTopic(q)?.topic ?? (q['topic'] ?? '').toString())
      .where((t) => t.trim().isNotEmpty)
      .toSet()
      .toList();

  final actual = customActualTopics.isNotEmpty ? customActualTopics : detected;
  final predSet = predictedTopics.map((e) => e.toLowerCase().trim()).toSet();
  final matched = actual.where((t) => predSet.contains(t.toLowerCase().trim())).toList();
  final missed = actual.where((t) => !predSet.contains(t.toLowerCase().trim())).toList();
  final coverage = actual.isNotEmpty ? ((matched.length / actual.length) * 100).round() : 0;
  final id = 'acc_${examYear}_${tier.toLowerCase().replaceAll(' ', '')}_${DateTime.now().millisecondsSinceEpoch}';

  return {
    'reportId': id,
    'examYear': examYear,
    'tier': tier,
    'title': 'SSC CGL $examYear $tier Topic Coverage Comparison',
    'predictedTopics': predictedTopics,
    'actualTopics': actual,
    'matchedTopics': matched,
    'missedTopics': missed,
    'coveragePct': coverage,
    'notes': actual.isEmpty
        ? 'No verified $examYear $tier PYQs imported yet. Enter actual topics manually or import the official paper.'
        : 'Matched ${matched.length} of ${actual.length} observed topics ($coverage% topic overlap).',
    'isOutdated': false,
    'createdAt': DateTime.now().toUtc().toIso8601String(),
  };
}

const List<Map<String, dynamic>> curatedCurrentAffairsSeed = [
  {
    'articleId': 'ca_seed_1',
    'category': 'Economy & Reports',
    'title': 'Union Budget Capital Expenditure & Fiscal Glide Path Priorities',
    'summary':
        'Tracks India central fiscal deficit consolidation trajectory, infrastructure capex outlays, and MSME credit guarantees.',
    'examRelevance': 'High-yield for SSC CGL Economics: fiscal targets & RBI coordination.',
    'publishedDate': '2025-02-01',
    'sourceName': 'Press Information Bureau (PIB)',
    'sourceUrl': 'https://www.pib.gov.in',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_2',
    'category': 'Government Schemes',
    'title': 'PM Surya Ghar Muft Bijli Yojana & Clean Energy Solar Targets',
    'summary':
        'Ministry of New & Renewable Energy rooftop solar subsidy initiative targeting 1 crore households.',
    'examRelevance': 'Core SSC CGL Scheme question: implementing ministry & target beneficiaries.',
    'publishedDate': '2025-01-18',
    'sourceName': 'India.gov.in / MNRE',
    'sourceUrl': 'https://www.india.gov.in',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_3',
    'category': 'Science & Technology',
    'title': 'ISRO SpaDeX Orbital Docking Milestone & Gaganyaan Missions',
    'summary':
        'ISRO demonstrated autonomous orbital rendezvous & docking technology via SpaDeX.',
    'examRelevance': 'SSC CGL Science & Tech focus: mission acronym, launch vehicle & milestone.',
    'publishedDate': '2025-01-16',
    'sourceName': 'ISRO Official Portal',
    'sourceUrl': 'https://www.isro.gov.in',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_4',
    'category': 'Awards & Appointments',
    'title': 'Padma Awards & Constitutional Commission Appointments',
    'summary':
        'Track Padma awardees across arts/public affairs and 16th Finance Commission statutory leadership.',
    'examRelevance': 'Static + Current pairing: recipient discipline, state & Art. 280.',
    'publishedDate': '2025-01-26',
    'sourceName': 'Padma Awards / PIB',
    'sourceUrl': 'https://www.padmaawards.gov.in',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_5',
    'category': 'Sports & Major Events',
    'title': 'International Chess Championships, National Games & Asian Medallists',
    'summary':
        'Indian gold medal winners, host cities, and FIDE World Chess & multi-sport event records.',
    'examRelevance': 'Repeated SSC CGL pattern: athlete, sport & host venue.',
    'publishedDate': '2025-02-10',
    'sourceName': 'Ministry of Youth Affairs & Sports (PIB)',
    'sourceUrl': 'https://yas.nic.in',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_6',
    'category': 'National',
    'title': 'Constitutional Amendment Acts & Parliamentary Legislative Milestones',
    'summary':
        'Study 106th Constitutional Amendment Act, One Nation One Subscription & Digital India Governance bills.',
    'examRelevance': 'Core Polity-Current bridge: amendment numbers & Articles.',
    'publishedDate': '2025-01-10',
    'sourceName': 'PRS Legislative Research',
    'sourceUrl': 'https://prsindia.org',
    'targetYear': 2026,
    'isPublished': true,
  },
  {
    'articleId': 'ca_seed_7',
    'category': 'International',
    'title': 'BRICS Expansion, G20 Troika Summits & IMEC Corridors',
    'summary':
        'Summit host nations, BRICS partner inductees & India bilateral infrastructure corridors.',
    'examRelevance': 'International Affairs focus: summit hosts & member groupings.',
    'publishedDate': '2025-01-22',
    'sourceName': 'Ministry of External Affairs (MEA)',
    'sourceUrl': 'https://www.mea.gov.in',
    'targetYear': 2026,
    'isPublished': true,
  },
];

const List<Map<String, dynamic>> historicalAccuracyBenchmarkSeed = [
  {
    'reportId': 'report_benchmark_2024_t1',
    'examYear': 2024,
    'tier': 'Tier 1',
    'title': 'SSC CGL 2024 Tier 1 Retrospective Topic Benchmark',
    'predictedTopics': [
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
    'actualTopics': [
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
    'matchedTopics': [
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
    'missedTopics': ['History'],
    'coveragePct': 92,
    'notes':
        'Retrospective benchmark against imported verified 2024 Tier 1 topics. Calibrates future topic weighting; never guarantees future shift composition.',
    'isOutdated': false,
    'createdAt': '2025-01-15T10:00:00.000Z',
  },
];
