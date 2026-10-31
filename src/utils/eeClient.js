/**
 * Calls the Google Earth Engine service (server/ee_server.py).
 * Fields store coordinates as [lat, lng]; the service expects [lng, lat].
 */

function toRing(field) {
  return field.coordinates.map(([lat, lng]) => [lng, lat]);
}

async function post(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Vite returns a non-JSON 500/502/504 when the Earth Engine service is not running
    if (!data) {
      throw new Error('Earth Engine service is not reachable on port 5001. Start server/ee_server.py and try again.');
    }
    throw new Error(data.error || `Earth Engine service returned ${response.status}`);
  }
  return data;
}

// Dates with Sentinel-2 coverage of the farm between startDate and endDate (YYYY-MM-DD)
export function fetchScenes(field, startDate, endDate) {
  return post('/api/scenes', { coordinates: toRing(field), startDate, endDate });
}

// Spectral indices and cloud cover of the farm for one date
export function fetchAnalysis(field, date) {
  return post('/api/analysis', { coordinates: toRing(field), date });
}

// Median value of one index (ndvi, ndwi, savi, evi, ndmi) of the farm for each Sentinel-2 date between startDate and endDate (YYYY-MM-DD)
export function fetchIndexSeries(field, index, startDate, endDate) {
  return post('/api/index-series', { coordinates: toRing(field), index, startDate, endDate });
}

// RGB map tile URL and GeoTIFF download URL for one date
export function fetchRgb(field, date) {
  return post('/api/rgb', { coordinates: toRing(field), date });
}

// Delineated farm boundaries (GeoJSON features) around a clicked point, from the Google Agricultural API
export function fetchDelineation(lat, lng) {
  return post('/api/delineate', { latitude: lat, longitude: lng });
}
