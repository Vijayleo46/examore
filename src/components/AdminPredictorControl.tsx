import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Edit3,
  FileCheck2,
  Globe,
  Loader2,
  Newspaper,
  PlusCircle,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  analyzeHistoricalPyqs,
  buildTopicPredictions,
  comparePredictedVsActual,
  PREDICTOR_YEARS,
} from '../data/futurePredictorEngine';
import {
  AI_EXPECTED_QUESTION_NOTICE,
  CurrentAffairsCategory,
  CurrentAffairsItem,
  ExamTier,
  PredictorQuestion,
  PreparationPriority,
  SubjectId,
} from '../types/examverse';

const CA_CATS: CurrentAffairsCategory[] = [
  'National',
  'International',
  'Government Schemes',
  'Awards & Appointments',
  'Science & Technology',
  'Economy & Reports',
  'Sports & Major Events',
];

export const AdminPredictorControl: React.FC<{
  onStatus: (type: 'ok' | 'err', text: string) => void;
}> = ({ onStatus }) => {
  const {
    questions,
    predictorQuestions,
    predictorCategories,
    predictionReports,
    currentAffairs,
    reviewPredictorQuestion,
    deletePredictorQuestion,
    upsertPredictorCategory,
    savePredictionReport,
    togglePredictionReportOutdated,
    upsertCurrentAffairsItem,
    deleteCurrentAffairsItem,
  } = useApp();

  const [targetYear, setTargetYear] = useState<number>(2026);
  const [tier, setTier] = useState<ExamTier>('Tier 1');
  const [subView, setSubView] = useState<'queue' | 'categories' | 'accuracy' | 'affairs'>('queue');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Edit AI expected question modal/inline state
  const [editingPq, setEditingPq] = useState<PredictorQuestion | null>(null);

  // Accuracy Comparison form
  const [compareYear, setCompareYear] = useState<number>(2024);
  const [compareTier, setCompareTier] = useState<ExamTier>('Tier 1');
  const [customActualText, setCustomActualText] = useState('');

  // Current Affairs publish form
  const [caTitle, setCaTitle] = useState('');
  const [caCategory, setCaCategory] = useState<CurrentAffairsCategory>('National');
  const [caSummary, setCaSummary] = useState('');
  const [caRelevance, setCaRelevance] = useState('');
  const [caDate, setCaDate] = useState(new Date().toISOString().slice(0, 10));
  const [caSourceName, setCaSourceName] = useState('Press Information Bureau (PIB)');
  const [caSourceUrl, setCaSourceUrl] = useState('https://www.pib.gov.in');
  const [fetchingCa, setFetchingCa] = useState(false);

  const historical = useMemo(() => analyzeHistoricalPyqs(questions, tier), [questions, tier]);
  const predictions = useMemo(
    () => buildTopicPredictions(questions, targetYear, tier, predictorCategories),
    [questions, targetYear, tier, predictorCategories]
  );

  const filteredQueue = useMemo(
    () =>
      predictorQuestions.filter((pq) =>
        statusFilter === 'all' ? true : pq.reviewStatus === statusFilter
      ),
    [predictorQuestions, statusFilter]
  );

  const pendingCount = predictorQuestions.filter((q) => q.reviewStatus === 'pending').length;
  const approvedCount = predictorQuestions.filter((q) => q.reviewStatus === 'approved').length;

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    const topPredicted = buildTopicPredictions(
      questions,
      compareYear,
      compareTier,
      predictorCategories
    )
      .slice(0, 14)
      .map((p) => p.topic);
    const manualTopics = customActualText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const report = comparePredictedVsActual(
      compareYear,
      compareTier,
      topPredicted,
      questions,
      manualTopics
    );
    await savePredictionReport(report);
    setCustomActualText('');
    onStatus(
      'ok',
      `Saved ${compareYear} ${compareTier} Accuracy Report (${report.coveragePct}% topic overlap).`
    );
  };

  const handlePublishCa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caTitle.trim() || !caSummary.trim() || !caSourceUrl.trim()) return;
    const item: CurrentAffairsItem = {
      id: `ca-adm-${Date.now()}`,
      category: caCategory,
      title: caTitle.trim(),
      summary: caSummary.trim(),
      examRelevance: caRelevance.trim() || 'High-yield SSC CGL General Awareness update',
      publishedDate: caDate,
      sourceName: caSourceName.trim() || 'Official Source',
      sourceUrl: caSourceUrl.trim(),
      targetYear,
      isPublished: true,
      createdAt: new Date().toISOString(),
    };
    await upsertCurrentAffairsItem(item);
    setCaTitle('');
    setCaSummary('');
    setCaRelevance('');
    onStatus('ok', 'Current Affairs brief published for students.');
  };

  const handlePullLiveCaForReview = async () => {
    setFetchingCa(true);
    try {
      const res = await fetch('/api/predictor/current-affairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examYear: targetYear, category: caCategory }),
      });
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      const items: Partial<CurrentAffairsItem>[] = Array.isArray(data.items) ? data.items : [];
      let saved = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.title || !it.sourceUrl) continue;
        await upsertCurrentAffairsItem({
          id: `ca-live-adm-${Date.now()}-${i}`,
          category: (it.category as CurrentAffairsCategory) || caCategory,
          title: String(it.title),
          summary: String(it.summary || ''),
          examRelevance: String(it.examRelevance || 'SSC CGL Current Affairs Focus'),
          publishedDate: String(it.publishedDate || new Date().toISOString().slice(0, 10)),
          sourceName: String(it.sourceName || 'Verified News Source'),
          sourceUrl: String(it.sourceUrl),
          targetYear,
          isPublished: true,
          createdAt: new Date().toISOString(),
        });
        saved++;
      }
      onStatus('ok', `Fetched & published ${saved} verified Current Affairs item(s).`);
    } catch {
      onStatus('err', 'Could not fetch live Current Affairs right now.');
    } finally {
      setFetchingCa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-2xl bg-[#073B50] text-[#F3FAFA] border border-[#20C7C9]/35 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[#55D6D0] flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            Admin Future Exam Predictor Control
          </div>
          <h2 className="font-display text-xl font-extrabold">
            Review AI Expected Questions, Manage Topic Categories &amp; Track Accuracy
          </h2>
          <p className="text-xs text-[#8DE1D3]">
            Archived 2016–2026 PYQs in library:{' '}
            <span className="font-mono-num font-bold text-white">
              {historical.totalVerifiedPyqs}
            </span>{' '}
            · Pending AI Questions:{' '}
            <span className="font-mono-num font-bold text-[#FF8B78]">{pendingCount}</span> ·
            Approved AI Questions:{' '}
            <span className="font-mono-num font-bold text-[#55D6D0]">{approvedCount}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value))}
            className="min-h-[38px] px-3 rounded-xl bg-[#062B3D] border border-[#20C7C9]/40 text-xs font-bold text-white"
          >
            {PREDICTOR_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                Cycle {yr}
              </option>
            ))}
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as ExamTier)}
            className="min-h-[38px] px-3 rounded-xl bg-[#062B3D] border border-[#20C7C9]/40 text-xs font-bold text-white"
          >
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
          </select>
        </div>
      </div>

      {/* Control Sub-navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'queue' as const, label: `AI Question Review (${pendingCount} pending)`, icon: Sparkles },
          { id: 'categories' as const, label: 'Topic Categories & Evidence', icon: Compass },
          { id: 'accuracy' as const, label: 'Predicted vs Actual Accuracy', icon: FileCheck2 },
          { id: 'affairs' as const, label: 'Current Affairs Desk', icon: Newspaper },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                subView === tab.id
                  ? 'bg-[#075985] text-white dark:bg-[#20C7C9] dark:text-[#062B3D]'
                  : 'bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. AI EXPECTED QUESTIONS REVIEW QUEUE */}
      {subView === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#20C7C9] text-[#062B3D]'
                      : 'bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#075985] dark:text-[#8DE1D3]">
              Approved AI questions always keep &ldquo;{AI_EXPECTED_QUESTION_NOTICE}&rdquo;.
            </span>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-8 text-center text-xs text-[#075985] dark:text-[#8DE1D3]">
              No AI expected practice questions match this filter yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((pq) => (
                <div
                  key={pq.id}
                  className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FF8B78]/18 text-[#9A2D1F] dark:text-[#FF8B78]">
                        AI Expected Practice (Not Official PYQ)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#20C7C9]/15 text-[#075985] dark:text-[#55D6D0]">
                        {pq.examYear} · {pq.tier} · {pq.subject.toUpperCase()} · {pq.topic}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 capitalize">
                        Status: {pq.reviewStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await reviewPredictorQuestion(pq.id, 'approved');
                          onStatus('ok', 'AI expected question approved and published for students.');
                        }}
                        className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await reviewPredictorQuestion(pq.id, 'rejected');
                          onStatus('ok', 'AI expected question marked rejected/unpublished.');
                        }}
                        className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPq(pq)}
                        className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25 text-xs font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deletePredictorQuestion(pq.id);
                          onStatus('ok', 'Deleted AI expected question.');
                        }}
                        className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/15 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-bold">{pq.questionEn}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {pq.optionsEn.map((op, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2 rounded-lg border ${
                          i === pq.correctIndex
                            ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                            : 'border-[#8DE1D3]/40 dark:border-[#20C7C9]/20'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. {op}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-[#075985] dark:text-[#8DE1D3]">
                    <span className="font-bold">Explanation:</span> {pq.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. TOPIC CATEGORIES & EVIDENCE */}
      {subView === 'categories' && (
        <div className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3FAFA] dark:bg-[#062B3D] border-b border-[#8DE1D3]/45 dark:border-[#20C7C9]/20">
                <tr>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Historical Freq</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Priority Override</th>
                  <th className="py-3 px-4">Outdated Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8DE1D3]/30 dark:divide-[#20C7C9]/15">
                {predictions.map((pred) => {
                  const catId = `${pred.subject}-${pred.topic
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')}-${pred.tier
                    .toLowerCase()
                    .replace(/\s+/g, '')}-${targetYear}`;
                  return (
                    <tr key={`${pred.subject}-${pred.topic}`}>
                      <td className="py-3 px-4 font-bold">{pred.topic}</td>
                      <td className="py-3 px-4 uppercase">{pred.subject}</td>
                      <td className="py-3 px-4 font-mono-num">
                        {pred.historicalFrequency} ({pred.recentTrendLabel})
                      </td>
                      <td className="py-3 px-4 font-bold">{pred.confidence}</td>
                      <td className="py-3 px-4">
                        <select
                          value={pred.priority}
                          onChange={async (e) => {
                            await upsertPredictorCategory({
                              id: catId,
                              topic: pred.topic,
                              subject: pred.subject as SubjectId,
                              tier: pred.tier,
                              targetYear,
                              priorityOverride: e.target.value as PreparationPriority,
                              isOutdated: Boolean(pred.isOutdated),
                              outdatedNote: pred.outdatedNote,
                              updatedAt: new Date().toISOString(),
                            });
                            onStatus('ok', `Updated priority for ${pred.topic}.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs font-semibold"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Maintain">Maintain</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextOutdated = !pred.isOutdated;
                            await upsertPredictorCategory({
                              id: catId,
                              topic: pred.topic,
                              subject: pred.subject as SubjectId,
                              tier: pred.tier,
                              targetYear,
                              priorityOverride: pred.priority,
                              isOutdated: nextOutdated,
                              outdatedNote: nextOutdated
                                ? 'Pattern adjusted per latest SSC notification.'
                                : '',
                              updatedAt: new Date().toISOString(),
                            });
                            onStatus(
                              'ok',
                              `${pred.topic} ${nextOutdated ? 'flagged outdated' : 'restored active'}.`
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            pred.isOutdated
                              ? 'bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {pred.isOutdated ? 'Outdated (Restore)' : 'Active (Flag)'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PREDICTION ACCURACY COMPARISON */}
      {subView === 'accuracy' && (
        <div className="space-y-5">
          <form
            onSubmit={handleRunComparison}
            className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-5 space-y-4"
          >
            <h3 className="font-display font-bold text-base">
              Run Predicted vs Actual Topic Comparison
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">Exam Year to Audit</label>
                <input
                  type="number"
                  min={2016}
                  max={2030}
                  value={compareYear}
                  onChange={(e) => setCompareYear(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Tier</label>
                <select
                  value={compareTier}
                  onChange={(e) => setCompareTier(e.target.value as ExamTier)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
                >
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">
                  Optional Actual Exam Topics (comma-separated)
                </label>
                <input
                  value={customActualText}
                  onChange={(e) => setCustomActualText(e.target.value)}
                  placeholder="Leave blank to auto-detect from imported PYQs"
                  className="w-full min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              Compare &amp; Save Accuracy Report
            </button>
          </form>

          <div className="space-y-3">
            {predictionReports.map((rep) => (
              <div
                key={rep.id}
                className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="font-display font-bold text-sm">
                    {rep.title} ·{' '}
                    <span className="font-mono-num text-[#075985] dark:text-[#55D6D0]">
                      {rep.coveragePct}% Coverage
                    </span>
                  </div>
                  <p className="text-xs text-[#075985] dark:text-[#8DE1D3]">{rep.notes}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await togglePredictionReportOutdated(rep.id, !rep.isOutdated);
                    onStatus('ok', 'Report status updated.');
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    rep.isOutdated
                      ? 'bg-[#FF8B78]/20 text-[#9A2D1F] dark:text-[#FF8B78]'
                      : 'border border-[#8DE1D3]/50 dark:border-[#20C7C9]/25'
                  }`}
                >
                  {rep.isOutdated ? 'Marked Outdated (Restore)' : 'Mark Outdated'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CURRENT AFFAIRS MANAGER */}
      {subView === 'affairs' && (
        <div className="space-y-5">
          <form
            onSubmit={handlePublishCa}
            className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#20C7C9]" />
                Publish Verified Current Affairs Brief
              </h3>
              <button
                type="button"
                disabled={fetchingCa}
                onClick={handlePullLiveCaForReview}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#20C7C9] text-[#062B3D] text-xs font-extrabold cursor-pointer disabled:opacity-60"
              >
                {fetchingCa ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Globe className="w-3.5 h-3.5" />
                )}
                Pull Verified Web Updates ({caCategory})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={caCategory}
                onChange={(e) => setCaCategory(e.target.value as CurrentAffairsCategory)}
                className="min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
              >
                {CA_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={caDate}
                onChange={(e) => setCaDate(e.target.value)}
                className="min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
              />
              <input
                value={caSourceName}
                onChange={(e) => setCaSourceName(e.target.value)}
                placeholder="Source Name (e.g., PIB, RBI)"
                className="min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
              />
            </div>

            <input
              value={caTitle}
              onChange={(e) => setCaTitle(e.target.value)}
              placeholder="Headline (e.g., 16th Finance Commission Terms of Reference)"
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
            />
            <textarea
              value={caSummary}
              onChange={(e) => setCaSummary(e.target.value)}
              rows={2}
              placeholder="Concise factual summary..."
              className="w-full p-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={caRelevance}
                onChange={(e) => setCaRelevance(e.target.value)}
                placeholder="SSC CGL exam relevance note"
                className="min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
              />
              <input
                value={caSourceUrl}
                onChange={(e) => setCaSourceUrl(e.target.value)}
                placeholder="https://..."
                className="min-h-[40px] px-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#075985] dark:bg-[#20C7C9] text-white dark:text-[#062B3D] text-xs font-extrabold cursor-pointer"
            >
              Publish Current Affairs Brief
            </button>
          </form>

          <div className="space-y-2.5">
            {currentAffairs.map((ca) => (
              <div
                key={ca.id}
                className="rounded-2xl bg-white dark:bg-[#073B50] border border-[#8DE1D3]/45 dark:border-[#20C7C9]/25 p-4 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    [{ca.category}] {ca.title}
                  </div>
                  <div className="text-[11px] text-[#075985] dark:text-[#8DE1D3]">
                    {ca.publishedDate} · {ca.sourceName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteCurrentAffairsItem(ca.id);
                    onStatus('ok', 'Removed Current Affairs item.');
                  }}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit AI Expected Question Modal */}
      {editingPq && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await reviewPredictorQuestion(editingPq.id, editingPq.reviewStatus, {
                questionEn: editingPq.questionEn,
                explanation: editingPq.explanation,
                correctIndex: editingPq.correctIndex,
              });
              setEditingPq(null);
              onStatus('ok', 'AI expected practice question updated.');
            }}
            className="bg-white dark:bg-[#073B50] border border-[#20C7C9]/35 rounded-2xl max-w-lg w-full p-6 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF8B78]">
              <AlertTriangle className="w-4 h-4" />
              {AI_EXPECTED_QUESTION_NOTICE}
            </div>
            <textarea
              value={editingPq.questionEn}
              onChange={(e) => setEditingPq({ ...editingPq, questionEn: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
            />
            <textarea
              value={editingPq.explanation}
              onChange={(e) => setEditingPq({ ...editingPq, explanation: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl border border-[#8DE1D3]/55 dark:border-[#20C7C9]/25 bg-[#F3FAFA] dark:bg-[#062B3D] text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPq(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#075985] text-white text-xs font-bold cursor-pointer"
              >
                Save Edits
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
