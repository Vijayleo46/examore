import 'dart:convert';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../firebase_options.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: DefaultFirebaseOptions.firestoreDatabaseId,
  );

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
    return q.limit(100).snapshots();
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

    batch.update(_db.collection('users').doc(uid), {
      'mockTestsCompleted': FieldValue.increment(1),
      'questionsAttempted': FieldValue.increment(correctCount + wrongCount),
      'questionsCorrect': FieldValue.increment(correctCount),
      'xp': FieldValue.increment(correctCount * 20),
      'updatedAt': nowIso,
    });

    await batch.commit();
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

  Future<void> setStudentActiveStatus(String uid, bool isActive) async {
    await _db.collection('users').doc(uid).update({
      'isActive': isActive,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<void> upsertQuestion(String id, Map<String, dynamic> payload) async {
    await _db.collection('questions').doc(id).set(payload, SetOptions(merge: true));
  }

  Future<void> deleteQuestion(String id) async {
    await _db.collection('questions').doc(id).delete();
  }

  Future<int> bulkImportQuestionsFromCsvOrJson(String rawContent) async {
    final trimmed = rawContent.trim();
    final batch = _db.batch();
    int count = 0;

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      final decoded = jsonDecode(trimmed);
      final List<dynamic> list = decoded is List
          ? decoded
          : (decoded['questions'] as List<dynamic>? ?? []);
      for (final item in list) {
        final map = Map<String, dynamic>.from(item as Map);
        final id = (map['id'] ?? 'imp_${DateTime.now().millisecondsSinceEpoch}_$count')
            .toString();
        batch.set(_db.collection('questions').doc(id), {
          'id': id,
          'subject': map['subject'] ?? 'quant',
          'topic': map['topic'] ?? 'General',
          'year': map['year'] ?? 2024,
          'tier': map['tier'] ?? 'Tier 1',
          'difficulty': map['difficulty'] ?? 'Medium',
          'sourceType': map['sourceType'] ?? 'PYQ',
          'isVerified': true,
          'isPublished': true,
          'questionEn': map['questionEn'] ?? map['question'] ?? '',
          'optionsEn': map['optionsEn'] ?? ['A', 'B', 'C', 'D'],
          'correctIndex': map['correctIndex'] ?? 0,
          'explanations': map['explanations'] ??
              {'en': map['explanation'] ?? '', 'ml': '', 'hi': '', 'ta': ''},
        });
        count++;
      }
    } else {
      final rows = const CsvToListConverter().convert(trimmed);
      for (int i = 1; i < rows.length; i++) {
        final r = rows[i];
        if (r.length < 10) continue;
        final id = 'csv_${DateTime.now().millisecondsSinceEpoch}_$i';
        batch.set(_db.collection('questions').doc(id), {
          'id': id,
          'subject': r[0].toString().trim(),
          'topic': r[1].toString().trim(),
          'year': int.tryParse(r[2].toString()) ?? 2024,
          'tier': r[3].toString().trim(),
          'difficulty': r[4].toString().trim(),
          'sourceType': 'PYQ',
          'isVerified': true,
          'isPublished': true,
          'questionEn': r[5].toString(),
          'optionsEn': [
            r[6].toString(),
            r[7].toString(),
            r[8].toString(),
            r[9].toString(),
          ],
          'correctIndex': int.tryParse(r.length > 10 ? r[10].toString() : '0') ?? 0,
          'explanations': {
            'en': r.length > 11 ? r[11].toString() : '',
            'ml': '',
            'hi': '',
            'ta': '',
          },
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    return count;
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
}
