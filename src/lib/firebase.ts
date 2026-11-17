import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, getFirestore, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Persist authentication state across reloads
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors in restricted iframe storage contexts
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Data sync error:', JSON.stringify(errInfo));
  throw new Error(errInfo.error || 'Unable to complete operation.');
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return true;
    }
    if (msg.includes('the client is offline')) {
      console.warn('Cloud sync currently offline; operating with local cache.');
    }
    return false;
  }
}

// Server-side authorization probe: returns true ONLY when Firestore Security Rules isAdmin() passes
export async function verifyServerAdminAccess(): Promise<boolean> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return false;
  try {
    await getDocFromServer(doc(db, 'adminMeta', 'access'));
    return true;
  } catch {
    return false;
  }
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username.trim());
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const lower = normalizeUsername(username);
  if (!isValidUsernameFormat(lower)) return false;
  const snap = await getDoc(doc(db, 'usernames', lower));
  return !snap.exists();
}

export async function registerWithEmail(
  username: string,
  fullName: string,
  email: string,
  password: string
): Promise<UserCredential> {
  const cleanUser = username.trim();
  const lowerUser = normalizeUsername(cleanUser);
  if (!isValidUsernameFormat(cleanUser)) {
    throw new Error('Username must be 3-32 characters (letters, numbers, _ or -).');
  }

  const available = await checkUsernameAvailable(lowerUser);
  if (!available) {
    throw new Error('This username is already taken. Please choose another.');
  }

  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName.trim()) {
    await fbUpdateProfile(cred.user, { displayName: fullName.trim().slice(0, 80) });
  }

  // Reserve unique username in Firestore (no email PII stored here)
  await setDoc(doc(db, 'usernames', lowerUser), {
    uid: cred.user.uid,
    username: cleanUser,
    createdAt: new Date().toISOString(),
  });

  // Register username -> email in server-side index for username+password login
  await fetch('/api/auth/register-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: lowerUser, email: email.trim().toLowerCase() }),
  }).catch(() => {});

  await sendEmailVerification(cred.user);
  return cred;
}

export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string
): Promise<UserCredential> {
  const trimmed = identifier.trim();
  let emailToUse = trimmed;

  if (!trimmed.includes('@')) {
    const res = await fetch('/api/auth/resolve-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: trimmed }),
    });
    if (!res.ok) {
      throw new Error('Invalid username or password.');
    }
    const body = (await res.json()) as { email?: string };
    if (!body.email) {
      throw new Error('Invalid username or password.');
    }
    emailToUse = body.email;
  }

  return signInWithEmailAndPassword(auth, emailToUse, password);
}

export async function resetPassword(identifier: string): Promise<void> {
  const trimmed = identifier.trim();
  let emailToUse = trimmed;
  if (!trimmed.includes('@')) {
    const res = await fetch('/api/auth/resolve-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: trimmed }),
    });
    if (!res.ok) {
      throw new Error('Account not found for that username. Try your registered email address.');
    }
    const body = (await res.json()) as { email?: string };
    if (!body.email) {
      throw new Error('Account not found.');
    }
    emailToUse = body.email;
  }
  await sendPasswordResetEmail(auth, emailToUse);
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error('No signed-in account.');
  await sendEmailVerification(auth.currentUser);
}

export async function refreshAuthUser(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}
