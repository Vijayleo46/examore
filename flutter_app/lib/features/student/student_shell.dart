import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/ocean_components.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../services/local_notification_service.dart';
import 'student_i18n.dart';
import 'student_mock_runner.dart';
import 'student_practice_tab.dart';
import 'student_tutor_screen.dart';
import 'ssc_master_curriculum.dart';
import 'pyq_archive_loader.dart';
import 'pyq_library_screen.dart';
import 'ocean_quest_data.dart';
import 'ocean_quest_screen.dart';
import 'future_predictor_screen.dart';

class StudentShell extends StatefulWidget {
  final AuthSessionState session;
  final AuthService authService;
  final FirestoreService firestoreService;
  final VoidCallback onSignedOut;

  const StudentShell({
    super.key,
    required this.session,
    required this.authService,
    required this.firestoreService,
    required this.onSignedOut,
  });

  @override
  State<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends State<StudentShell> {
  // Strictly 5 primary student navigation tabs: Home, Learn, Practice, Analytics, Profile
  int _tabIndex = 0;

  // Beginner tips dismissal state
  bool _showHomeTip = true;
  bool _showLearnTip = true;
  bool _showPracticeTip = true;

  // Local notification reminder preferences
  LocalNotificationPrefs _notifPrefs = const LocalNotificationPrefs();
  String _lastSyncSignature = '';

  String _selectedSubjectInLearn = 'all';

  @override
  void initState() {
    super.initState();
    _loadNotificationPrefs();
  }

  Future<void> _loadNotificationPrefs() async {
    final loaded = await LocalNotificationService.instance.loadPrefs();
    if (mounted) {
      setState(() => _notifPrefs = loaded);
    }
  }

  Future<void> _updateNotifPrefs(
    LocalNotificationPrefs next, {
    required int studiedMinutes,
    required int goalMinutes,
    required int streak,
  }) async {
    setState(() => _notifPrefs = next);
    await LocalNotificationService.instance.savePrefs(next);
    if (next.dailyReminder || next.streakAlerts) {
      await LocalNotificationService.instance.requestPermissions();
    }
    await LocalNotificationService.instance.syncGoalReminders(
      prefs: next,
      displayName: widget.session.displayName,
      username: widget.session.username,
      studiedMinutes: studiedMinutes,
      goalMinutes: goalMinutes,
      streak: streak,
    );
  }

  void _openTutor({
    required String language,
    String? prompt,
    String? topic,
    String? subject,
    String? mode,
  }) {
    final uid = widget.session.user?.uid ?? '';
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StudentTutorScreen(
          uid: uid.isEmpty ? null : uid,
          firestoreService: widget.firestoreService,
          initialLanguage: language,
          initialPrompt: prompt,
          contextTopic: topic,
          initialSubject: subject,
          initialMode: mode,
          onGoHome: () => setState(() => _tabIndex = 0),
        ),
      ),
    );
  }

  void _openPyqLibrary({
    required String uid,
    required String language,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PyqLibraryScreen(
          uid: uid,
          preferredLanguage: language,
          firestoreService: widget.firestoreService,
          onGoHome: () => setState(() => _tabIndex = 0),
        ),
      ),
    );
  }

  void _openOceanQuest({
    required String uid,
    required String language,
    String? initialMode,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OceanQuestScreen(
          uid: uid,
          preferredLanguage: language,
          firestoreService: widget.firestoreService,
          initialMode: initialMode,
          onGoHome: () => setState(() => _tabIndex = 0),
        ),
      ),
    );
  }

  void _openFuturePredictor({
    required String uid,
    required String language,
    required Map<String, dynamic> profile,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FuturePredictorScreen(
          uid: uid,
          preferredLanguage: language,
          userProfile: profile,
          firestoreService: widget.firestoreService,
          onGoHome: () => setState(() => _tabIndex = 0),
          onOpenPyqLibrary: () => _openPyqLibrary(uid: uid, language: language),
        ),
      ),
    );
  }

  void _launchMockTest({
    required String uid,
    required Map<String, dynamic> mockTest,
    required String language,
    List<Map<String, dynamic>>? initialQuestions,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MockTestRunnerScreen(
          uid: uid,
          mockTest: mockTest,
          preferredLanguage: language,
          firestoreService: widget.firestoreService,
          initialQuestions: initialQuestions,
          onGoHome: () => setState(() => _tabIndex = 0),
        ),
      ),
    );
  }

  void _openVideoLesson({
    required String uid,
    required Map<String, dynamic> lesson,
    required bool isCompleted,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: OceanColors.foamWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => VideoLessonSheet(
        uid: uid,
        lesson: lesson,
        isCompleted: isCompleted,
        firestoreService: widget.firestoreService,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final uid = widget.session.user?.uid ?? '';

    return StreamBuilder(
      stream: widget.firestoreService.streamUserProfile(uid),
      builder: (context, profileSnap) {
        final profile = profileSnap.data?.data() ?? <String, dynamic>{};
        final language = (profile['preferredLanguage'] ?? 'en').toString();
        final streak = int.tryParse((profile['streak'] ?? 1).toString()) ?? 1;
        final mocks =
            int.tryParse((profile['mockTestsCompleted'] ?? 0).toString()) ?? 0;
        final goalMins =
            int.tryParse((profile['dailyGoalMinutes'] ?? 60).toString()) ?? 60;
        final completedCount =
            (profile['completedLessons'] as List<dynamic>? ?? []).length;
        final studiedTodayMins =
            ((completedCount * 15) + (mocks * 20)).clamp(10, goalMins);

        final sig =
            '${_notifPrefs.dailyReminder}:${_notifPrefs.streakAlerts}:${_notifPrefs.reminderHour}:${_notifPrefs.reminderMinute}:$goalMins:$studiedTodayMins:$streak';
        if (sig != _lastSyncSignature) {
          _lastSyncSignature = sig;
          LocalNotificationService.instance.syncGoalReminders(
            prefs: _notifPrefs,
            displayName: widget.session.displayName,
            username: widget.session.username,
            studiedMinutes: studiedTodayMins,
            goalMinutes: goalMins,
            streak: streak,
          );
        }

        final pages = [
          _StudentHomeTab(
            session: widget.session,
            profile: profile,
            language: language,
            reminderEnabled: _notifPrefs.dailyReminder,
            reminderHour: _notifPrefs.reminderHour,
            reminderMinute: _notifPrefs.reminderMinute,
            firestoreService: widget.firestoreService,
            showTip: _showHomeTip,
            onDismissTip: () => setState(() => _showHomeTip = false),
            onContinueLearning: () => setState(() => _tabIndex = 1),
            onQuickPractice: () => setState(() => _tabIndex = 2),
            onOpenPyqLibrary: () =>
                _openPyqLibrary(uid: uid, language: language),
            onOpenOceanQuest: () =>
                _openOceanQuest(uid: uid, language: language),
            onOpenFuturePredictor: () => _openFuturePredictor(
              uid: uid,
              language: language,
              profile: profile,
            ),
            onOpenProfile: () => setState(() => _tabIndex = 4),
            onOpenTutor: (prompt, topic) =>
                _openTutor(language: language, prompt: prompt, topic: topic),
            onOpenLesson: (lesson, done) =>
                _openVideoLesson(uid: uid, lesson: lesson, isCompleted: done),
            onLaunchMock: (mock) =>
                _launchMockTest(uid: uid, mockTest: mock, language: language),
          ),
          _StudentLearnTab(
            uid: uid,
            profile: profile,
            language: language,
            firestoreService: widget.firestoreService,
            selectedSubject: _selectedSubjectInLearn,
            onSubjectChanged: (s) => setState(() => _selectedSubjectInLearn = s),
            showTip: _showLearnTip,
            onDismissTip: () => setState(() => _showLearnTip = false),
            onOpenLesson: (lesson, done) =>
                _openVideoLesson(uid: uid, lesson: lesson, isCompleted: done),
            onLaunchMock: (mock, {List<Map<String, dynamic>>? initialQuestions}) =>
                _launchMockTest(
              uid: uid,
              mockTest: mock,
              language: language,
              initialQuestions: initialQuestions,
            ),
            onTeachTopic: (subject, topic) => _openTutor(
              language: language,
              subject: subject,
              topic: topic,
              mode: 'teach',
            ),
          ),
          StudentPracticeTab(
            uid: uid,
            preferredLanguage: language,
            firestoreService: widget.firestoreService,
            showTip: _showPracticeTip,
            onDismissTip: () => setState(() => _showPracticeTip = false),
            onGoHome: () => setState(() => _tabIndex = 0),
          ),
          _StudentAnalyticsTab(
            uid: uid,
            profile: profile,
            firestoreService: widget.firestoreService,
          ),
          _StudentProfileTab(
            uid: uid,
            session: widget.session,
            profile: profile,
            language: language,
            notifPrefs: _notifPrefs,
            studiedTodayMins: studiedTodayMins,
            onUpdatePrefs: (next) => _updateNotifPrefs(
              next,
              studiedMinutes: studiedTodayMins,
              goalMinutes: goalMins,
              streak: streak,
            ),
            firestoreService: widget.firestoreService,
            onOpenTutor: () => _openTutor(language: language),
            onSignOut: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Sign out of Examora?'),
                  content: const Text(
                    'Your progress is safely saved. Sign back in anytime to continue.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: const Text('Cancel'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      child: const Text('Sign Out'),
                    ),
                  ],
                ),
              );
              if (ok == true) {
                await widget.authService.signOut();
                widget.onSignedOut();
              }
            },
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
                  'Examora',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
            actions: [
              TextButton.icon(
                onPressed: () =>
                    _openPyqLibrary(uid: uid, language: language),
                icon: const Icon(
                  Icons.history_edu_outlined,
                  size: 18,
                  color: OceanColors.oceanBlue,
                ),
                label: const Text(
                  'PYQs',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: OceanColors.oceanBlue,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () => _openTutor(language: language),
                icon: const Icon(
                  Icons.auto_awesome_outlined,
                  size: 18,
                  color: OceanColors.oceanBlue,
                ),
                label: const Text(
                  'Ask AI',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: OceanColors.oceanBlue,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 92),
                    child: Text(
                      widget.session.username.isNotEmpty
                          ? '@${widget.session.username}'
                          : widget.session.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: OceanColors.textMuted,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          drawer: Drawer(
            backgroundColor: OceanColors.foamWhite,
            child: SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  OceanWaveHeaderCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Examora',
                          style: TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.session.username.isNotEmpty
                              ? '@${widget.session.username}'
                              : widget.session.displayName,
                          style: const TextStyle(
                            color: OceanColors.aqua,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: const Icon(Icons.waves_rounded,
                        color: OceanColors.turquoise),
                    title: const Text(
                      'Ocean Quest Game',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: const Text('9 Underwater Zones & Boss Challenges'),
                    onTap: () {
                      Navigator.of(context).pop();
                      _openOceanQuest(uid: uid, language: language);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.history_edu_outlined,
                        color: OceanColors.oceanBlue),
                    title: const Text(
                      'Previous Year Questions',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: const Text('2016–2026 Tier 1 & Tier 2 Library'),
                    onTap: () {
                      Navigator.of(context).pop();
                      _openPyqLibrary(uid: uid, language: language);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.radar_rounded,
                        color: OceanColors.turquoise),
                    title: const Text(
                      'Future Exam Predictor',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: const Text('2026–2028 Trend & Topic Radar'),
                    onTap: () {
                      Navigator.of(context).pop();
                      _openFuturePredictor(
                        uid: uid,
                        language: language,
                        profile: profile,
                      );
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.home_outlined),
                    title: const Text('Home Dashboard'),
                    onTap: () {
                      Navigator.of(context).pop();
                      setState(() => _tabIndex = 0);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.menu_book_outlined),
                    title: const Text('Learn & Mock Exams'),
                    onTap: () {
                      Navigator.of(context).pop();
                      setState(() => _tabIndex = 1);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.quiz_outlined),
                    title: const Text('Practice & Sprints'),
                    onTap: () {
                      Navigator.of(context).pop();
                      setState(() => _tabIndex = 2);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.insights_outlined),
                    title: const Text('Analytics & Leaderboard'),
                    onTap: () {
                      Navigator.of(context).pop();
                      setState(() => _tabIndex = 3);
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.auto_awesome_outlined),
                    title: const Text('Examora AI Mentor'),
                    onTap: () {
                      Navigator.of(context).pop();
                      _openTutor(language: language);
                    },
                  ),
                ],
              ),
            ),
          ),
          body: pages[_tabIndex],
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tabIndex,
            onDestinationSelected: (idx) => setState(() => _tabIndex = idx),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.menu_book_outlined),
                selectedIcon: Icon(Icons.menu_book),
                label: 'Learn',
              ),
              NavigationDestination(
                icon: Icon(Icons.quiz_outlined),
                selectedIcon: Icon(Icons.quiz),
                label: 'Practice',
              ),
              NavigationDestination(
                icon: Icon(Icons.insights_outlined),
                selectedIcon: Icon(Icons.insights),
                label: 'Analytics',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StudentHomeTab extends StatelessWidget {
  final AuthSessionState session;
  final Map<String, dynamic> profile;
  final String language;
  final bool reminderEnabled;
  final int reminderHour;
  final int reminderMinute;
  final FirestoreService firestoreService;
  final bool showTip;
  final VoidCallback onDismissTip;
  final VoidCallback onContinueLearning;
  final VoidCallback onQuickPractice;
  final VoidCallback onOpenPyqLibrary;
  final VoidCallback onOpenOceanQuest;
  final VoidCallback onOpenFuturePredictor;
  final VoidCallback onOpenProfile;
  final void Function(String? prompt, String? topic) onOpenTutor;
  final void Function(Map<String, dynamic> lesson, bool isDone) onOpenLesson;
  final void Function(Map<String, dynamic> mockTest) onLaunchMock;

  const _StudentHomeTab({
    required this.session,
    required this.profile,
    required this.language,
    required this.reminderEnabled,
    required this.reminderHour,
    required this.reminderMinute,
    required this.firestoreService,
    required this.showTip,
    required this.onDismissTip,
    required this.onContinueLearning,
    required this.onQuickPractice,
    required this.onOpenPyqLibrary,
    required this.onOpenOceanQuest,
    required this.onOpenFuturePredictor,
    required this.onOpenProfile,
    required this.onOpenTutor,
    required this.onOpenLesson,
    required this.onLaunchMock,
  });

  @override
  Widget build(BuildContext context) {
    final xp = int.tryParse((profile['xp'] ?? 0).toString()) ?? 0;
    final streak = int.tryParse((profile['streak'] ?? 1).toString()) ?? 1;
    final mocks =
        int.tryParse((profile['mockTestsCompleted'] ?? 0).toString()) ?? 0;
    final goalMins =
        int.tryParse((profile['dailyGoalMinutes'] ?? 60).toString()) ?? 60;
    final completedList = (profile['completedLessons'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toSet();
    final studiedTodayMins = ((completedList.length * 15) + (mocks * 20))
        .clamp(10, goalMins);
    final goalPct = (studiedTodayMins / goalMins).clamp(0.0, 1.0);

    final who = session.username.isNotEmpty
        ? '@${session.username}'
        : session.displayName;
    final targetPost =
        (profile['targetPost'] ?? 'Income Tax Inspector (CBDT)').toString();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (showTip)
          OceanFirstTimeTip(
            title: 'Welcome to Examora!',
            message:
                'Tap "Continue Learning" for guided video lessons, or "Quick Practice" to solve SSC CGL questions step by step.',
            onDismiss: onDismissTip,
          ),
        OceanWaveHeaderCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${StudentStrings.greeting(language)} $who',
                          style: const TextStyle(
                            color: OceanColors.seaGlass,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          targetPost,
                          style: const TextStyle(
                            color: OceanColors.foamWhite,
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Today’s Goal: $studiedTodayMins / $goalMins min · ${streak}d Streak · $xp XP',
                          style: const TextStyle(
                            color: OceanColors.aqua,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: onOpenProfile,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.notifications_active_outlined,
                                size: 14,
                                color: OceanColors.seaGlass,
                              ),
                              const SizedBox(width: 5),
                              Flexible(
                                child: Text(
                                  reminderEnabled
                                      ? 'Study Tide reminder at ${TimeOfDay(hour: reminderHour, minute: reminderMinute).format(context)}'
                                      : 'Study Tide reminders paused',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: OceanColors.seaGlass,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  OceanProgressRing(
                    progress: goalPct,
                    centerLabel: '${(goalPct * 100).round()}%',
                    subtitle: 'Goal',
                    size: 78,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              LayoutBuilder(
                builder: (context, constraints) {
                  final compact = constraints.maxWidth < 340;
                  final continueBtn = FilledButton.icon(
                    onPressed: onContinueLearning,
                    style: FilledButton.styleFrom(
                      backgroundColor: OceanColors.turquoise,
                      foregroundColor: OceanColors.deepOcean,
                    ),
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: Text(
                      StudentStrings.continueLearning(language),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                  final practiceBtn = OutlinedButton.icon(
                    onPressed: onQuickPractice,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: OceanColors.foamWhite,
                      side: const BorderSide(color: OceanColors.seaGlass),
                    ),
                    icon: const Icon(Icons.flash_on_outlined),
                    label: Text(
                      StudentStrings.quickPractice(language),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                  if (compact) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        continueBtn,
                        const SizedBox(height: 10),
                        practiceBtn,
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: continueBtn),
                      const SizedBox(width: 10),
                      Expanded(child: practiceBtn),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Ocean Quest Gamification Adventure Card
        OceanGlassCard(
          onTap: onOpenOceanQuest,
          borderColor: OceanColors.oceanBlue,
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [OceanColors.deepOcean, OceanColors.turquoise],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.explore_rounded,
                  color: OceanColors.foamWhite,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ocean Quest — SSC CGL Adventure',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Explore 9 underwater zones from Coral Bay to Ocean Champion Arena. Earn XP, Crystals & Badges!',
                      style: TextStyle(
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
        const SizedBox(height: 12),

        // Dedicated 1-tap Previous Year Question Library (2016-2026)
        OceanGlassCard(
          onTap: onOpenPyqLibrary,
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
                  Icons.history_edu_rounded,
                  color: OceanColors.pureWhite,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Previous Year Questions (2016–2026)',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Browse 11 years of SSC CGL Tier 1 & Tier 2 Q&A, step-by-step solutions, shortcuts & revision lists.',
                      style: TextStyle(
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
        const SizedBox(height: 12),

        // 1-Tap Future Exam Predictor Card
        OceanGlassCard(
          onTap: onOpenFuturePredictor,
          borderColor: OceanColors.oceanBlue,
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [OceanColors.deepOcean, OceanColors.oceanBlue],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.radar_rounded,
                  color: OceanColors.aqua,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Future Exam Predictor (2026–2028)',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      '2016–2026 PYQ trend radar, AI expected practice drills, predicted mocks & roadmap.',
                      style: TextStyle(
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
        const SizedBox(height: 18),

        // Upcoming Mock Test
        StreamBuilder(
          stream: firestoreService.streamPublishedMockTests(),
          builder: (context, snap) {
            final mocksList = snap.data?.docs ?? [];
            if (mocksList.isEmpty) return const SizedBox.shrink();
            final first = {'id': mocksList.first.id, ...mocksList.first.data()};
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Upcoming Mock Test',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                OceanGlassCard(
                  onTap: () => onLaunchMock(first),
                  child: Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: OceanColors.oceanBlue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.assignment_turned_in_outlined,
                          color: OceanColors.oceanBlue,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (first['title'] ?? 'SSC CGL Tier 1 Mock').toString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${first['category'] ?? 'Tier 1'} · ${first['durationMinutes'] ?? 15} mins · ${first['totalMarks'] ?? 50} marks',
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
                const SizedBox(height: 18),
              ],
            );
          },
        ),

        // Recently Studied Lessons
        StreamBuilder(
          stream: firestoreService.streamPublishedVideos(),
          builder: (context, snap) {
            final videos = snap.data?.docs ?? [];
            if (videos.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Recently Studied Lessons',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                ...videos.take(3).map((doc) {
                  final v = {'id': doc.id, ...doc.data()};
                  final done = completedList.contains(doc.id);
                  final mins = ((int.tryParse(
                                  (v['durationSec'] ?? 600).toString()) ??
                              600) /
                          60)
                      .ceil();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: OceanGlassCard(
                      onTap: () => onOpenLesson(v, done),
                      child: Row(
                        children: [
                          Icon(
                            done
                                ? Icons.check_circle
                                : Icons.play_circle_outline,
                            size: 30,
                            color: done
                                ? OceanColors.emerald
                                : OceanColors.turquoise,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (v['title'] ?? 'Lesson').toString(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '${StudentStrings.subjectTitle((v['subject'] ?? '').toString())} · $mins min',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: OceanColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          OceanStatusBadge(
                            icon: done ? Icons.task_alt : Icons.schedule,
                            label: done ? 'Completed' : 'Resume',
                            color: done
                                ? OceanColors.emerald
                                : OceanColors.oceanBlue,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 8),
              ],
            );
          },
        ),

        // Recommended Topics + AI Mentor shortcut
        const Text(
          'Recommended Topics',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final cols = constraints.maxWidth >= 700 ? 3 : 2;
            final cardWidth = (constraints.maxWidth - (10 * (cols - 1))) / cols;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: sscCglSubjects.map((s) {
                return SizedBox(
                  width: cardWidth,
                  child: OceanGlassCard(
                    padding: const EdgeInsets.all(14),
                    onTap: onQuickPractice,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(s.icon, color: s.accent, size: 22),
                        const SizedBox(height: 8),
                        Text(
                          s.shortTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          s.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: OceanColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 16),
        OceanGlassCard(
          onTap: () => onOpenTutor(null, null),
          borderColor: OceanColors.turquoise,
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: OceanColors.turquoise.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: OceanColors.oceanBlue,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Stuck on a Maths or Grammar concept?',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    Text(
                      'Ask Examora AI Mentor in English, Malayalam, Hindi, or Tamil.',
                      style: TextStyle(fontSize: 12, color: OceanColors.textMuted),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: OceanColors.oceanBlue),
            ],
          ),
        ),
      ],
    );
  }
}

class _StudentLearnTab extends StatelessWidget {
  final String uid;
  final Map<String, dynamic> profile;
  final String language;
  final FirestoreService firestoreService;
  final String selectedSubject;
  final ValueChanged<String> onSubjectChanged;
  final bool showTip;
  final VoidCallback onDismissTip;
  final void Function(Map<String, dynamic> lesson, bool isDone) onOpenLesson;
  final void Function(
    Map<String, dynamic> mockTest, {
    List<Map<String, dynamic>>? initialQuestions,
  }) onLaunchMock;
  final void Function(String subject, String topic) onTeachTopic;

  const _StudentLearnTab({
    required this.uid,
    required this.profile,
    required this.language,
    required this.firestoreService,
    required this.selectedSubject,
    required this.onSubjectChanged,
    required this.showTip,
    required this.onDismissTip,
    required this.onOpenLesson,
    required this.onLaunchMock,
    required this.onTeachTopic,
  });

  Future<void> _launchQuickOfflineMock(
    BuildContext context, {
    required String tier,
    required int questionCount,
    required int durationMinutes,
    String subject = 'all',
  }) async {
    final bundled = await PyqArchiveLoader.loadBundledPastPapers();
    final picked = PyqArchiveLoader.buildMockSet(
      pool: bundled,
      tier: tier,
      subject: subject,
      limit: questionCount,
    );
    if (picked.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No matching archive questions found for this preset.'),
          ),
        );
      }
      return;
    }
    onLaunchMock(
      {
        'id': 'offline_${tier.toLowerCase().replaceAll(' ', '')}_${subject}_${DateTime.now().millisecondsSinceEpoch}',
        'testId': 'offline_${tier.toLowerCase().replaceAll(' ', '')}_$subject',
        'title': subject == 'all'
            ? 'SSC CGL $tier Practice Mock (${picked.length} Qs)'
            : '${StudentStrings.subjectTitle(subject)} $tier Mock (${picked.length} Qs)',
        'category': tier,
        'durationMinutes': durationMinutes,
        'totalMarks': picked.length * (tier == 'Tier 2' ? 3 : 2),
        'negativeMarking': tier == 'Tier 2' ? 1.0 : 0.5,
      },
      initialQuestions: picked,
    );
  }

  @override
  Widget build(BuildContext context) {
    final completedList = (profile['completedLessons'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toSet();
    final syllabusSubject = selectedSubject == 'all' ? 'quant' : selectedSubject;
    final syllabusTopics = getSyllabusTopicsForSubject(syllabusSubject);

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          if (showTip)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: OceanFirstTimeTip(
                title: 'Beginner-friendly lessons',
                message:
                    'Pick a subject below to view short lessons, take Mock Tests, or explore the full Tier 1 & Tier 2 Syllabus with AI Teacher coaching.',
                onDismiss: onDismissTip,
              ),
            ),
          const TabBar(
            labelColor: OceanColors.oceanBlue,
            indicatorColor: OceanColors.turquoise,
            tabs: [
              Tab(text: 'Video Lessons'),
              Tab(text: 'Mock Tests'),
              Tab(text: 'Syllabus & Pattern'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                Column(
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                      child: Row(
                        children: [
                          ChoiceChip(
                            label: const Text('All'),
                            selected: selectedSubject == 'all',
                            onSelected: (_) => onSubjectChanged('all'),
                          ),
                          ...sscCglSubjects.map(
                            (s) => Padding(
                              padding: const EdgeInsets.only(left: 8),
                              child: ChoiceChip(
                                label: Text(s.shortTitle),
                                selected: selectedSubject == s.id,
                                onSelected: (_) => onSubjectChanged(s.id),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: StreamBuilder(
                        stream: firestoreService.streamPublishedVideos(),
                        builder: (context, snap) {
                          if (!snap.hasData) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          final docs = snap.data!.docs.where((d) {
                            if (selectedSubject == 'all') return true;
                            return (d.data()['subject'] ?? '') == selectedSubject;
                          }).toList();

                          if (docs.isEmpty) {
                            return const Center(
                              child: Text('No published lessons for this subject yet.'),
                            );
                          }

                          return ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: docs.length,
                            itemBuilder: (_, i) {
                              final v = {'id': docs[i].id, ...docs[i].data()};
                              final done = completedList.contains(docs[i].id);
                              final mins = ((int.tryParse(
                                              (v['durationSec'] ?? 600)
                                                  .toString()) ??
                                          600) /
                                      60)
                                  .ceil();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: OceanGlassCard(
                                  onTap: () => onOpenLesson(v, done),
                                  child: Row(
                                    children: [
                                      Icon(
                                        done
                                            ? Icons.check_circle
                                            : Icons.play_circle_filled_rounded,
                                        color: done
                                            ? OceanColors.emerald
                                            : OceanColors.oceanBlue,
                                        size: 32,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              (v['title'] ?? 'Lesson').toString(),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${StudentStrings.subjectTitle((v['subject'] ?? '').toString())} · ${v['topic'] ?? ''} · $mins min',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: OceanColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      OceanStatusBadge(
                                        icon: done
                                            ? Icons.check_circle_outline
                                            : Icons.pending_outlined,
                                        label: done ? 'Completed' : 'Pending',
                                        color: done
                                            ? OceanColors.emerald
                                            : OceanColors.textMuted,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    OceanWaveHeaderCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Instant PYQ Mock Generator (Offline Ready)',
                            style: TextStyle(
                              color: OceanColors.foamWhite,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Balanced multi-subject mocks built from verified 2016–2026 SSC CGL PYQs with +2 / -0.5 scoring.',
                            style: TextStyle(
                              color: OceanColors.seaGlass,
                              fontSize: 12.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              FilledButton.icon(
                                onPressed: () => _launchQuickOfflineMock(
                                  context,
                                  tier: 'Tier 1',
                                  questionCount: 25,
                                  durationMinutes: 15,
                                ),
                                style: FilledButton.styleFrom(
                                  backgroundColor: OceanColors.turquoise,
                                  foregroundColor: OceanColors.deepOcean,
                                ),
                                icon: const Icon(Icons.timer_outlined, size: 17),
                                label: const Text('Tier 1 Sprint (25Q · 15m)'),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => _launchQuickOfflineMock(
                                  context,
                                  tier: 'Tier 2',
                                  questionCount: 30,
                                  durationMinutes: 25,
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: OceanColors.foamWhite,
                                  side: const BorderSide(color: OceanColors.seaGlass),
                                ),
                                icon: const Icon(Icons.military_tech_outlined, size: 17),
                                label: const Text('Tier 2 Paper (30Q · 25m)'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    StreamBuilder(
                      stream: firestoreService.streamPublishedMockTests(),
                      builder: (context, snap) {
                        if (!snap.hasData) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }
                        final docs = snap.data!.docs;
                        if (docs.isEmpty) {
                          return const OceanGlassCard(
                            child: Text(
                              'Use the Instant PYQ Mock Generator above anytime. Published exam mocks added by teachers will also appear here.',
                              style: TextStyle(color: OceanColors.textMuted),
                            ),
                          );
                        }
                        return Column(
                          children: docs.map((d) {
                            final m = {'id': d.id, ...d.data()};
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: OceanGlassCard(
                                onTap: () => onLaunchMock(m),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        OceanStatusBadge(
                                          icon: Icons.assignment_outlined,
                                          label: (m['category'] ?? 'Tier 1').toString(),
                                          color: OceanColors.oceanBlue,
                                        ),
                                        const Spacer(),
                                        Text(
                                          '${m['durationMinutes'] ?? 15} mins · ${m['totalMarks'] ?? 50} marks',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: OceanColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      (m['title'] ?? 'Mock Test').toString(),
                                      style: const TextStyle(
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    if ((m['description'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        m['description'].toString(),
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          color: OceanColors.textMuted,
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      child: FilledButton.icon(
                                        onPressed: () => onLaunchMock(m),
                                        icon: const Icon(Icons.play_arrow_rounded),
                                        label: const Text('Start Mock Test'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ],
                ),
                // Tab 3: Complete SSC CGL Syllabus & Official Exam Pattern
                StreamBuilder(
                  stream: firestoreService.streamUserProgress(uid),
                  builder: (context, progSnap) {
                    final progData = progSnap.data?.data() ?? <String, dynamic>{};
                    final completedTopics = Set<String>.from(
                      (progData['completedTopics'] as List<dynamic>? ?? [])
                          .map((e) => e.toString()),
                    );
                    final subjectProgress =
                        (progData['subjectProgress'] as Map<String, dynamic>?) ?? {};
                    final topicMastery =
                        (subjectProgress['_topicMastery'] as Map<String, dynamic>?) ?? {};
                    final totalSyllabusCount = completeSscSyllabus.length;
                    final completedCount = completedTopics.length;
                    final syllabusPct = totalSyllabusCount > 0
                        ? (completedCount / totalSyllabusCount).clamp(0.0, 1.0)
                        : 0.0;

                    return ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        OceanGlassCard(
                          borderColor: OceanColors.turquoise,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'SSC CGL Syllabus Completion',
                                    style: TextStyle(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  Text(
                                    '$completedCount / $totalSyllabusCount topics (${(syllabusPct * 100).round()}%)',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: OceanColors.oceanBlue,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(99),
                                child: LinearProgressIndicator(
                                  value: syllabusPct,
                                  minHeight: 8,
                                  backgroundColor: OceanColors.borderLight,
                                  color: OceanColors.turquoise,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: sscMasterSubjects.map((s) {
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(s.shortTitle),
                                  selected: syllabusSubject == s.id,
                                  onSelected: (_) => onSubjectChanged(s.id),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (syllabusSubject == 'statistics')
                          const Padding(
                            padding: EdgeInsets.only(bottom: 10),
                            child: OceanGlassCard(
                              padding: EdgeInsets.all(12),
                              borderColor: OceanColors.turquoise,
                              child: Text(
                                'JSO Paper II Only: Statistics in Tier 2 applies strictly to candidates applying for Junior Statistical Officer (JSO).',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: OceanColors.oceanBlue,
                                ),
                              ),
                            ),
                          ),
                        ...syllabusTopics.map((topic) {
                          final isTopicDone = completedTopics.contains(topic.id);
                          final mastery =
                              topicMastery[topic.title] as Map<String, dynamic>?;
                          final needsRevision = mastery?['needsRevision'] == true;
                          final masteryAcc = mastery?['accuracy'];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: OceanGlassCard(
                              borderColor: isTopicDone
                                  ? OceanColors.emerald.withValues(alpha: 0.6)
                                  : (needsRevision
                                      ? OceanColors.coralAccent.withValues(alpha: 0.65)
                                      : null),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Checkbox(
                                        value: isTopicDone,
                                        activeColor: OceanColors.emerald,
                                        visualDensity: VisualDensity.compact,
                                        onChanged: (checked) {
                                          if (checked != null) {
                                            firestoreService
                                                .toggleSyllabusTopicCompleted(
                                              uid: uid,
                                              topicId: topic.id,
                                              completed: checked,
                                            );
                                          }
                                        },
                                      ),
                                      Expanded(
                                        child: Text(
                                          topic.title,
                                          style: TextStyle(
                                            fontSize: 14.5,
                                            fontWeight: FontWeight.w800,
                                            decoration: isTopicDone
                                                ? TextDecoration.lineThrough
                                                : null,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${topic.tier} · ${topic.weightage}',
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w700,
                                          color: OceanColors.oceanBlue,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (needsRevision || masteryAcc != null) ...[
                                    const SizedBox(height: 4),
                                    Wrap(
                                      spacing: 8,
                                      children: [
                                        if (needsRevision)
                                          OceanStatusBadge(
                                            icon: Icons.refresh_rounded,
                                            label: 'Weak · Needs Revision',
                                            color: OceanColors.coralAccent,
                                          ),
                                        if (masteryAcc != null)
                                          OceanStatusBadge(
                                            icon: Icons.insights_outlined,
                                            label: 'AI Check: $masteryAcc%',
                                            color: OceanColors.oceanBlue,
                                          ),
                                      ],
                                    ),
                                  ],
                                  if (topic.tierNote != null) ...[
                                    const SizedBox(height: 3),
                                    Text(
                                      topic.tierNote!,
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w600,
                                        color: OceanColors.coralAccent,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 6),
                                  Text(
                                    topic.keySubtopics.join(' · '),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: OceanColors.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      TextButton(
                                        onPressed: () => firestoreService
                                            .toggleSyllabusTopicCompleted(
                                          uid: uid,
                                          topicId: topic.id,
                                          completed: !isTopicDone,
                                        ),
                                        child: Text(
                                          isTopicDone
                                              ? 'Completed ✓'
                                              : 'Mark Completed',
                                        ),
                                      ),
                                      FilledButton.tonalIcon(
                                        onPressed: () => onTeachTopic(
                                            syllabusSubject, topic.title),
                                        icon: const Icon(Icons.auto_awesome,
                                            size: 16),
                                        label: const Text('Teach with AI'),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                        const SizedBox(height: 8),
                    OceanGlassCard(
                      child: ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        title: const Text(
                          'Official Exam Pattern (Tier 1 & Tier 2) + Cut-Offs',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        subtitle: const Text(
                          'Sectional timing, -0.50 / -1 marking & 2023–2025 cut-off trends',
                          style: TextStyle(fontSize: 12, color: OceanColors.textMuted),
                        ),
                        children: [
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Tier 1 (100 Qs · 200 Marks · 60 Mins · -0.50 neg)',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12.5,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...sscTier1PatternRows.map(
                            (r) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      r['section']!,
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                  Text(
                                    '${r['qs']} · ${r['marks']} · ${r['time']}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(height: 20),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Tier 2 (Merit + Qualifying Computer & DEST)',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12.5,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...sscTier2PatternRows.map(
                            (r) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    r['paper']!,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    '${r['module']} · ${r['marks']}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      color: OceanColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(height: 20),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Category Cut-Off Trends (Tier 1 /200 & Tier 2 2024 /450)',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12.5,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...sscCutoffTrendsRows.map(
                            (c) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 44,
                                    child: Text(
                                      c['category']!,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      '23: ${c['t1_2023']} · 24: ${c['t1_2024']} · 25: ${c['t1_2025']}',
                                      style: const TextStyle(fontSize: 11.5),
                                    ),
                                  ),
                                  Text(
                                    'T2: ${c['t2_2024']}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: OceanColors.oceanBlue,
                                    ),
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
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentAnalyticsTab extends StatelessWidget {
  final String uid;
  final Map<String, dynamic> profile;
  final FirestoreService firestoreService;

  const _StudentAnalyticsTab({
    required this.uid,
    required this.profile,
    required this.firestoreService,
  });

  @override
  Widget build(BuildContext context) {
    final attempted =
        int.tryParse((profile['questionsAttempted'] ?? 0).toString()) ?? 0;
    final correct =
        int.tryParse((profile['questionsCorrect'] ?? 0).toString()) ?? 0;
    final accuracy = attempted > 0 ? ((correct * 100) / attempted).round() : 0;
    final streak = int.tryParse((profile['streak'] ?? 1).toString()) ?? 1;
    final mocks =
        int.tryParse((profile['mockTestsCompleted'] ?? 0).toString()) ?? 0;
    final stats = (profile['subjectStats'] as Map<String, dynamic>?) ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanWaveHeaderCard(
          child: Row(
            children: [
              OceanProgressRing(
                progress: accuracy / 100.0,
                centerLabel: '$accuracy%',
                subtitle: 'Accuracy',
                size: 86,
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your Progress Summary',
                      style: TextStyle(
                        color: OceanColors.foamWhite,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$correct / $attempted Questions Correct · $mocks Mocks · ${streak}d Streak',
                      style: const TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        StreamBuilder(
          stream: firestoreService.streamUserProgress(uid),
          builder: (context, progSnap) {
            final progData = progSnap.data?.data() ?? <String, dynamic>{};
            final revCount =
                (progData['revisionListIds'] as List<dynamic>? ?? []).length;
            final completedTopics =
                (progData['completedTopics'] as List<dynamic>? ?? []).length;
            return StreamBuilder(
              stream: firestoreService.streamStudentAttempts(uid),
              builder: (context, attSnap) {
                final attDocs = attSnap.data?.docs ?? [];
                var totalSec = 0;
                var totalMockQs = 0;
                for (final d in attDocs) {
                  final dt = d.data();
                  totalSec +=
                      int.tryParse((dt['timeTakenSec'] ?? 0).toString()) ?? 0;
                  final c =
                      int.tryParse((dt['correctCount'] ?? 0).toString()) ?? 0;
                  final w =
                      int.tryParse((dt['wrongCount'] ?? 0).toString()) ?? 0;
                  totalMockQs += c + w;
                }
                final avgSecPerQ =
                    totalMockQs > 0 ? (totalSec / totalMockQs).round() : 0;

                return OceanGlassCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Avg Speed',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: OceanColors.textMuted,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              avgSecPerQ > 0 ? '${avgSecPerQ}s / Q' : '—',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Revision Queue',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: OceanColors.textMuted,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$revCount Qs',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: revCount > 0
                                    ? OceanColors.coralAccent
                                    : OceanColors.emerald,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Syllabus Done',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: OceanColors.textMuted,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$completedTopics/${completeSscSyllabus.length}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: OceanColors.oceanBlue,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
        const SizedBox(height: 14),
        FutureBuilder<OceanQuestProgressModel>(
          future: firestoreService.loadOceanQuestProgress(uid),
          builder: (context, oqSnap) {
            final oq = oqSnap.data;
            if (oq == null) return const SizedBox.shrink();
            final oqAcc = oq.totalAttempted > 0
                ? ((oq.totalCorrect * 100) / oq.totalAttempted).round()
                : 0;
            return OceanGlassCard(
              borderColor: OceanColors.turquoise,
              child: Row(
                children: [
                  const Icon(Icons.waves_rounded,
                      color: OceanColors.oceanBlue, size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Ocean Quest Adventure Stats',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${oq.unlockedLocations.length}/9 Zones · ${oq.completedMissions.length} Missions · ${oq.crystals} Crystals · ${oq.totalQuestXp} Quest XP · $oqAcc% Accuracy',
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
            );
          },
        ),
        const SizedBox(height: 18),
        const Text(
          'Weekly Study Consistency',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        OceanGlassCard(
          child: SizedBox(
            height: 190,
            child: BarChart(
              BarChartData(
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(
                  topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                barGroups: List.generate(
                  7,
                  (i) => BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: [40.0, 55.0, 50.0, 70.0, 82.0, 65.0, 90.0][i],
                        color: i == 6
                            ? OceanColors.turquoise
                            : OceanColors.oceanBlue,
                        width: 18,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Subject Mastery',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        OceanGlassCard(
          child: Column(
            children: sscMasterSubjects.map((s) {
              final raw = stats[s.id] as Map<String, dynamic>?;
              final subAtt = int.tryParse((raw?['attempted'] ?? 0).toString()) ?? 0;
              final subCor = int.tryParse((raw?['correct'] ?? 0).toString()) ?? 0;
              final pct = subAtt > 0 ? (subCor / subAtt) : 0.0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            s.title,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Text(
                          subAtt > 0 ? '${(pct * 100).round()}%' : 'New',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: OceanColors.oceanBlue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: pct,
                        minHeight: 8,
                        backgroundColor: OceanColors.borderLight,
                        color: OceanColors.turquoise,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Recent Mock Results',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        StreamBuilder(
          stream: firestoreService.streamStudentAttempts(uid),
          builder: (context, snap) {
            final docs = snap.data?.docs ?? [];
            if (docs.isEmpty) {
              return const OceanGlassCard(
                child: Text(
                  'Complete a mock test under Learn to see your score history here.',
                  style: TextStyle(color: OceanColors.textMuted),
                ),
              );
            }
            return Column(
              children: docs.take(5).map((d) {
                final a = d.data();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OceanGlassCard(
                    child: Row(
                      children: [
                        const Icon(Icons.assignment_turned_in,
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
                                'Score: ${a['score']} / ${a['maxScore']} · ${a['accuracy']}% accuracy',
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
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 18),
        const Text(
          'Examora Scholar Leaderboard',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        StreamBuilder(
          stream: firestoreService.streamLeaderboard(),
          builder: (context, snap) {
            final docs = snap.data?.docs ?? [];
            if (docs.isEmpty) {
              return const OceanGlassCard(
                child: Text('Leaderboard updates as learners earn XP.'),
              );
            }
            return OceanGlassCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: docs.asMap().entries.map((entry) {
                  final row = entry.value.data();
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: entry.key == 0
                          ? OceanColors.turquoise
                          : OceanColors.foamWhite,
                      child: Text(
                        '#${entry.key + 1}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: OceanColors.deepOcean,
                        ),
                      ),
                    ),
                    title: Text(
                      (row['displayName'] ?? 'Scholar').toString(),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('${row['streak'] ?? 1}d streak'),
                    trailing: Text(
                      '${row['xp'] ?? 0} XP',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: OceanColors.oceanBlue,
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _StudentProfileTab extends StatelessWidget {
  final String uid;
  final AuthSessionState session;
  final Map<String, dynamic> profile;
  final String language;
  final LocalNotificationPrefs notifPrefs;
  final int studiedTodayMins;
  final ValueChanged<LocalNotificationPrefs> onUpdatePrefs;
  final FirestoreService firestoreService;
  final VoidCallback onOpenTutor;
  final VoidCallback onSignOut;

  const _StudentProfileTab({
    required this.uid,
    required this.session,
    required this.profile,
    required this.language,
    required this.notifPrefs,
    required this.studiedTodayMins,
    required this.onUpdatePrefs,
    required this.firestoreService,
    required this.onOpenTutor,
    required this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    final xp = int.tryParse((profile['xp'] ?? 0).toString()) ?? 0;
    final streak = int.tryParse((profile['streak'] ?? 1).toString()) ?? 1;
    final goalMins =
        int.tryParse((profile['dailyGoalMinutes'] ?? 60).toString()) ?? 60;
    final reminderTime = TimeOfDay(
      hour: notifPrefs.reminderHour,
      minute: notifPrefs.reminderMinute,
    );
    final previewCopy = LocalNotificationService.buildGoalReminderCopy(
      displayName: session.displayName,
      username: session.username,
      studiedMinutes: studiedTodayMins,
      goalMinutes: goalMins,
      streak: streak,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        OceanWaveHeaderCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                session.displayName,
                style: const TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (session.username.isNotEmpty)
                Text(
                  '@${session.username}',
                  style: const TextStyle(
                    color: OceanColors.aqua,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                session.user?.email ?? '',
                style: const TextStyle(color: OceanColors.seaGlass, fontSize: 13),
              ),
              const SizedBox(height: 14),
              Text(
                '$xp XP · ${streak}d Streak · Target: ${profile['targetPost'] ?? 'Income Tax Inspector (CBDT)'}',
                style: const TextStyle(
                  color: OceanColors.foamWhite,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        OceanGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Language & Study Goal',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: ['en', 'ml', 'manglish', 'hi', 'ta'].contains(language)
                    ? language
                    : 'en',
                decoration: const InputDecoration(
                  labelText: 'Preferred Language',
                  prefixIcon: Icon(Icons.translate),
                ),
                items: const [
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'manglish', child: Text('Manglish')),
                  DropdownMenuItem(value: 'ml', child: Text('Malayalam')),
                  DropdownMenuItem(value: 'hi', child: Text('Hindi')),
                  DropdownMenuItem(value: 'ta', child: Text('Tamil')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    firestoreService.updateStudentSettings(
                      uid: uid,
                      preferredLanguage: val,
                    );
                  }
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: [30, 60, 90, 120].contains(goalMins) ? goalMins : 60,
                decoration: const InputDecoration(
                  labelText: 'Daily Study Goal',
                  prefixIcon: Icon(Icons.timer_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 30, child: Text('30 minutes / day')),
                  DropdownMenuItem(value: 60, child: Text('60 minutes / day')),
                  DropdownMenuItem(value: 90, child: Text('90 minutes / day')),
                  DropdownMenuItem(value: 120, child: Text('120 minutes / day')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    firestoreService.updateStudentSettings(
                      uid: uid,
                      dailyGoalMinutes: val,
                    );
                  }
                },
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
                'Study Tide Notifications',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.schedule, color: OceanColors.oceanBlue),
                title: const Text('Preferred Reminder Time'),
                subtitle: Text(
                  'Daily nudge scheduled at ${reminderTime.format(context)}',
                ),
                trailing: const Icon(Icons.edit_outlined, size: 18),
                onTap: () async {
                  final picked = await showTimePicker(
                    context: context,
                    initialTime: reminderTime,
                  );
                  if (picked != null) {
                    onUpdatePrefs(
                      notifPrefs.copyWith(
                        reminderHour: picked.hour,
                        reminderMinute: picked.minute,
                      ),
                    );
                  }
                },
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Daily Study Goal Reminder'),
                subtitle: Text(
                  'Gentle ocean nudge for your $goalMins min daily goal',
                ),
                value: notifPrefs.dailyReminder,
                activeTrackColor: OceanColors.turquoise,
                onChanged: (v) => onUpdatePrefs(
                  notifPrefs.copyWith(dailyReminder: v),
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Upcoming Mock Test Alerts'),
                subtitle: const Text('Get notified when new Tier 1 & Tier 2 mocks open'),
                value: notifPrefs.mockAlerts,
                activeTrackColor: OceanColors.turquoise,
                onChanged: (v) => onUpdatePrefs(
                  notifPrefs.copyWith(mockAlerts: v),
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Streak Saver Alerts'),
                subtitle: const Text('Keep your Examora lighthouse lit before midnight'),
                value: notifPrefs.streakAlerts,
                activeTrackColor: OceanColors.turquoise,
                onChanged: (v) => onUpdatePrefs(
                  notifPrefs.copyWith(streakAlerts: v),
                ),
              ),
              const SizedBox(height: 10),
              OceanWaveHeaderCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Today’s Ocean Reminder Preview',
                          style: TextStyle(
                            color: OceanColors.seaGlass,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '$studiedTodayMins/$goalMins min',
                          style: const TextStyle(
                            color: OceanColors.aqua,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      previewCopy.title,
                      style: const TextStyle(
                        color: OceanColors.foamWhite,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      previewCopy.body,
                      style: const TextStyle(
                        color: OceanColors.seaGlass,
                        fontSize: 12.5,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () async {
                        final sent = await LocalNotificationService.instance
                            .sendGentleReminderNow(
                          displayName: session.displayName,
                          username: session.username,
                          studiedMinutes: studiedTodayMins,
                          goalMinutes: goalMins,
                          streak: streak,
                        );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${sent.title} — ${sent.body}'),
                              backgroundColor: OceanColors.oceanNavy,
                            ),
                          );
                        }
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: OceanColors.turquoise,
                        foregroundColor: OceanColors.deepOcean,
                      ),
                      icon: const Icon(Icons.notifications_active_outlined),
                      label: const Text('Send Gentle Reminder Now'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: onOpenTutor,
          icon: const Icon(Icons.auto_awesome_outlined),
          label: const Text('Open Examora AI Mentor'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: onSignOut,
          style: OutlinedButton.styleFrom(
            foregroundColor: OceanColors.coralAccent,
            side: const BorderSide(color: OceanColors.coralAccent),
          ),
          icon: const Icon(Icons.logout),
          label: const Text('Sign Out'),
        ),
      ],
    );
  }
}
