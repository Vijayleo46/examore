import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  Bot,
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
  Waves,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { TARGET_POSTS } from '../data/sscCurriculum';
import { isValidUsernameFormat } from '../lib/firebase';
import {
  buildOceanStudyReminder,
  formatTime12h,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../lib/localNotifications';
import { OceanGlassCard } from './OceanTheme';

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
    notificationPrefs,
    updateNotificationPrefs,
    triggerGoalReminder,
    openAiTutor,
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

  const [browserPerm, setBrowserPerm] = useState(() => getBrowserNotificationPermission());

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
    <div className="space-y-6">
      {/* Header Card */}
      <OceanGlassCard className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={AVATAR_IMG}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#20C7C9]"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#062B3D] dark:text-[#F3FAFA]">
                {profile.displayName}
              </h1>
              {profile.username && (
                <span className="text-xs font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                  @{profile.username}
                </span>
              )}
            </div>
            <div className="text-xs text-[#075985] dark:text-[#8DE1D3] mt-0.5">
              {firebaseUser?.email || 'Guest Scholar Mode'} · {levelInfo.current.name} ·{' '}
              <span className="font-mono-num font-bold">{profile.xp} XP</span>
            </div>
            <div className="text-xs text-[#073B50] dark:text-[#55D6D0] mt-1 font-semibold">
              Target: {profile.targetPost}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openAiTutor}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20C7C9]/15 border border-[#20C7C9]/50 text-[#075985] dark:text-[#55D6D0] text-xs font-bold cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            Ask Examora AI
          </button>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 hover:border-[#20C7C9] text-xs font-bold cursor-pointer"
          >
            Analytics & Badges
          </button>
          <button
            type="button"
            onClick={onOpenPlanner}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 hover:border-[#20C7C9] text-xs font-bold cursor-pointer"
          >
            Study Planner
          </button>
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOut}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#FF8B78]/60 text-[#9A2D1F] dark:text-[#FF8B78] text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.signOut}
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              {t.signInGoogle}
            </button>
          )}
        </div>
      </OceanGlassCard>

      {/* Account & Profile Sync */}
      <OceanGlassCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-lg flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
            <KeyRound className="w-4 h-4 text-[#20C7C9]" />
            Student Account & Progress Sync
          </h2>
          {firebaseUser && (
            <span className="text-xs font-mono-num text-[#075985] dark:text-[#55D6D0] font-bold">
              {firebaseUser.emailVerified ? 'Verified Account' : 'Email Verification Pending'}
            </span>
          )}
        </div>

        {firebaseUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 text-xs space-y-1.5">
              <div className="font-bold">
                Signed in as {firebaseUser.displayName || profile.displayName}
                {profile.username ? ` (@${profile.username})` : ''}
              </div>
              <div className="text-[#075985] dark:text-[#8DE1D3]">
                Email: {firebaseUser.email}
              </div>
            </div>

            {!firebaseUser.emailVerified && (
              <div className="p-4 rounded-xl border border-[#20C7C9]/45 bg-[#20C7C9]/10 text-xs space-y-2.5">
                <div className="font-bold text-[#062B3D] dark:text-[#F3FAFA]">
                  Verify your email to save progress across devices
                </div>
                <p className="text-[#073B50] dark:text-[#8DE1D3]">
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
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] font-bold cursor-pointer"
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
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 font-bold cursor-pointer"
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
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    authMode === m.id
                      ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
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
                    <User className="w-4 h-4 text-[#075985] dark:text-[#8DE1D3] absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Unique Username (e.g. aarav_cgl)"
                      required
                      className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] pl-9 pr-9 py-2.5 text-sm"
                    />
                    <div className="absolute right-3 top-3.5">
                      {usernameStatus === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#20C7C9]" />
                      )}
                      {usernameStatus === 'available' && (
                        <CheckCircle2 className="w-4 h-4 text-[#20C7C9]" />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <XCircle className="w-4 h-4 text-[#FF8B78]" />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Full Name (e.g. Aarav Nair)"
                    required
                    className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2.5 text-sm"
                  />
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#075985] dark:text-[#8DE1D3] absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] pl-9 pr-3.5 py-2.5 text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <User className="w-4 h-4 text-[#075985] dark:text-[#8DE1D3] absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Username or Email"
                    required
                    className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] pl-9 pr-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              {authMode !== 'reset' && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#075985] dark:text-[#8DE1D3] absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    required
                    minLength={6}
                    className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] pl-9 pr-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={authSubmitting || (authMode === 'register' && usernameStatus === 'taken')}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold disabled:opacity-50 cursor-pointer"
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
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-[#20C7C9] text-[#075985] dark:text-[#55D6D0] text-xs font-bold cursor-pointer"
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
            className={`p-3 rounded-xl text-xs border font-semibold ${
              authFeedback.type === 'ok'
                ? 'border-[#20C7C9]/45 bg-[#20C7C9]/12 text-[#075985] dark:text-[#55D6D0]'
                : 'border-[#FF8B78]/45 bg-[#FF8B78]/12 text-[#9A2D1F] dark:text-[#FF8B78]'
            }`}
          >
            {authFeedback.text}
          </div>
        )}
      </OceanGlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings & Notification Preferences Panel */}
        <OceanGlassCard className="lg:col-span-6 p-6 space-y-6">
          <h2 className="font-display font-bold text-lg text-[#062B3D] dark:text-[#F3FAFA]">
            {t.settingsTitle}
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#075985] dark:text-[#8DE1D3] mb-1.5">
              Student Name
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
              className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#075985] dark:text-[#8DE1D3] mb-1.5">
              Target SSC CGL Post
            </label>
            <select
              value={profile.targetPost}
              onChange={(e) => updateProfile({ targetPost: e.target.value })}
              className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2.5 text-sm"
            >
              {TARGET_POSTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#075985] dark:text-[#8DE1D3] mb-1.5">
              Today’s Study Goal (minutes per day)
            </label>
            <select
              value={profile.dailyGoalMinutes}
              onChange={(e) => updateProfile({ dailyGoalMinutes: Number(e.target.value) })}
              className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2.5 text-sm font-mono-num"
            >
              {[30, 60, 90, 120, 150, 180].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} minutes / day
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#075985] dark:text-[#8DE1D3] mb-2">
              {t.languageLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold cursor-pointer ${
                    language === l.code
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {l.nativeName} · {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ocean Goal-Based Local Notification Preferences */}
          <div className="pt-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#075985] dark:text-[#8DE1D3]">
                <Bell className="w-4 h-4 text-[#20C7C9]" />
                Study Reminders & Ocean Tide Alerts
              </div>
              <span className="text-[11px] font-mono-num text-[#075985] dark:text-[#55D6D0]">
                {formatTime12h(notificationPrefs.reminderTime)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                  Daily Reminder Time
                </label>
                <input
                  type="time"
                  value={notificationPrefs.reminderTime}
                  onChange={(e) =>
                    updateNotificationPrefs({ reminderTime: e.target.value || '19:00' })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3.5 py-2 text-sm font-mono-num"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (notificationPrefs.browserPushEnabled) {
                      updateNotificationPrefs({ browserPushEnabled: false });
                      return;
                    }
                    const perm = await requestBrowserNotificationPermission();
                    setBrowserPerm(perm);
                    updateNotificationPrefs({ browserPushEnabled: perm === 'granted' });
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between gap-2 cursor-pointer ${
                    notificationPrefs.browserPushEnabled && browserPerm === 'granted'
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                      : 'border-[#8DE1D3]/60 dark:border-[#20C7C9]/30'
                  }`}
                >
                  <span>
                    {browserPerm === 'unsupported'
                      ? 'In-App Alerts Only'
                      : browserPerm === 'denied'
                      ? 'Browser Blocked (In-App On)'
                      : notificationPrefs.browserPushEnabled && browserPerm === 'granted'
                      ? 'Device Alerts Enabled'
                      : 'Enable Device Alerts'}
                  </span>
                  <Bell className="w-3.5 h-3.5 shrink-0 text-[#20C7C9]" />
                </button>
              </div>
            </div>

            {[
              {
                key: 'dailyReminder' as const,
                title: 'Daily Study Goal Reminder',
                desc: `Gentle nudge anchored to your ${profile.dailyGoalMinutes} min daily goal.`,
              },
              {
                key: 'mockAlerts' as const,
                title: 'Upcoming Mock Test Alerts',
                desc: 'Notify when Tier 1 or Tier 2 mock papers are ready for calm practice.',
              },
              {
                key: 'streakAlerts' as const,
                title: 'Streak Saver Alerts',
                desc: 'Lighthouse reminder before your daily study tide resets.',
              },
            ].map((item) => {
              const active = notificationPrefs[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateNotificationPrefs({ [item.key]: !active })}
                  className="w-full min-h-[52px] p-3 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-[#20C7C9]"
                >
                  <div>
                    <div className="text-xs font-bold">{item.title}</div>
                    <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">{item.desc}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                      active
                        ? 'bg-[#20C7C9] text-[#062B3D]'
                        : 'bg-[#8DE1D3]/25 text-[#073B50] dark:text-[#8DE1D3]'
                    }`}
                  >
                    {active ? 'On' : 'Off'}
                  </span>
                </button>
              );
            })}

            {/* Live Ocean Reminder Preview */}
            {(() => {
              const preview = buildOceanStudyReminder({
                displayName: profile.displayName,
                username: profile.username,
                studiedMinutes: profile.studyMinutesToday,
                goalMinutes: profile.dailyGoalMinutes,
                streak: profile.streak,
              });
              return (
                <div className="p-4 rounded-2xl ocean-gradient-hero text-[#F3FAFA] border border-[#20C7C9]/35 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#55D6D0]">
                      <Waves className="w-3.5 h-3.5" />
                      Today’s Ocean Reminder Preview
                    </span>
                    <span className="text-[11px] font-mono-num text-[#8DE1D3]">
                      {profile.studyMinutesToday}/{profile.dailyGoalMinutes} min
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-white">
                    {preview.title}
                  </div>
                  <p className="text-xs text-[#F3FAFA]/90 leading-relaxed">{preview.body}</p>
                  <button
                    type="button"
                    onClick={() => triggerGoalReminder()}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#20C7C9] hover:bg-[#55D6D0] text-[#062B3D] text-xs font-extrabold cursor-pointer"
                  >
                    Send Gentle Reminder Now
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#55D6D0]" />
              ) : (
                <Moon className="w-4 h-4 text-[#075985]" />
              )}
              {t.themeLabel}: {theme === 'dark' ? 'Dark Ocean' : 'Foam Light'}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
            >
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-[#FF8B78]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#20C7C9]" />
              )}
              Sound FX: {soundMuted ? 'Muted' : 'Enabled'}
            </button>
          </div>
        </OceanGlassCard>

        {/* Bookmarks & History */}
        <section className="lg:col-span-6 space-y-6">
          <OceanGlassCard className="p-6">
            <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4 text-[#062B3D] dark:text-[#F3FAFA]">
              <Bookmark className="w-4 h-4 text-[#20C7C9]" />
              Saved Bookmarks ({bookmarks.length})
            </h2>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                Bookmark PYQs or video lessons while studying to revise them quickly here.
              </p>
            ) : (
              <ul className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                {bookmarks.map((bm) => (
                  <li key={bm.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold">{bm.title}</div>
                      <div className="text-[#075985] dark:text-[#8DE1D3]">
                        {bm.itemType} · {SUBJECT_NAMES[bm.subject][language]}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </OceanGlassCard>

          <OceanGlassCard className="p-6">
            <h2 className="font-display font-bold text-lg mb-4 text-[#062B3D] dark:text-[#F3FAFA]">
              Recent Mock Test History
            </h2>
            {testAttempts.length === 0 ? (
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                No mock tests submitted yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                {testAttempts.slice(0, 5).map((att) => (
                  <li key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span>{att.testTitle}</span>
                    <span className="font-mono-num font-bold text-[#075985] dark:text-[#55D6D0]">
                      {att.score}/{att.maxScore} ({att.accuracy}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </OceanGlassCard>
        </section>
      </div>
    </div>
  );
};
