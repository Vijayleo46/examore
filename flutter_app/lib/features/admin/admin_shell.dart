import 'dart:io';
import 'dart:ui' show FontFeature;
import 'package:file_picker/file_picker.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import 'admin_predictor_screen.dart';

class AdminShell extends StatefulWidget {
  final AuthSessionState session;
  final AuthService authService;
  final FirestoreService firestoreService;
  final VoidCallback onSignedOut;

  const AdminShell({
    super.key,
    required this.session,
    required this.authService,
    required this.firestoreService,
    required this.onSignedOut,
  });

  @override
  State<AdminShell> createState() => _AdminShellState();
}

enum _UserStatusFilter { all, active, inactive }
enum _RegistrationDateFilter { all, today, last7d, last30d }
enum _AdminContentTab { questions, courses, videos, mocks, quests }

class _AdminShellState extends State<AdminShell> {
  int _navIdx = 0;
  bool _loading = true;
  String? _loadError;

  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _attempts = [];
  List<Map<String, dynamic>> _questions = [];
  List<Map<String, dynamic>> _courses = [];
  List<Map<String, dynamic>> _videos = [];
  List<Map<String, dynamic>> _mocks = [];
  List<Map<String, dynamic>> _questMissions = [];
  List<Map<String, dynamic>> _questProgress = [];

  String _userSearch = '';
  _UserStatusFilter _statusFilter = _UserStatusFilter.all;
  _RegistrationDateFilter _dateFilter = _RegistrationDateFilter.all;
  _AdminContentTab _contentTab = _AdminContentTab.questions;

  String _qSearch = '';
  int? _qYearFilter;
  String _qSubjectFilter = 'all';
  String _qStatusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final results = await Future.wait([
        widget.firestoreService.fetchAllStudents(),
        widget.firestoreService.fetchAllTestAttempts(),
        widget.firestoreService.fetchAllQuestions(),
        widget.firestoreService.fetchAllCourses(),
        widget.firestoreService.fetchAllVideos(),
        widget.firestoreService.fetchAllMockTests(),
        widget.firestoreService.fetchAllOceanQuestMissions(),
        widget.firestoreService.fetchAllOceanQuestProgress(),
      ]);
      if (mounted) {
        setState(() {
          _students = results[0];
          _attempts = results[1];
          _questions = results[2];
          _courses = results[3];
          _videos = results[4];
          _mocks = results[5];
          _questMissions = results[6];
          _questProgress = results[7];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadError = 'Unable to load latest records. Check your connection and retry.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _importQuestionsWithPreview() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv', 'json'],
    );
    if (result == null || result.files.single.path == null) return;
    final raw = await File(result.files.single.path!).readAsString();
    final validation = widget.firestoreService.parseAndValidateQuestions(raw);

    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Import Validation Summary'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Total Rows Found: ${validation.totalRows}'),
              Text(
                'Ready to Import: ${validation.validQuestions.length}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: OceanColors.emerald,
                ),
              ),
              if (validation.warnings.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  'Skipped / Warnings (${validation.warnings.length}):',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: OceanColors.coralAccent,
                  ),
                ),
                const SizedBox(height: 4),
                ...validation.warnings.take(6).map(
                      (w) => Text('• $w', style: const TextStyle(fontSize: 12)),
                    ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: validation.validQuestions.isEmpty
                ? null
                : () => Navigator.of(ctx).pop(true),
            child: Text('Import ${validation.validQuestions.length} Questions'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final count = await widget.firestoreService
          .commitValidatedQuestions(validation.validQuestions);
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Imported $count validated questions.')),
        );
      }
    }
  }

  Future<bool> _confirmDelete(String itemLabel) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Deletion'),
        content: Text(
          'Are you sure you want to permanently remove "$itemLabel"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: OceanColors.coralAccent,
              foregroundColor: OceanColors.deepOcean,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    return res == true;
  }

  void _openStudentDetailModal(Map<String, dynamic> st) {
    final attempted = int.tryParse((st['questionsAttempted'] ?? 0).toString()) ?? 0;
    final correct = int.tryParse((st['questionsCorrect'] ?? 0).toString()) ?? 0;
    final acc = attempted > 0 ? ((correct * 100) / attempted).round() : 0;
    final isActive = st['isActive'] != false;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${st['displayName'] ?? 'Student'}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if ((st['username'] ?? '').toString().isNotEmpty)
              Text(
                '@${st['username']}',
                style: const TextStyle(
                  color: OceanColors.oceanBlue,
                  fontWeight: FontWeight.w700,
                ),
              ),
            Text((st['email'] ?? '').toString()),
            const Divider(height: 22),
            Text('Target Post: ${st['targetPost'] ?? 'SSC CGL'}'),
            Text('Language: ${(st['preferredLanguage'] ?? 'en').toString().toUpperCase()}'),
            Text('XP Earned: ${st['xp'] ?? 0}'),
            Text('Streak: ${st['streak'] ?? 1} days'),
            Text('Mock Tests Completed: ${st['mockTestsCompleted'] ?? 0}'),
            Text('Questions: $correct / $attempted ($acc% accuracy)'),
            Text(
              'Registered: ${(st['createdAt'] ?? '').toString().split('T').first}',
            ),
            const SizedBox(height: 10),
            OceanStatusBadge(
              icon: isActive ? Icons.check_circle_outline : Icons.block,
              label: isActive ? 'Active Account' : 'Deactivated',
              color: isActive ? OceanColors.emerald : OceanColors.coralAccent,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  String _safeOption(dynamic rawOptions, int index) {
    if (rawOptions is List && index >= 0 && index < rawOptions.length) {
      return rawOptions[index].toString();
    }
    return '';
  }

  String _questionAnswerStatus(Map<String, dynamic> q) {
    final source = (q['sourceType'] ?? 'PYQ').toString();
    if (source == 'AI_GENERATED') return 'needs_verification';
    final raw = (q['answerStatus'] ?? '').toString();
    if (raw == 'official' ||
        raw == 'unofficial' ||
        raw == 'needs_verification') {
      return raw;
    }
    return q['isVerified'] == true ? 'official' : 'needs_verification';
  }

  List<List<Map<String, dynamic>>> _findDuplicateGroups() {
    final Map<String, List<Map<String, dynamic>>> buckets = {};
    for (final q in _questions) {
      final norm = (q['questionEn'] ?? '')
          .toString()
          .toLowerCase()
          .replaceAll(RegExp(r'\s+'), ' ')
          .replaceAll(RegExp(r'[^a-z0-9 ]'), '')
          .trim();
      if (norm.length < 12) continue;
      final key = norm.length > 90 ? norm.substring(0, 90) : norm;
      buckets.putIfAbsent(key, () => []).add(q);
    }
    return buckets.values.where((g) => g.length > 1).toList();
  }

  void _openCoverageMatrixDialog() {
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('2016–2026 PYQ Coverage Matrix'),
        content: SizedBox(
          width: 460,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Honest inventory of published & draft questions by exam year. Years with 0 items need paper uploads.',
                  style: TextStyle(fontSize: 12.5, color: OceanColors.textMuted),
                ),
                const SizedBox(height: 12),
                ...years.map((yr) {
                  final list = _questions
                      .where((q) =>
                          int.tryParse((q['year'] ?? '').toString()) == yr)
                      .toList();
                  final t1 = list
                      .where((q) => (q['tier'] ?? 'Tier 1') == 'Tier 1')
                      .length;
                  final t2 = list
                      .where((q) => (q['tier'] ?? '') == 'Tier 2')
                      .length;
                  final official = list
                      .where((q) => _questionAnswerStatus(q) == 'official')
                      .length;
                  final review = list
                      .where((q) =>
                          _questionAnswerStatus(q) == 'needs_verification')
                      .length;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: OceanGlassCard(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Text(
                            '$yr',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              list.isEmpty
                                  ? 'No papers imported yet'
                                  : 'Total: ${list.length} · T1: $t1 · T2: $t2 · Official: $official · Review: $review',
                              style: TextStyle(
                                fontSize: 12,
                                color: list.isEmpty
                                    ? OceanColors.coralAccent
                                    : OceanColors.textDark,
                                fontWeight: FontWeight.w600,
                                fontFeatures: const [
                                  FontFeature.tabularFigures()
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _openDuplicateDetectorDialog() {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final groups = _findDuplicateGroups();
          return AlertDialog(
            title: Text('Duplicate Detector (${groups.length} groups)'),
            content: SizedBox(
              width: 460,
              child: groups.isEmpty
                  ? const Text(
                      'No duplicate questions detected across the question bank.',
                    )
                  : SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: groups.map((group) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: OceanGlassCard(
                              padding: const EdgeInsets.all(12),
                              borderColor: OceanColors.coralAccent,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (group.first['questionEn'] ?? '')
                                        .toString(),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  ...group.map((item) {
                                    return Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${item['id']} · ${item['year'] ?? '—'} · ${item['tier'] ?? ''}',
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              color: OceanColors.textMuted,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(
                                            Icons.delete_outline,
                                            color: OceanColors.coralAccent,
                                            size: 18,
                                          ),
                                          onPressed: () async {
                                            await widget.firestoreService
                                                .deleteQuestion(
                                                    item['id'].toString());
                                            await _refresh();
                                            setModalState(() {});
                                          },
                                        ),
                                      ],
                                    );
                                  }),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Done'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _openAddQuestionDialog([Map<String, dynamic>? existing]) async {
    final questionCtrl =
        TextEditingController(text: (existing?['questionEn'] ?? '').toString());
    final topicCtrl = TextEditingController(
        text: (existing?['topic'] ?? 'Percentage').toString());
    final examDateCtrl =
        TextEditingController(text: (existing?['examDate'] ?? '').toString());
    final shiftCtrl =
        TextEditingController(text: (existing?['shift'] ?? '').toString());
    final qNumCtrl = TextEditingController(
        text: (existing?['questionNumber'] ?? '').toString());
    final optACtrl =
        TextEditingController(text: _safeOption(existing?['optionsEn'], 0));
    final optBCtrl =
        TextEditingController(text: _safeOption(existing?['optionsEn'], 1));
    final optCCtrl =
        TextEditingController(text: _safeOption(existing?['optionsEn'], 2));
    final optDCtrl =
        TextEditingController(text: _safeOption(existing?['optionsEn'], 3));
    final expCtrl = TextEditingController(
      text: ((existing?['explanations'] as Map?)?['en'] ?? '').toString(),
    );
    final shortcutCtrl = TextEditingController(
      text: (existing?['shortcutMethod'] ?? '').toString(),
    );
    final stepsCtrl = TextEditingController(
      text: (existing?['stepByStep'] as List<dynamic>? ?? []).join('\n'),
    );

    String subject = (existing?['subject'] ?? 'quant').toString();
    int year = int.tryParse((existing?['year'] ?? 2024).toString()) ?? 2024;
    String tier = (existing?['tier'] ?? 'Tier 1').toString();
    String difficulty = (existing?['difficulty'] ?? 'Medium').toString();
    String sourceType =
        (existing?['sourceType'] ?? 'PYQ').toString() == 'AI_GENERATED'
            ? 'AI_GENERATED'
            : 'PYQ';
    String answerStatus = existing != null
        ? _questionAnswerStatus(existing)
        : 'needs_verification';
    bool isPublished = existing?['isPublished'] != false;
    int correctIdx =
        (int.tryParse((existing?['correctIndex'] ?? 0).toString()) ?? 0)
            .clamp(0, 3);

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: Text(existing == null ? 'Add SSC CGL Question' : 'Edit Question'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: subject,
                  decoration: const InputDecoration(labelText: 'Subject'),
                  items: const [
                    DropdownMenuItem(value: 'quant', child: Text('Quantitative Aptitude')),
                    DropdownMenuItem(value: 'reasoning', child: Text('Reasoning')),
                    DropdownMenuItem(value: 'english', child: Text('English')),
                    DropdownMenuItem(value: 'ga', child: Text('General Awareness')),
                    DropdownMenuItem(value: 'computer', child: Text('Computer')),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => subject = v);
                  },
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        value: (year >= 2016 && year <= 2026) ? year : 2024,
                        decoration: const InputDecoration(labelText: 'Exam Year'),
                        items: [
                          for (int y = 2026; y >= 2016; y--)
                            DropdownMenuItem(value: y, child: Text('$y')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => year = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: (tier == 'Tier 1' || tier == 'Tier 2')
                            ? tier
                            : 'Tier 1',
                        decoration: const InputDecoration(labelText: 'Tier'),
                        items: const [
                          DropdownMenuItem(value: 'Tier 1', child: Text('Tier 1')),
                          DropdownMenuItem(value: 'Tier 2', child: Text('Tier 2')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => tier = v);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: ['Easy', 'Medium', 'Hard'].contains(difficulty)
                            ? difficulty
                            : 'Medium',
                        decoration: const InputDecoration(labelText: 'Difficulty'),
                        items: const [
                          DropdownMenuItem(value: 'Easy', child: Text('Easy')),
                          DropdownMenuItem(value: 'Medium', child: Text('Medium')),
                          DropdownMenuItem(value: 'Hard', child: Text('Hard')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => difficulty = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: qNumCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Q. No.'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: examDateCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Exam Date',
                          hintText: 'e.g. 24 Sep 2024',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: shiftCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Shift',
                          hintText: 'e.g. Shift 2',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: sourceType,
                  decoration: const InputDecoration(labelText: 'Source Type'),
                  items: const [
                    DropdownMenuItem(value: 'PYQ', child: Text('Authentic PYQ')),
                    DropdownMenuItem(
                        value: 'AI_GENERATED', child: Text('Practice / AI Draft')),
                  ],
                  onChanged: (v) {
                    if (v != null) {
                      setModalState(() {
                        sourceType = v;
                        if (v == 'AI_GENERATED') {
                          answerStatus = 'needs_verification';
                        }
                      });
                    }
                  },
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: sourceType == 'AI_GENERATED'
                      ? 'needs_verification'
                      : answerStatus,
                  decoration:
                      const InputDecoration(labelText: 'Answer Key Status'),
                  items: [
                    if (sourceType != 'AI_GENERATED')
                      const DropdownMenuItem(
                        value: 'official',
                        child: Text('Official Final Key'),
                      ),
                    if (sourceType != 'AI_GENERATED')
                      const DropdownMenuItem(
                        value: 'unofficial',
                        child: Text('Unofficial Key'),
                      ),
                    const DropdownMenuItem(
                      value: 'needs_verification',
                      child: Text('Needs Verification'),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => answerStatus = v);
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: topicCtrl,
                  decoration: const InputDecoration(labelText: 'Topic'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: questionCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Question Text'),
                ),
                const SizedBox(height: 10),
                TextField(
                    controller: optACtrl,
                    decoration: const InputDecoration(labelText: 'Option A')),
                const SizedBox(height: 8),
                TextField(
                    controller: optBCtrl,
                    decoration: const InputDecoration(labelText: 'Option B')),
                const SizedBox(height: 8),
                TextField(
                    controller: optCCtrl,
                    decoration: const InputDecoration(labelText: 'Option C')),
                const SizedBox(height: 8),
                TextField(
                    controller: optDCtrl,
                    decoration: const InputDecoration(labelText: 'Option D')),
                const SizedBox(height: 10),
                DropdownButtonFormField<int>(
                  value: correctIdx,
                  decoration: const InputDecoration(labelText: 'Correct Option'),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('Option A')),
                    DropdownMenuItem(value: 1, child: Text('Option B')),
                    DropdownMenuItem(value: 2, child: Text('Option C')),
                    DropdownMenuItem(value: 3, child: Text('Option D')),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => correctIdx = v);
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: expCtrl,
                  maxLines: 2,
                  decoration:
                      const InputDecoration(labelText: 'Explanation (English)'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: stepsCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Step-by-Step Solution (one step per line)',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: shortcutCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                      labelText: 'Exam Shortcut Method (Optional)'),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Published to Students'),
                  value: isPublished,
                  activeTrackColor: OceanColors.turquoise,
                  onChanged: (v) => setModalState(() => isPublished = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Save Question'),
            ),
          ],
        ),
      ),
    );

    if (saved == true && questionCtrl.text.trim().isNotEmpty) {
      final id = (existing?['id'] ?? 'q_${DateTime.now().millisecondsSinceEpoch}')
          .toString();
      final stepsList = stepsCtrl.text
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      final effectiveStatus =
          sourceType == 'AI_GENERATED' ? 'needs_verification' : answerStatus;
      await widget.firestoreService.upsertQuestion(id, {
        'id': id,
        'subject': subject,
        'topic':
            topicCtrl.text.trim().isEmpty ? 'General' : topicCtrl.text.trim(),
        'year': year,
        'tier': tier,
        'difficulty': difficulty,
        'examDate': examDateCtrl.text.trim(),
        'shift': shiftCtrl.text.trim(),
        if (int.tryParse(qNumCtrl.text.trim()) != null)
          'questionNumber': int.parse(qNumCtrl.text.trim()),
        'sourceType': sourceType,
        'answerStatus': effectiveStatus,
        'isVerified': effectiveStatus == 'official',
        'isPublished': isPublished,
        'questionEn': questionCtrl.text.trim(),
        'optionsEn': [
          optACtrl.text.trim(),
          optBCtrl.text.trim(),
          optCCtrl.text.trim(),
          optDCtrl.text.trim(),
        ],
        'correctIndex': correctIdx,
        'explanations': {
          'en': expCtrl.text.trim(),
          'ml': '',
          'hi': '',
          'ta': '',
        },
        if (stepsList.isNotEmpty) 'stepByStep': stepsList,
        if (shortcutCtrl.text.trim().isNotEmpty)
          'shortcutMethod': shortcutCtrl.text.trim(),
      });
      await _refresh();
    }
  }

  Future<void> _openQuestMissionDialog([Map<String, dynamic>? existing]) async {
    final titleCtrl =
        TextEditingController(text: (existing?['title'] ?? '').toString());
    final descCtrl = TextEditingController(
        text: (existing?['description'] ?? '').toString());
    final qCountCtrl = TextEditingController(
        text: (existing?['questionCount'] ?? 6).toString());
    final timerCtrl = TextEditingController(
        text: (existing?['timeLimitSec'] ?? 240).toString());
    final xpCtrl =
        TextEditingController(text: (existing?['xpReward'] ?? 150).toString());
    final coinCtrl =
        TextEditingController(text: (existing?['coinReward'] ?? 75).toString());
    final crystalCtrl = TextEditingController(
        text: (existing?['crystalReward'] ?? 8).toString());

    String locationId = (existing?['locationId'] ?? 'coral-bay').toString();
    String mode = (existing?['mode'] ?? 'treasure-hunt').toString();
    String difficulty = (existing?['difficulty'] ?? 'beginner').toString();
    String subject = (existing?['subject'] ?? 'mixed').toString();
    bool isBoss = existing?['isBoss'] == true;
    bool isPublished = existing?['isPublished'] != false;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: Text(existing == null
              ? 'New Ocean Quest Mission'
              : 'Edit Ocean Quest Mission'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Mission Title'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: locationId,
                  decoration: const InputDecoration(labelText: 'Ocean Zone'),
                  items: const [
                    DropdownMenuItem(value: 'coral-bay', child: Text('1. Coral Bay (20m)')),
                    DropdownMenuItem(value: 'sunken-ship', child: Text('2. Sunken Ship (60m)')),
                    DropdownMenuItem(value: 'turtle-reef', child: Text('3. Turtle Reef (110m)')),
                    DropdownMenuItem(value: 'sunken-city', child: Text('4. Sunken City (240m)')),
                    DropdownMenuItem(value: 'deep-sea-lab', child: Text('5. Deep Sea Lab (420m)')),
                    DropdownMenuItem(value: 'crystal-cave', child: Text('6. Crystal Cave (680m)')),
                    DropdownMenuItem(value: 'abyss-kingdom', child: Text('7. Abyss Kingdom (1200m)')),
                    DropdownMenuItem(value: 'ancient-ocean-temple', child: Text('8. Ancient Temple (1850m)')),
                    DropdownMenuItem(value: 'ocean-champion-arena', child: Text('9. Champion Arena (2500m)')),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => locationId = v);
                  },
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: mode,
                  decoration: const InputDecoration(labelText: 'Game Mode'),
                  items: const [
                    DropdownMenuItem(value: 'treasure-hunt', child: Text('Treasure Hunt')),
                    DropdownMenuItem(value: 'submarine-exploration', child: Text('Submarine Depth')),
                    DropdownMenuItem(value: 'crystal-rush', child: Text('Crystal Rush')),
                    DropdownMenuItem(value: 'boss-battle', child: Text('Boss Battle')),
                    DropdownMenuItem(value: 'daily-challenge', child: Text('Daily Challenge')),
                    DropdownMenuItem(value: 'subject-mission', child: Text('Subject Dive')),
                  ],
                  onChanged: (v) {
                    if (v != null) setModalState(() => mode = v);
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: difficulty,
                        decoration: const InputDecoration(labelText: 'Difficulty'),
                        items: const [
                          DropdownMenuItem(value: 'beginner', child: Text('Beginner')),
                          DropdownMenuItem(value: 'intermediate', child: Text('Intermediate')),
                          DropdownMenuItem(value: 'advanced', child: Text('Advanced')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => difficulty = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: subject,
                        decoration: const InputDecoration(labelText: 'Subject'),
                        items: const [
                          DropdownMenuItem(value: 'mixed', child: Text('Mixed')),
                          DropdownMenuItem(value: 'quant', child: Text('Quant')),
                          DropdownMenuItem(value: 'reasoning', child: Text('Reasoning')),
                          DropdownMenuItem(value: 'english', child: Text('English')),
                          DropdownMenuItem(value: 'ga', child: Text('GA')),
                          DropdownMenuItem(value: 'computer', child: Text('Computer')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => subject = v);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: qCountCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Questions'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: timerCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Timer (sec)'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: xpCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'XP'),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: coinCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Coins'),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: crystalCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Crystals'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Guardian Boss Mission'),
                  value: isBoss,
                  onChanged: (v) => setModalState(() => isBoss = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Published to Students'),
                  value: isPublished,
                  onChanged: (v) => setModalState(() => isPublished = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Save Mission'),
            ),
          ],
        ),
      ),
    );

    if (saved == true && titleCtrl.text.trim().isNotEmpty) {
      final id = (existing?['missionId'] ??
              existing?['id'] ??
              'oq_custom_${DateTime.now().millisecondsSinceEpoch}')
          .toString();
      await widget.firestoreService.upsertOceanQuestMission(id, {
        'missionId': id,
        'locationId': locationId,
        'locationOrder': existing?['locationOrder'] ?? 1,
        'title': titleCtrl.text.trim(),
        'description': descCtrl.text.trim(),
        'mode': mode,
        'difficulty': difficulty,
        'subject': subject,
        'questionCount': int.tryParse(qCountCtrl.text.trim()) ?? 6,
        'timeLimitSec': int.tryParse(timerCtrl.text.trim()) ?? 240,
        'minAccuracyPct': existing?['minAccuracyPct'] ?? 60,
        'hintLimit': existing?['hintLimit'] ?? 2,
        'xpReward': int.tryParse(xpCtrl.text.trim()) ?? 150,
        'coinReward': int.tryParse(coinCtrl.text.trim()) ?? 75,
        'crystalReward': int.tryParse(crystalCtrl.text.trim()) ?? 8,
        'isBoss': isBoss,
        'isPublished': isPublished,
        'order': existing?['order'] ?? (_questMissions.length + 1),
      });
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 900;
    const destinations = [
      NavigationRailDestination(
        icon: Icon(Icons.dashboard_outlined),
        label: Text('Overview'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.people_outline),
        label: Text('Students'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.analytics_outlined),
        label: Text('Analytics'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.library_books_outlined),
        label: Text('Content'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.file_download_outlined),
        label: Text('Reports'),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [OceanColors.oceanBlue, OceanColors.turquoise],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.waves_rounded,
                color: OceanColors.pureWhite,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'Examora Admin Console',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AdminPredictorScreen(
                    firestoreService: widget.firestoreService,
                    allQuestions: _questions,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.radar_rounded, color: OceanColors.oceanBlue),
            tooltip: 'Future Predictor Control',
          ),
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Data',
          ),
          IconButton(
            onPressed: () async {
              await widget.authService.signOut();
              widget.onSignedOut();
            },
            icon: const Icon(Icons.logout, color: OceanColors.coralAccent),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: Row(
        children: [
          if (isWide)
            NavigationRail(
              backgroundColor: OceanColors.deepOcean,
              selectedIndex: _navIdx,
              onDestinationSelected: (i) => setState(() => _navIdx = i),
              labelType: NavigationRailLabelType.all,
              selectedIconTheme: const IconThemeData(color: OceanColors.deepOcean),
              unselectedIconTheme: const IconThemeData(color: OceanColors.seaGlass),
              selectedLabelTextStyle: const TextStyle(
                color: OceanColors.aqua,
                fontWeight: FontWeight.w700,
              ),
              unselectedLabelTextStyle: const TextStyle(color: OceanColors.seaGlass),
              indicatorColor: OceanColors.turquoise,
              destinations: destinations,
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _loadError != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.cloud_off,
                                color: OceanColors.coralAccent, size: 42),
                            const SizedBox(height: 10),
                            Text(_loadError!),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: _refresh,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _buildSection(),
          ),
        ],
      ),
      bottomNavigationBar: isWide
          ? null
          : NavigationBar(
              selectedIndex: _navIdx,
              onDestinationSelected: (i) => setState(() => _navIdx = i),
              destinations: const [
                NavigationDestination(
                    icon: Icon(Icons.dashboard_outlined), label: 'Overview'),
                NavigationDestination(
                    icon: Icon(Icons.people_outline), label: 'Students'),
                NavigationDestination(
                    icon: Icon(Icons.analytics_outlined), label: 'Analytics'),
                NavigationDestination(
                    icon: Icon(Icons.library_books_outlined), label: 'Content'),
                NavigationDestination(
                    icon: Icon(Icons.file_download_outlined), label: 'Reports'),
              ],
            ),
    );
  }

  Widget _buildSection() {
    final onlyStudents =
        _students.where((s) => s['role'] != 'admin').toList();
    final activeCount =
        onlyStudents.where((s) => s['isActive'] != false).length;
    final inactiveCount = onlyStudents.length - activeCount;

    if (_navIdx == 0) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          OceanWaveHeaderCard(
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Examora Academy Pulse',
                        style: TextStyle(
                          color: OceanColors.foamWhite,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Manage students, content library, mock analytics, and exports cleanly.',
                        style: TextStyle(color: OceanColors.seaGlass, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                OceanProgressRing(
                  progress: onlyStudents.isEmpty
                      ? 0
                      : activeCount / onlyStudents.length,
                  centerLabel: '${onlyStudents.length}',
                  subtitle: 'Students',
                  size: 80,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _AdminKpi(
                label: 'Active Students',
                value: '$activeCount',
                accent: OceanColors.turquoise,
              ),
              _AdminKpi(
                label: 'Inactive',
                value: '$inactiveCount',
                accent: OceanColors.coralAccent,
              ),
              _AdminKpi(
                label: 'Tests Attempted',
                value: '${_attempts.length}',
                accent: OceanColors.oceanBlue,
              ),
              _AdminKpi(
                label: 'Published Questions',
                value: '${_questions.length}',
                accent: OceanColors.oceanNavy,
              ),
            ],
          ),
          const SizedBox(height: 14),
          OceanGlassCard(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AdminPredictorScreen(
                    firestoreService: widget.firestoreService,
                    allQuestions: _questions,
                  ),
                ),
              );
            },
            borderColor: OceanColors.turquoise,
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: OceanColors.oceanBlue.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.radar_rounded, color: OceanColors.oceanBlue),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Future Exam Predictor Control Panel',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      Text(
                        'Review AI expected questions, topic priorities, accuracy reports & Current Affairs.',
                        style: TextStyle(fontSize: 12, color: OceanColors.textMuted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: OceanColors.oceanBlue),
              ],
            ),
          ),
          const SizedBox(height: 20),
          OceanGlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cohort Activity Overview',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 190,
                  child: BarChart(
                    BarChartData(
                      borderData: FlBorderData(show: false),
                      gridData: const FlGridData(show: false),
                      barGroups: [
                        BarChartGroupData(
                          x: 0,
                          barRods: [
                            BarChartRodData(
                              toY: activeCount.toDouble(),
                              color: OceanColors.turquoise,
                              width: 26,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ],
                        ),
                        BarChartGroupData(
                          x: 1,
                          barRods: [
                            BarChartRodData(
                              toY: inactiveCount.toDouble(),
                              color: OceanColors.coralAccent,
                              width: 26,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ],
                        ),
                        BarChartGroupData(
                          x: 2,
                          barRods: [
                            BarChartRodData(
                              toY: _attempts.length.toDouble(),
                              color: OceanColors.oceanBlue,
                              width: 26,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (_navIdx == 1) {
      final now = DateTime.now().toUtc();
      final filtered = onlyStudents.where((s) {
        final q = _userSearch.trim().toLowerCase();
        if (q.isNotEmpty) {
          final matchesText =
              (s['username'] ?? '').toString().toLowerCase().contains(q) ||
                  (s['displayName'] ?? '').toString().toLowerCase().contains(q) ||
                  (s['email'] ?? '').toString().toLowerCase().contains(q);
          if (!matchesText) return false;
        }
        final isActive = s['isActive'] != false;
        if (_statusFilter == _UserStatusFilter.active && !isActive) return false;
        if (_statusFilter == _UserStatusFilter.inactive && isActive) return false;

        if (_dateFilter != _RegistrationDateFilter.all) {
          final created = DateTime.tryParse((s['createdAt'] ?? '').toString());
          if (created == null) return false;
          final diffDays = now.difference(created.toUtc()).inDays;
          if (_dateFilter == _RegistrationDateFilter.today && diffDays > 0) {
            return false;
          }
          if (_dateFilter == _RegistrationDateFilter.last7d && diffDays > 7) {
            return false;
          }
          if (_dateFilter == _RegistrationDateFilter.last30d && diffDays > 30) {
            return false;
          }
        }
        return true;
      }).toList();

      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search by @username, full name, or email...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (v) => setState(() => _userSearch = v),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<_UserStatusFilter>(
                        value: _statusFilter,
                        decoration: const InputDecoration(
                          labelText: 'Account Status',
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: _UserStatusFilter.all, child: Text('All')),
                          DropdownMenuItem(
                              value: _UserStatusFilter.active,
                              child: Text('Active')),
                          DropdownMenuItem(
                              value: _UserStatusFilter.inactive,
                              child: Text('Inactive')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _statusFilter = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<_RegistrationDateFilter>(
                        value: _dateFilter,
                        decoration: const InputDecoration(
                          labelText: 'Registered',
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: _RegistrationDateFilter.all,
                              child: Text('All Time')),
                          DropdownMenuItem(
                              value: _RegistrationDateFilter.today,
                              child: Text('Today')),
                          DropdownMenuItem(
                              value: _RegistrationDateFilter.last7d,
                              child: Text('Last 7 Days')),
                          DropdownMenuItem(
                              value: _RegistrationDateFilter.last30d,
                              child: Text('Last 30 Days')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _dateFilter = v);
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text('No students match the selected filters.'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) {
                      final st = filtered[i];
                      final isActive = st['isActive'] != false;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: OceanGlassCard(
                          onTap: () => _openStudentDetailModal(st),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: OceanColors.turquoise.withValues(alpha: 0.2),
                                child: Text(
                                  (st['displayName'] ?? 'S')
                                      .toString()
                                      .substring(0, 1)
                                      .toUpperCase(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: OceanColors.deepOcean,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${st['displayName']} (@${st['username'] ?? ''})',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      '${st['email']} · ${st['xp'] ?? 0} XP · ${(st['createdAt'] ?? '').toString().split('T').first}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: OceanColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: isActive,
                                activeTrackColor: OceanColors.turquoise,
                                onChanged: (val) async {
                                  await widget.firestoreService
                                      .setStudentActiveStatus(st['id'].toString(), val);
                                  await _refresh();
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      );
    }

    if (_navIdx == 2) {
      final avgAcc = _attempts.isEmpty
          ? 0
          : (_attempts
                      .map((a) => num.tryParse((a['accuracy'] ?? 0).toString()) ?? 0)
                      .reduce((a, b) => a + b) /
                  _attempts.length)
              .round();

      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _AdminKpi(
                label: 'Mock Attempts',
                value: '${_attempts.length}',
                accent: OceanColors.oceanBlue,
              ),
              _AdminKpi(
                label: 'Average Accuracy',
                value: '$avgAcc%',
                accent: OceanColors.turquoise,
              ),
              _AdminKpi(
                label: 'Courses',
                value: '${_courses.length}',
                accent: OceanColors.oceanNavy,
              ),
              _AdminKpi(
                label: 'Video Lessons',
                value: '${_videos.length}',
                accent: OceanColors.aqua,
              ),
              _AdminKpi(
                label: 'Ocean Quest Explorers',
                value: '${_questProgress.length}',
                accent: OceanColors.turquoise,
              ),
              _AdminKpi(
                label: 'Quest Clears Total',
                value:
                    '${_questProgress.fold<int>(0, (acc, p) => acc + ((p['completedMissions'] as List?)?.length ?? 0))}',
                accent: OceanColors.emerald,
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text(
            'Recent Student Mock Submissions',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          if (_attempts.isEmpty)
            const OceanGlassCard(child: Text('No test attempts recorded yet.'))
          else
            ..._attempts.take(15).map((a) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OceanGlassCard(
                  child: Row(
                    children: [
                      const Icon(Icons.assignment_turned_in_outlined,
                          color: OceanColors.oceanBlue),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (a['testTitle'] ?? 'Mock Test').toString(),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              'Score: ${a['score']} / ${a['maxScore']} · Accuracy ${a['accuracy']}%',
                              style: const TextStyle(
                                fontSize: 12,
                                color: OceanColors.textMuted,
                              ),
                            ),
                          ],
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

    if (_navIdx == 3) {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<_AdminContentTab>(
                  segments: const [
                    ButtonSegment(value: _AdminContentTab.questions, label: Text('Questions')),
                    ButtonSegment(value: _AdminContentTab.courses, label: Text('Courses')),
                    ButtonSegment(value: _AdminContentTab.videos, label: Text('Videos')),
                    ButtonSegment(value: _AdminContentTab.mocks, label: Text('Mocks')),
                    ButtonSegment(value: _AdminContentTab.quests, label: Text('Ocean Quest')),
                  ],
                  selected: {_contentTab},
                  onSelectionChanged: (s) => setState(() => _contentTab = s.first),
                ),
                const SizedBox(height: 10),
                if (_contentTab == _AdminContentTab.quests)
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: () => _openQuestMissionDialog(),
                        icon: const Icon(Icons.add),
                        label: const Text('New Ocean Quest Mission'),
                      ),
                    ],
                  ),
                if (_contentTab == _AdminContentTab.questions)
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: () => _openAddQuestionDialog(),
                        icon: const Icon(Icons.add),
                        label: const Text('Add Question'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _importQuestionsWithPreview,
                        icon: const Icon(Icons.upload_file),
                        label: const Text('Bulk Import (CSV / JSON)'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _openCoverageMatrixDialog,
                        icon: const Icon(Icons.calendar_view_month),
                        label: const Text('2016–2026 Coverage'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _openDuplicateDetectorDialog,
                        icon: const Icon(Icons.find_replace),
                        label: Text(
                          'Duplicates (${_findDuplicateGroups().length})',
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          Expanded(child: _buildContentList()),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Export Performance & Registration Reports',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Download complete student lists with registration dates, accuracy, mock counts, and XP in Excel or CSV format.',
          style: TextStyle(color: OceanColors.textMuted),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            FilledButton.icon(
              onPressed: () => widget.firestoreService.exportStudentsReport(
                students: onlyStudents,
                asExcel: true,
              ),
              icon: const Icon(Icons.table_chart_outlined),
              label: const Text('Export Excel (.xlsx)'),
            ),
            OutlinedButton.icon(
              onPressed: () => widget.firestoreService.exportStudentsReport(
                students: onlyStudents,
                asExcel: false,
              ),
              icon: const Icon(Icons.download_outlined),
              label: const Text('Export CSV'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildContentList() {
    if (_contentTab == _AdminContentTab.questions) {
      final filteredQs = _questions.where((q) {
        if (_qYearFilter != null &&
            int.tryParse((q['year'] ?? '').toString()) != _qYearFilter) {
          return false;
        }
        if (_qSubjectFilter != 'all' &&
            (q['subject'] ?? '').toString() != _qSubjectFilter) {
          return false;
        }
        final status = _questionAnswerStatus(q);
        if (_qStatusFilter == 'drafts' && q['isPublished'] != false) {
          return false;
        } else if (_qStatusFilter != 'all' &&
            _qStatusFilter != 'drafts' &&
            status != _qStatusFilter) {
          return false;
        }
        final qLower = _qSearch.trim().toLowerCase();
        if (qLower.isNotEmpty) {
          final hay = '${q['questionEn'] ?? ''} ${q['topic'] ?? ''} ${q['shift'] ?? ''} ${q['id'] ?? ''}'
              .toLowerCase();
          if (!hay.contains(qLower)) return false;
        }
        return true;
      }).toList();

      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search question bank by keyword, topic, or shift...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (v) => setState(() => _qSearch = v),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int?>(
                        value: _qYearFilter,
                        decoration: const InputDecoration(
                          labelText: 'Year',
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        items: [
                          const DropdownMenuItem<int?>(
                              value: null, child: Text('All Years')),
                          for (int y = 2026; y >= 2016; y--)
                            DropdownMenuItem<int?>(value: y, child: Text('$y')),
                        ],
                        onChanged: (v) => setState(() => _qYearFilter = v),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _qSubjectFilter,
                        decoration: const InputDecoration(
                          labelText: 'Subject',
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('All')),
                          DropdownMenuItem(value: 'quant', child: Text('Quant')),
                          DropdownMenuItem(
                              value: 'reasoning', child: Text('Reasoning')),
                          DropdownMenuItem(
                              value: 'english', child: Text('English')),
                          DropdownMenuItem(value: 'ga', child: Text('GA')),
                          DropdownMenuItem(
                              value: 'computer', child: Text('Computer')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _qSubjectFilter = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _qStatusFilter,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('All')),
                          DropdownMenuItem(
                              value: 'official', child: Text('Official Key')),
                          DropdownMenuItem(
                              value: 'unofficial', child: Text('Unofficial')),
                          DropdownMenuItem(
                              value: 'needs_verification',
                              child: Text('Needs Review')),
                          DropdownMenuItem(
                              value: 'drafts', child: Text('Drafts')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _qStatusFilter = v);
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: filteredQs.isEmpty
                ? const Center(
                    child: Text('No questions match the selected filters.'),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredQs.length,
                    itemBuilder: (_, i) {
                      final q = filteredQs[i];
                      final status = _questionAnswerStatus(q);
                      final statusColor = status == 'official'
                          ? OceanColors.emerald
                          : (status == 'unofficial'
                              ? OceanColors.oceanBlue
                              : OceanColors.coralAccent);
                      final statusLabel = status == 'official'
                          ? 'Official Key'
                          : (status == 'unofficial'
                              ? 'Unofficial'
                              : 'Needs Review');
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: OceanGlassCard(
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      (q['questionEn'] ?? '').toString(),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      [
                                        '${q['subject'] ?? ''}',
                                        '${q['topic'] ?? ''}',
                                        '${q['year'] ?? 2024}',
                                        '${q['tier'] ?? 'Tier 1'}',
                                        if ((q['shift'] ?? '')
                                            .toString()
                                            .isNotEmpty)
                                          q['shift'].toString(),
                                      ].join(' · '),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: OceanColors.textMuted,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Wrap(
                                      spacing: 6,
                                      children: [
                                        OceanStatusBadge(
                                          icon: status == 'official'
                                              ? Icons.verified_outlined
                                              : Icons.pending_outlined,
                                          label: statusLabel,
                                          color: statusColor,
                                        ),
                                        if (q['isPublished'] == false)
                                          const OceanStatusBadge(
                                            icon: Icons.visibility_off_outlined,
                                            label: 'Draft',
                                            color: OceanColors.textMuted,
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined,
                                    color: OceanColors.oceanBlue),
                                onPressed: () => _openAddQuestionDialog(q),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline,
                                    color: OceanColors.coralAccent),
                                onPressed: () async {
                                  if (await _confirmDelete(
                                      (q['topic'] ?? 'Question').toString())) {
                                    await widget.firestoreService
                                        .deleteQuestion(q['id'].toString());
                                    await _refresh();
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      );
    }

    if (_contentTab == _AdminContentTab.courses) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _courses.length,
        itemBuilder: (_, i) {
          final c = _courses[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OceanGlassCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  (c['title'] ?? 'Course').toString(),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text('${c['subjectId'] ?? ''}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: OceanColors.coralAccent),
                  onPressed: () async {
                    if (await _confirmDelete((c['title'] ?? 'Course').toString())) {
                      await widget.firestoreService.deleteCourse(c['id'].toString());
                      await _refresh();
                    }
                  },
                ),
              ),
            ),
          );
        },
      );
    }

    if (_contentTab == _AdminContentTab.videos) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _videos.length,
        itemBuilder: (_, i) {
          final v = _videos[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OceanGlassCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  (v['title'] ?? 'Video Lesson').toString(),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text('${v['subject'] ?? ''} · ${v['topic'] ?? ''}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: OceanColors.coralAccent),
                  onPressed: () async {
                    if (await _confirmDelete((v['title'] ?? 'Lesson').toString())) {
                      await widget.firestoreService.deleteVideoLesson(v['id'].toString());
                      await _refresh();
                    }
                  },
                ),
              ),
            ),
          );
        },
      );
    }

    if (_contentTab == _AdminContentTab.quests) {
      if (_questMissions.isEmpty) {
        return const Center(
          child: Text('No custom Ocean Quest missions stored yet. Tap "New Ocean Quest Mission" to create one.'),
        );
      }
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _questMissions.length,
        itemBuilder: (_, i) {
          final qm = _questMissions[i];
          final mId = (qm['missionId'] ?? qm['id'] ?? '').toString();
          final published = qm['isPublished'] != false;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OceanGlassCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  (qm['title'] ?? 'Ocean Mission').toString(),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  '${qm['locationId']} · ${qm['mode']} · ${qm['difficulty']} · +${qm['xpReward'] ?? 0} XP',
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Switch(
                      value: published,
                      activeTrackColor: OceanColors.turquoise,
                      onChanged: (val) async {
                        await widget.firestoreService.upsertOceanQuestMission(
                          mId,
                          {...qm, 'isPublished': val},
                        );
                        await _refresh();
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit_outlined,
                          color: OceanColors.oceanBlue),
                      onPressed: () => _openQuestMissionDialog(qm),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline,
                          color: OceanColors.coralAccent),
                      onPressed: () async {
                        if (await _confirmDelete(
                            (qm['title'] ?? 'Mission').toString())) {
                          await widget.firestoreService
                              .deleteOceanQuestMission(mId);
                          await _refresh();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _mocks.length,
      itemBuilder: (_, i) {
        final m = _mocks[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: OceanGlassCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                (m['title'] ?? 'Mock Test').toString(),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                '${m['category'] ?? 'Tier 1'} · ${m['durationMinutes'] ?? 15} mins',
              ),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, color: OceanColors.coralAccent),
                onPressed: () async {
                  if (await _confirmDelete((m['title'] ?? 'Mock Test').toString())) {
                    await widget.firestoreService.deleteMockTest(m['id'].toString());
                    await _refresh();
                  }
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

class _AdminKpi extends StatelessWidget {
  final String label;
  final String value;
  final Color accent;
  const _AdminKpi({
    required this.label,
    required this.value,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: OceanGlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 4,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: OceanColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
