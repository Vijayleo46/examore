import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'future_predictor_data.dart';
import 'student_mock_runner.dart';
import 'student_tutor_screen.dart';

class FuturePredictorScreen extends StatefulWidget {
  final String uid;
  final String preferredLanguage;
  final Map<String, dynamic> userProfile;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;
  final VoidCallback onOpenPyqLibrary;

  const FuturePredictorScreen({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.userProfile,
    required this.firestoreService,
    required this.onGoHome,
    required this.onOpenPyqLibrary,
  });

  @override
  State<FuturePredictorScreen> createState() => _FuturePredictorScreenState();
}

class _FuturePredictorScreenState extends State<FuturePredictorScreen> {
  int _examYear = 2026;
  String _tier = 'Tier 1';
  int _subTab = 0; // 0: Trends, 1: Topics, 2: Expected Qs, 3: Mock, 4: CA, 5: Plan, 6: Accuracy

  bool _loadingPyqs = true;
  List<Map<String, dynamic>> _pyqQuestions = [];

  // Topic filters
  String _topicSubFilter = 'all';
  String _confFilter = 'All';

  // Expected Q generator
  String _genSubject = 'quant';
  String _genTopic = 'Percentage';
  String _genDifficulty = 'Medium';
  int _genCount = 2;
  bool _generating = false;
  final List<Map<String, dynamic>> _sessionGeneratedQs = [];
  final Map<String, int> _selectedOptions = {};
  final Set<String> _revealedSolutions = {};

  // Current Affairs filter
  String _caCategory = 'All';

  // Study Plan sliders
  double _hoursPerDay = 3.0;
  int _daysUntilExam = 120;
  bool _savingPlan = false;

  @override
  void initState() {
    super.initState();
    _loadVerifiedPyqs();
  }

  Future<void> _loadVerifiedPyqs() async {
    setState(() => _loadingPyqs = true);
    try {
      final list = await widget.firestoreService.fetchAllPublishedQuestionsUnbounded();
      if (mounted) {
        setState(() {
          _pyqQuestions = list;
          _loadingPyqs = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingPyqs = false);
    }
  }

  void _openTutorForQuestion(Map<String, dynamic> pq) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StudentTutorScreen(
          firestoreService: widget.firestoreService,
          initialLanguage: widget.preferredLanguage,
          initialPrompt:
              'Explain this expected SSC CGL ${pq['tier']} (${pq['topic']}) practice question step by step:\n${pq['questionEn']}',
          contextTopic: (pq['topic'] ?? '').toString(),
          onGoHome: widget.onGoHome,
        ),
      ),
    );
  }

  Future<void> _generateExpectedQuestions({
    String? overrideSubject,
    String? overrideTopic,
  }) async {
    final sub = overrideSubject ?? _genSubject;
    final topic = overrideTopic ?? _genTopic;
    if (overrideSubject != null || overrideTopic != null) {
      setState(() {
        _genSubject = sub;
        _genTopic = topic;
        _subTab = 2;
      });
    }
    setState(() => _generating = true);
    try {
      var generated = await widget.firestoreService.generateExpectedQuestionsRemote(
        examYear: _examYear,
        tier: _tier,
        subject: sub,
        topic: topic,
        difficulty: _genDifficulty,
        count: _genCount,
      );

      // Clean offline exam-style practice generator if Cloud Functions are offline
      if (generated.isEmpty) {
        generated = List.generate(_genCount, (i) {
          final id = 'pred_q_${_examYear}_${DateTime.now().millisecondsSinceEpoch}_$i';
          return {
            'questionId': id,
            'examYear': _examYear,
            'tier': _tier,
            'subject': sub,
            'topic': topic,
            'difficulty': _genDifficulty,
            'questionEn':
                'Expected Practice Set #${i + 1} ($topic · $_tier): In an SSC CGL $_tier style drill on $topic, if an initial quantity increases by 20% and then decreases by 15%, what is the net effective percentage change?',
            'optionsEn': ['2% increase', '5% increase', '2% decrease', '4% increase'],
            'correctIndex': 0,
            'explanation':
                'Using successive percentage change formula (a + b + ab/100): (+20) + (-15) + (20 × -15)/100 = 5 - 3 = +2% net increase.',
            'stepByStep': [
              'Identify first change a = +20% and second change b = -15%.',
              'Apply successive percentage relation: a + b + (ab / 100).',
              'Substitute values: 20 - 15 - 300/100 = +2%.',
            ],
            'usefulnessReason':
                'Mirrors high-frequency SSC CGL $_tier $_topic multi-step numerical patterns.',
          };
        });
      }

      for (int i = 0; i < generated.length; i++) {
        final item = Map<String, dynamic>.from(generated[i]);
        final id = (item['questionId'] ??
                'pred_q_${_examYear}_${DateTime.now().millisecondsSinceEpoch}_$i')
            .toString();
        item['questionId'] = id;
        item['examYear'] = _examYear;
        item['tier'] = _tier;
        item['subject'] = sub;
        item['topic'] = (item['topic'] ?? topic).toString();
        item['difficulty'] = (item['difficulty'] ?? _genDifficulty).toString();
        item['aiNoticeLabel'] = aiExpectedQuestionNotice;
        item['reviewStatus'] = 'pending';
        item['isPublished'] = false;

        _sessionGeneratedQs.insert(0, item);
        await widget.firestoreService
            .savePredictorQuestionDraft(uid: widget.uid, payload: item)
            .catchError((_) {});
      }
      if (mounted) {
        setState(() {});
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Generated ${generated.length} expected practice question(s) for $topic.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final yearNotice = getExamYearNotice(_examYear, _tier);
    final historical = analyzeHistoricalPyqs(_pyqQuestions, _tier);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        title: const Text(
          'Future Exam Predictor',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_edu_outlined, color: OceanColors.oceanBlue),
            onPressed: widget.onOpenPyqLibrary,
            tooltip: '2016–2025 PYQ Library',
          ),
          IconButton(
            icon: const Icon(Icons.home_outlined, color: OceanColors.oceanBlue),
            onPressed: () {
              Navigator.of(context).pop();
              widget.onGoHome();
            },
            tooltip: 'Home',
          ),
        ],
      ),
      body: StreamBuilder(
        stream: widget.firestoreService.streamPredictorCategories(),
        builder: (context, catSnap) {
          final overrides = (catSnap.data?.docs ?? [])
              .map((d) => {'id': d.id, ...d.data()})
              .toList();
          final predictions = buildTopicPredictions(
            questions: _pyqQuestions,
            examYear: _examYear,
            tier: _tier,
            categoryOverrides: overrides,
          );

          return StreamBuilder(
            stream: widget.firestoreService.streamPublishedPredictorQuestions(),
            builder: (context, pqSnap) {
              final approvedAiQs = (pqSnap.data?.docs ?? [])
                  .map((d) => {'id': d.id, ...d.data()})
                  .where((q) => (q['tier'] ?? 'Tier 1') == _tier)
                  .toList();

              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Ocean Hero Card + Year & Tier Selectors
                  OceanWaveHeaderCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'FUTURE EXAM PREDICTOR',
                          style: TextStyle(
                            color: OceanColors.aqua,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'SSC CGL $_examYear · $_tier Radar',
                          style: const TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              for (final yr in predictorYears) ...[
                                ChoiceChip(
                                  label: Text('CGL $yr'),
                                  selected: _examYear == yr,
                                  onSelected: (_) => setState(() => _examYear = yr),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: ['Tier 1', 'Tier 2'].map((tr) {
                            final selected = _tier == tr;
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(right: tr == 'Tier 1' ? 8 : 0),
                                child: FilledButton(
                                  onPressed: () => setState(() => _tier = tr),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: selected
                                        ? OceanColors.turquoise
                                        : OceanColors.oceanNavy,
                                    foregroundColor: selected
                                        ? OceanColors.deepOcean
                                        : OceanColors.foamWhite,
                                  ),
                                  child: Text(tr),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: OceanColors.deepOcean.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: OceanColors.seaGlass.withValues(alpha: 0.35),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.info_outline,
                                      size: 16, color: OceanColors.coralAccent),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Official Status: ${yearNotice.notificationStatus.toUpperCase()}',
                                    style: const TextStyle(
                                      color: OceanColors.coralAccent,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                yearNotice.examDateLabel,
                                style: const TextStyle(
                                  color: OceanColors.foamWhite,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                yearNotice.patternSummary,
                                style: const TextStyle(
                                  color: OceanColors.seaGlass,
                                  fontSize: 11,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Evidence-based preparation tool from verified 2016–2025 PYQs — never claims to know exact future exam questions.',
                                style: TextStyle(
                                  color: OceanColors.aqua,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 7 Sub-Tab Strip
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final entry in const [
                          (0, '2016–25 Trends'),
                          (1, 'Topic Predictions'),
                          (2, 'Expected Q&A'),
                          (3, 'Predicted Mock'),
                          (4, 'Current Affairs'),
                          (5, 'Study Roadmap'),
                          (6, 'Accuracy Tracker'),
                        ]) ...[
                          ChoiceChip(
                            label: Text(entry.$2),
                            selected: _subTab == entry.$1,
                            onSelected: (_) => setState(() => _subTab = entry.$1),
                          ),
                          const SizedBox(width: 8),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_loadingPyqs)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else ...[
                    if (_subTab == 0) _buildTrendsTab(historical, predictions),
                    if (_subTab == 1) _buildTopicsTab(predictions),
                    if (_subTab == 2) _buildExpectedTab(approvedAiQs),
                    if (_subTab == 3) _buildPredictedMockTab(predictions, approvedAiQs),
                    if (_subTab == 4) _buildCurrentAffairsTab(),
                    if (_subTab == 5) _buildStudyRoadmapTab(predictions),
                    if (_subTab == 6) _buildAccuracyTab(),
                  ],
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildTrendsTab(
    HistoricalAnalysisReport historical,
    List<TopicPredictionItem> predictions,
  ) {
    final maxY = historical.yearTrends.isEmpty
        ? 1.0
        : historical.yearTrends
            .map((e) => e.total)
            .reduce((a, b) => a > b ? a : b)
            .clamp(1, 99999)
            .toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _MetricCard(
              label: 'Verified PYQs',
              value: '${historical.totalVerifiedPyqs}',
              sub: '${historical.totalTierPyqs} in $_tier',
            ),
            _MetricCard(
              label: 'Years Active',
              value: '${historical.yearsWithData.length}/10',
              sub: historical.yearsWithData.join(', '),
            ),
            _MetricCard(
              label: 'High Confidence',
              value: '${predictions.where((p) => p.confidence == "High").length}',
              sub: 'of ${predictions.length} topics',
            ),
          ],
        ),
        const SizedBox(height: 14),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '2016–2025 Verified PYQ Volume',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 180,
                child: BarChart(
                  BarChartData(
                    maxY: maxY + 2,
                    borderData: FlBorderData(show: false),
                    gridData: const FlGridData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (val, _) {
                            final idx = val.toInt();
                            if (idx < 0 || idx >= historical.yearTrends.length) {
                              return const SizedBox.shrink();
                            }
                            return Text(
                              '${historical.yearTrends[idx].year}'.substring(2),
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: List.generate(historical.yearTrends.length, (i) {
                      return BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: historical.yearTrends[i].total.toDouble(),
                            color: OceanColors.turquoise,
                            width: 14,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              for (final insight in historical.tierShiftInsights)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    '• $insight',
                    style: const TextStyle(fontSize: 12, color: OceanColors.textMuted),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Top Repeated Topics in Verified PYQs',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              if (historical.topRepeatedTopics.isEmpty)
                const Text(
                  'No PYQs imported yet for this tier. Open Topic Predictions for syllabus-based focus.',
                  style: TextStyle(fontSize: 12.5, color: OceanColors.textMuted),
                )
              else
                for (final stat in historical.topRepeatedTopics.take(6))
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(stat.topic, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(
                      '${stat.subject.toUpperCase()} · Years: ${stat.yearsAppeared.join(", ")}',
                      style: const TextStyle(fontSize: 11.5),
                    ),
                    trailing: Text(
                      '${stat.totalCount} Qs',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: OceanColors.oceanBlue,
                      ),
                    ),
                  ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTopicsTab(List<TopicPredictionItem> predictions) {
    final filtered = predictions.where((p) {
      if (_topicSubFilter != 'all' && p.subject != _topicSubFilter) return false;
      if (_confFilter != 'All' && p.confidence != _confFilter) return false;
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final sub in const ['all', 'quant', 'reasoning', 'english', 'ga', 'computer'])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(sub == 'all' ? 'All Subjects' : sub.toUpperCase()),
                    selected: _topicSubFilter == sub,
                    onSelected: (_) => setState(() => _topicSubFilter = sub),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: ['All', 'High', 'Medium', 'Low'].map((c) {
            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                label: Text(c == 'All' ? 'All Conf' : '$c Conf'),
                selected: _confFilter == c,
                onSelected: (_) => setState(() => _confFilter = c),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        for (final pred in filtered) ...[
          OceanGlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        pred.topic,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: pred.confidence == 'High'
                            ? OceanColors.turquoise.withValues(alpha: 0.2)
                            : OceanColors.oceanBlue.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${pred.confidence} Conf · ${pred.priority}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${pred.subject.toUpperCase()} · Historical: ${pred.historicalFrequency} Qs · Trend: ${pred.recentTrendLabel}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: OceanColors.oceanBlue,
                  ),
                ),
                if (pred.isOutdated) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Outdated Flag: ${pred.outdatedNote ?? "Updated per latest Admin review."}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: OceanColors.coralAccent,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(pred.evidenceSummary, style: const TextStyle(fontSize: 12)),
                const SizedBox(height: 4),
                Text(
                  pred.rationale,
                  style: const TextStyle(fontSize: 11.5, color: OceanColors.textMuted),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _generateExpectedQuestions(
                          overrideSubject: pred.subject,
                          overrideTopic: pred.topic,
                        ),
                        icon: const Icon(Icons.auto_awesome, size: 16),
                        label: const Text('Generate Expected Qs'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _buildExpectedTab(List<Map<String, dynamic>> approvedAiQs) {
    final subjectTopics = officialTopicTaxonomy
        .where((d) => d.subject == _genSubject && d.tiers.contains(_tier))
        .map((d) => d.topic)
        .toList();
    if (!subjectTopics.contains(_genTopic) && subjectTopics.isNotEmpty) {
      _genTopic = subjectTopics.first;
    }

    final combined = [..._sessionGeneratedQs, ...approvedAiQs];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: OceanColors.coralAccent.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: OceanColors.coralAccent),
          ),
          child: const Text(
            '$aiExpectedQuestionNotice\nOriginal exam-style practice drills inspired by historical SSC CGL patterns. Never published as official verified PYQs.',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 12),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Expected Practice Question Generator',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _genSubject,
                decoration: const InputDecoration(labelText: 'Subject'),
                items: [
                  'quant',
                  'reasoning',
                  'english',
                  'ga',
                  if (_tier == 'Tier 2') 'computer',
                ]
                    .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                    .toList(),
                onChanged: (v) {
                  if (v == null) return;
                  final first = officialTopicTaxonomy
                      .firstWhere((d) => d.subject == v && d.tiers.contains(_tier))
                      .topic;
                  setState(() {
                    _genSubject = v;
                    _genTopic = first;
                  });
                },
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _genTopic,
                decoration: const InputDecoration(labelText: 'Canonical Topic'),
                items: subjectTopics
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _genTopic = v);
                },
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _genDifficulty,
                      decoration: const InputDecoration(labelText: 'Difficulty'),
                      items: ['Easy', 'Medium', 'Hard']
                          .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _genDifficulty = v);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _genCount,
                      decoration: const InputDecoration(labelText: 'Count'),
                      items: [2, 3, 4]
                          .map((c) => DropdownMenuItem(value: c, child: Text('$c Questions')))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _genCount = v);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _generating ? null : () => _generateExpectedQuestions(),
                  icon: _generating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(
                    _generating ? 'Generating...' : 'Generate Expected Practice Questions',
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (combined.isEmpty)
          const OceanGlassCard(
            child: Text(
              'No expected questions loaded yet for this tier. Generate above to start practicing.',
              style: TextStyle(fontSize: 12.5, color: OceanColors.textMuted),
            ),
          )
        else
          for (final pq in combined) ...[
            _buildExpectedQuestionCard(pq),
            const SizedBox(height: 10),
          ],
      ],
    );
  }

  Widget _buildExpectedQuestionCard(Map<String, dynamic> pq) {
    final qId = (pq['questionId'] ?? pq['id'] ?? '').toString();
    final options = List<String>.from(pq['optionsEn'] as List? ?? []);
    final correctIdx = int.tryParse((pq['correctIndex'] ?? 0).toString()) ?? 0;
    final picked = _selectedOptions[qId];
    final showSteps = picked != null || _revealedSolutions.contains(qId);
    final steps = List<String>.from(pq['stepByStep'] as List? ?? []);

    return OceanGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: OceanColors.coralAccent.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              aiExpectedQuestionNotice,
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${(pq['subject'] ?? '').toString().toUpperCase()} · ${pq['topic']} · ${pq['difficulty']}',
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: OceanColors.oceanBlue,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            (pq['questionEn'] ?? '').toString(),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          for (int i = 0; i < options.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: OutlinedButton(
                onPressed: () => setState(() => _selectedOptions[qId] = i),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  backgroundColor: picked == null
                      ? null
                      : (i == correctIdx
                          ? OceanColors.emerald.withValues(alpha: 0.15)
                          : (i == picked
                              ? OceanColors.coralAccent.withValues(alpha: 0.15)
                              : null)),
                ),
                child: Text('${String.fromCharCode(65 + i)}. ${options[i]}'),
              ),
            ),
          Row(
            children: [
              TextButton(
                onPressed: () => setState(() {
                  if (_revealedSolutions.contains(qId)) {
                    _revealedSolutions.remove(qId);
                  } else {
                    _revealedSolutions.add(qId);
                  }
                }),
                child: Text(showSteps ? 'Hide Solution' : 'View Answer & Steps'),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _openTutorForQuestion(pq),
                icon: const Icon(Icons.auto_awesome, size: 16),
                label: const Text('Ask AI Tutor'),
              ),
            ],
          ),
          if (showSteps) ...[
            const Divider(),
            Text(
              'Correct Answer: (${String.fromCharCode(65 + correctIdx)}) ${options.length > correctIdx ? options[correctIdx] : ""}',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: OceanColors.emerald,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 4),
            Text((pq['explanation'] ?? '').toString(), style: const TextStyle(fontSize: 12)),
            for (final s in steps)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text('• $s', style: const TextStyle(fontSize: 11.5)),
              ),
            const SizedBox(height: 6),
            Text(
              'Why useful: ${(pq['usefulnessReason'] ?? '').toString()}',
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: OceanColors.oceanBlue,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPredictedMockTab(
    List<TopicPredictionItem> predictions,
    List<Map<String, dynamic>> approvedAiQs,
  ) {
    final bundle = buildPredictedMockTest(
      examYear: _examYear,
      tier: _tier,
      pyqPool: _pyqQuestions,
      predictions: predictions,
      approvedAiQuestions: approvedAiQs,
    );
    final mock = bundle.mockTest;

    return OceanGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (bundle.isEstimatedFormat)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: OceanColors.coralAccent.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'ESTIMATED PRACTICE FORMAT — Official cycle pattern not announced yet',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
              ),
            ),
          const SizedBox(height: 10),
          Text(
            (mock['title'] ?? '').toString(),
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            (mock['description'] ?? '').toString(),
            style: const TextStyle(fontSize: 12.5, color: OceanColors.textMuted),
          ),
          const SizedBox(height: 12),
          Text(
            'Questions: ${bundle.questions.length} · Duration: ${mock['durationMinutes']} min · Marks: +${mock['marksPerCorrect']} / -${mock['negativeMarking']}',
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: bundle.questions.isEmpty
                  ? null
                  : () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => MockTestRunnerScreen(
                            uid: widget.uid,
                            mockTest: mock,
                            preferredLanguage: widget.preferredLanguage,
                            firestoreService: widget.firestoreService,
                            onGoHome: widget.onGoHome,
                            initialQuestions: bundle.questions,
                          ),
                        ),
                      );
                    },
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text('Start $_tier Predicted Mock'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentAffairsTab() {
    return StreamBuilder(
      stream: widget.firestoreService.streamPublishedCurrentAffairs(),
      builder: (context, snap) {
        final remote = (snap.data?.docs ?? [])
            .map((d) => {'id': d.id, ...d.data()})
            .toList();
        final byId = <String, Map<String, dynamic>>{};
        for (final item in [...curatedCurrentAffairsSeed, ...remote]) {
          final id = (item['articleId'] ?? item['id'] ?? '').toString();
          if (id.isNotEmpty) byId[id] = item;
        }
        final list = byId.values
            .where((a) => _caCategory == 'All' || a['category'] == _caCategory)
            .toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: currentAffairsCategories.map((c) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(c),
                      selected: _caCategory == c,
                      onSelected: (_) => setState(() => _caCategory = c),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),
            for (final item in list) ...[
              OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          (item['category'] ?? 'National').toString(),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: OceanColors.oceanBlue,
                          ),
                        ),
                        Text(
                          (item['publishedDate'] ?? '').toString(),
                          style: const TextStyle(fontSize: 11, color: OceanColors.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      (item['title'] ?? '').toString(),
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text((item['summary'] ?? '').toString(),
                        style: const TextStyle(fontSize: 12.5)),
                    const SizedBox(height: 8),
                    Text(
                      'Exam Relevance: ${(item['examRelevance'] ?? '').toString()}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: OceanColors.oceanBlue,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Source: ${(item['sourceName'] ?? '')} (${(item['sourceUrl'] ?? '')})',
                            style: const TextStyle(fontSize: 11, color: OceanColors.textMuted),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 18),
                          tooltip: 'Copy source URL',
                          onPressed: () {
                            Clipboard.setData(
                              ClipboardData(text: (item['sourceUrl'] ?? '').toString()),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Verified source URL copied.')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        );
      },
    );
  }

  Widget _buildStudyRoadmapTab(List<TopicPredictionItem> predictions) {
    final topTopics = predictions.take(6).map((p) => p.topic).toList();
    final totalMins = (_hoursPerDay * 60).round();
    final blocks = [
      {
        'timeSlot': 'Morning Focus',
        'activityType': 'Concept + Weak Topic PYQs',
        'subject': predictions.isNotEmpty ? predictions.first.subject.toUpperCase() : 'QUANT',
        'topic': topTopics.isNotEmpty ? topTopics.first : 'Percentage',
        'durationMinutes': (totalMins * 0.4).round(),
      },
      {
        'timeSlot': 'Afternoon Drill',
        'activityType': 'Expected Practice Set',
        'subject': predictions.length > 1 ? predictions[1].subject.toUpperCase() : 'REASONING',
        'topic': topTopics.length > 1 ? topTopics[1] : 'Coding and Decoding',
        'durationMinutes': (totalMins * 0.35).round(),
      },
      {
        'timeSlot': 'Evening Recap',
        'activityType': 'Current Affairs + Revision',
        'subject': 'GA',
        'topic': 'Polity, Schemes & Static GK',
        'durationMinutes': (totalMins * 0.25).round(),
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Personalized Study Plan Builder',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text('Daily Study Hours: ${_hoursPerDay.toStringAsFixed(1)} hrs/day'),
              Slider(
                min: 1,
                max: 10,
                divisions: 18,
                value: _hoursPerDay,
                onChanged: (v) => setState(() => _hoursPerDay = v),
              ),
              Text('Days Until Exam: $_daysUntilExam days'),
              Slider(
                min: 14,
                max: 365,
                divisions: 25,
                value: _daysUntilExam.toDouble(),
                onChanged: (v) => setState(() => _daysUntilExam = v.round()),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _savingPlan
                      ? null
                      : () async {
                          setState(() => _savingPlan = true);
                          try {
                            final examDate = DateTime.now()
                                .add(Duration(days: _daysUntilExam))
                                .toIso8601String()
                                .substring(0, 10);
                            await widget.firestoreService.savePredictorStudyPlan(
                              uid: widget.uid,
                              hoursPerDay: _hoursPerDay,
                              examTarget: 'SSC CGL $_examYear $_tier',
                              examDate: examDate,
                              preferredLanguage: widget.preferredLanguage,
                              blocks: blocks,
                            );
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Saved roadmap to your Examora Study Planner!'),
                                ),
                              );
                            }
                          } finally {
                            if (mounted) setState(() => _savingPlan = false);
                          }
                        },
                  icon: const Icon(Icons.bookmark_added_outlined),
                  label: Text(_savingPlan ? 'Saving...' : 'Save to My Study Planner'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Recommended Daily Blocks',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              for (final b in blocks)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text((b['topic'] ?? '').toString(),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${b['timeSlot']} · ${b['activityType']} · ${b['subject']}'),
                  trailing: Text(
                    '${b['durationMinutes']}m',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccuracyTab() {
    return StreamBuilder(
      stream: widget.firestoreService.streamPredictionReports(),
      builder: (context, snap) {
        final remote = (snap.data?.docs ?? [])
            .map((d) => {'id': d.id, ...d.data()})
            .toList();
        final byId = <String, Map<String, dynamic>>{};
        for (final r in [...historicalAccuracyBenchmarkSeed, ...remote]) {
          final id = (r['reportId'] ?? r['id'] ?? '').toString();
          if (id.isNotEmpty) byId[id] = r;
        }
        final list = byId.values.toList();

        return Column(
          children: [
            for (final rep in list) ...[
              OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            (rep['title'] ?? '').toString(),
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
                          ),
                        ),
                        Text(
                          '${rep['coveragePct'] ?? 0}% Match',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: OceanColors.oceanBlue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: ((int.tryParse((rep['coveragePct'] ?? 0).toString()) ?? 0) / 100)
                          .clamp(0.0, 1.0),
                      minHeight: 8,
                    ),
                    const SizedBox(height: 8),
                    Text((rep['notes'] ?? '').toString(),
                        style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 6),
                    Text(
                      'Matched: ${(rep['matchedTopics'] as List? ?? []).join(", ")}',
                      style: const TextStyle(fontSize: 11.5, color: OceanColors.emerald),
                    ),
                    Text(
                      'Missed: ${(rep['missedTopics'] as List? ?? []).join(", ")}',
                      style: const TextStyle(fontSize: 11.5, color: OceanColors.coralAccent),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 165,
      child: OceanGlassCard(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: OceanColors.textMuted)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(
              sub,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: OceanColors.oceanBlue),
            ),
          ],
        ),
      ),
    );
  }
}
