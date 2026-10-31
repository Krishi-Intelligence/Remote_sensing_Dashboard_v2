import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sprout, X } from 'lucide-react';
import { SEASON_CROPS } from '../utils/sustainability';
import { aluMessage } from '../utils/aluStatus';

// Crop suggestions are the crops the ALU can classify
const CROP_SUGGESTIONS = SEASON_CROPS;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (year, monthIndex, day) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

// Readable date for the button, e.g. "03 Jun 2026"
function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Month grid: click a day to pick it. Days after max, or before min, cannot be picked.
function MiniCalendar({ value, min, max, onPick }) {
  const seed = value || max;
  const [view, setView] = useState({ year: Number(seed.slice(0, 4)), month: Number(seed.slice(5, 7)) - 1 });

  const monthKey = `${view.year}-${pad(view.month + 1)}`;
  const canPrev = !min || monthKey > min.slice(0, 7);
  const canNext = monthKey < max.slice(0, 7);
  const shift = (delta) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-white">{monthName}</span>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(d => (
          <span key={d} className="text-center text-[10px] text-slate-500 font-medium">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`pad-${i}`} />;
          const iso = isoOf(view.year, view.month, day);
          const disabled = iso > max || (min && iso < min);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onPick(iso)}
              className={`h-8 rounded-lg text-xs font-mono transition ${
                selected
                  ? 'bg-emerald-600 text-white font-semibold'
                  : disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Button that shows the chosen date and opens the calendar below
function DateButton({ label, value, active, onClick }) {
  return (
    <div>
      <span className="text-[11px] text-slate-400 uppercase font-medium block mb-1">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-sm text-left font-mono transition ${
          active ? 'border-emerald-500 text-white' : 'border-slate-700 text-slate-200 hover:border-slate-500'
        }`}
      >
        {value ? formatDate(value) : <span className="text-slate-500">Select date</span>}
      </button>
    </div>
  );
}

// Farmer name, crop and season, entered in the left panel after the farm boundary is obtained
export default function FarmDetailsForm({ farm, queueLabel, onSubmit, onCancel }) {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  // Crop is pre-filled when the farm came from the Google Agricultural API
  const [form, setForm] = useState({ farmerName: '', crop: farm?.crop || '', startDate: '', endDate: '' });
  const [openField, setOpenField] = useState(null); // 'startDate' | 'endDate' | null
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  // The ALU crop can arrive after the form opens; fill it only if the farmer has not typed a crop
  useEffect(() => {
    if (farm?.crop) setForm(prev => (prev.crop ? prev : { ...prev, crop: farm.crop }));
  }, [farm?.crop]);

  const alu = aluMessage(farm);

  const pickDate = (iso) => {
    setForm(prev => ({ ...prev, [openField]: iso }));
    setOpenField(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.farmerName.trim()) {
      setError('Enter the farmer name.');
      return;
    }
    if (!form.crop.trim()) {
      setError('Enter the crop being grown.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Select the start and end date of the season.');
      return;
    }
    if (form.startDate > form.endDate) {
      setError('The end date must be after the start date.');
      return;
    }
    onSubmit({
      farmerName: form.farmerName.trim(),
      crop: form.crop.trim(),
      startDate: form.startDate,
      endDate: form.endDate
    });
  };

  const inputClass = 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500';

  return (
    <form onSubmit={handleSubmit} className="w-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-xl shadow-black/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Farm details</h2>
            <p className="text-[11px] text-slate-400">
              {farm ? `${farm.areaHectares.toFixed(2)} ha boundary ready.` : 'Enter the farm details.'}
              {queueLabel ? ` ${queueLabel}.` : ''}
            </p>
          </div>
        </div>
        <button type="button" onClick={onCancel} title="Discard this boundary" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {alu && <p className={`text-[11px] leading-relaxed ${alu.tone}`}>{alu.text}</p>}

      <label className="block">
        <span className="text-[11px] text-slate-400 uppercase font-medium block mb-1">Farmer name</span>
        <input type="text" value={form.farmerName} onChange={update('farmerName')} className={inputClass} placeholder="e.g. Harpreet Singh" autoFocus />
      </label>

      <label className="block">
        <span className="text-[11px] text-slate-400 uppercase font-medium block mb-1">Crop</span>
        <input type="text" list="crop-suggestions" value={form.crop} onChange={update('crop')} className={inputClass} placeholder="e.g. Wheat" />
        <datalist id="crop-suggestions">
          {CROP_SUGGESTIONS.map(c => <option key={c} value={c} />)}
        </datalist>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <DateButton
          label="Season start"
          value={form.startDate}
          active={openField === 'startDate'}
          onClick={() => setOpenField(openField === 'startDate' ? null : 'startDate')}
        />
        <DateButton
          label="Season end"
          value={form.endDate}
          active={openField === 'endDate'}
          onClick={() => setOpenField(openField === 'endDate' ? null : 'endDate')}
        />
      </div>

      {/* Calendar for the date being picked; the end date cannot be before the start date */}
      {openField && (
        <MiniCalendar
          key={openField}
          value={form[openField]}
          min={openField === 'endDate' && form.startDate ? form.startDate : undefined}
          max={today}
          onPick={pickDate}
        />
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold transition">
          Save farm
        </button>
      </div>
    </form>
  );
}
