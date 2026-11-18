import 'dart:ui' show FontFeature;
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'student_i18n.dart';
import 'student_tutor_screen.dart';

enum _PyqMode { study, practice }

enum _PyqScope { all, bookmarked, difficult, revision, attempted, incorrect }

enum _PyqSort { newestYear, oldestYear, subjectWise, topicWise }

class PyqLibraryScreen extends StatelessWidget {
  final String uid;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;

  const PyqLibraryScreen({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.onGoHome,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Previous Year Questions',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            tooltip: 'Home',
            onPressed: () {
              Navigator.of(context).pop();
              onGoHome();
            },
          ),
        ],
      ),
      body: PyqLibraryView(
        uid: uid,
        preferredLanguage: preferredLanguage,
        firestoreService: firestoreService,
        onGoHome: () {
          Navigator.of(context).pop();
          onGoHome();
        },
      ),
    );
  }
}

class PyqLibraryView extends StatefulWidget {
  final String uid;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;

  const PyqLibraryView({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.onGoHome,
  });

  @override
  State<PyqLibraryView> createState() => _PyqLibraryViewState();
}

class _PyqLibraryViewState extends State<PyqLibraryView> {
  static const List<int> _yearsList = [
    2025,
    2024,
    2023,
    2022,
    2021,
    2020,
    2019,
    2018,
    2017,
    2016,
  ];

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _allQuestions = [];
  StudentPyqState _pyqState = const StudentPyqState();

  _PyqMode _mode = _PyqMode.study;
  _PyqScope _scope = _PyqScope.all;
  _PyqSort _sort = _PyqSort.newestYear;

  int? _yearFilter;
  String _tierFilter = 'all';
  String _subjectFilter = 'all';
  String _topicFilter = 'all';
  String _examDateFilter = 'all';
  String _shiftFilter = 'all';
  String _difficultyFilter = 'all';
  String _statusFilter = 'all';
  String _searchQuery = '';
  bool _showAdvancedFilters = false;

  int _pageSize = 20;
  final Set<String> _expandedAnswerIds = {};
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.firestoreService.fetchAllPublishedQuestionsUnbounded(),
        widget.firestoreService.loadStudentPyqState(widget.uid),
      ]);
      if (mounted) {
        setState(() {
          _allQuestions = results[0] as List<Map<String, dynamic>>;
          _pyqState = results[1] as StudentPyqState;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Unable to load the question library right now.';
          _loading = false;
        });
      }
    }
  }

  String _answerStatusOf(Map<String, dynamic> q) {
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

  Map<int, int> _yearCounts() {
    final map = <int, int>{for (final y in _yearsList) y: 0};
    for (final q in _allQuestions) {
      final y = int.tryParse((q['year'] ?? '').toString());
      if (y != null && map.containsKey(y)) {
        map[y] = (map[y] ?? 0) + 1;
      }
    }
    return map;
  }

  List<String> _distinctStrings(String key) {
    final set = <String>{};
    for (final q in _allQuestions) {
      final val = (q[key] ?? '').toString().trim();
      if (val.isNotEmpty) set.add(val);
    }
    final list = set.toList()..sort();
    return list;
  }

  List<Map<String, dynamic>> _filteredQuestions() {
    final qLower = _searchQuery.trim().toLowerCase();
    final filtered = _allQuestions.where((q) {
      final id = (q['id'] ?? '').toString();
      if (_scope == _PyqScope.bookmarked &&
          !_pyqState.bookmarkedIds.contains(id)) {
        return false;
      }
      if (_scope == _PyqScope.difficult &&
          !_pyqState.difficultIds.contains(id)) {
        return false;
      }
      if (_scope == _PyqScope.revision &&
          !_pyqState.revisionIds.contains(id)) {
        return false;
      }
      if (_scope == _PyqScope.attempted &&
          !_pyqState.attempts.containsKey(id)) {
        return false;
      }
      if (_scope == _PyqScope.incorrect) {
        final att = _pyqState.attempts[id];
        if (att == null || att['isCorrect'] == true) return false;
      }

      if (_yearFilter != null) {
        final y = int.tryParse((q['year'] ?? '').toString());
        if (y != _yearFilter) return false;
      }
      if (_tierFilter != 'all' &&
          (q['tier'] ?? 'Tier 1').toString() != _tierFilter) {
        return false;
      }
      if (_subjectFilter != 'all' &&
          (q['subject'] ?? '').toString() != _subjectFilter) {
        return false;
      }
      if (_topicFilter != 'all' &&
          (q['topic'] ?? '').toString() != _topicFilter) {
        return false;
      }
      if (_examDateFilter != 'all' &&
          (q['examDate'] ?? '').toString() != _examDateFilter) {
        return false;
      }
      if (_shiftFilter != 'all' &&
          (q['shift'] ?? '').toString() != _shiftFilter) {
        return false;
      }
      if (_difficultyFilter != 'all' &&
          (q['difficulty'] ?? 'Medium').toString() != _difficultyFilter) {
        return false;
      }
      if (_statusFilter != 'all' && _answerStatusOf(q) != _statusFilter) {
        return false;
      }

      if (qLower.isNotEmpty) {
        final haystack = [
          q['questionEn'],
          q['questionHi'],
          q['topic'],
          q['subject'],
          q['shift'],
          q['examDate'],
          q['year'],
          q['questionNumber'] != null ? 'q${q['questionNumber']}' : '',
        ].map((e) => (e ?? '').toString().toLowerCase()).join(' ');
        if (!haystack.contains(qLower)) return false;
      }
      return true;
    }).toList();

    filtered.sort((a, b) {
      final ya = int.tryParse((a['year'] ?? 0).toString()) ?? 0;
      final yb = int.tryParse((b['year'] ?? 0).toString()) ?? 0;
      final na = int.tryParse((a['questionNumber'] ?? 9999).toString()) ?? 9999;
      final nb = int.tryParse((b['questionNumber'] ?? 9999).toString()) ?? 9999;
      switch (_sort) {
        case _PyqSort.oldestYear:
          final c = ya.compareTo(yb);
          return c != 0 ? c : na.compareTo(nb);
        case _PyqSort.subjectWise:
          final c = (a['subject'] ?? '')
              .toString()
              .compareTo((b['subject'] ?? '').toString());
          return c != 0 ? c : yb.compareTo(ya);
        case _PyqSort.topicWise:
          final c = (a['topic'] ?? '')
              .toString()
              .compareTo((b['topic'] ?? '').toString());
          return c != 0 ? c : yb.compareTo(ya);
        case _PyqSort.newestYear:
          final c = yb.compareTo(ya);
          return c != 0 ? c : na.compareTo(nb);
      }
    });

    return filtered;
  }

  void _resetFilters() {
    setState(() {
      _scope = _PyqScope.all;
      _yearFilter = null;
      _tierFilter = 'all';
      _subjectFilter = 'all';
      _topicFilter = 'all';
      _examDateFilter = 'all';
      _shiftFilter = 'all';
      _difficultyFilter = 'all';
      _statusFilter = 'all';
      _searchQuery = '';
      _searchCtrl.clear();
      _pageSize = 20;
    });
  }

  Future<void> _toggleBookmark(Map<String, dynamic> q) async {
    final id = (q['id'] ?? '').toString();
    if (id.isEmpty) return;
    final nextSet = Set<String>.from(_pyqState.bookmarkedIds);
    final nextBool = !nextSet.contains(id);
    if (nextBool) {
      nextSet.add(id);
    } else {
      nextSet.remove(id);
    }
    final nextState = _pyqState.copyWith(bookmarkedIds: nextSet);
    setState(() => _pyqState = nextState);
    await widget.firestoreService.toggleQuestionBookmark(
      uid: widget.uid,
      questionId: id,
      title: (q['questionEn'] ?? q['topic'] ?? 'PYQ').toString(),
      nextBookmarked: nextBool,
      nextState: nextState,
    );
  }

  Future<void> _toggleDifficult(String id) async {
    if (id.isEmpty) return;
    final nextSet = Set<String>.from(_pyqState.difficultIds);
    if (nextSet.contains(id)) {
      nextSet.remove(id);
    } else {
      nextSet.add(id);
    }
    final nextState = _pyqState.copyWith(difficultIds: nextSet);
    setState(() => _pyqState = nextState);
    await widget.firestoreService.syncDifficultAndRevision(
      uid: widget.uid,
      nextState: nextState,
    );
  }

  Future<void> _toggleRevision(String id) async {
    if (id.isEmpty) return;
    final nextSet = Set<String>.from(_pyqState.revisionIds);
    if (nextSet.contains(id)) {
      nextSet.remove(id);
    } else {
      nextSet.add(id);
    }
    final nextState = _pyqState.copyWith(revisionIds: nextSet);
    setState(() => _pyqState = nextState);
    await widget.firestoreService.syncDifficultAndRevision(
      uid: widget.uid,
      nextState: nextState,
    );
  }

  Future<void> _recordAttempt(
    Map<String, dynamic> q,
    int chosenIndex,
  ) async {
    final id = (q['id'] ?? '').toString();
    if (id.isEmpty) return;
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final isCorrect = chosenIndex == expected;
    final nextAttempts =
        Map<String, Map<String, dynamic>>.from(_pyqState.attempts);
    nextAttempts[id] = {
      'selectedIndex': chosenIndex,
      'isCorrect': isCorrect,
      'answeredAt': DateTime.now().toUtc().toIso8601String(),
    };
    final nextState = _pyqState.copyWith(attempts: nextAttempts);
    setState(() => _pyqState = nextState);
    await widget.firestoreService.recordPyqAttempt(
      uid: widget.uid,
      questionId: id,
      subject: (q['subject'] ?? 'quant').toString(),
      selectedIndex: chosenIndex,
      isCorrect: isCorrect,
      nextState: nextState,
    );
  }

  void _openQuestionDetail(
    List<Map<String, dynamic>> list,
    int initialIndex,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PyqDetailScreen(
          questions: list,
          initialIndex: initialIndex,
          preferredLanguage: widget.preferredLanguage,
          isPracticeMode: _mode == _PyqMode.practice,
          getState: () => _pyqState,
          onToggleBookmark: _toggleBookmark,
          onToggleDifficult: _toggleDifficult,
          onToggleRevision: _toggleRevision,
          onRecordAttempt: _recordAttempt,
          firestoreService: widget.firestoreService,
          onGoHome: widget.onGoHome,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off,
                  size: 42, color: OceanColors.coralAccent),
              const SizedBox(height: 10),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final yearCounts = _yearCounts();
    final officialCount = _allQuestions
        .where((q) => _answerStatusOf(q) == 'official')
        .length;
    final needsVerifyCount = _allQuestions
        .where((q) => _answerStatusOf(q) == 'needs_verification')
        .length;
    final attemptedCount = _pyqState.attempts.length;
    final correctCount =
        _pyqState.attempts.values.where((a) => a['isCorrect'] == true).length;
    final incorrectCount = attemptedCount - correctCount;
    final accuracyPct = attemptedCount > 0
        ? ((correctCount * 100) / attemptedCount).round()
        : 0;

    final filtered = _filteredQuestions();
    final visible = filtered.take(_pageSize).toList();
    final topics = _distinctStrings('topic');
    final examDates = _distinctStrings('examDate');
    final shifts = _distinctStrings('shift');

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          OceanWaveHeaderCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SSC CGL 10-Year Archive (2016–2025)',
                  style: TextStyle(
                    color: OceanColors.foamWhite,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Browse official previous year papers with verified keys, step-by-step solutions, shortcuts, and revision lists.',
                  style: TextStyle(
                    color: OceanColors.seaGlass,
                    fontSize: 12.5,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 14,
                  runSpacing: 8,
                  children: [
                    _HeroStat(
                      label: 'Loaded PYQs',
                      value: '${_allQuestions.length}',
                    ),
                    _HeroStat(
                      label: 'Official Key',
                      value: '$officialCount',
                    ),
                    _HeroStat(
                      label: 'Needs Review',
                      value: '$needsVerifyCount',
                    ),
                    _HeroStat(
                      label: 'Practice Acc',
                      value: attemptedCount > 0 ? '$accuracyPct%' : '—',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Mode switch: Study Mode vs Practice Mode
          SegmentedButton<_PyqMode>(
            segments: const [
              ButtonSegment(
                value: _PyqMode.study,
                icon: Icon(Icons.menu_book_outlined, size: 17),
                label: Text('Study Mode'),
              ),
              ButtonSegment(
                value: _PyqMode.practice,
                icon: Icon(Icons.quiz_outlined, size: 17),
                label: Text('Practice Mode'),
              ),
            ],
            selected: {_mode},
            onSelectionChanged: (sel) => setState(() => _mode = sel.first),
          ),

          if (_mode == _PyqMode.practice) ...[
            const SizedBox(height: 10),
            OceanGlassCard(
              padding: const EdgeInsets.all(14),
              borderColor: OceanColors.turquoise,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Practice Mode Active — Answers Hidden',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Score: $correctCount / $attemptedCount ($accuracyPct% accuracy) · $incorrectCount incorrect',
                          style: const TextStyle(
                            fontSize: 12,
                            color: OceanColors.textMuted,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (incorrectCount > 0)
                    OutlinedButton(
                      onPressed: () =>
                          setState(() => _scope = _PyqScope.incorrect),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      child: const Text('Review Wrong'),
                    ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // 2016-2025 Year Strip with Real Dynamic Counts
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('All Years (${_allQuestions.length})'),
                    selected: _yearFilter == null,
                    selectedColor:
                        OceanColors.turquoise.withValues(alpha: 0.22),
                    onSelected: (_) => setState(() {
                      _yearFilter = null;
                      _pageSize = 20;
                    }),
                  ),
                ),
                ..._yearsList.map((yr) {
                  final cnt = yearCounts[yr] ?? 0;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$yr ($cnt)'),
                      selected: _yearFilter == yr,
                      selectedColor:
                          OceanColors.turquoise.withValues(alpha: 0.22),
                      onSelected: (_) => setState(() {
                        _yearFilter = yr;
                        _pageSize = 20;
                      }),
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Bookmarks & Revision Scopes
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _scopeChip(_PyqScope.all, 'All (${_allQuestions.length})'),
                _scopeChip(
                  _PyqScope.bookmarked,
                  'Bookmarked (${_pyqState.bookmarkedIds.length})',
                ),
                _scopeChip(
                  _PyqScope.difficult,
                  'Difficult (${_pyqState.difficultIds.length})',
                ),
                _scopeChip(
                  _PyqScope.revision,
                  'Revision (${_pyqState.revisionIds.length})',
                ),
                _scopeChip(
                  _PyqScope.attempted,
                  'Attempted ($attemptedCount)',
                ),
                _scopeChip(
                  _PyqScope.incorrect,
                  'Incorrect ($incorrectCount)',
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Search + Filters Toggle + Sort
          TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search keywords, topic, shift, or Q#...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
            ),
            onChanged: (v) => setState(() {
              _searchQuery = v;
              _pageSize = 20;
            }),
          ),

          const SizedBox(height: 10),

          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<_PyqSort>(
                  value: _sort,
                  decoration: const InputDecoration(
                    labelText: 'Sort Order',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: _PyqSort.newestYear,
                      child: Text('Newest Year First'),
                    ),
                    DropdownMenuItem(
                      value: _PyqSort.oldestYear,
                      child: Text('Oldest Year First'),
                    ),
                    DropdownMenuItem(
                      value: _PyqSort.subjectWise,
                      child: Text('Subject-wise'),
                    ),
                    DropdownMenuItem(
                      value: _PyqSort.topicWise,
                      child: Text('Topic-wise'),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) setState(() => _sort = v);
                  },
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: () => setState(
                  () => _showAdvancedFilters = !_showAdvancedFilters,
                ),
                icon: Icon(
                  _showAdvancedFilters
                      ? Icons.filter_list_off
                      : Icons.tune_rounded,
                  size: 18,
                ),
                label: Text(_showAdvancedFilters ? 'Hide Filters' : 'Filters'),
              ),
            ],
          ),

          if (_showAdvancedFilters) ...[
            const SizedBox(height: 10),
            OceanGlassCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _tierFilter,
                          decoration: const InputDecoration(
                            labelText: 'Tier',
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 10, vertical: 8),
                          ),
                          items: const [
                            DropdownMenuItem(
                                value: 'all', child: Text('All Tiers')),
                            DropdownMenuItem(
                                value: 'Tier 1', child: Text('Tier 1')),
                            DropdownMenuItem(
                                value: 'Tier 2', child: Text('Tier 2')),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _tierFilter = v);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _subjectFilter,
                          decoration: const InputDecoration(
                            labelText: 'Subject',
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 10, vertical: 8),
                          ),
                          items: [
                            const DropdownMenuItem(
                                value: 'all', child: Text('All Subjects')),
                            ...sscCglSubjects.map(
                              (s) => DropdownMenuItem(
                                value: s.id,
                                child: Text(s.shortTitle),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _subjectFilter = v);
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
                          value: _difficultyFilter,
                          decoration: const InputDecoration(
                            labelText: 'Difficulty',
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 10, vertical: 8),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'all', child: Text('All')),
                            DropdownMenuItem(
                                value: 'Easy', child: Text('Easy')),
                            DropdownMenuItem(
                                value: 'Medium', child: Text('Medium')),
                            DropdownMenuItem(
                                value: 'Hard', child: Text('Hard')),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setState(() => _difficultyFilter = v);
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _statusFilter,
                          decoration: const InputDecoration(
                            labelText: 'Answer Key Status',
                            contentPadding: EdgeInsets.symmetric(
                                horizontal: 10, vertical: 8),
                          ),
                          items: const [
                            DropdownMenuItem(
                                value: 'all', child: Text('All Keys')),
                            DropdownMenuItem(
                                value: 'official', child: Text('Official Key')),
                            DropdownMenuItem(
                                value: 'unofficial',
                                child: Text('Unofficial Key')),
                            DropdownMenuItem(
                                value: 'needs_verification',
                                child: Text('Needs Review')),
                          ],
                          onChanged: (v) {
                            if (v != null) setState(() => _statusFilter = v);
                          },
                        ),
                      ),
                    ],
                  ),
                  if (topics.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: topics.contains(_topicFilter) ? _topicFilter : 'all',
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Topic',
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      items: [
                        const DropdownMenuItem(
                            value: 'all', child: Text('All Topics')),
                        ...topics.map(
                          (t) => DropdownMenuItem(
                            value: t,
                            child: Text(t, overflow: TextOverflow.ellipsis),
                          ),
                        ),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _topicFilter = v);
                      },
                    ),
                  ],
                  if (examDates.isNotEmpty || shifts.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (examDates.isNotEmpty)
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: examDates.contains(_examDateFilter)
                                  ? _examDateFilter
                                  : 'all',
                              isExpanded: true,
                              decoration: const InputDecoration(
                                labelText: 'Exam Date',
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                              ),
                              items: [
                                const DropdownMenuItem(
                                    value: 'all', child: Text('All Dates')),
                                ...examDates.map(
                                  (d) => DropdownMenuItem(
                                    value: d,
                                    child: Text(d,
                                        overflow: TextOverflow.ellipsis),
                                  ),
                                ),
                              ],
                              onChanged: (v) {
                                if (v != null) {
                                  setState(() => _examDateFilter = v);
                                }
                              },
                            ),
                          ),
                        if (examDates.isNotEmpty && shifts.isNotEmpty)
                          const SizedBox(width: 10),
                        if (shifts.isNotEmpty)
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: shifts.contains(_shiftFilter)
                                  ? _shiftFilter
                                  : 'all',
                              isExpanded: true,
                              decoration: const InputDecoration(
                                labelText: 'Shift',
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                              ),
                              items: [
                                const DropdownMenuItem(
                                    value: 'all', child: Text('All Shifts')),
                                ...shifts.map(
                                  (s) => DropdownMenuItem(
                                    value: s,
                                    child: Text(s,
                                        overflow: TextOverflow.ellipsis),
                                  ),
                                ),
                              ],
                              onChanged: (v) {
                                if (v != null) {
                                  setState(() => _shiftFilter = v);
                                }
                              },
                            ),
                          ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: _resetFilters,
                      icon: const Icon(Icons.restart_alt, size: 18),
                      label: const Text('Clear All Filters'),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Showing ${visible.length} of ${filtered.length} questions',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: OceanColors.textMuted,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              if (filtered.isNotEmpty)
                TextButton(
                  onPressed: () => _openQuestionDetail(filtered, 0),
                  child: const Text('Open #1'),
                ),
            ],
          ),
          const SizedBox(height: 6),

          if (filtered.isEmpty)
            OceanGlassCard(
              padding: const EdgeInsets.all(22),
              child: Column(
                children: [
                  const Icon(
                    Icons.inventory_2_outlined,
                    size: 40,
                    color: OceanColors.oceanBlue,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _yearFilter != null
                        ? 'No SSC CGL $_yearFilter questions imported yet'
                        : 'No questions match the current filters',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _yearFilter != null
                        ? 'Questions for $_yearFilter will appear here automatically once verified papers are uploaded by the faculty team.'
                        : 'Try clearing one or more filters or switching back to All Questions.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: OceanColors.textMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: _resetFilters,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Show All Available Years'),
                  ),
                ],
              ),
            )
          else ...[
            ...List.generate(visible.length, (i) {
              final q = visible[i];
              return _buildQuestionCard(q, filtered, i);
            }),
            if (visible.length < filtered.length) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _pageSize += 20),
                      icon: const Icon(Icons.expand_more),
                      label: Text(
                        'Load More (+${(filtered.length - visible.length) > 20 ? 20 : (filtered.length - visible.length)})',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: () =>
                        setState(() => _pageSize = filtered.length),
                    child: Text('Show All (${filtered.length})'),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _scopeChip(_PyqScope scope, String label) {
    final active = _scope == scope;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: active,
        selectedColor: OceanColors.oceanBlue.withValues(alpha: 0.16),
        onSelected: (_) => setState(() {
          _scope = scope;
          _pageSize = 20;
        }),
      ),
    );
  }

  Widget _buildQuestionCard(
    Map<String, dynamic> q,
    List<Map<String, dynamic>> fullFiltered,
    int index,
  ) {
    final id = (q['id'] ?? '').toString();
    final qNum = q['questionNumber'] != null
        ? 'Q${q['questionNumber']}'
        : 'Q${index + 1}';
    final status = _answerStatusOf(q);
    final isBookmarked = _pyqState.bookmarkedIds.contains(id);
    final isDifficult = _pyqState.difficultIds.contains(id);
    final isRevision = _pyqState.revisionIds.contains(id);
    final attempt = _pyqState.attempts[id];
    final isAnswerOpen = _expandedAnswerIds.contains(id);

    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final correctIdx =
        (int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0).clamp(0, 3);
    final correctText =
        correctIdx < options.length ? options[correctIdx] : 'Option A';

    final statusMeta = _statusVisual(status);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: OceanGlassCard(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    '$qNum · ${q['year'] ?? '—'} · ${q['tier'] ?? 'Tier 1'} · ${StudentStrings.subjectTitle((q['subject'] ?? '').toString())} · ${q['topic'] ?? 'General'} · ${q['difficulty'] ?? 'Medium'}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: OceanColors.textMuted,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip:
                      isBookmarked ? 'Remove Bookmark' : 'Bookmark Question',
                  onPressed: () => _toggleBookmark(q),
                  icon: Icon(
                    isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                    color: isBookmarked
                        ? OceanColors.oceanBlue
                        : OceanColors.textMuted,
                    size: 21,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                OceanStatusBadge(
                  icon: statusMeta.$1,
                  label: statusMeta.$2,
                  color: statusMeta.$3,
                ),
                if (isDifficult)
                  const OceanStatusBadge(
                    icon: Icons.flag_outlined,
                    label: 'Difficult',
                    color: OceanColors.coralAccent,
                  ),
                if (isRevision)
                  const OceanStatusBadge(
                    icon: Icons.layers_outlined,
                    label: 'In Revision',
                    color: OceanColors.oceanBlue,
                  ),
                if (attempt != null)
                  OceanStatusBadge(
                    icon: attempt['isCorrect'] == true
                        ? Icons.check_circle_outline
                        : Icons.cancel_outlined,
                    label:
                        attempt['isCorrect'] == true ? 'Solved' : 'Incorrect',
                    color: attempt['isCorrect'] == true
                        ? OceanColors.emerald
                        : OceanColors.coralAccent,
                  ),
              ],
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: () => _openQuestionDetail(fullFiltered, index),
              child: Text(
                (q['questionEn'] ?? '').toString(),
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  height: 1.4,
                ),
              ),
            ),

            if (_mode == _PyqMode.practice) ...[
              const SizedBox(height: 10),
              ...List.generate(options.length, (optIdx) {
                final chosenIdx = attempt != null
                    ? int.tryParse((attempt['selectedIndex'] ?? -1).toString())
                    : null;
                final isAnswered = chosenIdx != null;
                final isChosen = chosenIdx == optIdx;
                final isCorrectOpt = optIdx == correctIdx;
                Color border = OceanColors.borderLight;
                Color bg = OceanColors.foamWhite;
                if (isAnswered) {
                  if (isCorrectOpt) {
                    border = OceanColors.emerald;
                    bg = OceanColors.emerald.withValues(alpha: 0.12);
                  } else if (isChosen) {
                    border = OceanColors.coralAccent;
                    bg = OceanColors.coralAccent.withValues(alpha: 0.12);
                  }
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: InkWell(
                    onTap: () => _recordAttempt(q, optIdx),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: border),
                      ),
                      child: Text(
                        '${String.fromCharCode(65 + optIdx)}. ${options[optIdx]}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ],

            if (isAnswerOpen) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: OceanColors.emerald.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: OceanColors.emerald.withValues(alpha: 0.35),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Answer: ${String.fromCharCode(65 + correctIdx)}. $correctText',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: OceanColors.emerald,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      StudentStrings.pickExplanation(
                          q, widget.preferredLanguage),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: OceanColors.textDark,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 10),
            Row(
              children: [
                if (_mode == _PyqMode.study || attempt != null)
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        if (isAnswerOpen) {
                          _expandedAnswerIds.remove(id);
                        } else {
                          _expandedAnswerIds.add(id);
                        }
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 40),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    icon: Icon(
                      isAnswerOpen
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 16,
                    ),
                    label: Text(isAnswerOpen ? 'Hide Answer' : 'View Answer'),
                  ),
                if (_mode == _PyqMode.study || attempt != null)
                  const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _openQuestionDetail(fullFiltered, index),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(48, 40),
                    ),
                    icon: const Icon(Icons.open_in_new, size: 16),
                    label: const Text('Full Solution'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  (IconData, String, Color) _statusVisual(String status) {
    switch (status) {
      case 'official':
        return (
          Icons.verified_outlined,
          'Official Final Key',
          OceanColors.emerald
        );
      case 'unofficial':
        return (
          Icons.info_outline,
          'Unofficial Key',
          OceanColors.oceanBlue
        );
      default:
        return (
          Icons.pending_outlined,
          'Needs Verification',
          OceanColors.coralAccent
        );
    }
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;

  const _HeroStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: OceanColors.pureWhite.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              color: OceanColors.pureWhite,
              fontWeight: FontWeight.w800,
              fontSize: 15,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: OceanColors.seaGlass,
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class PyqDetailScreen extends StatefulWidget {
  final List<Map<String, dynamic>> questions;
  final int initialIndex;
  final String preferredLanguage;
  final bool isPracticeMode;
  final StudentPyqState Function() getState;
  final Future<void> Function(Map<String, dynamic> q) onToggleBookmark;
  final Future<void> Function(String id) onToggleDifficult;
  final Future<void> Function(String id) onToggleRevision;
  final Future<void> Function(Map<String, dynamic> q, int idx) onRecordAttempt;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;

  const PyqDetailScreen({
    super.key,
    required this.questions,
    required this.initialIndex,
    required this.preferredLanguage,
    required this.isPracticeMode,
    required this.getState,
    required this.onToggleBookmark,
    required this.onToggleDifficult,
    required this.onToggleRevision,
    required this.onRecordAttempt,
    required this.firestoreService,
    required this.onGoHome,
  });

  @override
  State<PyqDetailScreen> createState() => _PyqDetailScreenState();
}

class _PyqDetailScreenState extends State<PyqDetailScreen> {
  late int _index;
  bool _showAnswer = true;
  bool _showHindi = false;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, widget.questions.length - 1);
    _showAnswer = !widget.isPracticeMode;
  }

  String _answerStatusOf(Map<String, dynamic> q) {
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

  @override
  Widget build(BuildContext context) {
    final q = widget.questions[_index];
    final id = (q['id'] ?? '').toString();
    final state = widget.getState();
    final isBookmarked = state.bookmarkedIds.contains(id);
    final isDifficult = state.difficultIds.contains(id);
    final isRevision = state.revisionIds.contains(id);
    final attempt = state.attempts[id];

    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final correctIdx =
        (int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0).clamp(0, 3);
    final steps = (q['stepByStep'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .where((e) => e.trim().isNotEmpty)
        .toList();
    final shortcut = (q['shortcutMethod'] ?? '').toString().trim();
    final questionHi = (q['questionHi'] ?? '').toString().trim();
    final status = _answerStatusOf(q);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Question ${_index + 1} of ${widget.questions.length}',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            onPressed: () async {
              await widget.onToggleBookmark(q);
              if (mounted) setState(() {});
            },
            icon: Icon(
              isBookmarked ? Icons.bookmark : Icons.bookmark_border,
              color: isBookmarked ? OceanColors.oceanBlue : null,
            ),
            tooltip: 'Bookmark',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          OceanBackHomeBar(
            title: '${q['year'] ?? '—'} · ${q['tier'] ?? 'Tier 1'}',
            onBack: () => Navigator.of(context).pop(),
            onHome: () {
              Navigator.of(context).pop();
              widget.onGoHome();
            },
          ),
          OceanGlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    if (q['questionNumber'] != null) 'Q${q['questionNumber']}',
                    '${q['year'] ?? '—'}',
                    '${q['tier'] ?? 'Tier 1'}',
                    StudentStrings.subjectTitle(
                        (q['subject'] ?? '').toString()),
                    '${q['topic'] ?? 'General'}',
                    if ((q['examDate'] ?? '').toString().isNotEmpty)
                      q['examDate'].toString(),
                    if ((q['shift'] ?? '').toString().isNotEmpty)
                      q['shift'].toString(),
                    '${q['difficulty'] ?? 'Medium'}',
                  ].join(' · '),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: OceanColors.textMuted,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    OceanStatusBadge(
                      icon: status == 'official'
                          ? Icons.verified_outlined
                          : (status == 'unofficial'
                              ? Icons.info_outline
                              : Icons.pending_outlined),
                      label: status == 'official'
                          ? 'Official Final Key'
                          : (status == 'unofficial'
                              ? 'Unofficial Key'
                              : 'Needs Verification'),
                      color: status == 'official'
                          ? OceanColors.emerald
                          : (status == 'unofficial'
                              ? OceanColors.oceanBlue
                              : OceanColors.coralAccent),
                    ),
                    if (questionHi.isNotEmpty)
                      ChoiceChip(
                        label: Text(_showHindi ? 'Show English' : 'Hindi'),
                        selected: _showHindi,
                        onSelected: (v) => setState(() => _showHindi = v),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  (_showHindi && questionHi.isNotEmpty)
                      ? questionHi
                      : (q['questionEn'] ?? '').toString(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // All 4 options
          ...List.generate(options.length, (i) {
            final chosen = attempt != null
                ? int.tryParse((attempt['selectedIndex'] ?? -1).toString())
                : null;
            final reveal = _showAnswer || chosen != null;
            final isCorrect = i == correctIdx;
            final isChosen = chosen == i;

            Color border = OceanColors.borderLight;
            Color bg = OceanColors.pureWhite;
            IconData? trailing;
            Color trailingColor = OceanColors.emerald;

            if (reveal) {
              if (isCorrect) {
                border = OceanColors.emerald;
                bg = OceanColors.emerald.withValues(alpha: 0.12);
                trailing = Icons.check_circle;
                trailingColor = OceanColors.emerald;
              } else if (isChosen) {
                border = OceanColors.coralAccent;
                bg = OceanColors.coralAccent.withValues(alpha: 0.12);
                trailing = Icons.cancel;
                trailingColor = OceanColors.coralAccent;
              }
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () async {
                  await widget.onRecordAttempt(q, i);
                  if (mounted) setState(() => _showAnswer = true);
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 52),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: border,
                      width: reveal && (isCorrect || isChosen) ? 2 : 1,
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
                            fontSize: 12.5,
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
                      if (trailing != null)
                        Icon(trailing, color: trailingColor, size: 20),
                    ],
                  ),
                ),
              ),
            );
          }),

          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => setState(() => _showAnswer = !_showAnswer),
                  icon: Icon(
                    _showAnswer
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                  ),
                  label: Text(_showAnswer ? 'Hide Answer' : 'Show Answer'),
                ),
              ),
            ],
          ),

          if (_showAnswer) ...[
            const SizedBox(height: 12),
            OceanGlassCard(
              borderColor: OceanColors.emerald.withValues(alpha: 0.45),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Correct Answer: Option ${String.fromCharCode(65 + correctIdx)} (${correctIdx < options.length ? options[correctIdx] : ''})',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: OceanColors.emerald,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Detailed Explanation',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    StudentStrings.pickExplanation(
                        q, widget.preferredLanguage),
                    style: const TextStyle(fontSize: 13.5, height: 1.45),
                  ),
                ],
              ),
            ),
            if (steps.isNotEmpty) ...[
              const SizedBox(height: 10),
              OceanGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Step-by-Step Solution',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...List.generate(steps.length, (i) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${i + 1}. ',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                steps[i],
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
            if (shortcut.isNotEmpty) ...[
              const SizedBox(height: 10),
              OceanGlassCard(
                borderColor: OceanColors.turquoise,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.bolt_rounded,
                            color: OceanColors.oceanBlue, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'Exam Shortcut Method',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: OceanColors.oceanBlue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      shortcut,
                      style: const TextStyle(fontSize: 13.5, height: 1.45),
                    ),
                  ],
                ),
              ),
            ],
          ],

          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () async {
                  await widget.onToggleDifficult(id);
                  if (mounted) setState(() {});
                },
                icon: Icon(
                  isDifficult ? Icons.flag : Icons.flag_outlined,
                  color: isDifficult ? OceanColors.coralAccent : null,
                  size: 18,
                ),
                label: Text(isDifficult ? 'Marked Difficult' : 'Mark Difficult'),
              ),
              OutlinedButton.icon(
                onPressed: () async {
                  await widget.onToggleRevision(id);
                  if (mounted) setState(() {});
                },
                icon: Icon(
                  isRevision ? Icons.playlist_add_check : Icons.playlist_add,
                  size: 18,
                ),
                label: Text(
                    isRevision ? 'In Revision List' : 'Save for Revision'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => StudentTutorScreen(
                        firestoreService: widget.firestoreService,
                        initialLanguage: widget.preferredLanguage,
                        contextTopic: (q['topic'] ?? '').toString(),
                        initialPrompt:
                            'Explain this SSC CGL PYQ (${q['year'] ?? ''} ${q['tier'] ?? ''}) step by step and share a fast trick:\n\n${q['questionEn']}',
                        onGoHome: widget.onGoHome,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.auto_awesome, size: 18),
                label: const Text('Ask Examora AI'),
              ),
            ],
          ),

          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _index > 0
                      ? () => setState(() {
                            _index--;
                            _showAnswer = !widget.isPracticeMode;
                            _showHindi = false;
                          })
                      : null,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Previous'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _index < widget.questions.length - 1
                      ? () => setState(() {
                            _index++;
                            _showAnswer = !widget.isPracticeMode;
                            _showHindi = false;
                          })
                      : null,
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('Next Question'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
