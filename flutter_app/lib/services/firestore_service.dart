import 'dart:convert';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../features/student/ocean_quest_data.dart';
import '../firebase_options.dart';

class OceanQuestEvalResult {
  final bool passed;
  final int accuracy;
  final int stars;
  final int score;
  final int xpAwarded;
  final int coinsAwarded;
  final int crystalsAwarded;
  final bool firstTimeClear;
  final bool dailyClaimedToday;
  final String? unlockedBadgeId;
  final List<String> newlyUnlockedLocations;
  final OceanQuestProgressModel updatedProgress;

  const OceanQuestEvalResult({
    required this.passed,
    required this.accuracy,
    required this.stars,
    required this.score,
    required this.xpAwarded,
    required this.coinsAwarded,
    required this.crystalsAwarded,
    required this.firstTimeClear,
    required this.dailyClaimedToday,
    this.unlockedBadgeId,
    this.newlyUnlockedLocations = const [],
    required this.updatedProgress,
  });
}

class QuestionImportValidationResult {
  final int totalRows;
  final List<Map<String, dynamic>> validQuestions;
  final List<String> warnings;

  const QuestionImportValidationResult({
    required this.totalRows,
    required this.validQuestions,
    required this.warnings,
  });
}

class StudentPyqState {
  final Set<String> bookmarkedIds;
  final Set<String> difficultIds;
  final Set<String> revisionIds;
  final Map<String, Map<String, dynamic>> attempts;

  const StudentPyqState({
    this.bookmarkedIds = const {},
    this.difficultIds = const {},
    this.revisionIds = const {},
    this.attempts = const {},
  });

  StudentPyqState copyWith({
    Set<String>? bookmarkedIds,
    Set<String>? difficultIds,
    Set<String>? revisionIds,
    Map<String, Map<String, dynamic>>? attempts,
  }) {
    return StudentPyqState(
      bookmarkedIds: bookmarkedIds ?? this.bookmarkedIds,
      difficultIds: difficultIds ?? this.difficultIds,
      revisionIds: revisionIds ?? this.revisionIds,
      attempts: attempts ?? this.attempts,
    );
  }
}

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: DefaultFirebaseOptions.firestoreDatabaseId,
  );
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // ---------------- STUDENT STREAMS ----------------

  Stream<DocumentSnapshot<Map<String, dynamic>>> streamUserProfile(String uid) {
    return _db.collection('users').doc(uid).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedCourses() {
    return _db
        .collection('courses')
        .where('isPublished', isEqualTo: true)
        .orderBy('order')
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedVideos() {
    return _db
        .collection('videoLessons')
        .where('isPublished', isEqualTo: true)
        .snapshots();
  }

  /// Unbounded live stream of published questions (no .limit(100) truncation).
  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedQuestions({
    String? subject,
    String? tier,
    int? year,
  }) {
    Query<Map<String, dynamic>> q =
        _db.collection('questions').where('isPublished', isEqualTo: true);
    if (subject != null && subject != 'all') {
      q = q.where('subject', isEqualTo: subject);
    }
    if (tier != null && tier != 'all') {
      q = q.where('tier', isEqualTo: tier);
    }
    if (year != null) {
      q = q.where('year', isEqualTo: year);
    }
    return q.snapshots();
  }

  /// Paginated unbounded loader using startAfterDocument in batches of 200.
  Future<List<Map<String, dynamic>>> fetchAllPublishedQuestionsUnbounded({
    String? subject,
    String? tier,
    int? year,
  }) async {
    final List<Map<String, dynamic>> collected = [];
    DocumentSnapshot<Map<String, dynamic>>? cursor;
    const batchSize = 200;

    while (true) {
      Query<Map<String, dynamic>> q = _db
          .collection('questions')
          .where('isPublished', isEqualTo: true);
      if (subject != null && subject != 'all') {
        q = q.where('subject', isEqualTo: subject);
      }
      if (tier != null && tier != 'all') {
        q = q.where('tier', isEqualTo: tier);
      }
      if (year != null) {
        q = q.where('year', isEqualTo: year);
      }
      q = q.orderBy(FieldPath.documentId).limit(batchSize);
      if (cursor != null) {
        q = q.startAfterDocument(cursor);
      }
      final snap = await q.get();
      for (final d in snap.docs) {
        collected.add({'id': d.id, ...d.data()});
      }
      if (snap.docs.length < batchSize) break;
      cursor = snap.docs.last;
    }
    return collected;
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedMockTests() {
    return _db
        .collection('mockTests')
        .where('isPublished', isEqualTo: true)
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamLeaderboard() {
    return _db
        .collection('leaderboards')
        .orderBy('xp', descending: true)
        .limit(20)
        .snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamStudentAttempts(String uid) {
    return _db
        .collection('testAttempts')
        .where('userId', isEqualTo: uid)
        .limit(40)
        .snapshots();
  }

  Future<List<Map<String, dynamic>>> fetchQuestionsForMock(
    List<String> questionIds,
  ) async {
    final all = await fetchAllPublishedQuestionsUnbounded();
    if (questionIds.isEmpty) {
      return all.take(25).toList();
    }
    final idSet = questionIds.toSet();
    final matched =
        all.where((q) => idSet.contains(q['id']?.toString())).toList();
    return matched.isNotEmpty ? matched : all.take(25).toList();
  }

  // ---------------- STUDENT PYQ REVISION & BOOKMARK STATE ----------------

  String _pyqPrefsKey(String uid) => 'examora_pyq_state_$uid';

  Future<StudentPyqState> loadStudentPyqState(String uid) async {
    final prefs = await SharedPreferences.getInstance();
    final Set<String> bookmarked = {};
    final Set<String> difficult = {};
    final Set<String> revision = {};
    final Map<String, Map<String, dynamic>> attempts = {};

    final rawLocal = prefs.getString(_pyqPrefsKey(uid));
    if (rawLocal != null && rawLocal.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawLocal);
        if (decoded is Map) {
          for (final id in (decoded['bookmarkedIds'] as List? ?? [])) {
            bookmarked.add(id.toString());
          }
          for (final id in (decoded['difficultIds'] as List? ?? [])) {
            difficult.add(id.toString());
          }
          for (final id in (decoded['revisionIds'] as List? ?? [])) {
            revision.add(id.toString());
          }
          final rawAttempts = decoded['attempts'];
          if (rawAttempts is Map) {
            rawAttempts.forEach((k, v) {
              if (v is Map) {
                attempts[k.toString()] = Map<String, dynamic>.from(v);
              }
            });
          }
        }
      } catch (_) {}
    }

    if (uid.isNotEmpty) {
      try {
        final progressDoc =
            await _db.collection('userProgress').doc(uid).get();
        if (progressDoc.exists) {
          final dt = progressDoc.data() ?? {};
          for (final id in (dt['difficultQuestionIds'] as List? ?? [])) {
            difficult.add(id.toString());
          }
          for (final id in (dt['revisionListIds'] as List? ?? [])) {
            revision.add(id.toString());
          }
          final remoteAttempts = dt['pyqAttempts'];
          if (remoteAttempts is Map) {
            remoteAttempts.forEach((k, v) {
              if (v is Map) {
                attempts[k.toString()] = Map<String, dynamic>.from(v);
              }
            });
          }
        }
      } catch (_) {}

      try {
        final bmSnap = await _db
            .collection('bookmarks')
            .where('userId', isEqualTo: uid)
            .where('itemType', isEqualTo: 'question')
            .get();
        for (final d in bmSnap.docs) {
          final itemId = (d.data()['itemId'] ?? '').toString();
          if (itemId.isNotEmpty) bookmarked.add(itemId);
        }
      } catch (_) {}
    }

    final state = StudentPyqState(
      bookmarkedIds: bookmarked,
      difficultIds: difficult,
      revisionIds: revision,
      attempts: attempts,
    );
    await _saveLocalPyqState(uid, state);
    return state;
  }

  Future<void> _saveLocalPyqState(String uid, StudentPyqState state) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _pyqPrefsKey(uid),
        jsonEncode({
          'bookmarkedIds': state.bookmarkedIds.toList(),
          'difficultIds': state.difficultIds.toList(),
          'revisionIds': state.revisionIds.toList(),
          'attempts': state.attempts,
        }),
      );
    } catch (_) {}
  }

  Future<void> _syncUserProgressPyqFields(
    String uid,
    StudentPyqState state,
  ) async {
    await _saveLocalPyqState(uid, state);
    if (uid.isEmpty) return;
    try {
      final ref = _db.collection('userProgress').doc(uid);
      final snap = await ref.get();
      final existing = snap.data() ?? <String, dynamic>{};
      final payload = <String, dynamic>{
        'uid': uid,
        'completedLessonIds':
            List<dynamic>.from(existing['completedLessonIds'] as List? ?? []),
        'completedTopics':
            List<dynamic>.from(existing['completedTopics'] as List? ?? []),
        'totalStudyMinutes':
            int.tryParse((existing['totalStudyMinutes'] ?? 0).toString()) ?? 0,
        if (existing['subjectProgress'] is Map)
          'subjectProgress': existing['subjectProgress'],
        'lastStudiedAt': DateTime.now().toUtc().toIso8601String(),
        'difficultQuestionIds': state.difficultIds.take(1000).toList(),
        'revisionListIds': state.revisionIds.take(1000).toList(),
        'pyqAttempts': state.attempts,
      };
      await ref.set(payload);
    } catch (_) {}
  }

  Future<void> toggleQuestionBookmark({
    required String uid,
    required String questionId,
    required String title,
    required bool nextBookmarked,
    required StudentPyqState nextState,
  }) async {
    await _saveLocalPyqState(uid, nextState);
    if (uid.isEmpty) return;
    final safeDocId =
        '${uid}_$questionId'.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
    final safeTitle =
        title.trim().isEmpty ? 'SSC CGL PYQ' : title.trim().substring(0, title.trim().length > 180 ? 180 : title.trim().length);
    try {
      if (nextBookmarked) {
        await _db.collection('bookmarks').doc(safeDocId).set({
          'userId': uid,
          'itemType': 'question',
          'itemId': questionId,
          'title': safeTitle,
          'createdAt': DateTime.now().toUtc().toIso8601String(),
        });
      } else {
        await _db.collection('bookmarks').doc(safeDocId).delete();
      }
    } catch (_) {}
  }

  Future<void> syncDifficultAndRevision({
    required String uid,
    required StudentPyqState nextState,
  }) async {
    await _syncUserProgressPyqFields(uid, nextState);
  }

  Future<void> recordPyqAttempt({
    required String uid,
    required String questionId,
    required String subject,
    required int selectedIndex,
    required bool isCorrect,
    required StudentPyqState nextState,
  }) async {
    await _syncUserProgressPyqFields(uid, nextState);
    try {
      await recordPracticeAttempt(
        uid: uid,
        subject: subject,
        isCorrect: isCorrect,
      );
    } catch (_) {}
  }

  Future<void> updateStudentSettings({
    required String uid,
    String? preferredLanguage,
    int? dailyGoalMinutes,
    String? targetPost,
  }) async {
    final updates = <String, dynamic>{
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    };
    if (preferredLanguage != null &&
        ['en', 'ml', 'manglish', 'hi', 'ta'].contains(preferredLanguage)) {
      updates['preferredLanguage'] = preferredLanguage;
    }
    if (dailyGoalMinutes != null &&
        dailyGoalMinutes >= 15 &&
        dailyGoalMinutes <= 480) {
      updates['dailyGoalMinutes'] = dailyGoalMinutes;
    }
    if (targetPost != null && targetPost.trim().isNotEmpty) {
      updates['targetPost'] = targetPost.trim();
    }
    await _db.collection('users').doc(uid).update(updates);
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> streamUserProgress(
    String uid,
  ) {
    return _db.collection('userProgress').doc(uid).snapshots();
  }

  Future<Map<String, dynamic>> loadUserProgressSnapshot(String uid) async {
    if (uid.isEmpty) return {};
    try {
      final snap = await _db.collection('userProgress').doc(uid).get();
      return snap.data() ?? {};
    } catch (_) {
      return {};
    }
  }

  Future<void> toggleSyllabusTopicCompleted({
    required String uid,
    required String topicId,
    required bool completed,
  }) async {
    if (uid.isEmpty || topicId.trim().isEmpty) return;
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final ref = _db.collection('userProgress').doc(uid);
    final snap = await ref.get();
    final existing = snap.data() ?? <String, dynamic>{};
    final topics = Set<String>.from(
      (existing['completedTopics'] as List<dynamic>? ?? [])
          .map((e) => e.toString()),
    );
    if (completed) {
      topics.add(topicId);
    } else {
      topics.remove(topicId);
    }

    await ref.set({
      'uid': uid,
      'completedLessonIds': List<dynamic>.from(
        existing['completedLessonIds'] as List? ?? [],
      ),
      'completedTopics': topics.take(500).toList(),
      'totalStudyMinutes':
          int.tryParse((existing['totalStudyMinutes'] ?? 0).toString()) ?? 0,
      if (existing['subjectProgress'] is Map)
        'subjectProgress': existing['subjectProgress'],
      if (existing['difficultQuestionIds'] is List)
        'difficultQuestionIds': existing['difficultQuestionIds'],
      if (existing['revisionListIds'] is List)
        'revisionListIds': existing['revisionListIds'],
      if (existing['pyqAttempts'] is Map)
        'pyqAttempts': existing['pyqAttempts'],
      'lastStudiedAt': nowIso,
    });
  }

  Future<void> recordTopicMastery({
    required String uid,
    required String topicTitle,
    required String subject,
    required String masteryLevel,
    required bool isCorrectAttempt,
  }) async {
    if (uid.isEmpty || topicTitle.trim().isEmpty) return;
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final ref = _db.collection('userProgress').doc(uid);
    try {
      final snap = await ref.get();
      final existing = snap.data() ?? <String, dynamic>{};
      final subjectProgress = Map<String, dynamic>.from(
        existing['subjectProgress'] as Map? ?? {},
      );
      final masteryMap = Map<String, dynamic>.from(
        subjectProgress['_topicMastery'] as Map? ?? {},
      );
      final prev = Map<String, dynamic>.from(
        masteryMap[topicTitle] as Map? ?? {},
      );
      final attempted = (int.tryParse('${prev['attempted'] ?? 0}') ?? 0) + 1;
      final correct = (int.tryParse('${prev['correct'] ?? 0}') ?? 0) +
          (isCorrectAttempt ? 1 : 0);
      masteryMap[topicTitle] = {
        'topic': topicTitle,
        'subject': subject,
        'attempted': attempted,
        'correct': correct,
        'accuracy': ((correct * 100) / attempted).round(),
        'level': masteryLevel,
        'needsRevision': !isCorrectAttempt || ((correct * 100) / attempted) < 60,
        'updatedAt': nowIso,
      };
      subjectProgress['_topicMastery'] = masteryMap;

      await ref.set({
        'uid': uid,
        'completedLessonIds': List<dynamic>.from(
          existing['completedLessonIds'] as List? ?? [],
        ),
        'completedTopics': List<dynamic>.from(
          existing['completedTopics'] as List? ?? [],
        ),
        'subjectProgress': subjectProgress,
        'totalStudyMinutes':
            int.tryParse((existing['totalStudyMinutes'] ?? 0).toString()) ?? 0,
        if (existing['difficultQuestionIds'] is List)
          'difficultQuestionIds': existing['difficultQuestionIds'],
        if (existing['revisionListIds'] is List)
          'revisionListIds': existing['revisionListIds'],
        if (existing['pyqAttempts'] is Map)
          'pyqAttempts': existing['pyqAttempts'],
        'lastStudiedAt': nowIso,
      });
    } catch (_) {}
  }

  Future<void> addWrongQuestionsToRevision({
    required String uid,
    required List<String> wrongIds,
  }) async {
    final clean = wrongIds.map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    if (uid.isEmpty || clean.isEmpty) return;
    final current = await loadStudentPyqState(uid);
    final nextRev = {...current.revisionIds, ...clean}.take(1000).toSet();
    await _syncUserProgressPyqFields(
      uid,
      current.copyWith(revisionIds: nextRev),
    );
  }

  Future<void> markLessonCompleted({
    required String uid,
    required String lessonId,
    int studyMinutesDelta = 15,
  }) async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    await _db.collection('users').doc(uid).update({
      'completedLessons': FieldValue.arrayUnion([lessonId]),
      'xp': FieldValue.increment(25),
      'totalPoints': FieldValue.increment(25),
      'totalStudyHours': FieldValue.increment(studyMinutesDelta / 60.0),
      'updatedAt': nowIso,
    });
  }

  Future<void> recordPracticeAttempt({
    required String uid,
    required String subject,
    required bool isCorrect,
  }) async {
    final normalizedSubject =
        ['quant', 'reasoning', 'english', 'ga', 'computer', 'statistics']
                .contains(subject)
            ? subject
            : 'quant';
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final updates = <String, dynamic>{
      'questionsAttempted': FieldValue.increment(1),
      'subjectStats.$normalizedSubject.attempted': FieldValue.increment(1),
      'updatedAt': nowIso,
    };
    if (isCorrect) {
      updates['questionsCorrect'] = FieldValue.increment(1);
      updates['subjectStats.$normalizedSubject.correct'] =
          FieldValue.increment(1);
      updates['xp'] = FieldValue.increment(15);
      updates['totalPoints'] = FieldValue.increment(15);
      updates['coins'] = FieldValue.increment(5);
    }
    await _db.collection('users').doc(uid).update(updates);
  }

  Future<void> submitMockAttempt({
    required String uid,
    required String testId,
    required String testTitle,
    required double score,
    required double maxScore,
    required int correctCount,
    required int wrongCount,
    required int unattemptedCount,
    required int accuracy,
    required int timeTakenSec,
    required Map<String, Map<String, int>> subjectBreakdown,
    List<String> wrongQuestionIds = const [],
  }) async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final attemptId = 'att_${DateTime.now().millisecondsSinceEpoch}';
    final batch = _db.batch();

    batch.set(_db.collection('testAttempts').doc(attemptId), {
      'userId': uid,
      'testId': testId,
      'testTitle': testTitle,
      'score': score,
      'maxScore': maxScore,
      'correctCount': correctCount,
      'wrongCount': wrongCount,
      'unattemptedCount': unattemptedCount,
      'accuracy': accuracy,
      'timeTakenSec': timeTakenSec,
      'subjectBreakdown': subjectBreakdown,
      'submittedAt': nowIso,
      'createdAt': nowIso,
    });

    final userUpdates = <String, dynamic>{
      'mockTestsCompleted': FieldValue.increment(1),
      'questionsAttempted': FieldValue.increment(correctCount + wrongCount),
      'questionsCorrect': FieldValue.increment(correctCount),
      'xp': FieldValue.increment(correctCount * 20),
      'totalPoints': FieldValue.increment(correctCount * 20),
      'updatedAt': nowIso,
    };
    subjectBreakdown.forEach((sub, counts) {
      if (['quant', 'reasoning', 'english', 'ga', 'computer', 'statistics']
          .contains(sub)) {
        final att = counts['attempted'] ?? 0;
        final cor = counts['correct'] ?? 0;
        if (att > 0) {
          userUpdates['subjectStats.$sub.attempted'] = FieldValue.increment(att);
        }
        if (cor > 0) {
          userUpdates['subjectStats.$sub.correct'] = FieldValue.increment(cor);
        }
      }
    });
    batch.update(_db.collection('users').doc(uid), userUpdates);

    await batch.commit();

    if (wrongQuestionIds.isNotEmpty) {
      await addWrongQuestionsToRevision(uid: uid, wrongIds: wrongQuestionIds);
    }
  }

  // ---------------- OCEAN QUEST PROGRESSION & CLAIMS ----------------

  String _oceanQuestPrefsKey(String uid) => 'examora_ocean_quest_$uid';

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedOceanQuestMissions() {
    return _db
        .collection('oceanQuestMissions')
        .where('isPublished', isEqualTo: true)
        .snapshots();
  }

  Future<OceanQuestProgressModel> loadOceanQuestProgress(String uid) async {
    final prefs = await SharedPreferences.getInstance();
    OceanQuestProgressModel local = OceanQuestProgressModel(uid: uid);
    final raw = prefs.getString(_oceanQuestPrefsKey(uid));
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          local = OceanQuestProgressModel.fromMap(
            uid,
            Map<String, dynamic>.from(decoded),
          );
        }
      } catch (_) {}
    }

    if (uid.isNotEmpty) {
      try {
        final doc = await _db.collection('oceanQuestProgress').doc(uid).get();
        if (doc.exists && doc.data() != null) {
          final remote = OceanQuestProgressModel.fromMap(uid, doc.data()!);
          final mergedLocs = {
            ...local.unlockedLocations,
            ...remote.unlockedLocations,
            'coral-bay',
          }.toList();
          final mergedCompleted = {
            ...local.completedMissions,
            ...remote.completedMissions,
          }.toList();
          final mergedBest = Map<String, int>.from(local.missionBestScores);
          remote.missionBestScores.forEach((k, v) {
            if ((mergedBest[k] ?? 0) < v) mergedBest[k] = v;
          });
          final mergedStars = Map<String, int>.from(local.missionStars);
          remote.missionStars.forEach((k, v) {
            if ((mergedStars[k] ?? 0) < v) mergedStars[k] = v;
          });
          final mergedSeen = {
            ...local.seenQuestionIds,
            ...remote.seenQuestionIds,
          }.take(2000).toList();
          final mergedWrong = {
            ...local.wrongQuestionIds,
            ...remote.wrongQuestionIds,
          }.take(1000).toList();
          final mergedBadges = {
            ...local.questBadges,
            ...remote.questBadges,
          }.toList();
          final mergedDaily = {
            ...local.dailyCompletions,
            ...remote.dailyCompletions,
          }.toList();

          final merged = OceanQuestProgressModel(
            uid: uid,
            unlockedLocations: mergedLocs,
            completedMissions: mergedCompleted,
            missionBestScores: mergedBest,
            missionStars: mergedStars,
            seenQuestionIds: mergedSeen,
            wrongQuestionIds: mergedWrong,
            crystals: remote.crystals > local.crystals
                ? remote.crystals
                : local.crystals,
            totalQuestXp: remote.totalQuestXp > local.totalQuestXp
                ? remote.totalQuestXp
                : local.totalQuestXp,
            questBadges: mergedBadges,
            dailyCompletions: mergedDaily,
            totalRuns: remote.totalRuns > local.totalRuns
                ? remote.totalRuns
                : local.totalRuns,
            totalCorrect: remote.totalCorrect > local.totalCorrect
                ? remote.totalCorrect
                : local.totalCorrect,
            totalAttempted: remote.totalAttempted > local.totalAttempted
                ? remote.totalAttempted
                : local.totalAttempted,
            updatedAt: remote.updatedAt.isNotEmpty
                ? remote.updatedAt
                : local.updatedAt,
          );
          await _saveLocalOceanQuestProgress(uid, merged);
          return merged;
        }
      } catch (_) {}
    }

    return local;
  }

  Future<void> _saveLocalOceanQuestProgress(
    String uid,
    OceanQuestProgressModel progress,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _oceanQuestPrefsKey(uid),
        jsonEncode(progress.toMap()),
      );
    } catch (_) {}
  }

  Future<OceanQuestEvalResult> completeOceanQuestMission({
    required String uid,
    required Map<String, dynamic> mission,
    required List<Map<String, dynamic>> allMissions,
    required OceanQuestProgressModel currentProgress,
    required int correctCount,
    required int totalQuestions,
    required List<String> seenIds,
    required List<String> correctIds,
    required List<String> wrongIds,
    required Map<String, Map<String, int>> subjectDelta,
    required int timeTakenSec,
  }) async {
    final safeTotal = totalQuestions < 1 ? 1 : totalQuestions;
    final safeCorrect = correctCount.clamp(0, safeTotal);
    final accuracy = ((safeCorrect * 100) / safeTotal).round().clamp(0, 100);
    final minAcc = (int.tryParse((mission['minAccuracyPct'] ?? 60).toString()) ?? 60)
        .clamp(0, 100);
    final passed = accuracy >= minAcc;
    final stars = !passed ? 0 : (accuracy >= 90 ? 3 : (accuracy >= 75 ? 2 : 1));
    final speedBonus =
        (timeTakenSec > 0 && timeTakenSec <= 180) ? 10 : 0;
    final score = (safeCorrect * 20) + (stars * 15) + speedBonus;

    final missionId =
        (mission['missionId'] ?? mission['id'] ?? 'oq-mission').toString();
    final mode = (mission['mode'] ?? 'treasure-hunt').toString();
    final todayKey = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    final claimType = mode == 'daily-challenge' ? 'daily-challenge' : 'first-clear';
    final rawClaimId = mode == 'daily-challenge'
        ? '${uid}_daily_$todayKey'
        : '${uid}_first_$missionId';
    final safeClaimId =
        rawClaimId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');

    final cfgXp =
        (int.tryParse((mission['xpReward'] ?? 100).toString()) ?? 100)
            .clamp(10, 600);
    final cfgCoins =
        (int.tryParse((mission['coinReward'] ?? 50).toString()) ?? 50)
            .clamp(5, 300);
    final cfgCrystals =
        (int.tryParse((mission['crystalReward'] ?? 5).toString()) ?? 5)
            .clamp(0, 100);
    final badgeCandidate = (mission['badgeId'] ?? '').toString().trim();

    bool canGrantFullClaim = false;
    bool dailyClaimedToday =
        currentProgress.dailyCompletions.contains(todayKey);

    if (passed && uid.isNotEmpty) {
      try {
        final claimDoc =
            await _db.collection('oceanQuestClaims').doc(safeClaimId).get();
        if (!claimDoc.exists) {
          canGrantFullClaim = true;
        } else if (mode == 'daily-challenge') {
          dailyClaimedToday = true;
        }
      } catch (_) {
        canGrantFullClaim = mode == 'daily-challenge'
            ? !dailyClaimedToday
            : !currentProgress.completedMissions.contains(missionId);
      }
    } else if (passed) {
      canGrantFullClaim = mode == 'daily-challenge'
          ? !dailyClaimedToday
          : !currentProgress.completedMissions.contains(missionId);
    }

    int xpAwarded;
    int coinsAwarded;
    int crystalsAwarded;
    if (!passed) {
      xpAwarded = (safeCorrect * 3).clamp(0, 30);
      coinsAwarded = 0;
      crystalsAwarded = 0;
    } else if (canGrantFullClaim) {
      xpAwarded = cfgXp;
      coinsAwarded = cfgCoins;
      crystalsAwarded = cfgCrystals;
    } else {
      xpAwarded = (safeCorrect * 6).clamp(0, 60);
      coinsAwarded = (safeCorrect * 2).clamp(0, 20);
      crystalsAwarded = 0;
    }

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final completedSet = currentProgress.completedMissions.toSet();
    final firstTimeClear = passed && !completedSet.contains(missionId);
    if (passed && mode != 'daily-challenge') {
      completedSet.add(missionId);
    }

    final bestScores = Map<String, int>.from(currentProgress.missionBestScores);
    if ((bestScores[missionId] ?? 0) < score) {
      bestScores[missionId] = score;
    }
    final missionStars = Map<String, int>.from(currentProgress.missionStars);
    if ((missionStars[missionId] ?? 0) < stars) {
      missionStars[missionId] = stars;
    }

    final nextSeen = {
      ...currentProgress.seenQuestionIds,
      ...seenIds,
    }.take(2000).toList();

    final wrongSet = currentProgress.wrongQuestionIds.toSet()
      ..removeAll(correctIds)
      ..addAll(wrongIds);
    final nextWrong = wrongSet.take(1000).toList();

    final badgesSet = currentProgress.questBadges.toSet();
    String? unlockedBadgeId;
    if (passed &&
        canGrantFullClaim &&
        badgeCandidate.isNotEmpty &&
        !badgesSet.contains(badgeCandidate)) {
      badgesSet.add(badgeCandidate);
      unlockedBadgeId = badgeCandidate;
    }

    final dailySet = currentProgress.dailyCompletions.toSet();
    if (passed && mode == 'daily-challenge') {
      dailySet.add(todayKey);
      dailyClaimedToday = true;
    }

    final probe = OceanQuestProgressModel(
      uid: uid,
      unlockedLocations: currentProgress.unlockedLocations,
      completedMissions: completedSet.toList(),
    );
    final nextUnlockedLocations =
        computeNewlyUnlockedLocations(probe, allMissions);
    final prevLocSet = currentProgress.unlockedLocations.toSet();
    final newlyUnlocked =
        nextUnlockedLocations.where((l) => !prevLocSet.contains(l)).toList();

    final updatedProgress = OceanQuestProgressModel(
      uid: uid,
      unlockedLocations: nextUnlockedLocations,
      completedMissions: completedSet.toList(),
      missionBestScores: bestScores,
      missionStars: missionStars,
      seenQuestionIds: nextSeen,
      wrongQuestionIds: nextWrong,
      crystals: currentProgress.crystals + crystalsAwarded,
      totalQuestXp: currentProgress.totalQuestXp + xpAwarded,
      questBadges: badgesSet.toList(),
      dailyCompletions: dailySet.toList(),
      totalRuns: currentProgress.totalRuns + 1,
      totalCorrect: currentProgress.totalCorrect + safeCorrect,
      totalAttempted: currentProgress.totalAttempted + safeTotal,
      updatedAt: nowIso,
    );

    await _saveLocalOceanQuestProgress(uid, updatedProgress);

    if (uid.isNotEmpty) {
      // 1. Write immutable claim doc first if eligible
      if (passed && canGrantFullClaim) {
        try {
          await _db.collection('oceanQuestClaims').doc(safeClaimId).set({
            'claimId': safeClaimId,
            'userId': uid,
            'missionId': missionId,
            'claimType': claimType,
            'xpEarned': xpAwarded.clamp(0, 600),
            'coinsEarned': coinsAwarded.clamp(0, 300),
            'crystalsEarned': crystalsAwarded.clamp(0, 100),
            'accuracy': accuracy,
            'claimedAt': nowIso,
          });
        } catch (_) {}
      }

      // 2. Persist Ocean Quest progress doc
      try {
        await _db
            .collection('oceanQuestProgress')
            .doc(uid)
            .set(updatedProgress.toMap());
      } catch (_) {}

      // 3. Merge missed questions into shared PYQ revision list safely
      if (wrongIds.isNotEmpty) {
        try {
          final upRef = _db.collection('userProgress').doc(uid);
          final upSnap = await upRef.get();
          final existing = upSnap.data() ?? <String, dynamic>{};
          final revSet = {
            ...(existing['revisionListIds'] as List<dynamic>? ?? [])
                .map((e) => e.toString()),
            ...wrongIds,
          }.take(1000).toList();
          await upRef.set({
            'uid': uid,
            'completedLessonIds': List<dynamic>.from(
                existing['completedLessonIds'] as List? ?? []),
            'completedTopics':
                List<dynamic>.from(existing['completedTopics'] as List? ?? []),
            'totalStudyMinutes': int.tryParse(
                    (existing['totalStudyMinutes'] ?? 0).toString()) ??
                0,
            if (existing['subjectProgress'] is Map)
              'subjectProgress': existing['subjectProgress'],
            if (existing['difficultQuestionIds'] is List)
              'difficultQuestionIds': existing['difficultQuestionIds'],
            if (existing['pyqAttempts'] is Map)
              'pyqAttempts': existing['pyqAttempts'],
            'lastStudiedAt': nowIso,
            'revisionListIds': revSet,
          });
        } catch (_) {}
      }

      // 4. Increment user XP, coins, subject stats & earned badge without wiping fields
      try {
        final userUpdates = <String, dynamic>{
          'questionsAttempted': FieldValue.increment(safeTotal),
          'questionsCorrect': FieldValue.increment(safeCorrect),
          'xp': FieldValue.increment(xpAwarded),
          'totalPoints': FieldValue.increment(xpAwarded),
          'coins': FieldValue.increment(coinsAwarded),
          'updatedAt': nowIso,
        };
        if (unlockedBadgeId != null) {
          userUpdates['earnedBadges'] =
              FieldValue.arrayUnion([unlockedBadgeId]);
        }
        subjectDelta.forEach((sub, counts) {
          if ([
            'quant',
            'reasoning',
            'english',
            'ga',
            'computer',
            'statistics',
          ].contains(sub)) {
            final att = counts['attempted'] ?? 0;
            final cor = counts['correct'] ?? 0;
            if (att > 0) {
              userUpdates['subjectStats.$sub.attempted'] =
                  FieldValue.increment(att);
            }
            if (cor > 0) {
              userUpdates['subjectStats.$sub.correct'] =
                  FieldValue.increment(cor);
            }
          }
        });
        await _db.collection('users').doc(uid).update(userUpdates);
      } catch (_) {}

      // 5. Log game session & game score
      final ts = DateTime.now().millisecondsSinceEpoch;
      try {
        await _db.collection('gameSessions').doc('oqs_$ts').set({
          'userId': uid,
          'gameMode': 'ocean-quest',
          'score': score,
          'xpEarned': xpAwarded,
          'coinsEarned': coinsAwarded,
          'accuracy': accuracy,
          'createdAt': nowIso,
        });
        await _db.collection('gameScores').doc('oqg_$ts').set({
          'userId': uid,
          'gameId': missionId.length > 60 ? missionId.substring(0, 60) : missionId,
          'gameTitle': (mission['title'] ?? 'Ocean Quest')
              .toString()
              .substring(
                0,
                (mission['title'] ?? 'Ocean Quest').toString().length > 120
                    ? 120
                    : (mission['title'] ?? 'Ocean Quest').toString().length,
              ),
          'score': score,
          'xpEarned': xpAwarded,
          'coinsEarned': coinsAwarded,
          'accuracy': accuracy,
          'completedAt': nowIso,
        });
      } catch (_) {}
    }

    return OceanQuestEvalResult(
      passed: passed,
      accuracy: accuracy,
      stars: stars,
      score: score,
      xpAwarded: xpAwarded,
      coinsAwarded: coinsAwarded,
      crystalsAwarded: crystalsAwarded,
      firstTimeClear: firstTimeClear,
      dailyClaimedToday: dailyClaimedToday,
      unlockedBadgeId: unlockedBadgeId,
      newlyUnlockedLocations: newlyUnlocked,
      updatedProgress: updatedProgress,
    );
  }

  String _tutorPrefsKey(String uid) => 'examora_tutor_chat_$uid';

  Future<List<Map<String, dynamic>>> loadAiTutorHistory(String uid) async {
    final prefs = await SharedPreferences.getInstance();
    final List<Map<String, dynamic>> merged = [];

    if (uid.isNotEmpty) {
      try {
        final snap = await _db
            .collection('aiTutorChats')
            .doc(uid)
            .collection('messages')
            .orderBy('timestamp', descending: false)
            .limit(60)
            .get();
        for (final d in snap.docs) {
          final dt = d.data();
          merged.add({
            'messageId': (dt['messageId'] ?? d.id).toString(),
            'role': dt['role'] == 'user' ? 'user' : 'assistant',
            'message': (dt['message'] ?? '').toString(),
            'timestamp': (dt['timestamp'] ?? '').toString(),
            'language': (dt['language'] ?? 'en').toString(),
          });
        }
      } catch (_) {}
    }

    if (merged.isEmpty) {
      final raw = prefs.getString(_tutorPrefsKey(uid));
      if (raw != null && raw.isNotEmpty) {
        try {
          final list = jsonDecode(raw);
          if (list is List) {
            for (final item in list) {
              if (item is Map) merged.add(Map<String, dynamic>.from(item));
            }
          }
        } catch (_) {}
      }
    } else {
      try {
        await prefs.setString(_tutorPrefsKey(uid), jsonEncode(merged));
      } catch (_) {}
    }
    return merged;
  }

  Future<void> saveAiTutorMessage({
    required String uid,
    required String messageId,
    required String role,
    required String message,
    required String language,
    required String timestamp,
  }) async {
    final cleanMsg = message.trim();
    if (cleanMsg.isEmpty) return;
    final clippedMsg =
        cleanMsg.length > 7900 ? cleanMsg.substring(0, 7900) : cleanMsg;
    final safeLang =
        ['en', 'ml', 'manglish', 'hi', 'ta'].contains(language)
            ? language
            : 'en';
    final safeId = messageId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');

    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = await loadAiTutorHistory(uid);
      final updated = [
        ...existing.where((m) => m['messageId'] != safeId),
        {
          'messageId': safeId,
          'role': role == 'user' ? 'user' : 'assistant',
          'message': clippedMsg,
          'timestamp': timestamp,
          'language': safeLang,
        },
      ];
      final trimmed =
          updated.length > 60 ? updated.sublist(updated.length - 60) : updated;
      await prefs.setString(_tutorPrefsKey(uid), jsonEncode(trimmed));
    } catch (_) {}

    if (uid.isNotEmpty) {
      try {
        await _db
            .collection('aiTutorChats')
            .doc(uid)
            .collection('messages')
            .doc(safeId)
            .set({
          'messageId': safeId,
          'role': role == 'user' ? 'user' : 'assistant',
          'message': clippedMsg,
          'timestamp': timestamp,
          'language': safeLang,
        });
      } catch (_) {}
    }
  }

  Future<void> clearAiTutorHistory(String uid) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tutorPrefsKey(uid));
    } catch (_) {}
    if (uid.isNotEmpty) {
      try {
        final snap = await _db
            .collection('aiTutorChats')
            .doc(uid)
            .collection('messages')
            .limit(80)
            .get();
        if (snap.docs.isNotEmpty) {
          final batch = _db.batch();
          for (final d in snap.docs) {
            batch.delete(d.reference);
          }
          await batch.commit();
        }
      } catch (_) {}
    }
  }

  Future<String> askAiTutor({
    required String message,
    required String language,
    String? contextTopic,
    String? subject,
    String? mode,
    String? difficultyLevel,
    String? systemPrompt,
    List<Map<String, String>>? history,
  }) async {
    try {
      final callable = _functions.httpsCallable('askExamoraTutor');
      final res = await callable.call({
        'message': message,
        'language': language,
        if (contextTopic != null && contextTopic.isNotEmpty) 'topic': contextTopic,
        if (subject != null && subject.isNotEmpty) 'subject': subject,
        if (mode != null && mode.isNotEmpty) 'mode': mode,
        if (difficultyLevel != null && difficultyLevel.isNotEmpty)
          'difficultyLevel': difficultyLevel,
        if (systemPrompt != null && systemPrompt.isNotEmpty)
          'systemPrompt': systemPrompt,
        if (history != null && history.isNotEmpty) 'history': history,
      });
      final data = Map<String, dynamic>.from(res.data as Map);
      final reply = (data['reply'] ?? data['answer'] ?? '').toString().trim();
      if (reply.isNotEmpty) return reply;
    } catch (_) {
      // Fallback to structured study guidance below without surfacing technical details.
    }

    final topicName = (contextTopic != null && contextTopic.isNotEmpty)
        ? contextTopic
        : 'SSC CGL Core Topic';
    final levelLabel = (difficultyLevel != null && difficultyLevel.isNotEmpty)
        ? difficultyLevel
        : 'Easy -> Exam Level';
    final activeMode = (mode ?? 'teach').toLowerCase();

    if (language == 'manglish') {
      if (activeMode == 'practice' || activeMode == 'pyq') {
        return 'Topic: $topicName ($levelLabel)\n\n'
            'Practice Check (GENERATED_PRACTICE — AI SSC-pattern drill):\n'
            '1. Question-il thannirikkunna values aadyam ezhutuka.\n'
            '2. Base value epozhum 100% allenkil simple ratio aayi edukkaam.\n'
            '3. Ninte option (A/B/C/D) type cheyyu — shari aanel next level-ilekku povaam, thettiyaal enthukond thettiyennu njan explain cheythu tharaam!';
      }
      if (activeMode == 'revision') {
        return 'Revision Focus: $topicName\n\n'
            '1. Core Rule: Ee topic-ile main formula oru thavana koodi manassil urappikku.\n'
            '2. Common Trap: Sign mistakes (+ / −), unit conversion, allenkil wrong base value edukkaruthu.\n'
            '3. Quick Check: "$message"\n'
            'Ninte doubt allenkil answer step ivide type cheyyu — namukk athu clear aakkaam.';
      }
      return 'Topic: $topicName ($levelLabel)\n\n'
          '1. Easy Explanation:\n'
          '"$topicName" SSC CGL Tier 1 & Tier 2-il regular aayi varunna scoring topic aanu. Concept simple aayi manassilaakkiyaal 20–30 seconds-il answer kittum.\n\n'
          '2. Core Rule & Worked Example:\n'
          '• Given values ratio/fraction aakki maattuka.\n'
          '• Step-by-step verify cheythittu mathram final option mark cheyyuka.\n\n'
          '3. Shortcut & Warning:\n'
          '• Shortcut upayogikkumpol conditions (same base / equal time) check cheyyanam; allenkil normal method thanne safe aanu.\n\n'
          '4. Common Mistake:\n'
          '• Question-il "of" ennathinte base maaripokaruthu.\n\n'
          'Ninte doubt ("$message") manassilaayo? Venamenkil oru 1-question practice check tharaam!';
    }

    final topicLine = topicName.isNotEmpty ? 'Topic Focus: $topicName ($levelLabel)\n\n' : '';
    switch (language) {
      case 'ml':
        return '${topicLine}Examora Study Guide (Malayalam):\n1. ചോദ്യം വ്യക്തമായി വായിച്ച് നൽകിയ മൂല്യങ്ങൾ കുറിക്കുക.\n2. അനുപാതം / ശതമാനം / അടിസ്ഥാന ഫോർമുല ഉപയോഗിച്ച് വേഗത്തിൽ പരിഹരിക്കുക.\n3. Common mistake ഒഴിവാക്കി ഉത്തരം ഓപ്ഷനുകളുമായി ഒത്തുനോക്കുക.\n\nചോദ്യം: "$message" — വേണമെങ്കിൽ ഓപ്ഷനുകൾ കൂടി നൽകൂ, ഞാൻ ഘട്ടം ഘട്ടമായി വിശദീകരിക്കാം.';
      case 'hi':
        return '${topicLine}Examora स्टडी गाइड (Hindi):\n1. प्रश्न में दिए गए मुख्य मान और शर्तें पहचानें।\n2. अनुपात, प्रतिशत या शॉर्ट ट्रिक फॉर्मूला लागू करें और सावधानी से जांचें।\n3. अंतिम उत्तर को विकल्पों से मिलाकर सत्यापित करें।\n\nआपका प्रश्न: "$message" — यदि आप विकल्प साझा करें तो मैं चरण-दर-चरण हल दे सकता हूँ।';
      case 'ta':
        return '${topicLine}Examora கற்றல் வழிகாட்டி (Tamil):\n1. கேள்வியில் உள்ள முக்கிய மதிப்புகளை முதலில் அடையாளம் காண்க.\n2. சதவீதம், விகிதம் அல்லது குறுக்கு வழியைப் பயன்படுத்தி தீர்க்கவும்.\n3. பொதுவான பிழைகளைத் தவிர்த்து விடையை உறுதிப்படுத்தவும்.\n\nகேள்வி: "$message" — விருப்பங்களைப் பகிர்ந்தால் படிப்படியாக விளக்குகிறேன்.';
      default:
        return '${topicLine}Examora Structured Teacher Guide:\n1. Easy Concept: Break "$topicName" into given values and target quantity.\n2. Core Rule & Example: Apply the standard ratio/multiplier or grammar check step by step.\n3. Shortcut + Caution: Use shortcuts only when base conditions hold; otherwise verify via basic steps.\n4. Quick Check: Share your 4 options or attempt for "$message" and I will analyse any mistake.';
    }
  }

  // ---------------- ADMIN ANALYTICS & MANAGEMENT ----------------

  Future<List<Map<String, dynamic>>> fetchAllStudents() async {
    final snap = await _db.collection('users').limit(250).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllTestAttempts() async {
    final snap = await _db.collection('testAttempts').limit(400).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllQuestions() async {
    final List<Map<String, dynamic>> collected = [];
    DocumentSnapshot<Map<String, dynamic>>? cursor;
    const batchSize = 200;

    while (true) {
      Query<Map<String, dynamic>> q =
          _db.collection('questions').orderBy(FieldPath.documentId).limit(batchSize);
      if (cursor != null) {
        q = q.startAfterDocument(cursor);
      }
      final snap = await q.get();
      for (final d in snap.docs) {
        collected.add({'id': d.id, ...d.data()});
      }
      if (snap.docs.length < batchSize) break;
      cursor = snap.docs.last;
    }
    return collected;
  }

  Future<List<Map<String, dynamic>>> fetchAllCourses() async {
    final snap = await _db.collection('courses').limit(100).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllVideos() async {
    final snap = await _db.collection('videoLessons').limit(150).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllMockTests() async {
    final snap = await _db.collection('mockTests').limit(100).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllOceanQuestMissions() async {
    final snap = await _db.collection('oceanQuestMissions').limit(200).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<List<Map<String, dynamic>>> fetchAllOceanQuestProgress() async {
    final snap = await _db.collection('oceanQuestProgress').limit(250).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<void> setStudentActiveStatus(String uid, bool isActive) async {
    await _db.collection('users').doc(uid).update({
      'isActive': isActive,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Map<String, dynamic> _sanitizeQuestionPayload(
    String id,
    Map<String, dynamic> raw,
  ) {
    final sourceType = (raw['sourceType'] ?? 'PYQ').toString() == 'AI_GENERATED'
        ? 'AI_GENERATED'
        : 'PYQ';
    final rawAnswerStatus = (raw['answerStatus'] ?? '').toString();
    final String answerStatus;
    final bool isVerified;
    if (sourceType == 'AI_GENERATED') {
      answerStatus = 'needs_verification';
      isVerified = false;
    } else if (rawAnswerStatus == 'official') {
      answerStatus = 'official';
      isVerified = true;
    } else if (rawAnswerStatus == 'unofficial') {
      answerStatus = 'unofficial';
      isVerified = raw['isVerified'] == true;
    } else if (rawAnswerStatus == 'needs_verification') {
      answerStatus = 'needs_verification';
      isVerified = false;
    } else {
      isVerified = raw['isVerified'] == true;
      answerStatus = isVerified ? 'official' : 'needs_verification';
    }

    final int? qNum = int.tryParse((raw['questionNumber'] ?? '').toString());
    final String examDate = (raw['examDate'] ?? '').toString().trim();
    final String shift = (raw['shift'] ?? '').toString().trim();
    final String questionHi = (raw['questionHi'] ?? '').toString().trim();
    final String shortcutMethod =
        (raw['shortcutMethod'] ?? '').toString().trim();
    final String sourceLabel = (raw['sourceLabel'] ?? '').toString().trim();
    final List<String> stepByStep = (raw['stepByStep'] is List)
        ? (raw['stepByStep'] as List)
            .map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .take(20)
            .toList()
        : <String>[];

    final optionsList = (raw['optionsEn'] is List &&
            (raw['optionsEn'] as List).length == 4)
        ? (raw['optionsEn'] as List).map((e) => e.toString()).toList()
        : ['Option A', 'Option B', 'Option C', 'Option D'];

    final payload = <String, dynamic>{
      'id': id,
      'subject': (raw['subject'] ?? 'quant').toString(),
      'topic': (raw['topic'] ?? 'General').toString(),
      'year': int.tryParse((raw['year'] ?? 2024).toString()) ?? 2024,
      'tier': (raw['tier'] ?? 'Tier 1').toString(),
      'difficulty': (raw['difficulty'] ?? 'Medium').toString(),
      'sourceType': sourceType,
      'answerStatus': answerStatus,
      'isVerified': isVerified,
      'isPublished': raw['isPublished'] != false,
      'questionEn': (raw['questionEn'] ?? '').toString().trim(),
      'optionsEn': optionsList,
      'correctIndex':
          (int.tryParse((raw['correctIndex'] ?? 0).toString()) ?? 0).clamp(0, 3),
      'explanations': raw['explanations'] is Map
          ? raw['explanations']
          : {'en': '', 'ml': '', 'hi': '', 'ta': ''},
    };
    if (qNum != null && qNum >= 1 && qNum <= 5000) {
      payload['questionNumber'] = qNum;
    }
    if (examDate.isNotEmpty) payload['examDate'] = examDate;
    if (shift.isNotEmpty) payload['shift'] = shift;
    if (questionHi.isNotEmpty) payload['questionHi'] = questionHi;
    if (shortcutMethod.isNotEmpty) payload['shortcutMethod'] = shortcutMethod;
    if (sourceLabel.isNotEmpty) payload['sourceLabel'] = sourceLabel;
    if (stepByStep.isNotEmpty) payload['stepByStep'] = stepByStep;
    return payload;
  }

  Future<void> upsertQuestion(String id, Map<String, dynamic> payload) async {
    final safeId = id.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
    final clean = _sanitizeQuestionPayload(safeId, payload);
    await _db
        .collection('questions')
        .doc(safeId)
        .set(clean, SetOptions(merge: true));
  }

  Future<void> deleteQuestion(String id) async {
    await _db.collection('questions').doc(id).delete();
  }

  QuestionImportValidationResult parseAndValidateQuestions(String rawContent) {
    final trimmed = rawContent.trim();
    final List<Map<String, dynamic>> valid = [];
    final List<String> warnings = [];
    int totalRows = 0;

    if (trimmed.isEmpty) {
      return const QuestionImportValidationResult(
        totalRows: 0,
        validQuestions: [],
        warnings: ['Uploaded file is empty.'],
      );
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        final decoded = jsonDecode(trimmed);
        final List<dynamic> list = decoded is List
            ? decoded
            : (decoded['questions'] as List<dynamic>? ?? []);
        totalRows = list.length;
        for (int i = 0; i < list.length; i++) {
          final item = list[i];
          if (item is! Map) {
            warnings.add('Item #${i + 1}: Not a valid question object.');
            continue;
          }
          final map = Map<String, dynamic>.from(item);
          final qText =
              (map['questionEn'] ?? map['question'] ?? '').toString().trim();
          final correctIndex =
              int.tryParse((map['correctIndex'] ?? 0).toString()) ?? 0;

          if (qText.isEmpty) {
            warnings.add('Item #${i + 1}: Missing question text.');
            continue;
          }
          if (correctIndex < 0 || correctIndex > 3) {
            warnings.add('Item #${i + 1}: correctIndex must be 0..3.');
            continue;
          }
          final rawId =
              (map['id'] ?? 'imp_${DateTime.now().millisecondsSinceEpoch}_$i')
                  .toString();
          final safeId = rawId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
          final rawSteps = map['stepByStep'];
          final List<String> steps = rawSteps is List
              ? rawSteps.map((e) => e.toString().trim()).toList()
              : (rawSteps is String && rawSteps.trim().isNotEmpty
                  ? rawSteps
                      .split('|')
                      .map((e) => e.trim())
                      .where((e) => e.isNotEmpty)
                      .toList()
                  : <String>[]);
          valid.add(
            _sanitizeQuestionPayload(safeId, {
              ...map,
              'id': safeId,
              'questionEn': qText,
              'correctIndex': correctIndex,
              if (steps.isNotEmpty) 'stepByStep': steps,
              'explanations': map['explanations'] ??
                  {'en': map['explanation'] ?? '', 'ml': '', 'hi': '', 'ta': ''},
            }),
          );
        }
      } catch (e) {
        warnings.add('JSON parse error: $e');
      }
    } else {
      final rows = const CsvToListConverter().convert(trimmed);
      totalRows = rows.length > 1 ? rows.length - 1 : 0;
      for (int i = 1; i < rows.length; i++) {
        final r = rows[i];
        if (r.length < 10) {
          warnings.add('Row ${i + 1}: Expected at least 10 columns.');
          continue;
        }
        final qText = r[5].toString().trim();
        if (qText.isEmpty) {
          warnings.add('Row ${i + 1}: Missing question text.');
          continue;
        }
        final correctIdx =
            int.tryParse(r.length > 10 ? r[10].toString() : '0') ?? 0;
        if (correctIdx < 0 || correctIdx > 3) {
          warnings.add('Row ${i + 1}: Answer index must be 0..3.');
          continue;
        }
        final id = 'csv_${DateTime.now().millisecondsSinceEpoch}_$i';
        final rawSteps = r.length > 17 ? r[17].toString() : '';
        final steps = rawSteps
            .split('|')
            .map((e) => e.trim())
            .where((e) => e.isNotEmpty)
            .toList();
        valid.add(
          _sanitizeQuestionPayload(id, {
            'id': id,
            'subject': r[0].toString().trim(),
            'topic': r[1].toString().trim(),
            'year': int.tryParse(r[2].toString()) ?? 2024,
            'tier': r[3].toString().trim(),
            'difficulty': r[4].toString().trim(),
            'sourceType': 'PYQ',
            'isVerified': r.length > 15
                ? r[15].toString().trim() == 'official'
                : false,
            'answerStatus': r.length > 15 && r[15].toString().trim().isNotEmpty
                ? r[15].toString().trim()
                : 'needs_verification',
            'isPublished': true,
            'questionEn': qText,
            'optionsEn': [
              r[6].toString(),
              r[7].toString(),
              r[8].toString(),
              r[9].toString(),
            ],
            'correctIndex': correctIdx,
            'explanations': {
              'en': r.length > 11 ? r[11].toString() : '',
              'ml': '',
              'hi': '',
              'ta': '',
            },
            if (r.length > 12) 'examDate': r[12].toString().trim(),
            if (r.length > 13) 'shift': r[13].toString().trim(),
            if (r.length > 14) 'questionNumber': r[14].toString().trim(),
            if (r.length > 16) 'shortcutMethod': r[16].toString().trim(),
            if (steps.isNotEmpty) 'stepByStep': steps,
          }),
        );
      }
    }

    return QuestionImportValidationResult(
      totalRows: totalRows,
      validQuestions: valid,
      warnings: warnings,
    );
  }

  Future<int> commitValidatedQuestions(List<Map<String, dynamic>> items) async {
    if (items.isEmpty) return 0;
    const chunkSize = 400;
    for (int i = 0; i < items.length; i += chunkSize) {
      final slice = items.sublist(
        i,
        (i + chunkSize) > items.length ? items.length : (i + chunkSize),
      );
      final batch = _db.batch();
      for (final q in slice) {
        final id = q['id'].toString();
        batch.set(_db.collection('questions').doc(id), q);
      }
      await batch.commit();
    }
    return items.length;
  }

  Future<int> bulkImportQuestionsFromCsvOrJson(String rawContent) async {
    final parsed = parseAndValidateQuestions(rawContent);
    return commitValidatedQuestions(parsed.validQuestions);
  }

  Future<void> upsertCourse(String courseId, Map<String, dynamic> payload) async {
    await _db
        .collection('courses')
        .doc(courseId)
        .set(payload, SetOptions(merge: true));
  }

  Future<void> deleteCourse(String courseId) async {
    await _db.collection('courses').doc(courseId).delete();
  }

  Future<void> upsertVideoLesson(String id, Map<String, dynamic> payload) async {
    await _db
        .collection('videoLessons')
        .doc(id)
        .set(payload, SetOptions(merge: true));
  }

  Future<void> deleteVideoLesson(String id) async {
    await _db.collection('videoLessons').doc(id).delete();
  }

  Future<void> upsertMockTest(String id, Map<String, dynamic> payload) async {
    await _db.collection('mockTests').doc(id).set(payload, SetOptions(merge: true));
  }

  Future<void> deleteMockTest(String id) async {
    await _db.collection('mockTests').doc(id).delete();
  }

  Future<void> upsertOceanQuestMission(
    String missionId,
    Map<String, dynamic> raw,
  ) async {
    final safeId = missionId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
    final mode = (raw['mode'] ?? 'treasure-hunt').toString();
    final validMode = [
      'treasure-hunt',
      'submarine-exploration',
      'crystal-rush',
      'boss-battle',
      'daily-challenge',
      'subject-mission',
    ].contains(mode)
        ? mode
        : 'treasure-hunt';
    final diff = (raw['difficulty'] ?? 'beginner').toString();
    final validDiff = ['beginner', 'intermediate', 'advanced'].contains(diff)
        ? diff
        : 'beginner';

    final payload = <String, dynamic>{
      'missionId': safeId,
      'locationId': (raw['locationId'] ?? 'coral-bay').toString(),
      'locationOrder':
          (int.tryParse((raw['locationOrder'] ?? 1).toString()) ?? 1)
              .clamp(1, 20),
      'title': (raw['title'] ?? 'Ocean Mission').toString().trim(),
      'description': (raw['description'] ?? '').toString().trim(),
      'mode': validMode,
      'difficulty': validDiff,
      'subject': (raw['subject'] ?? 'mixed').toString(),
      'questionCount':
          (int.tryParse((raw['questionCount'] ?? 5).toString()) ?? 5)
              .clamp(1, 30),
      'timeLimitSec':
          (int.tryParse((raw['timeLimitSec'] ?? 0).toString()) ?? 0)
              .clamp(0, 1800),
      'minAccuracyPct':
          (int.tryParse((raw['minAccuracyPct'] ?? 60).toString()) ?? 60)
              .clamp(0, 100),
      'hintLimit':
          (int.tryParse((raw['hintLimit'] ?? 2).toString()) ?? 2).clamp(0, 10),
      'xpReward':
          (int.tryParse((raw['xpReward'] ?? 100).toString()) ?? 100)
              .clamp(10, 600),
      'coinReward':
          (int.tryParse((raw['coinReward'] ?? 50).toString()) ?? 50)
              .clamp(5, 300),
      'crystalReward':
          (int.tryParse((raw['crystalReward'] ?? 5).toString()) ?? 5)
              .clamp(0, 100),
      if ((raw['badgeId'] ?? '').toString().trim().isNotEmpty)
        'badgeId': raw['badgeId'].toString().trim(),
      'prerequisiteMissionIds': (raw['prerequisiteMissionIds'] as List? ?? [])
          .map((e) => e.toString())
          .take(20)
          .toList(),
      'isBoss': raw['isBoss'] == true,
      if ((raw['guardianName'] ?? '').toString().trim().isNotEmpty)
        'guardianName': raw['guardianName'].toString().trim(),
      'isPublished': raw['isPublished'] != false,
      'order':
          (int.tryParse((raw['order'] ?? 1).toString()) ?? 1).clamp(0, 500),
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    };
    await _db
        .collection('oceanQuestMissions')
        .doc(safeId)
        .set(payload, SetOptions(merge: true));
  }

  Future<void> deleteOceanQuestMission(String missionId) async {
    await _db.collection('oceanQuestMissions').doc(missionId).delete();
  }

  // ---------------- REPORT EXPORT (CSV & EXCEL) ----------------

  Future<void> exportStudentsReport({
    required List<Map<String, dynamic>> students,
    required bool asExcel,
  }) async {
    final dir = await getTemporaryDirectory();
    final headers = [
      'Username',
      'Full Name',
      'Email',
      'Status',
      'XP',
      'Streak',
      'Mock Tests',
      'Questions Attempted',
      'Questions Correct',
      'Accuracy %',
      'Registered At',
    ];

    final rows = students.map((s) {
      final attempted = (s['questionsAttempted'] ?? 0) as int;
      final correct = (s['questionsCorrect'] ?? 0) as int;
      final acc = attempted > 0 ? ((correct * 100) ~/ attempted) : 0;
      return [
        (s['username'] ?? '').toString(),
        (s['displayName'] ?? '').toString(),
        (s['email'] ?? '').toString(),
        s['isActive'] != false ? 'Active' : 'Inactive',
        s['xp'] ?? 0,
        s['streak'] ?? 0,
        s['mockTestsCompleted'] ?? 0,
        attempted,
        correct,
        acc,
        (s['createdAt'] ?? '').toString(),
      ];
    }).toList();

    if (asExcel) {
      final excel = Excel.createExcel();
      final sheet = excel['Student Report'];
      sheet.appendRow(headers.map((h) => TextCellValue(h)).toList());
      for (final row in rows) {
        sheet.appendRow(
          row.map((cell) => TextCellValue(cell.toString())).toList(),
        );
      }
      final bytes = excel.encode()!;
      final file = File('${dir.path}/examora_student_report.xlsx');
      await file.writeAsBytes(bytes, flush: true);
      await Share.shareXFiles([XFile(file.path)], text: 'Examora Student Report');
    } else {
      final csvData = const ListToCsvConverter().convert([headers, ...rows]);
      final file = File('${dir.path}/examora_student_report.csv');
      await file.writeAsString(csvData, flush: true);
      await Share.shareXFiles([XFile(file.path)], text: 'Examora Student Report');
    }
  }

  // ---------------- FUTURE EXAM PREDICTOR ----------------

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedPredictorQuestions() {
    return _db
        .collection('predictorQuestions')
        .where('isPublished', isEqualTo: true)
        .limit(120)
        .snapshots();
  }

  Future<List<Map<String, dynamic>>> fetchAllPredictorQuestionsAdmin() async {
    final snap = await _db.collection('predictorQuestions').limit(150).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPredictorCategories() {
    return _db.collection('predictorCategories').limit(120).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPredictionReports() {
    return _db.collection('predictionReports').limit(60).snapshots();
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> streamPublishedCurrentAffairs() {
    return _db
        .collection('currentAffairs')
        .where('isPublished', isEqualTo: true)
        .limit(100)
        .snapshots();
  }

  Future<List<Map<String, dynamic>>> fetchAllCurrentAffairsAdmin() async {
    final snap = await _db.collection('currentAffairs').limit(100).get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  Future<void> savePredictorQuestionDraft({
    required String uid,
    required Map<String, dynamic> payload,
  }) async {
    final qId = (payload['questionId'] ??
            'pred_q_${DateTime.now().millisecondsSinceEpoch}')
        .toString();
    final safePayload = <String, dynamic>{
      'questionId': qId,
      'examYear': int.tryParse((payload['examYear'] ?? 2026).toString()) ?? 2026,
      'tier': (payload['tier'] ?? 'Tier 1').toString(),
      'subject': (payload['subject'] ?? 'quant').toString(),
      'topic': (payload['topic'] ?? 'General').toString(),
      'difficulty': (payload['difficulty'] ?? 'Medium').toString(),
      'questionEn': (payload['questionEn'] ?? '').toString(),
      'optionsEn': List<String>.from(payload['optionsEn'] as List? ?? []),
      'correctIndex':
          (int.tryParse((payload['correctIndex'] ?? 0).toString()) ?? 0)
              .clamp(0, 3),
      'explanation': (payload['explanation'] ?? '').toString(),
      'stepByStep': List<String>.from(payload['stepByStep'] as List? ?? []),
      'usefulnessReason': (payload['usefulnessReason'] ?? '').toString(),
      'sourceType': 'AI_GENERATED',
      'isOfficialPyq': false,
      'aiNoticeLabel':
          'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION',
      'reviewStatus': 'pending',
      'isPublished': false,
      if (uid.isNotEmpty) 'createdByUid': uid,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    };
    await _db.collection('predictorQuestions').doc(qId).set(safePayload);
  }

  Future<void> reviewPredictorQuestion({
    required String questionId,
    required String reviewStatus,
    String? questionEn,
    String? explanation,
  }) async {
    final isPub = reviewStatus == 'approved';
    await _db.collection('predictorQuestions').doc(questionId).update({
      'reviewStatus': reviewStatus,
      'isPublished': isPub,
      'isOfficialPyq': false,
      'sourceType': 'AI_GENERATED',
      'aiNoticeLabel':
          'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION',
      'reviewedAt': DateTime.now().toUtc().toIso8601String(),
      if (questionEn != null) 'questionEn': questionEn,
      if (explanation != null) 'explanation': explanation,
    });
  }

  Future<void> deletePredictorQuestion(String questionId) async {
    await _db.collection('predictorQuestions').doc(questionId).delete();
  }

  Future<void> upsertPredictorCategory(Map<String, dynamic> cat) async {
    final id = (cat['categoryId'] ?? cat['id'] ?? '').toString();
    if (id.isEmpty) return;
    await _db.collection('predictorCategories').doc(id).set({
      'categoryId': id,
      'topic': (cat['topic'] ?? '').toString(),
      'subject': (cat['subject'] ?? 'quant').toString(),
      'tier': (cat['tier'] ?? 'Tier 1').toString(),
      'targetYear': int.tryParse((cat['targetYear'] ?? 2026).toString()) ?? 2026,
      if (cat['priorityOverride'] != null)
        'priorityOverride': cat['priorityOverride'].toString(),
      'isOutdated': cat['isOutdated'] == true,
      if (cat['outdatedNote'] != null)
        'outdatedNote': cat['outdatedNote'].toString(),
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    }, SetOptions(merge: true));
  }

  Future<void> savePredictionReport(Map<String, dynamic> report) async {
    final id = (report['reportId'] ??
            report['id'] ??
            'rep_${DateTime.now().millisecondsSinceEpoch}')
        .toString();
    await _db.collection('predictionReports').doc(id).set({
      ...report,
      'reportId': id,
    }, SetOptions(merge: true));
  }

  Future<void> togglePredictionReportOutdated(
    String reportId,
    bool isOutdated,
  ) async {
    await _db
        .collection('predictionReports')
        .doc(reportId)
        .update({'isOutdated': isOutdated});
  }

  Future<void> upsertCurrentAffairsItem(Map<String, dynamic> item) async {
    final id = (item['articleId'] ??
            item['id'] ??
            'ca_${DateTime.now().millisecondsSinceEpoch}')
        .toString();
    await _db.collection('currentAffairs').doc(id).set({
      'articleId': id,
      'category': (item['category'] ?? 'National').toString(),
      'title': (item['title'] ?? '').toString(),
      'summary': (item['summary'] ?? '').toString(),
      'examRelevance': (item['examRelevance'] ?? '').toString(),
      'publishedDate': (item['publishedDate'] ?? '').toString(),
      'sourceName': (item['sourceName'] ?? 'Verified Source').toString(),
      'sourceUrl': (item['sourceUrl'] ?? 'https://www.pib.gov.in').toString(),
      'targetYear': int.tryParse((item['targetYear'] ?? 2026).toString()) ?? 2026,
      'isPublished': item['isPublished'] != false,
      'createdAt':
          (item['createdAt'] ?? DateTime.now().toUtc().toIso8601String())
              .toString(),
    }, SetOptions(merge: true));
  }

  Future<void> deleteCurrentAffairsItem(String articleId) async {
    await _db.collection('currentAffairs').doc(articleId).delete();
  }

  Future<void> savePredictorStudyPlan({
    required String uid,
    required double hoursPerDay,
    required String examTarget,
    required String examDate,
    required String preferredLanguage,
    required List<Map<String, dynamic>> blocks,
  }) async {
    if (uid.isEmpty) return;
    await _db.collection('studyPlans').doc(uid).set({
      'userId': uid,
      'hoursPerDay': hoursPerDay,
      'examTarget': examTarget,
      'examDate': examDate,
      'preferredLanguage': preferredLanguage,
      'blocks': blocks,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> generateExpectedQuestionsRemote({
    required int examYear,
    required String tier,
    required String subject,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    try {
      final callable = _functions.httpsCallable('generatePredictorQuestions');
      final res = await callable.call({
        'examYear': examYear,
        'tier': tier,
        'subject': subject,
        'topic': topic,
        'difficulty': difficulty,
        'count': count,
      });
      final data = Map<String, dynamic>.from(res.data as Map);
      final raw = data['questions'] as List<dynamic>? ?? [];
      return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }
}
