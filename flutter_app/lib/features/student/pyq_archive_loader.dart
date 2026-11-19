import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class PyqArchiveLoader {
  static const String assetPath =
      'assets/data/ssc_cgl_past_papers_2016_2026.json';
  static const String aiPracticeAssetPath =
      'assets/data/ai_generated_practice.json';

  static List<Map<String, dynamic>>? _cachedBundled;
  static List<Map<String, dynamic>>? _cachedAiPractice;

  static String normalizeQuestionText(dynamic rawText) {
    return (rawText ?? '')
        .toString()
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Loads strictly authentic SSC CGL PYQs (`sourceType != 'AI_GENERATED'`),
  /// deduplicated by both question ID and normalized question text.
  static Future<List<Map<String, dynamic>>> loadBundledPastPapers() async {
    if (_cachedBundled != null) {
      return _cachedBundled!;
    }
    try {
      final raw = await rootBundle.loadString(assetPath);
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        final seenIds = <String>{};
        final seenTexts = <String>{};
        final normalized = <Map<String, dynamic>>[];
        for (final item in decoded) {
          if (item is Map) {
            final map = Map<String, dynamic>.from(item);
            if ((map['sourceType'] ?? 'PYQ').toString() == 'AI_GENERATED') {
              continue;
            }
            final id = (map['id'] ?? '').toString().trim();
            final normText = normalizeQuestionText(map['questionEn']);
            if (id.isEmpty || normText.isEmpty) continue;
            if (seenIds.contains(id) || seenTexts.contains(normText)) continue;
            seenIds.add(id);
            seenTexts.add(normText);
            map['sourceType'] = 'PYQ';
            normalized.add(map);
          }
        }
        _cachedBundled = normalized;
        return normalized;
      }
    } catch (_) {
      // Return empty list gracefully if asset unavailable in unit environment.
    }
    return const [];
  }

  /// Loads separated AI-generated expected practice questions (never mixed into PYQ library).
  static Future<List<Map<String, dynamic>>> loadBundledAiPractice() async {
    if (_cachedAiPractice != null) {
      return _cachedAiPractice!;
    }
    try {
      final raw = await rootBundle.loadString(aiPracticeAssetPath);
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        final normalized = <Map<String, dynamic>>[];
        for (final item in decoded) {
          if (item is Map) {
            final map = Map<String, dynamic>.from(item);
            map['sourceType'] = 'AI_GENERATED';
            map['isVerified'] = false;
            normalized.add(map);
          }
        }
        _cachedAiPractice = normalized;
        return normalized;
      }
    } catch (_) {}
    return const [];
  }

  /// Merges bundled PYQs and remote Firestore questions cleanly, preventing duplicates
  /// by both document ID and normalized question text, and optionally filtering AI items.
  static List<Map<String, dynamic>> mergeWithFirestore(
    List<Map<String, dynamic>> bundled,
    List<Map<String, dynamic>> remote, {
    bool includeAiGenerated = false,
  }) {
    final byId = <String, Map<String, dynamic>>{};
    final seenTextToId = <String, String>{};

    void ingest(Map<String, dynamic> q, {required bool isRemote}) {
      final sourceType = (q['sourceType'] ?? 'PYQ').toString();
      if (!includeAiGenerated && sourceType == 'AI_GENERATED') {
        return;
      }
      final id = (q['id'] ?? '').toString().trim();
      final normText = normalizeQuestionText(q['questionEn']);
      if (id.isEmpty || normText.isEmpty) return;

      final existingIdForText = seenTextToId[normText];
      if (existingIdForText != null && existingIdForText != id) {
        if (isRemote) {
          // Prefer official/verified status if replacing, otherwise keep existing key
          final existing = byId[existingIdForText];
          final newOfficial = (q['answerStatus'] ?? '') == 'official';
          final oldOfficial = (existing?['answerStatus'] ?? '') == 'official';
          if (newOfficial && !oldOfficial) {
            byId.remove(existingIdForText);
            byId[id] = q;
            seenTextToId[normText] = id;
          }
        }
        return;
      }

      byId[id] = q;
      seenTextToId[normText] = id;
    }

    for (final q in bundled) {
      ingest(q, isRemote: false);
    }
    for (final q in remote) {
      ingest(q, isRemote: true);
    }

    final list = byId.values.toList();
    list.sort((a, b) {
      final yb = int.tryParse((b['year'] ?? 0).toString()) ?? 0;
      final ya = int.tryParse((a['year'] ?? 0).toString()) ?? 0;
      if (yb != ya) return yb.compareTo(ya);
      final nb = int.tryParse((b['questionNumber'] ?? 9999).toString()) ?? 9999;
      final na = int.tryParse((a['questionNumber'] ?? 9999).toString()) ?? 9999;
      return na.compareTo(nb);
    });
    return list;
  }

  static List<Map<String, dynamic>> buildMockSet({
    required List<Map<String, dynamic>> pool,
    int? year,
    String tier = 'Tier 1',
    String subject = 'all',
    int limit = 25,
  }) {
    final filtered = pool.where((q) {
      if (q['isPublished'] == false) return false;
      if (year != null) {
        final qy = int.tryParse((q['year'] ?? '').toString());
        if (qy != year) return false;
      }
      if (tier != 'all' && (q['tier'] ?? 'Tier 1').toString() != tier) {
        return false;
      }
      if (subject != 'all' && (q['subject'] ?? '').toString() != subject) {
        return false;
      }
      return true;
    }).toList();

    if (subject != 'all') {
      return filtered.take(limit).toList();
    }

    final buckets = <String, List<Map<String, dynamic>>>{
      'quant': [],
      'reasoning': [],
      'english': [],
      'ga': [],
      'computer': [],
      'statistics': [],
    };
    for (final q in filtered) {
      final s = (q['subject'] ?? 'quant').toString();
      buckets.putIfAbsent(s, () => []).add(q);
    }

    final order = tier == 'Tier 2'
        ? const ['quant', 'reasoning', 'english', 'ga', 'computer', 'statistics']
        : const ['quant', 'reasoning', 'english', 'ga'];

    final picked = <Map<String, dynamic>>[];
    var round = 0;
    while (picked.length < limit && round < 50) {
      var added = false;
      for (final s in order) {
        final bucket = buckets[s];
        if (bucket != null && bucket.isNotEmpty) {
          picked.add(bucket.removeAt(0));
          added = true;
          if (picked.length >= limit) break;
        }
      }
      if (!added) break;
      round++;
    }
    return picked;
  }
}
