import 'dart:async';
import 'dart:ui' show FontFeature;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'ocean_quest_data.dart';
import 'ocean_quest_lottie.dart';
import 'student_i18n.dart';
import 'student_tutor_screen.dart';

class OceanQuestScreen extends StatelessWidget {
  final String uid;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;
  final String? initialMode;

  const OceanQuestScreen({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.onGoHome,
    this.initialMode,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Row(
          children: [
            Icon(Icons.waves_rounded, color: OceanColors.oceanBlue, size: 22),
            SizedBox(width: 8),
            Text(
              'Ocean Quest',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              onGoHome();
            },
            icon: const Icon(Icons.home_outlined, size: 18),
            label: const Text('Home'),
          ),
        ],
      ),
      body: OceanQuestHubView(
        uid: uid,
        preferredLanguage: preferredLanguage,
        firestoreService: firestoreService,
        onGoHome: () {
          Navigator.of(context).pop();
          onGoHome();
        },
        initialMode: initialMode,
      ),
    );
  }
}

enum _QuestViewStage { map, briefing, playing, result }

class OceanQuestHubView extends StatefulWidget {
  final String uid;
  final String preferredLanguage;
  final FirestoreService firestoreService;
  final VoidCallback onGoHome;
  final String? initialMode;

  const OceanQuestHubView({
    super.key,
    required this.uid,
    required this.preferredLanguage,
    required this.firestoreService,
    required this.onGoHome,
    this.initialMode,
  });

  @override
  State<OceanQuestHubView> createState() => _OceanQuestHubViewState();
}

class _OceanQuestHubViewState extends State<OceanQuestHubView> {
  OceanQuestProgressModel _progress = const OceanQuestProgressModel(uid: '');
  bool _loadingProgress = true;
  bool _muted = false;

  String _selectedLocationId = 'coral-bay';
  String _difficultyFilter = 'all';
  String _modeFilter = 'all';
  String _subjectFilter = 'all';

  _QuestViewStage _stage = _QuestViewStage.map;
  Map<String, dynamic>? _activeMission;
  List<Map<String, dynamic>> _missionQuestions = [];
  List<Map<String, dynamic>> _cachedPublishedQuestions = [];
  List<Map<String, dynamic>> _cachedMissions = [];

  int _qIdx = 0;
  int? _selectedOption;
  bool _answerChecked = false;
  bool _paused = false;
  int _hintsLeft = 0;
  Set<int> _eliminatedOptions = {};
  bool _showTextHint = false;

  int _correctCount = 0;
  int _timeLeftSec = 0;
  int _elapsedSec = 0;
  int _runNonce = 0;
  Timer? _timer;

  final List<String> _seenRunIds = [];
  final List<String> _correctRunIds = [];
  final List<String> _wrongRunIds = [];
  final Map<String, Map<String, int>> _subjectDelta = {};
  final List<Map<String, dynamic>> _missedRunDetails = [];

  bool _submittingResult = false;
  OceanQuestEvalResult? _lastResult;

  @override
  void initState() {
    super.initState();
    if (widget.initialMode != null && widget.initialMode!.isNotEmpty) {
      _modeFilter = widget.initialMode!;
    }
    _loadProgress();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadProgress() async {
    final loaded =
        await widget.firestoreService.loadOceanQuestProgress(widget.uid);
    if (!mounted) return;
    setState(() {
      _progress = loaded;
      _loadingProgress = false;
      if (loaded.unlockedLocations.isNotEmpty) {
        _selectedLocationId = loaded.unlockedLocations.last;
      }
    });
  }

  List<Map<String, dynamic>> _mergeMissions(
    List<Map<String, dynamic>> remoteDocs,
  ) {
    final byId = <String, Map<String, dynamic>>{};
    for (final m in kOceanMissionsSeed) {
      byId[m['missionId'].toString()] = Map<String, dynamic>.from(m);
    }
    for (final doc in remoteDocs) {
      final id = (doc['missionId'] ?? doc['id'] ?? '').toString();
      if (id.isNotEmpty) {
        byId[id] = doc;
      }
    }
    final list = byId.values.where((m) => m['isPublished'] != false).toList();
    list.sort((a, b) {
      final ao = int.tryParse((a['order'] ?? 99).toString()) ?? 99;
      final bo = int.tryParse((b['order'] ?? 99).toString()) ?? 99;
      return ao.compareTo(bo);
    });
    _cachedMissions = list;
    return list;
  }

  void _openMissionBriefing(
    Map<String, dynamic> mission,
    List<Map<String, dynamic>> allMissions,
  ) {
    final unlock = evaluateMissionUnlock(mission, _progress, allMissions);
    if (!unlock.unlocked) {
      OceanSoundHaptic.wrong(_muted);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(unlock.reason),
          backgroundColor: OceanColors.oceanNavy,
        ),
      );
      return;
    }
    OceanSoundHaptic.tap(_muted);
    setState(() {
      _activeMission = mission;
      _stage = _QuestViewStage.briefing;
    });
  }

  void _startActiveMission(List<Map<String, dynamic>> allQuestions) {
    final mission = _activeMission;
    if (mission == null) return;
    _runNonce++;
    final picked = selectSmartQuestQuestions(
      allQuestions,
      mission,
      _progress.seenQuestionIds,
      runNonce: _runNonce,
    );
    if (picked.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No SSC CGL questions are published for this mission yet.',
          ),
        ),
      );
      return;
    }

    _timer?.cancel();
    final timeLimit =
        int.tryParse((mission['timeLimitSec'] ?? 0).toString()) ?? 0;
    final hints = int.tryParse((mission['hintLimit'] ?? 2).toString()) ?? 2;

    OceanSoundHaptic.tap(_muted);
    setState(() {
      _missionQuestions = picked;
      _qIdx = 0;
      _selectedOption = null;
      _answerChecked = false;
      _paused = false;
      _hintsLeft = hints;
      _eliminatedOptions = {};
      _showTextHint = false;
      _correctCount = 0;
      _timeLeftSec = timeLimit;
      _elapsedSec = 0;
      _seenRunIds.clear();
      _correctRunIds.clear();
      _wrongRunIds.clear();
      _subjectDelta.clear();
      _missedRunDetails.clear();
      _lastResult = null;
      _stage = _QuestViewStage.playing;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || _stage != _QuestViewStage.playing) {
        t.cancel();
        return;
      }
      if (_paused) return;
      setState(() {
        _elapsedSec++;
        if (timeLimit > 0 && _timeLeftSec > 0) {
          _timeLeftSec--;
        }
      });
      if (timeLimit > 0 && _timeLeftSec <= 0) {
        t.cancel();
        _finishMission();
      }
    });
  }

  void _useHint() {
    if (_answerChecked || _hintsLeft <= 0 || _missionQuestions.isEmpty) return;
    final q = _missionQuestions[_qIdx];
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final wrongIndices = <int>[
      for (int i = 0; i < 4; i++)
        if (i != expected && !_eliminatedOptions.contains(i)) i,
    ];
    OceanSoundHaptic.tap(_muted);
    setState(() {
      _hintsLeft--;
      _showTextHint = true;
      if (wrongIndices.isNotEmpty) {
        _eliminatedOptions.add(wrongIndices.first);
      }
    });
  }

  void _selectAnswer(int optionIdx) {
    if (_answerChecked ||
        _paused ||
        _eliminatedOptions.contains(optionIdx) ||
        _missionQuestions.isEmpty) {
      return;
    }
    final q = _missionQuestions[_qIdx];
    final qId = (q['id'] ?? '').toString();
    final subject = (q['subject'] ?? 'quant').toString();
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final isRight = optionIdx == expected;

    if (isRight) {
      OceanSoundHaptic.correct(_muted);
    } else {
      OceanSoundHaptic.wrong(_muted);
    }

    setState(() {
      _selectedOption = optionIdx;
      _answerChecked = true;
      if (qId.isNotEmpty && !_seenRunIds.contains(qId)) {
        _seenRunIds.add(qId);
      }
      final prev = _subjectDelta[subject] ?? {'attempted': 0, 'correct': 0};
      prev['attempted'] = (prev['attempted'] ?? 0) + 1;
      if (isRight) {
        _correctCount++;
        prev['correct'] = (prev['correct'] ?? 0) + 1;
        if (qId.isNotEmpty) _correctRunIds.add(qId);
      } else {
        if (qId.isNotEmpty) _wrongRunIds.add(qId);
        _missedRunDetails.add({
          ...q,
          'chosenIndex': optionIdx,
        });
      }
      _subjectDelta[subject] = prev;
    });
  }

  void _nextQuestionOrFinish() {
    OceanSoundHaptic.tap(_muted);
    if (_qIdx + 1 >= _missionQuestions.length) {
      _finishMission();
    } else {
      setState(() {
        _qIdx++;
        _selectedOption = null;
        _answerChecked = false;
        _eliminatedOptions = {};
        _showTextHint = false;
      });
    }
  }

  Future<void> _finishMission() async {
    _timer?.cancel();
    final mission = _activeMission;
    if (mission == null) return;
    setState(() {
      _submittingResult = true;
      _stage = _QuestViewStage.result;
    });

    final eval = await widget.firestoreService.completeOceanQuestMission(
      uid: widget.uid,
      mission: mission,
      allMissions: _cachedMissions,
      currentProgress: _progress,
      correctCount: _correctCount,
      totalQuestions: _missionQuestions.length,
      seenIds: _seenRunIds,
      correctIds: _correctRunIds,
      wrongIds: _wrongRunIds,
      subjectDelta: _subjectDelta,
      timeTakenSec: _elapsedSec,
    );

    if (eval.passed) {
      OceanSoundHaptic.victory(_muted);
    }

    if (!mounted) return;
    setState(() {
      _lastResult = eval;
      _progress = eval.updatedProgress;
      _submittingResult = false;
      if (eval.newlyUnlockedLocations.isNotEmpty) {
        _selectedLocationId = eval.newlyUnlockedLocations.last;
      }
    });
  }

  void _openRevisionSheet() {
    final wrongSet = _progress.wrongQuestionIds.toSet();
    final wrongQuestions = _cachedPublishedQuestions
        .where((q) => wrongSet.contains((q['id'] ?? '').toString()))
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: OceanColors.foamWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.78,
        maxChildSize: 0.94,
        builder: (_, controller) => Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.menu_book_rounded,
                      color: OceanColors.oceanBlue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Quest Mistake Revision (${wrongQuestions.length})',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const Text(
                'Questions you missed in Ocean Quest are saved here automatically until you solve them right.',
                style: TextStyle(fontSize: 12.5, color: OceanColors.textMuted),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: wrongQuestions.isEmpty
                    ? const Center(
                        child: Text(
                          'Clean logbook! Missed Ocean Quest questions will appear here for revision.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: OceanColors.textMuted),
                        ),
                      )
                    : ListView.builder(
                        controller: controller,
                        itemCount: wrongQuestions.length,
                        itemBuilder: (_, i) {
                          final q = wrongQuestions[i];
                          final opts = (q['optionsEn'] as List<dynamic>? ?? [])
                              .map((e) => e.toString())
                              .toList();
                          final correctIdx =
                              (int.tryParse((q['correctIndex'] ?? 0).toString()) ??
                                      0)
                                  .clamp(0, 3);
                          final correctText =
                              correctIdx < opts.length ? opts[correctIdx] : '';
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: OceanGlassCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 6,
                                    children: [
                                      OceanStatusBadge(
                                        icon: Icons.topic_outlined,
                                        label: (q['topic'] ?? 'SSC CGL')
                                            .toString(),
                                        color: OceanColors.oceanBlue,
                                      ),
                                      OceanStatusBadge(
                                        icon: (q['sourceType'] ?? '') == 'PYQ'
                                            ? Icons.verified_outlined
                                            : Icons.auto_awesome_outlined,
                                        label: (q['sourceType'] ?? '') == 'PYQ'
                                            ? 'PYQ ${q['year'] ?? ''}'
                                            : 'Practice',
                                        color: OceanColors.turquoise,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    (q['questionEn'] ?? '').toString(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Answer (${String.fromCharCode(65 + correctIdx)}): $correctText',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5,
                                      color: OceanColors.emerald,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    StudentStrings.pickExplanation(
                                        q, widget.preferredLanguage),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: OceanColors.textMuted,
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  OutlinedButton.icon(
                                    onPressed: () {
                                      Navigator.of(ctx).pop();
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => StudentTutorScreen(
                                            firestoreService:
                                                widget.firestoreService,
                                            initialLanguage:
                                                widget.preferredLanguage,
                                            contextTopic:
                                                (q['topic'] ?? '').toString(),
                                            initialPrompt:
                                                'Explain this Ocean Quest question clearly: ${q['questionEn']}',
                                            onGoHome: widget.onGoHome,
                                          ),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.auto_awesome,
                                        size: 16),
                                    label: const Text('Ask AI Mentor'),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDuration(int sec) {
    final m = sec ~/ 60;
    final s = sec % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingProgress) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder(
      stream: widget.firestoreService.streamPublishedOceanQuestMissions(),
      builder: (context, missionSnap) {
        final remoteMissions = (missionSnap.data?.docs ?? [])
            .map((d) => {'id': d.id, ...d.data()})
            .toList();
        final allMissions = _mergeMissions(remoteMissions);

        return StreamBuilder(
          stream: widget.firestoreService.streamPublishedQuestions(),
          builder: (context, qSnap) {
            final allQuestions = (qSnap.data?.docs ?? [])
                .map((d) => {'id': d.id, ...d.data()})
                .toList();
            _cachedPublishedQuestions = allQuestions;

            if (_stage == _QuestViewStage.briefing && _activeMission != null) {
              return _buildBriefingView(_activeMission!, allQuestions);
            }
            if (_stage == _QuestViewStage.playing && _activeMission != null) {
              return _buildGameplayView(_activeMission!);
            }
            if (_stage == _QuestViewStage.result && _activeMission != null) {
              return _buildResultView(
                  _activeMission!, allMissions, allQuestions);
            }
            return _buildAdventureMapView(allMissions);
          },
        );
      },
    );
  }

  Widget _buildAdventureMapView(List<Map<String, dynamic>> allMissions) {
    final unlockedSet = _progress.unlockedLocations.toSet();
    final completedSet = _progress.completedMissions.toSet();
    final todayKey = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    final dailyClaimed = _progress.dailyCompletions.contains(todayKey);

    Map<String, dynamic>? dailyMission;
    for (final m in allMissions) {
      if ((m['mode'] ?? '') == 'daily-challenge') {
        dailyMission = m;
        break;
      }
    }

    OceanLocationDef selectedLoc = kOceanLocations.first;
    for (final l in kOceanLocations) {
      if (l.locationId == _selectedLocationId) {
        selectedLoc = l;
        break;
      }
    }

    final filteredMissions = allMissions.where((m) {
      final mode = (m['mode'] ?? '').toString();
      if (mode == 'daily-challenge' && _modeFilter != 'daily-challenge') {
        return false;
      }
      if (_modeFilter != 'all') {
        if (mode != _modeFilter) return false;
      } else if (_difficultyFilter == 'all') {
        if ((m['locationId'] ?? '') != _selectedLocationId) return false;
      }
      if (_difficultyFilter != 'all' &&
          (m['difficulty'] ?? '') != _difficultyFilter) {
        return false;
      }
      if (_subjectFilter != 'all' &&
          (m['subject'] ?? '') != _subjectFilter &&
          (m['subject'] ?? '') != 'mixed') {
        return false;
      }
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        // Top HUD Banner
        OceanWaveHeaderCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const OceanQuestLottieBadge(
                    fallbackIcon: Icons.explore_rounded,
                    color: OceanColors.aqua,
                    size: 52,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'OCEAN QUEST EXPEDITION',
                          style: TextStyle(
                            color: OceanColors.aqua,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          '9 Depths · SSC CGL Adventure',
                          style: TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${unlockedSet.length}/9 Zones · ${completedSet.length} Cleared · ${_progress.crystals} Crystals',
                          style: const TextStyle(
                            color: OceanColors.seaGlass,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: _muted ? 'Unmute Sound/FX' : 'Mute Sound/FX',
                    onPressed: () => setState(() => _muted = !_muted),
                    icon: Icon(
                      _muted
                          ? Icons.volume_off_outlined
                          : Icons.volume_up_outlined,
                      color: OceanColors.aqua,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _hudPill(
                    Icons.diamond_outlined,
                    '${_progress.crystals} Crystals',
                  ),
                  _hudPill(
                    Icons.bolt_outlined,
                    '${_progress.totalQuestXp} Quest XP',
                  ),
                  _hudPill(
                    Icons.military_tech_outlined,
                    '${_progress.questBadges.length}/5 Badges',
                  ),
                  InkWell(
                    onTap: _openRevisionSheet,
                    borderRadius: BorderRadius.circular(10),
                    child: _hudPill(
                      Icons.menu_book_outlined,
                      'Mistakes (${_progress.wrongQuestionIds.length})',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Daily Tide Challenge Card
        if (dailyMission != null) ...[
          OceanGlassCard(
            onTap: () => _openMissionBriefing(dailyMission!, allMissions),
            borderColor: OceanColors.turquoise,
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [OceanColors.oceanBlue, OceanColors.turquoise],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.today_rounded,
                    color: OceanColors.pureWhite,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Daily Tide Challenge',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          OceanStatusBadge(
                            icon: dailyClaimed
                                ? Icons.check_circle_outline
                                : Icons.auto_awesome,
                            label: dailyClaimed
                                ? 'Claimed Today'
                                : '+${dailyMission['crystalReward'] ?? 10} Crystals',
                            color: dailyClaimed
                                ? OceanColors.emerald
                                : OceanColors.oceanBlue,
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        dailyClaimed
                            ? 'Daily bonus claimed! You can still replay for practice.'
                            : (dailyMission['description'] ?? '').toString(),
                        style: const TextStyle(
                          fontSize: 12,
                          color: OceanColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: OceanColors.oceanBlue),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // Interactive 9-Location Underwater Map
        const Text(
          'Underwater Adventure Map',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Container(
            height: 295,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF075985),
                  OceanColors.oceanNavy,
                  OceanColors.deepOcean,
                ],
              ),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final w = constraints.maxWidth;
                final h = constraints.maxHeight;
                return Stack(
                  children: [
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.25,
                        child: Image.asset(
                          'assets/images/ocean_sunrays.jpg',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: CustomPaint(
                        painter: OceanBathymetricMapPainter(
                          locations: kOceanLocations,
                          unlockedLocations: unlockedSet,
                        ),
                      ),
                    ),
                    // Depth Tier Labels on left edge
                    const Positioned(
                      left: 10,
                      top: 10,
                      child: Text(
                        'BEGINNER · 20m–110m',
                        style: TextStyle(
                          color: OceanColors.seaGlass,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const Positioned(
                      left: 10,
                      top: 112,
                      child: Text(
                        'INTERMEDIATE · 240m–680m',
                        style: TextStyle(
                          color: OceanColors.aqua,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const Positioned(
                      left: 10,
                      top: 202,
                      child: Text(
                        'ADVANCED ABYSS · 1200m–2500m',
                        style: TextStyle(
                          color: OceanColors.coralAccent,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    // Location Nodes
                    ...kOceanLocations.map((loc) {
                      final unlockStatus = evaluateLocationUnlock(
                        loc.locationId,
                        _progress,
                        allMissions,
                      );
                      final isSelected =
                          loc.locationId == _selectedLocationId;
                      final left = ((loc.mapX / 100.0) * w - 24)
                          .clamp(6.0, w - 88.0);
                      final top = ((loc.mapY / 100.0) * h - 18)
                          .clamp(22.0, h - 54.0);

                      return Positioned(
                        left: left,
                        top: top,
                        child: InkWell(
                          onTap: () {
                            OceanSoundHaptic.tap(_muted);
                            setState(() {
                              _selectedLocationId = loc.locationId;
                              _modeFilter = 'all';
                              _difficultyFilter = 'all';
                            });
                            if (!unlockStatus.unlocked) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(unlockStatus.reason),
                                  backgroundColor: OceanColors.oceanNavy,
                                ),
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isSelected && unlockStatus.unlocked)
                                const Padding(
                                  padding: EdgeInsets.only(bottom: 3),
                                  child: AnimatedSubmarineMarker(),
                                ),
                              Container(
                                constraints: const BoxConstraints(
                                  minWidth: 44,
                                  minHeight: 34,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: unlockStatus.unlocked
                                      ? (isSelected
                                          ? OceanColors.turquoise
                                          : OceanColors.oceanNavy
                                              .withValues(alpha: 0.92))
                                      : OceanColors.deepOcean
                                          .withValues(alpha: 0.82),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected
                                        ? OceanColors.foamWhite
                                        : (unlockStatus.unlocked
                                            ? loc.accent
                                            : OceanColors.borderDark),
                                    width: isSelected ? 2 : 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      unlockStatus.unlocked
                                          ? Icons.anchor_rounded
                                          : Icons.lock_outline,
                                      size: 13,
                                      color: isSelected && unlockStatus.unlocked
                                          ? OceanColors.deepOcean
                                          : (unlockStatus.unlocked
                                              ? loc.accent
                                              : OceanColors.seaGlass
                                                  .withValues(alpha: 0.6)),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${loc.order}. ${loc.name.split(' ').first}',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                        color: isSelected &&
                                                unlockStatus.unlocked
                                            ? OceanColors.deepOcean
                                            : (unlockStatus.unlocked
                                                ? OceanColors.foamWhite
                                                : OceanColors.seaGlass
                                                    .withValues(alpha: 0.65)),
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
              },
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Selected Zone Info Card (or Lock Status)
        Builder(
          builder: (context) {
            final locStatus = evaluateLocationUnlock(
              selectedLoc.locationId,
              _progress,
              allMissions,
            );
            return OceanGlassCard(
              borderColor: locStatus.unlocked
                  ? selectedLoc.accent
                  : OceanColors.coralAccent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      OceanStatusBadge(
                        icon: locStatus.unlocked
                            ? Icons.waves
                            : Icons.lock_outline,
                        label:
                            'Zone ${selectedLoc.order} · ${selectedLoc.depthMeters}m · ${selectedLoc.difficulty.toUpperCase()}',
                        color: locStatus.unlocked
                            ? OceanColors.oceanBlue
                            : OceanColors.coralAccent,
                      ),
                      const Spacer(),
                      Text(
                        locStatus.unlocked ? 'Unlocked' : 'Locked',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: locStatus.unlocked
                              ? OceanColors.emerald
                              : OceanColors.coralAccent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    selectedLoc.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    selectedLoc.description,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: OceanColors.textMuted,
                    ),
                  ),
                  if (!locStatus.unlocked) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: OceanColors.coralAccent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.lock_clock_outlined,
                              size: 16, color: OceanColors.coralAccent),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              locStatus.reason,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: OceanColors.deepOcean,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 14),

        // Difficulty & Game Mode Filters
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _choicePill(
                label: 'Zone View',
                selected: _difficultyFilter == 'all' && _modeFilter == 'all',
                onTap: () => setState(() {
                  _difficultyFilter = 'all';
                  _modeFilter = 'all';
                }),
              ),
              const SizedBox(width: 8),
              _choicePill(
                label: 'Beginner',
                selected: _difficultyFilter == 'beginner',
                onTap: () => setState(() {
                  _difficultyFilter =
                      _difficultyFilter == 'beginner' ? 'all' : 'beginner';
                }),
              ),
              const SizedBox(width: 8),
              _choicePill(
                label: 'Intermediate',
                selected: _difficultyFilter == 'intermediate',
                onTap: () => setState(() {
                  _difficultyFilter = _difficultyFilter == 'intermediate'
                      ? 'all'
                      : 'intermediate';
                }),
              ),
              const SizedBox(width: 8),
              _choicePill(
                label: 'Advanced',
                selected: _difficultyFilter == 'advanced',
                onTap: () => setState(() {
                  _difficultyFilter =
                      _difficultyFilter == 'advanced' ? 'all' : 'advanced';
                }),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _choicePill(
                label: 'All Modes',
                selected: _modeFilter == 'all',
                onTap: () => setState(() => _modeFilter = 'all'),
              ),
              ...kOceanModeMeta.values.map(
                (meta) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: _choicePill(
                    label: meta.shortLabel,
                    selected: _modeFilter == meta.id,
                    onTap: () => setState(() => _modeFilter = meta.id),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_modeFilter == 'subject-mission') ...[
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _choicePill(
                  label: 'All Subjects',
                  selected: _subjectFilter == 'all',
                  onTap: () => setState(() => _subjectFilter = 'all'),
                ),
                ...sscCglSubjects.map(
                  (s) => Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _choicePill(
                      label: s.shortTitle,
                      selected: _subjectFilter == s.id,
                      onTap: () => setState(() => _subjectFilter = s.id),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),

        Text(
          _modeFilter != 'all'
              ? '${kOceanModeMeta[_modeFilter]?.label ?? 'Filtered'} Missions (${filteredMissions.length})'
              : _difficultyFilter != 'all'
                  ? '${_difficultyFilter.toUpperCase()} Missions (${filteredMissions.length})'
                  : 'Missions in ${selectedLoc.name} (${filteredMissions.length})',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        if (filteredMissions.isEmpty)
          const OceanGlassCard(
            child: Text(
              'No missions matched that filter. Tap "Zone View" or "All Modes" to explore.',
              style: TextStyle(color: OceanColors.textMuted),
            ),
          )
        else
          ...filteredMissions.map((m) {
            final mId = (m['missionId'] ?? m['id'] ?? '').toString();
            final unlock = evaluateMissionUnlock(m, _progress, allMissions);
            final done = completedSet.contains(mId);
            final stars = _progress.missionStars[mId] ?? 0;
            final best = _progress.missionBestScores[mId] ?? 0;
            final modeMeta =
                kOceanModeMeta[(m['mode'] ?? 'treasure-hunt').toString()];
            final timerSec =
                int.tryParse((m['timeLimitSec'] ?? 0).toString()) ?? 0;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OceanGlassCard(
                onTap: () => _openMissionBriefing(m, allMissions),
                borderColor: unlock.unlocked
                    ? (done ? OceanColors.emerald : OceanColors.borderLight)
                    : OceanColors.coralAccent.withValues(alpha: 0.4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: (unlock.unlocked
                                    ? OceanColors.oceanBlue
                                    : OceanColors.textMuted)
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            unlock.unlocked
                                ? (modeMeta?.icon ?? Icons.waves)
                                : Icons.lock_outline,
                            color: unlock.unlocked
                                ? OceanColors.oceanBlue
                                : OceanColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                (m['title'] ?? 'Ocean Mission').toString(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${modeMeta?.shortLabel ?? 'Quest'} · ${m['questionCount'] ?? 5} Qs · ${timerSec > 0 ? '${(timerSec / 60).ceil()}m' : 'Untimed'} · +${m['xpReward'] ?? 100} XP',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: OceanColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (done)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: List.generate(
                              3,
                              (idx) => Icon(
                                idx < stars
                                    ? Icons.star_rounded
                                    : Icons.star_border_rounded,
                                size: 18,
                                color: idx < stars
                                    ? const Color(0xFFF59E0B)
                                    : OceanColors.textMuted,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      (m['description'] ?? '').toString(),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: OceanColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (m['isBoss'] == true)
                          const Padding(
                            padding: EdgeInsets.only(right: 8),
                            child: OceanStatusBadge(
                              icon: Icons.shield_outlined,
                              label: 'Guardian Boss',
                              color: OceanColors.coralAccent,
                            ),
                          ),
                        if (best > 0)
                          OceanStatusBadge(
                            icon: Icons.emoji_events_outlined,
                            label: 'Best: $best',
                            color: OceanColors.emerald,
                          ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () =>
                              _openMissionBriefing(m, allMissions),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(110, 44),
                            backgroundColor: unlock.unlocked
                                ? OceanColors.oceanBlue
                                : OceanColors.textMuted.withValues(alpha: 0.4),
                          ),
                          child: Text(
                            unlock.unlocked
                                ? (done ? 'Replay' : 'Dive In')
                                : 'Locked',
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                    if (!unlock.unlocked) ...[
                      const SizedBox(height: 6),
                      Text(
                        unlock.reason,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: OceanColors.coralAccent,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildBriefingView(
    Map<String, dynamic> mission,
    List<Map<String, dynamic>> allQuestions,
  ) {
    final mId = (mission['missionId'] ?? mission['id'] ?? '').toString();
    final mode = (mission['mode'] ?? 'treasure-hunt').toString();
    final modeMeta = kOceanModeMeta[mode];
    final timerSec =
        int.tryParse((mission['timeLimitSec'] ?? 0).toString()) ?? 0;
    final alreadyCleared = _progress.completedMissions.contains(mId);
    final todayKey = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    final dailyClaimed =
        mode == 'daily-challenge' && _progress.dailyCompletions.contains(todayKey);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanBackHomeBar(
          title: 'Mission Briefing',
          onBack: () => setState(() => _stage = _QuestViewStage.map),
          onHome: widget.onGoHome,
        ),
        OceanWaveHeaderCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              OceanStatusBadge(
                icon: modeMeta?.icon ?? Icons.waves,
                label:
                    '${modeMeta?.label ?? 'Mission'} · ${(mission['difficulty'] ?? 'beginner').toString().toUpperCase()}',
                color: OceanColors.aqua,
              ),
              const SizedBox(height: 12),
              Text(
                (mission['title'] ?? 'Ocean Mission').toString(),
                style: const TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if ((mission['guardianName'] ?? '').toString().isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'Guardian: ${mission['guardianName']}',
                  style: const TextStyle(
                    color: OceanColors.coralAccent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                (mission['description'] ?? '').toString(),
                style: const TextStyle(
                  color: OceanColors.seaGlass,
                  fontSize: 13.5,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                modeMeta?.mechanicNote ?? '',
                style: const TextStyle(
                  color: OceanColors.aqua,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Mission Rules & Rewards',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              _ruleRow('Questions', '${mission['questionCount'] ?? 5} Non-Repeating SSC CGL Questions'),
              _ruleRow('Time Limit',
                  timerSec > 0 ? _formatDuration(timerSec) : 'Untimed (Learn at your pace)'),
              _ruleRow('Passing Accuracy', '${mission['minAccuracyPct'] ?? 60}% minimum'),
              _ruleRow('Hint Lifelines', '${mission['hintLimit'] ?? 0} available'),
              _ruleRow(
                'Rewards',
                (alreadyCleared || dailyClaimed)
                    ? 'Practice Replay (+6 XP / correct · first-clear claimed)'
                    : '+${mission['xpReward']} XP · +${mission['coinReward']} Coins · +${mission['crystalReward'] ?? 5} Crystals',
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () => _startActiveMission(allQuestions),
          style: FilledButton.styleFrom(
            backgroundColor: OceanColors.turquoise,
            foregroundColor: OceanColors.deepOcean,
            minimumSize: const Size(double.infinity, 52),
          ),
          icon: const Icon(Icons.play_arrow_rounded),
          label: Text(
            (alreadyCleared || dailyClaimed)
                ? 'Replay for Mastery'
                : 'Begin Underwater Dive',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
          ),
        ),
      ],
    );
  }

  Widget _buildGameplayView(Map<String, dynamic> mission) {
    final q = _missionQuestions[_qIdx];
    final options = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final mode = (mission['mode'] ?? 'treasure-hunt').toString();
    final total = _missionQuestions.length;
    final timerSec =
        int.tryParse((mission['timeLimitSec'] ?? 0).toString()) ?? 0;
    final isPyq = (q['sourceType'] ?? '') == 'PYQ';

    final bossMaxHp = total;
    final bossHpLeft = (bossMaxHp - _correctCount).clamp(0, bossMaxHp);

    return Stack(
      children: [
        ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    _timer?.cancel();
                    setState(() => _stage = _QuestViewStage.map);
                  },
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                  ),
                  icon: const Icon(Icons.arrow_back, size: 17),
                  label: const Text('Map'),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    (mission['title'] ?? 'Ocean Quest').toString(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: _paused ? 'Resume' : 'Pause',
                  onPressed: () => setState(() => _paused = !_paused),
                  icon: Icon(
                    _paused ? Icons.play_circle_outline : Icons.pause_circle_outline,
                    color: OceanColors.oceanBlue,
                  ),
                ),
                IconButton(
                  tooltip: _muted ? 'Unmute' : 'Mute',
                  onPressed: () => setState(() => _muted = !_muted),
                  icon: Icon(
                    _muted ? Icons.volume_off : Icons.volume_up,
                    color: OceanColors.oceanBlue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Mode-specific Underwater HUD
            OceanWaveHeaderCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Question ${_qIdx + 1} / $total',
                        style: const TextStyle(
                          color: OceanColors.aqua,
                          fontWeight: FontWeight.w800,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      Text(
                        timerSec > 0
                            ? 'Time Left: ${_formatDuration(_timeLeftSec)}'
                            : 'Elapsed: ${_formatDuration(_elapsedSec)}',
                        style: TextStyle(
                          color: (timerSec > 0 && _timeLeftSec <= 30)
                              ? OceanColors.coralAccent
                              : OceanColors.foamWhite,
                          fontWeight: FontWeight.w800,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (mode == 'boss-battle') ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${mission['guardianName'] ?? 'Ocean Guardian'} Shield',
                          style: const TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '$bossHpLeft / $bossMaxHp HP',
                          style: const TextStyle(
                            color: OceanColors.coralAccent,
                            fontWeight: FontWeight.w800,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: bossMaxHp > 0 ? bossHpLeft / bossMaxHp : 0,
                        minHeight: 10,
                        backgroundColor: OceanColors.deepOcean,
                        color: OceanColors.coralAccent,
                      ),
                    ),
                  ] else if (mode == 'treasure-hunt') ...[
                    Text(
                      'Treasure Seals Cracked: $_correctCount / $total',
                      style: const TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: List.generate(
                        total,
                        (idx) => Expanded(
                          child: Container(
                            height: 8,
                            margin: const EdgeInsets.only(right: 4),
                            decoration: BoxDecoration(
                              color: idx < _correctCount
                                  ? OceanColors.turquoise
                                  : OceanColors.deepOcean.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(99),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ] else ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          mode == 'crystal-rush'
                              ? 'Crystals Harvested: $_correctCount'
                              : 'Submarine Waypoint: ${_qIdx + 1}/$total',
                          style: const TextStyle(
                            color: OceanColors.seaGlass,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Score: $_correctCount/$total',
                          style: const TextStyle(
                            color: OceanColors.aqua,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: (_qIdx + 1) / total,
                        minHeight: 8,
                        backgroundColor: OceanColors.deepOcean,
                        color: OceanColors.turquoise,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Question Card with Source Provenance
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
                        icon: Icons.topic_outlined,
                        label: (q['topic'] ?? 'SSC CGL').toString(),
                        color: OceanColors.oceanBlue,
                      ),
                      OceanStatusBadge(
                        icon: isPyq
                            ? Icons.verified_outlined
                            : Icons.auto_awesome_outlined,
                        label: isPyq
                            ? 'Official PYQ · ${q['year'] ?? ''} ${q['tier'] ?? ''}'
                            : 'AI Practice',
                        color: isPyq
                            ? OceanColors.emerald
                            : OceanColors.turquoise,
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
                  if (_hintsLeft > 0 && !_answerChecked) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: _useHint,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(120, 44),
                      ),
                      icon: const Icon(Icons.lightbulb_outline, size: 17),
                      label: Text('Use Hint ($_hintsLeft left)'),
                    ),
                  ],
                  if (_showTextHint && !_answerChecked) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: OceanColors.turquoise.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        (q['shortcutMethod'] ?? '').toString().trim().isNotEmpty
                            ? 'Hint: ${q['shortcutMethod']}'
                            : 'Hint: Focus on ${(q['topic'] ?? 'core')} — 1 wrong option has been eliminated.',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: OceanColors.oceanNavy,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 4 Options (>=48px touch targets)
            ...List.generate(options.length, (i) {
              final eliminated = _eliminatedOptions.contains(i);
              final isSelected = _selectedOption == i;
              final isRight = i == expected;
              Color border = OceanColors.borderLight;
              Color bg = OceanColors.pureWhite;
              IconData? trailing;
              Color trailingColor = OceanColors.oceanBlue;

              if (eliminated && !_answerChecked) {
                bg = OceanColors.foamWhite;
                border = OceanColors.borderLight.withValues(alpha: 0.4);
              } else if (_answerChecked) {
                if (isRight) {
                  border = OceanColors.emerald;
                  bg = OceanColors.emerald.withValues(alpha: 0.12);
                  trailing = Icons.check_circle;
                  trailingColor = OceanColors.emerald;
                } else if (isSelected) {
                  border = OceanColors.coralAccent;
                  bg = OceanColors.coralAccent.withValues(alpha: 0.12);
                  trailing = Icons.cancel;
                  trailingColor = OceanColors.coralAccent;
                }
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: (_answerChecked || eliminated)
                      ? null
                      : () => _selectAnswer(i),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 54),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: bg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: border,
                        width: _answerChecked && (isRight || isSelected) ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: OceanColors.foamWhite,
                          child: Text(
                            String.fromCharCode(65 + i),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: eliminated && !_answerChecked
                                  ? OceanColors.textMuted
                                  : OceanColors.deepOcean,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            options[i],
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w600,
                              decoration: eliminated && !_answerChecked
                                  ? TextDecoration.lineThrough
                                  : null,
                              color: eliminated && !_answerChecked
                                  ? OceanColors.textMuted
                                  : OceanColors.deepOcean,
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

            // Step-by-step Explanation & Next Button
            if (_answerChecked) ...[
              const SizedBox(height: 6),
              OceanGlassCard(
                borderColor: (_selectedOption == expected
                        ? OceanColors.emerald
                        : OceanColors.coralAccent)
                    .withValues(alpha: 0.6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    OceanStatusBadge(
                      icon: _selectedOption == expected
                          ? Icons.celebration_outlined
                          : Icons.info_outline,
                      label: _selectedOption == expected
                          ? 'Direct Hit! Correct Answer'
                          : 'Saved to Mistake Revision',
                      color: _selectedOption == expected
                          ? OceanColors.emerald
                          : OceanColors.coralAccent,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      StudentStrings.pickExplanation(
                          q, widget.preferredLanguage),
                      style: const TextStyle(fontSize: 13, height: 1.45),
                    ),
                    if ((q['stepByStep'] is List) &&
                        (q['stepByStep'] as List).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...(q['stepByStep'] as List).take(4).map(
                            (s) => Padding(
                              padding: const EdgeInsets.only(bottom: 3),
                              child: Text(
                                '• $s',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: OceanColors.textMuted,
                                ),
                              ),
                            ),
                          ),
                    ],
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _nextQuestionOrFinish,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(double.infinity, 48),
                      ),
                      icon: Icon(_qIdx + 1 >= total
                          ? Icons.flag_outlined
                          : Icons.arrow_forward),
                      label: Text(
                        _qIdx + 1 >= total
                            ? 'Complete Expedition'
                            : 'Next Question',
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 240.ms),
            ],
          ],
        ),

        // Pause Overlay
        if (_paused)
          Positioned.fill(
            child: Container(
              color: OceanColors.deepOcean.withValues(alpha: 0.88),
              child: Center(
                child: OceanGlassCard(
                  child: SizedBox(
                    width: 280,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.pause_circle_filled,
                            size: 46, color: OceanColors.oceanBlue),
                        const SizedBox(height: 10),
                        const Text(
                          'Expedition Paused',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Your timer is paused. Catch your breath and resume anytime.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: OceanColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: () => setState(() => _paused = false),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(double.infinity, 48),
                          ),
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Resume Dive'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildResultView(
    Map<String, dynamic> mission,
    List<Map<String, dynamic>> allMissions,
    List<Map<String, dynamic>> allQuestions,
  ) {
    if (_submittingResult || _lastResult == null) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text('Validating mission rewards & depth unlocks...'),
          ],
        ),
      );
    }

    final res = _lastResult!;
    Map<String, dynamic>? nextMission;
    final idx = allMissions.indexWhere(
      (m) =>
          (m['missionId'] ?? m['id']).toString() ==
          (mission['missionId'] ?? mission['id']).toString(),
    );
    if (idx >= 0 && idx + 1 < allMissions.length) {
      final candidate = allMissions[idx + 1];
      if (evaluateMissionUnlock(candidate, _progress, allMissions).unlocked) {
        nextMission = candidate;
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanWaveHeaderCard(
          child: Column(
            children: [
              OceanQuestLottieBadge(
                fallbackIcon: res.passed
                    ? Icons.emoji_events_rounded
                    : Icons.refresh_rounded,
                color: res.passed
                    ? OceanColors.turquoise
                    : OceanColors.coralAccent,
                size: 86,
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  3,
                  (i) => Icon(
                    i < res.stars
                        ? Icons.star_rounded
                        : Icons.star_border_rounded,
                    size: 32,
                    color: i < res.stars
                        ? const Color(0xFFFBBF24)
                        : OceanColors.seaGlass.withValues(alpha: 0.4),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                res.passed ? 'Mission Cleared!' : 'Keep Training, Explorer!',
                style: const TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${res.accuracy}% Accuracy · $_correctCount / ${_missionQuestions.length} Correct · Score ${res.score}',
                style: const TextStyle(
                  color: OceanColors.seaGlass,
                  fontWeight: FontWeight.w600,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  _hudPill(Icons.bolt, '+${res.xpAwarded} XP'),
                  _hudPill(Icons.monetization_on_outlined,
                      '+${res.coinsAwarded} Coins'),
                  _hudPill(Icons.diamond_outlined,
                      '+${res.crystalsAwarded} Crystals'),
                ],
              ),
              if (res.newlyUnlockedLocations.isNotEmpty) ...[
                const SizedBox(height: 12),
                OceanStatusBadge(
                  icon: Icons.lock_open_rounded,
                  label:
                      'New Zone Unlocked: ${res.newlyUnlockedLocations.join(', ')}',
                  color: OceanColors.aqua,
                ),
              ],
              if (res.unlockedBadgeId != null) ...[
                const SizedBox(height: 8),
                OceanStatusBadge(
                  icon: Icons.military_tech_rounded,
                  label:
                      'Badge Earned: ${oceanBadgeTitle(res.unlockedBadgeId!)}',
                  color: const Color(0xFFFBBF24),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_missedRunDetails.isNotEmpty) ...[
          OceanGlassCard(
            borderColor: OceanColors.coralAccent.withValues(alpha: 0.5),
            child: Row(
              children: [
                const Icon(Icons.menu_book_outlined,
                    color: OceanColors.coralAccent),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '${_missedRunDetails.length} missed question(s) added to your Mistake Revision logbook.',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton(
                  onPressed: _openRevisionSheet,
                  child: const Text('Review'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (nextMission != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: FilledButton.icon(
              onPressed: () => _openMissionBriefing(nextMission!, allMissions),
              style: FilledButton.styleFrom(
                backgroundColor: OceanColors.turquoise,
                foregroundColor: OceanColors.deepOcean,
                minimumSize: const Size(double.infinity, 50),
              ),
              icon: const Icon(Icons.arrow_forward_rounded),
              label: Text('Next: ${nextMission['title']}'),
            ),
          ),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _startActiveMission(allQuestions),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 48),
                ),
                icon: const Icon(Icons.replay),
                label: const Text('Replay'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: () => setState(() => _stage = _QuestViewStage.map),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 48),
                ),
                icon: const Icon(Icons.map_outlined),
                label: const Text('Ocean Map'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _hudPill(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: OceanColors.deepOcean.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: OceanColors.aqua.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: OceanColors.aqua),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: OceanColors.foamWhite,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _choicePill({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: OceanColors.turquoise.withValues(alpha: 0.22),
      side: BorderSide(
        color: selected ? OceanColors.turquoise : OceanColors.borderLight,
      ),
      onSelected: (_) => onTap(),
    );
  }

  Widget _ruleRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 125,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                color: OceanColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
