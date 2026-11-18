import React, { useState } from 'react';
import { ArrowLeft, Home, Lightbulb, X } from 'lucide-react';

export const OCEAN_UNDERWATER_BACKDROP_URL =
  '/assets/aistudio/ki2fwLKGFDTJP9NteLlysDQAzbEH9wywL-MR63WjKzpkiLQXg8T_zgLIojK6mBHphg2W97g_LZaaNvKhAEsi_iwG5xqHEb29s8RnuVCWPeaNOmIGVQhqCqLvn5uWNq1IJiDtIfiBsVtDcAW629KnoMr-Z1nidbzTqt1siOOUS8uQviLP1NhWenupnNiauEuO_6e675ca1.jpg';

export function formatLessonDuration(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return '1 min';
  if (durationSec < 60) return `${Math.round(durationSec)} sec`;
  const mins = Math.round(durationSec / 60);
  return `${mins} min`;
}

/**
 * Reusable Ocean-Inspired Backdrop with subtle underwater light rays & SVG waves
 */
export const OceanWaveBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {!imgFailed && (
        <img
          src={OCEAN_UNDERWATER_BACKDROP_URL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,43,61,0.35) 0%, rgba(7,59,80,0.45) 55%, rgba(6,43,61,0.75) 100%)',
        }}
      />
      {/* Subtle underwater light beam */}
      <div
        className="animate-ocean-glow absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(32,199,201,0.28) 0%, rgba(85,214,208,0.08) 55%, transparent 75%)',
        }}
      />
      <div
        className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(141,225,211,0.22) 0%, transparent 70%)',
        }}
      />

      {/* Layered subtle wave SVG */}
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="animate-ocean-wave absolute bottom-0 left-0 w-[112%] h-24 sm:h-32 opacity-20"
      >
        <path
          d="M0,120 C220,190 420,40 650,110 C860,175 1040,65 1200,115 L1200,220 L0,220 Z"
          fill="#55D6D0"
        />
      </svg>
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="animate-ocean-wave-slow absolute bottom-0 left-0 w-[112%] h-20 sm:h-28 opacity-15"
      >
        <path
          d="M0,145 C260,75 490,200 760,125 C980,65 1100,150 1200,130 L1200,220 L0,220 Z"
          fill="#8DE1D3"
        />
      </svg>
    </div>
  );
};

/**
 * Clean Ocean Wave Divider between major sections
 */
export const OceanWaveDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full overflow-hidden leading-none select-none ${className}`} aria-hidden="true">
    <svg viewBox="0 0 1200 44" preserveAspectRatio="none" className="w-full h-6">
      <path
        d="M0,22 C240,42 460,4 720,24 C950,42 1080,10 1200,20 L1200,44 L0,44 Z"
        className="fill-[#20C7C9]/10 dark:fill-[#20C7C9]/15"
      />
    </svg>
  </div>
);

/**
 * Animated Circular Ocean Progress Ring
 */
interface OceanProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  darkSurface?: boolean;
}

export const OceanProgressRing: React.FC<OceanProgressRingProps> = ({
  percent,
  size = 84,
  strokeWidth = 7,
  label,
  sublabel,
  darkSurface = false,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={darkSurface ? 'stroke-white/15' : 'stroke-[#8DE1D3]/35 dark:stroke-[#075985]/60'}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
            stroke={darkSurface ? '#55D6D0' : '#20C7C9'}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono-num text-sm font-bold ${
              darkSurface ? 'text-[#F3FAFA]' : 'text-[#062B3D] dark:text-[#F3FAFA]'
            }`}
          >
            {clamped}%
          </span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="min-w-0">
          {label && (
            <div
              className={`text-xs font-semibold ${
                darkSurface ? 'text-[#F3FAFA]' : 'text-[#062B3D] dark:text-[#F3FAFA]'
              }`}
            >
              {label}
            </div>
          )}
          {sublabel && (
            <div
              className={`text-[11px] mt-0.5 ${
                darkSurface ? 'text-[#8DE1D3]' : 'text-[#075985] dark:text-[#8DE1D3]'
              }`}
            >
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Controlled Sea-Glass Ocean Card
 */
export const OceanGlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl ocean-shadow ${className}`}
  >
    {children}
  </div>
);

/**
 * Beginner-Friendly Dismissible First-Time Tip
 */
export const FirstTimeTip: React.FC<{
  storageKey: string;
  title: string;
  body: string;
}> = ({ storageKey, title, body }) => {
  const fullKey = `examora_tip_${storageKey}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(fullKey) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(fullKey, '1');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="rounded-2xl border border-[#20C7C9]/40 bg-[#20C7C9]/10 dark:bg-[#073B50]/85 px-4 py-3.5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#20C7C9]/20 text-[#075985] dark:text-[#55D6D0] flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <div className="font-display text-xs sm:text-sm font-bold text-[#062B3D] dark:text-[#F3FAFA]">
            {title}
          </div>
          <p className="text-xs text-[#073B50] dark:text-[#8DE1D3] mt-0.5 leading-relaxed">
            {body}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss helpful tip"
        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#075985] dark:text-[#8DE1D3] hover:bg-[#20C7C9]/15 cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Clear Back & Home Navigation Header for nested student views
 */
export const BackHomeBar: React.FC<{
  title?: string;
  onBack?: () => void;
  onHome: () => void;
}> = ({ title, onBack, onHome }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/90 dark:bg-[#073B50] text-xs font-semibold text-[#062B3D] dark:text-[#F3FAFA] hover:border-[#20C7C9] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#075985] dark:text-[#55D6D0]" />
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onHome}
        className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white/90 dark:bg-[#073B50] text-xs font-semibold text-[#062B3D] dark:text-[#F3FAFA] hover:border-[#20C7C9] transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4 text-[#20C7C9]" />
        Home
      </button>
    </div>
    {title && (
      <span className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">{title}</span>
    )}
  </div>
);
