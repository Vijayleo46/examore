import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class StudentSubjectInfo {
  final String id;
  final String title;
  final String shortTitle;
  final IconData icon;
  final Color accent;
  final String description;

  const StudentSubjectInfo({
    required this.id,
    required this.title,
    required this.shortTitle,
    required this.icon,
    required this.accent,
    required this.description,
  });
}

const List<StudentSubjectInfo> sscCglSubjects = [
  StudentSubjectInfo(
    id: 'quant',
    title: 'Quantitative Aptitude',
    shortTitle: 'Maths',
    icon: Icons.calculate_outlined,
    accent: OceanColors.oceanBlue,
    description: 'Percentage, Ratio, Profit & Loss, Trigonometry, Geometry',
  ),
  StudentSubjectInfo(
    id: 'reasoning',
    title: 'General Intelligence & Reasoning',
    shortTitle: 'Reasoning',
    icon: Icons.psychology_outlined,
    accent: OceanColors.turquoise,
    description: 'Series, Analogy, Coding-Decoding, Syllogism, Puzzles',
  ),
  StudentSubjectInfo(
    id: 'english',
    title: 'English Comprehension',
    shortTitle: 'English',
    icon: Icons.spellcheck_outlined,
    accent: OceanColors.aqua,
    description: 'Grammar, Idioms, One-word Substitution, Cloze Test',
  ),
  StudentSubjectInfo(
    id: 'ga',
    title: 'General Awareness',
    shortTitle: 'GK & GS',
    icon: Icons.public_outlined,
    accent: OceanColors.oceanNavy,
    description: 'Polity, History, Geography, Science, Current Affairs',
  ),
  StudentSubjectInfo(
    id: 'computer',
    title: 'Computer Knowledge',
    shortTitle: 'Computer',
    icon: Icons.computer_outlined,
    accent: OceanColors.coralAccent,
    description: 'Networking, Shortcuts, Memory, Cyber Security (Tier 2)',
  ),
];

class StudentStrings {
  static String languageLabel(String code) {
    switch (code) {
      case 'ml':
        return 'Malayalam';
      case 'hi':
        return 'Hindi';
      case 'ta':
        return 'Tamil';
      default:
        return 'English';
    }
  }

  static String greeting(String code) {
    switch (code) {
      case 'ml':
        return 'സ്വാഗതം,';
      case 'hi':
        return 'स्वागत है,';
      case 'ta':
        return 'நல்வரவு,';
      default:
        return 'Welcome back,';
    }
  }

  static String continueLearning(String code) {
    switch (code) {
      case 'ml':
        return 'പഠനം തുടരുക';
      case 'hi':
        return 'सीखना जारी रखें';
      case 'ta':
        return 'கற்றலைத் தொடரவும்';
      default:
        return 'Continue Learning';
    }
  }

  static String quickPractice(String code) {
    switch (code) {
      case 'ml':
        return 'വേഗം പരിശീലിക്കുക';
      case 'hi':
        return 'त्वरित अभ्यास';
      case 'ta':
        return 'விரைவு பயிற்சி';
      default:
        return 'Quick Practice';
    }
  }

  static String pickExplanation(
    Map<String, dynamic> question,
    String langCode,
  ) {
    final raw = question['explanations'];
    if (raw is Map) {
      final localized = (raw[langCode] ?? '').toString().trim();
      if (localized.isNotEmpty) return localized;
      final en = (raw['en'] ?? '').toString().trim();
      if (en.isNotEmpty) return en;
    }
    return 'Review the core formula or elimination rule for this topic and compare with the highlighted correct option.';
  }

  static String subjectTitle(String id) {
    for (final s in sscCglSubjects) {
      if (s.id == id) return s.title;
    }
    return 'SSC CGL';
  }
}
