import { INDICES, readingOf } from './indices';

const DAY_MS = 86400000;
const NDVI = INDICES.find(i => i.id === 'ndvi');

// Yield calibration per crop: estimated yield (kg/ha) = intercept + slope * NDVI-days.
// Empty until measured yields from this area are fitted to the satellite values. Example entry:
//   wheat: { intercept: 1200, slope: 8.5 }
// Without an entry the panel shows the canopy strength only, and no kg/ha figure.
export const YIELD_CALIBRATION = {};

// Canopy summary of one season from its NDVI series [{ date: 'YYYY-MM-DD', value }], sorted by date.
// NDVI-days is the area under the NDVI curve (trapezoid rule), a measure of how much green the crop carried.
export function canopySummary(series) {
  if (!series || series.length === 0) return null;

  let peak = series[0];
  let ndviDays = 0;
  for (let i = 0; i < series.length; i++) {
    if (series[i].value > peak.value) peak = series[i];
    if (i > 0) {
      const days = (Date.parse(series[i].date) - Date.parse(series[i - 1].date)) / DAY_MS;
      ndviDays += ((series[i - 1].value + series[i].value) / 2) * days;
    }
  }

  return {
    images: series.length,
    peakValue: peak.value,
    peakDate: peak.date,
    peakReading: readingOf(NDVI, peak.value),
    ndviDays: Math.round(ndviDays * 10) / 10
  };
}

// Demo formula for crops without a calibration. Illustrative only: it is not fitted to measured yields
// and is labelled as a demo wherever it is shown.
export const DEMO_YIELD_MODEL = { intercept: 1500, slope: 50 };

// Estimated yield in kg/ha. demo is true when the demo formula was used instead of a calibration.
export function estimateYield(crop, ndviDays) {
  const calibrated = YIELD_CALIBRATION[(crop || '').toLowerCase()];
  const model = calibrated || DEMO_YIELD_MODEL;
  return {
    kg: Math.round(model.intercept + model.slope * ndviDays),
    demo: !calibrated
  };
}
