import React, { useEffect, useRef, useState } from 'react';
import { Bot, ImagePlus, Loader2, Send, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, SUBJECT_NAMES, SUGGESTED_PROMPTS, UI_TEXT } from '../data/i18n';
import { ChatMessage, SubjectId } from '../types/examverse';

export const AiTutorView: React.FC = () => {
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
        throw new Error(data.error || 'Unable to reach ExamVerse AI Tutor.');
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
      setErrorMsg(err instanceof Error ? err.message : 'AI Tutor request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Language, Subject Context & Suggested Prompts */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base">{t.tutorTitle}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multilingual SSC CGL Doubt Solver
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Tutor Response Language
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    language === l.code
                      ? 'border-blue-700 bg-blue-50 text-blue-800 dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Subject Focus
            </label>
            <select
              value={subjectFocus}
              onChange={(e) => setSubjectFocus(e.target.value as SubjectId)}
              aria-label="Tutor Subject Focus"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3 py-2 text-xs font-medium"
            >
              {(['quant', 'reasoning', 'english', 'ga', 'computer'] as SubjectId[]).map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_NAMES[s][language]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Suggested Prompts
          </div>
          {SUGGESTED_PROMPTS[language].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-amber-400 text-xs leading-relaxed transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="lg:col-span-8 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[640px]">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Language: {LANGUAGES.find((l) => l.code === language)?.nativeName} · History Saved
          </div>
          {chatHistory.length > 0 && (
            <button
              type="button"
              onClick={() => clearTutorHistory()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearChat}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <Bot className="w-10 h-10 text-blue-700 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold">
                Ask any SSC CGL doubt in {LANGUAGES.find((l) => l.code === language)?.nativeName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
                      ? 'bg-[#0A192F] text-white dark:bg-amber-500 dark:text-[#081221]'
                      : 'bg-slate-100 dark:bg-[#081221] border border-slate-200 dark:border-slate-800'
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
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>ExamVerse AI Tutor is solving...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {attachedImage && (
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span>Image attached</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-slate-500 hover:text-rose-500 cursor-pointer"
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
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-600 cursor-pointer"
              title="Upload question image"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.tutorPlaceholder}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !attachedImage)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {t.sendBtn}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
