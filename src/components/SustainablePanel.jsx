import React, { useState } from 'react';
import { X, Sprout, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { SEASON_CROPS, recommendNextCrops, assessRotation } from '../utils/sustainability';
import { aluMessage } from '../utils/aluStatus';

// How each verdict is shown: status colour always with an icon and a label
const VERDICTS = {
  sustainable: { label: 'Sustainable', icon: CheckCircle2, className: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' },
  partly: { label: 'Partly sustainable', icon: AlertTriangle, className: 'bg-amber-500/10 border-amber-500/40 text-amber-300' },
  not: { label: 'Not sustainable', icon: XCircle, className: 'bg-rose-500/10 border-rose-500/40 text-rose-300' }
};

const UNKNOWN = 'Unknown';

// Farms without satellite crop history get the last three seasons entered by hand, oldest first
function manualSeasons(field) {
  const padding = Array.from({ length: 3 }, () => ({ crop: UNKNOWN, year: null }));
  return field.seasons || padding;
}

// e.g. "25 Jun 2026"
function shortDate(iso) {
  return iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '—';
}

const selectClass = 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500';

export default function SustainablePanel({ field, onUpdateSeasons, onClose }) {
  // ALU crop history of the farm, last three seasons; when it exists the crops come from it directly
  // Every season ALU reported, including the ones the rules cannot use (unknown crop, low confidence)
  const cycles = field.cropCycles
    || (field.cropHistory || []).map(h => ({ ...h, confidence: null, used: true, note: null }));

  // The last three finished seasons, in order. A season ALU is unsure about stays in as Unknown,
  // so the rules see a gap there instead of joining the crops on either side.
  const aluSeasons = cycles
    .filter(c => c.note !== 'Season still running')
    .slice(-3)
    .map(c => ({ crop: c.used ? c.crop : 'Unknown', year: c.year, startDate: c.startDate }));
  const fromAlu = aluSeasons.some(s => s.crop !== 'Unknown');
  const judged = new Set(aluSeasons.filter(s => s.crop !== 'Unknown').map(s => s.startDate));

  // Edits for farms without ALU history are kept on the farm, so reopening the panel shows them
  const [seasons, setSeasons] = useState(() => (fromAlu ? aluSeasons : manualSeasons(field)));
  const result = recommendNextCrops(seasons.map(s => s.crop));
  const assessment = assessRotation(seasons.map(s => s.crop));
  const verdict = assessment.verdict ? VERDICTS[assessment.verdict] : null;
  const VerdictIcon = verdict?.icon;

  const changeSeason = (index, crop) => {
    const updated = seasons.map((s, i) => (i === index ? { ...s, crop } : s));
    setSeasons(updated);
    onUpdateSeasons(field.id, updated);
  };

  return (
    <aside className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">Sustainable Farming</span>
          <h2 className="text-base font-bold text-white truncate">{field.name}</h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {field.farmerName || 'Farmer not entered'}{field.crop ? ` • ${field.crop}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Crops of the previous seasons: from ALU, or entered by hand when ALU has none */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">1. Crops grown on this farm</span>

          {/* For drawn and uploaded farms: what the ALU lookup at the farm centre found */}
          {aluMessage(field) && (
            <p className={`text-[11px] leading-relaxed mb-2 ${aluMessage(field).tone}`}>{aluMessage(field).text}</p>
          )}

          {cycles.length > 0 && (
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-400 bg-slate-900/80">
                      <th className="px-2.5 py-2 font-medium">Sowing</th>
                      <th className="px-2.5 py-2 font-medium">Harvest</th>
                      <th className="px-2.5 py-2 font-medium">Crop</th>
                      <th className="px-2.5 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map((c, i) => {
                      const inVerdict = c.used && judged.has(c.startDate);
                      return (
                        <tr key={`${c.startDate}-${i}`} className={`border-t border-slate-800 ${inVerdict ? 'bg-emerald-500/10' : ''}`}>
                          <td className="px-2.5 py-2 font-mono text-slate-300 whitespace-nowrap">{shortDate(c.startDate)}</td>
                          <td className="px-2.5 py-2 font-mono text-slate-300 whitespace-nowrap">{shortDate(c.endDate)}</td>
                          <td className="px-2.5 py-2">
                            <span className={`block font-semibold ${c.used ? 'text-white' : 'text-slate-500'}`}>{c.crop}</span>
                            {c.confidence !== null && (
                              <span className="block text-[10px] text-slate-500 font-mono">{Math.round(c.confidence * 100)}% sure</span>
                            )}
                          </td>
                          <td className={`px-2.5 py-2 ${inVerdict ? 'text-emerald-300' : 'text-slate-500'}`}>
                            {inVerdict ? 'Used' : c.used ? 'Older season' : c.note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">
                From the ALU crop history. Sowing and harvest are the season dates ALU detected, so they are approximate.
                The last three finished seasons are judged; the highlighted ones are used for the verdict and the suggestion.
                Seasons where ALU is less than 40% sure, or cannot name the crop, count as unknown.
              </p>
            </div>
          )}

          {!fromAlu && (
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
                {cycles.length > 0
                  ? 'ALU could not name a usable crop for any season, so enter the crops grown in the previous seasons.'
                  : 'This farm has no satellite crop history, so enter the crops grown in the previous seasons.'}
              </p>
            </div>
          )}
        </div>

        {/* 2. Verdict on the crop cycle: sustainable, partly sustainable or not */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">2. Is this farming sustainable?</span>

          {!verdict && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
              At least two known seasons are needed to judge the crop cycle.
            </div>
          )}

          {verdict && (
            <div className="space-y-3">
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${verdict.className}`}>
                <div className="flex items-center gap-2">
                  <VerdictIcon className="w-5 h-5" />
                  <span className="text-sm font-bold">{verdict.label}</span>
                </div>
                <span className="text-xs font-mono">Score {assessment.score}/100</span>
              </div>

              <ul className="space-y-1.5">
                {assessment.checks.map(check => (
                  <li key={check.label} className="flex items-start gap-2 text-[11px]">
                    {check.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                    <span className="text-slate-300">
                      <span className="font-semibold text-white">{check.label}:</span> {check.detail}
                      {check.points < 0 && <span className="font-mono text-rose-400"> ({check.points})</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-slate-500">
                Based on {assessment.basedOn} seasons {fromAlu ? 'from the ALU crop history' : 'entered above'}.
                70 and above is sustainable, 40 to 69 is partly sustainable, below 40 is not sustainable.
              </p>
            </div>
          )}
        </div>

        {/* 3. Suggested crop for the next season */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">3. Suggested crop for the next season</span>

          {result.basedOn === 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
              Choose the crop of at least one previous season to get a suggestion.
            </div>
          )}

          {result.basedOn > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">Based on {result.basedOn} known {result.basedOn === 1 ? 'season' : 'seasons'}.</p>

              {!result.strong && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                  No crop is a strong match for this sequence. Check with a local agronomist before choosing.
                </div>
              )}

              {result.suggestions.map((s, i) => (
                <div key={s.crop} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{i + 1}. {s.crop}</h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">Score {s.score}</span>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {s.reasons.length === 0 && (
                      <li className="text-[11px] text-slate-400">No rule applies to this crop.</li>
                    )}
                    {s.reasons.map(r => (
                      <li key={r.reason} className="text-[11px] text-slate-300">
                        <span className={`font-mono ${r.points > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.points > 0 ? '+' : ''}{r.points}
                        </span>{' '}
                        {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
