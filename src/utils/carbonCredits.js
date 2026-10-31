/**
 * Carbon Credit Calculation Engine
 *
 * Formula: Total Credits = Area (ha) × Rate (tCO₂e/ha)
 *
 * The rate is determined by a 3-case sustainability tier system:
 *
 *   Case 1 — Sustainable     : verdict='sustainable' | ≥3 distinct crops → 1.8–2.5 tCO₂e/ha (mid 2.2) — High
 *   Case 2 — Partly Sust.    : verdict='partly'      | 2 distinct crops  → 0.8–1.2 tCO₂e/ha (mid 1.0) — Medium
 *   Case 3 — Not Sustainable : verdict='not'         | ≤1 distinct crop  → 0.1–0.3 tCO₂e/ha (mid 0.2) — Low/Ineligible
 */

// ─── 3-Case Carbon Tier definitions ──────────────────────────────────────────
// Each case maps to a SustainablePanel verdict.
// rateMid is used for the calculation; rateMin/rateMax show the range.
const CARBON_TIERS = {
  sustainable: {
    caseLabel:   'Case 1 — Sustainable',
    verdictLabel: 'Sustainable',
    rateMin:     1.8,
    rateMid:     2.2,
    rateMax:     2.5,
    quality:     'High',
    tier:        'Gold',
  },
  partly: {
    caseLabel:   'Case 2 — Partly Sustainable',
    verdictLabel: 'Partly Sustainable',
    rateMin:     0.8,
    rateMid:     1.0,
    rateMax:     1.2,
    quality:     'Medium',
    tier:        'Silver',
  },
  not: {
    caseLabel:   'Case 3 — Not Sustainable',
    verdictLabel: 'Not Sustainable',
    rateMin:     0.1,
    rateMid:     0.2,
    rateMax:     0.3,
    quality:     'Low / Ineligible',
    tier:        'Bronze',
  },
};

// ─── Unique crop count ────────────────────────────────────────────────────────
// Counts distinct, non-Unknown crops across the last 3 seasons
function uniqueCropCount(cropHistory) {
  const known = cropHistory.filter(c => c && c !== 'Unknown');
  return new Set(known).size;
}

// ─── Tier selector ────────────────────────────────────────────────────────────
// Primary driver: number of distinct crops grown in last 3 seasons.
// The sustainability verdict from assessRotation() acts as confirmation.
function getCarbonTier(verdict, uniqueCrops) {
  if (uniqueCrops >= 3 || verdict === 'sustainable') return CARBON_TIERS.sustainable;
  if (uniqueCrops === 2 || verdict === 'partly')     return CARBON_TIERS.partly;
  return CARBON_TIERS.not;
}

/**
 * Calculate carbon credits for a field.
 *
 * @param {object} params
 * @param {number}   params.areaHectares   - Field area in hectares
 * @param {string}   params.crop           - Current crop being grown (kept for display)
 * @param {string}   params.verdict        - 'sustainable' | 'partly' | 'not' | null
 * @param {number}   params.sustainScore   - 0–100 sustainability score (for display)
 * @param {string[]} params.cropHistory    - Last 3 crop names, oldest first
 *
 * @returns {object} Full carbon credit report
 */
export function calculateCarbonCredits({ areaHectares, crop, verdict, sustainScore, cropHistory = [] }) {
  const area       = areaHectares || 0;
  const uniqueCrops = uniqueCropCount(cropHistory);
  const tierDef    = getCarbonTier(verdict, uniqueCrops);

  const effectiveRate   = tierDef.rateMid;
  const totalCredits    = +(area * effectiveRate).toFixed(3);

  // Estimated market value (₹ per tCO₂e — VERRA/Gold Standard India range)
  const pricePerTonne  = 800;  // ₹800/tCO₂e (~$10 USD, conservative)
  const estimatedValue = +(totalCredits * pricePerTonne).toFixed(0);

  // Minimum area needed to earn 1 credit at this tier's rate
  const minAreaForOneCredit = +(1 / effectiveRate).toFixed(2);

  // Breakdown rows for the classification panel
  const breakdown = [
    {
      label: 'Sustainability Rating',
      value: tierDef.verdictLabel,
      note:  sustainScore != null ? `Score ${sustainScore}/100` : null,
    },
    {
      label: 'Unique Crops',
      value: `${uniqueCrops} distinct crop${uniqueCrops !== 1 ? 's' : ''} in last 3 seasons`,
      note:  uniqueCrops >= 3
        ? '3 distinct crops → full rotation diversity'
        : uniqueCrops === 2
        ? '2 distinct crops → partial rotation'
        : 'Single crop / monoculture detected',
    },
    {
      label: 'Case Assigned',
      value: tierDef.caseLabel,
      note:  null,
    },
    {
      label: 'Carbon Rate',
      value: `${tierDef.rateMid} tCO₂e/ha`,
      note:  `Range: ${tierDef.rateMin}–${tierDef.rateMax} tCO₂e/ha`,
    },
    {
      label: 'Credit Quality',
      value: tierDef.quality,
      note:  null,
    },
  ];

  return {
    areaHectares:        area,
    uniqueCrops,
    effectiveRate,
    rateMin:             tierDef.rateMin,
    rateMax:             tierDef.rateMax,
    totalCredits,
    pricePerTonne,
    estimatedValue,
    minAreaForOneCredit,
    tier:                tierDef.tier,
    quality:             tierDef.quality,
    verdictLabel:        tierDef.verdictLabel,
    caseLabel:           tierDef.caseLabel,
    breakdown,
    // Kept for "How to Earn More" tips
    factors: { uniqueCrops, verdict },
  };
}
