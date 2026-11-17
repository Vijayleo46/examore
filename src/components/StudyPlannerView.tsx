import React, { useState } from 'react';
import { Calendar, CheckCircle2, Circle, Loader2, Save, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { StudyBlock, StudyPlan, SubjectId } from '../types/examverse';

export const StudyPlannerView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { language, studyPlan, saveStudyPlan } = useApp();
  const t = UI_TEXT[language];

  const [hoursPerDay, setHoursPerDay] = useState(studyPlan?.hoursPerDay || 4);
  const [examTarget, setExamTarget] = useState(studyPlan?.examTarget || 'SSC CGL Tier 1 + Tier 2');
  const [examDate, setExamDate] = useState(studyPlan?.examDate || '2026-09-20');
  const [weakSubjects, setWeakSubjects] = useState<SubjectId[]>(
    studyPlan?.weakSubjects || ['quant', 'ga']
  );
  const [strongSubjects, setStrongSubjects] = useState<SubjectId[]>(
    studyPlan?.strongSubjects || ['reasoning']
  );
  const [draftPlan, setDraftPlan] = useState<StudyPlan | null>(studyPlan);
  const [generating, setGenerating] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const allSubjects: SubjectId[] = ['quant', 'reasoning', 'english', 'ga', 'computer'];

  const toggleWeak = (sub: SubjectId) => {
    setWeakSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
    setStrongSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const toggleStrong = (sub: SubjectId) => {
    setStrongSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
    setWeakSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const buildFallbackPlan = (): StudyPlan => {
    const totalMins = Math.round(hoursPerDay * 60);
    const primaryWeak = weakSubjects[0] || 'quant';
    const blocks: StudyBlock[] = [
      {
        timeSlot: '07:00 – 08:15',
        activityType: 'Video Lesson + Concept Notes',
        subject: SUBJECT_NAMES[primaryWeak][language],
        topic: 'Core Foundation & Ratio Shortcuts',
        durationMinutes: Math.min(90, Math.round(totalMins * 0.3)),
        completed: false,
      },
      {
        timeSlot: '08:15 – 08:30',
        activityType: 'Active Break',
        subject: 'Recovery',
        topic: 'Hydration & Recall Walk',
        durationMinutes: 15,
        completed: false,
      },
      {
        timeSlot: '18:00 – 19:00',
        activityType: 'PYQ Bank Practice',
        subject: SUBJECT_NAMES[weakSubjects[1] || 'english'][language],
        topic: '2019–2024 Tier 1 Shift Questions',
        durationMinutes: Math.min(75, Math.round(totalMins * 0.3)),
        completed: false,
      },
      {
        timeSlot: '20:30 – 21:30',
        activityType: 'Sectional Mock & Game Sprint',
        subject: SUBJECT_NAMES[strongSubjects[0] || 'reasoning'][language],
        topic: 'Speed Maintenance + Revision',
        durationMinutes: Math.max(30, totalMins - Math.round(totalMins * 0.6) - 15),
        completed: false,
      },
    ];
    return {
      hoursPerDay,
      examTarget,
      weakSubjects,
      strongSubjects,
      preferredLanguage: language,
      examDate,
      summary: `Balanced ${hoursPerDay}h/day SSC CGL schedule prioritizing ${weakSubjects
        .map((s) => SUBJECT_NAMES[s].en)
        .join(', ')}.`,
      weeklyTarget: 'Complete 4 video lessons, 120 PYQs, and 2 timed mock tests.',
      blocks,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursPerDay,
          examTarget,
          weakSubjects: weakSubjects.map((s) => SUBJECT_NAMES[s].en),
          strongSubjects: strongSubjects.map((s) => SUBJECT_NAMES[s].en),
          preferredLanguage: language,
          examDate,
        }),
      });
      if (!res.ok) throw new Error('AI planner fallback');
      const data = await res.json();
      const plan: StudyPlan = {
        hoursPerDay,
        examTarget,
        weakSubjects,
        strongSubjects,
        preferredLanguage: language,
        examDate,
        summary: data.summary || 'Custom SSC CGL Study Plan',
        weeklyTarget: data.weeklyTarget || 'Complete weekly PYQ & Mock milestones',
        blocks: Array.isArray(data.blocks) ? data.blocks : buildFallbackPlan().blocks,
        updatedAt: new Date().toISOString(),
      };
      setDraftPlan(plan);
      await saveStudyPlan(plan);
    } catch {
      const fallback = buildFallbackPlan();
      setDraftPlan(fallback);
      await saveStudyPlan(fallback);
    } finally {
      setGenerating(false);
    }
  };

  const toggleBlockDone = async (idx: number) => {
    if (!draftPlan) return;
    const nextBlocks = draftPlan.blocks.map((b, i) =>
      i === idx ? { ...b, completed: !b.completed } : b
    );
    const updated = { ...draftPlan, blocks: nextBlocks, updatedAt: new Date().toISOString() };
    setDraftPlan(updated);
    await saveStudyPlan(updated);
  };

  const updateBlockTopic = (idx: number, topic: string) => {
    if (!draftPlan) return;
    const nextBlocks = draftPlan.blocks.map((b, i) => (i === idx ? { ...b, topic } : b));
    setDraftPlan({ ...draftPlan, blocks: nextBlocks });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-700 dark:text-amber-400" />
            {t.studyPlanner}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Configure your daily hours, weak subjects, and exam date to build an editable SSC CGL timetable.
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Daily Study Hours: <span className="font-mono-num">{hoursPerDay} hrs</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="w-full accent-blue-700 dark:accent-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Exam Target</label>
            <select
              value={examTarget}
              onChange={(e) => setExamTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3 py-2 text-sm"
            >
              <option>SSC CGL Tier 1 + Tier 2</option>
              <option>SSC CGL Tier 1 Sprint</option>
              <option>SSC CGL Tier 2 Revision</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Target Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081221] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold mb-2">Weak Subjects (Priority)</div>
            <div className="flex flex-wrap gap-2">
              {allSubjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleWeak(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    weakSubjects.includes(s)
                      ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {SUBJECT_NAMES[s][language]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold mb-2">Strong Subjects (Maintenance)</div>
            <div className="flex flex-wrap gap-2">
              {allSubjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStrong(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    strongSubjects.includes(s)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {SUBJECT_NAMES[s][language]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="w-full py-3 rounded-xl bg-[#0A192F] dark:bg-amber-500 text-white dark:text-[#081221] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Smart Timetable
          </button>
        </div>

        {/* Generated & Editable Schedule */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0F1E36] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          {draftPlan ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Your Daily Timetable</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {draftPlan.summary}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-amber-400 mt-1 font-medium">
                    Weekly Target: {draftPlan.weeklyTarget}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await saveStudyPlan(draftPlan);
                    setSavedNotice(true);
                    setTimeout(() => setSavedNotice(false), 1800);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savedNotice ? 'Saved' : 'Save Edits'}
                </button>
              </div>

              <div className="space-y-3">
                {draftPlan.blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                        {block.timeSlot} · {block.activityType} · {block.subject} · {block.durationMinutes} min
                      </div>
                      <input
                        type="text"
                        value={block.topic}
                        onChange={(e) => updateBlockTopic(idx, e.target.value)}
                        className="w-full bg-transparent font-medium text-sm border-b border-transparent focus:border-blue-600 focus:outline-none pb-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBlockDone(idx)}
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        block.completed ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                      aria-label="Toggle block completion"
                    >
                      {block.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <Calendar className="w-10 h-10 text-slate-400" />
              <div className="font-display font-bold text-base">
                Generate your personalized SSC CGL schedule
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Pick your daily hours and weak subjects on the left, then click Generate Smart Timetable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
