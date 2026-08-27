import React, { useState, useEffect } from 'react';
import { Search, Route, AlertTriangle, ShieldAlert } from 'lucide-react';
import MapView from '../components/MapView';
import { fetchTrajectory, fetchPlateAutocomplete, fetchCameras } from '../services/api';

export default function TrajectorySearch({ initialPlate = 'CG04MB1001' }) {
  const [query, setQuery] = useState(initialPlate);
  const [allowFuzzy, setAllowFuzzy] = useState(true);
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [autocompleteList, setAutocompleteList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoPlates = [
    { plate: 'CG04MB1001', label: 'SUV (White)', isAlert: false },
    { plate: 'CG04MA5555', label: 'EV Car (Teal)', isAlert: false },
    { plate: 'DL01CK8888', label: 'Stolen Target (Luxury)', isAlert: true },
    { plate: 'MH12DE1212', label: 'Hit & Run Suspect', isAlert: true },
    { plate: 'CG07CA4321', label: 'Commercial Truck', isAlert: false },
  ];

  useEffect(() => {
    fetchCameras().then(setCameras).catch(console.error);
  }, []);

  const handleSearch = async (plateToSearch = query) => {
    if (!plateToSearch || !plateToSearch.trim()) return;
    const cleanPlate = plateToSearch.trim().toUpperCase();
    setQuery(cleanPlate);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTrajectory(cleanPlate, allowFuzzy);
      setTrajectoryData(data);
    } catch (err) {
      setError(err.message || 'No trajectory data found for this plate in the last 24 hours');
      setTrajectoryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPlate) {
      handleSearch(initialPlate);
    }
  }, [initialPlate]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setAutocompleteList([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchPlateAutocomplete(query).then(setAutocompleteList).catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-4 pb-12">
      
      {/* Search Input Bar */}
      <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-2">
          
          <div className="relative flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(query);
                }}
                placeholder="ENTER VEHICLE NUMBER PLATE (E.G., CG04MB1001, DL01CK8888)..."
                className="w-full pl-9 pr-3 py-2 rounded bg-[#0B0F14] border border-[#232B36] text-slate-100 text-xs font-bold placeholder:text-slate-500 focus:outline-none focus:border-teal-400 uppercase tracking-wider"
              />
            </div>

            {/* Autocomplete */}
            {showSuggestions && autocompleteList.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#141A22] border border-[#232B36] rounded shadow-lg z-50 overflow-hidden divide-y divide-[#232B36]">
                {autocompleteList.map((item) => (
                  <button
                    key={item.plate_no}
                    onClick={() => handleSearch(item.plate_no)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#0B0F14]/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-bold text-teal-400">{item.plate_no}</span>
                      <span className="text-slate-400 text-[11px]">({item.vehicle_type})</span>
                    </div>
                    {item.is_blacklisted && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-rose-500 text-white uppercase">
                        WATCHLIST
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSearch(query)}
            disabled={loading}
            className="w-full py-1.5 rounded bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)] hover:shadow-[0_0_16px_rgba(45,212,191,0.35)] flex items-center justify-center space-x-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'TRACKING...' : 'RECONSTRUCT ROUTE'}</span>
          </button>
        </div>

        {/* Quick Demo Target Chips & Options */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#232B36] text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[10px] uppercase">Benchmark Targets:</span>
            {demoPlates.map((dp) => (
              <button
                key={dp.plate}
                onClick={() => handleSearch(dp.plate)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  dp.isAlert
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-[#0B0F14] text-slate-400 border-[#232B36] hover:text-slate-100'
                }`}
              >
                {dp.plate}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={allowFuzzy}
              onChange={(e) => setAllowFuzzy(e.target.checked)}
              className="rounded border-[#232B36] text-teal-400 bg-[#0B0F14]"
            />
            <span>OCR Fuzzy Match Tolerance (O/0, I/1)</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trajectory Forensic View */}
      {trajectoryData && (
        <div className="space-y-3">
          
          {/* Security Alert Banner */}
          {trajectoryData.is_blacklisted && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/40 flex items-center space-x-2.5 text-slate-100">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase text-rose-400">
                  WATCHLIST HIT: RAIPUR POLICE ENROLLMENT
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {trajectoryData.blacklist_reason}
                </p>
              </div>
            </div>
          )}

          {/* Anomaly Banner */}
          {trajectoryData.has_anomaly && (
            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/40 flex items-center space-x-2.5 text-slate-100">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase text-amber-400">
                  KINEMATIC ANOMALY DETECTED (PROBABLE CLONED LICENSE PLATE)
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {trajectoryData.anomaly_details}
                </p>
              </div>
            </div>
          )}

          {/* Telemetry Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded bg-[#141A22] border border-[#232B36] text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Target Plate</span>
              <strong className="text-sm font-bold text-teal-400 mt-0.5 block">
                {trajectoryData.matched_plate}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total Sightings</span>
              <strong className="text-sm font-bold text-slate-100 mt-0.5 block">
                {trajectoryData.total_sightings} Nodes
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Trajectory Span</span>
              <strong className="text-sm font-bold text-teal-400 mt-0.5 block">
                {trajectoryData.total_distance_km} km
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Average Velocity</span>
              <strong className="text-sm font-bold text-slate-100 mt-0.5 block">
                {trajectoryData.avg_speed_kmh} km/h
              </strong>
            </div>
          </div>

          {/* Map and Sightings Log Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            
            {/* Map Column (Span 7) */}
            <div className="lg:col-span-7">
              <MapView
                cameras={cameras}
                trajectoryPoints={trajectoryData.points}
                height="500px"
              />
            </div>

            {/* Chronological Sighting Table (Span 5) */}
            <div className="lg:col-span-5 h-[500px] flex flex-col rounded bg-[#141A22] border border-[#232B36] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#232B36] bg-[#0B0F14] flex items-center justify-between text-xs">
                <span className="font-bold text-slate-100 uppercase">Sightings Chronology</span>
                <span className="text-[10px] text-slate-400">{trajectoryData.points.length} WAYPOINTS</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#232B36]">
                {trajectoryData.points.map((pt, idx) => {
                  const timeFormatted = new Date(pt.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateFormatted = new Date(pt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  return (
                    <div key={pt.id} className="p-2.5 hover:bg-[#0B0F14]/50 transition-colors text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded bg-[#0B0F14] border border-[#232B36] text-teal-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-100">
                            {pt.camera_name}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-slate-400">
                          {dateFormatted} {timeFormatted}
                        </span>
                      </div>

                      <div className="mt-1 pl-6 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Speed: <strong className="text-slate-200">{pt.speed_estimate} km/h</strong></span>
                        {pt.distance_from_prev_km !== null && (
                          <span>Leg: <strong className="text-teal-400">{pt.distance_from_prev_km} km</strong> ({Math.round(pt.time_gap_seconds / 60)} min)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
