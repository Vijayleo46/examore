import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'student_i18n.dart';

class SscSyllabusTopic {
  final String id;
  final String subject;
  final String tier; // 'Tier 1' | 'Tier 2' | 'Both'
  final String? tierNote;
  final bool isJsoOnly;
  final String title;
  final String weightage;
  final List<String> keySubtopics;

  const SscSyllabusTopic({
    required this.id,
    required this.subject,
    required this.tier,
    this.tierNote,
    this.isJsoOnly = false,
    required this.title,
    required this.weightage,
    required this.keySubtopics,
  });
}

class TeachingLanguageOption {
  final String code;
  final String label;
  final String nativeLabel;

  const TeachingLanguageOption({
    required this.code,
    required this.label,
    required this.nativeLabel,
  });
}

const List<TeachingLanguageOption> sscTeachingLanguages = [
  TeachingLanguageOption(
    code: 'manglish',
    label: 'Manglish',
    nativeLabel: 'Manglish (ML + EN)',
  ),
  TeachingLanguageOption(
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
  ),
  TeachingLanguageOption(
    code: 'ml',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
  ),
  TeachingLanguageOption(
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
  ),
  TeachingLanguageOption(
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
  ),
];

const String manglishWelcomeGreeting =
    'Hi! Njan ninte SSC CGL personal AI teacher aanu.\n'
    'Nammal syllabus-inte ororo topic-um step-by-step aayi simple aayi padikkum.\n'
    'Aadyam oru subject select cheyyam — Maths (Quant), Reasoning, English, GA, allenkil Computer (Tier 2).\n'
    'Nee Malayalam/Manglish-il padikkan aano, English-il aano prefer cheyyunnathu?';

const String sscPersonalTeacherSystemPrompt =
    'SSC CGL AI PERSONAL TEACHER — MASTER SYSTEM PROMPT\n\n'
    'You are an expert SSC CGL exam coach, personal tutor, mentor, and adaptive learning assistant inside Examora.\n'
    'Teach step-by-step from the official Tier 1 & Tier 2 syllabus: Quantitative Aptitude, General Intelligence & Reasoning, English Language, General Awareness, Computer Knowledge (Tier 2 Qualifying), and Statistics (JSO Paper II Tier 2 only — never assume JSO unless selected).\n'
    'Format every lesson cleanly:\n'
    '1. Easy Explanation\n'
    '2. Core Rule / Formula\n'
    '3. Worked Example (Step-by-Step)\n'
    '4. Exam Hall Shortcut (+ When NOT to Use warning)\n'
    '5. Common Mistake to Avoid\n'
    '6. Quick Check Question\n'
    'Keep explanations simple, encouraging, and accurate. In Manglish mode, explain in warm Malayalam-English (Manglish) while keeping official SSC English technical terms intact. Never invent official PYQs or claim future exam certainty.';

const List<StudentSubjectInfo> sscMasterSubjects = [
  ...sscCglSubjects,
  StudentSubjectInfo(
    id: 'statistics',
    title: 'Statistics (JSO Paper II · Tier 2)',
    shortTitle: 'Statistics (JSO)',
    icon: Icons.bar_chart_rounded,
    accent: OceanColors.oceanNavy,
    description: 'JSO Paper II Only: Central Tendency, Dispersion, Probability, Inference',
  ),
];

const List<SscSyllabusTopic> completeSscSyllabus = [
  // Quantitative Aptitude (16)
  SscSyllabusTopic(
    id: 'syl-quant-number-system',
    subject: 'quant',
    tier: 'Both',
    title: 'Number System',
    weightage: '2–3 Qs',
    keySubtopics: ['Divisibility rules (72, 88, 99)', 'Remainder theorem & cyclicity', 'Unit digit & factors'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-simplification',
    subject: 'quant',
    tier: 'Both',
    title: 'Simplification',
    weightage: '1–2 Qs',
    keySubtopics: ['VBODMAS fractions', 'Surds & indices', 'Algebraic simplification'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-percentage',
    subject: 'quant',
    tier: 'Both',
    title: 'Percentage',
    weightage: '1–2 Qs',
    keySubtopics: ['Fraction-to-percentage table', 'Successive % change', 'Consumption & election problems'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-ratio-averages',
    subject: 'quant',
    tier: 'Both',
    title: 'Ratio and Averages',
    weightage: '2–3 Qs',
    keySubtopics: ['Compound & mean proportion', 'Weighted average', 'Replacement & batting average'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-age',
    subject: 'quant',
    tier: 'Both',
    title: 'Age',
    weightage: '1 Q',
    keySubtopics: ['Constant age difference method', 'Present vs future ratio shifts'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-si-ci',
    subject: 'quant',
    tier: 'Both',
    title: 'SI / CI (Simple & Compound Interest)',
    weightage: '1–2 Qs',
    keySubtopics: ['Tree & effective rate method', '2-yr & 3-yr CI − SI difference', 'Installments'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-profit-loss',
    subject: 'quant',
    tier: 'Both',
    title: 'Profit and Loss',
    weightage: '2–3 Qs',
    keySubtopics: ['CP / SP / MP & discount chains', 'Faulty weights', 'Successive discounts'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-partnership',
    subject: 'quant',
    tier: 'Both',
    title: 'Partnership',
    weightage: '1 Q',
    keySubtopics: ['Capital × Time profit split', 'Working vs sleeping partner ratio'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-mixture',
    subject: 'quant',
    tier: 'Both',
    title: 'Mixture and Alligation',
    weightage: '1–2 Qs',
    keySubtopics: ['Cross-alligation rule', 'Repeated dilution & replacement'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-time-work',
    subject: 'quant',
    tier: 'Both',
    title: 'Time and Work',
    weightage: '1–2 Qs',
    keySubtopics: ['LCM efficiency method', 'MDH wages formula', 'Pipes & cisterns alternate hours'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-tsd',
    subject: 'quant',
    tier: 'Both',
    title: 'Speed, Time and Distance',
    weightage: '1–2 Qs',
    keySubtopics: ['Relative speed & trains', 'Boats & streams', 'Circular tracks & linear races'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-algebra',
    subject: 'quant',
    tier: 'Both',
    title: 'Algebra',
    weightage: '2–4 Qs',
    keySubtopics: ['x + 1/x & cubic identities', 'Symmetric expressions', 'Linear & quadratic roots'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-geometry',
    subject: 'quant',
    tier: 'Both',
    title: 'Geometry & Mensuration',
    weightage: '4–6 Qs',
    keySubtopics: ['Triangle centres & similarity', 'Circle tangents & chords', '2D area & 3D prism/pyramid/frustum'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-trigonometry',
    subject: 'quant',
    tier: 'Both',
    title: 'Trigonometry',
    weightage: '2–3 Qs',
    keySubtopics: ['Pythagorean & complementary identities', 'Max/min values', 'Heights & distances'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-coordinate',
    subject: 'quant',
    tier: 'Tier 2',
    tierNote: 'Higher focus in Tier 2 Paper I',
    title: 'Co-ordinate Geometry',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Distance & section formula', 'Slope & intercept of straight line', 'Reflection of points'],
  ),
  SscSyllabusTopic(
    id: 'syl-quant-di-stats',
    subject: 'quant',
    tier: 'Both',
    tierNote: 'Tier 2 adds Mean, Median, Mode, Std. Deviation & Probability',
    title: 'Data Interpretation & Statistics',
    weightage: '3–5 Qs',
    keySubtopics: ['Pie, bar, line & table DI', 'Mean, Median, Mode & Empirical rule', 'Standard deviation & Probability (Tier 2)'],
  ),

  // General Intelligence & Reasoning (22)
  SscSyllabusTopic(
    id: 'syl-reas-analogies',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Analogies',
    weightage: '2–3 Qs',
    keySubtopics: ['Number-set & triad analogies', 'Word semantic pairs', 'Letter-cluster shifts'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-classification',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Classification',
    weightage: '1–2 Qs',
    keySubtopics: ['Semantic grouping', 'Numeric & letter cluster classification'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-series',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Series',
    weightage: '2–3 Qs',
    keySubtopics: ['Difference & multiplication series', 'Letter & alphanumeric series', 'Continuous pattern'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-coding',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Coding-Decoding',
    weightage: '2–3 Qs',
    keySubtopics: ['Positional shifts & opposite pairs (EJOTY)', 'Vowel/consonant rules', 'Number coding'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-syllogism',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Syllogism',
    weightage: '1–2 Qs',
    keySubtopics: ['Venn diagram overlap rules', 'Either-or complementary pairs', 'Possibility cases (Tier 2)'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-venn',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Venn Diagram',
    weightage: '1 Q',
    keySubtopics: ['Logical set relations', 'Geometric figure region counting'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-blood',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Blood Relations',
    weightage: '1–2 Qs',
    keySubtopics: ['Coded symbol equations', 'Pointing-to-person family trees'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-ranking',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Order and Ranking',
    weightage: '1 Q',
    keySubtopics: ['Left + Right − 1 rule', 'Overlap & minimum total cases'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-word',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Word Formation & Dictionary Order',
    weightage: '1 Q',
    keySubtopics: ['Dictionary sequencing', 'Alphabetical sorting'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-seating',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Seating Arrangement',
    weightage: '1–2 Qs (High Tier 2)',
    keySubtopics: ['Linear single/double row', 'Circular facing centre/outside'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-statement',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Statement and Conclusion',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Direct inference vs assumption', 'Course of action & arguments'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-direction',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Distance and Direction',
    weightage: '1 Q',
    keySubtopics: ['Right/Left 90° turns', 'Pythagorean shortest distance & shadow problems'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-dice',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Dice and Cube',
    weightage: '1–2 Qs',
    keySubtopics: ['1-common & 2-common face rules', 'Open unfolded cube nets'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-calendar',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Calendar',
    weightage: '1 Q',
    keySubtopics: ['Odd days & leap year exceptions', 'Day of week & calendar repetition'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-clock',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Clock',
    weightage: '0–1 Q',
    keySubtopics: ['Angle formula |30H − 11M/2|', 'Mirror image & faulty clock gain/loss'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-odd',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Odd One Out',
    weightage: '1–2 Qs',
    keySubtopics: ['Letter gap oddity', 'Numeric prime/square/cube oddity'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-inequalities',
    subject: 'reasoning',
    tier: 'Tier 2',
    tierNote: 'Frequently tested in Tier 2',
    title: 'Inequalities',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Priority gate > ≥ =', 'Coded inequalities & either-or'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-nonverbal',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Non-Verbal Reasoning',
    weightage: '3–4 Qs',
    keySubtopics: ['Mirror & water images', 'Paper folding/cutting', 'Embedded figures & counting triangles'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-logical',
    subject: 'reasoning',
    tier: 'Both',
    title: 'Logical Reasoning & Mathematical Operations',
    weightage: '2–3 Qs',
    keySubtopics: ['BODMAS sign interchange', 'Logical sequence & cause-effect'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-puzzle',
    subject: 'reasoning',
    tier: 'Tier 2',
    title: 'Puzzle',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Floor & box puzzles', 'Comparison & scheduling grids'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-ds',
    subject: 'reasoning',
    tier: 'Tier 2',
    title: 'Data Sufficiency',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Evaluating Statement I alone vs II alone vs both'],
  ),
  SscSyllabusTopic(
    id: 'syl-reas-critical',
    subject: 'reasoning',
    tier: 'Tier 2',
    tierNote: 'Tier 2 adds Emotional & Social Intelligence',
    title: 'Critical, Emotional & Social Thinking',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Critical evaluation', 'Emotional & Social Intelligence situational reasoning'],
  ),

  // English Language (12)
  SscSyllabusTopic(
    id: 'syl-eng-error',
    subject: 'english',
    tier: 'Both',
    title: 'Error Spotting',
    weightage: '2–3 Qs',
    keySubtopics: ['Subject-verb agreement', 'Tenses & conditionals', 'Prepositions & modifiers'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-fill',
    subject: 'english',
    tier: 'Both',
    title: 'Fill in the Blanks',
    weightage: '1–2 Qs',
    keySubtopics: ['Fixed prepositions & phrasal verbs', 'Contextual vocabulary & connectors'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-synant',
    subject: 'english',
    tier: 'Both',
    title: 'Synonyms & Antonyms',
    weightage: '3–4 Qs',
    keySubtopics: ['Root words, prefixes & suffixes', 'Tone elimination', 'High-frequency SSC register'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-ows',
    subject: 'english',
    tier: 'Both',
    title: 'One-word Substitution',
    weightage: '2 Qs',
    keySubtopics: ['Phobias, manias & governance terms', 'Root-based deduction'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-idioms',
    subject: 'english',
    tier: 'Both',
    title: 'Idioms & Proverbs',
    weightage: '2 Qs',
    keySubtopics: ['Figurative idioms', 'Contextual sentence usage'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-cloze',
    subject: 'english',
    tier: 'Both',
    title: 'Cloze Test',
    weightage: '5 Qs (T1) / 4–8 Qs (T2)',
    keySubtopics: ['Passage tone & tense continuity', 'Collocations & grammatical fit'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-rc',
    subject: 'english',
    tier: 'Both',
    tierNote: 'High weightage in Tier 2 Paper I (12–15 Qs)',
    title: 'Reading Comprehension',
    weightage: 'High Tier 2 Weightage',
    keySubtopics: ['Main idea, tone & inference', 'Eliminating extreme options'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-pqrs',
    subject: 'english',
    tier: 'Both',
    title: 'Sentence Correction / Rearrangement',
    weightage: '2–5 Qs',
    keySubtopics: ['Phrase improvement', 'PQRS para-jumbles via pronoun & connector links'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-homonyms',
    subject: 'english',
    tier: 'Both',
    title: 'Homonyms',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Same spelling/sound, distinct contextual meanings'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-homophones',
    subject: 'english',
    tier: 'Both',
    title: 'Homophones',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Affect/Effect, Compliment/Complement, Stationary/Stationery'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-voice',
    subject: 'english',
    tier: 'Both',
    title: 'Voice (Active / Passive)',
    weightage: '1–3 Qs',
    keySubtopics: ['Be + V3 tense-preserving chart', 'Modals, imperatives & interrogatives'],
  ),
  SscSyllabusTopic(
    id: 'syl-eng-narration',
    subject: 'english',
    tier: 'Both',
    title: 'Narration (Direct / Indirect)',
    weightage: '1–3 Qs',
    keySubtopics: ['Reporting verb backshift rules', 'Pronoun, time-word & question conversion'],
  ),

  // General Awareness (8)
  SscSyllabusTopic(
    id: 'syl-ga-ca',
    subject: 'ga',
    tier: 'Both',
    title: 'Current Affairs',
    weightage: '4–6 Qs',
    keySubtopics: ['Government schemes & budgets', 'Awards, appointments, summits & sports'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-history',
    subject: 'ga',
    tier: 'Both',
    title: 'History',
    weightage: '3–4 Qs',
    keySubtopics: ['Indus & Vedic age', 'Delhi Sultanate & Mughals', '1857–1947 Freedom Movement'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-geo',
    subject: 'ga',
    tier: 'Both',
    title: 'Geography',
    weightage: '2–3 Qs',
    keySubtopics: ['Indian river basins & tributaries', 'Monsoon, soils, passes & national parks'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-polity',
    subject: 'ga',
    tier: 'Both',
    title: 'Polity',
    weightage: '3–4 Qs',
    keySubtopics: ['Fundamental Rights, DPSP & Duties', 'Schedules, Amendments & Parliament'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-economy',
    subject: 'ga',
    tier: 'Both',
    title: 'Economy',
    weightage: '2–3 Qs',
    keySubtopics: ['RBI monetary tools', 'Five-Year Plans, fiscal deficit & GDP indices'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-science',
    subject: 'ga',
    tier: 'Both',
    title: 'General Science',
    weightage: '4–5 Qs',
    keySubtopics: ['Physics SI units & optics', 'Chemistry acids/alloys', 'Biology vitamins, cells & diseases'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-static',
    subject: 'ga',
    tier: 'Both',
    title: 'Static GK',
    weightage: '3–4 Qs',
    keySubtopics: ['Books & authors, UNESCO sites', 'UN headquarters, instruments & boundary lines'],
  ),
  SscSyllabusTopic(
    id: 'syl-ga-art',
    subject: 'ga',
    tier: 'Both',
    title: 'Art and Culture',
    weightage: '2–3 Qs',
    keySubtopics: ['8 Classical dances & exponents', 'Folk festivals, temples & gharanas'],
  ),

  // Computer Knowledge — Tier 2 Qualifying (17)
  SscSyllabusTopic(
    id: 'syl-comp-os',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Operating Systems',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Process scheduling, kernel & deadlocks', 'GUI vs CLI, Unix/Linux & Android'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-abbr',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Abbreviations',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['BIOS, UEFI, ASCII, HTTP, SMTP, EEPROM, RAID'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-storage',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Storage',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['HDD vs SSD, optical discs & cloud drives', 'KB → MB → GB → TB → PB units'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-internet',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Internet',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['URLs, DNS, HTTP/HTTPS, Email (SMTP/IMAP/POP3)', 'Browsers, cookies & search engines'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-shortcuts',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Keyboard Shortcuts',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['Windows Ctrl/Alt/Win keys', 'Word, Excel & PowerPoint function shortcuts'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-hwsw',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Hardware and Software',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['System vs application software', 'Motherboard, buses & firmware'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-memory',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Memory',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Registers, L1/L2/L3 Cache, SRAM vs DRAM', 'PROM/EPROM/EEPROM & Virtual memory'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-network',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Networking',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['OSI 7 layers & TCP/IP ports', 'Router, Switch, Hub, Gateway & topologies'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-fund',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Fundamentals and Terminology',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['Computer generations I–V', 'Binary/Hex conversions & booting sequence'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-tech',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Technological Advancement',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['AI, IoT, Cloud computing & Supercomputers'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-dbms',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'DBMS',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Primary & Foreign keys', 'RDBMS basics & SQL terms'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-office',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Microsoft Office',
    weightage: '2–3 Qs (Tier 2)',
    keySubtopics: ['MS Word formatting & mail merge', 'Excel formulas (VLOOKUP/SUMIF)', 'PowerPoint views'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-lang',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Computer Languages',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Machine, Assembly & High-level languages', 'Compiler vs Interpreter vs Assembler'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-cpu',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'CPU and Components',
    weightage: '1–2 Qs (Tier 2)',
    keySubtopics: ['ALU, Control Unit & Program Counter', 'Instruction fetch-decode-execute cycle'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-win',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Microsoft Windows',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['Task Manager, File Explorer, Control Panel', 'Windows shortcuts & file extensions'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-malware',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Types of Malicious Software & Cybersecurity',
    weightage: '2 Qs (Tier 2)',
    keySubtopics: ['Virus, Worm, Trojan, Ransomware, Spyware', 'Phishing, Firewall & encryption'],
  ),
  SscSyllabusTopic(
    id: 'syl-comp-io',
    subject: 'computer',
    tier: 'Tier 2',
    title: 'Input and Output Devices',
    weightage: '1 Q (Tier 2)',
    keySubtopics: ['OCR, OMR, MICR, Trackball & Joystick', 'Impact vs Non-impact printers & plotters'],
  ),

  // Statistics — JSO Paper II Tier 2 Only (9)
  SscSyllabusTopic(
    id: 'syl-stat-collection',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Collection, Classification & Presentation of Data',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Primary vs secondary data', 'Frequency tables, histograms & ogives'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-central',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Measures of Central Tendency',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['AM, GM, HM properties', 'Median, Mode, Quartiles & Deciles'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-dispersion',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Measures of Dispersion',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Range, Quartile & Mean Deviation', 'Variance, Standard Deviation & CV'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-corr',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Correlation and Regression',
    weightage: '10–12 Qs (JSO)',
    keySubtopics: ['Karl Pearson r & Spearman rank correlation', 'Regression lines & bxy × byx = r²'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-prob',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Probability Theory & Random Variables',
    weightage: '12–15 Qs (JSO)',
    keySubtopics: ['Bayes theorem & conditional probability', 'Binomial, Poisson & Normal distributions'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-sampling',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Sampling Theory',
    weightage: '10 Qs (JSO)',
    keySubtopics: ['Simple random, stratified & systematic sampling', 'Sampling errors & finite population'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-inference',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Statistical Inference',
    weightage: '10 Qs (JSO)',
    keySubtopics: ['Point & interval estimation', 't, z, Chi-square & F tests, Type I & II errors'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-timeseries',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Analysis of Time Series',
    weightage: '8–10 Qs (JSO)',
    keySubtopics: ['Secular trend, seasonal & cyclical variations', 'Moving averages & least squares'],
  ),
  SscSyllabusTopic(
    id: 'syl-stat-index',
    subject: 'statistics',
    tier: 'Tier 2',
    tierNote: 'JSO Paper II only',
    isJsoOnly: true,
    title: 'Index Numbers',
    weightage: '8–10 Qs (JSO)',
    keySubtopics: ['Laspeyres, Paasche & Fisher ideal index', 'Time & Factor reversal tests'],
  ),
];

const List<Map<String, String>> sscTier1PatternRows = [
  {'section': 'A. General Intelligence & Reasoning', 'qs': '25 Qs', 'marks': '50 Marks', 'time': '15 Mins'},
  {'section': 'B. General Awareness', 'qs': '25 Qs', 'marks': '50 Marks', 'time': '15 Mins'},
  {'section': 'C. Quantitative Aptitude', 'qs': '25 Qs', 'marks': '50 Marks', 'time': '15 Mins'},
  {'section': 'D. English Comprehension', 'qs': '25 Qs', 'marks': '50 Marks', 'time': '15 Mins'},
];

const List<Map<String, String>> sscTier2PatternRows = [
  {
    'paper': 'Paper I · Session I · Section I',
    'module': 'Maths (30 Qs) + Reasoning (30 Qs)',
    'marks': '180 Marks · 1 Hr (-1 neg)',
  },
  {
    'paper': 'Paper I · Session I · Section II',
    'module': 'English (45 Qs) + GA (25 Qs)',
    'marks': '210 Marks · 1 Hr (-1 neg)',
  },
  {
    'paper': 'Paper I · Session I · Section III',
    'module': 'Computer Knowledge (20 Qs)',
    'marks': '60 Marks · 15 Mins (Qualifying)',
  },
  {
    'paper': 'Paper I · Session II · Section III',
    'module': 'Data Entry Speed Test (DEST)',
    'marks': '2000 key depressions · 15 Mins (Qualifying)',
  },
  {
    'paper': 'Paper II (JSO Only)',
    'module': 'Statistics (100 Qs)',
    'marks': '200 Marks · 2 Hrs (-0.50 neg)',
  },
];

const List<Map<String, String>> sscCutoffTrendsRows = [
  {'category': 'UR', 't1_2023': '149.78', 't1_2024': '148.27', 't1_2025': '136.83', 't2_2024': '322.77'},
  {'category': 'OBC', 't1_2023': '145.22', 't1_2024': '144.89', 't1_2025': '130.36', 't2_2024': '306.28'},
  {'category': 'EWS', 't1_2023': '146.13', 't1_2024': '145.65', 't1_2025': '127.41', 't2_2024': '300.04'},
  {'category': 'SC', 't1_2023': '129.67', 't1_2024': '128.31', 't1_2025': '114.97', 't2_2024': '285.46'},
  {'category': 'ST', 't1_2023': '118.76', 't1_2024': '117.23', 't1_2025': '106.36', 't2_2024': '266.50'},
];

List<SscSyllabusTopic> getSyllabusTopicsForSubject(String subjectId) {
  return completeSscSyllabus.where((t) => t.subject == subjectId).toList();
}
