import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class PyqArchiveLoader {
  static const String assetPath =
      'assets/data/ssc_cgl_past_papers_2016_2026.json';
  static List<Map<String, dynamic>>? _cachedBundled;

  static Future<List<Map<String, dynamic>>> loadBundledPastPapers() async {
    if (_cachedBundled != null) {
      return _cachedBundled!;
    }
    try {
      final raw = await rootBundle.loadString(assetPath);
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        final normalized = <Map<String, dynamic>>[];
        for (final item in decoded) {
          if (item is Map) {
            normalized.add(Map<String, dynamic>.from(item));
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

  static List<Map<String, dynamic>> mergeWithFirestore(
    List<Map<String, dynamic>> bundled,
    List<Map<String, dynamic>> remote,
  ) {
    final merged = <String, Map<String, dynamic>>{};
    for (final q in bundled) {
      final id = (q['id'] ?? '').toString();
      if (id.isNotEmpty) {
        merged[id] = q;
      }
    }
    for (final q in remote) {
      final id = (q['id'] ?? '').toString();
      if (id.isNotEmpty) {
        merged[id] = q;
      }
    }
    final list = merged.values.toList();
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
    };
    for (final q in filtered) {
      final s = (q['subject'] ?? 'quant').toString();
      buckets.putIfAbsent(s, () => []).add(q);
    }

    final order = tier == 'Tier 2'
        ? const ['quant', 'reasoning', 'english', 'ga', 'computer']
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
