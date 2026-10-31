import React, { useState } from 'react';
import { INDIA_LOCATIONS, DEFAULT_LOCATION } from '../data/indiaLocations';
import { 
  Globe2, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  Compass
} from 'lucide-react';

export default function LoginPage({ onLogin, onBackToLanding }) {
  const [formData, setFormData] = useState({
    name: 'kirtagya namdev',
    email: 'kirtagya@example.com',
    phone: '+91 98765 43210',
    state: DEFAULT_LOCATION.state,
    district: DEFAULT_LOCATION.district
  });

  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sort states alphabetically
  const statesList = Object.keys(INDIA_LOCATIONS).sort((a, b) => a.localeCompare(b));
  const currentDistricts = INDIA_LOCATIONS[formData.state]?.districts || {};
  const districtNames = Object.keys(currentDistricts).sort((a, b) => a.localeCompare(b));

  const handleStateChange = (e) => {
    const newState = e.target.value;
    const availableDistricts = Object.keys(INDIA_LOCATIONS[newState]?.districts || {}).sort((a, b) => a.localeCompare(b));
    const firstDistrict = availableDistricts[0] || '';
    setFormData(prev => ({
      ...prev,
      state: newState,
      district: firstDistrict
    }));
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        onLogin({
          ...formData,
          customCoords: { lat: latitude, lng: longitude, zoom: 15 },
          district: `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E (GPS)`
        });
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg('Unable to retrieve location. Please choose from dropdown.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    const selectedDistrictInfo = currentDistricts[formData.district] || {
      lat: INDIA_LOCATIONS[formData.state]?.center[0] || DEFAULT_LOCATION.lat,
      lng: INDIA_LOCATIONS[formData.state]?.center[1] || DEFAULT_LOCATION.lng,
      zoom: 14,
      state: formData.state
    };

    onLogin({
      ...formData,
      targetLocation: selectedDistrictInfo
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8 relative">
      {/* Background Subtle Gradient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none" />

      {/* Simple Centered Login Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-7 z-10">
        
        {/* Back to Home Button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition mb-4 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
            <span>Back to Home</span>
          </button>
        )}

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Globe2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Remote Sensing Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in and select your location to launch the map
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email ID
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition"
            />
          </div>

          {/* State Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> State
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
              >
                <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Locating...' : 'Use GPS'}
              </button>
            </div>
            <select
              value={formData.state}
              onChange={handleStateChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
            >
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> District
            </label>
            <select
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
            >
              {districtNames.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <span>Log In & Open Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
