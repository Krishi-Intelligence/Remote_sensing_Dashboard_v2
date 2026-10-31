// Below this share of overlap, the ALU field at the farm centre may be a different field
const LOW_OVERLAP = 0.6;

/**
 * What the ALU lookup at the centre of a drawn or uploaded farm found, as { tone, text }.
 * tone is a Tailwind text colour class. Null for farms picked by clicking, which come from ALU directly.
 */
export function aluMessage(farm) {
  switch (farm?.aluStatus) {
    case 'loading':
      return { tone: 'text-slate-300', text: 'Fetching the crop history from ALU at the farm centre...' };
    case 'found': {
      const seasons = farm.cropHistory?.length || 0;
      const low = typeof farm.aluOverlap === 'number' && farm.aluOverlap < LOW_OVERLAP;
      return {
        tone: low ? 'text-amber-300' : 'text-emerald-300',
        text: `ALU crop history found: ${seasons} earlier ${seasons === 1 ? 'season' : 'seasons'}`
          + `${farm.aluCrop ? `, current crop ${farm.aluCrop}` : ''}.`
          + (low
            ? ` ALU's field covers only ${Math.round(farm.aluOverlap * 100)}% of this boundary, so the history may belong to a neighbouring field.`
            : '')
      };
    }
    case 'none':
      return { tone: 'text-slate-400', text: 'No ALU field at the farm centre, so there is no crop history for this farm.' };
    case 'error':
      return { tone: 'text-rose-300', text: `Could not fetch the ALU crop history: ${farm.aluError}` };
    default:
      return null;
  }
}
