import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';

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
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      _StudentHomeTab(
        session: widget.session,
        firestoreService: widget.firestoreService,
      ),
      _StudentLearnTab(firestoreService: widget.firestoreService),
      _StudentAnalyticsTab(
        session: widget.session,
        firestoreService: widget.firestoreService,
      ),
      _StudentTutorTab(),
      _StudentProfileTab(
        session: widget.session,
        onSignOut: () async {
          await widget.authService.signOut();
          widget.onSignedOut();
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Examora',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                widget.session.username.isNotEmpty
                    ? '@${widget.session.username}'
                    : widget.session.displayName,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: ExamoraColors.purple,
                ),
              ),
            ),
          ),
        ],
      ),
      body: pages[_tabIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        indicatorColor: ExamoraColors.purple.withValues(alpha: 0.14),
        onDestinationSelected: (idx) => setState(() => _tabIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), label: 'Learn'),
          NavigationDestination(icon: Icon(Icons.insights_outlined), label: 'Progress'),
          NavigationDestination(icon: Icon(Icons.smart_toy_outlined), label: 'AI Tutor'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}

class _StudentHomeTab extends StatelessWidget {
  final AuthSessionState session;
  final FirestoreService firestoreService;

  const _StudentHomeTab({
    required this.session,
    required this.firestoreService,
  });

  @override
  Widget build(BuildContext context) {
    final uid = session.user?.uid ?? '';
    return StreamBuilder(
      stream: firestoreService.streamUserProfile(uid),
      builder: (context, snapshot) {
        final data = snapshot.data?.data() ?? <String, dynamic>{};
        final xp = (data['xp'] ?? 0) as int;
        final streak = (data['streak'] ?? 1) as int;
        final mocks = (data['mockTestsCompleted'] ?? 0) as int;
        final targetPost =
            (data['targetPost'] ?? 'Income Tax Inspector (CBDT)').toString();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: ExamoraColors.navy,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back, ${session.username.isNotEmpty ? "@${session.username}" : session.displayName}',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    targetPost,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _StatChip(label: 'Total XP', value: '$xp XP'),
                      const SizedBox(width: 10),
                      _StatChip(label: 'Streak', value: '${streak}d'),
                      const SizedBox(width: 10),
                      _StatChip(label: 'Mocks', value: '$mocks'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'SSC CGL Subjects',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: const [
                _SubjectTile(title: 'Quantitative Aptitude', icon: Icons.calculate),
                _SubjectTile(title: 'Reasoning', icon: Icons.psychology),
                _SubjectTile(title: 'English', icon: Icons.spellcheck),
                _SubjectTile(title: 'General Awareness', icon: Icons.public),
                _SubjectTile(title: 'Computer Knowledge', icon: Icons.computer),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  const _StatChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubjectTile extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SubjectTile({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: ExamoraColors.purple),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _StudentLearnTab extends StatelessWidget {
  final FirestoreService firestoreService;
  const _StudentLearnTab({required this.firestoreService});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(
            labelColor: ExamoraColors.purple,
            tabs: [
              Tab(text: 'Video Lessons'),
              Tab(text: 'PYQ Bank'),
              Tab(text: 'Mock Exams'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                StreamBuilder(
                  stream: firestoreService.streamPublishedVideos(),
                  builder: (context, snap) {
                    final docs = snap.data?.docs ?? [];
                    if (docs.isEmpty) {
                      return const Center(child: Text('Published video lessons appear here.'));
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: docs.length,
                      itemBuilder: (_, i) {
                        final v = docs[i].data();
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: const Icon(Icons.play_circle_outline,
                                color: ExamoraColors.purple),
                            title: Text((v['title'] ?? 'Lesson').toString()),
                            subtitle: Text('${v['subject'] ?? ''} · ${v['topic'] ?? ''}'),
                          ),
                        );
                      },
                    );
                  },
                ),
                StreamBuilder(
                  stream: firestoreService.streamPublishedQuestions(),
                  builder: (context, snap) {
                    final docs = snap.data?.docs ?? [];
                    if (docs.isEmpty) {
                      return const Center(child: Text('Previous year questions appear here.'));
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: docs.length,
                      itemBuilder: (_, i) {
                        final q = docs[i].data();
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            title: Text(
                              (q['questionEn'] ?? '').toString(),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${q['subject']} · ${q['topic']} · ${q['year']}',
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
                StreamBuilder(
                  stream: firestoreService.streamPublishedMockTests(),
                  builder: (context, snap) {
                    final docs = snap.data?.docs ?? [];
                    if (docs.isEmpty) {
                      return const Center(child: Text('Official mock tests appear here.'));
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: docs.length,
                      itemBuilder: (_, i) {
                        final m = docs[i].data();
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: const Icon(Icons.assignment_outlined,
                                color: ExamoraColors.navy),
                            title: Text((m['title'] ?? 'Mock Test').toString()),
                            subtitle: Text(
                              '${m['category'] ?? 'Tier 1'} · ${m['durationMinutes'] ?? 15} mins',
                            ),
                          ),
                        );
                      },
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
  final AuthSessionState session;
  final FirestoreService firestoreService;

  const _StudentAnalyticsTab({
    required this.session,
    required this.firestoreService,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Weekly Study Progress & Accuracy',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 200,
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
                          toY: [45.0, 60.0, 50.0, 75.0, 80.0, 65.0, 90.0][i],
                          color: ExamoraColors.purple,
                          width: 16,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Leaderboard',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        StreamBuilder(
          stream: firestoreService.streamLeaderboard(),
          builder: (context, snap) {
            final docs = snap.data?.docs ?? [];
            return Card(
              child: Column(
                children: docs.asMap().entries.map((entry) {
                  final row = entry.value.data();
                  return ListTile(
                    leading: Text('#${entry.key + 1}',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    title: Text((row['displayName'] ?? 'Scholar').toString()),
                    trailing: Text('${row['xp'] ?? 0} XP',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
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

class _StudentTutorTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Examora AI Tutor',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          SizedBox(height: 8),
          Text(
            'Ask SSC CGL Maths, Reasoning, English, or General Awareness doubts in English, Malayalam, Hindi, or Tamil.',
            style: TextStyle(color: ExamoraColors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _StudentProfileTab extends StatelessWidget {
  final AuthSessionState session;
  final VoidCallback onSignOut;

  const _StudentProfileTab({
    required this.session,
    required this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.displayName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                if (session.username.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    '@${session.username}',
                    style: const TextStyle(
                      color: ExamoraColors.purple,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  session.user?.email ?? '',
                  style: const TextStyle(color: ExamoraColors.textMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: onSignOut,
          icon: const Icon(Icons.logout, color: Colors.red),
          label: const Text('Sign Out', style: TextStyle(color: Colors.red)),
        ),
      ],
    );
  }
}
