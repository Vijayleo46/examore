import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import '../student/future_predictor_data.dart';

class AdminPredictorScreen extends StatefulWidget {
  final FirestoreService firestoreService;
  final List<Map<String, dynamic>> allQuestions;

  const AdminPredictorScreen({
    super.key,
    required this.firestoreService,
    required this.allQuestions,
  });

  @override
  State<AdminPredictorScreen> createState() => _AdminPredictorScreenState();
}

class _AdminPredictorScreenState extends State<AdminPredictorScreen> {
  int _tab = 0; // 0: AI Q Review, 1: Categories, 2: Accuracy, 3: Current Affairs
  int _targetYear = 2026;
  String _tier = 'Tier 1';
  bool _loading = true;
  List<Map<String, dynamic>> _aiQueue = [];
  List<Map<String, dynamic>> _caItems = [];

  final _compareYearCtrl = TextEditingController(text: '2024');
  final _manualTopicsCtrl = TextEditingController();
  final _caTitleCtrl = TextEditingController();
  final _caSummaryCtrl = TextEditingController();
  final _caRelevanceCtrl = TextEditingController();
  final _caSourceNameCtrl = TextEditingController(text: 'Press Information Bureau (PIB)');
  final _caSourceUrlCtrl = TextEditingController(text: 'https://www.pib.gov.in');
  String _caCategory = 'National';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _compareYearCtrl.dispose();
    _manualTopicsCtrl.dispose();
    _caTitleCtrl.dispose();
    _caSummaryCtrl.dispose();
    _caRelevanceCtrl.dispose();
    _caSourceNameCtrl.dispose();
    _caSourceUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        widget.firestoreService.fetchAllPredictorQuestionsAdmin(),
        widget.firestoreService.fetchAllCurrentAffairsAdmin(),
      ]);
      if (mounted) {
        setState(() {
          _aiQueue = results[0];
          _caItems = results[1];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Predictor Control Panel',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                for (final item in const [
                  (0, 'AI Questions'),
                  (1, 'Topic Categories'),
                  (2, 'Accuracy Reports'),
                  (3, 'Current Affairs'),
                ]) ...[
                  ChoiceChip(
                    label: Text(item.$2),
                    selected: _tab == item.$1,
                    onSelected: (_) => setState(() => _tab = item.$1),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_tab == 0) {
      if (_aiQueue.isEmpty) {
        return const Center(child: Text('No AI expected questions submitted yet.'));
      }
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _aiQueue.length,
        itemBuilder: (context, idx) {
          final pq = _aiQueue[idx];
          final qId = (pq['questionId'] ?? pq['id'] ?? '').toString();
          final status = (pq['reviewStatus'] ?? 'pending').toString();
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: OceanGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${pq['examYear']} · ${pq['tier']} · ${pq['topic']} · Status: ${status.toUpperCase()}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: OceanColors.oceanBlue,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    (pq['questionEn'] ?? '').toString(),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      FilledButton.tonal(
                        onPressed: () async {
                          await widget.firestoreService.reviewPredictorQuestion(
                            questionId: qId,
                            reviewStatus: 'approved',
                          );
                          await _refresh();
                        },
                        child: const Text('Approve'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.firestoreService.reviewPredictorQuestion(
                            questionId: qId,
                            reviewStatus: 'rejected',
                          );
                          await _refresh();
                        },
                        child: const Text('Reject'),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: OceanColors.coralAccent),
                        onPressed: () async {
                          await widget.firestoreService.deletePredictorQuestion(qId);
                          await _refresh();
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      );
    }

    if (_tab == 1) {
      return StreamBuilder(
        stream: widget.firestoreService.streamPredictorCategories(),
        builder: (context, snap) {
          final overrides = (snap.data?.docs ?? [])
              .map((d) => {'id': d.id, ...d.data()})
              .toList();
          final preds = buildTopicPredictions(
            questions: widget.allQuestions,
            examYear: _targetYear,
            tier: _tier,
            categoryOverrides: overrides,
          );
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _targetYear,
                      decoration: const InputDecoration(labelText: 'Cycle Year'),
                      items: predictorYears
                          .map((y) => DropdownMenuItem(value: y, child: Text('$y')))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _targetYear = v);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _tier,
                      decoration: const InputDecoration(labelText: 'Tier'),
                      items: ['Tier 1', 'Tier 2']
                          .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _tier = v);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              for (final p in preds) ...[
                OceanGlassCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.topic, style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text(
                              '${p.subject.toUpperCase()} · Freq: ${p.historicalFrequency} · Priority: ${p.priority}',
                              style: const TextStyle(fontSize: 12, color: OceanColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () async {
                          final catId =
                              '${p.subject}-${p.topic.toLowerCase().replaceAll(RegExp(r"[^a-z0-9]+"), "-")}-${p.tier.toLowerCase().replaceAll(" ", "")}-$_targetYear';
                          await widget.firestoreService.upsertPredictorCategory({
                            'categoryId': catId,
                            'topic': p.topic,
                            'subject': p.subject,
                            'tier': p.tier,
                            'targetYear': _targetYear,
                            'priorityOverride': p.priority == 'Critical' ? 'High' : 'Critical',
                            'isOutdated': !p.isOutdated,
                            'outdatedNote':
                                !p.isOutdated ? 'Pattern adjusted by Admin review.' : '',
                          });
                        },
                        child: Text(p.isOutdated ? 'Restore' : 'Flag Outdated'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      );
    }

    if (_tab == 2) {
      return StreamBuilder(
        stream: widget.firestoreService.streamPredictionReports(),
        builder: (context, snap) {
          final remote = (snap.data?.docs ?? [])
              .map((d) => {'id': d.id, ...d.data()})
              .toList();
          final allReports = [...historicalAccuracyBenchmarkSeed, ...remote];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Compare Predicted vs Actual Exam Topics',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _compareYearCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Exam Year (e.g. 2024)'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _manualTopicsCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Optional Actual Topics (comma-separated)',
                      ),
                    ),
                    const SizedBox(height: 10),
                    FilledButton(
                      onPressed: () async {
                        final yr = int.tryParse(_compareYearCtrl.text.trim()) ?? 2024;
                        final preds = buildTopicPredictions(
                          questions: widget.allQuestions,
                          examYear: yr,
                          tier: _tier,
                        ).take(14).map((e) => e.topic).toList();
                        final custom = _manualTopicsCtrl.text
                            .split(',')
                            .map((e) => e.trim())
                            .where((e) => e.isNotEmpty)
                            .toList();
                        final rep = comparePredictedVsActualTopics(
                          examYear: yr,
                          tier: _tier,
                          predictedTopics: preds,
                          questions: widget.allQuestions,
                          customActualTopics: custom,
                        );
                        await widget.firestoreService.savePredictionReport(rep);
                        _manualTopicsCtrl.clear();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Saved comparison report (${rep['coveragePct']}% match).',
                              ),
                            ),
                          );
                        }
                      },
                      child: const Text('Run & Save Comparison'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              for (final r in allReports) ...[
                OceanGlassCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      '${r['title']} (${r['coveragePct']}%)',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text((r['notes'] ?? '').toString()),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Publish Current Affairs Brief',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _caCategory,
                items: currentAffairsCategories
                    .where((c) => c != 'All')
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _caCategory = v);
                },
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _caTitleCtrl,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _caSummaryCtrl,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Summary'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _caRelevanceCtrl,
                decoration: const InputDecoration(labelText: 'Exam Relevance'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _caSourceUrlCtrl,
                decoration: const InputDecoration(labelText: 'Verified Source URL'),
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: () async {
                  if (_caTitleCtrl.text.trim().isEmpty || _caSummaryCtrl.text.trim().isEmpty) {
                    return;
                  }
                  await widget.firestoreService.upsertCurrentAffairsItem({
                    'category': _caCategory,
                    'title': _caTitleCtrl.text.trim(),
                    'summary': _caSummaryCtrl.text.trim(),
                    'examRelevance': _caRelevanceCtrl.text.trim(),
                    'publishedDate': DateTime.now().toIso8601String().substring(0, 10),
                    'sourceName': _caSourceNameCtrl.text.trim(),
                    'sourceUrl': _caSourceUrlCtrl.text.trim(),
                    'targetYear': _targetYear,
                    'isPublished': true,
                  });
                  _caTitleCtrl.clear();
                  _caSummaryCtrl.clear();
                  _caRelevanceCtrl.clear();
                  await _refresh();
                },
                child: const Text('Publish Brief'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final ca in _caItems) ...[
          OceanGlassCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('[${ca['category']}] ${ca['title']}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('${ca['publishedDate']} · ${ca['sourceName']}'),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, color: OceanColors.coralAccent),
                onPressed: () async {
                  await widget.firestoreService
                      .deleteCurrentAffairsItem((ca['articleId'] ?? ca['id']).toString());
                  await _refresh();
                },
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}
