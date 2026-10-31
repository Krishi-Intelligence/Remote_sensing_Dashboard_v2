# Remote Sensing Dashboard

A modern, high-performance web dashboard built with **React**, **Vite**, **Tailwind CSS**, **Leaflet**, and **Turf.js** for satellite field parcel delineation, precision agriculture analysis, and geospatial monitoring.

---

## 🌟 Application Flow & Architecture

### 1. Front Landing Page (Home)
- **Platform Overview**: Explains the purpose of the platform:
  - Sub-meter optical satellite imagery and Sentinel-2 multispectral observation.
  - Interactive field polygon delineation CAD tools.
  - Instant geodesic calculations: Area in Hectares (ha) and Acres (ac), perimeter, and centroid.
  - Simulated canopy vigor / NDVI health estimation.
  - GeoJSON export for QGIS, ArcGIS, and Google Earth Engine.
- **Interactive Graphical Simulation**: Shows a live mock of field parcel CAD metrics.
- **Feature Cards & 3-Step Workflow**: Guides users through location targeting, boundary drawing, and GIS export.
- **"Login to Dashboard" / "Access Dashboard" Action Buttons**: Opens the focused login screen.

### 2. Simple Operator Login Page
- Clean, centered card:
  - **Full Name**
  - **Email ID**
  - **Phone Number**
  - **State & District Selection**: Covers all 28 States and 8 Union Territories across India with corresponding districts.
  - **GPS Geolocation** auto-detect button fallback.
  - **"← Back to Home"** navigation link to return to the front page.

### 3. Satellite GIS Map Dashboard
- **Instant Location Teleport & Auto-Zoom**: Directly flies (`flyTo`) to the chosen district at field zoom (Level 14) upon sign-in.
- **Satellite Basemaps**: Optical sub-meter imagery, Copernicus Sentinel-2 cloudless, hybrid roads & places, and vector street map.
- **Interactive Drawing Tool**: Outline farm fields with live rubberband lines and snapping.
- **Sidebar**: Manage fields, inspect hectares/acres, rename parcels, and download GeoJSON.

---

## 🚀 Running the Project

The application is already running on:
👉 **[http://localhost:3000](http://localhost:3000)**

To run or restart the application manually:
```bash
# Install dependencies
npm install

# Start development server
npm run dev -- --host --port 3000

# Build production bundle
npm run build
```

---

## Google Earth Engine (Spectral Indices)

Farm analysis gets NDVI, NDWI, NDMI, SAVI and EVI from Sentinel-2 surface reflectance through Google Earth Engine.
The Earth Engine calls run in a small Python service (`server/ee_server.py`), because the service account key must not be placed in browser code.

Run two processes, each in its own terminal:

```powershell
# 1. Earth Engine service (port 5001)
$env:EE_KEY_FILE = "C:\path\to\service-account-key.json"
..\.venv\Scripts\python.exe server\ee_server.py

# 2. Dashboard (port 3000), proxies /api to the service
npm run dev
```

The service account must be registered for Earth Engine. Keep the key file out of the project folder and out of version control.
Draw or upload a farm, then pick a highlighted date on the calendar in the analysis panel. The panel shows the indices and farm cloud cover for that date, and can show the Sentinel-2 RGB image on the map or download it as a GeoTIFF. If Earth Engine is unavailable, the panel shows the error.

