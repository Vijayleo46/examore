const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');

initializeApp();

const DATABASE_ID = 'ai-studio-a424a45a-642f-4a57-b2e1-2cf2fca8e554';
const db = getFirestore(DATABASE_ID);

function buildLanguageInstruction(language) {
  switch ((language || 'en').toString().toLowerCase()) {
    case 'ml':
      return 'Respond in clear, natural Malayalam (using English for technical math/grammar terms where helpful).';
    case 'manglish':
      return 'Respond in friendly, easy-to-read Manglish (Malayalam typed cleanly in English letters, e.g. "Step-by-step aayi nokkaam") suitable for Kerala SSC CGL students.';
    case 'hi':
      return 'Respond in clear, student-friendly Hindi.';
    case 'ta':
      return 'Respond in clear, student-friendly Tamil.';
    default:
      return 'Respond in clear, simple English.';
  }
}

async function runTutorModel({ message, language, topic, subject, mode, difficultyLevel, systemPrompt, history }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'AI service is not configured yet.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const langRule = buildLanguageInstruction(language);
  const sys = systemPrompt && String(systemPrompt).trim().length > 0
    ? String(systemPrompt).trim()
    : [
        'You are Examora AI Personal Teacher for SSC CGL Tier 1 & Tier 2.',
        'Teach step by step: (1) Easy Explanation, (2) Core Rule/Formula & Worked Example, (3) Exam Shortcut & Caution, (4) Common Mistake.',
        'When the student submits a wrong answer, gently explain WHY the chosen option is wrong, re-teach the concept simply, and offer a fresh question at appropriate difficulty.',
        'Always label generated drills clearly as GENERATED_PRACTICE (never pretend a generated item is an official SSC paper).',
        langRule,
      ].join('\n');

  const contextLines = [
    subject ? `Subject: ${subject}` : null,
    topic ? `Topic: ${topic}` : null,
    mode ? `Teaching Mode: ${mode}` : null,
    difficultyLevel ? `Difficulty Level: ${difficultyLevel}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const historyText = Array.isArray(history) && history.length > 0
    ? history
        .slice(-6)
        .map((m) => `${m.role === 'assistant' ? 'Teacher' : 'Student'}: ${String(m.message || '').slice(0, 400)}`)
        .join('\n')
    : '';

  const prompt = [
    sys,
    contextLines ? `\nLesson Context: ${contextLines}` : '',
    historyText ? `\nRecent Conversation:\n${historyText}` : '',
    `\nStudent Message:\n${message}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return (response.text || '').trim() || 'Unable to generate response right now. Please try again.';
}

/**
 * Resolves a username -> email strictly server-side using Firebase Admin SDK
 * so /usernames collection never needs to expose email PII to clients.
 */
exports.resolveUsernameEmail = onCall({ cors: true }, async (request) => {
  const raw = (request.data?.username || '').toString().trim().toLowerCase();
  if (!raw || !/^[a-z0-9_-]{3,32}$/.test(raw)) {
    throw new HttpsError('invalid-argument', 'Valid username required.');
  }

  const usernameDoc = await db.collection('usernames').doc(raw).get();
  if (!usernameDoc.exists) {
    throw new HttpsError('not-found', 'Invalid username or password.');
  }

  const uid = usernameDoc.data()?.uid;
  if (!uid) {
    throw new HttpsError('not-found', 'Invalid username or password.');
  }

  const userRecord = await getAuth().getUser(uid);
  return { email: userRecord.email || '' };
});

/**
 * Primary Examora AI Personal Teacher callable used by Flutter StudentTutorScreen & FirestoreService.
 */
exports.askExamoraTutor = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in first.');
    }

    const message = (request.data?.message || request.data?.prompt || '').toString().trim();
    if (!message) {
      throw new HttpsError('invalid-argument', 'Message cannot be empty.');
    }

    const reply = await runTutorModel({
      message,
      language: request.data?.language || 'en',
      topic: request.data?.topic || '',
      subject: request.data?.subject || '',
      mode: request.data?.mode || 'teach',
      difficultyLevel: request.data?.difficultyLevel || '',
      systemPrompt: request.data?.systemPrompt || '',
      history: request.data?.history || [],
    });

    return { reply, answer: reply, text: reply };
  }
);

/**
 * Backwards-compatible alias for aiTutorReply callers.
 */
exports.aiTutorReply = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in first.');
    }

    const prompt = (request.data?.prompt || request.data?.message || '').toString().trim();
    if (!prompt) {
      throw new HttpsError('invalid-argument', 'Prompt cannot be empty.');
    }

    const text = await runTutorModel({
      message: prompt,
      language: request.data?.language || 'en',
      topic: request.data?.topic || '',
      subject: request.data?.subject || '',
      mode: request.data?.mode || 'teach',
      difficultyLevel: request.data?.difficultyLevel || '',
      systemPrompt: request.data?.systemPrompt || '',
      history: request.data?.history || [],
    });

    return { text, reply: text };
  }
);

/**
 * Server-side expected practice question generator for Future Exam Predictor.
 * Always marks output as AI_GENERATED / isOfficialPyq: false.
 */
exports.generatePredictorQuestions = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in first.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'AI service is not configured yet.');
    }

    const examYear = Number(request.data?.examYear || 2026);
    const tier = (request.data?.tier || 'Tier 1').toString();
    const subject = (request.data?.subject || 'quant').toString();
    const topic = (request.data?.topic || 'Percentage').toString();
    const difficulty = (request.data?.difficulty || 'Medium').toString();
    const count = Math.min(Math.max(Number(request.data?.count || 3), 1), 10);

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Generate ${count} original SSC CGL ${tier} (${examYear} trend) practice MCQs for Subject="${subject}", Topic="${topic}", Difficulty="${difficulty}".
Return strictly a JSON array (no markdown fences) where each element has:
{
  "questionEn": "string",
  "optionsEn": ["opt1", "opt2", "opt3", "opt4"],
  "correctIndex": 0,
  "explanation": "clear step-by-step explanation",
  "stepByStep": ["step 1", "step 2"],
  "usefulnessReason": "why this pattern matters for SSC CGL ${examYear}"
}
Ensure mathematical/factual correctness and strictly 4 options.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const rawText = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    let parsed = [];
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) parsed = json;
    } catch (_) {
      parsed = [];
    }

    const questions = parsed.slice(0, count).map((q, idx) => ({
      questionId: `pred_${Date.now()}_${idx}`,
      examYear,
      tier,
      subject,
      topic,
      difficulty,
      questionEn: String(q.questionEn || '').trim(),
      optionsEn: Array.isArray(q.optionsEn) && q.optionsEn.length === 4 ? q.optionsEn.map(String) : ['A', 'B', 'C', 'D'],
      correctIndex: Math.min(Math.max(Number(q.correctIndex ?? 0), 0), 3),
      explanation: String(q.explanation || '').trim(),
      stepByStep: Array.isArray(q.stepByStep) ? q.stepByStep.map(String) : [],
      usefulnessReason: String(q.usefulnessReason || `Aligned with SSC CGL ${tier} ${topic} trend.`).trim(),
      sourceType: 'AI_GENERATED',
      isOfficialPyq: false,
      aiNoticeLabel: 'AI-GENERATED EXPECTED PRACTICE QUESTION – NOT AN OFFICIAL SSC QUESTION',
    })).filter((q) => q.questionEn.length > 0);

    return { questions };
  }
);
