import {
  OceanQuestDifficulty,
  OceanQuestLocation,
  OceanQuestMission,
  OceanQuestMode,
  OceanQuestProgress,
  Question,
  SubjectId,
} from '../types/examverse';

export const OCEAN_LOCATIONS: OceanQuestLocation[] = [
  {
    locationId: 'coral-bay',
    order: 1,
    name: 'Coral Bay',
    difficulty: 'beginner',
    depthMeters: 20,
    subtitle: 'Sunlit Shallows · Untimed Foundations',
    description:
      'Start in warm, shallow turquoise water with untimed SSC CGL foundation puzzles and full hints.',
    accentHex: '#20C7C9',
    mapX: 16,
    mapY: 18,
    unlockHint: 'Unlocked from the start — begin your first dive here!',
  },
  {
    locationId: 'sunken-ship',
    order: 2,
    name: 'Sunken Ship',
    difficulty: 'beginner',
    depthMeters: 60,
    subtitle: 'Timber Wreck · Reasoning & Vocab Clues',
    description:
      'Navigate the sunken merchant galleon by solving SSC CGL Reasoning patterns and English idioms.',
    accentHex: '#55D6D0',
    mapX: 44,
    mapY: 22,
    unlockHint: 'Clear Coral Bay Treasure Run (60%+ accuracy) to unlock.',
    requiredLocationId: 'coral-bay',
    minCompletedInPrevLocation: 1,
  },
  {
    locationId: 'turtle-reef',
    order: 3,
    name: 'Turtle Reef',
    difficulty: 'beginner',
    depthMeters: 110,
    subtitle: 'Reef Sanctuary · First Guardian Challenge',
    description:
      'Team up with the Reef Guardian to master General Awareness & Quant basics before deep diving.',
    accentHex: '#8DE1D3',
    mapX: 76,
    mapY: 20,
    unlockHint: 'Clear Sunken Ship missions to unlock Turtle Reef.',
    requiredLocationId: 'sunken-ship',
    minCompletedInPrevLocation: 1,
  },
  {
    locationId: 'sunken-city',
    order: 4,
    name: 'Sunken City',
    difficulty: 'intermediate',
    depthMeters: 240,
    subtitle: 'Ancient Pillars · Multi-Subject Timed Runs',
    description:
      'Enter the Intermediate Twilight Zone with moderate timers, mixed subjects, and tighter hints.',
    accentHex: '#38BDF8',
    mapX: 22,
    mapY: 46,
    unlockHint: 'Defeat the Turtle Reef Guardian to enter Intermediate Depth.',
    requiredLocationId: 'turtle-reef',
    minCompletedInPrevLocation: 2,
  },
  {
    locationId: 'deep-sea-lab',
    order: 5,
    name: 'Deep Sea Lab',
    difficulty: 'intermediate',
    depthMeters: 420,
    subtitle: 'Research Station · Speed & Logic Calibration',
    description:
      'Stabilize pressure valves with rapid SSC Tier-1 Maths and Computer Networking challenges.',
    accentHex: '#20C7C9',
    mapX: 54,
    mapY: 49,
    unlockHint: 'Clear Sunken City expeditions to dock at Deep Sea Lab.',
    requiredLocationId: 'sunken-city',
    minCompletedInPrevLocation: 1,
  },
  {
    locationId: 'crystal-cave',
    order: 6,
    name: 'Crystal Cave',
    difficulty: 'intermediate',
    depthMeters: 680,
    subtitle: 'Bioluminescent Cavern · Crystal Guardian',
    description:
      'Harvest rare sea crystals in fast Crystal Rush runs and outwit the Prism Sentinel.',
    accentHex: '#A78BFA',
    mapX: 82,
    mapY: 46,
    unlockHint: 'Clear Deep Sea Lab missions to enter Crystal Cave.',
    requiredLocationId: 'deep-sea-lab',
    minCompletedInPrevLocation: 1,
  },
  {
    locationId: 'abyss-kingdom',
    order: 7,
    name: 'Abyss Kingdom',
    difficulty: 'advanced',
    depthMeters: 1200,
    subtitle: 'Midnight Trench · Tier-2 Difficulty',
    description:
      'Strict SSC CGL Tier-2 time pressure, complex arithmetic, and minimal hints in the Abyss.',
    accentHex: '#FB7185',
    mapX: 20,
    mapY: 76,
    unlockHint: 'Conquer Crystal Cave Guardian to unlock Advanced Abyssal Tier.',
    requiredLocationId: 'crystal-cave',
    minCompletedInPrevLocation: 2,
  },
  {
    locationId: 'ancient-ocean-temple',
    order: 8,
    name: 'Ancient Ocean Temple',
    difficulty: 'advanced',
    depthMeters: 1850,
    subtitle: 'Sanctum Vault · Mixed PYQ Gauntlet',
    description:
      'Unlock the temple seals using hard 2016–2026 PYQs under official exam pacing.',
    accentHex: '#F59E0B',
    mapX: 53,
    mapY: 78,
    unlockHint: 'Clear Abyss Kingdom missions to reach the Ancient Temple.',
    requiredLocationId: 'abyss-kingdom',
    minCompletedInPrevLocation: 1,
  },
  {
    locationId: 'ocean-champion-arena',
    order: 9,
    name: 'Ocean Champion Arena',
    difficulty: 'advanced',
    depthMeters: 2500,
    subtitle: 'Final Boss Challenge · Grand Leviathan',
    description:
      'The ultimate 12-question SSC CGL multi-subject Boss Battle for the Ocean Champion crown.',
    accentHex: '#FF8B78',
    mapX: 83,
    mapY: 76,
    unlockHint: 'Clear Ancient Ocean Temple seals to face the Final Champion.',
    requiredLocationId: 'ancient-ocean-temple',
    minCompletedInPrevLocation: 1,
  },
];

export const OCEAN_MODE_META: Record<
  OceanQuestMode,
  { label: string; shortLabel: string; description: string; mechanicNote: string }
> = {
  'treasure-hunt': {
    label: 'Ocean Treasure Hunt',
    shortLabel: 'Treasure Hunt',
    description: 'Crack chest locks one clue at a time with steady SSC CGL accuracy.',
    mechanicNote: 'Each correct answer unlocks a chest seal until the Pearl Vault opens.',
  },
  'submarine-exploration': {
    label: 'Submarine Depth Voyage',
    shortLabel: 'Submarine',
    description: 'Pilot the Examora sub past underwater checkpoints toward the sea floor.',
    mechanicNote: 'Your submarine dives deeper with every correct solution.',
  },
  'crystal-rush': {
    label: 'Crystal Rush',
    shortLabel: 'Crystal Rush',
    description: 'Beat the oxygen & tide clock to harvest bonus glowing Sea Crystals.',
    mechanicNote: 'Keep accuracy high under timer pressure for maximum crystal yield.',
  },
  'boss-battle': {
    label: 'Guardian Boss Battle',
    shortLabel: 'Boss Battle',
    description: 'Strike the Ocean Guardian by answering consecutive SSC CGL challenges.',
    mechanicNote: 'Every correct answer deals critical damage to the Guardian shield.',
  },
  'daily-challenge': {
    label: 'Daily Tide Challenge',
    shortLabel: 'Daily Tide',
    description: 'Fresh once-per-day curated SSC CGL dive with bonus Crystals & Streak XP.',
    mechanicNote: 'Bonus reward can be claimed once per calendar day.',
  },
  'subject-mission': {
    label: 'Subject Deep Dive',
    shortLabel: 'Subject Dive',
    description: 'Targeted subject mission for Reasoning, Maths, English, GA, or Computer.',
    mechanicNote: 'Strengthen weak topics using non-repeating questions.',
  },
};

export const OCEAN_MISSIONS_SEED: OceanQuestMission[] = [
  // 1. Coral Bay (Beginner)
  {
    missionId: 'oq-coral-treasure',
    locationId: 'coral-bay',
    locationOrder: 1,
    title: 'Coral Bay Pearl Chest',
    description: 'Untimed warm-up across easy Quantitative Aptitude basics with 3 hints.',
    mode: 'treasure-hunt',
    difficulty: 'beginner',
    subject: 'quant',
    questionCount: 5,
    timeLimitSec: 0,
    minAccuracyPct: 60,
    hintLimit: 3,
    xpReward: 90,
    coinReward: 40,
    crystalReward: 4,
    badgeId: 'oq-coral-explorer',
    prerequisiteMissionIds: [],
    isPublished: true,
    order: 1,
  },
  {
    missionId: 'oq-coral-sub',
    locationId: 'coral-bay',
    locationOrder: 1,
    title: 'Lagoon Submarine Scout',
    description: 'Steer the sub through English Grammar & Vocabulary shallows.',
    mode: 'submarine-exploration',
    difficulty: 'beginner',
    subject: 'english',
    questionCount: 5,
    timeLimitSec: 0,
    minAccuracyPct: 60,
    hintLimit: 3,
    xpReward: 95,
    coinReward: 45,
    crystalReward: 4,
    prerequisiteMissionIds: ['oq-coral-treasure'],
    isPublished: true,
    order: 2,
  },
  // 2. Sunken Ship (Beginner)
  {
    missionId: 'oq-ship-reasoning',
    locationId: 'sunken-ship',
    locationOrder: 2,
    title: 'Captain’s Logbook Cipher',
    description: 'Decode Reasoning series & analogy clues aboard the sunken galleon.',
    mode: 'subject-mission',
    difficulty: 'beginner',
    subject: 'reasoning',
    questionCount: 5,
    timeLimitSec: 0,
    minAccuracyPct: 60,
    hintLimit: 2,
    xpReward: 110,
    coinReward: 50,
    crystalReward: 5,
    prerequisiteMissionIds: ['oq-coral-treasure'],
    isPublished: true,
    order: 3,
  },
  {
    missionId: 'oq-ship-hold',
    locationId: 'sunken-ship',
    locationOrder: 2,
    title: 'Cargo Hold Relic Hunt',
    description: 'Find hidden artifacts by solving General Awareness & History PYQs.',
    mode: 'treasure-hunt',
    difficulty: 'beginner',
    subject: 'ga',
    questionCount: 5,
    timeLimitSec: 240,
    minAccuracyPct: 60,
    hintLimit: 2,
    xpReward: 115,
    coinReward: 55,
    crystalReward: 5,
    prerequisiteMissionIds: ['oq-ship-reasoning'],
    isPublished: true,
    order: 4,
  },
  // 3. Turtle Reef (Beginner)
  {
    missionId: 'oq-reef-sprint',
    locationId: 'turtle-reef',
    locationOrder: 3,
    title: 'Sea Grass Crystal Tide',
    description: 'Collect reef crystals with Beginner Maths & Computer fundamentals.',
    mode: 'crystal-rush',
    difficulty: 'beginner',
    subject: 'computer',
    questionCount: 5,
    timeLimitSec: 210,
    minAccuracyPct: 60,
    hintLimit: 2,
    xpReward: 120,
    coinReward: 60,
    crystalReward: 6,
    prerequisiteMissionIds: ['oq-ship-reasoning'],
    isPublished: true,
    order: 5,
  },
  {
    missionId: 'oq-reef-boss',
    locationId: 'turtle-reef',
    locationOrder: 3,
    title: 'Reef Shell Guardian',
    description: 'Defeat the Turtle Reef Guardian to unlock the Intermediate Twilight Zone.',
    mode: 'boss-battle',
    difficulty: 'beginner',
    subject: 'mixed',
    questionCount: 6,
    timeLimitSec: 270,
    minAccuracyPct: 65,
    hintLimit: 2,
    xpReward: 160,
    coinReward: 80,
    crystalReward: 8,
    badgeId: 'oq-reef-victor',
    prerequisiteMissionIds: ['oq-reef-sprint'],
    isBoss: true,
    guardianName: 'Aegis Sea-Turtle Sentinel',
    isPublished: true,
    order: 6,
  },
  // 4. Sunken City (Intermediate)
  {
    missionId: 'oq-city-pillars',
    locationId: 'sunken-city',
    locationOrder: 4,
    title: 'Submerged Citadel Descent',
    description: 'Pilot through ancient ruins with Intermediate Tier-1 Quantitative problems.',
    mode: 'submarine-exploration',
    difficulty: 'intermediate',
    subject: 'quant',
    questionCount: 7,
    timeLimitSec: 300,
    minAccuracyPct: 65,
    hintLimit: 1,
    xpReward: 175,
    coinReward: 85,
    crystalReward: 8,
    prerequisiteMissionIds: ['oq-reef-boss'],
    isPublished: true,
    order: 7,
  },
  {
    missionId: 'oq-city-archive',
    locationId: 'sunken-city',
    locationOrder: 4,
    title: 'Marble Archive Decryption',
    description: 'Intermediate English Comprehension, Idioms & Error Spotting.',
    mode: 'subject-mission',
    difficulty: 'intermediate',
    subject: 'english',
    questionCount: 7,
    timeLimitSec: 270,
    minAccuracyPct: 65,
    hintLimit: 1,
    xpReward: 180,
    coinReward: 90,
    crystalReward: 8,
    prerequisiteMissionIds: ['oq-city-pillars'],
    isPublished: true,
    order: 8,
  },
  // 5. Deep Sea Lab (Intermediate)
  {
    missionId: 'oq-lab-pressure',
    locationId: 'deep-sea-lab',
    locationOrder: 5,
    title: 'Hydro-Lab Pressure Lock',
    description: 'Stabilize submarine sonar systems with SSC Reasoning & Computer tasks.',
    mode: 'submarine-exploration',
    difficulty: 'intermediate',
    subject: 'reasoning',
    questionCount: 7,
    timeLimitSec: 270,
    minAccuracyPct: 70,
    hintLimit: 1,
    xpReward: 195,
    coinReward: 95,
    crystalReward: 9,
    prerequisiteMissionIds: ['oq-city-pillars'],
    isPublished: true,
    order: 9,
  },
  {
    missionId: 'oq-lab-ga',
    locationId: 'deep-sea-lab',
    locationOrder: 5,
    title: 'Bio-Dome GK Calibration',
    description: 'Mixed Science, Polity & Static GK under moderate lab timing.',
    mode: 'subject-mission',
    difficulty: 'intermediate',
    subject: 'ga',
    questionCount: 7,
    timeLimitSec: 240,
    minAccuracyPct: 70,
    hintLimit: 1,
    xpReward: 200,
    coinReward: 100,
    crystalReward: 9,
    prerequisiteMissionIds: ['oq-lab-pressure'],
    isPublished: true,
    order: 10,
  },
  // 6. Crystal Cave (Intermediate)
  {
    missionId: 'oq-cave-rush',
    locationId: 'crystal-cave',
    locationOrder: 6,
    title: 'Quartz Cavern Crystal Rush',
    description: 'High-tempo mixed subject crystal harvest with 1 lifeline hint.',
    mode: 'crystal-rush',
    difficulty: 'intermediate',
    subject: 'mixed',
    questionCount: 8,
    timeLimitSec: 260,
    minAccuracyPct: 70,
    hintLimit: 1,
    xpReward: 220,
    coinReward: 110,
    crystalReward: 12,
    prerequisiteMissionIds: ['oq-lab-pressure'],
    isPublished: true,
    order: 11,
  },
  {
    missionId: 'oq-cave-boss',
    locationId: 'crystal-cave',
    locationOrder: 6,
    title: 'Prism Manta Guardian',
    description: 'Shatter the Prism Manta’s shields to open the Advanced Abyssal Tier.',
    mode: 'boss-battle',
    difficulty: 'intermediate',
    subject: 'mixed',
    questionCount: 8,
    timeLimitSec: 280,
    minAccuracyPct: 70,
    hintLimit: 1,
    xpReward: 260,
    coinReward: 130,
    crystalReward: 14,
    badgeId: 'oq-crystal-diver',
    prerequisiteMissionIds: ['oq-cave-rush'],
    isBoss: true,
    guardianName: 'Prism Manta Overlord',
    isPublished: true,
    order: 12,
  },
  // 7. Abyss Kingdom (Advanced)
  {
    missionId: 'oq-abyss-trench',
    locationId: 'abyss-kingdom',
    locationOrder: 7,
    title: 'Midnight Trench Tier-2 Quant',
    description: 'Advanced Algebra, Trigonometry & Geometry at exam-hall pace.',
    mode: 'submarine-exploration',
    difficulty: 'advanced',
    subject: 'quant',
    questionCount: 8,
    timeLimitSec: 260,
    minAccuracyPct: 75,
    hintLimit: 1,
    xpReward: 280,
    coinReward: 140,
    crystalReward: 15,
    prerequisiteMissionIds: ['oq-cave-boss'],
    isPublished: true,
    order: 13,
  },
  {
    missionId: 'oq-abyss-logic',
    locationId: 'abyss-kingdom',
    locationOrder: 7,
    title: 'Abyssal Cipher Matrix',
    description: 'High-complexity Reasoning puzzles with zero hints and strict pacing.',
    mode: 'crystal-rush',
    difficulty: 'advanced',
    subject: 'reasoning',
    questionCount: 8,
    timeLimitSec: 240,
    minAccuracyPct: 75,
    hintLimit: 0,
    xpReward: 295,
    coinReward: 145,
    crystalReward: 16,
    prerequisiteMissionIds: ['oq-abyss-trench'],
    isPublished: true,
    order: 14,
  },
  // 8. Ancient Ocean Temple (Advanced)
  {
    missionId: 'oq-temple-vault',
    locationId: 'ancient-ocean-temple',
    locationOrder: 8,
    title: 'Sanctum PYQ Relic Trial',
    description: 'Unlock 3 temple seals using real 2016–2026 SSC CGL mixed PYQs.',
    mode: 'treasure-hunt',
    difficulty: 'advanced',
    subject: 'mixed',
    questionCount: 10,
    timeLimitSec: 300,
    minAccuracyPct: 75,
    hintLimit: 0,
    xpReward: 320,
    coinReward: 160,
    crystalReward: 18,
    prerequisiteMissionIds: ['oq-abyss-trench'],
    isPublished: true,
    order: 15,
  },
  {
    missionId: 'oq-temple-computer',
    locationId: 'ancient-ocean-temple',
    locationOrder: 8,
    title: 'Temple Rune Server Vault',
    description: 'Advanced Tier-2 Computer Knowledge & English precision sprint.',
    mode: 'subject-mission',
    difficulty: 'advanced',
    subject: 'computer',
    questionCount: 8,
    timeLimitSec: 220,
    minAccuracyPct: 75,
    hintLimit: 0,
    xpReward: 310,
    coinReward: 155,
    crystalReward: 16,
    prerequisiteMissionIds: ['oq-temple-vault'],
    isPublished: true,
    order: 16,
  },
  // 9. Ocean Champion Arena (Final Boss Challenge)
  {
    missionId: 'oq-arena-final-boss',
    locationId: 'ocean-champion-arena',
    locationOrder: 9,
    title: 'Crown of the Ocean Champion',
    description: 'Defeat the Trident Leviathan across all 5 SSC CGL subjects under strict exam time.',
    mode: 'boss-battle',
    difficulty: 'advanced',
    subject: 'mixed',
    questionCount: 12,
    timeLimitSec: 360,
    minAccuracyPct: 75,
    hintLimit: 0,
    xpReward: 420,
    coinReward: 200,
    crystalReward: 25,
    badgeId: 'oq-ocean-champion',
    prerequisiteMissionIds: ['oq-temple-vault'],
    isBoss: true,
    guardianName: 'Trident Leviathan Sovereign',
    isPublished: true,
    order: 17,
  },
  // Daily Tide Challenge (Always Accessible)
  {
    missionId: 'daily-ocean-tide',
    locationId: 'coral-bay',
    locationOrder: 1,
    title: 'Daily Tide Challenge',
    description: 'Once-daily curated 6-question SSC CGL tide sprint across changing subjects.',
    mode: 'daily-challenge',
    difficulty: 'intermediate',
    subject: 'mixed',
    questionCount: 6,
    timeLimitSec: 210,
    minAccuracyPct: 60,
    hintLimit: 1,
    xpReward: 150,
    coinReward: 75,
    crystalReward: 10,
    badgeId: 'oq-daily-navigator',
    prerequisiteMissionIds: [],
    isPublished: true,
    order: 0,
  },
];

export function createDefaultOceanQuestProgress(uid: string): OceanQuestProgress {
  return {
    uid,
    unlockedLocations: ['coral-bay'],
    completedMissions: [],
    missionBestScores: {},
    missionStars: {},
    seenQuestionIds: [],
    wrongQuestionIds: [],
    crystals: 0,
    totalQuestXp: 0,
    questBadges: [],
    dailyCompletions: [],
    totalRuns: 0,
    totalCorrect: 0,
    totalAttempted: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getLocationUnlockStatus(
  locationId: string,
  progress: OceanQuestProgress,
  missions: OceanQuestMission[]
): { unlocked: boolean; reason: string } {
  const loc = OCEAN_LOCATIONS.find((l) => l.locationId === locationId);
  if (!loc) return { unlocked: false, reason: 'Unknown depth zone.' };
  if (loc.order === 1 || progress.unlockedLocations.includes(locationId)) {
    return { unlocked: true, reason: 'Depth zone unlocked' };
  }

  const prevLocId = loc.requiredLocationId;
  if (!prevLocId) return { unlocked: true, reason: 'Depth zone unlocked' };

  const prevLoc = OCEAN_LOCATIONS.find((l) => l.locationId === prevLocId);
  const prevMissions = missions.filter((m) => m.locationId === prevLocId && m.isPublished);
  const completedInPrev = prevMissions.filter((m) => progress.completedMissions.includes(m.missionId));

  // If the previous zone has a Boss mission, require defeating the boss to advance tiers cleanly
  const prevBoss = prevMissions.find((m) => m.isBoss);
  if (prevBoss && !progress.completedMissions.includes(prevBoss.missionId)) {
    return {
      unlocked: false,
      reason: `Defeat "${prevBoss.title}" in ${prevLoc?.name || 'previous zone'} to unlock.`,
    };
  }

  const requiredCount = loc.minCompletedInPrevLocation ?? 1;
  if (completedInPrev.length < requiredCount) {
    const remaining = Math.max(1, requiredCount - completedInPrev.length);
    return {
      unlocked: false,
      reason: `Complete ${remaining} more mission${remaining > 1 ? 's' : ''} in ${prevLoc?.name || 'the previous zone'} to unlock.`,
    };
  }

  return { unlocked: true, reason: 'Ready to explore' };
}

export function getMissionUnlockStatus(
  mission: OceanQuestMission,
  progress: OceanQuestProgress,
  missions: OceanQuestMission[]
): { unlocked: boolean; reason: string } {
  if (mission.mode === 'daily-challenge') {
    return { unlocked: true, reason: 'Available daily' };
  }

  const locStatus = getLocationUnlockStatus(mission.locationId, progress, missions);
  if (!locStatus.unlocked) {
    return locStatus;
  }

  const missingPrereqs = (mission.prerequisiteMissionIds || []).filter(
    (pid) => !progress.completedMissions.includes(pid)
  );
  if (missingPrereqs.length > 0) {
    const firstMissing = missions.find((m) => m.missionId === missingPrereqs[0]);
    return {
      unlocked: false,
      reason: `Clear "${firstMissing?.title || missingPrereqs[0]}" first.`,
    };
  }

  return { unlocked: true, reason: 'Mission ready' };
}

function mapDifficultyTarget(questDiff: OceanQuestDifficulty): Array<Question['difficulty']> {
  if (questDiff === 'beginner') return ['Easy', 'Medium', 'Hard'];
  if (questDiff === 'intermediate') return ['Medium', 'Easy', 'Hard'];
  return ['Hard', 'Medium', 'Easy'];
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Selects non-repeating SSC CGL questions from the verified repository.
 * Preserves authentic `sourceType` (`PYQ` vs `AI_GENERATED`), `year`, `tier`, `shift`.
 */
export function selectSmartQuestQuestions(
  allQuestions: Question[],
  mission: OceanQuestMission,
  seenQuestionIds: string[],
  runNonce = 0
): Question[] {
  const published = allQuestions.filter((q) => q.isPublished !== false);
  const subjectPool =
    mission.subject === 'mixed'
      ? published
      : published.filter((q) => q.subject === mission.subject);

  const pool = subjectPool.length >= mission.questionCount ? subjectPool : published;
  const seenSet = new Set(seenQuestionIds);
  const diffOrder = mapDifficultyTarget(mission.difficulty);
  const todayKey = new Date().toISOString().slice(0, 10);

  const scored = pool.map((q) => {
    const isUnseen = !seenSet.has(q.id);
    const diffRank = diffOrder.indexOf(q.difficulty);
    const diffScore = diffRank === 0 ? 300 : diffRank === 1 ? 150 : 50;
    const pyqBonus = q.sourceType === 'PYQ' ? 40 : 0;
    const seedJitter =
      mission.mode === 'daily-challenge'
        ? hashSeed(`${todayKey}:${q.id}`) % 97
        : hashSeed(`${mission.missionId}:${runNonce}:${q.id}`) % 97;

    return {
      q,
      weight: (isUnseen ? 1000 : 0) + diffScore + pyqBonus + seedJitter,
    };
  });

  scored.sort((a, b) => b.weight - a.weight);

  const selected: Question[] = [];
  const usedIds = new Set<string>();

  for (const item of scored) {
    if (selected.length >= mission.questionCount) break;
    if (!usedIds.has(item.q.id)) {
      usedIds.add(item.q.id);
      selected.push(item.q);
    }
  }

  return selected;
}

export function getSubjectDisplayName(subject: SubjectId | 'mixed'): string {
  switch (subject) {
    case 'quant':
      return 'Quantitative Aptitude';
    case 'reasoning':
      return 'General Intelligence & Reasoning';
    case 'english':
      return 'English Comprehension';
    case 'ga':
      return 'General Awareness';
    case 'computer':
      return 'Computer Knowledge';
    case 'mixed':
      return 'All SSC CGL Subjects';
  }
}
