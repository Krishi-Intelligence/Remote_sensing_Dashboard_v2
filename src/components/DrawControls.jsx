import React, { useRef } from 'react';
import {
  Upload,
  PenTool,
  Check,
  X,
  Undo2,
  Layers,
  Map as MapIcon,
  Satellite,
  Crosshair,
  Sparkles,
  MousePointerClick
} from 'lucide-react';

// Numbered step in the "Add a farm" card
function StepNumber({ n }) {
  return (
    <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
      {n}
    </span>
  );
}

const STEP_BUTTON = 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition active:scale-95 disabled:opacity-40';

export default function DrawControls({
  isDrawing,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
  onUndoVertex,
  drawingVerticesCount,
  activeBasemap,
  onChangeBasemap,
  onCenterOnLocation,
  userLocationName,
  onUploadFarmFile,
  delineateMode,
  onToggleDelineate,
  delineating,
  farmForm
}) {
  const fileInputRef = useRef(null);

  const basemapOptions = [
    { id: 'satellite', name: 'Optical Satellite', desc: 'High-Resolution Sub-meter', icon: Satellite },
    { id: 'sentinel2', name: 'Sentinel-2 ESA', desc: 'Cloudless 10m Multispectral', icon: Sparkles },
    { id: 'google', name: 'Google Satellite', desc: 'Satellite + Labels', icon: Satellite },
    { id: 'street', name: 'Standard Map', desc: 'OpenStreetMap Vector', icon: MapIcon },
  ];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 pointer-events-auto w-72 max-h-[calc(100vh-8rem)] overflow-y-auto">
      {/* Add a farm: 1 upload, 2 draw by hand, 3 click on the farm */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-xl shadow-black/50 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">Add a farm</div>

        {/* 1. Upload a farm file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isDrawing}
          title="Upload a shapefile (.shp or zipped .zip) or GeoJSON (.geojson / .json)"
          className={`${STEP_BUTTON} bg-slate-800 hover:bg-slate-700 text-white border-slate-700`}
        >
          <StepNumber n={1} />
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload farm file</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.shp,.geojson,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadFarmFile) onUploadFarmFile(file);
            e.target.value = '';
          }}
        />

        {/* 2. Draw the polygon by hand */}
        {!isDrawing ? (
          <button
            onClick={onStartDrawing}
            className={`${STEP_BUTTON} bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border-transparent shadow-lg shadow-emerald-950`}
          >
            <StepNumber n={2} />
            <PenTool className="w-4 h-4" />
            <span>Draw polygon manually</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Points: {drawingVerticesCount}</span>
            </div>

            {drawingVerticesCount >= 1 && (
              <button
                onClick={onUndoVertex}
                title="Undo last point"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onFinishDrawing}
              disabled={drawingVerticesCount < 3}
              title={drawingVerticesCount < 3 ? 'Click at least 3 points to complete polygon' : 'Complete field polygon'}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                drawingVerticesCount >= 3
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Complete</span>
            </button>

            <button
              onClick={onCancelDrawing}
              title="Cancel drawing"
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. Click on the farm on the map: the Google Agricultural API gives its boundary */}
        {!isDrawing && (
          <button
            onClick={onToggleDelineate}
            className={`${STEP_BUTTON} text-white ${
              delineateMode
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            <StepNumber n={3} />
            <MousePointerClick className="w-4 h-4 text-emerald-300" />
            <span>{delineateMode ? 'Stop clicking on map' : 'Click on your farm'}</span>
          </button>
        )}

        {delineateMode && !isDrawing && delineating?.status !== 'loading' && (
          <p className="text-[11px] text-slate-300 leading-relaxed px-2 pb-1">
            Click on a farm on the map. Its boundary and crop are found, then you enter the farm details.
          </p>
        )}

        {delineating?.status === 'loading' && (
          <p className="text-[11px] text-emerald-300 px-2 pb-1">Finding the farm boundary...</p>
        )}

        {delineating?.status === 'error' && (
          <p className="text-[11px] text-rose-300 px-2 pb-1">{delineating.message}</p>
        )}
      </div>

      {/* Farm details for the boundary just obtained, shown under the upload / draw / click steps */}
      {farmForm}

      {/* Drawing instructions while the polygon is being drawn */}
      {isDrawing && (
        <div className="bg-slate-950/95 border border-emerald-500/40 rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
            <PenTool className="w-3.5 h-3.5" /> Drawing Mode Active
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Click on the map to place the farm corners. Right-click or press Complete when finished (min. 3 points).
          </p>
        </div>
      )}

      {/* Basemap Switcher Floating Widget */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-emerald-400" /> Satellite Basemap
          </div>
          <button
            onClick={onCenterOnLocation}
            title={`Re-center to ${userLocationName}`}
            className="p-1.5 text-slate-300 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {basemapOptions.map((b) => {
            const Icon = b.icon;
            const isSelected = activeBasemap === b.id;
            return (
              <button
                key={b.id}
                onClick={() => onChangeBasemap(b.id)}
                className={`flex flex-col text-left p-2 rounded-xl border text-xs transition ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-white font-medium shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{b.name}</span>
                </div>
                <span className="text-[9px] text-slate-500 truncate">{b.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
