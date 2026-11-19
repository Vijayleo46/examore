import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

import { OCEAN_MISSIONS_SEED } from './src/data/oceanQuestCatalog';
import { PAST_PAPERS_2026 } from './src/data/pastPapers2026';
import { SSC_PERSONAL_TEACHER_SYSTEM_PROMPT } from './src/data/sscMasterTeacher';
import type { AnswerVerificationStatus, Question, SubjectId } from './src/types/examverse';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const USERNAME_INDEX_DIR = path.resolve(__dirname, '.data');
const USERNAME_INDEX_FILE = path.join(USERNAME_INDEX_DIR, 'username_index.json');
const OCEAN_QUEST_CLAIMS_FILE = path.join(USERNAME_INDEX_DIR, 'ocean_quest_claims.json');

interface OceanQuestServerClaim {
  claimId: string;
  userId: string;
  missionId: string;
  claimType: 'first-clear' | 'daily-challenge';
  xpEarned: number;
  coinsEarned: number;
  crystalsEarned: number;
  claimedAt: string;
}

function readOceanQuestClaims(): Record<string, OceanQuestServerClaim> {
  try {
    if (!fs.existsSync(OCEAN_QUEST_CLAIMS_FILE)) return {};
    const raw = fs.readFileSync(OCEAN_QUEST_CLAIMS_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, OceanQuestServerClaim>;
  } catch {
    return {};
  }
}

function writeOceanQuestClaims(claims: Record<string, OceanQuestServerClaim>) {
  try {
    fs.mkdirSync(USERNAME_INDEX_DIR, { recursive: true });
    fs.writeFileSync(OCEAN_QUEST_CLAIMS_FILE, JSON.stringify(claims, null, 2), 'utf8');
  } catch (err) {
    console.warn('Unable to persist ocean quest claims:', err);
  }
}

function readUsernameIndex(): Record<string, string> {
  try {
    if (!fs.existsSync(USERNAME_INDEX_FILE)) return {};
    const raw = fs.readFileSync(USERNAME_INDEX_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeUsernameIndex(index: Record<string, string>) {
  try {
    fs.mkdirSync(USERNAME_INDEX_DIR, { recursive: true });
    fs.writeFileSync(USERNAME_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
  } catch (err) {
    console.warn('Unable to persist username index:', err);
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English (simple, clear, beginner-friendly explanation)',
  manglish:
    'Manglish (warm, friendly conversational Malayalam written in English/Roman letters mixed with exact English SSC technical terms like Percentage, Profit, Marked Price, Syllogism, Subject-Verb Agreement, OSI Layer — natural Kerala tutor tone)',
  ml: 'Malayalam (clear natural Malayalam script + exact English SSC technical terms)',
  hi: 'Hindi (clear natural Devanagari Hindi with standard SSC terminology)',
  ta: 'Tamil (clear natural Tamil script with standard SSC terminology)',
};

interface PyqArchiveCache {
  questions: Question[];
  byId: Map<string, Question>;
  summary: {
    total: number;
    byYear: Record<number, number>;
    bySubject: Record<SubjectId, number>;
    tier1Count: number;
    tier2Count: number;
    officialCount: number;
    unofficialCount: number;
    needsVerificationCount: number;
    topicsBySubject: Record<string, string[]>;
    examDates: string[];
    shifts: string[];
  };
}

let pyqArchiveCache: PyqArchiveCache | null = null;

function mapArchiveSubject(rawSubject: string): SubjectId {
  const low = String(rawSubject || '').toLowerCase();
  if (low.includes('jso') || low === 'statistics') return 'statistics';
  if (low.includes('quant') || low.includes('stat')) return 'quant';
  if (low.includes('reason') || low.includes('intelligence')) return 'reasoning';
  if (low.includes('english')) return 'english';
  if (low.includes('computer')) return 'computer';
  return 'ga';
}

function getPyqArchive(): PyqArchiveCache {
  if (pyqArchiveCache) return pyqArchiveCache;

  const byId = new Map<string, Question>();
  const archiveFile = path.resolve(__dirname, 'exports', 'SSC_CGL_2016_2025_Examora_Firestore.json');
  const letterIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  if (fs.existsSync(archiveFile)) {
    try {
      const rawArr = JSON.parse(fs.readFileSync(archiveFile, 'utf8')) as Array<Record<string, unknown>>;
      if (Array.isArray(rawArr)) {
        rawArr.forEach((raw, i) => {
          const qText = String(raw.question || '').trim();
          const optsObj = (raw.options || {}) as Record<string, unknown>;
          const optA = String(optsObj.A || 'Option A');
          const optB = String(optsObj.B || 'Option B');
          const optC = String(optsObj.C || 'Option C');
          const optD = String(optsObj.D || 'Option D');
          if (!qText) return;

          const ansLetter = String(raw.correctAnswer || '').trim().toUpperCase();
          const hasValidAns = ansLetter in letterIdx;
          const isVerifiedRaw = String(raw.verificationStatus || '').toLowerCase() === 'verified';
          const answerStatus: AnswerVerificationStatus =
            hasValidAns && isVerifiedRaw ? 'official' : 'needs_verification';
          const correctIndex = hasValidAns ? letterIdx[ansLetter] : 0;
          const year = Number(raw.year || 2024);
          const tier = raw.tier === 'Tier 2' ? 'Tier 2' : 'Tier 1';
          const subject = mapArchiveSubject(String(raw.subject || ''));
          const exp = String(
            raw.explanation ||
              (hasValidAns
                ? `Official SSC CGL ${year} ${tier} archived key identifies Option ${ansLetter} as correct.`
                : 'Requires key verification against official response sheet.')
          ).trim();

          const q: Question = {
            id: String(raw.id || `archive-${year}-${i}`),
            questionNumber: i + 1,
            subject,
            topic: String(raw.topic || 'General').trim(),
            year,
            examDate: raw.date ? String(raw.date) : undefined,
            shift: `${tier} · ${String(raw.shift || 'Shift 1')}`,
            tier,
            difficulty:
              raw.difficulty === 'Easy' || raw.difficulty === 'Hard' ? raw.difficulty : 'Medium',
            sourceType: 'PYQ',
            sourceLabel: `SSC CGL ${year} ${tier} Archive`,
            answerStatus,
            isVerified: answerStatus === 'official',
            isPublished: true,
            sourceUrls: raw.sourceUrl ? [String(raw.sourceUrl)] : undefined,
            questionEn: qText,
            questionHi: String(raw.language || '').toLowerCase() === 'hindi' ? qText : undefined,
            optionsEn: [optA, optB, optC, optD],
            correctIndex,
            explanations: {
              en: exp,
              ml: exp,
              hi: exp,
              ta: exp,
            },
            stepByStep: [
              `SSC CGL ${year} (${tier}${raw.date ? ` · ${String(raw.date)}` : ''})`,
              `Topic: ${String(raw.topic || 'General')}`,
              hasValidAns
                ? `Answer Key: Option ${ansLetter}`
                : 'Answer Status: Pending verification',
            ],
          };
          byId.set(q.id, q);
        });
      }
    } catch (err) {
      console.warn('Unable to load exports JSON archive:', err);
    }
  }

  for (const q26 of PAST_PAPERS_2026) {
    if (q26.sourceType !== 'AI_GENERATED') {
      byId.set(q26.id, { ...q26, isPublished: true });
    }
  }

  const seenNormalizedText = new Set<string>();
  const dedupedQuestions: Question[] = [];
  for (const q of byId.values()) {
    if (q.sourceType === 'AI_GENERATED') continue;
    const norm = String(q.questionEn || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!norm || seenNormalizedText.has(norm)) continue;
    seenNormalizedText.add(norm);
    dedupedQuestions.push(q);
  }

  const questions = dedupedQuestions.sort(
    (a, b) => b.year - a.year || (a.questionNumber || 0) - (b.questionNumber || 0)
  );

  const byYear: Record<number, number> = {};
  for (let y = 2016; y <= 2026; y++) byYear[y] = 0;
  const bySubject: Record<SubjectId, number> = {
    quant: 0,
    reasoning: 0,
    english: 0,
    ga: 0,
    computer: 0,
    statistics: 0,
  };
  let tier1Count = 0;
  let tier2Count = 0;
  let officialCount = 0;
  let unofficialCount = 0;
  let needsVerificationCount = 0;
  const topicSets: Record<string, Set<string>> = {
    all: new Set(),
    quant: new Set(),
    reasoning: new Set(),
    english: new Set(),
    ga: new Set(),
    computer: new Set(),
    statistics: new Set(),
  };
  const dateSet = new Set<string>();
  const shiftSet = new Set<string>();

  for (const q of questions) {
    if (q.year in byYear) byYear[q.year] += 1;
    else byYear[q.year] = (byYear[q.year] || 0) + 1;
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
    if (q.tier === 'Tier 2') tier2Count += 1;
    else tier1Count += 1;
    if (q.answerStatus === 'official') officialCount += 1;
    else if (q.answerStatus === 'unofficial') unofficialCount += 1;
    else needsVerificationCount += 1;
    if (q.topic) {
      topicSets.all.add(q.topic);
      topicSets[q.subject]?.add(q.topic);
    }
    if (q.examDate) dateSet.add(q.examDate);
    if (q.shift) shiftSet.add(q.shift);
  }

  const topicsBySubject: Record<string, string[]> = {};
  for (const [k, s] of Object.entries(topicSets)) {
    topicsBySubject[k] = Array.from(s).sort((a, b) => a.localeCompare(b));
  }

  pyqArchiveCache = {
    questions,
    byId,
    summary: {
      total: questions.length,
      byYear,
      bySubject,
      tier1Count,
      tier2Count,
      officialCount,
      unofficialCount,
      needsVerificationCount,
      topicsBySubject,
      examDates: Array.from(dateSet).sort((a, b) => b.localeCompare(a)),
      shifts: Array.from(shiftSet).sort((a, b) => a.localeCompare(b)),
    },
  };
  return pyqArchiveCache;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'examora-api' });
  });

  app.post('/api/auth/register-username', (req, res) => {
    const { username, email } = req.body as { username?: string; email?: string };
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,32}$/.test(cleanUser) || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid username or email.' });
    }
    const idx = readUsernameIndex();
    if (idx[cleanUser] && idx[cleanUser] !== cleanEmail) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    idx[cleanUser] = cleanEmail;
    writeUsernameIndex(idx);
    res.json({ ok: true });
  });

  app.post('/api/auth/resolve-username', (req, res) => {
    const { identifier } = req.body as { identifier?: string };
    const clean = String(identifier || '').trim().toLowerCase();
    if (!clean) {
      return res.status(400).json({ error: 'Username or email is required.' });
    }
    if (clean.includes('@')) {
      return res.json({ email: clean });
    }
    const idx = readUsernameIndex();
    const email = idx[clean];
    if (!email) {
      return res.status(404).json({ error: 'Account not found for that username.' });
    }
    return res.json({ email });
  });

  app.post('/api/ocean-quest/evaluate', (req, res) => {
    try {
      const {
        uid = 'guest',
        missionId,
        correctCount = 0,
        totalQuestions = 5,
        timeRemainingSec = 0,
        hintsUsed = 0,
        comboMax = 0,
        missionConfig,
      } = req.body as {
        uid?: string;
        missionId?: string;
        correctCount?: number;
        totalQuestions?: number;
        timeRemainingSec?: number;
        hintsUsed?: number;
        comboMax?: number;
        missionConfig?: {
          mode?: string;
          minAccuracyPct?: number;
          xpReward?: number;
          coinReward?: number;
          crystalReward?: number;
          badgeId?: string;
          timeLimitSec?: number;
        };
      };

      const cleanUid = String(uid || 'guest').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'guest';
      const cleanMissionId = String(missionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      if (!cleanMissionId) {
        return res.status(400).json({ error: 'missionId is required.' });
      }

      const seedMission = OCEAN_MISSIONS_SEED.find((m) => m.missionId === cleanMissionId);
      const boundedTotal = Math.max(1, Math.min(30, Math.round(Number(totalQuestions) || seedMission?.questionCount || 5)));
      const boundedCorrect = Math.max(0, Math.min(boundedTotal, Math.round(Number(correctCount) || 0)));
      const boundedCombo = Math.max(0, Math.min(boundedTotal, Math.round(Number(comboMax) || 0)));
      const boundedHints = Math.max(0, Math.min(10, Math.round(Number(hintsUsed) || 0)));
      const boundedTimeLeft = Math.max(0, Math.min(1800, Math.round(Number(timeRemainingSec) || 0)));

      const minAccuracyPct = seedMission
        ? seedMission.minAccuracyPct
        : Math.max(40, Math.min(95, Math.round(Number(missionConfig?.minAccuracyPct) || 60)));
      const maxMissionXp = seedMission
        ? seedMission.xpReward
        : Math.max(20, Math.min(450, Math.round(Number(missionConfig?.xpReward) || 120)));
      const maxMissionCoins = seedMission
        ? seedMission.coinReward
        : Math.max(10, Math.min(200, Math.round(Number(missionConfig?.coinReward) || 60)));
      const maxMissionCrystals = seedMission
        ? seedMission.crystalReward
        : Math.max(1, Math.min(30, Math.round(Number(missionConfig?.crystalReward) || 6)));
      const mode = seedMission?.mode || missionConfig?.mode || 'treasure-hunt';
      const badgeId = seedMission?.badgeId || missionConfig?.badgeId;

      const accuracy = Math.round((boundedCorrect / boundedTotal) * 100);
      const passed = accuracy >= minAccuracyPct;
      const stars = !passed ? 0 : accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : 1;
      const speedBonus = (seedMission?.timeLimitSec || missionConfig?.timeLimitSec || 0) > 0 ? Math.min(120, Math.round(boundedTimeLeft * 0.5)) : 0;
      const score = Math.max(0, boundedCorrect * 100 + boundedCombo * 25 + speedBonus - boundedHints * 15);

      const claims = readOceanQuestClaims();
      const todayKey = new Date().toISOString().slice(0, 10);
      const isDaily = mode === 'daily-challenge' || cleanMissionId === 'daily-ocean-tide';
      const claimType: 'first-clear' | 'daily-challenge' = isDaily ? 'daily-challenge' : 'first-clear';
      const claimKey = isDaily ? `${cleanUid}:daily:${todayKey}` : `${cleanUid}:first:${cleanMissionId}`;
      const existingClaim = claims[claimKey];

      let xpEarned = 0;
      let coinsEarned = 0;
      let crystalsEarned = 0;
      let isFirstClearClaim = false;
      let alreadyClaimedDaily = Boolean(isDaily && existingClaim);
      let unlockedBadgeId: string | undefined;
      let claimId: string | undefined;

      if (passed) {
        if (!existingClaim) {
          // Verified first-clear or once-daily reward grant
          const starScale = stars === 3 ? 1 : stars === 2 ? 0.9 : 0.8;
          xpEarned = Math.min(450, Math.round(maxMissionXp * starScale));
          coinsEarned = Math.min(200, Math.round(maxMissionCoins * starScale));
          crystalsEarned = Math.min(30, Math.max(1, Math.round(maxMissionCrystals * (stars === 3 ? 1 : 0.8))));
          isFirstClearClaim = !isDaily;
          unlockedBadgeId = badgeId;
          claimId = claimKey.replace(/[^a-zA-Z0-9_-]/g, '_');

          claims[claimKey] = {
            claimId,
            userId: cleanUid,
            missionId: cleanMissionId,
            claimType,
            xpEarned,
            coinsEarned,
            crystalsEarned,
            claimedAt: new Date().toISOString(),
          };
          writeOceanQuestClaims(claims);
        } else {
          // Modest capped replay practice reward (prevents XP/coin/crystal farming)
          xpEarned = Math.min(60, boundedCorrect * 6);
          coinsEarned = Math.min(25, boundedCorrect * 3);
          crystalsEarned = 0;
        }
      } else {
        // Effort reward on failed run so progress is never wiped
        xpEarned = Math.min(30, boundedCorrect * 4);
        coinsEarned = Math.min(12, boundedCorrect * 2);
        crystalsEarned = 0;
      }

      return res.json({
        missionId: cleanMissionId,
        passed,
        accuracy,
        stars,
        score,
        xpEarned,
        coinsEarned,
        crystalsEarned,
        isFirstClearClaim,
        alreadyClaimedDaily,
        unlockedBadgeId,
        claimId,
        claimType,
      });
    } catch (error) {
      console.error('Ocean Quest evaluation error:', error);
      return res.status(500).json({ error: 'Unable to evaluate Ocean Quest mission.' });
    }
  });

  app.post('/api/ai/tutor', async (req, res) => {
    try {
      const {
        messages = [],
        language = 'manglish',
        subjectContext = 'General SSC CGL',
        topicContext,
        mode = 'doubt',
        difficultyLevel = 'easy',
        imageBase64,
        imageMimeType,
        studentContext,
      } = req.body as {
        messages: Array<{ role: 'user' | 'assistant'; text: string }>;
        language?: string;
        subjectContext?: string;
        topicContext?: string;
        mode?: string;
        difficultyLevel?: string;
        imageBase64?: string;
        imageMimeType?: string;
        studentContext?: {
          level?: string;
          targetPost?: string;
          weakSubjects?: string[];
          revisionTopics?: string[];
        };
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.manglish;
      const systemInstruction = [
        SSC_PERSONAL_TEACHER_SYSTEM_PROMPT,
        `Active Teaching Language Style: ${langDesc}.`,
        `Active Mode: ${mode.toUpperCase()} · Subject Focus: ${subjectContext}${topicContext ? ` · Topic: ${topicContext}` : ''} · Current Level: ${difficultyLevel}.`,
        'When explaining English Grammar or Official Questions, preserve exact English wording alongside your explanation.',
        studentContext?.targetPost ? `Student Target Post: ${studentContext.targetPost}.` : '',
        studentContext?.weakSubjects?.length
          ? `Weak Subjects: ${studentContext.weakSubjects.join(', ')}.`
          : '',
        studentContext?.revisionTopics?.length
          ? `Topics Marked Revision Needed: ${studentContext.revisionTopics.join(', ')}.`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const latestUserMessage = messages[messages.length - 1]?.text || 'Help me prepare for SSC CGL.';
      const historyText = messages
        .slice(0, -1)
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'Student' : 'Teacher'}: ${m.text}`)
        .join('\n\n');

      const promptText = historyText
        ? `Previous conversation:\n${historyText}\n\nStudent's new message:\n${latestUserMessage}`
        : latestUserMessage;

      const contents =
        imageBase64 && imageMimeType
          ? {
              parts: [
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                  },
                },
                { text: promptText },
              ],
            }
          : promptText;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({
        reply: response.text || 'I could not generate a response. Please rephrase your SSC CGL question.',
      });
    } catch (error) {
      console.error('AI Tutor error:', error);
      const message = error instanceof Error ? error.message : 'Failed to contact Examora AI Personal Teacher';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/teacher-lesson', async (req, res) => {
    try {
      const {
        subject = 'quant',
        subjectTitle = 'Quantitative Aptitude',
        topic = 'Percentage',
        level = 'easy',
        language = 'manglish',
        isRevision = false,
      } = req.body as {
        subject?: SubjectId;
        subjectTitle?: string;
        topic?: string;
        level?: 'easy' | 'medium' | 'exam';
        language?: string;
        isRevision?: boolean;
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
      }

      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.manglish;
      const levelDesc =
        level === 'easy'
          ? 'Level 1 Easy (Absolute beginner foundation)'
          : level === 'medium'
          ? 'Level 2 Medium (Concept application & speed)'
          : 'Level 3 SSC Exam Level (Tier 1 & Tier 2 tricky patterns)';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Teach the SSC CGL syllabus topic "${topic}" under "${subjectTitle}" at "${levelDesc}".
${isRevision ? 'NOTE: The student previously made mistakes in this topic, so make the intuition super clear and address common traps.' : ''}
Language style: ${langDesc}.
Keep formulas, English technical terms, and numbers crisp and 100% accurate. Double check every calculation in workedExample before returning.`,
        config: {
          systemInstruction: `${SSC_PERSONAL_TEACHER_SYSTEM_PROMPT}\n\nReturn compact, encouraging, beginner-friendly JSON matching the required lesson fields.`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              easyExplanation: { type: Type.STRING },
              ruleOrFormula: { type: Type.STRING },
              workedExample: {
                type: Type.OBJECT,
                properties: {
                  problem: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  finalAnswer: { type: Type.STRING },
                },
              },
              examShortcut: { type: Type.STRING },
              whenNotToUseShortcut: { type: Type.STRING },
              commonMistake: { type: Type.STRING },
              quickCheckPrompt: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        topic,
        subject,
        level,
        easyExplanation: parsed.easyExplanation || '',
        ruleOrFormula: parsed.ruleOrFormula || '',
        workedExample: parsed.workedExample || { problem: '', steps: [], finalAnswer: '' },
        examShortcut: parsed.examShortcut || '',
        whenNotToUseShortcut: parsed.whenNotToUseShortcut || '',
        commonMistake: parsed.commonMistake || '',
        quickCheckPrompt: parsed.quickCheckPrompt || '',
      });
    } catch (error) {
      console.error('Teacher Lesson error:', error);
      res.status(500).json({ error: 'Unable to prepare the AI teacher lesson right now.' });
    }
  });

  app.post('/api/ai/teacher-question', async (req, res) => {
    try {
      const {
        subject = 'quant',
        subjectTitle = 'Quantitative Aptitude',
        topic = 'Percentage',
        keywords = [],
        level = 'easy',
        language = 'manglish',
        preferPyq = false,
        excludeIds = [],
      } = req.body as {
        subject?: SubjectId;
        subjectTitle?: string;
        topic?: string;
        keywords?: string[];
        level?: 'easy' | 'medium' | 'exam';
        language?: string;
        preferPyq?: boolean;
        excludeIds?: string[];
      };

      const excluded = new Set(excludeIds);
      const targetDiff = level === 'easy' ? 'Easy' : level === 'medium' ? 'Medium' : 'Hard';

      // Priority 1: Check authentic archived PYQs ONLY when matching verified archive exists
      if (preferPyq || level === 'exam') {
        const archive = getPyqArchive();
        const searchTerms = [topic.toLowerCase(), ...keywords.map((k) => k.toLowerCase())].filter(Boolean);
        const matches = archive.questions.filter((q) => {
          if (excluded.has(q.id)) return false;
          if (q.subject !== subject && !(subject === 'statistics' && q.subject === 'quant')) return false;
          if (q.answerStatus !== 'official') return false;
          const hay = `${q.topic} ${q.questionEn}`.toLowerCase();
          return searchTerms.some((term) => hay.includes(term));
        });

        const diffMatches = matches.filter((m) => m.difficulty === targetDiff);
        const pool = diffMatches.length > 0 ? diffMatches : matches;

        if (pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * Math.min(pool.length, 15))];
          return res.json({
            id: picked.id,
            provenance: 'AUTHENTIC_PYQ',
            subject,
            topic,
            level,
            question: picked.questionEn,
            options: picked.optionsEn,
            correctIndex: picked.correctIndex,
            hint1: `Focus on the core rule of ${topic}. Identify what value is given and what the question asks.`,
            hint2: picked.stepByStep?.[0] || `Break the problem into two clean steps using ${topic} fundamentals.`,
            fullSolution:
              picked.explanations?.en ||
              (picked.stepByStep ? picked.stepByStep.join(' ') : 'Check the verified answer key.'),
            memoryTip: picked.shortcutMethod || `Always verify units and options for ${topic} in SSC CGL.`,
            pyqMeta: {
              questionId: picked.id,
              year: picked.year,
              tier: picked.tier,
              examDate: picked.examDate,
              shift: picked.shift,
              verificationStatus: 'Official Answer Key Verified',
            },
          });
        }
      }

      // Priority 2: Generate an original practice question clearly tagged GENERATED_PRACTICE
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
      }

      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.manglish;
      const levelDesc =
        level === 'easy'
          ? 'Level 1 Easy (beginner-friendly single concept)'
          : level === 'medium'
          ? 'Level 2 Medium (multi-step application)'
          : 'Level 3 SSC Exam Level (realistic SSC CGL Tier 1/Tier 2 standard)';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate ONE original SSC CGL practice MCQ (GENERATED_PRACTICE — do NOT claim it is a past year paper) for:
Subject: ${subjectTitle}
Topic: ${topic}
Difficulty: ${levelDesc}

Requirements:
- Question and 4 options MUST be in crisp, unambiguous SSC exam English.
- Double-check arithmetic, grammar, and logic so options[correctIndex] is 100% mathematically/grammatically correct and unique.
- Write hint1 (gentle direction without giving away the answer), hint2 (formula or first calculation step), fullSolution (clear step-by-step), and memoryTip in: ${langDesc}.`,
        config: {
          systemInstruction: SSC_PERSONAL_TEACHER_SYSTEM_PROMPT,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              hint1: { type: Type.STRING },
              hint2: { type: Type.STRING },
              fullSolution: { type: Type.STRING },
              memoryTip: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const opts = Array.isArray(parsed.options) && parsed.options.length >= 4
        ? parsed.options.slice(0, 4).map(String)
        : ['Option A', 'Option B', 'Option C', 'Option D'];
      const safeIdx = Math.min(3, Math.max(0, Number(parsed.correctIndex || 0)));

      res.json({
        id: `gen-${subject}-${Date.now()}`,
        provenance: 'GENERATED_PRACTICE',
        subject,
        topic,
        level,
        question: String(parsed.question || ''),
        options: opts,
        correctIndex: safeIdx,
        hint1: String(parsed.hint1 || ''),
        hint2: String(parsed.hint2 || ''),
        fullSolution: String(parsed.fullSolution || ''),
        memoryTip: String(parsed.memoryTip || ''),
      });
    } catch (error) {
      console.error('Teacher Question error:', error);
      res.status(500).json({ error: 'Unable to load practice question right now.' });
    }
  });

  app.post('/api/ai/mistake-analysis', async (req, res) => {
    try {
      const {
        question = '',
        options = [],
        selectedIndex = 0,
        correctIndex = 0,
        subjectTitle = 'Quantitative Aptitude',
        topic = 'Percentage',
        level = 'easy',
        language = 'manglish',
        studentNote = '',
      } = req.body as {
        question?: string;
        options?: string[];
        selectedIndex?: number;
        correctIndex?: number;
        subjectTitle?: string;
        topic?: string;
        level?: 'easy' | 'medium' | 'exam';
        language?: string;
        studentNote?: string;
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment secrets.' });
      }

      const isCorrect = Number(selectedIndex) === Number(correctIndex);
      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.manglish;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this student's answer on SSC CGL ${subjectTitle} — ${topic} (${level} level).
Question: ${question}
Options: ${options.map((o, i) => `${['A', 'B', 'C', 'D'][i]}) ${o}`).join(' | ')}
Student picked: ${['A', 'B', 'C', 'D'][selectedIndex]} (${options[selectedIndex] || ''})
Correct option: ${['A', 'B', 'C', 'D'][correctIndex]} (${options[correctIndex] || ''})
Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}
${studentNote ? `Student note: ${studentNote}` : ''}

Respond in ${langDesc}:
1. whyWrongOrRight: Warm, specific explanation of WHY their picked option went wrong (the exact trap/misconception) or why their reasoning succeeded.
2. simpleReteach: Very short 2-line clear re-teach of the core rule.
3. memoryTrick: 1-line easy memory hook or exam check trick.
4. nextAction: Choose 'step_down' (if wrong at medium/exam and struggling), 'stay' (if wrong at easy or needs 1 more check), or 'level_up' (if correct and ready to progress).
5. checkQuestion: A tiny 1-line "Did this click?" or mini sanity-check question for the student.`,
        config: {
          systemInstruction: SSC_PERSONAL_TEACHER_SYSTEM_PROMPT,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyWrongOrRight: { type: Type.STRING },
              simpleReteach: { type: Type.STRING },
              memoryTrick: { type: Type.STRING },
              nextAction: { type: Type.STRING },
              checkQuestion: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const rawAction = String(parsed.nextAction || (isCorrect ? 'level_up' : 'stay'));
      const nextAction =
        rawAction === 'step_down' || rawAction === 'level_up' || rawAction === 'stay'
          ? rawAction
          : isCorrect
          ? 'level_up'
          : 'stay';

      res.json({
        isCorrect,
        whyWrongOrRight: String(parsed.whyWrongOrRight || ''),
        simpleReteach: String(parsed.simpleReteach || ''),
        memoryTrick: String(parsed.memoryTrick || ''),
        nextAction,
        checkQuestion: String(parsed.checkQuestion || ''),
      });
    } catch (error) {
      console.error('Mistake Analysis error:', error);
      res.status(500).json({ error: 'Unable to run mistake analysis right now.' });
    }
  });

  app.post('/api/ai/study-plan', async (req, res) => {
    try {
      const {
        hoursPerDay = 4,
        examTarget = 'SSC CGL Tier 1 + Tier 2',
        weakSubjects = ['Quantitative Aptitude'],
        strongSubjects = ['Reasoning'],
        preferredLanguage = 'en',
        examDate = '2026-09-15',
      } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const langDesc = LANGUAGE_NAMES[preferredLanguage] || LANGUAGE_NAMES.en;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create a practical daily SSC CGL study timetable for a student with ${hoursPerDay} hours/day targeting ${examTarget} (exam date: ${examDate}). Weak subjects: ${weakSubjects.join(', ')}. Strong subjects: ${strongSubjects.join(', ')}. Include video lessons, PYQ practice, mock test/quiz slots, revision, and short breaks. Write descriptions in ${langDesc}.`,
        config: {
          systemInstruction:
            'You are an expert SSC CGL academic strategist. Produce realistic, high-impact daily study blocks that add up to the requested daily hours.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              weeklyTarget: { type: Type.STRING },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeSlot: { type: Type.STRING },
                    activityType: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error) {
      console.error('Study Plan AI error:', error);
      res.status(500).json({ error: 'Failed to generate AI study plan.' });
    }
  });

  app.post('/api/ai/generate-practice', async (req, res) => {
    try {
      const {
        subject = 'Quantitative Aptitude',
        topic = 'Percentage',
        difficulty = 'Medium',
        language = 'en',
        count = 3,
      } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate ${Math.min(Number(count) || 3, 5)} original SSC CGL Tier 1/Tier 2 practice MCQs on Subject: ${subject}, Topic: ${topic}, Difficulty: ${difficulty}. Keep questionEn and optionsEn in crisp exam English. Provide explanation in ${langDesc}.`,
        config: {
          systemInstruction:
            'Generate accurate, unambiguous SSC CGL style multiple choice questions with 4 options (index 0-3) and verified arithmetic/logic.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionEn: { type: Type.STRING },
                optionsEn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
            },
          },
        },
      });

      const items = JSON.parse(response.text || '[]');
      res.json({ questions: items });
    } catch (error) {
      console.error('Practice generator error:', error);
      res.status(500).json({ error: 'Failed to generate practice questions.' });
    }
  });

  app.post('/api/predictor/generate-question', async (req, res) => {
    try {
      const {
        examYear = 2026,
        tier = 'Tier 1',
        subject = 'quant',
        topic = 'Percentage',
        difficulty = 'Medium',
        language = 'en',
        count = 2,
      } = req.body as {
        examYear?: number;
        tier?: 'Tier 1' | 'Tier 2';
        subject?: string;
        topic?: string;
        difficulty?: 'Easy' | 'Medium' | 'Hard';
        language?: string;
        count?: number;
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const safeCount = Math.min(4, Math.max(1, Math.round(Number(count) || 2)));
      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create ${safeCount} original SSC CGL ${examYear} (${tier}) expected practice MCQ(s) for Subject: ${subject}, Topic: ${topic}, Difficulty: ${difficulty}.
Requirements:
- Original fresh problem inspired by SSC CGL syllabus & recent 2022-2025 pattern — NOT copied from past papers and NEVER claiming to be an official leaked/guaranteed exam question.
- Keep questionEn and 4 optionsEn in crisp exam English.
- Provide clear explanation + stepByStep array (3-5 concise steps) + usefulnessReason (1 sentence explaining why practicing this concept helps for ${tier}) in ${langDesc}.
- Double-check all arithmetic, grammar, and reasoning so correctIndex (0..3) matches the exact right option.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an SSC CGL curriculum specialist generating original expected practice questions. Output strictly valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionEn: { type: Type.STRING },
                optionsEn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                stepByStep: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                usefulnessReason: { type: Type.STRING },
              },
              required: [
                'questionEn',
                'optionsEn',
                'correctIndex',
                'explanation',
                'stepByStep',
                'usefulnessReason',
              ],
            },
          },
        },
      });

      const rawItems = JSON.parse(response.text || '[]') as Array<{
        questionEn?: string;
        optionsEn?: string[];
        correctIndex?: number;
        explanation?: string;
        stepByStep?: string[];
        usefulnessReason?: string;
      }>;

      const sanitized = (Array.isArray(rawItems) ? rawItems : []).slice(0, safeCount).map((item, idx) => {
        const opts = Array.isArray(item.optionsEn) ? item.optionsEn.slice(0, 4).map(String) : [];
        while (opts.length < 4) opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        return {
          id: `pred-ai-${Date.now()}-${idx}`,
          examYear: Number(examYear) || 2026,
          tier: tier === 'Tier 2' ? 'Tier 2' : 'Tier 1',
          subject: ['quant', 'reasoning', 'english', 'ga', 'computer'].includes(subject)
            ? subject
            : 'quant',
          topic: String(topic || 'Percentage').slice(0, 80),
          difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
          questionEn: String(item.questionEn || '').trim(),
          optionsEn: opts as [string, string, string, string],
          correctIndex: Math.min(3, Math.max(0, Math.round(Number(item.correctIndex) || 0))),
          explanation: String(item.explanation || '').trim(),
          stepByStep: Array.isArray(item.stepByStep) ? item.stepByStep.map(String).slice(0, 8) : [],
          relatedTopic: String(topic || 'Percentage').slice(0, 80),
          usefulnessReason:
            String(item.usefulnessReason || '').trim() ||
            `Builds speed and conceptual mastery in ${topic} for SSC CGL ${tier}.`,
          aiNoticeLabel: 'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION',
          sourceType: 'AI_GENERATED',
          isOfficialPyq: false,
          reviewStatus: 'pending',
          isPublished: false,
          createdAt: new Date().toISOString(),
        };
      });

      return res.json({ questions: sanitized });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate expected practice questions.';
      console.error('Predictor question error:', msg);
      return res.status(500).json({ error: msg.slice(0, 240) });
    }
  });

  app.post('/api/predictor/current-affairs', async (req, res) => {
    try {
      const { category = 'All', targetYear = 2026 } = req.body as {
        category?: string;
        targetYear?: number;
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const allowedCategories = [
        'National',
        'International',
        'Government Schemes',
        'Awards & Appointments',
        'Science & Technology',
        'Economy & Reports',
        'Sports & Major Events',
      ];

      const catPrompt =
        category && category !== 'All'
          ? `Focus specifically on the category: ${category}.`
          : `Cover across categories: ${allowedCategories.join(', ')}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Find 5 recent verified India & Global current affairs developments relevant for SSC CGL ${targetYear} General Awareness preparation. ${catPrompt}
For each item provide a JSON array inside a \`\`\`json code block where each object has:
- category (strictly one of: ${allowedCategories.join(', ')})
- title (concise headline)
- summary (2 factual sentences)
- examRelevance (1 sentence on SSC CGL General Awareness angle — never claim this question is guaranteed to appear)
- publishedDate (YYYY-MM-DD or Month YYYY from verified source)
- sourceName (e.g. PIB, RBI, ISRO, Press Information Bureau, Ministry of Finance, The Hindu)
- sourceUrl (exact official/reliable URL from search results)`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';
      const groundingChunks =
        (response.candidates?.[0]?.groundingMetadata?.groundingChunks as Array<{
          web?: { uri?: string; title?: string };
        }>) || [];
      const groundedLinks = groundingChunks
        .map((c) => ({
          uri: c.web?.uri || '',
          title: c.web?.title || 'Verified Web Source',
        }))
        .filter((x) => x.uri.startsWith('http'));

      let parsedItems: Array<Record<string, unknown>> = [];
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/(\[[\s\S]*\])/);
      if (jsonMatch?.[1]) {
        try {
          const candidate = JSON.parse(jsonMatch[1].trim());
          if (Array.isArray(candidate)) parsedItems = candidate;
        } catch {
          parsedItems = [];
        }
      }

      const items = parsedItems.slice(0, 6).map((item, idx) => {
        const rawCat = String(item.category || '');
        const validCat = allowedCategories.includes(rawCat)
          ? rawCat
          : allowedCategories[idx % allowedCategories.length];
        const fallbackSource = groundedLinks[idx] || groundedLinks[0];
        const rawUrl = String(item.sourceUrl || '').trim();
        const safeUrl = rawUrl.startsWith('http') ? rawUrl : fallbackSource?.uri || 'https://www.pib.gov.in';
        return {
          id: `ca-live-${Date.now()}-${idx}`,
          category: validCat,
          title: String(item.title || 'Current Affairs Update').slice(0, 180),
          summary: String(item.summary || '').slice(0, 900),
          examRelevance: String(
            item.examRelevance || 'Relevant for SSC CGL General Awareness revision (not guaranteed).'
          ).slice(0, 400),
          publishedDate: String(item.publishedDate || new Date().toISOString().slice(0, 10)).slice(0, 32),
          sourceName: String(item.sourceName || fallbackSource?.title || 'Verified Source').slice(0, 80),
          sourceUrl: safeUrl.slice(0, 480),
          targetYear: Number(targetYear) || 2026,
          isPublished: true,
          createdAt: new Date().toISOString(),
        };
      });

      return res.json({
        items,
        groundedLinks: groundedLinks.slice(0, 8),
        rawSummary: items.length === 0 ? rawText : undefined,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to fetch live current affairs summaries.';
      console.error('Current affairs search error:', msg);
      return res.status(500).json({ error: msg.slice(0, 240) });
    }
  });

  app.post('/api/predictor/study-plan', async (req, res) => {
    try {
      const {
        examYear = 2026,
        tier = 'Tier 1',
        hoursPerDay = 4,
        daysUntilExam = 90,
        preferredLanguage = 'en',
        weakTopics = [],
        strongTopics = [],
        predictedTopics = [],
        overallAccuracy = 0,
      } = req.body as {
        examYear?: number;
        tier?: string;
        hoursPerDay?: number;
        daysUntilExam?: number;
        preferredLanguage?: string;
        weakTopics?: string[];
        strongTopics?: string[];
        predictedTopics?: string[];
        overallAccuracy?: number;
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const langDesc = LANGUAGE_NAMES[preferredLanguage] || LANGUAGE_NAMES.en;
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Build a personalized SSC CGL ${examYear} (${tier}) Daily & Weekly Study Plan.
Student metrics:
- Study hours available/day: ${hoursPerDay}
- Estimated days until exam: ${daysUntilExam}
- Overall accuracy so far: ${overallAccuracy}%
- Weak topics / subjects: ${weakTopics.join(', ') || 'None identified yet'}
- Strong topics / subjects: ${strongTopics.join(', ') || 'Balanced'}
- Top Predicted High-Priority Topics: ${predictedTopics.slice(0, 8).join(', ')}

Respond in ${langDesc} for descriptions while keeping SSC topic names clear. Provide both daily time blocks summing to ~${hoursPerDay}h and a 7-day Monday-Sunday weekly plan focusing on bridging weak topics alongside high-priority predicted topics.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an SSC CGL academic planner. Produce realistic daily and weekly study schedules without claiming guaranteed exam questions.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              weeklyTarget: { type: Type.STRING },
              dailyBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeSlot: { type: Type.STRING },
                    activityType: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                  },
                },
              },
              weeklySchedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    focus: { type: Type.STRING },
                    hours: { type: Type.NUMBER },
                    tasks: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate personalized predictor plan.';
      console.error('Predictor study plan error:', msg);
      return res.status(500).json({ error: msg.slice(0, 240) });
    }
  });

  app.get('/api/pyq/summary', (_req, res) => {
    const archive = getPyqArchive();
    res.json(archive.summary);
  });

  app.get('/api/pyq/questions', (req, res) => {
    const archive = getPyqArchive();
    const yearParam = String(req.query.year || 'all');
    const tierParam = String(req.query.tier || 'all');
    const subjectParam = String(req.query.subject || 'all');
    const topicParam = String(req.query.topic || 'all');
    const examDateParam = String(req.query.examDate || 'all');
    const shiftParam = String(req.query.shift || 'all');
    const diffParam = String(req.query.difficulty || 'all');
    const statusParam = String(req.query.answerStatus || 'all');
    const searchParam = String(req.query.q || '').trim().toLowerCase();
    const sortParam = String(req.query.sort || 'year-desc');
    const page = Math.max(1, Number(req.query.page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const filtered = archive.questions.filter((q) => {
      if (yearParam !== 'all' && String(q.year) !== yearParam) return false;
      if (tierParam !== 'all' && q.tier !== tierParam) return false;
      if (subjectParam !== 'all' && q.subject !== subjectParam) return false;
      if (topicParam !== 'all' && q.topic !== topicParam) return false;
      if (examDateParam !== 'all' && (q.examDate || '') !== examDateParam) return false;
      if (shiftParam !== 'all' && q.shift !== shiftParam) return false;
      if (diffParam !== 'all' && q.difficulty !== diffParam) return false;
      if (statusParam !== 'all' && (q.answerStatus || 'official') !== statusParam) return false;
      if (searchParam) {
        const hay = `${q.questionEn} ${q.topic} ${q.shift} ${q.year} ${q.explanations.en}`.toLowerCase();
        if (!hay.includes(searchParam)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sortParam === 'year-asc') {
      sorted.sort((a, b) => a.year - b.year || (a.questionNumber || 0) - (b.questionNumber || 0));
    } else if (sortParam === 'subject') {
      sorted.sort((a, b) => a.subject.localeCompare(b.subject) || b.year - a.year);
    } else if (sortParam === 'topic') {
      sorted.sort((a, b) => a.topic.localeCompare(b.topic) || b.year - a.year);
    } else {
      sorted.sort((a, b) => b.year - a.year || (a.questionNumber || 0) - (b.questionNumber || 0));
    }

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limitNum;
    const items = sorted.slice(start, start + limitNum);

    res.json({
      items,
      total,
      page: safePage,
      limit: limitNum,
      totalPages,
    });
  });

  app.get('/api/pyq/mock-set', (req, res) => {
    const archive = getPyqArchive();
    const yearParam = String(req.query.year || 'all');
    const tierParam = String(req.query.tier || 'Tier 1');
    const subjectParam = String(req.query.subject || 'all');
    const limitNum = Math.min(100, Math.max(5, Number(req.query.limit || 25)));

    const visualSkip = /in the following figure|given figure|shown below|mirror image|paper.*fold|embedded figure/i;
    const pool = archive.questions.filter((q) => {
      if (yearParam !== 'all' && String(q.year) !== yearParam) return false;
      if (tierParam !== 'all' && q.tier !== tierParam) return false;
      if (subjectParam !== 'all' && q.subject !== subjectParam) return false;
      if (q.questionHi && q.questionHi === q.questionEn) return false;
      if (q.answerStatus === 'needs_verification') return false;
      if (visualSkip.test(q.questionEn)) return false;
      return true;
    });

    // Balance across subjects when subject === 'all'
    if (subjectParam === 'all') {
      const buckets: Record<SubjectId, Question[]> = {
        quant: [],
        reasoning: [],
        english: [],
        ga: [],
        computer: [],
        statistics: [],
      };
      pool.forEach((q) => buckets[q.subject]?.push(q));
      const picked: Question[] = [];
      const order: SubjectId[] =
        tierParam === 'Tier 2'
          ? ['quant', 'reasoning', 'english', 'ga', 'computer']
          : ['quant', 'reasoning', 'english', 'ga'];
      let round = 0;
      while (picked.length < limitNum && round < 50) {
        let added = false;
        for (const s of order) {
          if (buckets[s].length > 0) {
            picked.push(buckets[s].shift()!);
            added = true;
            if (picked.length >= limitNum) break;
          }
        }
        if (!added) break;
        round++;
      }
      return res.json({ questions: picked });
    }

    return res.json({ questions: pool.slice(0, limitNum) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamVerse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
