import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';

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

class _AdminShellState extends State<AdminShell> {
  int _navIdx = 0;
  bool _loading = true;
  List<Map<String, dynamic>> _students = [];
  List<Map<String, dynamic>> _attempts = [];
  String _userSearch = '';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final students = await widget.firestoreService.fetchAllStudents();
    final attempts = await widget.firestoreService.fetchAllTestAttempts();
    if (mounted) {
      setState(() {
        _students = students;
        _attempts = attempts;
        _loading = false;
      });
    }
  }

  Future<void> _importQuestionsFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv', 'json'],
    );
    if (result == null || result.files.single.path == null) return;
    final raw = await File(result.files.single.path!).readAsString();
    final imported =
        await widget.firestoreService.bulkImportQuestionsFromCsvOrJson(raw);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Imported $imported questions.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 900;
    final destinations = const [
      NavigationRailDestination(
        icon: Icon(Icons.dashboard_outlined),
        label: Text('Overview'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.people_outline),
        label: Text('Users'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.analytics_outlined),
        label: Text('Analytics'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.quiz_outlined),
        label: Text('Questions'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.file_download_outlined),
        label: Text('Reports'),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Examora Admin Control Center',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
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
            icon: const Icon(Icons.logout, color: Colors.red),
            tooltip: 'Secure Logout',
          ),
        ],
      ),
      body: Row(
        children: [
          if (isWide)
            NavigationRail(
              backgroundColor: ExamoraColors.navy,
              selectedIndex: _navIdx,
              onDestinationSelected: (i) => setState(() => _navIdx = i),
              labelType: NavigationRailLabelType.all,
              selectedIconTheme: const IconThemeData(color: Colors.white),
              unselectedIconTheme: const IconThemeData(color: Colors.white70),
              selectedLabelTextStyle: const TextStyle(color: Colors.white),
              unselectedLabelTextStyle: const TextStyle(color: Colors.white70),
              indicatorColor: ExamoraColors.purple,
              destinations: destinations,
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
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
                    icon: Icon(Icons.people_outline), label: 'Users'),
                NavigationDestination(
                    icon: Icon(Icons.analytics_outlined), label: 'Analytics'),
                NavigationDestination(
                    icon: Icon(Icons.quiz_outlined), label: 'Questions'),
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
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _AdminKpi(label: 'Total Students', value: '${onlyStudents.length}'),
              _AdminKpi(label: 'Active', value: '$activeCount'),
              _AdminKpi(label: 'Inactive', value: '$inactiveCount'),
              _AdminKpi(label: 'Tests Attempted', value: '${_attempts.length}'),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Cohort Activity Overview',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 180,
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
                                color: ExamoraColors.purple,
                                width: 24,
                              ),
                            ],
                          ),
                          BarChartGroupData(
                            x: 1,
                            barRods: [
                              BarChartRodData(
                                toY: inactiveCount.toDouble(),
                                color: Colors.redAccent,
                                width: 24,
                              ),
                            ],
                          ),
                          BarChartGroupData(
                            x: 2,
                            barRods: [
                              BarChartRodData(
                                toY: _attempts.length.toDouble(),
                                color: ExamoraColors.navy,
                                width: 24,
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
          ),
        ],
      );
    }

    if (_navIdx == 1) {
      final filtered = onlyStudents.where((s) {
        final q = _userSearch.trim().toLowerCase();
        if (q.isEmpty) return true;
        return (s['username'] ?? '').toString().toLowerCase().contains(q) ||
            (s['displayName'] ?? '').toString().toLowerCase().contains(q) ||
            (s['email'] ?? '').toString().toLowerCase().contains(q);
      }).toList();

      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search by @username, name, or email...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (v) => setState(() => _userSearch = v),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final st = filtered[i];
                final isActive = st['isActive'] != false;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text('${st['displayName']} (@${st['username'] ?? ''})'),
                    subtitle: Text(
                      '${st['email']} · ${st['xp'] ?? 0} XP · Registered ${(st['createdAt'] ?? '').toString().split('T').first}',
                    ),
                    trailing: Switch(
                      value: isActive,
                      activeThumbColor: ExamoraColors.purple,
                      onChanged: (val) async {
                        await widget.firestoreService
                            .setStudentActiveStatus(st['id'].toString(), val);
                        await _refresh();
                      },
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      );
    }

    if (_navIdx == 3) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FilledButton.icon(
              onPressed: _importQuestionsFile,
              style: FilledButton.styleFrom(backgroundColor: ExamoraColors.purple),
              icon: const Icon(Icons.upload_file),
              label: const Text('Import Questions (CSV / JSON)'),
            ),
            const SizedBox(height: 16),
            const Text(
              'Question Bank CRUD & Filters',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      );
    }

    if (_navIdx == 4) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Export Performance & Registration Reports',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: () => widget.firestoreService.exportStudentsReport(
                    students: onlyStudents,
                    asExcel: true,
                  ),
                  style: FilledButton.styleFrom(backgroundColor: ExamoraColors.purple),
                  icon: const Icon(Icons.table_chart),
                  label: const Text('Export Excel (.xlsx)'),
                ),
                OutlinedButton.icon(
                  onPressed: () => widget.firestoreService.exportStudentsReport(
                    students: onlyStudents,
                    asExcel: false,
                  ),
                  icon: const Icon(Icons.download),
                  label: const Text('Export CSV'),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Center(
      child: Text('Total Mock Attempts Analyzed: ${_attempts.length}'),
    );
  }
}

class _AdminKpi extends StatelessWidget {
  final String label;
  final String value;
  const _AdminKpi({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(fontSize: 12, color: ExamoraColors.textMuted)),
              const SizedBox(height: 6),
              Text(value,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}
