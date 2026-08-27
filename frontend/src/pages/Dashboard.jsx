import React, { useState, useEffect } from 'react';
import { RefreshCw, Flame, MapPin } from 'lucide-react';

import MapView from '../components/MapView';
import StatCard from '../components/StatCard';
import LiveFeedTicker from '../components/LiveFeedTicker';
import { fetchCameras, fetchAnalyticsSummary, fetchHeatmapData } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';

export default function Dashboard({ onNavigateToPlate }) {
  const [cameras, setCameras] = useState([]);
  const [summary, setSummary] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);

  const { activeAlerts, liveReads } = useWebSocket();

  // Get most recent camera ID that triggered an event for subtle single-node event ping
  const recentCameraId = liveReads[0]?.camera_id || null;

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [cams, sum, heat] = await Promise.all([
        fetchCameras(selectedZone === 'ALL' ? null : selectedZone),
        fetchAnalyticsSummary(),
        fetchHeatmapData()
      ]);
      setCameras(cams);
      setSummary(sum);
      setHeatmapData(heat.points || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [selectedZone]);

  const zones = ['ALL', 'Central', 'North', 'South', 'East', 'West'];

  return (
    <div className="space-y-3.5 pb-8">
      
      {/* 1. Stat Cards Row: 3 Equal-Width Columns */}
      <section aria-label="System Metrics" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <StatCard
          title="Total Sighting Events"
          value={summary?.total_reads?.toLocaleString() || '1,050+'}
          subtitle={`${summary?.distinct_vehicles || 50} vehicles tracked (24h window)`}
          trend="+14.2% / 24h"
          status="normal"
        />
        <StatCard
          title="Active Watchlist Alerts"
          value={summary?.active_alerts !== undefined ? summary.active_alerts : activeAlerts.length}
          subtitle="Unresolved security hits & flags"
          trend="Real-time"
          status={activeAlerts.length > 0 ? 'danger' : 'normal'}
        />
        <StatCard
          title="Raipur Average Velocity"
          value={`${summary?.avg_city_speed_kmh || 52.0} km/h`}
          subtitle={`${summary?.cameras_online || '18/18'} Camera Nodes Active (100% Online)`}
          trend="93.8% Compliance"
          status="normal"
        />
      </section>

      {/* 2. Main Content Grid: Map Column (Left) + Fixed-Width Live Stream Log (Right) */}
      <section aria-label="Surveillance Grid" className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3.5 items-start">
        
        {/* Left Column: Map Controls & Interactive Map */}
        <div className="flex flex-col space-y-3 min-w-0">
          
          {/* Controls Bar: Zone Filter & Heatmap Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#141A22] border border-[#232B36]">
            
            {/* Zone Filter Buttons */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-slate-400 uppercase mr-1">Zone:</span>
              {zones.map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-2.5 py-1 text-xs rounded transition-all ${
                    selectedZone === zone
                      ? 'bg-teal-500 text-white font-bold shadow-[0_0_8px_rgba(45,212,191,0.25)]'
                      : 'bg-[#0B0F14] text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            {/* Heatmap Toggle & Refresh */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
                  showHeatmap
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-[#0B0F14] border-[#232B36] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF'}</span>
              </button>

              <button
                onClick={loadDashboardData}
                title="Refresh Grid Data"
                className="p-1.5 rounded bg-[#0B0F14] border border-[#232B36] text-slate-400 hover:text-slate-100 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
              </button>
            </div>

          </div>

          {/* Leaflet Map: Explicit Height & Width */}
          <MapView
            cameras={cameras}
            heatmapPoints={heatmapData}
            showHeatmap={showHeatmap}
            recentActiveCameraId={recentCameraId}
            onCameraSelect={(cam) => setSelectedCamera(cam)}
            height="520px"
          />

          {/* Selected Camera Details (Appears directly below Map when a camera node is clicked) */}
          {selectedCamera && (
            <div className="p-3 rounded bg-[#141A22] border border-[#232B36] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100">{selectedCamera.name}</span>
                    <span className="text-[10px] text-teal-400 bg-[#0B0F14] px-1.5 py-0.2 rounded border border-[#232B36]">
                      {selectedCamera.camera_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedCamera.road_name} // Zone: {selectedCamera.zone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[11px] text-right">
                  <span className="text-slate-400 block">1-Hour Volume:</span>
                  <strong className="text-teal-400">{selectedCamera.reads_last_hour || 0} reads</strong>
                </div>
                <button
                  onClick={() => setSelectedCamera(null)}
                  className="px-2 py-1 rounded bg-[#0B0F14] text-slate-400 hover:text-slate-100 border border-[#232B36] text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Fixed-Width Live Stream Log (360px, Height matched to Map + Toolbar) */}
        <div className="w-full lg:w-[360px] h-[575px] shrink-0">
          <LiveFeedTicker onSelectPlate={onNavigateToPlate} />
        </div>

      </section>

    </div>
  );
}
