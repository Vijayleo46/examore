import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const USERNAME_INDEX_DIR = path.resolve(__dirname, '.data');
const USERNAME_INDEX_FILE = path.join(USERNAME_INDEX_DIR, 'username_index.json');

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
