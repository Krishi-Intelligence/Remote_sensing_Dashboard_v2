"""
Google Earth Engine service for the Remote Sensing Dashboard.

Endpoints (all POST, JSON body with `coordinates` = outer ring as [[lng, lat], ...]):

  /api/scenes    startDate, endDate  -> Sentinel-2 dates in a window, with cloud cover
  /api/analysis  date                -> NDVI for one date
  /api/rgb       date                -> RGB map tile URL and GeoTIFF download URL for one date
  /api/index-series startDate, endDate, index -> median value of one index for each date in a window

Run it from the project folder. Give it the service account JSON either as text or as a file:
    $env:GEE_PRIVATE_KEY = '<the full service account JSON>'
  or
    $env:EE_KEY_FILE = "C:\\path\\to\\service-account-key.json"
    ..\\.venv\\Scripts\\python.exe server\\ee_server.py

The key file must belong to a service account that is registered for Earth Engine.
The Vite dev server forwards /api requests to this service on port 5001.
"""

import json
import os
import datetime
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import ee

PORT = int(os.environ.get("EE_PORT", "5001"))
KEY_FILE = os.environ.get("EE_KEY_FILE", "")
COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"

# Sentinel-2 Scene Classification classes: 0 no data, 1 saturated, 3 cloud shadow,
# 8 cloud medium, 9 cloud high, 10 thin cirrus, 11 snow
BAD_SCL_CLASSES = [0, 1, 3, 8, 9, 10, 11]
# Classes counted as cloud or shadow when reporting farm cloud cover
OBSTRUCTED_SCL_CLASSES = [3, 8, 9, 10]


ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


def load_env_file(path=ENV_FILE):
    """Read KEY=value lines from the project's .env file. Values already set in the environment win."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip())


def init_earth_engine():
    load_env_file()

    # Preferred: GEE_PRIVATE_KEY holds the service account JSON as text (no file on disk)
    key_json = os.environ.get("GEE_PRIVATE_KEY", "")
    if key_json:
        email = json.loads(key_json)["client_email"]
        credentials = ee.ServiceAccountCredentials(email, key_data=key_json)
    elif KEY_FILE:
        with open(KEY_FILE, "r", encoding="utf-8") as f:
            email = json.load(f)["client_email"]
        credentials = ee.ServiceAccountCredentials(email, KEY_FILE)
    else:
        raise RuntimeError("Set GEE_PRIVATE_KEY (service account JSON) or EE_KEY_FILE (path to the key file).")
    ee.Initialize(credentials)


def polygon_from(payload):
    coordinates = payload.get("coordinates")
    if not coordinates or len(coordinates) < 3:
        raise ValueError("A polygon with at least 3 points is required.")
    return ee.Geometry.Polygon([coordinates])


def day_range(date_str):
    """Return (start, end) strings covering one calendar day."""
    day = datetime.date.fromisoformat(date_str)
    return day.isoformat(), (day + datetime.timedelta(days=1)).isoformat()


def sentinel_collection(geometry, start, end):
    return ee.ImageCollection(COLLECTION).filterBounds(geometry).filterDate(start, end)


def mask_clouds(image):
    """Scale reflectance to 0..1 and mask bad pixels using the SCL band."""
    scl = image.select("SCL")
    good = scl.neq(BAD_SCL_CLASSES[0])
    for cls in BAD_SCL_CLASSES[1:]:
        good = good.And(scl.neq(cls))
    bands = image.select(["B2", "B3", "B4", "B8", "B11"]).divide(10000)
    return bands.updateMask(good).copyProperties(image, ["system:time_start", "CLOUDY_PIXEL_PERCENTAGE"])


def obstructed_fraction(scl_image, geometry):
    """Share of the farm covered by cloud or shadow, as a percentage (0..100)."""
    obstructed = scl_image.eq(OBSTRUCTED_SCL_CLASSES[0])
    for cls in OBSTRUCTED_SCL_CLASSES[1:]:
        obstructed = obstructed.Or(scl_image.eq(cls))
    value = (
        obstructed.rename("obs")
        .reduceRegion(reducer=ee.Reducer.mean(), geometry=geometry, scale=20, maxPixels=1e9)
        .get("obs")
    )
    return ee.Number(value).multiply(100)


# Spectral indices of the farm. Bands are reflectance 0..1 after mask_clouds.
INDEX_IDS = ["ndvi", "ndwi", "savi", "evi", "ndmi"]


def index_image(composite, index_id):
    """One index as a single band named after the index."""
    b2 = composite.select("B2")
    b3 = composite.select("B3")
    b4 = composite.select("B4")
    b8 = composite.select("B8")
    b11 = composite.select("B11")
    if index_id == "ndvi":  # vegetation greenness
        image = b8.subtract(b4).divide(b8.add(b4))
    elif index_id == "ndwi":  # open water and leaf water (McFeeters, green and NIR)
        image = b3.subtract(b8).divide(b3.add(b8))
    elif index_id == "savi":  # vegetation with soil visible, L = 0.5
        image = b8.subtract(b4).multiply(1.5).divide(b8.add(b4).add(0.5))
    elif index_id == "evi":  # dense canopy, less saturated than NDVI
        image = b8.subtract(b4).multiply(2.5).divide(b8.add(b4.multiply(6)).subtract(b2.multiply(7.5)).add(1))
    elif index_id == "ndmi":  # canopy moisture and crop water stress (NIR and SWIR)
        image = b8.subtract(b11).divide(b8.add(b11))
    else:
        raise ValueError(f"Unknown index: {index_id}")
    return image.rename(index_id)


# ---------- /api/scenes ----------

def handle_scenes(payload):
    geometry = polygon_from(payload)
    start = payload.get("startDate")
    end = payload.get("endDate")
    if not start or not end:
        raise ValueError("startDate and endDate are required.")

    def scene_feature(image):
        return ee.Feature(None, {
            "date": image.date().format("YYYY-MM-dd"),
            "sceneCloud": image.get("CLOUDY_PIXEL_PERCENTAGE"),
            "farmCloud": obstructed_fraction(image.select("SCL"), geometry),
        })

    features = sentinel_collection(geometry, start, end).map(scene_feature).getInfo()["features"]

    # Several tiles can cover the farm on the same day: keep one entry per date
    by_date = {}
    for f in features:
        props = f["properties"]
        entry = by_date.setdefault(props["date"], {"date": props["date"], "sceneCloud": 100.0, "farmCloud": []})
        if props["sceneCloud"] is not None:
            entry["sceneCloud"] = min(entry["sceneCloud"], props["sceneCloud"])
        if props["farmCloud"] is not None:
            entry["farmCloud"].append(props["farmCloud"])

    scenes = []
    for date in sorted(by_date):
        entry = by_date[date]
        farm = entry["farmCloud"]
        scenes.append({
            "date": date,
            "sceneCloud": round(entry["sceneCloud"], 1),
            "farmCloud": round(sum(farm) / len(farm), 1) if farm else None,
        })

    return {"source": "Google Earth Engine (Sentinel-2 SR)", "scenes": scenes}


# ---------- /api/analysis ----------

def handle_analysis(payload):
    geometry = polygon_from(payload)
    start, end = day_range(payload["date"])
    raw = sentinel_collection(geometry, start, end)

    scene_count = raw.size().getInfo()
    if scene_count == 0:
        raise ValueError(f"No Sentinel-2 scene covers this farm on {payload['date']}.")

    farm_cloud = obstructed_fraction(raw.select("SCL").mosaic(), geometry).getInfo()
    scene_cloud = raw.aggregate_min("CLOUDY_PIXEL_PERCENTAGE").getInfo()

    # Fill cloudy pixels from other tiles on the same day, then compute the indices
    # Fill cloudy pixels from other tiles on the same day, then compute every index
    composite = raw.map(mask_clouds).mosaic()
    all_indices = ee.Image.cat([index_image(composite, i) for i in INDEX_IDS])

    stats = all_indices.reduceRegion(
        reducer=ee.Reducer.median(),
        geometry=geometry,
        scale=10,
        maxPixels=1e9,
    ).getInfo()

    if stats.get("ndvi") is None:
        raise ValueError(f"Every pixel of this farm is cloudy or masked on {payload['date']}.")

    def value(key):
        return round(stats[key], 3) if stats.get(key) is not None else None

    return {
        "source": "Google Earth Engine (Sentinel-2 SR)",
        "date": payload["date"],
        "sceneCount": scene_count,
        "sceneCloud": round(scene_cloud, 1) if scene_cloud is not None else None,
        "farmCloud": round(farm_cloud, 1) if farm_cloud is not None else None,
        "indices": {i: value(i) for i in INDEX_IDS},
    }


# ---------- /api/rgb ----------

def handle_rgb(payload):
    geometry = polygon_from(payload)
    start, end = day_range(payload["date"])
    raw = sentinel_collection(geometry, start, end)
    if raw.size().getInfo() == 0:
        raise ValueError(f"No Sentinel-2 scene covers this farm on {payload['date']}.")

    # True-colour RGB (B4 red, B3 green, B2 blue), clipped to the farm
    rgb = raw.map(mask_clouds).mosaic().select(["B4", "B3", "B2"]).clip(geometry)

    tile_url = rgb.getMapId({"min": 0, "max": 0.3, "gamma": 1.4})["tile_fetcher"].url_format

    download_url = None
    download_error = None
    try:
        # GeoTIFF with the original Sentinel-2 scaling (0..10000), 10 m pixels
        download_url = rgb.multiply(10000).toUint16().getDownloadURL({
            "region": geometry,
            "scale": 10,
            "format": "GEO_TIFF",
        })
    except Exception as exc:  # large farms can exceed the download size limit
        download_error = str(exc)

    return {
        "source": "Google Earth Engine (Sentinel-2 SR)",
        "date": payload["date"],
        "tileUrl": tile_url,
        "downloadUrl": download_url,
        "downloadError": download_error,
    }


# ---------- /api/index-series ----------

def handle_index_series(payload):
    geometry = polygon_from(payload)
    start = payload.get("startDate")
    end = payload.get("endDate")
    index_id = payload.get("index", "ndvi")
    if not start or not end:
        raise ValueError("startDate and endDate are required.")
    if index_id not in INDEX_IDS:
        raise ValueError(f"index must be one of: {', '.join(INDEX_IDS)}.")

    raw = sentinel_collection(geometry, start, end)

    # Acquisition days (UTC), the same day grouping the analysis uses
    times = raw.aggregate_array("system:time_start").getInfo()
    days = sorted({
        datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).date().isoformat()
        for t in times
    })
    if not days:
        return {"source": "Google Earth Engine (Sentinel-2 SR)", "series": []}

    def day_value(day_feature):
        # Mosaic the day's tiles, mask clouds, then take the median of the index over the farm
        day = ee.Date(day_feature.get("date"))
        composite = raw.filterDate(day, day.advance(1, "day")).map(mask_clouds).mosaic()
        median = index_image(composite, index_id).reduceRegion(
            reducer=ee.Reducer.median(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9,
        ).get(index_id)
        return ee.Feature(None, {"date": day_feature.get("date"), "value": median})

    days_fc = ee.FeatureCollection([ee.Feature(None, {"date": d}) for d in days])
    features = days_fc.map(day_value).getInfo()["features"]

    series = []
    for f in features:
        value = f["properties"].get("value")
        if value is not None:
            series.append({"date": f["properties"]["date"], "value": round(value, 3)})

    return {"source": "Google Earth Engine (Sentinel-2 SR)", "index": index_id, "series": series}


# ---------- /api/delineate (Google Agricultural Landscape Understanding) ----------

AG_BASE_URL = "https://agriculturalunderstanding.googleapis.com/v1"


def handle_delineate(payload):
    """Field boundaries and crop predictions around one point, from the Google Agricultural API."""
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is None or longitude is None:
        raise ValueError("latitude and longitude are required.")

    api_key = os.environ.get("GOOGLE_AG_API_KEY", "")
    if not api_key:
        raise RuntimeError("Set GOOGLE_AG_API_KEY in the project .env file.")

    body = json.dumps({
        "locationSpecifier": {"coordinates": {"latitude": latitude, "longitude": longitude}},
    }).encode("utf-8")
    request = urllib.request.Request(
        f"{AG_BASE_URL}:monitorLandscape?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Google Agricultural API error {exc.code}: {exc.read().decode('utf-8', 'replace')}") from exc

    monitored = data.get("monitoredLandscape")
    geojson = monitored.get("geojson") if isinstance(monitored, dict) else monitored
    if isinstance(geojson, str):
        geojson = json.loads(geojson)

    return {"source": "Google Agricultural Landscape Understanding", "features": (geojson or {}).get("features", [])}


ROUTES = {
    "/api/scenes": handle_scenes,
    "/api/analysis": handle_analysis,
    "/api/rgb": handle_rgb,
    "/api/index-series": handle_index_series,
    "/api/delineate": handle_delineate,
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        route = ROUTES.get(self.path)
        if route is None:
            return self._send(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            self._send(200, route(payload))
        except ValueError as exc:
            self._send(400, {"error": str(exc)})
        except Exception as exc:  # return the Earth Engine error to the dashboard
            self._send(500, {"error": str(exc)})

    def log_message(self, fmt, *args):
        print("[ee]", fmt % args)


if __name__ == "__main__":
    init_earth_engine()
    print(f"Earth Engine service running on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
