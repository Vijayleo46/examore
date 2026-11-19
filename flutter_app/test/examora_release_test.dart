import 'package:examora/features/student/pyq_archive_loader.dart';
import 'package:examora/features/student/ssc_master_curriculum.dart';
import 'package:examora/services/local_notification_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Examora Syllabus & Language Coverage', () {
    test('covers all 6 SSC CGL subjects including Statistics (JSO Paper II)', () {
      final ids = sscMasterSubjects.map((s) => s.id).toSet();
      expect(
        ids,
        containsAll([
          'quant',
          'reasoning',
          'english',
          'ga',
          'computer',
          'statistics',
        ]),
      );

      for (final subjectId in ids) {
        final topics = getSyllabusTopicsForSubject(subjectId);
        expect(topics, isNotEmpty, reason: 'Expected topics for $subjectId');
      }
    });

    test('includes English, Malayalam, Manglish, Hindi, and Tamil tutor languages', () {
      final codes = sscTeachingLanguages.map((l) => l.code).toSet();
      expect(codes, containsAll(['en', 'ml', 'manglish', 'hi', 'ta']));
    });
  });

  group('PYQ Archive Loader & Separation', () {
    test('separates authentic PYQs from AI_GENERATED items and deduplicates normalized text', () {
      final bundled = [
        {
          'id': 'q1',
          'subject': 'quant',
          'tier': 'Tier 1',
          'year': 2024,
          'questionEn': 'What is 15% of 200?',
          'sourceType': 'PYQ',
          'answerStatus': 'official',
        },
        {
          'id': 'q-ai',
          'subject': 'quant',
          'tier': 'Tier 1',
          'year': 2024,
          'questionEn': 'AI expected question on Ratio',
          'sourceType': 'AI_GENERATED',
        },
      ];
      final remote = [
        {
          'id': 'q1-dup',
          'subject': 'quant',
          'tier': 'Tier 1',
          'year': 2024,
          'questionEn': '  what is   15%   of 200? ',
          'sourceType': 'PYQ',
          'answerStatus': 'tentative',
        },
        {
          'id': 'q2',
          'subject': 'statistics',
          'tier': 'Tier 2',
          'year': 2025,
          'questionEn': 'Mean of 2, 4, 6 is:',
          'sourceType': 'PYQ',
          'answerStatus': 'official',
        },
      ];

      final merged = PyqArchiveLoader.mergeWithFirestore(bundled, remote);
      expect(merged.length, 2);
      expect(merged.any((q) => q['id'] == 'q-ai'), isFalse);
      expect(merged.any((q) => q['id'] == 'q1-dup'), isFalse);
    });

    test('buildMockSet balances subjects across Tier 1 and Tier 2', () {
      final pool = [
        {'id': 'a', 'subject': 'quant', 'tier': 'Tier 1', 'questionEn': 'Q1'},
        {'id': 'b', 'subject': 'reasoning', 'tier': 'Tier 1', 'questionEn': 'Q2'},
        {'id': 'c', 'subject': 'english', 'tier': 'Tier 1', 'questionEn': 'Q3'},
        {'id': 'd', 'subject': 'ga', 'tier': 'Tier 1', 'questionEn': 'Q4'},
        {'id': 'e', 'subject': 'statistics', 'tier': 'Tier 2', 'questionEn': 'Q5'},
      ];

      final t1 = PyqArchiveLoader.buildMockSet(pool: pool, tier: 'Tier 1', limit: 4);
      expect(t1.length, 4);

      final t2 = PyqArchiveLoader.buildMockSet(pool: pool, tier: 'Tier 2', limit: 4);
      expect(t2.length, 1);
      expect(t2.first['subject'], 'statistics');
    });

    test('bundled PYQ asset loads strictly PYQs with zero duplicates', () async {
      final bundled = await PyqArchiveLoader.loadBundledPastPapers();
      expect(bundled, isNotEmpty);
      expect(
        bundled.every((q) => (q['sourceType'] ?? 'PYQ') != 'AI_GENERATED'),
        isTrue,
      );
      final normalizedTexts =
          bundled.map((q) => PyqArchiveLoader.normalizeQuestionText(q['questionEn'])).toSet();
      expect(normalizedTexts.length, bundled.length);
    });
  });

  group('SSC CGL Negative Marking & Ocean Study Tide Copy', () {
    test('calculates Tier 1 +2 / -0.5 scoring and collects wrong question IDs', () {
      final questions = [
        {'id': 'q1', 'correctIndex': 1},
        {'id': 'q2', 'correctIndex': 2},
        {'id': 'q3', 'correctIndex': 0},
        {'id': 'q4', 'correctIndex': 3},
      ];
      final userAnswers = {0: 1, 1: 0, 2: 0}; // q4 skipped

      var correct = 0;
      var wrong = 0;
      var skipped = 0;
      final wrongIds = <String>[];

      for (var i = 0; i < questions.length; i++) {
        final chosen = userAnswers[i];
        final ans = questions[i]['correctIndex'] as int;
        if (chosen == null) {
          skipped++;
        } else if (chosen == ans) {
          correct++;
        } else {
          wrong++;
          wrongIds.add(questions[i]['id'] as String);
        }
      }

      final score = (correct * 2.0) - (wrong * 0.5);
      expect(correct, 2);
      expect(wrong, 1);
      expect(skipped, 1);
      expect(score, 3.5);
      expect(wrongIds, ['q2']);
    });

    test('builds gentle ocean-themed reminder copy based on Today Study Goal', () {
      final copy = LocalNotificationService.buildGoalReminderCopy(
        displayName: 'Ananya Nair',
        username: 'ananya',
        studiedMinutes: 30,
        goalMinutes: 60,
        streak: 5,
      );
      expect(copy.goalPercent, 50);
      expect(copy.title, contains('30 min left'));
      expect(copy.body, contains('@ananya'));
    });
  });
}
