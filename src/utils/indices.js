// Spectral indices shown in Crop Health Monitoring. The ids match server/ee_server.py (INDEX_IDS).
// bands: lower bound of each reading band, in ascending order. A value gets the last band whose
// lower bound it reaches. Bands are general guides for crops; the cut-offs are approximate.
export const INDICES = [
  {
    id: 'ndvi',
    label: 'NDVI',
    name: 'Normalized Difference Vegetation Index',
    measures: 'Greenness',
    bands: [
      { from: -1, reading: 'Water, cloud or snow' },
      { from: 0, reading: 'Bare soil' },
      { from: 0.2, reading: 'Sparse or young crop' },
      { from: 0.4, reading: 'Moderate growth' },
      { from: 0.6, reading: 'Dense, healthy canopy' }
    ],
    note: 'Higher means greener. A fall during the season can signal stress or harvest.'
  },
  {
    id: 'ndwi',
    label: 'NDWI',
    name: 'Normalized Difference Water Index (McFeeters)',
    measures: 'Open water and leaf water',
    bands: [
      { from: -1, reading: 'Land: vegetation or soil' },
      { from: 0, reading: 'Wet canopy or shallow water' },
      { from: 0.3, reading: 'Open water' }
    ],
    note: 'For cropland it is usually negative. Values moving toward 0 can mean wetter canopy or standing water.'
  },
  {
    id: 'savi',
    label: 'SAVI',
    name: 'Soil-Adjusted Vegetation Index',
    measures: 'Vegetation where soil shows through',
    bands: [
      { from: -1, reading: 'Very little cover' },
      { from: 0.1, reading: 'Bare soil' },
      { from: 0.2, reading: 'Sparse cover' },
      { from: 0.4, reading: 'Moderate cover' },
      { from: 0.6, reading: 'Dense crop' }
    ],
    note: 'Like NDVI, but less affected by soil brightness early in the season.'
  },
  {
    id: 'evi',
    label: 'EVI',
    name: 'Enhanced Vegetation Index',
    measures: 'Vegetation in dense canopy',
    bands: [
      { from: -1, reading: 'Sparse or stressed' },
      { from: 0.2, reading: 'Growing crop' },
      { from: 0.6, reading: 'Dense, peak canopy' }
    ],
    note: 'Keeps rising where NDVI flattens out, so it helps in dense crops.'
  },
  {
    id: 'ndmi',
    label: 'NDMI',
    name: 'Normalized Difference Moisture Index',
    measures: 'Moisture in the canopy',
    bands: [
      { from: -1, reading: 'Canopy drying out' },
      { from: 0, reading: 'Near zero, watch' },
      { from: 0.2, reading: 'Well-watered' }
    ],
    note: 'Falling values through a dry spell can flag water stress before it shows in NDVI.'
  }
];

export function indexById(id) {
  return INDICES.find(i => i.id === id) || INDICES[0];
}

// Reading for a value, e.g. NDVI 0.65 -> "Dense, healthy canopy". Null when there is no value.
export function readingOf(index, value) {
  if (value === null || value === undefined) return null;
  let band = index.bands[0];
  for (const b of index.bands) {
    if (value >= b.from) band = b;
  }
  return band.reading;
}

// Value range of each band, e.g. "0.2 to 0.4", "below 0", "0.6 and above"
export function bandRanges(index) {
  return index.bands.map((band, i) => {
    const next = index.bands[i + 1];
    if (i === 0) return `below ${next.from}`;
    if (!next) return `${band.from} and above`;
    return `${band.from} to ${next.from}`;
  });
}
