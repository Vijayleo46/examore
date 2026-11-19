import 'dart:async';
import 'dart:convert';
import 'dart:ui' show FontFeature;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'pyq_archive_loader.dart';
import 'student_i18n.dart';
import 'student_tutor_screen.dart';

class MockTestRunnerScreen extends StatefulWidget {
  final String uid;
  final Map<String, dynamic> mockTest;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;
  final List<Map<String, dynamic>>? initialQuestions;

  const MockTestRunnerScreen({
    super.key,
    required this.uid,
    required this.mockTest,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.onGoHome,
    this.initialQuestions,
  });

  @override
  State<MockTestRunnerScreen> createState() => _MockTestRunnerScreenState();
}

enum _ReviewFilter { all, wrong, skipped }

class _MockDraft {
  final Map<int, int> answers;
  final Set<int> flagged;
  final int currentIndex;
  final int remainingSec;

  const _MockDraft({
    required this.answers,
    required this.flagged,
    required this.currentIndex,
    required this.remainingSec,
  });
}

class _MockTestRunnerScreenState extends State<MockTestRunnerScreen> {
  static final Map<String, _MockDraft> _draftStore = {};

  bool _loading = true;
  bool _submitting = false;
  bool _submitted = false;
  String? _loadError;

  List<Map<String, dynamic>> _questions = [];
  final Map<int, int> _answers = {};
  final Set<int> _flagged = {};
  int _currentIndex = 0;

  late int _totalDurationSec;
  int _remainingSec = 900;
  Timer? _timer;

  // Result metrics
  double _score = 0;
  double _maxScore = 0;
  int _correct = 0;
  int _wrong = 0;
  int _skipped = 0;
  int _accuracy = 0;
  int _timeTakenSec = 0;
  _ReviewFilter _reviewFilter = _ReviewFilter.all;

  String get _draftKey =>
      '${widget.uid}::${(widget.mockTest['testId'] ?? widget.mockTest['id'] ?? 'mock_1')}';
  String get _prefsDraftKey =>
      'examora_mock_draft_${_draftKey.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_')}';

  @override
  void initState() {
    super.initState();
    final mins = int.tryParse((widget.mockTest['durationMinutes'] ?? 15).toString()) ?? 15;
    _totalDurationSec = mins * 60;
    final existing = _draftStore[_draftKey];
    if (existing != null && existing.remainingSec > 10) {
      _answers.addAll(existing.answers);
      _flagged.addAll(existing.flagged);
      _currentIndex = existing.currentIndex;
      _remainingSec = existing.remainingSec;
    } else {
      _remainingSec = _totalDurationSec;
    }
    _restorePersistentDraft().then((_) => _loadQuestions());
  }

  Future<void> _restorePersistentDraft() async {
    if (_answers.isNotEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsDraftKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          final rem = int.tryParse('${decoded['remainingSec'] ?? 0}') ?? 0;
          if (rem > 10 && mounted) {
            final ansMap = decoded['answers'];
            if (ansMap is Map) {
              ansMap.forEach((k, v) {
                final ki = int.tryParse(k.toString());
                final vi = int.tryParse(v.toString());
                if (ki != null && vi != null) _answers[ki] = vi;
              });
            }
            final flagList = decoded['flagged'];
            if (flagList is List) {
              for (final f in flagList) {
                final fi = int.tryParse(f.toString());
                if (fi != null) _flagged.add(fi);
              }
            }
            _currentIndex = int.tryParse('${decoded['currentIndex'] ?? 0}') ?? 0;
            _remainingSec = rem;
          }
        }
      }
    } catch (_) {}
  }

  void _saveDraft() {
    if (_submitted || _questions.isEmpty) return;
    final safeIdx = _currentIndex.clamp(0, _questions.length - 1);
    _draftStore[_draftKey] = _MockDraft(
      answers: Map<int, int>.from(_answers),
      flagged: Set<int>.from(_flagged),
      currentIndex: safeIdx,
      remainingSec: _remainingSec,
    );
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(
        _prefsDraftKey,
        jsonEncode({
          'answers': _answers.map((k, v) => MapEntry(k.toString(), v)),
          'flagged': _flagged.toList(),
          'currentIndex': safeIdx,
          'remainingSec': _remainingSec,
        }),
      );
    }).catchError((_) => false);
  }

  @override
  void dispose() {
    _saveDraft();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadQuestions() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final preset = widget.initialQuestions;
      final List<Map<String, dynamic>> list;
      if (preset != null && preset.isNotEmpty) {
        list = preset;
      } else {
        final rawIds = (widget.mockTest['questionIds'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList();
        List<Map<String, dynamic>> remote = const [];
        try {
          remote = await widget.firestoreService.fetchQuestionsForMock(rawIds);
        } catch (_) {}
        final bundled = await PyqArchiveLoader.loadBundledPastPapers();
        final merged = PyqArchiveLoader.mergeWithFirestore(bundled, remote);
        if (rawIds.isNotEmpty) {
          final idSet = rawIds.toSet();
          final matched = merged
              .where((q) => idSet.contains((q['id'] ?? '').toString()))
              .toList();
          list = matched.isNotEmpty
              ? matched
              : PyqArchiveLoader.buildMockSet(
                  pool: merged,
                  tier: (widget.mockTest['category'] ?? 'Tier 1').toString(),
                  limit: 25,
                );
        } else {
          list = remote.isNotEmpty
              ? remote
              : PyqArchiveLoader.buildMockSet(
                  pool: merged,
                  tier: (widget.mockTest['category'] ?? 'Tier 1').toString(),
                  limit: 25,
                );
        }
      }
      if (!mounted) return;
      if (list.isEmpty) {
        setState(() {
          _loadError = 'No published questions are ready for this mock test yet.';
          _loading = false;
        });
        return;
      }
      setState(() {
        _questions = list;
        if (_currentIndex >= list.length) _currentIndex = 0;
        _loading = false;
      });
      _startTimer();
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadError = 'Could not load test questions. Please check connection and retry.';
          _loading = false;
        });
      }
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || _submitted) {
        t.cancel();
        return;
      }
      if (_remainingSec <= 1) {
        t.cancel();
        _finalizeSubmission();
      } else {
        setState(() => _remainingSec--);
      }
    });
  }

  String _formatTimer(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _confirmAndSubmit() async {
    if (_submitting || _submitted) return;
    final unanswered = _questions.length - _answers.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Submit Mock Test?'),
        content: Text(
          unanswered > 0
              ? 'You have answered ${_answers.length} of ${_questions.length} questions ($unanswered unanswered). Are you sure you want to submit now?'
              : 'You have answered all ${_questions.length} questions. Submit now to see your score and detailed solutions?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Reviewing'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Submit Test'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _finalizeSubmission();
    }
  }

  Future<void> _finalizeSubmission() async {
    if (_submitting || _submitted) return;
    setState(() => _submitting = true);
    _timer?.cancel();

    final marksPerCorrect = double.tryParse(
            (widget.mockTest['marksPerCorrect'] ?? 2).toString()) ??
        2.0;
    final negative = double.tryParse(
            (widget.mockTest['negativeMarking'] ?? 0.5).toString()) ??
        0.5;

    int correct = 0;
    int wrong = 0;
    int skipped = 0;
    final wrongIds = <String>[];
    final Map<String, Map<String, int>> breakdown = {};

    for (int i = 0; i < _questions.length; i++) {
      final q = _questions[i];
      final subj = (q['subject'] ?? 'quant').toString();
      breakdown.putIfAbsent(subj, () => {'attempted': 0, 'correct': 0});
      final chosen = _answers[i];
      final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;

      if (chosen == null) {
        skipped++;
      } else {
        breakdown[subj]!['attempted'] = (breakdown[subj]!['attempted'] ?? 0) + 1;
        if (chosen == expected) {
          correct++;
          breakdown[subj]!['correct'] = (breakdown[subj]!['correct'] ?? 0) + 1;
        } else {
          wrong++;
          final qId = (q['id'] ?? '').toString();
          if (qId.isNotEmpty) wrongIds.add(qId);
        }
      }
    }

    final score = (correct * marksPerCorrect) - (wrong * negative);
    final maxScore = _questions.length * marksPerCorrect;
    final attempted = correct + wrong;
    final acc = attempted > 0 ? ((correct * 100) / attempted).round() : 0;
    final timeTaken = (_totalDurationSec - _remainingSec).clamp(1, _totalDurationSec);

    try {
      await widget.firestoreService.submitMockAttempt(
        uid: widget.uid,
        testId: (widget.mockTest['testId'] ?? widget.mockTest['id'] ?? 'mock_1')
            .toString(),
        testTitle: (widget.mockTest['title'] ?? 'SSC CGL Mock Test').toString(),
        score: score,
        maxScore: maxScore,
        correctCount: correct,
        wrongCount: wrong,
        unattemptedCount: skipped,
        accuracy: acc,
        timeTakenSec: timeTaken,
        subjectBreakdown: breakdown,
        wrongQuestionIds: wrongIds,
      );
    } catch (_) {
      // Allow viewing results locally even if offline during submission
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsDraftKey);
    } catch (_) {}

    if (mounted) {
      _draftStore.remove(_draftKey);
      setState(() {
        _score = score;
        _maxScore = maxScore;
        _correct = correct;
        _wrong = wrong;
        _skipped = skipped;
        _accuracy = acc;
        _timeTakenSec = timeTaken;
        _submitting = false;
        _submitted = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final testTitle = (widget.mockTest['title'] ?? 'Mock Test').toString();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          testTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        actions: [
          if (!_loading && !_submitted && _loadError == null)
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _remainingSec < 120
                    ? OceanColors.coralAccent.withValues(alpha: 0.18)
                    : OceanColors.turquoise.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.timer_outlined,
                    size: 16,
                    color: _remainingSec < 120
                        ? OceanColors.coralAccent
                        : OceanColors.oceanBlue,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _formatTimer(_remainingSec),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off_outlined,
                            size: 46, color: OceanColors.coralAccent),
                        const SizedBox(height: 12),
                        Text(
                          _loadError!,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Back'),
                            ),
                            const SizedBox(width: 10),
                            FilledButton.icon(
                              onPressed: _loadQuestions,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
              : _submitted
                  ? _buildResultsReview()
                  : _buildQuestionView(),
    );
  }

  Widget _buildQuestionView() {
    final q = _questions[_currentIndex];
    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final selected = _answers[_currentIndex];
    final isFlagged = _flagged.contains(_currentIndex);
    final progress = (_currentIndex + 1) / _questions.length;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Question ${_currentIndex + 1} of ${_questions.length}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                  Text(
                    '${_answers.length} answered',
                    style: const TextStyle(
                      color: OceanColors.oceanBlue,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: OceanColors.borderLight,
                  color: OceanColors.turquoise,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                OceanGlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          OceanStatusBadge(
                            icon: Icons.topic_outlined,
                            label: '${q['topic'] ?? 'SSC CGL'}',
                            color: OceanColors.oceanBlue,
                          ),
                          const Spacer(),
                          IconButton(
                            onPressed: () {
                              setState(() {
                                if (isFlagged) {
                                  _flagged.remove(_currentIndex);
                                } else {
                                  _flagged.add(_currentIndex);
                                }
                              });
                            },
                            icon: Icon(
                              isFlagged ? Icons.bookmark : Icons.bookmark_border,
                              color: isFlagged
                                  ? OceanColors.coralAccent
                                  : OceanColors.textMuted,
                            ),
                            tooltip: 'Flag for review',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        (q['questionEn'] ?? '').toString(),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ...List.generate(options.length, (optIdx) {
                  final isChosen = selected == optIdx;
                  final letter = String.fromCharCode(65 + optIdx);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          if (isChosen) {
                            _answers.remove(_currentIndex);
                          } else {
                            _answers[_currentIndex] = optIdx;
                          }
                        });
                        _saveDraft();
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        constraints: const BoxConstraints(minHeight: 56),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: isChosen
                              ? OceanColors.turquoise.withValues(alpha: 0.16)
                              : OceanColors.pureWhite,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isChosen
                                ? OceanColors.turquoise
                                : OceanColors.borderLight,
                            width: isChosen ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 30,
                              height: 30,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: isChosen
                                    ? OceanColors.oceanBlue
                                    : OceanColors.foamWhite,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: OceanColors.seaGlass),
                              ),
                              child: Text(
                                letter,
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: isChosen
                                      ? OceanColors.pureWhite
                                      : OceanColors.deepOcean,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                options[optIdx],
                                style: const TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            if (isChosen)
                              const Icon(Icons.check_circle,
                                  color: OceanColors.oceanBlue, size: 20),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: Row(
              children: [
                OutlinedButton(
                  onPressed: _currentIndex > 0
                      ? () => setState(() => _currentIndex--)
                      : null,
                  child: const Text('Previous'),
                ),
                const SizedBox(width: 10),
                if (_currentIndex < _questions.length - 1)
                  Expanded(
                    child: FilledButton(
                      onPressed: () => setState(() => _currentIndex++),
                      child: const Text('Next Question'),
                    ),
                  )
                else
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _submitting ? null : _confirmAndSubmit,
                      style: FilledButton.styleFrom(
                        backgroundColor: OceanColors.turquoise,
                        foregroundColor: OceanColors.deepOcean,
                      ),
                      icon: const Icon(Icons.check_circle_outline),
                      label: Text(_submitting ? 'Submitting...' : 'Submit Test'),
                    ),
                  ),
                const SizedBox(width: 10),
                if (_currentIndex < _questions.length - 1)
                  TextButton(
                    onPressed: _submitting ? null : _confirmAndSubmit,
                    child: const Text('Submit'),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildResultsReview() {
    final filteredIndexes = <int>[];
    for (int i = 0; i < _questions.length; i++) {
      final chosen = _answers[i];
      final correct = int.tryParse((_questions[i]['correctIndex'] ?? 0).toString()) ?? 0;
      if (_reviewFilter == _ReviewFilter.wrong) {
        if (chosen != null && chosen != correct) filteredIndexes.add(i);
      } else if (_reviewFilter == _ReviewFilter.skipped) {
        if (chosen == null) filteredIndexes.add(i);
      } else {
        filteredIndexes.add(i);
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanBackHomeBar(
          title: 'Test Results & Explanations',
          onBack: () => Navigator.of(context).pop(),
          onHome: () {
            Navigator.of(context).pop();
            widget.onGoHome();
          },
        ),
        OceanWaveHeaderCard(
          child: Row(
            children: [
              OceanProgressRing(
                progress: _accuracy / 100.0,
                centerLabel: '$_accuracy%',
                subtitle: 'Accuracy',
                size: 92,
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Score: ${_score.toStringAsFixed(1)} / ${_maxScore.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: OceanColors.foamWhite,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$_correct Correct · $_wrong Wrong · $_skipped Skipped',
                      style: const TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Time: ${_formatTimer(_timeTakenSec)} · Avg Speed: ${(_correct + _wrong) > 0 ? (_timeTakenSec / (_correct + _wrong)).round() : 0}s/Q',
                      style: const TextStyle(
                        color: OceanColors.aqua,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _accuracy >= 70
                          ? 'Great momentum! Keep sharpening your speed.'
                          : 'Missed questions were saved to Revision. Review explanations below!',
                      style: const TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SegmentedButton<_ReviewFilter>(
          segments: [
            ButtonSegment(
              value: _ReviewFilter.all,
              label: Text('All (${_questions.length})'),
            ),
            ButtonSegment(
              value: _ReviewFilter.wrong,
              label: Text('Wrong ($_wrong)'),
            ),
            ButtonSegment(
              value: _ReviewFilter.skipped,
              label: Text('Skipped ($_skipped)'),
            ),
          ],
          selected: {_reviewFilter},
          onSelectionChanged: (s) => setState(() => _reviewFilter = s.first),
        ),
        const SizedBox(height: 14),
        if (filteredIndexes.isEmpty)
          const OceanGlassCard(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('No questions in this filter!'),
              ),
            ),
          )
        else
          ...filteredIndexes.map((idx) {
            final q = _questions[idx];
            final options =
                (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
                    .map((e) => e.toString())
                    .toList();
            final chosen = _answers[idx];
            final correct =
                int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
            final isCorrect = chosen == correct;
            final isSkipped = chosen == null;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Q${idx + 1}',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(width: 10),
                        OceanStatusBadge(
                          icon: isSkipped
                              ? Icons.remove_circle_outline
                              : isCorrect
                                  ? Icons.check_circle_outline
                                  : Icons.cancel_outlined,
                          label: isSkipped
                              ? 'Skipped'
                              : isCorrect
                                  ? 'Correct'
                                  : 'Needs Review',
                          color: isSkipped
                              ? OceanColors.textMuted
                              : isCorrect
                                  ? OceanColors.emerald
                                  : OceanColors.coralAccent,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      (q['questionEn'] ?? '').toString(),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Correct Answer: ${String.fromCharCode(65 + correct)}. ${options[correct]}',
                      style: const TextStyle(
                        color: OceanColors.emerald,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    if (!isSkipped && !isCorrect)
                      Text(
                        'Your Answer: ${String.fromCharCode(65 + chosen)}. ${options[chosen]}',
                        style: const TextStyle(
                          color: OceanColors.coralAccent,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      StudentStrings.pickExplanation(q, widget.preferredLanguage),
                      style: const TextStyle(
                        color: OceanColors.textMuted,
                        fontSize: 12.5,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => StudentTutorScreen(
                                firestoreService: widget.firestoreService,
                                initialLanguage: widget.preferredLanguage,
                                contextTopic: (q['topic'] ?? '').toString(),
                                initialPrompt:
                                    'Explain this SSC CGL question simply: ${q['questionEn']}',
                                onGoHome: widget.onGoHome,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.auto_awesome, size: 16),
                        label: const Text('Ask Examora AI'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

/// Video Lesson viewer with playable MP4 preview (when available) + clear steps & Mark Complete.
class VideoLessonSheet extends StatefulWidget {
  final String uid;
  final Map<String, dynamic> lesson;
  final bool isCompleted;
  final FirestoreService firestoreService;

  const VideoLessonSheet({
    super.key,
    required this.uid,
    required this.lesson,
    required this.isCompleted,
    required this.firestoreService,
  });

  @override
  State<VideoLessonSheet> createState() => _VideoLessonSheetState();
}

class _VideoLessonSheetState extends State<VideoLessonSheet> {
  VideoPlayerController? _controller;
  bool _videoReady = false;
  bool _marking = false;
  late bool _completed;

  @override
  void initState() {
    super.initState();
    _completed = widget.isCompleted;
    final url = (widget.lesson['videoUrl'] ?? '').toString().trim();
    if (url.startsWith('http') &&
        (url.endsWith('.mp4') || url.contains('firebasestorage'))) {
      _controller = VideoPlayerController.networkUrl(Uri.parse(url))
        ..initialize().then((_) {
          if (mounted) setState(() => _videoReady = true);
        }).catchError((_) {});
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _markCompleted() async {
    if (_marking || _completed) return;
    setState(() => _marking = true);
    final id = (widget.lesson['id'] ?? widget.lesson['title'] ?? 'lesson')
        .toString();
    try {
      await widget.firestoreService.markLessonCompleted(
        uid: widget.uid,
        lessonId: id,
      );
      if (mounted) {
        setState(() {
          _completed = true;
          _marking = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _marking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final steps = (widget.lesson['steps'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();
    final mins = ((int.tryParse((widget.lesson['durationSec'] ?? 600).toString()) ??
                600) /
            60)
        .ceil();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      (widget.lesson['title'] ?? 'Lesson').toString(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              Text(
                '${StudentStrings.subjectTitle((widget.lesson['subject'] ?? '').toString())} · ${widget.lesson['topic'] ?? ''} · $mins min',
                style: const TextStyle(
                  color: OceanColors.textMuted,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 14),
              if (_videoReady && _controller != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: AspectRatio(
                    aspectRatio: _controller!.value.aspectRatio,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        VideoPlayer(_controller!),
                        IconButton(
                          iconSize: 48,
                          color: Colors.white,
                          icon: Icon(
                            _controller!.value.isPlaying
                                ? Icons.pause_circle
                                : Icons.play_circle,
                          ),
                          onPressed: () {
                            setState(() {
                              _controller!.value.isPlaying
                                  ? _controller!.pause()
                                  : _controller!.play();
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                )
              else
                OceanWaveHeaderCard(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: OceanColors.turquoise.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.play_lesson_outlined,
                          color: OceanColors.aqua,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          (widget.lesson['summary'] ??
                                  'Follow the clear step-by-step concept notes below, then mark this lesson complete.')
                              .toString(),
                          style: const TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              if (steps.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Key Takeaways',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const SizedBox(height: 8),
                ...steps.asMap().entries.map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${e.key + 1}. ',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                e.value,
                                style: const TextStyle(fontSize: 13.5, height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: _completed || _marking ? null : _markCompleted,
                icon: Icon(
                  _completed ? Icons.check_circle : Icons.task_alt_outlined,
                ),
                label: Text(
                  _completed
                      ? 'Completed (+25 XP Earned)'
                      : _marking
                          ? 'Saving Progress...'
                          : 'Mark Lesson Completed',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
