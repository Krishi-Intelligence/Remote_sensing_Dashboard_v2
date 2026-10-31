import React from 'react';
import { 
  Satellite, 
  MapPin, 
  User, 
  Download, 
  Trash2, 
  LogOut, 
  Layers, 
  Maximize2 
} from 'lucide-react';
import { INDIA_LOCATIONS } from '../data/indiaLocations';

export default function Header({ 
  user, 
  fields, 
  onLocationChange, 
  onExportGeoJSON, 
  onClearAll, 
  onLogout 
}) {
  const totalHectares = fields.reduce((sum, f) => sum + (f.areaHectares || 0), 0);
  const totalAcres = fields.reduce((sum, f) => sum + (f.areaAcres || 0), 0);

  const statesList = Object.keys(INDIA_LOCATIONS);
  const districtsInState = INDIA_LOCATIONS[user.state]?.districts || {};
  const districtList = Object.keys(districtsInState);

  const handleStateSelect = (e) => {
    const newState = e.target.value;
    const available = Object.keys(INDIA_LOCATIONS[newState]?.districts || {});
    const newDistrict = available[0] || '';
    const loc = INDIA_LOCATIONS[newState]?.districts[newDistrict] || {
      lat: INDIA_LOCATIONS[newState]?.center[0] || 30.9664,
      lng: INDIA_LOCATIONS[newState]?.center[1] || 76.4733,
      zoom: 13,
      state: newState
    };
    onLocationChange({
      state: newState,
      district: newDistrict,
      targetLocation: loc
    });
  };

  const handleDistrictSelect = (e) => {
    const newDistrict = e.target.value;
    const loc = districtsInState[newDistrict] || {
      lat: 30.9664,
      lng: 76.4733,
      zoom: 14,
      state: user.state
    };
    onLocationChange({
      district: newDistrict,
      targetLocation: loc
    });
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Mission Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
          <Satellite className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white text-base tracking-tight">Remote Sensing Dashboard</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30 font-medium">
              Satellite GIS
            </span>
          </div>
        </div>
      </div>

      {/* Center: Location FlyTo Quick Switcher */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs text-slate-400">Target Area:</span>
        <select
          value={user.state}
          onChange={handleStateSelect}
          className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          {statesList.map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <span className="text-slate-600">/</span>
        <select
          value={user.district}
          onChange={handleDistrictSelect}
          className="bg-slate-900 border border-slate-700 text-xs text-emerald-300 font-medium rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          {districtList.map(dist => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>
      </div>

      {/* Right Side: Field Counters & Actions */}
      <div className="flex items-center gap-3">
        {/* Drawn Fields Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs">
            <span className="text-slate-400">Fields: </span>
            <span className="text-white font-mono font-bold">{fields.length}</span>
            {fields.length > 0 && (
              <span className="text-emerald-400 font-mono ml-2 font-medium">
                ({totalHectares.toFixed(2)} ha / {totalAcres.toFixed(1)} ac)
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {fields.length > 0 && (
          <>
            <button
              onClick={onExportGeoJSON}
              title="Export all fields as GeoJSON"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export GeoJSON</span>
            </button>

            <button
              onClick={onClearAll}
              title="Clear all drawn polygons"
              className="p-2 bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Operator Profile Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">{user.district}</span>
          </div>
          <button
            onClick={onLogout}
            title="Log Out & Change Profile"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

