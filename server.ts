import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

import { OCEAN_MISSIONS_SEED } from './src/data/oceanQuestCatalog';

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
  en: 'English',
  ml: 'Malayalam (use clear natural Malayalam script and easy Manglish terms only for technical SSC keywords when helpful)',
  hi: 'Hindi (use clear natural Devanagari Hindi with standard SSC terminology)',
  ta: 'Tamil (use clear natural Tamil script with standard SSC terminology)',
};

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
        language = 'en',
        subjectContext = 'General SSC CGL',
        imageBase64,
        imageMimeType,
        studentContext,
      } = req.body as {
        messages: Array<{ role: 'user' | 'assistant'; text: string }>;
        language?: string;
        subjectContext?: string;
        imageBase64?: string;
        imageMimeType?: string;
        studentContext?: { level?: string; targetPost?: string; weakSubjects?: string[] };
      };

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      const langDesc = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
      const systemInstruction = [
        'You are "ExamVerse AI Tutor", a friendly, patient, and highly accurate SSC CGL exam coach.',
        `Respond primarily in ${langDesc}.`,
        'When explaining Previous Year Questions or English Grammar, preserve the original English question or key English words clearly alongside your explanation in the selected language.',
        'For Maths & Quantitative Aptitude, show step-by-step calculations plus a fast exam-hall shortcut trick.',
        'For Reasoning, explain the exact pattern/rule and why distractor options are incorrect.',
        'Be honest and rigorous: never claim an AI-generated practice question is an official SSC CGL answer key.',
        `Current subject focus: ${subjectContext}.`,
        studentContext?.targetPost ? `Student target post: ${studentContext.targetPost}.` : '',
        studentContext?.weakSubjects?.length
          ? `Student weak areas: ${studentContext.weakSubjects.join(', ')}.`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const latestUserMessage = messages[messages.length - 1]?.text || 'Help me prepare for SSC CGL.';
      const historyText = messages
        .slice(0, -1)
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
        .join('\n\n');

      const promptText = historyText
        ? `Previous conversation:\n${historyText}\n\nStudent's new question:\n${latestUserMessage}`
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
        },
      });

      res.json({
        reply: response.text || 'I could not generate a response. Please rephrase your SSC CGL question.',
      });
    } catch (error) {
      console.error('AI Tutor error:', error);
      const message = error instanceof Error ? error.message : 'Failed to contact ExamVerse AI Tutor';
      res.status(500).json({ error: message });
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
