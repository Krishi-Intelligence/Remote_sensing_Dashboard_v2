import React, { useEffect, useState } from 'react';
import { X, Layers, Map as MapIcon, Download } from 'lucide-react';
import CalendarPicker from './CalendarPicker';
import { fetchScenes, fetchAnalysis, fetchRgb, fetchIndexSeries } from '../utils/eeClient';
import IndexChart from './IndexChart';
import { INDICES, indexById, readingOf, bandRanges } from '../utils/indices';

function toMonthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// Add days to a YYYY-MM-DD date
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Index value with two decimals, or a dash when the farm has no clear pixels
function formatIndex(v) {
  return v === null || v === undefined ? '—' : v.toFixed(2);
}

function Metric({ label, value, unit }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
      <span className="text-[10px] text-slate-400 block uppercase font-medium">{label}</span>
      <span className="text-sm font-bold text-emerald-400 font-mono">
        {value} {unit && <span className="text-[10px] font-normal text-slate-400">{unit}</span>}
      </span>
    </div>
  );
}

export default function FarmAnalysisPanel({ field, rgbLayer, onShowRgb, onClose }) {
  const now = new Date();
  const todayKey = toMonthKey(now.getFullYear(), now.getMonth());
  // The calendar stays inside the season entered for the farm, and never goes past today
  const firstKey = field.startDate ? field.startDate.slice(0, 7) : '0000-01';
  const lastKey = [field.endDate ? field.endDate.slice(0, 7) : null, todayKey].filter(Boolean).sort()[0];
  const initialKey = todayKey < firstKey ? firstKey : todayKey > lastKey ? lastKey : todayKey;
  const [viewYear, setViewYear] = useState(Number(initialKey.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(initialKey.slice(5, 7)) - 1);
  // Satellite dates per month: { 'YYYY-MM': { status, dates, error } }
  const [scenesByMonth, setScenesByMonth] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);

  // NDVI and cloud cover for the selected date
  const [analysis, setAnalysis] = useState({ status: 'idle' });

  // RGB image and GeoTIFF link for the selected date
  const [rgb, setRgb] = useState({ status: 'idle' });
  const [rgbOn, setRgbOn] = useState(false);

  const monthKey = toMonthKey(viewYear, viewMonth);
  const monthScenes = scenesByMonth[monthKey];

  // Load the Sentinel-2 dates for the visible month
  useEffect(() => {
    if (scenesByMonth[monthKey]) return;

    // Fetch only inside this month and inside the season (the season end date is included)
    const monthStart = `${monthKey}-01`;
    const nextMonth = new Date(viewYear, viewMonth + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const start = field.startDate && field.startDate > monthStart ? field.startDate : monthStart;
    const end = field.endDate && addDays(field.endDate, 1) < monthEnd ? addDays(field.endDate, 1) : monthEnd;

    setScenesByMonth(prev => ({ ...prev, [monthKey]: { status: 'loading' } }));
    fetchScenes(field, start, end)
      .then(res => {
        const dates = {};
        res.scenes.forEach(s => { dates[s.date] = { sceneCloud: s.sceneCloud, farmCloud: s.farmCloud }; });
        setScenesByMonth(prev => ({ ...prev, [monthKey]: { status: 'ready', dates } }));
        // Open the most recent available date when nothing is selected yet
        const latest = res.scenes.length ? res.scenes[res.scenes.length - 1].date : null;
        if (latest) setSelectedDate(prev => prev ?? latest);
      })
      .catch(err => {
        setScenesByMonth(prev => ({ ...prev, [monthKey]: { status: 'error', error: err.message } }));
      });
  }, [field, monthKey, viewYear, viewMonth, scenesByMonth]);

  // Load NDVI for the selected date
  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setAnalysis({ status: 'loading' });
    fetchAnalysis(field, selectedDate)
      .then(data => { if (!cancelled) setAnalysis({ status: 'ready', data }); })
      .catch(err => { if (!cancelled) setAnalysis({ status: 'error', error: err.message }); });
    return () => { cancelled = true; };
  }, [field, selectedDate]);

  // Load the RGB tile for a date and show it on the map
  const loadRgb = (date) => {
    setRgb({ status: 'loading' });
    fetchRgb(field, date)
      .then(data => {
        setRgb({ status: 'ready', data });
        onShowRgb({ fieldId: field.id, date, tileUrl: data.tileUrl });
      })
      .catch(err => {
        setRgb({ status: 'error', error: err.message });
        setRgbOn(false);
      });
  };

  // Get the GeoTIFF download link for the selected date (does not change the map)
  const prepareDownload = () => {
    setRgb({ status: 'loading' });
    fetchRgb(field, selectedDate)
      .then(data => setRgb({ status: 'ready', data }))
      .catch(err => setRgb({ status: 'error', error: err.message }));
  };

  // Show or hide the RGB image on the map
  const toggleRgb = () => {
    if (rgbOn) {
      setRgbOn(false);
      onShowRgb(null);
      return;
    }
    setRgbOn(true);
    loadRgb(selectedDate);
  };

  // Keep the RGB image on the chosen date; otherwise drop the previous date's image and link
  useEffect(() => {
    if (rgbOn && selectedDate) {
      loadRgb(selectedDate);
    } else {
      setRgb({ status: 'idle' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Clear the map layer when the panel closes
  useEffect(() => {
    return () => onShowRgb(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One index for every acquisition date inside the season entered for the farm
  const [indexId, setIndexId] = useState('ndvi');
  const current = indexById(indexId);
  const [trend, setTrend] = useState({ status: 'idle' });
  const hasSeason = Boolean(field.startDate && field.endDate);
  useEffect(() => {
    if (!hasSeason) {
      setTrend({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setTrend({ status: 'loading' });
    fetchIndexSeries(field, indexId, field.startDate, field.endDate)
      .then(data => { if (!cancelled) setTrend({ status: 'ready', series: data.series }); })
      .catch(err => { if (!cancelled) setTrend({ status: 'error', error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id, field.startDate, field.endDate, hasSeason, indexId]);

  const changeMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    const nextKey = toMonthKey(next.getFullYear(), next.getMonth());
    if (nextKey < firstKey || nextKey > lastKey) return; // stay inside the season and up to today
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const downloadUrl = rgb.status === 'ready' ? rgb.data.downloadUrl : null;
  const rgbVisible = rgbOn && rgb.status === 'ready';

  return (
    <aside className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">Crop Health Monitoring</span>
          <h2 className="text-base font-bold text-white truncate">{field.name}</h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {field.farmerName || 'Farmer not entered'}{field.crop ? ` • ${field.crop}` : ''}
          </p>
          {field.startDate && field.endDate && (
            <p className="text-[11px] text-slate-400 font-mono">{field.startDate} to {field.endDate}</p>
          )}
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            {field.areaHectares.toFixed(2)} ha &bull; {field.areaAcres.toFixed(2)} ac
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Pick a Sentinel-2 date */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">Choose a satellite date</span>
          <CalendarPicker
            viewYear={viewYear}
            viewMonth={viewMonth}
            onChangeMonth={changeMonth}
            availableDates={monthScenes?.dates || {}}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            loading={monthScenes?.status === 'loading'}
          />
          {monthScenes?.status === 'error' && (
            <p className="text-[11px] text-rose-400 mt-2">Could not load satellite dates: {monthScenes.error}</p>
          )}
        </div>

        {/* 2. Indices for the selected date */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">
            Vegetation and water indices {selectedDate ? `on ${selectedDate}` : ''}
          </span>

          {!selectedDate && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700 text-xs text-slate-400">
              Select a highlighted date on the calendar to see its indices and cloud cover.
            </div>
          )}

          {selectedDate && analysis.status === 'loading' && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              Calculating indices from the satellite image...
            </div>
          )}

          {selectedDate && analysis.status === 'error' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
              {analysis.error}
            </div>
          )}

          {analysis.status === 'ready' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Farm cloud cover" value={analysis.data.farmCloud ?? '—'} unit={analysis.data.farmCloud != null ? '%' : ''} />
                <Metric label="Scene cloud cover" value={analysis.data.sceneCloud ?? '—'} unit={analysis.data.sceneCloud != null ? '%' : ''} />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Median over the farm boundary</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {INDICES.map(index => {
                    const value = analysis.data.indices?.[index.id];
                    return (
                      <div key={index.id} title={index.name} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">{index.label}</span>
                        <span className="text-lg font-bold text-emerald-400 font-mono">{formatIndex(value)}</span>
                        {readingOf(index, value) && (
                          <span className="text-[11px] text-slate-300 block mt-0.5">{readingOf(index, value)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Index trend across the season, for the window entered for the farm */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">{current.label} over the season</span>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {INDICES.map(index => (
                <button
                  key={index.id}
                  onClick={() => setIndexId(index.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    index.id === indexId ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {index.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {current.name} over the farm for each date with a usable satellite image. Click a point to open that date.
            </p>
            {/* Reading guide: what each value range means for this index */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900/80 text-[11px] text-slate-300">
                <span className="text-slate-400">Measures:</span> {current.measures}
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-400 border-t border-slate-800">
                    <th className="px-3 py-1.5 font-medium">Range</th>
                    <th className="px-3 py-1.5 font-medium">Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {current.bands.map((band, i) => {
                    const active = analysis.status === 'ready' && readingOf(current, analysis.data.indices?.[current.id]) === band.reading;
                    return (
                      <tr key={band.reading} className={`border-t border-slate-800 ${active ? 'bg-emerald-500/15 text-white' : 'text-slate-300'}`}>
                        <td className="px-3 py-1.5 font-mono">{bandRanges(current)[i]}</td>
                        <td className="px-3 py-1.5">{band.reading}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-800">{current.note}</p>
            </div>
            {!hasSeason && (
              <p className="text-xs text-slate-400">Enter the season start and end dates to see the {current.label} trend.</p>
            )}
            {hasSeason && trend.status === 'loading' && (
              <p className="text-xs text-slate-300">Calculating {current.label} for each date in the season...</p>
            )}
            {hasSeason && trend.status === 'error' && (
              <p className="text-[11px] text-rose-400">{trend.error}</p>
            )}
            {trend.status === 'ready' && trend.series.length === 0 && (
              <p className="text-xs text-slate-400">No usable satellite values in this season.</p>
            )}
            {trend.status === 'ready' && trend.series.length > 0 && (
              <IndexChart index={current} series={trend.series} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            )}
          </div>
        </div>

        {/* 3. Sentinel-2 RGB image */}
        {analysis.status === 'ready' && (
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium block mb-2">True-colour satellite image</span>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-[11px] text-slate-400 mb-3">
                True-colour image of this farm on {analysis.data.date}, shown on the map.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleRgb}
                  disabled={rgb.status === 'loading'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  {rgb.status === 'loading' ? 'Loading image...' : rgbVisible ? 'Hide RGB on map' : 'Show RGB on map'}
                </button>
                <button
                  onClick={() => (downloadUrl ? window.open(downloadUrl, '_blank') : prepareDownload())}
                  disabled={rgb.status === 'loading'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadUrl ? 'Download GeoTIFF' : 'Prepare GeoTIFF'}
                </button>
              </div>
              {rgb.status === 'error' && (
                <p className="text-[11px] text-rose-400 mt-2">{rgb.error}</p>
              )}
              {rgb.status === 'ready' && !rgb.data.downloadUrl && (
                <p className="text-[11px] text-amber-300 mt-2">
                  GeoTIFF not available: {rgb.data.downloadError || 'the farm is too large for a single download.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
