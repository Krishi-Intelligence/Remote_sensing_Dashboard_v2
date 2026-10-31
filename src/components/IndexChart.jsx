import React, { useState } from 'react';
import { readingOf } from '../utils/indices';

const WIDTH = 360;
const HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
const Y_STEP = 0.2;
const X_TICK_COUNT = 4;

// Single series: one sequential hue (emerald), recessive grid, no legend needed
const LINE = '#34d399';
const GRID = '#334155';
const INK = '#94a3b8';
const SURFACE = '#0f172a';

function dateLabel(isoOrMs) {
  const iso = typeof isoOrMs === 'number' ? new Date(isoOrMs).toISOString().slice(0, 10) : isoOrMs;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

// Smooth curve through the points (Catmull-Rom as cubic Bezier). Control points stay inside the plot.
function smoothPath(points, clampY) {
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Time series of one index over the season. Hover shows the value, click picks that date.
export default function IndexChart({ index, series, selectedDate, onSelectDate }) {
  const [hover, setHover] = useState(null);
  const label = index.label;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const first = Date.parse(`${series[0].date}T00:00:00Z`);
  const last = Date.parse(`${series[series.length - 1].date}T00:00:00Z`);
  const span = Math.max(last - first, 1);

  // Y axis in fixed steps of 0.2, covering the data (NDWI and NDMI can go below 0)
  const values = series.map(p => p.value);
  const yMin = Math.floor(Math.min(0, ...values) / Y_STEP) * Y_STEP;
  const yMax = Math.ceil(Math.max(1, ...values) / Y_STEP) * Y_STEP;
  const yTicks = [];
  for (let v = yMin; v <= yMax + 1e-9; v += Y_STEP) yTicks.push(Math.round(v * 10) / 10);

  const xOf = (t) => PAD.left + ((t - first) / span) * plotW;
  const yOf = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const clampY = (y) => Math.min(Math.max(y, PAD.top), PAD.top + plotH);

  const points = series.map(p => {
    const t = Date.parse(`${p.date}T00:00:00Z`);
    return { ...p, t, x: xOf(t), y: yOf(p.value) };
  });
  const path = points.length > 2
    ? smoothPath(points, clampY)
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // X labels at evenly spaced times across the season, so the spacing is uniform
  const xTicks = Array.from({ length: X_TICK_COUNT }, (_, k) => first + (span * k) / (X_TICK_COUNT - 1));

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(points[nearest].x - px)) nearest = i;
    });
    setHover(nearest);
  };

  const shown = hover !== null ? points[hover] : points.find(p => p.date === selectedDate) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 min-h-[16px]">
        <span className="text-[11px] text-slate-300 font-mono">
          {shown
            ? `${dateLabel(shown.date)} • ${label} ${shown.value.toFixed(2)} • ${readingOf(index, shown.value)}`
            : `Hover a point to see its ${label} and reading`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto cursor-pointer"
        role="img"
        aria-label={`${label} over the season`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={() => hover !== null && onSelectDate(points[hover].date)}
      >
        {/* Recessive grid and y labels, one decimal everywhere */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 6} y={yOf(t) + 3} textAnchor="end" fontSize="10" fill={INK}>{t.toFixed(1)}</text>
          </g>
        ))}

        {/* X labels at uniform time intervals */}
        {xTicks.map((t, k) => (
          <text
            key={t}
            x={xOf(t)}
            y={HEIGHT - 8}
            textAnchor={k === 0 ? 'start' : k === xTicks.length - 1 ? 'end' : 'middle'}
            fontSize="10"
            fill={INK}
          >
            {dateLabel(t)}
          </text>
        ))}

        {/* Smoothed line, markers at the real dates, and the selected date */}
        <path d={path} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => {
          const active = i === hover || p.date === selectedDate;
          return (
            <circle
              key={p.date}
              cx={p.x}
              cy={p.y}
              r={active ? 5 : 4}
              fill={p.date === selectedDate ? LINE : SURFACE}
              stroke={LINE}
              strokeWidth="2"
            />
          );
        })}

        {/* Hit area covers the whole plot, so hovering is easier than the marker itself */}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" />
      </svg>
    </div>
  );
}
