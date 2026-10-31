import React, { useState } from 'react';
import { X, Leaf, TrendingUp, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { SEASON_CROPS, assessRotation } from '../utils/sustainability';
import { calculateCarbonCredits } from '../utils/carbonCredits';

const UNKNOWN = 'Unknown';

function manualSeasons(field) {
  const padding = Array.from({ length: 3 }, () => ({ crop: UNKNOWN, year: null }));
  return field.seasons || padding;
}

const selectClass =
  'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500';

// Small stat card
function StatCard({ label, value, sub, highlight }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-400 uppercase font-medium">{label}</span>
      <span className={`text-base font-bold font-mono ${highlight || 'text-emerald-400'}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

// Quality badge colours
function qualityStyle(quality) {
  if (quality === 'High')   return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
  if (quality === 'Medium') return 'bg-amber-500/10  border-amber-500/40  text-amber-300';
  return                           'bg-rose-500/10   border-rose-500/30   text-rose-400';
}

export default function CarbonCreditPanel({ field, onUpdateSeasons, onClose }) {
  // ── Crop history (same logic as SustainablePanel) ────────────────────────
  const cycles = field.cropCycles
    || (field.cropHistory || []).map(h => ({ ...h, confidence: null, used: true, note: null }));

  const aluSeasons = cycles
    .filter(c => c.note !== 'Season still running')
    .slice(-3)
    .map(c => ({ crop: c.used ? c.crop : 'Unknown', year: c.year, startDate: c.startDate }));
  const fromAlu = aluSeasons.some(s => s.crop !== 'Unknown');

  const [seasons, setSeasons] = useState(() => (fromAlu ? aluSeasons : manualSeasons(field)));

  const changeSeason = (index, crop) => {
    const updated = seasons.map((s, i) => (i === index ? { ...s, crop } : s));
    setSeasons(updated);
    onUpdateSeasons(field.id, updated);
  };

  // ── Sustainability verdict (needed for credit calculation) ────────────────
  const assessment = assessRotation(seasons.map(s => s.crop));

  // ── Carbon credit calculation ─────────────────────────────────────────────
  const carbon = calculateCarbonCredits({
    areaHectares: field.areaHectares || 0,
    crop:         field.crop || '',
    verdict:      assessment.verdict,
    sustainScore: assessment.score,
    cropHistory:  seasons.map(s => s.crop),
  });

  const tierStyle =
    carbon.tier === 'Gold'
      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
      : carbon.tier === 'Silver'
      ? 'bg-slate-400/10 border-slate-400/40 text-slate-300'
      : 'bg-orange-500/10 border-orange-500/30 text-orange-400';

  const verdictIcon =
    assessment.verdict === 'sustainable' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    ) : assessment.verdict === 'partly' ? (
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    ) : assessment.verdict === 'not' ? (
      <XCircle className="w-3.5 h-3.5 text-rose-400" />
    ) : null;

  return (
    <aside className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">Carbon Credits</span>
          <h2 className="text-base font-bold text-white truncate">{field.name}</h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {field.farmerName || 'Farmer not entered'}{field.crop ? ` · ${field.crop}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── 1. Total credits headline ──────────────────────────────────── */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">1. Carbon Credit Summary</span>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white font-mono">
                    {carbon.totalCredits.toFixed(2)}
                    <span className="text-sm font-normal text-slate-400 ml-1">tCO₂e</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Total Carbon Credits</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${tierStyle}`}>
                  {carbon.tier} Tier
                </span>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${qualityStyle(carbon.quality)}`}>
                  {carbon.quality}
                </span>
              </div>
            </div>

            {/* Estimated rupee value */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-300">
                  ₹{carbon.estimatedValue.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-400 ml-1">estimated market value</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  @ ₹{carbon.pricePerTonne}/tCO₂e — VERRA / Gold Standard (conservative)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Key metrics grid ────────────────────────────────────────── */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">2. Key Metrics</span>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Farm Area"
              value={`${carbon.areaHectares.toFixed(2)} ha`}
              sub={`${(carbon.areaHectares * 2.47105).toFixed(2)} acres`}
            />
            <StatCard
              label="Carbon Rate"
              value={`${carbon.effectiveRate.toFixed(1)} tCO₂e/ha`}
              sub={`Range: ${carbon.rateMin}–${carbon.rateMax}`}
              highlight="text-teal-400"
            />
            <StatCard
              label="Total Credits"
              value={`${carbon.totalCredits.toFixed(2)} tCO₂e`}
              sub={carbon.caseLabel}
            />
            <StatCard
              label="Min Area / Credit"
              value={`${carbon.minAreaForOneCredit} ha`}
              sub="To generate 1 tCO₂e"
              highlight="text-slate-300"
            />
          </div>
        </div>

        {/* ── 3. Crop history input (same as SustainablePanel) ──────────── */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">3. Previous Crop Seasons</span>

          {fromAlu ? (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-400 bg-slate-900/80">
                    <th className="px-2.5 py-2 font-medium">Season</th>
                    <th className="px-2.5 py-2 font-medium">Crop</th>
                    <th className="px-2.5 py-2 font-medium">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {aluSeasons.map((s, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-2.5 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-2.5 py-2 font-semibold text-white">{s.crop}</td>
                      <td className="px-2.5 py-2 text-slate-400 font-mono">{s.year ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {seasons.map((s, i) => (
                <label key={i} className="block">
                  <span className="text-[10px] text-slate-400 font-mono block mb-1">Season {i + 1} of 3 (oldest first)</span>
                  <select value={s.crop} onChange={e => changeSeason(i, e.target.value)} className={selectClass}>
                    <option value={UNKNOWN}>Unknown</option>
                    {SEASON_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              ))}
              <p className="text-[11px] text-slate-500">
                More distinct crops across seasons = higher carbon credit tier and rate.
              </p>
            </div>
          )}
        </div>

        {/* ── 4. Sustainability Classification ──────────────────────────── */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">4. Sustainability Classification</span>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">

            {/* Verdict header row */}
            {assessment.verdict && (
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                {verdictIcon}
                <span className="text-[11px] text-slate-300">
                  Sustainability Rating:{' '}
                  <span className="font-semibold text-white">{carbon.verdictLabel}</span>
                  {assessment.score != null && (
                    <span className="text-slate-500 font-mono ml-1">(score {assessment.score}/100)</span>
                  )}
                </span>
              </div>
            )}

            {/* Classification rows — label + value, note indented below */}
            {carbon.breakdown.map(row => (
              <div key={row.label} className="space-y-0.5">
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-slate-400 w-32 shrink-0">{row.label}</span>
                  <span className="text-white font-medium flex-1">{row.value}</span>
                </div>
                {row.note && (
                  <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pl-32">
                    <Info className="w-3 h-3 shrink-0 mt-0.5 text-slate-500" />
                    <span>{row.note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. How to earn more credits ───────────────────────────────── */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">5. How to Earn More Credits</span>
          <div className="space-y-2">

            {carbon.factors.uniqueCrops < 3 && carbon.factors.uniqueCrops >= 2 && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-slate-300">
                <span className="text-emerald-400 font-semibold">↑ Add a 3rd distinct crop:</span>{' '}
                Moving from Partly Sustainable → Sustainable raises your rate from 1.0 to 2.2 tCO₂e/ha — more than doubling your credits.
              </div>
            )}

            {carbon.factors.uniqueCrops < 2 && (
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-300">
                <span className="text-amber-400 font-semibold">↑ Introduce crop rotation:</span>{' '}
                Growing at least 2 distinct crops moves you to Partly Sustainable (1.0 tCO₂e/ha). 3 distinct crops reaches Sustainable (2.2 tCO₂e/ha).
              </div>
            )}

            {carbon.factors.uniqueCrops < 3 && (
              <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 text-[11px] text-slate-300">
                <span className="text-teal-400 font-semibold">↑ Try legumes:</span>{' '}
                Adding Gram, Soybean, or Groundnut diversifies your rotation and improves soil nitrogen — both help your sustainability rating.
              </div>
            )}

            {carbon.factors.uniqueCrops >= 3 && assessment.verdict === 'sustainable' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200 font-semibold">
                ✓ This farm is on the highest carbon credit tier — Sustainable with 3 distinct crops!
              </div>
            )}

          </div>
        </div>

      </div>
    </aside>
  );
}
