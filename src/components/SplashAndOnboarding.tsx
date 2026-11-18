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
  Waves,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../data/i18n';
import { TARGET_POSTS } from '../data/sscCurriculum';
import { LanguageCode } from '../types/examverse';
import { isValidUsernameFormat } from '../lib/firebase';
import { OceanWaveBackdrop } from './OceanTheme';

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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center ocean-gradient-hero text-[#F3FAFA] px-6 overflow-hidden"
        >
          <OceanWaveBackdrop />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-[#20C7C9]/70 shadow-2xl mb-6 bg-[#062B3D] flex items-center justify-center">
              <img
                src={EMBLEM_SRC}
                alt="Examora"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#55D6D0] mb-1">
              <Waves className="w-4 h-4" />
              SSC CGL Learning Academy
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F3FAFA]">
              Examora
            </h1>
            <p className="text-[#8DE1D3] text-sm sm:text-base font-medium mt-3">
              Learn Smart. Play Hard. Rank Higher.
            </p>
            <button
              type="button"
              onClick={dismissSplash}
              className="mt-8 min-h-[44px] px-5 py-2 rounded-xl border border-[#8DE1D3]/30 text-xs font-semibold text-[#8DE1D3] hover:text-white hover:border-[#20C7C9] transition-colors cursor-pointer"
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
          throw new Error('Please enter your full name, valid email, and password (6+ chars).');
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
    <div className="min-h-screen relative ocean-gradient-hero text-[#062B3D] dark:text-[#F3FAFA] flex items-center justify-center px-4 py-10 overflow-hidden">
      <OceanWaveBackdrop />
      <div className="relative z-10 w-full max-w-2xl ocean-glass border border-[#8DE1D3]/45 dark:border-[#20C7C9]/30 rounded-3xl p-6 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#8DE1D3]/40 dark:border-[#20C7C9]/20 pb-5 mb-7">
          <div className="flex items-center gap-3">
            <img
              src={EMBLEM_SRC}
              alt="Examora"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-2xl object-cover border-2 border-[#20C7C9]"
            />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold leading-tight text-[#062B3D] dark:text-[#F3FAFA]">
                Examora
              </h2>
              <p className="text-xs font-medium text-[#075985] dark:text-[#8DE1D3]">
                Learn Smart. Play Hard. Rank Higher.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s
                    ? 'w-6 bg-[#20C7C9]'
                    : step > s
                    ? 'w-2.5 bg-[#55D6D0]'
                    : 'w-2.5 bg-[#8DE1D3]/40'
                }`}
              />
            ))}
            <span className="ml-2 text-xs font-mono-num text-[#075985] dark:text-[#8DE1D3] font-bold">
              {step}/3
            </span>
          </div>
        </div>

        {/* Step 1: Language Selection */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 text-[#075985] dark:text-[#55D6D0] mb-2">
              <Globe className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Step 1 · Choose Your Language
              </span>
            </div>
            <h3 className="font-display text-2xl font-extrabold text-balance text-[#062B3D] dark:text-[#F3FAFA] mb-2">
              Study SSC CGL in the language you are most comfortable with
            </h3>
            <p className="text-sm text-[#073B50] dark:text-[#8DE1D3] mb-6 leading-relaxed">
              Exam questions remain in official English, while explanations, lesson summaries, and AI help switch to your chosen language.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {LANGUAGES.map((lang) => {
                const active = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`min-h-[64px] flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#20C7C9] bg-[#20C7C9]/15 dark:bg-[#20C7C9]/20'
                        : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]'
                    }`}
                  >
                    <div>
                      <div className="font-display font-bold text-base text-[#062B3D] dark:text-[#F3FAFA]">
                        {lang.nativeName}
                      </div>
                      <div className="text-xs text-[#075985] dark:text-[#8DE1D3] mt-0.5">
                        {lang.name}
                      </div>
                    </div>
                    {active && (
                      <span className="w-7 h-7 rounded-full bg-[#20C7C9] text-[#062B3D] flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] font-bold text-sm transition-colors cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Goal & Target Post */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 text-[#075985] dark:text-[#55D6D0] mb-2">
              <Target className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Step 2 · Your SSC CGL Goal
              </span>
            </div>
            <h3 className="font-display text-2xl font-extrabold text-balance text-[#062B3D] dark:text-[#F3FAFA] mb-5">
              Pick your dream post and daily study target
            </h3>

            <label className="block text-xs font-bold text-[#073B50] dark:text-[#8DE1D3] mb-2">
              Target SSC CGL Post
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
              {TARGET_POSTS.map((post) => {
                const active = selectedPost === post;
                return (
                  <button
                    key={post}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className={`min-h-[48px] px-4 py-3 rounded-2xl border-2 text-left text-sm font-semibold transition-all cursor-pointer ${
                      active
                        ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#062B3D] dark:text-[#F3FAFA]'
                        : 'border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]'
                    }`}
                  >
                    {post}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-bold text-[#073B50] dark:text-[#8DE1D3] mb-2">
              Daily Study Goal:{' '}
              <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                {goalMinutes} minutes/day
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2.5 mb-8">
              {[45, 60, 90, 120, 180].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGoalMinutes(m)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono-num font-bold border-2 transition-colors cursor-pointer ${
                    goalMinutes === m
                      ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60 hover:border-[#20C7C9]'
                  }`}
                >
                  {m} mins
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-4 py-2.5 text-sm font-semibold text-[#075985] dark:text-[#8DE1D3] hover:underline cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] font-bold text-sm transition-colors cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sign In or Register */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 text-[#075985] dark:text-[#55D6D0] mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Step 3 · Your Student Account
              </span>
            </div>
            <h3 className="font-display text-2xl font-extrabold text-balance text-[#062B3D] dark:text-[#F3FAFA] mb-1.5">
              Sign in to save your study streak & test history
            </h3>
            <p className="text-sm text-[#073B50] dark:text-[#8DE1D3] mb-5">
              Sign in with your username and password, or explore right away as a guest learner.
            </p>

            {!firebaseUser ? (
              <div className="space-y-4 mb-5">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'login', label: 'Sign In' },
                    { id: 'register', label: 'New Student' },
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
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                        authMode === m.id
                          ? 'bg-[#075985] text-white border-[#075985] dark:bg-[#20C7C9] dark:text-[#062B3D] dark:border-[#20C7C9]'
                          : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 bg-white/80 dark:bg-[#062B3D]/60'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleAuthSubmit}
                  className="p-5 rounded-2xl border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 space-y-3.5 bg-white/90 dark:bg-[#062B3D]/80"
                >
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                          Choose a Unique Username
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#075985] dark:text-[#55D6D0] absolute left-3 top-3" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. aarav_cgl26"
                            required
                            className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#073B50] pl-9 pr-9 py-2 text-sm text-[#062B3D] dark:text-[#F3FAFA]"
                          />
                          <div className="absolute right-3 top-3">
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
                        {usernameStatus === 'available' && (
                          <div className="text-[11px] font-medium text-[#075985] dark:text-[#55D6D0] mt-1">
                            Great! This username is available.
                          </div>
                        )}
                        {usernameStatus === 'taken' && (
                          <div className="text-[11px] font-medium text-[#D94E3B] dark:text-[#FF8B78] mt-1">
                            This username is already taken — please try another.
                          </div>
                        )}
                        {usernameStatus === 'invalid' && (
                          <div className="text-[11px] font-medium text-[#D94E3B] dark:text-[#FF8B78] mt-1">
                            Use 3–32 characters: letters, numbers, _ or -
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Aarav Nair"
                          required
                          className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#073B50] px-3.5 py-2 text-sm text-[#062B3D] dark:text-[#F3FAFA]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#075985] dark:text-[#55D6D0] absolute left-3 top-3" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@example.com"
                            required
                            className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#073B50] pl-9 pr-3.5 py-2 text-sm text-[#062B3D] dark:text-[#F3FAFA]"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {authMode !== 'register' && (
                    <div>
                      <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                        {authMode === 'login' ? 'Username or Email' : 'Registered Username or Email'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#075985] dark:text-[#55D6D0] absolute left-3 top-3" />
                        <input
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="Enter username (e.g. aarav_cgl26)"
                          required
                          className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#073B50] pl-9 pr-3.5 py-2 text-sm text-[#062B3D] dark:text-[#F3FAFA]"
                        />
                      </div>
                    </div>
                  )}

                  {authMode !== 'reset' && (
                    <div>
                      <label className="block text-[11px] font-bold text-[#075985] dark:text-[#8DE1D3] mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#075985] dark:text-[#55D6D0] absolute left-3 top-3" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password (6+ characters)"
                          required
                          minLength={6}
                          className="w-full min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#073B50] pl-9 pr-3.5 py-2 text-sm text-[#062B3D] dark:text-[#F3FAFA]"
                        />
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 rounded-xl bg-[#FF8B78]/15 border border-[#FF8B78]/50 text-xs font-medium text-[#9A2D1F] dark:text-[#FF8B78]">
                      {authError}
                    </div>
                  )}
                  {authNotice && (
                    <div className="p-3 rounded-xl bg-[#20C7C9]/15 border border-[#20C7C9]/50 text-xs font-medium text-[#075985] dark:text-[#8DE1D3]">
                      {authNotice}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
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
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#073B50] text-xs font-bold text-[#062B3D] dark:text-[#F3FAFA] hover:border-[#20C7C9] cursor-pointer"
                    >
                      Continue with Google
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (authMode === 'register' && usernameStatus === 'taken')}
                      className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075985] hover:bg-[#073B50] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {authMode === 'register'
                        ? 'Create Account'
                        : authMode === 'login'
                        ? 'Sign In'
                        : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-[#20C7C9]/40 bg-[#20C7C9]/15 text-sm font-medium mb-6 text-[#062B3D] dark:text-[#F3FAFA]">
                Signed in as {firebaseUser.displayName || firebaseUser.email}
              </div>
            )}

            <button
              type="button"
              onClick={() => completeOnboarding(selectedLang, selectedPost, goalMinutes)}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl border-2 border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 hover:border-[#20C7C9] font-bold text-sm text-[#062B3D] dark:text-[#F3FAFA] transition-colors cursor-pointer mb-4"
            >
              Continue as Guest Learner
            </button>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[44px] px-4 py-2 text-sm font-semibold text-[#075985] dark:text-[#8DE1D3] hover:underline cursor-pointer"
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
