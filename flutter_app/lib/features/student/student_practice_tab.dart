import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'pyq_archive_loader.dart';
import 'student_i18n.dart';
import 'student_tutor_screen.dart';
import 'pyq_library_screen.dart';
import 'ocean_quest_screen.dart';

enum _PracticeMode { drill, pyq, sprint, quest }

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

  int _drillIndex = 0;
  int? _selectedOption;
  bool _checkedAnswer = false;
  int _sessionCorrect = 0;
  int _sessionTotal = 0;

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
  }

  @override
  void dispose() {
    _sprintTimer?.cancel();
    super.dispose();
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
    setState(() {
      _selectedOption = chosenIndex;
      _checkedAnswer = true;
      _sessionTotal++;
      if (isCorrect) _sessionCorrect++;
    });

    try {
      await widget.firestoreService.recordPracticeAttempt(
        uid: widget.uid,
        subject: (q['subject'] ?? 'quant').toString(),
        isCorrect: isCorrect,
      );
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
                      'Try Topic Drill to solve one question at a time with instant explanations, or browse 11 years of SSC CGL PYQs (2016–2026).',
                  onDismiss: widget.onDismissTip,
                ),
              SegmentedButton<_PracticeMode>(
                segments: const [
                  ButtonSegment(
                    value: _PracticeMode.drill,
                    icon: Icon(Icons.flash_on_outlined, size: 16),
                    label: Text('Drill'),
                  ),
                  ButtonSegment(
                    value: _PracticeMode.pyq,
                    icon: Icon(Icons.history_edu_outlined, size: 16),
                    label: Text('PYQ'),
                  ),
                  ButtonSegment(
                    value: _PracticeMode.sprint,
                    icon: Icon(Icons.timer_outlined, size: 16),
                    label: Text('Sprint'),
                  ),
                  ButtonSegment(
                    value: _PracticeMode.quest,
                    icon: Icon(Icons.waves_rounded, size: 16),
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
                    if (snap.hasError) {
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
                    final questions = PyqArchiveLoader.mergeWithFirestore(
                      bundledFiltered,
                      remoteQs,
                    );
                    if (questions.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'No questions matched this filter yet. Try selecting "All Subjects".',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      );
                    }

                    if (_mode == _PracticeMode.drill) {
                      return _buildDrillView(questions);
                    }
                    return _buildSprintView(questions);
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
          _drillIndex = 0;
          _selectedOption = null;
          _checkedAnswer = false;
        });
      },
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
              Row(
                children: [
                  OceanStatusBadge(
                    icon: Icons.category_outlined,
                    label: '${q['topic'] ?? 'SSC CGL'}',
                    color: OceanColors.oceanBlue,
                  ),
                  const SizedBox(width: 8),
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
                      : 'Nice try! Let’s learn why',
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
                              firestoreService: widget.firestoreService,
                              initialLanguage: widget.preferredLanguage,
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
                setState(() {
                  _sprintAttempted++;
                  if (ok) _sprintCorrect++;
                  _sprintIndex++;
                });
                widget.firestoreService.recordPracticeAttempt(
                  uid: widget.uid,
                  subject: (q['subject'] ?? 'quant').toString(),
                  isCorrect: ok,
                );
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
