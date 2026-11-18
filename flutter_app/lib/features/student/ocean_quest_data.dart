import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

enum OceanDifficulty { beginner, intermediate, advanced }

enum OceanGameMode {
  treasureHunt,
  submarineExploration,
  crystalRush,
  bossBattle,
  dailyChallenge,
  subjectMission,
}

String oceanDifficultyToId(OceanDifficulty d) {
  switch (d) {
    case OceanDifficulty.beginner:
      return 'beginner';
    case OceanDifficulty.intermediate:
      return 'intermediate';
    case OceanDifficulty.advanced:
      return 'advanced';
  }
}

OceanDifficulty oceanDifficultyFromId(String raw) {
  switch (raw) {
    case 'intermediate':
      return OceanDifficulty.intermediate;
    case 'advanced':
      return OceanDifficulty.advanced;
    default:
      return OceanDifficulty.beginner;
  }
}

String oceanModeToId(OceanGameMode m) {
  switch (m) {
    case OceanGameMode.treasureHunt:
      return 'treasure-hunt';
    case OceanGameMode.submarineExploration:
      return 'submarine-exploration';
    case OceanGameMode.crystalRush:
      return 'crystal-rush';
    case OceanGameMode.bossBattle:
      return 'boss-battle';
    case OceanGameMode.dailyChallenge:
      return 'daily-challenge';
    case OceanGameMode.subjectMission:
      return 'subject-mission';
  }
}

OceanGameMode oceanModeFromId(String raw) {
  switch (raw) {
    case 'submarine-exploration':
      return OceanGameMode.submarineExploration;
    case 'crystal-rush':
      return OceanGameMode.crystalRush;
    case 'boss-battle':
      return OceanGameMode.bossBattle;
    case 'daily-challenge':
      return OceanGameMode.dailyChallenge;
    case 'subject-mission':
      return OceanGameMode.subjectMission;
    default:
      return OceanGameMode.treasureHunt;
  }
}

class OceanModeMeta {
  final String id;
  final String label;
  final String shortLabel;
  final String description;
  final String mechanicNote;
  final IconData icon;

  const OceanModeMeta({
    required this.id,
    required this.label,
    required this.shortLabel,
    required this.description,
    required this.mechanicNote,
    required this.icon,
  });
}

const Map<String, OceanModeMeta> kOceanModeMeta = {
  'treasure-hunt': OceanModeMeta(
    id: 'treasure-hunt',
    label: 'Ocean Treasure Hunt',
    shortLabel: 'Treasure Hunt',
    description: 'Crack chest locks one clue at a time with steady SSC CGL accuracy.',
    mechanicNote: 'Each correct answer unlocks a chest seal until the Pearl Vault opens.',
    icon: Icons.inventory_2_outlined,
  ),
  'submarine-exploration': OceanModeMeta(
    id: 'submarine-exploration',
    label: 'Submarine Depth Voyage',
    shortLabel: 'Submarine',
    description: 'Pilot the Examora sub past underwater checkpoints toward the sea floor.',
    mechanicNote: 'Your submarine dives deeper with every correct solution.',
    icon: Icons.directions_boat_filled_outlined,
  ),
  'crystal-rush': OceanModeMeta(
    id: 'crystal-rush',
    label: 'Crystal Rush',
    shortLabel: 'Crystal Rush',
    description: 'Beat the tide clock to harvest glowing Sea Crystals.',
    mechanicNote: 'Keep accuracy high under timer pressure for maximum crystal yield.',
    icon: Icons.diamond_outlined,
  ),
  'boss-battle': OceanModeMeta(
    id: 'boss-battle',
    label: 'Guardian Boss Battle',
    shortLabel: 'Boss Battle',
    description: 'Strike the Ocean Guardian by answering consecutive SSC CGL challenges.',
    mechanicNote: 'Every correct answer deals critical damage to the Guardian shield.',
    icon: Icons.shield_outlined,
  ),
  'daily-challenge': OceanModeMeta(
    id: 'daily-challenge',
    label: 'Daily Tide Challenge',
    shortLabel: 'Daily Tide',
    description: 'Fresh once-per-day curated SSC CGL dive with bonus Crystals & Streak XP.',
    mechanicNote: 'Bonus reward can be claimed once per calendar day.',
    icon: Icons.today_outlined,
  ),
  'subject-mission': OceanModeMeta(
    id: 'subject-mission',
    label: 'Subject Deep Dive',
    shortLabel: 'Subject Dive',
    description: 'Targeted subject mission for Maths, Reasoning, English, GA, or Computer.',
    mechanicNote: 'Strengthen weak topics using non-repeating questions.',
    icon: Icons.explore_outlined,
  ),
};

class OceanLocationDef {
  final String locationId;
  final int order;
  final String name;
  final String difficulty;
  final int depthMeters;
  final String subtitle;
  final String description;
  final Color accent;
  final double mapX;
  final double mapY;
  final String unlockHint;
  final String? requiredLocationId;
  final int minCompletedInPrevLocation;

  const OceanLocationDef({
    required this.locationId,
    required this.order,
    required this.name,
    required this.difficulty,
    required this.depthMeters,
    required this.subtitle,
    required this.description,
    required this.accent,
    required this.mapX,
    required this.mapY,
    required this.unlockHint,
    this.requiredLocationId,
    this.minCompletedInPrevLocation = 1,
  });
}

const List<OceanLocationDef> kOceanLocations = [
  OceanLocationDef(
    locationId: 'coral-bay',
    order: 1,
    name: 'Coral Bay',
    difficulty: 'beginner',
    depthMeters: 20,
    subtitle: 'Sunlit Shallows · Untimed Foundations',
    description:
        'Start in warm, shallow turquoise water with untimed SSC CGL foundation puzzles and full hints.',
    accent: OceanColors.turquoise,
    mapX: 16,
    mapY: 18,
    unlockHint: 'Unlocked from the start — begin your first dive here!',
    minCompletedInPrevLocation: 0,
  ),
  OceanLocationDef(
    locationId: 'sunken-ship',
    order: 2,
    name: 'Sunken Ship',
    difficulty: 'beginner',
    depthMeters: 60,
    subtitle: 'Timber Wreck · Reasoning & Vocab Clues',
    description:
        'Navigate the sunken merchant galleon by solving SSC CGL Reasoning patterns and English idioms.',
    accent: OceanColors.aqua,
    mapX: 46,
    mapY: 22,
    unlockHint: 'Clear Coral Bay Treasure Run (60%+ accuracy) to unlock.',
    requiredLocationId: 'coral-bay',
    minCompletedInPrevLocation: 1,
  ),
  OceanLocationDef(
    locationId: 'turtle-reef',
    order: 3,
    name: 'Turtle Reef',
    difficulty: 'beginner',
    depthMeters: 110,
    subtitle: 'Reef Sanctuary · First Guardian Challenge',
    description:
        'Team up with the Reef Guardian to master General Awareness & Quant basics before deep diving.',
    accent: OceanColors.seaGlass,
    mapX: 78,
    mapY: 20,
    unlockHint: 'Clear Sunken Ship missions to unlock Turtle Reef.',
    requiredLocationId: 'sunken-ship',
    minCompletedInPrevLocation: 1,
  ),
  OceanLocationDef(
    locationId: 'sunken-city',
    order: 4,
    name: 'Sunken City',
    difficulty: 'intermediate',
    depthMeters: 240,
    subtitle: 'Ancient Pillars · Multi-Subject Timed Runs',
    description:
        'Enter the Intermediate Twilight Zone with moderate timers, mixed subjects, and tighter hints.',
    accent: Color(0xFF38BDF8),
    mapX: 20,
    mapY: 48,
    unlockHint: 'Defeat the Turtle Reef Guardian to enter Intermediate Depth.',
    requiredLocationId: 'turtle-reef',
    minCompletedInPrevLocation: 2,
  ),
  OceanLocationDef(
    locationId: 'deep-sea-lab',
    order: 5,
    name: 'Deep Sea Lab',
    difficulty: 'intermediate',
    depthMeters: 420,
    subtitle: 'Research Station · Speed & Logic Calibration',
    description:
        'Stabilize pressure valves with rapid SSC Tier-1 Maths and Computer Networking challenges.',
    accent: OceanColors.turquoise,
    mapX: 52,
    mapY: 50,
    unlockHint: 'Clear Sunken City expeditions to dock at Deep Sea Lab.',
    requiredLocationId: 'sunken-city',
    minCompletedInPrevLocation: 1,
  ),
  OceanLocationDef(
    locationId: 'crystal-cave',
    order: 6,
    name: 'Crystal Cave',
    difficulty: 'intermediate',
    depthMeters: 680,
    subtitle: 'Bioluminescent Cavern · Crystal Guardian',
    description:
        'Harvest rare sea crystals in fast Crystal Rush runs and outwit the Prism Sentinel.',
    accent: Color(0xFFA78BFA),
    mapX: 82,
    mapY: 47,
    unlockHint: 'Clear Deep Sea Lab missions to enter Crystal Cave.',
    requiredLocationId: 'deep-sea-lab',
    minCompletedInPrevLocation: 1,
  ),
  OceanLocationDef(
    locationId: 'abyss-kingdom',
    order: 7,
    name: 'Abyss Kingdom',
    difficulty: 'advanced',
    depthMeters: 1200,
    subtitle: 'Midnight Trench · Tier-2 Difficulty',
    description:
        'Strict SSC CGL Tier-2 time pressure, complex arithmetic, and minimal hints in the Abyss.',
    accent: Color(0xFFFB7185),
    mapX: 18,
    mapY: 78,
    unlockHint: 'Conquer Crystal Cave Guardian to unlock Advanced Abyssal Tier.',
    requiredLocationId: 'crystal-cave',
    minCompletedInPrevLocation: 2,
  ),
  OceanLocationDef(
    locationId: 'ancient-ocean-temple',
    order: 8,
    name: 'Ancient Ocean Temple',
    difficulty: 'advanced',
    depthMeters: 1850,
    subtitle: 'Sanctum Vault · Mixed PYQ Gauntlet',
    description:
        'Unlock the temple seals using hard 2016–2026 PYQs under official exam pacing.',
    accent: Color(0xFFF59E0B),
    mapX: 52,
    mapY: 80,
    unlockHint: 'Clear Abyss Kingdom missions to reach the Ancient Temple.',
    requiredLocationId: 'abyss-kingdom',
    minCompletedInPrevLocation: 1,
  ),
  OceanLocationDef(
    locationId: 'ocean-champion-arena',
    order: 9,
    name: 'Ocean Champion Arena',
    difficulty: 'advanced',
    depthMeters: 2500,
    subtitle: 'Final Boss Challenge · Grand Leviathan',
    description:
        'The ultimate 12-question SSC CGL multi-subject Boss Battle for the Ocean Champion crown.',
    accent: OceanColors.coralAccent,
    mapX: 84,
    mapY: 77,
    unlockHint: 'Clear Ancient Ocean Temple seals to face the Final Champion.',
    requiredLocationId: 'ancient-ocean-temple',
    minCompletedInPrevLocation: 1,
  ),
];

const List<Map<String, dynamic>> kOceanMissionsSeed = [
  {
    'missionId': 'oq-coral-treasure',
    'locationId': 'coral-bay',
    'locationOrder': 1,
    'title': 'Coral Bay Pearl Chest',
    'description': 'Untimed warm-up across easy Quantitative Aptitude basics with 3 hints.',
    'mode': 'treasure-hunt',
    'difficulty': 'beginner',
    'subject': 'quant',
    'questionCount': 5,
    'timeLimitSec': 0,
    'minAccuracyPct': 60,
    'hintLimit': 3,
    'xpReward': 90,
    'coinReward': 40,
    'crystalReward': 4,
    'badgeId': 'oq-coral-explorer',
    'prerequisiteMissionIds': <String>[],
    'isBoss': false,
    'isPublished': true,
    'order': 1,
  },
  {
    'missionId': 'oq-coral-sub',
    'locationId': 'coral-bay',
    'locationOrder': 1,
    'title': 'Lagoon Submarine Scout',
    'description': 'Steer the sub through English Grammar & Vocabulary shallows.',
    'mode': 'submarine-exploration',
    'difficulty': 'beginner',
    'subject': 'english',
    'questionCount': 5,
    'timeLimitSec': 0,
    'minAccuracyPct': 60,
    'hintLimit': 3,
    'xpReward': 95,
    'coinReward': 45,
    'crystalReward': 4,
    'prerequisiteMissionIds': <String>['oq-coral-treasure'],
    'isBoss': false,
    'isPublished': true,
    'order': 2,
  },
  {
    'missionId': 'oq-ship-reasoning',
    'locationId': 'sunken-ship',
    'locationOrder': 2,
    'title': 'Captain’s Logbook Cipher',
    'description': 'Decode Reasoning series & analogy clues aboard the sunken galleon.',
    'mode': 'subject-mission',
    'difficulty': 'beginner',
    'subject': 'reasoning',
    'questionCount': 5,
    'timeLimitSec': 0,
    'minAccuracyPct': 60,
    'hintLimit': 2,
    'xpReward': 110,
    'coinReward': 50,
    'crystalReward': 5,
    'prerequisiteMissionIds': <String>['oq-coral-treasure'],
    'isBoss': false,
    'isPublished': true,
    'order': 3,
  },
  {
    'missionId': 'oq-ship-hold',
    'locationId': 'sunken-ship',
    'locationOrder': 2,
    'title': 'Cargo Hold Relic Hunt',
    'description': 'Find hidden artifacts by solving General Awareness & History PYQs.',
    'mode': 'treasure-hunt',
    'difficulty': 'beginner',
    'subject': 'ga',
    'questionCount': 5,
    'timeLimitSec': 240,
    'minAccuracyPct': 60,
    'hintLimit': 2,
    'xpReward': 115,
    'coinReward': 55,
    'crystalReward': 5,
    'prerequisiteMissionIds': <String>['oq-ship-reasoning'],
    'isBoss': false,
    'isPublished': true,
    'order': 4,
  },
  {
    'missionId': 'oq-reef-sprint',
    'locationId': 'turtle-reef',
    'locationOrder': 3,
    'title': 'Sea Grass Crystal Tide',
    'description': 'Collect reef crystals with Beginner Maths & Computer fundamentals.',
    'mode': 'crystal-rush',
    'difficulty': 'beginner',
    'subject': 'computer',
    'questionCount': 5,
    'timeLimitSec': 210,
    'minAccuracyPct': 60,
    'hintLimit': 2,
    'xpReward': 120,
    'coinReward': 60,
    'crystalReward': 6,
    'prerequisiteMissionIds': <String>['oq-ship-reasoning'],
    'isBoss': false,
    'isPublished': true,
    'order': 5,
  },
  {
    'missionId': 'oq-reef-boss',
    'locationId': 'turtle-reef',
    'locationOrder': 3,
    'title': 'Reef Shell Guardian',
    'description': 'Defeat the Turtle Reef Guardian to unlock the Intermediate Twilight Zone.',
    'mode': 'boss-battle',
    'difficulty': 'beginner',
    'subject': 'mixed',
    'questionCount': 6,
    'timeLimitSec': 270,
    'minAccuracyPct': 65,
    'hintLimit': 2,
    'xpReward': 160,
    'coinReward': 80,
    'crystalReward': 8,
    'badgeId': 'oq-reef-victor',
    'prerequisiteMissionIds': <String>['oq-reef-sprint'],
    'isBoss': true,
    'guardianName': 'Aegis Sea-Turtle Sentinel',
    'isPublished': true,
    'order': 6,
  },
  {
    'missionId': 'oq-city-pillars',
    'locationId': 'sunken-city',
    'locationOrder': 4,
    'title': 'Submerged Citadel Descent',
    'description': 'Pilot through ancient ruins with Intermediate Tier-1 Quantitative problems.',
    'mode': 'submarine-exploration',
    'difficulty': 'intermediate',
    'subject': 'quant',
    'questionCount': 7,
    'timeLimitSec': 300,
    'minAccuracyPct': 65,
    'hintLimit': 1,
    'xpReward': 175,
    'coinReward': 85,
    'crystalReward': 8,
    'prerequisiteMissionIds': <String>['oq-reef-boss'],
    'isBoss': false,
    'isPublished': true,
    'order': 7,
  },
  {
    'missionId': 'oq-city-archive',
    'locationId': 'sunken-city',
    'locationOrder': 4,
    'title': 'Marble Archive Decryption',
    'description': 'Intermediate English Comprehension, Idioms & Error Spotting.',
    'mode': 'subject-mission',
    'difficulty': 'intermediate',
    'subject': 'english',
    'questionCount': 7,
    'timeLimitSec': 270,
    'minAccuracyPct': 65,
    'hintLimit': 1,
    'xpReward': 180,
    'coinReward': 90,
    'crystalReward': 8,
    'prerequisiteMissionIds': <String>['oq-city-pillars'],
    'isBoss': false,
    'isPublished': true,
    'order': 8,
  },
  {
    'missionId': 'oq-lab-pressure',
    'locationId': 'deep-sea-lab',
    'locationOrder': 5,
    'title': 'Hydro-Lab Pressure Lock',
    'description': 'Stabilize submarine sonar systems with SSC Reasoning & Computer tasks.',
    'mode': 'submarine-exploration',
    'difficulty': 'intermediate',
    'subject': 'reasoning',
    'questionCount': 7,
    'timeLimitSec': 270,
    'minAccuracyPct': 70,
    'hintLimit': 1,
    'xpReward': 195,
    'coinReward': 95,
    'crystalReward': 9,
    'prerequisiteMissionIds': <String>['oq-city-pillars'],
    'isBoss': false,
    'isPublished': true,
    'order': 9,
  },
  {
    'missionId': 'oq-lab-ga',
    'locationId': 'deep-sea-lab',
    'locationOrder': 5,
    'title': 'Bio-Dome GK Calibration',
    'description': 'Mixed Science, Polity & Static GK under moderate lab timing.',
    'mode': 'subject-mission',
    'difficulty': 'intermediate',
    'subject': 'ga',
    'questionCount': 7,
    'timeLimitSec': 240,
    'minAccuracyPct': 70,
    'hintLimit': 1,
    'xpReward': 200,
    'coinReward': 100,
    'crystalReward': 9,
    'prerequisiteMissionIds': <String>['oq-lab-pressure'],
    'isBoss': false,
    'isPublished': true,
    'order': 10,
  },
  {
    'missionId': 'oq-cave-rush',
    'locationId': 'crystal-cave',
    'locationOrder': 6,
    'title': 'Quartz Cavern Crystal Rush',
    'description': 'High-tempo mixed subject crystal harvest with 1 lifeline hint.',
    'mode': 'crystal-rush',
    'difficulty': 'intermediate',
    'subject': 'mixed',
    'questionCount': 8,
    'timeLimitSec': 260,
    'minAccuracyPct': 70,
    'hintLimit': 1,
    'xpReward': 220,
    'coinReward': 110,
    'crystalReward': 12,
    'prerequisiteMissionIds': <String>['oq-lab-pressure'],
    'isBoss': false,
    'isPublished': true,
    'order': 11,
  },
  {
    'missionId': 'oq-cave-boss',
    'locationId': 'crystal-cave',
    'locationOrder': 6,
    'title': 'Prism Manta Guardian',
    'description': 'Shatter the Prism Manta’s shields to open the Advanced Abyssal Tier.',
    'mode': 'boss-battle',
    'difficulty': 'intermediate',
    'subject': 'mixed',
    'questionCount': 8,
    'timeLimitSec': 280,
    'minAccuracyPct': 70,
    'hintLimit': 1,
    'xpReward': 260,
    'coinReward': 130,
    'crystalReward': 14,
    'badgeId': 'oq-crystal-diver',
    'prerequisiteMissionIds': <String>['oq-cave-rush'],
    'isBoss': true,
    'guardianName': 'Prism Manta Overlord',
    'isPublished': true,
    'order': 12,
  },
  {
    'missionId': 'oq-abyss-trench',
    'locationId': 'abyss-kingdom',
    'locationOrder': 7,
    'title': 'Midnight Trench Tier-2 Quant',
    'description': 'Advanced Algebra, Trigonometry & Geometry at exam-hall pace.',
    'mode': 'submarine-exploration',
    'difficulty': 'advanced',
    'subject': 'quant',
    'questionCount': 8,
    'timeLimitSec': 260,
    'minAccuracyPct': 75,
    'hintLimit': 1,
    'xpReward': 280,
    'coinReward': 140,
    'crystalReward': 15,
    'prerequisiteMissionIds': <String>['oq-cave-boss'],
    'isBoss': false,
    'isPublished': true,
    'order': 13,
  },
  {
    'missionId': 'oq-abyss-logic',
    'locationId': 'abyss-kingdom',
    'locationOrder': 7,
    'title': 'Abyssal Cipher Matrix',
    'description': 'High-complexity Reasoning puzzles with zero hints and strict pacing.',
    'mode': 'crystal-rush',
    'difficulty': 'advanced',
    'subject': 'reasoning',
    'questionCount': 8,
    'timeLimitSec': 240,
    'minAccuracyPct': 75,
    'hintLimit': 0,
    'xpReward': 295,
    'coinReward': 145,
    'crystalReward': 16,
    'prerequisiteMissionIds': <String>['oq-abyss-trench'],
    'isBoss': false,
    'isPublished': true,
    'order': 14,
  },
  {
    'missionId': 'oq-temple-vault',
    'locationId': 'ancient-ocean-temple',
    'locationOrder': 8,
    'title': 'Sanctum PYQ Relic Trial',
    'description': 'Unlock 3 temple seals using real 2016–2026 SSC CGL mixed PYQs.',
    'mode': 'treasure-hunt',
    'difficulty': 'advanced',
    'subject': 'mixed',
    'questionCount': 10,
    'timeLimitSec': 300,
    'minAccuracyPct': 75,
    'hintLimit': 0,
    'xpReward': 320,
    'coinReward': 160,
    'crystalReward': 18,
    'prerequisiteMissionIds': <String>['oq-abyss-trench'],
    'isBoss': false,
    'isPublished': true,
    'order': 15,
  },
  {
    'missionId': 'oq-temple-computer',
    'locationId': 'ancient-ocean-temple',
    'locationOrder': 8,
    'title': 'Temple Rune Server Vault',
    'description': 'Advanced Tier-2 Computer Knowledge & English precision sprint.',
    'mode': 'subject-mission',
    'difficulty': 'advanced',
    'subject': 'computer',
    'questionCount': 8,
    'timeLimitSec': 220,
    'minAccuracyPct': 75,
    'hintLimit': 0,
    'xpReward': 310,
    'coinReward': 155,
    'crystalReward': 16,
    'prerequisiteMissionIds': <String>['oq-temple-vault'],
    'isBoss': false,
    'isPublished': true,
    'order': 16,
  },
  {
    'missionId': 'oq-arena-final-boss',
    'locationId': 'ocean-champion-arena',
    'locationOrder': 9,
    'title': 'Crown of the Ocean Champion',
    'description': 'Defeat the Trident Leviathan across all 5 SSC CGL subjects under strict exam time.',
    'mode': 'boss-battle',
    'difficulty': 'advanced',
    'subject': 'mixed',
    'questionCount': 12,
    'timeLimitSec': 360,
    'minAccuracyPct': 75,
    'hintLimit': 0,
    'xpReward': 420,
    'coinReward': 200,
    'crystalReward': 25,
    'badgeId': 'oq-ocean-champion',
    'prerequisiteMissionIds': <String>['oq-temple-vault'],
    'isBoss': true,
    'guardianName': 'Trident Leviathan Sovereign',
    'isPublished': true,
    'order': 17,
  },
  {
    'missionId': 'daily-ocean-tide',
    'locationId': 'coral-bay',
    'locationOrder': 1,
    'title': 'Daily Tide Challenge',
    'description': 'Once-daily curated 6-question SSC CGL tide sprint across changing subjects.',
    'mode': 'daily-challenge',
    'difficulty': 'intermediate',
    'subject': 'mixed',
    'questionCount': 6,
    'timeLimitSec': 210,
    'minAccuracyPct': 60,
    'hintLimit': 1,
    'xpReward': 150,
    'coinReward': 75,
    'crystalReward': 10,
    'badgeId': 'oq-daily-navigator',
    'prerequisiteMissionIds': <String>[],
    'isBoss': false,
    'isPublished': true,
    'order': 0,
  },
];

class OceanQuestProgressModel {
  final String uid;
  final List<String> unlockedLocations;
  final List<String> completedMissions;
  final Map<String, int> missionBestScores;
  final Map<String, int> missionStars;
  final List<String> seenQuestionIds;
  final List<String> wrongQuestionIds;
  final int crystals;
  final int totalQuestXp;
  final List<String> questBadges;
  final List<String> dailyCompletions;
  final int totalRuns;
  final int totalCorrect;
  final int totalAttempted;
  final String updatedAt;

  const OceanQuestProgressModel({
    required this.uid,
    this.unlockedLocations = const ['coral-bay'],
    this.completedMissions = const [],
    this.missionBestScores = const {},
    this.missionStars = const {},
    this.seenQuestionIds = const [],
    this.wrongQuestionIds = const [],
    this.crystals = 0,
    this.totalQuestXp = 0,
    this.questBadges = const [],
    this.dailyCompletions = const [],
    this.totalRuns = 0,
    this.totalCorrect = 0,
    this.totalAttempted = 0,
    this.updatedAt = '',
  });

  factory OceanQuestProgressModel.fromMap(String uid, Map<String, dynamic> map) {
    final locs = (map['unlockedLocations'] as List<dynamic>? ?? ['coral-bay'])
        .map((e) => e.toString())
        .toList();
    if (!locs.contains('coral-bay')) locs.insert(0, 'coral-bay');

    final bestScores = <String, int>{};
    if (map['missionBestScores'] is Map) {
      (map['missionBestScores'] as Map).forEach((k, v) {
        bestScores[k.toString()] = int.tryParse(v.toString()) ?? 0;
      });
    }

    final stars = <String, int>{};
    if (map['missionStars'] is Map) {
      (map['missionStars'] as Map).forEach((k, v) {
        stars[k.toString()] = int.tryParse(v.toString()) ?? 0;
      });
    }

    return OceanQuestProgressModel(
      uid: uid,
      unlockedLocations: locs,
      completedMissions: (map['completedMissions'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      missionBestScores: bestScores,
      missionStars: stars,
      seenQuestionIds: (map['seenQuestionIds'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      wrongQuestionIds: (map['wrongQuestionIds'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      crystals: int.tryParse((map['crystals'] ?? 0).toString()) ?? 0,
      totalQuestXp: int.tryParse((map['totalQuestXp'] ?? 0).toString()) ?? 0,
      questBadges: (map['questBadges'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      dailyCompletions: (map['dailyCompletions'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      totalRuns: int.tryParse((map['totalRuns'] ?? 0).toString()) ?? 0,
      totalCorrect: int.tryParse((map['totalCorrect'] ?? 0).toString()) ?? 0,
      totalAttempted: int.tryParse((map['totalAttempted'] ?? 0).toString()) ?? 0,
      updatedAt: (map['updatedAt'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toMap() => {
        'uid': uid,
        'unlockedLocations': unlockedLocations.take(20).toList(),
        'completedMissions': completedMissions.take(200).toList(),
        'missionBestScores': missionBestScores,
        'missionStars': missionStars,
        'seenQuestionIds': seenQuestionIds.take(2000).toList(),
        'wrongQuestionIds': wrongQuestionIds.take(1000).toList(),
        'crystals': crystals,
        'totalQuestXp': totalQuestXp,
        'questBadges': questBadges.take(100).toList(),
        'dailyCompletions': dailyCompletions.take(400).toList(),
        'totalRuns': totalRuns,
        'totalCorrect': totalCorrect,
        'totalAttempted': totalAttempted,
        'updatedAt': updatedAt.isNotEmpty
            ? updatedAt
            : DateTime.now().toUtc().toIso8601String(),
      };
}

class OceanUnlockStatus {
  final bool unlocked;
  final String reason;
  const OceanUnlockStatus({required this.unlocked, required this.reason});
}

OceanUnlockStatus evaluateLocationUnlock(
  String locationId,
  OceanQuestProgressModel progress,
  List<Map<String, dynamic>> missions,
) {
  OceanLocationDef? loc;
  for (final l in kOceanLocations) {
    if (l.locationId == locationId) {
      loc = l;
      break;
    }
  }
  if (loc == null) {
    return const OceanUnlockStatus(unlocked: false, reason: 'Unknown depth zone.');
  }
  if (loc.order == 1 || progress.unlockedLocations.contains(locationId)) {
    return const OceanUnlockStatus(unlocked: true, reason: 'Depth zone unlocked');
  }
  final prevLocId = loc.requiredLocationId;
  if (prevLocId == null || prevLocId.isEmpty) {
    return const OceanUnlockStatus(unlocked: true, reason: 'Depth zone unlocked');
  }

  OceanLocationDef? prevLoc;
  for (final l in kOceanLocations) {
    if (l.locationId == prevLocId) {
      prevLoc = l;
      break;
    }
  }
  final prevMissions = missions
      .where((m) =>
          (m['locationId'] ?? '') == prevLocId && m['isPublished'] != false)
      .toList();

  final completedSet = progress.completedMissions.toSet();
  final completedInPrev = prevMissions
      .where((m) => completedSet.contains((m['missionId'] ?? m['id']).toString()))
      .toList();

  for (final m in prevMissions) {
    if (m['isBoss'] == true) {
      final bossId = (m['missionId'] ?? m['id'] ?? '').toString();
      if (!completedSet.contains(bossId)) {
        return OceanUnlockStatus(
          unlocked: false,
          reason:
              'Defeat "${m['title'] ?? 'Zone Guardian'}" in ${prevLoc?.name ?? 'previous zone'} to unlock.',
        );
      }
    }
  }

  if (completedInPrev.length < loc.minCompletedInPrevLocation) {
    final remaining = (loc.minCompletedInPrevLocation - completedInPrev.length)
        .clamp(1, 20);
    return OceanUnlockStatus(
      unlocked: false,
      reason:
          'Complete $remaining more mission${remaining > 1 ? 's' : ''} in ${prevLoc?.name ?? 'the previous zone'} to unlock.',
    );
  }

  return const OceanUnlockStatus(unlocked: true, reason: 'Ready to explore');
}

OceanUnlockStatus evaluateMissionUnlock(
  Map<String, dynamic> mission,
  OceanQuestProgressModel progress,
  List<Map<String, dynamic>> allMissions,
) {
  final mode = (mission['mode'] ?? '').toString();
  if (mode == 'daily-challenge') {
    return const OceanUnlockStatus(unlocked: true, reason: 'Available daily');
  }
  final locId = (mission['locationId'] ?? 'coral-bay').toString();
  final locStatus = evaluateLocationUnlock(locId, progress, allMissions);
  if (!locStatus.unlocked) return locStatus;

  final completedSet = progress.completedMissions.toSet();
  final prereqs = (mission['prerequisiteMissionIds'] as List<dynamic>? ?? [])
      .map((e) => e.toString())
      .toList();
  for (final pid in prereqs) {
    if (!completedSet.contains(pid)) {
      String prereqTitle = pid;
      for (final m in allMissions) {
        if ((m['missionId'] ?? m['id']).toString() == pid) {
          prereqTitle = (m['title'] ?? pid).toString();
          break;
        }
      }
      return OceanUnlockStatus(
        unlocked: false,
        reason: 'Clear "$prereqTitle" first.',
      );
    }
  }
  return const OceanUnlockStatus(unlocked: true, reason: 'Mission ready');
}

List<String> computeNewlyUnlockedLocations(
  OceanQuestProgressModel progress,
  List<Map<String, dynamic>> allMissions,
) {
  final nextSet = progress.unlockedLocations.toSet()..add('coral-bay');
  bool changed = true;
  while (changed) {
    changed = false;
    final probe = OceanQuestProgressModel(
      uid: progress.uid,
      unlockedLocations: nextSet.toList(),
      completedMissions: progress.completedMissions,
    );
    for (final loc in kOceanLocations) {
      if (!nextSet.contains(loc.locationId)) {
        final st = evaluateLocationUnlock(loc.locationId, probe, allMissions);
        if (st.unlocked) {
          nextSet.add(loc.locationId);
          changed = true;
        }
      }
    }
  }
  return nextSet.toList();
}

int _hashSeed(String input) {
  int h = 2166136261;
  final bytes = utf8.encode(input);
  for (final b in bytes) {
    h ^= b;
    h = (h * 16777619) & 0x7fffffff;
  }
  return h.abs();
}

List<Map<String, dynamic>> selectSmartQuestQuestions(
  List<Map<String, dynamic>> allQuestions,
  Map<String, dynamic> mission,
  List<String> seenQuestionIds, {
  int runNonce = 0,
}) {
  final published =
      allQuestions.where((q) => q['isPublished'] != false).toList();
  final subject = (mission['subject'] ?? 'mixed').toString();
  final qCount = int.tryParse((mission['questionCount'] ?? 5).toString()) ?? 5;
  final difficulty = (mission['difficulty'] ?? 'beginner').toString();
  final mode = (mission['mode'] ?? 'treasure-hunt').toString();
  final missionId = (mission['missionId'] ?? mission['id'] ?? '').toString();

  final subjectPool = subject == 'mixed'
      ? published
      : published.where((q) => (q['subject'] ?? '').toString() == subject).toList();
  final pool = subjectPool.length >= qCount ? subjectPool : published;

  final seenSet = seenQuestionIds.toSet();
  final diffOrder = difficulty == 'beginner'
      ? ['Easy', 'Medium', 'Hard']
      : difficulty == 'intermediate'
          ? ['Medium', 'Easy', 'Hard']
          : ['Hard', 'Medium', 'Easy'];
  final todayKey = DateTime.now().toUtc().toIso8601String().substring(0, 10);

  final scored = pool.map((q) {
    final qId = (q['id'] ?? '').toString();
    final isUnseen = !seenSet.contains(qId);
    final qDiff = (q['difficulty'] ?? 'Medium').toString();
    final diffIdx = diffOrder.indexOf(qDiff);
    final diffScore = diffIdx == 0 ? 300 : (diffIdx == 1 ? 150 : 50);
    final pyqBonus = (q['sourceType'] ?? '').toString() == 'PYQ' ? 40 : 0;
    final jitterSeed = mode == 'daily-challenge'
        ? '$todayKey:$qId'
        : '$missionId:$runNonce:$qId';
    final jitter = _hashSeed(jitterSeed) % 97;
    return (
      question: q,
      weight: (isUnseen ? 1000 : 0) + diffScore + pyqBonus + jitter,
    );
  }).toList();

  scored.sort((a, b) => b.weight.compareTo(a.weight));

  final selected = <Map<String, dynamic>>[];
  final usedIds = <String>{};
  for (final item in scored) {
    if (selected.length >= qCount) break;
    final id = (item.question['id'] ?? '').toString();
    if (!usedIds.contains(id)) {
      usedIds.add(id);
      selected.add(item.question);
    }
  }
  return selected;
}

String oceanBadgeTitle(String badgeId) {
  switch (badgeId) {
    case 'oq-coral-explorer':
      return 'Coral Explorer';
    case 'oq-reef-victor':
      return 'Reef Guardian Victor';
    case 'oq-crystal-diver':
      return 'Crystal Cave Diver';
    case 'oq-ocean-champion':
      return 'Ocean Champion';
    case 'oq-daily-navigator':
      return 'Daily Tide Navigator';
    default:
      return badgeId;
  }
}
