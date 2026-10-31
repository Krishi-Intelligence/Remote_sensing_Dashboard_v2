import React from 'react';
import { PenTool, Upload, X } from 'lucide-react';

// Shown after login: choose how the farm boundary will be added to the map
export default function FarmSourceChooser({ onDraw, onUpload, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">Add your farm</h2>
            <p className="text-[11px] text-slate-400">Choose how you want to select the farm boundary.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onDraw}
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition"
          >
            <PenTool className="w-5 h-5 text-emerald-400 mb-2" />
            <span className="block text-xs font-semibold text-white">Draw polygon</span>
            <span className="block text-[11px] text-slate-400 mt-1">Click the corners of the farm on the map</span>
          </button>

          <button
            type="button"
            onClick={onUpload}
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition"
          >
            <Upload className="w-5 h-5 text-emerald-400 mb-2" />
            <span className="block text-xs font-semibold text-white">Upload farm file</span>
            <span className="block text-[11px] text-slate-400 mt-1">.zip, .shp, .geojson or .json</span>
          </button>
        </div>
      </div>
    </div>
  );
}
