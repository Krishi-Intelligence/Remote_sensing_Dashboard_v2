import shp, { parseShp } from 'shpjs';
import * as turf from '@turf/turf';
import { SEASON_CROPS } from './sustainability';

/**
 * Calculates area, perimeter, and centroid for an array of [lat, lng] coordinates
 * @param {Array<[number, number]>} latLngs - Array of [lat, lng]
 */
export function calculatePolygonMetrics(latLngs) {
  if (!latLngs || latLngs.length < 3) {
    return {
      areaSqMeters: 0,
      areaHectares: 0,
      areaAcres: 0,
      perimeterMeters: 0,
      centroid: null
    };
  }

  // Turf expects [lng, lat] coordinates and closed ring
  const ring = latLngs.map(pt => [pt[1], pt[0]]);
  // Ensure closed ring
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([...ring[0]]);
  }

  try {
    const polygon = turf.polygon([ring]);
    const areaSqMeters = turf.area(polygon);
    const areaHectares = areaSqMeters / 10000;
    const areaAcres = areaHectares * 2.47105381;

    const line = turf.polygonToLine(polygon);
    const perimeterMeters = turf.length(line, { units: 'kilometers' }) * 1000;

    const centroidPt = turf.centroid(polygon);
    const [cLng, cLat] = centroidPt.geometry.coordinates;

    return {
      areaSqMeters: Math.round(areaSqMeters * 100) / 100,
      areaHectares: Math.round(areaHectares * 1000) / 1000,
      areaAcres: Math.round(areaAcres * 1000) / 1000,
      perimeterMeters: Math.round(perimeterMeters * 10) / 10,
      centroid: { lat: cLat, lng: cLng },
      geojson: polygon
    };
  } catch (err) {
    console.error('Error calculating polygon metrics:', err);
    return {
      areaSqMeters: 0,
      areaHectares: 0,
      areaAcres: 0,
      perimeterMeters: 0,
      centroid: null
    };
  }
}

/**
 * Convert user drawn polygons to standard FeatureCollection GeoJSON
 */
export function polygonsToGeoJSON(fields) {
  const features = fields.map((field, idx) => {
    const ring = field.coordinates.map(pt => [pt[1], pt[0]]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([...ring[0]]);
    }

    return {
      type: "Feature",
      id: field.id || `field-${idx + 1}`,
      properties: {
        id: field.id,
        name: field.name || `Field #${idx + 1}`,
        crop: field.crop || "Unspecified",
        areaHectares: field.areaHectares,
        areaAcres: field.areaAcres,
        perimeterMeters: field.perimeterMeters,
        createdAt: field.createdAt || new Date().toISOString()
      },
      geometry: {
        type: "Polygon",
        coordinates: [ring]
      }
    };
  });

  return {
    type: "FeatureCollection",
    features
  };
}

/**
 * Download object as JSON / GeoJSON file
 */
export function downloadGeoJSON(data, filename = "satellite_fields.geojson") {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/geo+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// ALU crop labels (upper case, e.g. "RICE", "CORN", "SOYBEANS") whose app name differs from the label
const ALU_CROP_NAMES = {
  CORN: 'Maize',
  SOYBEANS: 'Soybean',
  CHICKPEA: 'Gram',
  PEARL_MILLET: 'Bajra',
  SORGHUM: 'Jowar',
  PEANUT: 'Groundnut',
  PEANUTS: 'Groundnut',
  CHILI: 'Chilli'
};
const ALU_NO_CROP = ['UNKNOWN_CROP', 'UNKNOWN', 'NO_PREDICTION', 'NO PREDICTION'];

// ALU label to the app's crop name, e.g. "RICE" -> "Rice", "CORN" -> "Maize". Null when ALU names no crop.
function cropNameOf(label) {
  if (!label) return null;
  const key = label.toUpperCase();
  if (ALU_NO_CROP.includes(key)) return null;
  if (ALU_CROP_NAMES[key]) return ALU_CROP_NAMES[key];
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Predictions of a delineated field, oldest season first
function sortedPredictions(props) {
  const predictions = Array.isArray(props.monitoring_prediction) ? props.monitoring_prediction : [];
  return [...predictions].sort((a, b) => (a.start_timestamp_sec || 0) - (b.start_timestamp_sec || 0));
}

// Latest crop prediction of a delineated field, e.g. "Wheat", or null when there is none
function topCropOf(props) {
  const predictions = sortedPredictions(props);
  return cropNameOf(predictions[predictions.length - 1]?.crop_1);
}

// YYYY-MM-DD of a Unix time in seconds, or null
function isoDate(sec) {
  return sec ? new Date(sec * 1000).toISOString().slice(0, 10) : null;
}

// ALU's top-crop confidence is spread over many crops, so its values are low (median about 0.6 near Ropar)
const MIN_CROP_CONFIDENCE = 0.4;

/**
 * Every crop season ALU reports for a field, oldest first:
 * [{ crop, confidence, startDate, endDate, year, used, note }]
 * startDate and endDate are ALU's detected season (roughly sowing to harvest).
 * used is true for seasons the sustainability rules can rely on; note says why a season is not used.
 */
function cropCyclesOf(props) {
  const today = new Date().toISOString().slice(0, 10);
  return sortedPredictions(props).map(p => {
    const crop = cropNameOf(p.crop_1);
    const confidence = typeof p.conf_1 === 'number' ? p.conf_1 : null;
    const startDate = isoDate(p.start_timestamp_sec);
    const endDate = isoDate(p.end_timestamp_sec);

    let note = null;
    if (!crop) note = 'Crop not identified';
    else if (!SEASON_CROPS.includes(crop)) note = 'Not an ALU crop';
    else if ((confidence ?? 0) < MIN_CROP_CONFIDENCE) note = 'Low confidence';
    else if (!endDate || endDate > today) note = 'Season still running';

    return {
      crop: crop || 'Unknown',
      confidence,
      startDate,
      endDate,
      year: startDate ? Number(startDate.slice(0, 4)) : null,
      used: !note,
      note
    };
  });
}

// Seasons the sustainability rules use: [{ crop, year, startDate, endDate }]
function cropHistoryOf(cycles) {
  return cycles.filter(c => c.used).map(({ crop, year, startDate, endDate }) => ({ crop, year, startDate, endDate }));
}

/**
 * Find the delineated farm that contains a clicked point and return it as a field.
 * features: GeoJSON features from the Google Agricultural API. Returns null when no farm contains the point.
 */
export function delineatedFieldAt(features, lat, lng) {
  const point = turf.point([lng, lat]);
  for (const feature of features) {
    const geom = feature?.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

    const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const rings of polygons) {
      if (!turf.booleanPointInPolygon(point, turf.polygon(rings))) continue;

      // Drop the closing point and convert [lng, lat] to [lat, lng] for the map
      const points = rings[0].slice(0, -1).map(([x, y]) => [y, x]);
      const metrics = calculatePolygonMetrics(points);
      const crop = topCropOf(feature.properties || {});
      const cropCycles = cropCyclesOf(feature.properties || {});

      return {
        id: `delineated_${Date.now()}`,
        name: crop ? `Delineated Field (${crop})` : 'Delineated Field',
        crop: crop || '',
        cropCycles,
        cropHistory: cropHistoryOf(cropCycles),
        farmerName: '',
        startDate: null,
        endDate: null,
        coordinates: points,
        areaHectares: metrics.areaHectares,
        areaAcres: metrics.areaAcres,
        perimeterMeters: metrics.perimeterMeters,
        centroid: metrics.centroid,
        createdAt: new Date().toISOString()
      };
    }
  }
  return null;
}

// Closed GeoJSON polygon from [lat, lng] points
function polygonOf(latLngs) {
  const ring = latLngs.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]);
  return turf.polygon([ring]);
}

/**
 * Share (0..1) of farm A's area that also lies inside farm B. Both are [lat, lng] point lists.
 * Checks that the ALU field found at a farm's centre is really that farm. Null if it cannot be computed.
 */
export function overlapShare(coordsA, coordsB) {
  try {
    const a = polygonOf(coordsA);
    const shared = turf.intersect(turf.featureCollection([a, polygonOf(coordsB)]));
    return shared ? turf.area(shared) / turf.area(a) : 0;
  } catch {
    return null;
  }
}

/**
 * Read a zipped shapefile (.zip with .shp/.dbf) or a GeoJSON file (.json / .geojson)
 * and return field objects in the same shape as drawn fields.
 * Coordinates must be WGS84 (longitude / latitude).
 */
export async function parseFarmFile(file) {
  const isJson = /\.(geojson|json)$/i.test(file.name);
  const isShp = /\.shp$/i.test(file.name);
  let features = [];

  if (isShp) {
    // A bare .shp holds only the geometry, so farms get default names
    const geometries = parseShp(await file.arrayBuffer());
    features = geometries.map(geometry => ({ type: 'Feature', geometry, properties: {} }));
  } else if (isJson) {
    const data = JSON.parse(await file.text());
    features = data.type === 'FeatureCollection' ? data.features : [data];
  } else {
    const result = await shp(await file.arrayBuffer());
    const collections = Array.isArray(result) ? result : [result];
    features = collections.flatMap(c => c.features);
  }

  const fields = [];
  features.forEach((feature, idx) => {
    const geom = feature?.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return;

    // Use the outer ring of the first polygon (MultiPolygon takes its first part)
    const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
    const isWgs84 = ring.every(([lng, lat]) => Math.abs(lng) <= 180 && Math.abs(lat) <= 90);
    if (!isWgs84) {
      throw new Error('Coordinates are not in WGS84 (lat/lng). Re-export the shapefile in EPSG:4326.');
    }

    // Drop the closing point and convert [lng, lat] to [lat, lng] for the map
    const points = ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
    if (points.length < 3) return;

    const metrics = calculatePolygonMetrics(points);
    const props = feature.properties || {};
    const label = Object.values(props).find(v => typeof v === 'string' && v.trim()) || `Field #${idx + 1}`;

    fields.push({
      id: `upload_${Date.now()}_${idx}`,
      name: label.trim(),
      coordinates: points,
      areaHectares: metrics.areaHectares,
      areaAcres: metrics.areaAcres,
      perimeterMeters: metrics.perimeterMeters,
      centroid: metrics.centroid,
      createdAt: new Date().toISOString()
    });
  });

  return fields;
}

