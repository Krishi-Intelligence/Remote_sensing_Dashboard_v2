// Suggests the next crop for a farm from the crops of its previous seasons (oldest first).
// Each rule adds or removes points with a reason the farmer can read. The point values
// should be checked by agronomists for the region before they are relied on.

// Crops the ALU can predict. "Unknown" is never suggested.
export const SEASON_CROPS = ['Rice', 'Wheat', 'Maize', 'Mustard', 'Soybean', 'Cotton', 'Sugarcane', 'Gram', 'Bajra', 'Groundnut', 'Jowar', 'Chilli'];

const CEREALS = ['Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar'];
const LEGUMES = ['Gram', 'Soybean', 'Groundnut'];
const HEAVY_FEEDERS = ['Rice', 'Maize', 'Cotton', 'Sugarcane'];
const LIGHT_CROPS = ['Mustard', 'Gram', 'Bajra', 'Jowar'];
const LONG_RECOVERY = ['Sugarcane', 'Cotton'];
const PEST_HEAVY = ['Cotton', 'Chilli'];

// A top score below this is shown as a weak match
const STRONG_SCORE = 10;

const RULES = [
  {
    points: -40,
    reason: 'Same crop as the last season',
    applies: (crop, ctx) => crop === ctx.last
  },
  {
    points: -15,
    reason: 'Grown in an earlier season of the last three',
    applies: (crop, ctx) => ctx.history.includes(crop) && crop !== ctx.last
  },
  {
    points: 20,
    reason: 'No legume recently; legumes add nitrogen to the soil',
    applies: (crop, ctx) => !ctx.history.some(h => LEGUMES.includes(h)) && LEGUMES.includes(crop)
  },
  {
    points: 20,
    reason: 'Only cereals recently; a legume or mustard breaks the cycle',
    applies: (crop, ctx) => ctx.allCereals && (LEGUMES.includes(crop) || crop === 'Mustard')
  },
  {
    points: 15,
    reason: 'Heavy feeders recently; a lighter crop lets the soil recover',
    applies: (crop, ctx) => ctx.heavyCount >= 2 && LIGHT_CROPS.includes(crop)
  },
  {
    points: -20,
    reason: 'Heavy feeder right after sugarcane or cotton',
    applies: (crop, ctx) => LONG_RECOVERY.includes(ctx.last) && HEAVY_FEEDERS.includes(crop)
  },
  {
    points: -20,
    reason: 'Pest-heavy crop grown recently (cotton or chilli)',
    applies: (crop, ctx) => PEST_HEAVY.includes(crop) && ctx.history.some(h => PEST_HEAVY.includes(h))
  },
  {
    points: 10,
    reason: 'After rice, mustard or gram breaks the rice cycle',
    applies: (crop, ctx) => ctx.last === 'Rice' && (crop === 'Mustard' || crop === 'Gram')
  }
];

// Verdict cut-offs on the 0-100 crop cycle score
const SUSTAINABLE_SCORE = 70;
const PARTLY_SCORE = 40;

/**
 * Judges the crop cycle itself: is the way this farm has been cropped sustainable?
 * previousCrops: crop names of the previous seasons, oldest first ("Unknown" is left out).
 * Each check passes or takes points off a score of 100. Needs at least two known seasons.
 */
export function assessRotation(previousCrops) {
  // Unknown seasons stay in place as gaps, so two crops either side of a gap are not back-to-back
  const sequence = previousCrops.map(c => (SEASON_CROPS.includes(c) ? c : null));
  const history = sequence.filter(Boolean);
  if (history.length < 2) {
    return { basedOn: history.length, score: null, verdict: null, checks: [] };
  }

  const count = (group) => history.filter(c => group.includes(c)).length;
  const backToBack = sequence.slice(1).some((c, i) => c && c === sequence[i]);
  const allSame = history.length === sequence.length && history.every(c => c === history[0]);

  const checks = [
    allSame
      ? { ok: false, points: -40, label: 'Crop rotation', detail: `${history[0]} every season (monoculture)` }
      : backToBack
        ? { ok: false, points: -25, label: 'Crop rotation', detail: 'Same crop in back-to-back seasons' }
        : { ok: true, points: 0, label: 'Crop rotation', detail: 'The crop changes every season' },
    count(LEGUMES) > 0
      ? { ok: true, points: 0, label: 'Legume in the cycle', detail: 'A legume restores soil nitrogen' }
      : { ok: false, points: -20, label: 'Legume in the cycle', detail: 'No gram, soybean or groundnut to restore soil nitrogen' },
    history.every(c => CEREALS.includes(c))
      ? { ok: false, points: -15, label: 'Crop diversity', detail: 'Only cereals grown' }
      : { ok: true, points: 0, label: 'Crop diversity', detail: 'A mix of crop types' },
    count(HEAVY_FEEDERS) >= 2
      ? { ok: false, points: -15, label: 'Soil nutrient load', detail: 'Two or more heavy feeders (rice, maize, cotton, sugarcane)' }
      : { ok: true, points: 0, label: 'Soil nutrient load', detail: 'Nutrient demand is balanced' },
    count(PEST_HEAVY) >= 2
      ? { ok: false, points: -15, label: 'Pest and disease build-up', detail: 'Cotton or chilli in more than one season' }
      : { ok: true, points: 0, label: 'Pest and disease build-up', detail: 'No repeated pest-heavy crop' },
    history.filter(c => c === 'Rice').length >= 2
      ? { ok: false, points: -10, label: 'Water use', detail: 'Rice in more than one season uses a lot of water' }
      : { ok: true, points: 0, label: 'Water use', detail: 'No repeated rice' }
  ];

  const score = Math.max(0, 100 + checks.reduce((sum, c) => sum + c.points, 0));
  const verdict = score >= SUSTAINABLE_SCORE ? 'sustainable' : score >= PARTLY_SCORE ? 'partly' : 'not';
  return { basedOn: history.length, score, verdict, checks };
}

/**
 * previousCrops: crop names of the previous seasons, oldest first ("Unknown" allowed).
 * Returns the number of known seasons used, the top three crops with their reasons,
 * and whether the top score is strong enough to recommend.
 */
export function recommendNextCrops(previousCrops) {
  const known = previousCrops.map(c => (SEASON_CROPS.includes(c) ? c : null));
  const history = known.filter(Boolean);
  if (history.length === 0) {
    return { basedOn: 0, suggestions: [], strong: false };
  }

  const ctx = {
    last: known[known.length - 1],
    history,
    allCereals: history.every(c => CEREALS.includes(c)),
    heavyCount: history.filter(c => HEAVY_FEEDERS.includes(c)).length
  };

  const suggestions = SEASON_CROPS
    .map(crop => {
      const reasons = RULES
        .filter(rule => rule.applies(crop, ctx))
        .map(({ points, reason }) => ({ points, reason }));
      return { crop, score: reasons.reduce((sum, r) => sum + r.points, 0), reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { basedOn: history.length, suggestions, strong: suggestions[0].score >= STRONG_SCORE };
}
