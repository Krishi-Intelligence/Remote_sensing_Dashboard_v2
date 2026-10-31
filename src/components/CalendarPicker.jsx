import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIso(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Colour a date by farm cloud cover: clear, partly cloudy, cloudy
function cloudTone(farmCloud) {
  if (farmCloud === null || farmCloud === undefined) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200';
  if (farmCloud < 10) return 'bg-emerald-500/30 border-emerald-400 text-white';
  if (farmCloud < 40) return 'bg-amber-500/20 border-amber-400/60 text-amber-100';
  return 'bg-rose-500/15 border-rose-400/50 text-rose-200';
}

/**
 * Month calendar showing which days have a Sentinel-2 scene over the farm.
 * availableDates: { 'YYYY-MM-DD': { sceneCloud, farmCloud } }
 */
export default function CalendarPicker({
  viewYear,
  viewMonth,
  onChangeMonth,
  availableDates,
  selectedDate,
  onSelectDate,
  loading
}) {
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChangeMonth(-1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-white">
          {monthLabel} {loading && <span className="text-[10px] text-slate-500 font-normal">&middot; checking satellite passes...</span>}
        </span>
        <button
          onClick={() => onChangeMonth(1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(w => (
          <span key={w} className="text-[10px] text-slate-500 text-center font-medium">{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />;
          const iso = toIso(viewYear, viewMonth, day);
          const info = availableDates[iso];
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;

          if (!info) {
            return (
              <span
                key={iso}
                className={`h-9 flex items-center justify-center rounded-lg text-[11px] text-slate-600 ${isToday ? 'ring-1 ring-slate-600' : ''}`}
              >
                {day}
              </span>
            );
          }

          const cloudText = info.farmCloud === null || info.farmCloud === undefined
            ? 'cloud cover unknown'
            : `${info.farmCloud}% of farm cloudy`;

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              title={`${iso}: ${cloudText}`}
              className={`h-9 flex items-center justify-center rounded-lg border text-[11px] font-semibold transition ${cloudTone(info.farmCloud)} ${
                isSelected ? 'ring-2 ring-white' : 'hover:brightness-125'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/60" /> Clear (&lt;10% cloud)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/50" /> Partly cloudy</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/40" /> Cloudy</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-slate-600" /> No satellite pass</span>
      </div>
    </div>
  );
}
