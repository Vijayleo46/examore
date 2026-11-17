import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Target,
  User,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../data/i18n';
import { TARGET_POSTS } from '../data/sscCurriculum';
import { LanguageCode } from '../types/examverse';
import { isValidUsernameFormat } from '../lib/firebase';

const EMBLEM_SRC = '/src/assets/images/avatar_scholar_emblem_1794828673745.jpg';

export const SplashOverlay: React.FC = () => {
  const { showSplash, dismissSplash } = useApp();

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A192F] text-white px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/60 shadow-2xl mb-6 bg-[#081221] flex items-center justify-center">
              <img
                src={EMBLEM_SRC}
                alt="Examora Academy Emblem"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Examora
            </h1>
            <p className="text-violet-300 text-sm font-medium mt-2 tracking-wide">
              SSC CGL AI Academy
            </p>
            <p className="text-slate-300 text-sm mt-3">
              Learn. Play. Practice. Achieve.
            </p>
            <button
              type="button"
              onClick={dismissSplash}
              className="mt-8 text-xs text-slate-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
            >
              Skip intro
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const OnboardingFlow: React.FC = () => {
  const {
    language,
    completeOnboarding,
    signInWithGoogle,
    loginEmailAccount,
    registerEmailAccount,
    sendPasswordReset,
    checkUsernameUnique,
    firebaseUser,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);
  const [selectedPost, setSelectedPost] = useState(TARGET_POSTS[1]);
  const [goalMinutes, setGoalMinutes] = useState(90);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authMode !== 'register') {
      setUsernameStatus('idle');
      return;
    }
    const clean = username.trim();
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
  }, [username, authMode, checkUsernameUnique]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setSubmitting(true);
    try {
      if (authMode === 'register') {
        if (!isValidUsernameFormat(username)) {
          throw new Error('Username must be 3–32 characters using letters, numbers, _ or -.');
        }
        if (usernameStatus === 'taken') {
          throw new Error('That username is already taken. Please pick another.');
        }
        if (!fullName.trim() || !email.trim() || password.length < 6) {
          throw new Error('Please fill in your full name, valid email, and password (6+ chars).');
        }
        await registerEmailAccount(username.trim(), fullName.trim(), email.trim(), password);
        completeOnboarding(selectedLang, selectedPost, goalMinutes);
      } else if (authMode === 'login') {
        if (!loginIdentifier.trim() || !password) {
          throw new Error('Enter your username and password.');
        }
        await loginEmailAccount(loginIdentifier.trim(), password);
        completeOnboarding(selectedLang, selectedPost, goalMinutes);
      } else {
        if (!loginIdentifier.trim()) {
          throw new Error('Enter your registered username or email.');
        }
        await sendPasswordReset(loginIdentifier.trim());
        setAuthNotice('Password reset instructions have been sent to your registered email.');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to complete sign-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#081221] text-[#0F172A] dark:text-[#F1F5F9] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <img
              src={EMBLEM_SRC}
              alt="Examora"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border border-violet-500/40"
            />
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">
                Examora — SSC CGL AI Academy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Learn. Play. Practice. Achieve.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-num text-violet-700 dark:text-violet-300 font-semibold">
            Step {step} / 3
          </span>
        </div>

        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-2">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-semibold">Select Your Learning Language</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-balance mb-2">
              Study SSC CGL in the language you think best in
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Official English exam questions stay intact, while AI explanations, video subtitles, and study plans adapt to your choice.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {LANGUAGES.map((lang) => {
                const active = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`flex items-center justify-between p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-violet-600 bg-violet-50/70 dark:border-violet-400 dark:bg-violet-500/15'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-display font-semibold text-base">
                        {lang.nativeName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang.name} · {lang.greeting}
                      </div>
                    </div>
                    {active && (
                      <Check className="w-5 h-5 text-violet-700 dark:text-violet-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm font-semibold">Target Post & Daily Commitment</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-balance mb-6">
              Personalize your SSC CGL mission
            </h3>

            <label className="block text-sm font-medium mb-2">
              Dream Central Government Post
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
              {TARGET_POSTS.map((post) => {
                const active = selectedPost === post;
                return (
                  <button
                    key={post}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className={`px-4 py-3 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-violet-600 bg-violet-50/70 dark:border-violet-400 dark:bg-violet-500/15 text-violet-900 dark:text-violet-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {post}
                  </button>
                );
              })}
            </div>

            <label className="block text-sm font-medium mb-2">
              Daily Study Goal: <span className="font-mono-num font-bold">{goalMinutes} mins/day</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {[45, 60, 90, 120, 180].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGoalMinutes(m)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono-num font-semibold border transition-colors cursor-pointer ${
                    goalMinutes === m
                      ? 'bg-[#0A192F] text-white border-[#0A192F] dark:bg-violet-600 dark:border-violet-600'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-semibold">Sign In or Create Account</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-balance mb-2">
              Save your XP, streaks, and mock test history
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Sign in with your username and password to sync across devices, or explore as a guest scholar.
            </p>

            {!firebaseUser ? (
              <div className="space-y-4 mb-6">
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
                        setAuthError(null);
                        setAuthNotice(null);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        authMode === m.id
                          ? 'bg-[#0A192F] text-white border-[#0A192F] dark:bg-violet-600 dark:border-violet-600'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleAuthSubmit}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-[#081221]"
                >
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Unique Username
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. aarav_cgl26"
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] pl-9 pr-9 py-2 text-xs"
                          />
                          <div className="absolute right-3 top-2.5">
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
                        {usernameStatus === 'available' && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                            Username is available
                          </div>
                        )}
                        {usernameStatus === 'taken' && (
                          <div className="text-[11px] text-rose-500 mt-1">
                            Username already taken — try another
                          </div>
                        )}
                        {usernameStatus === 'invalid' && (
                          <div className="text-[11px] text-rose-500 mt-1">
                            Use 3–32 characters: letters, numbers, underscore (_) or hyphen (-)
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Aarav Nair"
                          required
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] px-3.5 py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@example.com"
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] pl-9 pr-3.5 py-2 text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {authMode !== 'register' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        {authMode === 'login' ? 'Username or Email' : 'Registered Username or Email'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="Enter username (e.g. aarav_cgl26)"
                          required
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] pl-9 pr-3.5 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {authMode !== 'reset' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password (6+ characters)"
                          required
                          minLength={6}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1E36] pl-9 pr-3.5 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                      {authError}
                    </div>
                  )}
                  {authNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
                      {authNotice}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setAuthError(null);
                        try {
                          await signInWithGoogle();
                          completeOnboarding(selectedLang, selectedPost, goalMinutes);
                        } catch (err) {
                          setAuthError(
                            err instanceof Error ? err.message : 'Google sign-in canceled.'
                          );
                        }
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F1E36] text-xs font-semibold hover:border-violet-500 cursor-pointer"
                    >
                      Continue with Google
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (authMode === 'register' && usernameStatus === 'taken')}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      {authMode === 'register'
                        ? 'Register Student Account'
                        : authMode === 'login'
                        ? 'Sign In'
                        : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 text-sm mb-6">
                Signed in as {firebaseUser.displayName || firebaseUser.email}
              </div>
            )}

            <button
              type="button"
              onClick={() => completeOnboarding(selectedLang, selectedPost, goalMinutes)}
              className="w-full py-3.5 px-5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold text-sm transition-colors cursor-pointer mb-4"
            >
              Continue as Guest Scholar
            </button>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
