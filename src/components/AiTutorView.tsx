import React, { useEffect, useRef, useState } from 'react';
import { Bot, ImagePlus, Loader2, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, SUGGESTED_PROMPTS, UI_TEXT } from '../data/i18n';
import { ChatMessage, SubjectId } from '../types/examverse';
import { BackHomeBar, OceanGlassCard } from './OceanTheme';

interface AiTutorViewProps {
  onBack?: () => void;
  onHome?: () => void;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({ onBack, onHome }) => {
  const {
    language,
    setLanguage,
    profile,
    chatHistory,
    setChatHistory,
    persistTutorMessage,
    clearTutorHistory,
    tutorPrefill,
    clearTutorPrefill,
    levelInfo,
  } = useApp();

  const t = UI_TEXT[language];
  const [input, setInput] = useState('');
  const [subjectFocus, setSubjectFocus] = useState<SubjectId>('quant');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tutorPrefill) {
      setInput(tutorPrefill);
      clearTutorPrefill();
    }
  }, [tutorPrefill, clearTutorPrefill]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [meta, b64] = result.split(',');
      const mimeMatch = meta?.match(/data:(.*?);base64/);
      if (b64 && mimeMatch?.[1]) {
        setAttachedImage({
          base64: b64,
          mimeType: mimeMatch[1],
          preview: result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text && !attachedImage) return;
    if (loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text || 'Please solve the question shown in this image.',
      language,
      imagePreview: attachedImage?.preview,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    persistTutorMessage(userMsg).catch(() => {});
    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setLoading(true);
    setErrorMsg(null);
    setLastFailedText(null);

    const weakSubjects = (Object.keys(profile.subjectStats) as SubjectId[])
      .filter((s) => {
        const st = profile.subjectStats[s];
        return st.attempted > 0 && st.correct / st.attempted < 0.65;
      })
      .map((s) => SUBJECT_NAMES[s].en);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          language,
          subjectContext: SUBJECT_NAMES[subjectFocus].en,
          imageBase64: currentImage?.base64,
          imageMimeType: currentImage?.mimeType,
          studentContext: {
            level: levelInfo.current.name,
            targetPost: profile.targetPost,
            weakSubjects,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach Examora AI Tutor.');
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: data.reply,
        language,
        createdAt: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, botMsg]);
      persistTutorMessage(botMsg).catch(() => {});
    } catch (err) {
      setLastFailedText(userMsg.text);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not connect to Examora AI Tutor. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {onHome && (
        <BackHomeBar title={t.tutorTitle} onBack={onBack} onHome={onHome} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Language, Subject Context & Suggested Prompts */}
        <aside className="lg:col-span-4 space-y-5">
          <OceanGlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl ocean-gradient-accent text-[#062B3D] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-bold text-base text-[#062B3D] dark:text-[#F3FAFA]">
                  {t.tutorTitle}
                </h1>
                <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                  Multilingual SSC CGL Doubt Solver
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] mb-1.5">
                Tutor Response Language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      language === l.code
                        ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0] font-bold'
                        : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
                    }`}
                  >
                    {l.nativeName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] mb-1.5">
                Subject Focus
              </label>
              <select
                value={subjectFocus}
                onChange={(e) => setSubjectFocus(e.target.value as SubjectId)}
                aria-label="Tutor Subject Focus"
                className="w-full min-h-[42px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-white dark:bg-[#062B3D] px-3 py-2 text-xs font-semibold"
              >
                {(['quant', 'reasoning', 'english', 'ga', 'computer'] as SubjectId[]).map((s) => (
                  <option key={s} value={s}>
                    {SUBJECT_NAMES[s][language]}
                  </option>
                ))}
              </select>
            </div>
          </OceanGlassCard>

          <OceanGlassCard className="p-5 space-y-2.5">
            <div className="text-xs font-bold text-[#075985] dark:text-[#8DE1D3]">
              Suggested Prompts
            </div>
            {SUGGESTED_PROMPTS[language].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 hover:border-[#20C7C9] text-xs leading-relaxed transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </OceanGlassCard>
        </aside>

        {/* Main Chat Workspace */}
        <section className="lg:col-span-8 bg-white/95 dark:bg-[#073B50]/90 border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 rounded-2xl ocean-shadow flex flex-col h-[640px]">
          <div className="px-5 py-3.5 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#075985] dark:text-[#8DE1D3]">
              Active Language: {LANGUAGES.find((l) => l.code === language)?.nativeName} · Saved Automatically
            </div>
            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={() => clearTutorHistory()}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-[#075985] dark:text-[#8DE1D3] hover:text-[#FF8B78] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.clearChat}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#20C7C9]/15 text-[#20C7C9] flex items-center justify-center">
                  <Bot className="w-7 h-7" />
                </div>
                <h2 className="font-display text-lg font-bold text-[#062B3D] dark:text-[#F3FAFA]">
                  Ask any SSC CGL doubt in {LANGUAGES.find((l) => l.code === language)?.nativeName}
                </h2>
                <p className="text-xs text-[#075985] dark:text-[#8DE1D3] leading-relaxed">
                  Get step-by-step Maths solutions, Reasoning shortcuts, English grammar breakdowns, or upload a screenshot of a question.
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#075985] text-[#F3FAFA] dark:bg-[#20C7C9] dark:text-[#062B3D] font-medium'
                        : 'bg-[#F3FAFA] dark:bg-[#062B3D] border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-[#062B3D] dark:text-[#F3FAFA]'
                    }`}
                  >
                    {msg.imagePreview && (
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded question"
                        className="max-h-44 rounded-lg mb-2 object-contain"
                      />
                    )}
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#075985] dark:text-[#55D6D0]">
                <Loader2 className="w-4 h-4 animate-spin text-[#20C7C9]" />
                <span>Examora AI Tutor is preparing a simple explanation...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-[#FF8B78]/50 bg-[#FF8B78]/12 text-xs flex flex-wrap items-center justify-between gap-3">
                <span className="text-[#9A2D1F] dark:text-[#FF8B78] font-medium">{errorMsg}</span>
                {lastFailedText && (
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075985] text-white font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Composer */}
          <div className="p-4 border-t border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 space-y-2">
            {attachedImage && (
              <div className="inline-flex items-center gap-2 bg-[#20C7C9]/15 px-3 py-1.5 rounded-lg text-xs font-semibold">
                <span>Image attached</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="text-[#075985] hover:text-[#FF8B78] cursor-pointer"
                  aria-label="Remove attached image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-[#075985] dark:text-[#8DE1D3] hover:border-[#20C7C9] cursor-pointer"
                title="Upload question image"
                aria-label="Upload question image"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.tutorPlaceholder}
                className="flex-1 min-h-[44px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#20C7C9]"
              />
              <button
                type="submit"
                disabled={loading || (!input.trim() && !attachedImage)}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {t.sendBtn}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
