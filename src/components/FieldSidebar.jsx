import React, { useState } from 'react'; 
import { 
  Layers, 
  MapPin, 
  Trash2, 
  Download, 
  Maximize2, 
  Edit3, 
  Check, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  Sprout,
  Leaf
} from 'lucide-react';
import { downloadGeoJSON, polygonsToGeoJSON } from '../utils/geoUtils';

// Solutions offered on the selected farm. Add new ones here.
const SOLUTIONS = [
  { id: 'analysis',    name: 'Crop Health Monitoring', desc: 'Satellite dates, vegetation and water indices, cloud cover and image', icon: BarChart3 },
  { id: 'sustainable', name: 'Sustainable Farming',    desc: 'Suggested next crop from the last 3 seasons', icon: Sprout },
  { id: 'yield',       name: 'Yield Estimation',       desc: 'Crop canopy over the season and estimated yield', icon: TrendingUp },
  { id: 'carbon',      name: 'Carbon Credits',         desc: 'Total tCO₂e credits and estimated market value', icon: Leaf },
];

export default function FieldSidebar({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onRenameField,
  onZoomToField,
  onOpenSolution
}) {
  const selectedField = fields.find(f => f.id === selectedFieldId) || null;
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleStartRename = (field) => {
    setEditingId(field.id);
    setEditName(field.name);
  };

  const handleSaveRename = (id) => {
    if (editName.trim()) {
      onRenameField(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleExportSingle = (field, e) => {
    e.stopPropagation();
    const geojson = polygonsToGeoJSON([field]);
    downloadGeoJSON(geojson, `${field.name.toLowerCase().replace(/\s+/g, '_')}.geojson`);
  };

  return (
    <aside className="w-80 md:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col z-20 shrink-0 h-full overflow-hidden shadow-2xl">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Delineated Parcels</h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {fields.length} {fields.length === 1 ? 'Field' : 'Fields'}
        </span>
      </div>

      {/* Solutions: each one works on the selected farm */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Solutions</div>
        {SOLUTIONS.map((solution) => {
          const Icon = solution.icon;
          return (
            <button
              key={solution.id}
              disabled={!selectedField}
              onClick={() => onOpenSolution(solution.id, selectedField)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500 disabled:opacity-50 disabled:hover:border-slate-800 text-left transition"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-white">{solution.name}</span>
                <span className="block text-[11px] text-slate-400">{solution.desc}</span>
              </div>
            </button>
          );
        })}
        {!selectedField && (
          <p className="text-[11px] text-slate-500">Select a farm below to open its solutions.</p>
        )}
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {fields.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No fields drawn yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Click <strong className="text-emerald-400 font-medium">"Draw Field Polygon"</strong> in the top toolbar to outline your farm boundary directly on the satellite tiles.
            </p>
          </div>
        ) : (
          fields.map((field, idx) => {
            const isSelected = selectedFieldId === field.id;
            return (
              <div
                key={field.id}
                onClick={() => onSelectField(field.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Field Top Info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    {editingId === field.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(field.id)}
                          autoFocus
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-emerald-500 text-xs text-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveRename(field.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className="font-semibold text-xs text-white truncate">
                          {field.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(field);
                          }}
                          className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition"
                          title="Rename parcel"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Parcel #{idx + 1} • {new Date(field.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {(field.farmerName || field.crop) && (
                      <span className="text-[11px] text-slate-300 block">
                        {field.farmerName}{field.crop ? ` • ${field.crop}` : ''}
                      </span>
                    )}
                    {field.startDate && field.endDate && (
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {field.startDate} to {field.endDate}
                      </span>
                    )}
                  </div>

                  {/* Quick Card Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoomToField(field);
                      }}
                      title="Focus on map"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleExportSingle(field, e)}
                      title="Download GeoJSON"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      title="Delete field"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid: Area, Acres, Perimeter */}
                <div className="grid grid-cols-2 gap-2 my-2.5">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Area (ha)</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {field.areaHectares.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ha</span>
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Acres</span>
                    <span className="text-sm font-bold text-teal-400 font-mono">
                      {field.areaAcres.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ac</span>
                    </span>
                  </div>
                </div>

                {/* Centroid coordinates & Perimeter */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>Perimeter: {field.perimeterMeters > 1000 ? `${(field.perimeterMeters / 1000).toFixed(2)} km` : `${Math.round(field.perimeterMeters)} m`}</span>
                  <span>
                    {field.centroid ? `${field.centroid.lat.toFixed(3)}°, ${field.centroid.lng.toFixed(3)}°` : ''}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Box */}
      {fields.length > 0 && (
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Total Parcel Count:</span>
            <span className="text-white font-bold">{fields.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Cumulative Area:</span>
            <span className="text-emerald-400 font-bold">
              {fields.reduce((acc, f) => acc + f.areaHectares, 0).toFixed(2)} ha
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

