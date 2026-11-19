import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'pyq_archive_loader.dart';
import 'ssc_master_curriculum.dart';
import 'student_i18n.dart';
import 'student_tutor_screen.dart';
import 'pyq_library_screen.dart';
import 'ocean_quest_screen.dart';

enum _PracticeMode { drill, daily, pyq, sprint, quest }

class StudentPracticeTab extends StatefulWidget {
  final String uid;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final bool showTip;
  final VoidCallback onDismissTip;
  final VoidCallback onGoHome;

  const StudentPracticeTab({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.showTip,
    required this.onDismissTip,
    required this.onGoHome,
  });

  @override
  State<StudentPracticeTab> createState() => _StudentPracticeTabState();
}

class _StudentPracticeTabState extends State<StudentPracticeTab> {
  _PracticeMode _mode = _PracticeMode.drill;
  String _selectedSubject = 'all';
  String _selectedTopic = 'all';
  bool _revisionOnly = false;
  Set<String> _revisionIds = {};

  int _drillIndex = 0;
  int? _selectedOption;
  bool _checkedAnswer = false;
  int _sessionCorrect = 0;
  int _sessionTotal = 0;

  // Daily Quiz (10-question timed quiz with +2 / -0.5)
  bool _dailyActive = false;
  bool _dailyDone = false;
  int _dailySecondsLeft = 600;
  int _dailyIdx = 0;
  List<Map<String, dynamic>> _dailyQuestions = const [];
  final Map<int, int> _dailyAnswers = {};
  Timer? _dailyTimer;
  double _dailyScore = 0;
  double _dailyMaxScore = 20;
  int _dailyCorrect = 0;
  int _dailyWrong = 0;
  int _dailyTimeTaken = 0;

  // 60s Sprint state
  bool _sprintRunning = false;
  bool _sprintDone = false;
  int _sprintSeconds = 60;
  int _sprintIndex = 0;
  int _sprintCorrect = 0;
  int _sprintAttempted = 0;
  Timer? _sprintTimer;
  List<Map<String, dynamic>> _bundledArchive = const [];

  @override
  void initState() {
    super.initState();
    PyqArchiveLoader.loadBundledPastPapers().then((list) {
      if (mounted && list.isNotEmpty) {
        setState(() => _bundledArchive = list);
      }
    });
    _loadRevisionIds();
  }

  Future<void> _loadRevisionIds() async {
    try {
      final pyqState =
          await widget.firestoreService.loadStudentPyqState(widget.uid);
      if (mounted) {
        setState(() => _revisionIds = pyqState.revisionIds);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _sprintTimer?.cancel();
    _dailyTimer?.cancel();
    super.dispose();
  }

  void _startDailyQuiz(List<Map<String, dynamic>> pool) {
    final picked = PyqArchiveLoader.buildMockSet(
      pool: pool,
      tier: 'Tier 1',
      subject: _selectedSubject,
      limit: 10,
    );
    if (picked.isEmpty) return;
    _dailyTimer?.cancel();
    setState(() {
      _dailyQuestions = picked;
      _dailyAnswers.clear();
      _dailyIdx = 0;
      _dailySecondsLeft = picked.length * 60;
      _dailyActive = true;
      _dailyDone = false;
    });
    _dailyTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_dailySecondsLeft <= 1) {
        t.cancel();
        _finishDailyQuiz();
      } else {
        setState(() => _dailySecondsLeft--);
      }
    });
  }

  Future<void> _finishDailyQuiz() async {
    if (!_dailyActive || _dailyDone) return;
    _dailyTimer?.cancel();
    int correct = 0;
    int wrong = 0;
    final wrongIds = <String>[];
    final breakdown = <String, Map<String, int>>{};

    for (int i = 0; i < _dailyQuestions.length; i++) {
      final q = _dailyQuestions[i];
      final subj = (q['subject'] ?? 'quant').toString();
      breakdown.putIfAbsent(subj, () => {'attempted': 0, 'correct': 0});
      final ans = _dailyAnswers[i];
      final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
      if (ans != null) {
        breakdown[subj]!['attempted'] = (breakdown[subj]!['attempted'] ?? 0) + 1;
        if (ans == expected) {
          correct++;
          breakdown[subj]!['correct'] = (breakdown[subj]!['correct'] ?? 0) + 1;
        } else {
          wrong++;
          final qId = (q['id'] ?? '').toString();
          if (qId.isNotEmpty) wrongIds.add(qId);
        }
      }
    }

    final totalSec = _dailyQuestions.length * 60;
    final taken = (totalSec - _dailySecondsLeft).clamp(1, totalSec);
    final score = (correct * 2.0) - (wrong * 0.5);
    final maxScore = _dailyQuestions.length * 2.0;
    final attempted = correct + wrong;
    final acc = attempted > 0 ? ((correct * 100) / attempted).round() : 0;

    setState(() {
      _dailyScore = score;
      _dailyMaxScore = maxScore;
      _dailyCorrect = correct;
      _dailyWrong = wrong;
      _dailyTimeTaken = taken;
      _dailyActive = false;
      _dailyDone = true;
      if (wrongIds.isNotEmpty) {
        _revisionIds = {..._revisionIds, ...wrongIds};
      }
    });

    try {
      await widget.firestoreService.submitMockAttempt(
        uid: widget.uid,
        testId:
            'daily_${DateTime.now().toUtc().toIso8601String().substring(0, 10)}',
        testTitle: 'Daily SSC CGL Quiz (${_dailyQuestions.length} Qs)',
        score: score,
        maxScore: maxScore,
        correctCount: correct,
        wrongCount: wrong,
        unattemptedCount: _dailyQuestions.length - attempted,
        accuracy: acc,
        timeTakenSec: taken,
        subjectBreakdown: breakdown,
        wrongQuestionIds: wrongIds,
      );
    } catch (_) {}
  }

  void _startSprint() {
    _sprintTimer?.cancel();
    setState(() {
      _sprintRunning = true;
      _sprintDone = false;
      _sprintSeconds = 60;
      _sprintIndex = 0;
      _sprintCorrect = 0;
      _sprintAttempted = 0;
    });
    _sprintTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_sprintSeconds <= 1) {
        t.cancel();
        setState(() {
          _sprintRunning = false;
          _sprintDone = true;
          _sprintSeconds = 0;
        });
      } else {
        setState(() => _sprintSeconds--);
      }
    });
  }

  Future<void> _submitDrillOption(
    Map<String, dynamic> q,
    int chosenIndex,
  ) async {
    if (_checkedAnswer) return;
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final isCorrect = chosenIndex == expected;
    final qId = (q['id'] ?? '').toString();
    setState(() {
      _selectedOption = chosenIndex;
      _checkedAnswer = true;
      _sessionTotal++;
      if (isCorrect) {
        _sessionCorrect++;
      } else if (qId.isNotEmpty) {
        _revisionIds = {..._revisionIds, qId};
      }
    });

    try {
      await widget.firestoreService.recordPracticeAttempt(
        uid: widget.uid,
        subject: (q['subject'] ?? 'quant').toString(),
        isCorrect: isCorrect,
      );
      if (!isCorrect && qId.isNotEmpty) {
        await widget.firestoreService.addWrongQuestionsToRevision(
          uid: widget.uid,
          wrongIds: [qId],
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.showTip)
                OceanFirstTimeTip(
                  title: 'Practice without pressure',
                  message:
                      'Try Topic Drill with Topic filters, Daily Quiz, 11 years of SSC CGL PYQs (2016–2026), or Wrong-Answer Revision.',
                  onDismiss: widget.onDismissTip,
                ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SegmentedButton<_PracticeMode>(
                  segments: const [
                    ButtonSegment(
                      value: _PracticeMode.drill,
                      icon: Icon(Icons.flash_on_outlined, size: 15),
                      label: Text('Drill'),
                    ),
                    ButtonSegment(
                      value: _PracticeMode.daily,
                      icon: Icon(Icons.today_outlined, size: 15),
                      label: Text('Daily Quiz'),
                    ),
                    ButtonSegment(
                      value: _PracticeMode.pyq,
                      icon: Icon(Icons.history_edu_outlined, size: 15),
                      label: Text('PYQ'),
                    ),
                    ButtonSegment(
                      value: _PracticeMode.sprint,
                      icon: Icon(Icons.timer_outlined, size: 15),
                      label: Text('Sprint'),
                    ),
                    ButtonSegment(
                      value: _PracticeMode.quest,
                      icon: Icon(Icons.waves_rounded, size: 15),
                      label: Text('Quest'),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (sel) {
                    setState(() {
                      _mode = sel.first;
                      _selectedOption = null;
                      _checkedAnswer = false;
                    });
                  },
                ),
              ),
              if (_mode != _PracticeMode.pyq && _mode != _PracticeMode.quest) ...[
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _filterChip('All Subjects', 'all'),
                      ...sscCglSubjects.map(
                        (s) => Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: _filterChip(s.shortTitle, s.id),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: _filterChip('Stats (JSO)', 'statistics'),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: _mode == _PracticeMode.quest
              ? OceanQuestHubView(
                  uid: widget.uid,
                  preferredLanguage: widget.preferredLanguage,
                  firestoreService: widget.firestoreService,
                  onGoHome: widget.onGoHome,
                )
              : _mode == _PracticeMode.pyq
                  ? PyqLibraryView(
                      uid: widget.uid,
                      preferredLanguage: widget.preferredLanguage,
                      firestoreService: widget.firestoreService,
                      onGoHome: widget.onGoHome,
                    )
                  : StreamBuilder(
                      stream: widget.firestoreService.streamPublishedQuestions(
                        subject: _selectedSubject,
                      ),
                      builder: (context, snap) {
                        if (snap.hasError && _bundledArchive.isEmpty) {
                          return Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.wifi_off,
                                      size: 40, color: OceanColors.coralAccent),
                                  const SizedBox(height: 10),
                                  const Text(
                                      'Could not load practice questions right now.'),
                                  const SizedBox(height: 12),
                                  FilledButton(
                                    onPressed: () => setState(() {}),
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        if (!snap.hasData && _bundledArchive.isEmpty) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        final remoteQs = (snap.data?.docs ?? [])
                            .map((d) => {'id': d.id, ...d.data()})
                            .toList();
                        final bundledFiltered = _selectedSubject == 'all'
                            ? _bundledArchive
                            : _bundledArchive
                                .where((q) =>
                                    (q['subject'] ?? '').toString() ==
                                    _selectedSubject)
                                .toList();
                        final mergedSubjectPool =
                            PyqArchiveLoader.mergeWithFirestore(
                          bundledFiltered,
                          remoteQs,
                          includeAiGenerated: true,
                        );

                        final topicSet = <String>{};
                        if (_selectedSubject != 'all') {
                          for (final st in getSyllabusTopicsForSubject(
                              _selectedSubject)) {
                            topicSet.add(st.title);
                          }
                        }
                        for (final q in mergedSubjectPool) {
                          final tp = (q['topic'] ?? '').toString().trim();
                          if (tp.isNotEmpty) topicSet.add(tp);
                        }
                        final sortedTopics = topicSet.toList()..sort();

                        final filteredQuestions = mergedSubjectPool.where((q) {
                          if (_selectedTopic != 'all' &&
                              (q['topic'] ?? '').toString() != _selectedTopic) {
                            return false;
                          }
                          if (_revisionOnly &&
                              !_revisionIds
                                  .contains((q['id'] ?? '').toString())) {
                            return false;
                          }
                          return true;
                        }).toList();

                        if (_mode == _PracticeMode.daily) {
                          return _buildDailyQuizView(mergedSubjectPool);
                        }

                        if (_mode == _PracticeMode.drill) {
                          return _buildDrillWrapper(
                            filteredQuestions,
                            sortedTopics,
                          );
                        }
                        if (filteredQuestions.isEmpty) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                'No questions matched this filter yet. Try clearing Topic or Revision filter.',
                                textAlign: TextAlign.center,
                              ),
                            ),
                          );
                        }
                        return _buildSprintView(filteredQuestions);
                      },
                    ),
        ),
      ],
    );
  }

  Widget _filterChip(String label, String value) {
    final active = _selectedSubject == value;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      selectedColor: OceanColors.turquoise.withValues(alpha: 0.22),
      side: BorderSide(
        color: active ? OceanColors.turquoise : OceanColors.borderLight,
      ),
      onSelected: (_) {
        setState(() {
          _selectedSubject = value;
          _selectedTopic = 'all';
          _drillIndex = 0;
          _selectedOption = null;
          _checkedAnswer = false;
        });
      },
    );
  }

  Widget _buildDrillWrapper(
    List<Map<String, dynamic>> questions,
    List<String> topics,
  ) {
    final safeTopicValue =
        (_selectedTopic == 'all' || topics.contains(_selectedTopic))
            ? _selectedTopic
            : 'all';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: OceanColors.pureWhite,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: OceanColors.borderLight),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: safeTopicValue,
                      items: [
                        DropdownMenuItem(
                          value: 'all',
                          child: Text(
                            'All Topics (${topics.length})',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        ...topics.map(
                          (tp) => DropdownMenuItem(
                            value: tp,
                            child: Text(
                              tp,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedTopic = val;
                            _drillIndex = 0;
                            _selectedOption = null;
                            _checkedAnswer = false;
                          });
                        }
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilterChip(
                selected: _revisionOnly,
                label: Text(
                  'Wrong Queue (${_revisionIds.length})',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                selectedColor: OceanColors.coralAccent.withValues(alpha: 0.2),
                onSelected: (v) {
                  setState(() {
                    _revisionOnly = v;
                    _drillIndex = 0;
                    _selectedOption = null;
                    _checkedAnswer = false;
                  });
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: questions.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.search_off_rounded,
                            size: 40, color: OceanColors.textMuted),
                        const SizedBox(height: 10),
                        Text(
                          _revisionOnly
                              ? 'Your wrong-answer revision queue is empty! Missed questions from quizzes and mocks appear here automatically.'
                              : 'No questions matched this topic filter yet.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _selectedTopic = 'all';
                              _revisionOnly = false;
                            });
                          },
                          child: const Text('Reset Filters'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildDrillView(questions),
        ),
      ],
    );
  }

  Widget _buildDrillView(List<Map<String, dynamic>> questions) {
    final safeIdx = _drillIndex % questions.length;
    final q = questions[safeIdx];
    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Question ${safeIdx + 1} of ${questions.length}',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: OceanColors.textMuted,
              ),
            ),
            if (_sessionTotal > 0)
              OceanStatusBadge(
                icon: Icons.check_circle_outline,
                label: 'Session: $_sessionCorrect / $_sessionTotal',
                color: OceanColors.oceanBlue,
              ),
          ],
        ),
        const SizedBox(height: 10),
        OceanGlassCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  OceanStatusBadge(
                    icon: Icons.category_outlined,
                    label: '${q['topic'] ?? 'SSC CGL'}',
                    color: OceanColors.oceanBlue,
                  ),
                  if (q['year'] != null)
                    OceanStatusBadge(
                      icon: Icons.calendar_today_outlined,
                      label: '${q['year']}',
                      color: OceanColors.textMuted,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                (q['questionEn'] ?? '').toString(),
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w700,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(options.length, (i) {
          final isSelected = _selectedOption == i;
          final isCorrectOpt = i == expected;
          Color borderColor = OceanColors.borderLight;
          Color bgColor = OceanColors.pureWhite;
          IconData? trailingIcon;
          Color trailingColor = OceanColors.oceanBlue;

          if (_checkedAnswer) {
            if (isCorrectOpt) {
              borderColor = OceanColors.emerald;
              bgColor = OceanColors.emerald.withValues(alpha: 0.10);
              trailingIcon = Icons.check_circle;
              trailingColor = OceanColors.emerald;
            } else if (isSelected) {
              borderColor = OceanColors.coralAccent;
              bgColor = OceanColors.coralAccent.withValues(alpha: 0.12);
              trailingIcon = Icons.cancel;
              trailingColor = OceanColors.coralAccent;
            }
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              onTap: _checkedAnswer ? null : () => _submitDrillOption(q, i),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                constraints: const BoxConstraints(minHeight: 54),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: borderColor,
                    width: _checkedAnswer && (isCorrectOpt || isSelected) ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: OceanColors.foamWhite,
                      child: Text(
                        String.fromCharCode(65 + i),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: OceanColors.deepOcean,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        options[i],
                        style: const TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (trailingIcon != null)
                      Icon(trailingIcon, color: trailingColor, size: 20),
                  ],
                ),
              ),
            ),
          );
        }),
        if (_checkedAnswer) ...[
          const SizedBox(height: 6),
          OceanGlassCard(
            borderColor: (_selectedOption == expected
                    ? OceanColors.emerald
                    : OceanColors.coralAccent)
                .withValues(alpha: 0.5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OceanStatusBadge(
                  icon: _selectedOption == expected
                      ? Icons.celebration_outlined
                      : Icons.info_outline,
                  label: _selectedOption == expected
                      ? 'Great job! Correct Answer (+15 XP)'
                      : 'Added to Revision Queue · Let’s learn why',
                  color: _selectedOption == expected
                      ? OceanColors.emerald
                      : OceanColors.coralAccent,
                ),
                const SizedBox(height: 10),
                Text(
                  StudentStrings.pickExplanation(q, widget.preferredLanguage),
                  style: const TextStyle(fontSize: 13, height: 1.45),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => StudentTutorScreen(
                              uid: widget.uid,
                              firestoreService: widget.firestoreService,
                              initialLanguage: widget.preferredLanguage,
                              initialSubject: (q['subject'] ?? 'quant').toString(),
                              contextTopic: (q['topic'] ?? '').toString(),
                              initialPrompt:
                                  'Help me understand this question: ${q['questionEn']}',
                              onGoHome: widget.onGoHome,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.auto_awesome, size: 16),
                      label: const Text('Ask AI'),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () {
                          setState(() {
                            _drillIndex = (_drillIndex + 1) % questions.length;
                            _selectedOption = null;
                            _checkedAnswer = false;
                          });
                        },
                        icon: const Icon(Icons.arrow_forward),
                        label: const Text('Next Question'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDailyQuizView(List<Map<String, dynamic>> pool) {
    if (!_dailyActive && !_dailyDone) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: OceanWaveHeaderCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.today_rounded, color: OceanColors.aqua, size: 36),
              const SizedBox(height: 12),
              const Text(
                'Daily SSC CGL 10-Q Quiz',
                style: TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Take a balanced 10-minute Tier 1 quiz (+2 for correct, -0.5 negative marking). Tracks speed (sec/Q), accuracy, and adds wrong answers to Revision.',
                style: TextStyle(color: OceanColors.seaGlass, height: 1.45),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: pool.isEmpty ? null : () => _startDailyQuiz(pool),
                style: FilledButton.styleFrom(
                  backgroundColor: OceanColors.turquoise,
                  foregroundColor: OceanColors.deepOcean,
                ),
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text('Start Daily Quiz (${pool.length < 10 ? pool.length : 10} Qs)'),
              ),
            ],
          ),
        ),
      );
    }

    if (_dailyDone) {
      final attempted = _dailyCorrect + _dailyWrong;
      final acc = attempted > 0 ? ((_dailyCorrect * 100) / attempted).round() : 0;
      final avgSec = attempted > 0 ? (_dailyTimeTaken / attempted).round() : 0;
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          OceanWaveHeaderCard(
            padding: const EdgeInsets.all(22),
            child: Row(
              children: [
                OceanProgressRing(
                  progress: acc / 100.0,
                  centerLabel: '$acc%',
                  subtitle: 'Accuracy',
                  size: 88,
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Score: ${_dailyScore.toStringAsFixed(1)} / ${_dailyMaxScore.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: OceanColors.foamWhite,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '$_dailyCorrect Right · $_dailyWrong Wrong · ${avgSec}s/Q avg',
                        style: const TextStyle(
                          color: OceanColors.seaGlass,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => _startDailyQuiz(pool),
                        style: FilledButton.styleFrom(
                          backgroundColor: OceanColors.turquoise,
                          foregroundColor: OceanColors.deepOcean,
                        ),
                        icon: const Icon(Icons.replay, size: 18),
                        label: const Text('Retake Daily Quiz'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ...List.generate(_dailyQuestions.length, (i) {
            final q = _dailyQuestions[i];
            final opts = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
                .map((e) => e.toString())
                .toList();
            final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
            final chosen = _dailyAnswers[i];
            final ok = chosen == expected;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Q${i + 1} · ${q['topic'] ?? ''}',
                            style: const TextStyle(fontWeight: FontWeight.w800)),
                        OceanStatusBadge(
                          icon: chosen == null
                              ? Icons.remove_circle_outline
                              : ok
                                  ? Icons.check_circle_outline
                                  : Icons.cancel_outlined,
                          label: chosen == null
                              ? 'Skipped'
                              : ok
                                  ? 'Correct'
                                  : 'Wrong',
                          color: chosen == null
                              ? OceanColors.textMuted
                              : ok
                                  ? OceanColors.emerald
                                  : OceanColors.coralAccent,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text((q['questionEn'] ?? '').toString(),
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(
                      'Answer: ${String.fromCharCode(65 + expected)}. ${opts[expected]}',
                      style: const TextStyle(
                        color: OceanColors.emerald,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      StudentStrings.pickExplanation(q, widget.preferredLanguage),
                      style: const TextStyle(
                        fontSize: 12,
                        color: OceanColors.textMuted,
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

    final q = _dailyQuestions[_dailyIdx];
    final opts = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final mins = (_dailySecondsLeft ~/ 60).toString().padLeft(2, '0');
    final secs = (_dailySecondsLeft % 60).toString().padLeft(2, '0');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Question ${_dailyIdx + 1} of ${_dailyQuestions.length}',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            OceanStatusBadge(
              icon: Icons.timer_outlined,
              label: '$mins:$secs',
              color: _dailySecondsLeft < 60
                  ? OceanColors.coralAccent
                  : OceanColors.oceanBlue,
            ),
          ],
        ),
        const SizedBox(height: 12),
        OceanGlassCard(
          padding: const EdgeInsets.all(18),
          child: Text(
            (q['questionEn'] ?? '').toString(),
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              height: 1.45,
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(opts.length, (i) {
          final sel = _dailyAnswers[_dailyIdx] == i;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              onTap: () => setState(() => _dailyAnswers[_dailyIdx] = i),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: sel
                      ? OceanColors.turquoise.withValues(alpha: 0.14)
                      : OceanColors.pureWhite,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: sel ? OceanColors.turquoise : OceanColors.borderLight,
                    width: sel ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      '${String.fromCharCode(65 + i)}. ',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    Expanded(child: Text(opts[i])),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 10),
        Row(
          children: [
            OutlinedButton(
              onPressed: _dailyIdx > 0
                  ? () => setState(() => _dailyIdx--)
                  : null,
              child: const Text('Previous'),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                onPressed: () {
                  if (_dailyIdx < _dailyQuestions.length - 1) {
                    setState(() => _dailyIdx++);
                  } else {
                    _finishDailyQuiz();
                  }
                },
                child: Text(
                  _dailyIdx < _dailyQuestions.length - 1
                      ? 'Save & Next'
                      : 'Submit Quiz',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSprintView(List<Map<String, dynamic>> questions) {
    if (!_sprintRunning && !_sprintDone) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: OceanWaveHeaderCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.bolt_rounded, color: OceanColors.aqua, size: 36),
              const SizedBox(height: 12),
              const Text(
                '60-Second Ocean Sprint',
                style: TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Answer as many rapid SSC CGL questions as you can in 60 seconds. Great for boosting speed before Tier 1!',
                style: TextStyle(color: OceanColors.seaGlass, height: 1.4),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _startSprint,
                style: FilledButton.styleFrom(
                  backgroundColor: OceanColors.turquoise,
                  foregroundColor: OceanColors.deepOcean,
                ),
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Start 60s Sprint'),
              ),
            ],
          ),
        ),
      );
    }

    if (_sprintDone) {
      final acc = _sprintAttempted > 0
          ? ((_sprintCorrect * 100) / _sprintAttempted).round()
          : 0;
      return Padding(
        padding: const EdgeInsets.all(16),
        child: OceanWaveHeaderCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              OceanProgressRing(
                progress: acc / 100.0,
                centerLabel: '$acc%',
                subtitle: 'Accuracy',
                size: 96,
              ),
              const SizedBox(height: 16),
              Text(
                'Sprint Complete! $_sprintCorrect / $_sprintAttempted Correct',
                style: const TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _startSprint,
                style: FilledButton.styleFrom(
                  backgroundColor: OceanColors.turquoise,
                  foregroundColor: OceanColors.deepOcean,
                ),
                icon: const Icon(Icons.replay),
                label: const Text('Play Again'),
              ),
            ],
          ),
        ),
      );
    }

    final q = questions[_sprintIndex % questions.length];
    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            OceanStatusBadge(
              icon: Icons.timer_outlined,
              label: '${_sprintSeconds}s left',
              color: _sprintSeconds <= 10
                  ? OceanColors.coralAccent
                  : OceanColors.oceanBlue,
            ),
            OceanStatusBadge(
              icon: Icons.star_outline,
              label: 'Score: $_sprintCorrect',
              color: OceanColors.emerald,
            ),
          ],
        ),
        const SizedBox(height: 12),
        OceanGlassCard(
          padding: const EdgeInsets.all(18),
          child: Text(
            (q['questionEn'] ?? '').toString(),
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...List.generate(options.length, (i) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton(
              onPressed: () {
                final ok = i == expected;
                final qId = (q['id'] ?? '').toString();
                setState(() {
                  _sprintAttempted++;
                  if (ok) {
                    _sprintCorrect++;
                  } else if (qId.isNotEmpty) {
                    _revisionIds = {..._revisionIds, qId};
                  }
                  _sprintIndex++;
                });
                widget.firestoreService.recordPracticeAttempt(
                  uid: widget.uid,
                  subject: (q['subject'] ?? 'quant').toString(),
                  isCorrect: ok,
                );
                if (!ok && qId.isNotEmpty) {
                  widget.firestoreService.addWrongQuestionsToRevision(
                    uid: widget.uid,
                    wrongIds: [qId],
                  );
                }
              },
              style: OutlinedButton.styleFrom(
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                backgroundColor: OceanColors.pureWhite,
              ),
              child: Text(
                '${String.fromCharCode(65 + i)}. ${options[i]}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: OceanColors.deepOcean,
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
