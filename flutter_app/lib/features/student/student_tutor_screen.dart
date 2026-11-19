import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/firestore_service.dart';
import 'pyq_archive_loader.dart';
import 'ssc_master_curriculum.dart';
import 'student_i18n.dart';

class _TutorMessage {
  final String id;
  final bool isUser;
  final String text;
  final bool isError;

  const _TutorMessage({
    required this.id,
    required this.isUser,
    required this.text,
    this.isError = false,
  });
}

class StudentTutorScreen extends StatefulWidget {
  final String? uid;
  final FirestoreService firestoreService;
  final String initialLanguage;
  final String? initialPrompt;
  final String? contextTopic;
  final String? initialSubject;
  final String? initialMode;
  final VoidCallback onGoHome;

  const StudentTutorScreen({
    super.key,
    this.uid,
    required this.firestoreService,
    required this.initialLanguage,
    required this.onGoHome,
    this.initialPrompt,
    this.contextTopic,
    this.initialSubject,
    this.initialMode,
  });

  @override
  State<StudentTutorScreen> createState() => _StudentTutorScreenState();
}

class _StudentTutorScreenState extends State<StudentTutorScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  late String _language;
  late String _subject;
  late String _topicTitle;
  late String _mode;
  String _difficultyLevel = 'Level 1: Easy';
  bool _sending = false;
  bool _loadingHistory = true;
  String? _lastFailedPrompt;

  final List<_TutorMessage> _messages = [];
  List<Map<String, dynamic>> _archivePool = const [];
  Map<String, dynamic>? _activeQuizQuestion;
  int? _activeQuizChoice;
  int _consecutiveRight = 0;

  String get _effectiveUid =>
      (widget.uid != null && widget.uid!.trim().isNotEmpty)
          ? widget.uid!.trim()
          : (FirebaseAuth.instance.currentUser?.uid ?? '');

  static const List<Map<String, String>> _modes = [
    {'id': 'teach', 'label': 'Teach Lesson'},
    {'id': 'practice', 'label': 'Practice Q'},
    {'id': 'pyq', 'label': 'PYQ Drill'},
    {'id': 'revision', 'label': 'Revision'},
    {'id': 'daily', 'label': 'Daily Study'},
    {'id': 'doubt', 'label': 'Quick Doubt'},
  ];

  static const List<String> _levels = [
    'Level 1: Easy',
    'Level 2: Medium',
    'Level 3: Exam Level',
  ];

  @override
  void initState() {
    super.initState();
    _language = (widget.initialLanguage == 'ml' ||
            widget.initialLanguage == 'hi' ||
            widget.initialLanguage == 'ta' ||
            widget.initialLanguage == 'manglish')
        ? widget.initialLanguage
        : 'manglish';
    _subject = (widget.initialSubject != null &&
            sscMasterSubjects.any((s) => s.id == widget.initialSubject))
        ? widget.initialSubject!
        : 'quant';
    _mode = (widget.initialMode != null &&
            _modes.any((m) => m['id'] == widget.initialMode))
        ? widget.initialMode!
        : 'teach';

    final topics = getSyllabusTopicsForSubject(_subject);
    if (widget.contextTopic != null && widget.contextTopic!.trim().isNotEmpty) {
      _topicTitle = widget.contextTopic!.trim();
    } else if (topics.isNotEmpty) {
      _topicTitle = topics.first.title;
    } else {
      _topicTitle = 'Percentage';
    }

    _initializeData();
  }

  Future<void> _initializeData() async {
    PyqArchiveLoader.loadBundledPastPapers().then((list) {
      if (mounted) setState(() => _archivePool = list);
    });

    final uid = _effectiveUid;
    List<Map<String, dynamic>> history = const [];
    if (uid.isNotEmpty) {
      history = await widget.firestoreService.loadAiTutorHistory(uid);
    }

    if (!mounted) return;
    setState(() {
      _loadingHistory = false;
      if (history.isNotEmpty) {
        _messages.addAll(
          history.map(
            (m) => _TutorMessage(
              id: (m['messageId'] ?? 'msg').toString(),
              isUser: m['role'] == 'user',
              text: (m['message'] ?? '').toString(),
            ),
          ),
        );
      } else {
        _messages.add(
          _TutorMessage(
            id: 'welcome',
            isUser: false,
            text: _language == 'manglish'
                ? manglishWelcomeGreeting
                : 'Hi! I am your Examora SSC CGL Personal AI Teacher. Pick a Subject and Topic above—I will teach the concept simply, show a step-by-step worked example, quiz you one question at a time, and analyse any mistakes.',
          ),
        );
      }
    });
    _scrollToBottom();

    if (widget.initialPrompt != null && widget.initialPrompt!.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _sendMessage(widget.initialPrompt!);
      });
    }
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _selectSubject(String nextSubject) {
    final topics = getSyllabusTopicsForSubject(nextSubject);
    setState(() {
      _subject = nextSubject;
      _activeQuizQuestion = null;
      _activeQuizChoice = null;
      if (topics.isNotEmpty) {
        _topicTitle = topics.first.title;
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final clean = text.trim();
    if (clean.isEmpty || _sending) return;

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final userMsgId = 'u_${DateTime.now().millisecondsSinceEpoch}';
    final uid = _effectiveUid;

    setState(() {
      _messages.add(_TutorMessage(id: userMsgId, isUser: true, text: clean));
      _sending = true;
      _lastFailedPrompt = null;
      _inputCtrl.clear();
    });
    _scrollToBottom();

    if (uid.isNotEmpty) {
      widget.firestoreService.saveAiTutorMessage(
        uid: uid,
        messageId: userMsgId,
        role: 'user',
        message: clean,
        language: _language,
        timestamp: nowIso,
      );
    }

    final recentHistory = _messages
        .where((m) => !m.isError)
        .toList()
        .reversed
        .take(6)
        .toList()
        .reversed
        .map((m) => {
              'role': m.isUser ? 'user' : 'assistant',
              'message': m.text,
            })
        .toList();

    try {
      final reply = await widget.firestoreService.askAiTutor(
        message: clean,
        language: _language,
        contextTopic: _topicTitle,
        subject: _subject,
        mode: _mode,
        difficultyLevel: _difficultyLevel,
        systemPrompt: sscPersonalTeacherSystemPrompt,
        history: recentHistory,
      );
      final botMsgId = 'a_${DateTime.now().millisecondsSinceEpoch}';
      final botIso = DateTime.now().toUtc().toIso8601String();
      if (mounted) {
        setState(() {
          _messages.add(_TutorMessage(id: botMsgId, isUser: false, text: reply));
          _sending = false;
        });
        _scrollToBottom();
      }
      if (uid.isNotEmpty) {
        widget.firestoreService.saveAiTutorMessage(
          uid: uid,
          messageId: botMsgId,
          role: 'assistant',
          message: reply,
          language: _language,
          timestamp: botIso,
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _lastFailedPrompt = clean;
          _messages.add(
            _TutorMessage(
              id: 'err_${DateTime.now().millisecondsSinceEpoch}',
              isUser: false,
              text:
                  'Unable to reach the AI Personal Teacher right now. Please tap Retry.',
              isError: true,
            ),
          );
          _sending = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _launchInteractiveQuickCheck() {
    if (_archivePool.isEmpty) {
      _triggerGuidedStep('practice');
      return;
    }
    final matching = _archivePool.where((q) {
      final subMatch = (q['subject'] ?? '').toString() == _subject;
      final topicStr = (q['topic'] ?? '').toString().toLowerCase();
      final topicMatch = topicStr.contains(_topicTitle.toLowerCase()) ||
          _topicTitle.toLowerCase().contains(topicStr);
      return subMatch && topicMatch;
    }).toList();

    final fallbackSub = _archivePool
        .where((q) => (q['subject'] ?? '').toString() == _subject)
        .toList();

    final candidates = matching.isNotEmpty ? matching : fallbackSub;
    if (candidates.isEmpty) {
      _triggerGuidedStep('practice');
      return;
    }
    final nextQ = candidates[DateTime.now().second % candidates.length];
    setState(() {
      _activeQuizQuestion = nextQ;
      _activeQuizChoice = null;
    });
  }

  Future<void> _submitQuickCheckChoice(int chosen) async {
    final q = _activeQuizQuestion;
    if (q == null || _activeQuizChoice != null) return;
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;
    final isCorrect = chosen == expected;
    final opts = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final uid = _effectiveUid;

    setState(() {
      _activeQuizChoice = chosen;
      if (isCorrect) {
        _consecutiveRight++;
        if (_consecutiveRight >= 2) {
          final idx = _levels.indexOf(_difficultyLevel);
          if (idx >= 0 && idx < _levels.length - 1) {
            _difficultyLevel = _levels[idx + 1];
            _consecutiveRight = 0;
          }
        }
      } else {
        _consecutiveRight = 0;
      }
    });

    if (uid.isNotEmpty) {
      widget.firestoreService.recordPracticeAttempt(
        uid: uid,
        subject: _subject,
        isCorrect: isCorrect,
      );
      widget.firestoreService.recordTopicMastery(
        uid: uid,
        topicTitle: _topicTitle,
        subject: _subject,
        masteryLevel: _difficultyLevel,
        isCorrectAttempt: isCorrect,
      );
      if (!isCorrect && (q['id'] ?? '').toString().isNotEmpty) {
        widget.firestoreService.addWrongQuestionsToRevision(
          uid: uid,
          wrongIds: [q['id'].toString()],
        );
      }
    }

    if (!isCorrect) {
      setState(() => _mode = 'revision');
      await _sendMessage(
        'I answered option ${String.fromCharCode(65 + chosen)} ("${opts[chosen]}") for this $_topicTitle question, but the right answer is option ${String.fromCharCode(65 + expected)} ("${opts[expected]}").\nQuestion: ${q['questionEn']}\nExplain clearly WHY my choice is wrong, re-teach the core rule simply, and give me a quick memory tip.',
      );
    }
  }

  void _triggerGuidedStep(String stepType) {
    final isManglish = _language == 'manglish';
    switch (stepType) {
      case 'lesson':
        setState(() => _mode = 'teach');
        _sendMessage(
          isManglish
              ? 'Teach me "$_topicTitle" (${StudentStrings.subjectTitle(_subject)}) in simple Manglish: Easy Explanation, Formula, 1 Worked Example step-by-step, Exam Shortcut + when NOT to use, Common Mistake, and 1 quick check prompt.'
              : 'Teach me "$_topicTitle" (${StudentStrings.subjectTitle(_subject)}) step-by-step at $_difficultyLevel: Easy Explanation, Formula, Worked Example, Exam Shortcut + When NOT to use, Common Mistake, and 1 quick check.',
        );
        break;
      case 'practice':
        setState(() => _mode = 'practice');
        _sendMessage(
          'Give me ONE "$_topicTitle" practice question at $_difficultyLevel with 4 options (A, B, C, D). Mark clearly if it is AUTHENTIC_PYQ or GENERATED_PRACTICE. Wait for my answer before revealing the solution.',
        );
        break;
      case 'hint':
        _sendMessage(
          'Give me Hint 1 (just the starting formula or clue without giving away the answer) for "$_topicTitle".',
        );
        break;
      case 'mistake':
        _sendMessage(
          'Analyse common mistakes and distractor traps students fall into on "$_topicTitle" ($_difficultyLevel), plus a 1-line memory trick so I avoid them.',
        );
        break;
      case 'next_level':
        final currentIdx = _levels.indexOf(_difficultyLevel);
        final nextIdx = (currentIdx + 1).clamp(0, _levels.length - 1);
        setState(() {
          _difficultyLevel = _levels[nextIdx];
          _mode = 'practice';
        });
        _sendMessage(
          'Move to $_difficultyLevel for "$_topicTitle" and give me 1 new SSC-pattern question with 4 options.',
        );
        break;
    }
  }

  Future<void> _clearHistory() async {
    final uid = _effectiveUid;
    if (uid.isNotEmpty) {
      await widget.firestoreService.clearAiTutorHistory(uid);
    }
    if (!mounted) return;
    setState(() {
      _messages
        ..clear()
        ..add(
          _TutorMessage(
            id: 'welcome_reset',
            isUser: false,
            text: _language == 'manglish'
                ? manglishWelcomeGreeting
                : 'Chat cleared! Pick a Subject & Topic above to start a fresh SSC CGL lesson.',
          ),
        );
    });
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final subjectTopics = getSyllabusTopicsForSubject(_subject);
    final topicTitles = subjectTopics.map((t) => t.title).toList();
    if (!topicTitles.contains(_topicTitle)) {
      topicTitles.insert(0, _topicTitle);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'SSC AI Personal Teacher',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _language,
              items: sscTeachingLanguages
                  .map(
                    (lang) => DropdownMenuItem(
                      value: lang.code,
                      child: Text(
                        lang.label,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (val) {
                if (val != null) setState(() => _language = val);
              },
            ),
          ),
          IconButton(
            tooltip: 'Clear Chat History',
            onPressed: _clearHistory,
            icon: const Icon(Icons.delete_sweep_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
            child: OceanBackHomeBar(
              title: 'Style: ${StudentStrings.languageLabel(_language)}',
              onBack: () => Navigator.of(context).pop(),
              onHome: () {
                Navigator.of(context).pop();
                widget.onGoHome();
              },
            ),
          ),
          SizedBox(
            height: 38,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemBuilder: (_, idx) {
                final s = sscMasterSubjects[idx];
                final selected = _subject == s.id;
                return ChoiceChip(
                  label: Text(
                    s.shortTitle,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                  selected: selected,
                  onSelected: (_) => _selectSubject(s.id),
                );
              },
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemCount: sscMasterSubjects.length,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: OceanColors.pureWhite,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: OceanColors.borderLight),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _topicTitle,
                        items: topicTitles
                            .map(
                              (t) => DropdownMenuItem(
                                value: t,
                                child: Text(
                                  t,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _topicTitle = val);
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: OceanColors.pureWhite,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: OceanColors.borderLight),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _difficultyLevel,
                        items: _levels
                            .map(
                              (lvl) => DropdownMenuItem(
                                value: lvl,
                                child: Text(
                                  lvl,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _difficultyLevel = val);
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_subject == 'statistics')
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Note: Statistics (Paper II) applies only to Junior Statistical Officer (JSO) candidates.',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: OceanColors.oceanBlue,
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          SizedBox(
            height: 36,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              children: [
                ActionChip(
                  backgroundColor: OceanColors.turquoise.withValues(alpha: 0.16),
                  side: const BorderSide(color: OceanColors.seaGlass),
                  avatar: const Icon(Icons.menu_book_rounded, size: 15, color: OceanColors.oceanBlue),
                  label: const Text('Start Lesson + Example', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                  onPressed: () => _triggerGuidedStep('lesson'),
                ),
                const SizedBox(width: 8),
                ActionChip(
                  backgroundColor: OceanColors.emerald.withValues(alpha: 0.12),
                  side: const BorderSide(color: OceanColors.emerald),
                  avatar: const Icon(Icons.bolt_rounded, size: 15, color: OceanColors.emerald),
                  label: const Text('Interactive Check Q', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                  onPressed: _launchInteractiveQuickCheck,
                ),
                const SizedBox(width: 8),
                ActionChip(
                  backgroundColor: OceanColors.oceanBlue.withValues(alpha: 0.1),
                  side: const BorderSide(color: OceanColors.borderLight),
                  avatar: const Icon(Icons.quiz_outlined, size: 15, color: OceanColors.oceanBlue),
                  label: const Text('AI Practice Q', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                  onPressed: () => _triggerGuidedStep('practice'),
                ),
                const SizedBox(width: 8),
                ActionChip(
                  side: const BorderSide(color: OceanColors.borderLight),
                  label: const Text('Hint 1', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  onPressed: () => _triggerGuidedStep('hint'),
                ),
                const SizedBox(width: 8),
                ActionChip(
                  side: const BorderSide(color: OceanColors.borderLight),
                  label: const Text('Mistake Traps', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  onPressed: () => _triggerGuidedStep('mistake'),
                ),
                const SizedBox(width: 8),
                ActionChip(
                  side: const BorderSide(color: OceanColors.borderLight),
                  label: const Text('Next Level ->', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                  onPressed: () => _triggerGuidedStep('next_level'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: 32,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemBuilder: (_, idx) {
                final m = _modes[idx];
                final active = _mode == m['id'];
                return InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() => _mode = m['id']!),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? OceanColors.oceanNavy : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: active ? OceanColors.oceanNavy : OceanColors.borderLight,
                      ),
                    ),
                    child: Text(
                      m['label']!,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: active ? OceanColors.pureWhite : OceanColors.textMuted,
                      ),
                    ),
                  ),
                );
              },
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemCount: _modes.length,
            ),
          ),
          if (_activeQuizQuestion != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildInlineQuickCheckCard(),
            ),
          ],
          const SizedBox(height: 6),
          Expanded(
            child: _loadingHistory
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (_, idx) {
                      if (idx >= _messages.length) {
                        return const Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: OceanGlassCard(
                              padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: OceanColors.turquoise,
                                    ),
                                  ),
                                  SizedBox(width: 10),
                                  Text('Preparing simple explanation...'),
                                ],
                              ),
                            ),
                          ),
                        );
                      }

                      final m = _messages[idx];
                      return Align(
                        alignment:
                            m.isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 340),
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: m.isUser
                                ? OceanColors.oceanBlue
                                : (m.isError
                                    ? OceanColors.coralAccent.withValues(alpha: 0.15)
                                    : OceanColors.pureWhite),
                            borderRadius: BorderRadius.circular(16),
                            border: m.isUser
                                ? null
                                : Border.all(
                                    color: m.isError
                                        ? OceanColors.coralAccent
                                        : OceanColors.borderLight,
                                  ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.text,
                                style: TextStyle(
                                  color: m.isUser
                                      ? OceanColors.pureWhite
                                      : OceanColors.deepOcean,
                                  fontSize: 13.5,
                                  height: 1.45,
                                ),
                              ),
                              if (m.isError && _lastFailedPrompt != null) ...[
                                const SizedBox(height: 8),
                                OutlinedButton.icon(
                                  onPressed: () => _sendMessage(_lastFailedPrompt!),
                                  icon: const Icon(Icons.refresh, size: 16),
                                  label: const Text('Retry'),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      minLines: 1,
                      maxLines: 3,
                      textInputAction: TextInputAction.send,
                      onSubmitted: _sendMessage,
                      decoration: InputDecoration(
                        hintText: _language == 'manglish'
                            ? 'Ask doubt or type answer (A/B/C/D)...'
                            : 'Ask $_topicTitle doubt or type answer...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: _sending ? null : () => _sendMessage(_inputCtrl.text),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(52, 52),
                      padding: EdgeInsets.zero,
                    ),
                    child: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineQuickCheckCard() {
    final q = _activeQuizQuestion!;
    final opts = (q['optionsEn'] as List<dynamic>? ?? ['A', 'B', 'C', 'D'])
        .map((e) => e.toString())
        .toList();
    final expected = int.tryParse((q['correctIndex'] ?? 0).toString()) ?? 0;

    return OceanGlassCard(
      padding: const EdgeInsets.all(14),
      borderColor: OceanColors.turquoise.withValues(alpha: 0.45),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              OceanStatusBadge(
                icon: Icons.quiz_outlined,
                label: 'Quick Check · ${q['topic'] ?? _topicTitle}',
                color: OceanColors.oceanBlue,
              ),
              const Spacer(),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => setState(() => _activeQuizQuestion = null),
                icon: const Icon(Icons.close, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            (q['questionEn'] ?? '').toString(),
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: List.generate(opts.length, (i) {
              final chosen = _activeQuizChoice == i;
              final answered = _activeQuizChoice != null;
              final isCorrect = i == expected;
              Color? bg;
              if (answered && isCorrect) {
                bg = OceanColors.emerald.withValues(alpha: 0.18);
              } else if (answered && chosen && !isCorrect) {
                bg = OceanColors.coralAccent.withValues(alpha: 0.2);
              }
              return ActionChip(
                backgroundColor: bg,
                label: Text(
                  '${String.fromCharCode(65 + i)}. ${opts[i]}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                onPressed: answered ? null : () => _submitQuickCheckChoice(i),
              );
            }),
          ),
          if (_activeQuizChoice != null) ...[
            const SizedBox(height: 8),
            Text(
              _activeQuizChoice == expected
                  ? 'Correct! Streak: $_consecutiveRight (Auto-levels up after 2 consecutive right answers).'
                  : 'Wrong answer detected — asking AI Teacher below to explain why and re-teach!',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: _activeQuizChoice == expected
                    ? OceanColors.emerald
                    : OceanColors.coralAccent,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
