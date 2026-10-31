import React from 'react';
import {
  Globe2,
  Layers,
  PenTool,
  Mountain,
  Thermometer,
  TrendingUp,
  Leaf,
  Coins,
  ArrowRight,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Maximize2,
  LogIn
} from 'lucide-react';

export default function LandingPage({ onOpenLogin }) {
  const capabilities = [
    {
      icon: Layers,
      title: "Optical Data Analysis",
      desc: "Satellite images show crop growth, plant health and land use across every farm in your district."
    },
    {
      icon: Mountain,
      title: "Soil Data Analysis",
      desc: "Understand soil condition to guide decisions on where to plant and how much fertiliser to use."
    },
    {
      icon: Thermometer,
      title: "Thermal Data Analysis",
      desc: "Thermal satellite data highlights heat and water stress early, so farmers can act before crops are damaged."
    },
    {
      icon: TrendingUp,
      title: "Yield Prediction",
      desc: "AI estimates the expected harvest for each farm, helping with planning, storage and selling."
    },
    {
      icon: Leaf,
      title: "Sustainable Farming",
      desc: "Track sustainable practices on your land and get simple reports that show your progress."
    },
    {
      icon: Coins,
      title: "Carbon Credit",
      desc: "Measure the carbon stored in your fields to support carbon credit projects and earn extra income."
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Select Operator Location",
      desc: "Sign in and select your State and District. The satellite camera immediately flies directly to your local farm fields."
    },
    {
      step: "02",
      title: "Delineate Field Boundaries",
      desc: "Activate the polygon drawing tool to click and outline parcel boundaries directly on optical satellite tiles."
    },
    {
      step: "03",
      title: "Inspect Metrics & Export",
      desc: "Get instant geodesic acreage calculations, rename parcels, examine vegetation index metrics, and export to GeoJSON."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glow & Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-950">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">
                Remote Sensing Dashboard
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Satellite Earth Observation & GIS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onOpenLogin()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/50 flex items-center gap-2 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login to Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-20 max-w-7xl mx-auto flex-1 flex flex-col items-center text-center">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GeoAI for Agriculture</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight sm:leading-tight">
          Smarter Farming with <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">GeoAI</span> Insights
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Turn satellite and soil data into clear decisions for every farm. Select a district, click on your farm, and explore its health, soil, yield and sustainability insights in one place.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => onOpenLogin()}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition active:scale-95"
          >
            <span>Access Dashboard & Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Interactive Graphic / Dashboard Preview Mockup */}
        <div className="mt-14 w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black overflow-hidden relative">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">
                Viewer: Rupnagar (Ropar), Punjab &bull; Lat 30.966°N, Lng 76.473°E
              </span>
            </div>
            <div className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Sub-Meter Optical Feed Active
            </div>
          </div>

          {/* Graphical Map Simulation Preview */}
          <div className="relative h-80 sm:h-96 w-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950/90" />
            
            {/* Visual Simulated Satellite Field CAD overlay */}
            <div className="relative z-10 border-2 border-emerald-400 bg-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm max-w-md shadow-2xl shadow-emerald-950">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-emerald-400" /> Delineated Parcel #1
                </span>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Polygon Completed
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Land Area</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">14.82 ha</span>
                  <span className="text-[10px] text-slate-500 block">36.62 Acres</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Estimated NDVI</span>
                  <span className="text-lg font-bold text-teal-400 font-mono">0.74</span>
                  <span className="text-[10px] text-emerald-400 block">Healthy Canopy</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-[11px] text-slate-300 font-mono flex items-center justify-between">
                <span>Perimeter: 1,640 m</span>
                <span className="text-slate-400">Centroid: 30.9664°N, 76.4733°E</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Section: "What We Show in This Platform" */}
      <section className="relative z-10 px-6 py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
              Our Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Solutions for Every Farm
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Satellite and AI tools that help farmers understand their land, plan better, and benefit from sustainable practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{c.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3-Step Simple Workflow */}
      <section className="relative z-10 px-6 py-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              How the Dashboard Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {workflowSteps.map((s, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
                <span className="text-4xl font-extrabold text-emerald-500/30 font-mono mb-3">
                  {s.step}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA Card */}
          <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold text-white">Ready to inspect your agricultural parcels?</h3>
              <p className="text-xs text-slate-400 mt-1">Sign in with your region to start delineating fields on satellite imagery.</p>
            </div>
            <button
              onClick={() => onOpenLogin()}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition shrink-0"
            >
              <span>Launch & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-6 px-6 bg-slate-950 text-center text-xs text-slate-500">
        <p>Remote Sensing Dashboard &bull; Earth Observation & Field Delineation System</p>
      </footer>
    </div>
  );
}

