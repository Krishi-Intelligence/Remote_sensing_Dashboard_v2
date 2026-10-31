import React, { useEffect, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import IndexChart from './IndexChart';
import { fetchIndexSeries } from '../utils/eeClient';
import { indexById } from '../utils/indices';
import { canopySummary, estimateYield } from '../utils/yieldEstimate';

// Earlier crop cycles of the farm from the ALU history, with the dates ALU gave for each
function pastSeasonsOf(field) {
  return (field.cropHistory || []).filter(s => s.startDate && s.endDate).slice(-3);
}

const NDVI = indexById('ndvi');

function Card({ label, value, detail }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
      <span className="text-[10px] text-slate-400 block uppercase font-medium">{label}</span>
      <span className="text-lg font-bold text-emerald-400 font-mono">{value}</span>
      {detail && <span className="text-[11px] text-slate-300 block mt-0.5">{detail}</span>}
    </div>
  );
}

export default function YieldPanel({ field, onClose }) {
  const hasSeason = Boolean(field.startDate && field.endDate);
  const [season, setSeason] = useState({ status: 'idle' });

  useEffect(() => {
    if (!hasSeason) {
      setSeason({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setSeason({ status: 'loading' });
    fetchIndexSeries(field, 'ndvi', field.startDate, field.endDate)
      .then(data => { if (!cancelled) setSeason({ status: 'ready', series: data.series }); })
      .catch(err => { if (!cancelled) setSeason({ status: 'error', error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id, field.startDate, field.endDate, hasSeason]);

  // Canopy summary and yield for each earlier crop cycle, read from the satellite images of its dates
  const pastSeasons = pastSeasonsOf(field);
  const [past, setPast] = useState({ status: 'idle' });
  useEffect(() => {
    if (pastSeasons.length === 0) {
      setPast({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setPast({ status: 'loading' });
    Promise.all(pastSeasons.map(s =>
      fetchIndexSeries(field, 'ndvi', s.startDate, s.endDate)
        .then(data => ({ ...s, summary: canopySummary(data.series) }))
        .catch(() => ({ ...s, summary: null }))
    )).then(rows => { if (!cancelled) setPast({ status: 'ready', rows }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id, field.cropHistory]);

  const summary = season.status === 'ready' ? canopySummary(season.series) : null;
  const estimate = summary ? estimateYield(field.crop, summary.ndviDays) : null;
  const today = new Date().toLocaleDateString('en-CA');
  const seasonRunning = hasSeason && field.endDate > today;

  return (
    <aside className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">Yield Estimation</span>
          <h2 className="text-base font-bold text-white truncate">{field.name}</h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {field.farmerName || 'Farmer not entered'}{field.crop ? ` • ${field.crop}` : ''}
          </p>
          {hasSeason && (
            <p className="text-[11px] text-slate-400 font-mono">{field.startDate} to {field.endDate}</p>
          )}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasSeason && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
            Enter the season start and end dates for this farm to estimate its yield.
          </div>
        )}

        {hasSeason && season.status === 'loading' && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
            Reading the crop canopy from the satellite images...
          </div>
        )}

        {hasSeason && season.status === 'error' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
            {season.error}
          </div>
        )}

        {season.status === 'ready' && !summary && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
            No usable satellite images in this season.
          </div>
        )}

        {summary && (
          <>
            {/* Canopy strength over the season */}
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">Crop canopy this season</span>
              <div className="grid grid-cols-2 gap-2">
                <Card label="Peak NDVI" value={summary.peakValue.toFixed(2)} detail={`${summary.peakReading} • ${summary.peakDate}`} />
                <Card label="Green-season total" value={summary.ndviDays.toFixed(1)} detail="NDVI-days over the season" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Built from {summary.images} satellite {summary.images === 1 ? 'image' : 'images'}.
                {seasonRunning ? ' The season is still running, so this is a partial estimate.' : ''}
              </p>
            </div>

            {/* Yield estimate */}
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">Estimated yield</span>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {estimate ? `${estimate.kg.toLocaleString('en-IN')} kg/ha` : 'Needs local calibration'}
                    {estimate?.demo && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        Demo
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  {estimate?.demo
                    ? `Demo figure from an illustrative formula, not from measured yields for ${field.crop || 'this crop'}. It shows how the estimate will look once a calibration is set in src/utils/yieldEstimate.js.`
                    : estimate
                      ? 'Estimated from the satellite canopy with this area’s calibration.'
                      : 'The canopy values above are valid. A kg/ha figure needs a calibration for this area.'}
                </p>
              </div>
            </div>

            {/* NDVI curve behind the summary */}
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">NDVI over the season</span>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <IndexChart index={NDVI} series={season.series} selectedDate={null} onSelectDate={() => {}} />
              </div>
            </div>
          </>
        )}
        {/* Historical crop cycles of the farm, below the current yield estimate */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">Historical crop cycles</span>

          {pastSeasons.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
              No earlier crop cycles from the satellite crop history for this farm.
            </div>
          )}

          {past.status === 'loading' && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              Reading the earlier crop cycles from the satellite images...
            </div>
          )}

          {past.status === 'ready' && (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-400 bg-slate-900/80">
                    <th className="px-3 py-2 font-medium">Season</th>
                    <th className="px-3 py-2 font-medium">Crop</th>
                    <th className="px-3 py-2 font-medium">Peak NDVI</th>
                    <th className="px-3 py-2 font-medium">Est. kg/ha</th>
                  </tr>
                </thead>
                <tbody>
                  {past.rows.map((row, i) => {
                    const est = row.summary ? estimateYield(row.crop, row.summary.ndviDays) : null;
                    return (
                      <tr key={`${row.startDate}-${i}`} className="border-t border-slate-800 text-slate-300">
                        <td className="px-3 py-2">
                          <span className="block font-semibold text-white">{row.year ?? '—'}</span>
                          <span className="block font-mono text-[10px] text-slate-500">{row.startDate} to {row.endDate}</span>
                        </td>
                        <td className="px-3 py-2">{row.crop}</td>
                        <td className="px-3 py-2 font-mono">{row.summary ? row.summary.peakValue.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2 font-mono">
                          {est ? (
                            <>
                              {est.kg.toLocaleString('en-IN')}
                              {est.demo && <span className="ml-1 text-[9px] uppercase text-amber-300">demo</span>}
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {past.status === 'ready' && (
            <p className="text-[11px] text-slate-500 mt-2">
              Crops and dates come from the ALU crop history. Yield figures are demo estimates, as above.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
