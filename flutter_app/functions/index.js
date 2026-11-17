const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');

initializeApp();

const DATABASE_ID = 'ai-studio-a424a45a-642f-4a57-b2e1-2cf2fca8e554';
const db = getFirestore(DATABASE_ID);

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
 * Server-side Gemini AI Tutor proxy (API key stays in Cloud Functions Secret Manager).
 */
exports.aiTutorReply = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in first.');
    }

    const prompt = (request.data?.prompt || '').toString().trim();
    const language = (request.data?.language || 'en').toString();
    if (!prompt) {
      throw new HttpsError('invalid-argument', 'Prompt cannot be empty.');
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are Examora AI Tutor for SSC CGL Tier 1 & Tier 2.\nReply clearly in ${language}.\n\nStudent question:\n${prompt}`,
    });

    return { text: response.text || 'Unable to generate response.' };
  }
);
