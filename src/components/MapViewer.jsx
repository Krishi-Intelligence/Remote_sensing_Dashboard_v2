import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { calculatePolygonMetrics } from '../utils/geoUtils';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASEMAP_URLS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 19,
    maxZoom: 20
  },
  sentinel2: {
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    attribution: 'Sentinel-2 cloudless &copy; EOX IT Services GmbH (Contains modified Copernicus Sentinel data)',
    maxNativeZoom: 16,
    maxZoom: 19
  },
  google: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Imagery &copy; Google',
    maxNativeZoom: 20,
    maxZoom: 20
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    maxZoom: 20
  }
};

export default function MapViewer({
  targetLocation,
  fields,
  selectedFieldId,
  onSelectField,
  isDrawing,
  drawingVertices,
  setDrawingVertices,
  onCompleteDrawing,
  activeBasemap,
  rgbLayer,
  delineateMode,
  onDelineatePoint
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const rgbTileLayerRef = useRef(null);
  
  // Layer groups for active rendering
  const drawingLayerGroupRef = useRef(null);
  const fieldsLayerGroupRef = useRef(null);
  const rubberbandPolylineRef = useRef(null);

  const [mousePos, setMousePos] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Prevent double init in StrictMode

    const initialLat = targetLocation?.lat || 30.9664;
    const initialLng = targetLocation?.lng || 76.4733;
    const initialZoom = targetLocation?.zoom || 14;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Custom Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Scale control
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    // Layer groups
    const fieldsGroup = L.layerGroup().addTo(map);
    const drawingGroup = L.layerGroup().addTo(map);
    fieldsLayerGroupRef.current = fieldsGroup;
    drawingLayerGroupRef.current = drawingGroup;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const config = BASEMAP_URLS[activeBasemap] || BASEMAP_URLS.satellite;

    const baseLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxNativeZoom: config.maxNativeZoom,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc'
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Keep the Sentinel-2 RGB image above the basemap
    if (rgbTileLayerRef.current) rgbTileLayerRef.current.bringToFront();
  }, [activeBasemap]);

  // Show or remove the Sentinel-2 RGB image for the selected date
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (rgbTileLayerRef.current) {
      map.removeLayer(rgbTileLayerRef.current);
      rgbTileLayerRef.current = null;
    }
    if (rgbLayer?.tileUrl) {
      rgbTileLayerRef.current = L.tileLayer(rgbLayer.tileUrl, {
        attribution: 'Sentinel-2 imagery via Google Earth Engine',
        maxZoom: 20
      }).addTo(map);
    }
  }, [rgbLayer]);

  // Delineate mode: a click on the map finds the farm boundary under that point
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !delineateMode || isDrawing) return;

    const container = map.getContainer();
    container.style.cursor = 'crosshair';
    const handleClick = (e) => onDelineatePoint(e.latlng.lat, e.latlng.lng);
    map.on('click', handleClick);

    return () => {
      container.style.cursor = '';
      map.off('click', handleClick);
    };
  }, [delineateMode, isDrawing, onDelineatePoint]);

  // Smoothly FlyTo when targetLocation changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetLocation) return;

    const currentCenter = map.getCenter();
    const distance = Math.hypot(currentCenter.lat - targetLocation.lat, currentCenter.lng - targetLocation.lng);

    // Animate fly to target coordinates
    map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom || 14, {
      duration: distance > 2 ? 2.5 : 1.5,
      easeLinearity: 0.25
    });

    // Visual ripple effect marker at center
    const rippleIcon = L.divIcon({
      className: 'location-pulse-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); border: 2px solid #10b981; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([targetLocation.lat, targetLocation.lng], { icon: rippleIcon }).addTo(map);
    const timer = setTimeout(() => {
      if (map) map.removeLayer(marker);
    }, 4500);

    return () => clearTimeout(timer);
  }, [targetLocation]);

  // Handle Drawing Clicks & Mouse Moves
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = map.getContainer();
    if (isDrawing) {
      container.classList.add('drawing-mode-active');
    } else {
      container.classList.remove('drawing-mode-active');
    }

    if (!isDrawing) {
      if (rubberbandPolylineRef.current) {
        rubberbandPolylineRef.current.remove();
        rubberbandPolylineRef.current = null;
      }
      return;
    }

    const handleClick = (e) => {
      const newPt = [e.latlng.lat, e.latlng.lng];
      setDrawingVertices(prev => [...prev, newPt]);
    };

    const handleMouseMove = (e) => {
      setMousePos(e.latlng);
    };

    const handleDblClick = (e) => {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      if (drawingVertices.length >= 3) {
        onCompleteDrawing();
      }
    };

    // Right click closes the polygon at the points already placed
    const handleRightClick = (e) => {
      L.DomEvent.preventDefault(e);
      if (drawingVertices.length >= 3) {
        onCompleteDrawing();
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDblClick);
    map.on('contextmenu', handleRightClick);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDblClick);
      map.off('contextmenu', handleRightClick);
    };
  }, [isDrawing, drawingVertices.length, onCompleteDrawing, setDrawingVertices]);

  // Render Drawing in Progress (vertices, dashed lines, rubberband line)
  useEffect(() => {
    const group = drawingLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!isDrawing || drawingVertices.length === 0) return;

    // Draw lines between already placed vertices
    if (drawingVertices.length > 1) {
      L.polyline(drawingVertices, {
        color: '#10b981',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.95
      }).addTo(group);
    }

    // Rubberband line from last placed vertex to current mouse cursor
    if (mousePos && drawingVertices.length > 0) {
      const lastVertex = drawingVertices[drawingVertices.length - 1];
      L.polyline([lastVertex, [mousePos.lat, mousePos.lng]], {
        color: '#34d399',
        weight: 2,
        dashArray: '4, 6',
        opacity: 0.7
      }).addTo(group);
    }

    // Place vertex markers
    drawingVertices.forEach((pt, index) => {
      const isFirst = index === 0;
      const markerHtml = isFirst
        ? `<div style="
            width: 18px; 
            height: 18px; 
            background: #10b981; 
            border: 3px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 14px #10b981;
            cursor: pointer;
            animation: pulse 1.5s infinite;
          " title="Click to close polygon"></div>`
        : `<div style="
            width: 12px; 
            height: 12px; 
            background: #0284c7; 
            border: 2px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 8px rgba(0,0,0,0.6);
          "></div>`;

      const icon = L.divIcon({
        className: 'vertex-marker',
        html: markerHtml,
        iconSize: isFirst ? [18, 18] : [12, 12],
        iconAnchor: isFirst ? [9, 9] : [6, 6]
      });

      const vertexMarker = L.marker(pt, { icon, interactive: isFirst });
      if (isFirst) {
        vertexMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (drawingVertices.length >= 3) {
            onCompleteDrawing();
          }
        });
        vertexMarker.bindTooltip("Click to close field", { direction: 'top', offset: [0, -10] });
      }
      vertexMarker.addTo(group);
    });
  }, [isDrawing, drawingVertices, mousePos, onCompleteDrawing]);

  // Render Completed Farm Fields
  useEffect(() => {
    const group = fieldsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    fields.forEach((field) => {
      const isSelected = selectedFieldId === field.id;

      const polygon = L.polygon(field.coordinates, {
        color: isSelected ? '#38bdf8' : '#10b981',
        weight: isSelected ? 3.5 : 2.5,
        fillColor: isSelected ? '#0284c7' : '#10b981',
        fillOpacity: isSelected ? 0.35 : 0.22,
        dashArray: null,
      }).addTo(group);

      // Label at Centroid
      const tooltipContent = `
        <div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 700; color: #10b981;">${field.name}</div>
          <div style="color: #cbd5e1; font-family: monospace;">${field.areaHectares.toFixed(2)} ha &bull; ${field.areaAcres.toFixed(1)} ac</div>
        </div>
      `;

      polygon.bindTooltip(tooltipContent, {
        permanent: false,
        sticky: true,
        className: 'bg-slate-900 border border-slate-700 text-slate-100 rounded-lg shadow-xl'
      });

      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectField(field.id);
      });
    });
  }, [fields, selectedFieldId, onSelectField]);

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden bg-slate-950">
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Target Crosshair in Center (Discreet HUD styling) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30 flex items-center justify-center">
        <div className="w-6 h-6 border border-emerald-400/40 rounded-full" />
        <div className="absolute w-10 h-[1px] bg-emerald-400/50" />
        <div className="absolute h-10 w-[1px] bg-emerald-400/50" />
      </div>

      {/* Satellite Telemetry Floating Bar at bottom */}
      <div className="absolute bottom-4 left-24 z-20 pointer-events-none hidden md:flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-800 text-[11px] font-mono text-slate-400 shadow-xl">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Optical Satellite Feed</span>
        </span>
        <span className="text-slate-600">|</span>
        <span>Target: {targetLocation?.district || 'Active'}</span>
        {mousePos && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Lat {mousePos.lat.toFixed(4)}°, Lng {mousePos.lng.toFixed(4)}°
            </span>
          </>
        )}
      </div>
    </div>
  );
}

