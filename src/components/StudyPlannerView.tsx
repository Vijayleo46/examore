import React, { useState } from 'react';
import { Calendar, CheckCircle2, Circle, Loader2, Save, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBJECT_NAMES, UI_TEXT } from '../data/i18n';
import { StudyBlock, StudyPlan, SubjectId } from '../types/examverse';
import { BackHomeBar, OceanGlassCard } from './OceanTheme';

export const StudyPlannerView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { language, studyPlan, saveStudyPlan, setActiveTab } = useApp();
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
      if (!res.ok) throw new Error('Planner fallback');
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
      <BackHomeBar
        title={t.studyPlanner}
        onBack={onBack}
        onHome={() => setActiveTab('home')}
      />

      <div>
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2 text-[#062B3D] dark:text-[#F3FAFA]">
          <Calendar className="w-6 h-6 text-[#20C7C9]" />
          {t.studyPlanner}
        </h1>
        <p className="text-sm text-[#075985] dark:text-[#8DE1D3] mt-1">
          Configure your daily hours, weak subjects, and exam date to build an editable SSC CGL timetable.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Form */}
        <OceanGlassCard className="lg:col-span-5 p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-[#062B3D] dark:text-[#F3FAFA]">
              Daily Study Hours: <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">{hoursPerDay} hrs</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="w-full accent-[#20C7C9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">Exam Target</label>
            <select
              value={examTarget}
              onChange={(e) => setExamTarget(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-sm"
            >
              <option>SSC CGL Tier 1 + Tier 2</option>
              <option>SSC CGL Tier 1 Sprint</option>
              <option>SSC CGL Tier 2 Revision</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">Target Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 bg-[#F3FAFA] dark:bg-[#062B3D] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-bold mb-2">Weak Subjects (Priority)</div>
            <div className="flex flex-wrap gap-2">
              {allSubjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleWeak(s)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    weakSubjects.includes(s)
                      ? 'border-[#FF8B78] bg-[#FF8B78]/15 text-[#9A2D1F] dark:text-[#FF8B78]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {SUBJECT_NAMES[s][language]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold mb-2">Strong Subjects (Maintenance)</div>
            <div className="flex flex-wrap gap-2">
              {allSubjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStrong(s)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    strongSubjects.includes(s)
                      ? 'border-[#20C7C9] bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]'
                      : 'border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
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
            className="w-full min-h-[48px] py-3 rounded-xl bg-[#075985] hover:bg-[#062B3D] dark:bg-[#20C7C9] dark:hover:bg-[#55D6D0] text-white dark:text-[#062B3D] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Smart Timetable
          </button>
        </OceanGlassCard>

        {/* Generated & Editable Schedule */}
        <OceanGlassCard className="lg:col-span-7 p-6 space-y-5">
          {draftPlan ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#8DE1D3]/35 dark:border-[#20C7C9]/20 pb-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#062B3D] dark:text-[#F3FAFA]">
                    Your Daily Timetable
                  </h2>
                  <p className="text-xs text-[#073B50] dark:text-[#8DE1D3] mt-1">
                    {draftPlan.summary}
                  </p>
                  <p className="text-xs text-[#075985] dark:text-[#55D6D0] mt-1 font-semibold">
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
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8DE1D3]/60 dark:border-[#20C7C9]/30 text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[#20C7C9]" />
                  {savedNotice ? 'Saved' : 'Save Edits'}
                </button>
              </div>

              <div className="space-y-3">
                {draftPlan.blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#8DE1D3]/45 dark:border-[#20C7C9]/20 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="text-xs font-mono-num text-[#075985] dark:text-[#8DE1D3]">
                        {block.timeSlot} · {block.activityType} · {block.subject} · {block.durationMinutes} min
                      </div>
                      <input
                        type="text"
                        value={block.topic}
                        onChange={(e) => updateBlockTopic(idx, e.target.value)}
                        className="w-full bg-transparent font-semibold text-sm border-b border-transparent focus:border-[#20C7C9] focus:outline-none pb-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBlockDone(idx)}
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer ${
                        block.completed ? 'text-[#20C7C9]' : 'text-[#075985]/45 dark:text-[#8DE1D3]/45'
                      }`}
                      aria-label={block.completed ? 'Mark block incomplete' : 'Mark block complete'}
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
              <Calendar className="w-10 h-10 text-[#20C7C9]" />
              <div className="font-display font-bold text-base">
                Generate your personalized SSC CGL schedule
              </div>
              <p className="text-xs text-[#075985] dark:text-[#8DE1D3] max-w-sm">
                Pick your daily hours and weak subjects on the left, then click Generate Smart Timetable.
              </p>
            </div>
          )}
        </OceanGlassCard>
      </div>
    </div>
  );
};
