import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Sun,
  User,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { TARGET_POSTS } from '../data/sscCurriculum';
import { isValidUsernameFormat } from '../lib/firebase';

const AVATAR_IMG = '/src/assets/images/avatar_scholar_emblem_1794828673745.jpg';

export const ProfileAndSettings: React.FC<{
  onOpenAnalytics: () => void;
  onOpenPlanner: () => void;
}> = ({ onOpenAnalytics, onOpenPlanner }) => {
  const {
    language,
    setLanguage,
    theme,
    toggleTheme,
    soundMuted,
    toggleSound,
    firebaseUser,
    signInWithGoogle,
    checkUsernameUnique,
    registerEmailAccount,
    loginEmailAccount,
    sendPasswordReset,
    resendVerification,
    checkEmailVerification,
    signOut,
    profile,
    updateProfile,
    bookmarks,
    testAttempts,
    levelInfo,
  } = useApp();

  const t = UI_TEXT[language];

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (authMode !== 'register') {
      setUsernameStatus('idle');
      return;
    }
    const clean = usernameInput.trim();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!isValidUsernameFormat(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameUnique(clean);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [usernameInput, authMode, checkUsernameUnique]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setAuthSubmitting(true);
    try {
      if (authMode === 'register') {
        if (!isValidUsernameFormat(usernameInput)) {
          throw new Error('Username must be 3–32 characters using letters, numbers, _ or -.');
        }
        if (usernameStatus === 'taken') {
          throw new Error('This username is already taken.');
        }
        if (!fullNameInput.trim() || !emailInput.trim() || passwordInput.length < 6) {
          throw new Error('Enter your full name, valid email, and a password of 6+ characters.');
        }
        await registerEmailAccount(
          usernameInput.trim(),
          fullNameInput.trim(),
          emailInput.trim(),
          passwordInput
        );
        setAuthFeedback({
          type: 'ok',
          text: 'Student account created! Check your inbox to verify your email.',
        });
      } else if (authMode === 'login') {
        if (!loginIdentifier.trim() || !passwordInput) {
          throw new Error('Enter your username and password.');
        }
        await loginEmailAccount(loginIdentifier.trim(), passwordInput);
        setAuthFeedback({ type: 'ok', text: 'Signed in successfully.' });
      } else {
        if (!loginIdentifier.trim()) {
          throw new Error('Enter your registered username or email address.');
        }
        await sendPasswordReset(loginIdentifier.trim());
        setAuthFeedback({
          type: 'ok',
          text: 'Password reset link sent to your registered email address.',
        });
      }
      setPasswordInput('');
    } catch (err) {
      setAuthFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Authentication failed.',
      });
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <section className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={AVATAR_IMG}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover border border-violet-500/40"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{profile.displayName}</h1>
              {profile.username && (
                <span className="text-xs font-mono-num px-2.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">
                  @{profile.username}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {firebaseUser?.email || 'Guest Scholar Mode'} · {levelInfo.current.name} ·{' '}
              <span className="font-mono-num">{profile.xp} XP</span>
            </div>
            <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 font-medium">
              Target: {profile.targetPost}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-xs font-semibold cursor-pointer"
          >
            Analytics & Badges
          </button>
          <button
            type="button"
            onClick={onOpenPlanner}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-xs font-semibold cursor-pointer"
          >
            Study Planner
          </button>
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.signOut}
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A192F] dark:bg-violet-600 text-white text-xs font-semibold cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              {t.signInGoogle}
            </button>
          )}
        </div>
      </section>

      {/* Account & Profile Sync */}
      <section className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Student Account & Progress Sync
          </h2>
          {firebaseUser && (
            <span className="text-xs font-mono-num text-emerald-600 dark:text-emerald-400 font-semibold">
              {firebaseUser.emailVerified ? 'Verified Account' : 'Email Verification Pending'}
            </span>
          )}
        </div>

        {firebaseUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081221] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold">
                Signed in as {firebaseUser.displayName || profile.displayName}
                {profile.username ? ` (@${profile.username})` : ''}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Email: {firebaseUser.email}
              </div>
            </div>

            {!firebaseUser.emailVerified && (
              <div className="p-4 rounded-xl border border-violet-500/40 bg-violet-50 dark:bg-violet-950/30 text-xs space-y-2.5">
                <div className="font-semibold text-violet-900 dark:text-violet-200">
                  Verify your email to save progress across devices
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Confirm the verification link sent to your inbox so your scores, streaks, and mock test reports remain synced.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await resendVerification();
                        setAuthFeedback({ type: 'ok', text: 'Verification email resent.' });
                      } catch (err) {
                        setAuthFeedback({
                          type: 'err',
                          text: err instanceof Error ? err.message : 'Could not resend email.',
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0A192F] dark:bg-violet-600 text-white font-semibold cursor-pointer"
                  >
                    Resend Verification Email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const verified = await checkEmailVerification();
                      setAuthFeedback({
                        type: verified ? 'ok' : 'err',
                        text: verified
                          ? 'Email verified! Your account sync is active.'
                          : 'Not verified yet — please open the verification link in your inbox first.',
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    I Verified My Email
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'login', label: 'Sign In' },
                { id: 'register', label: 'Create Student Account' },
                { id: 'reset', label: 'Forgot Password' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(m.id as typeof authMode);
                    setAuthFeedback(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    authMode === m.id
                      ? 'bg-[#0A192F] text-white border-[#0A192F] dark:bg-violet-600 dark:border-violet-600'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuthSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {authMode === 'register' ? (
                <>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Unique Username (e.g. aarav_cgl)"
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] pl-9 pr-9 py-2.5 text-sm"
                    />
                    <div className="absolute right-3 top-3">
                      {usernameStatus === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                      )}
                      {usernameStatus === 'available' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Full Name (e.g. Aarav Nair)"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3.5 py-2.5 text-sm"
                  />
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] pl-9 pr-3.5 py-2.5 text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Username or Email"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] pl-9 pr-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              {authMode !== 'reset' && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] pl-9 pr-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={authSubmitting || (authMode === 'register' && usernameStatus === 'taken')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A192F] dark:bg-violet-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {authMode === 'register'
                    ? 'Create Student Account'
                    : authMode === 'login'
                    ? 'Sign In'
                    : 'Send Reset Email'}
                </button>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-violet-600 dark:border-violet-400 text-violet-700 dark:text-violet-300 text-xs font-semibold cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t.signInGoogle}
                </button>
              </div>
            </form>
          </div>
        )}

        {authFeedback && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              authFeedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {authFeedback.text}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Panel */}
        <section className="lg:col-span-6 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="font-display font-bold text-lg">{t.settingsTitle}</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Student Name
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Target SSC CGL Post
            </label>
            <select
              value={profile.targetPost}
              onChange={(e) => updateProfile({ targetPost: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3.5 py-2.5 text-sm"
            >
              {TARGET_POSTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              {t.languageLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                    language === l.code
                      ? 'border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {l.nativeName} · {l.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-violet-400" /> : <Moon className="w-4 h-4" />}
              {t.themeLabel}: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              Sound FX: {soundMuted ? 'Muted' : 'Enabled'}
            </button>
          </div>
        </section>

        {/* Bookmarks & History */}
        <section className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
              <Bookmark className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Saved Bookmarks ({bookmarks.length})
            </h2>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bookmark PYQs or video lessons while studying to revise them quickly here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookmarks.map((bm) => (
                  <li key={bm.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold">{bm.title}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {bm.itemType} · {SUBJECT_NAMES[bm.subject][language]}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg mb-4">Recent Mock Test History</h2>
            {testAttempts.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No mock tests submitted yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {testAttempts.slice(0, 5).map((att) => (
                  <li key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span>{att.testTitle}</span>
                    <span className="font-mono-num font-bold">
                      {att.score}/{att.maxScore} ({att.accuracy}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
