import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

import {
  fetchTrafficDensity,
  fetchODMatrix,
  fetchSpeedAnalytics,
  fetchHourlyVolume,
  fetchHeatmapData
} from '../services/api';
import MapView from '../components/MapView';

export default function Analytics() {
  const [densityData, setDensityData] = useState(null);
  const [odData, setOdData] = useState(null);
  const [speedData, setSpeedData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [timeWindow, setTimeWindow] = useState(24);
  const [loading, setLoading] = useState(true);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      const [density, od, speed, hourly, heat] = await Promise.all([
        fetchTrafficDensity(timeWindow),
        fetchODMatrix(10),
        fetchSpeedAnalytics(),
        fetchHourlyVolume(),
        fetchHeatmapData()
      ]);

      setDensityData(density);
      setOdData(od);
      setSpeedData(speed);
      setHourlyData(hourly.hourly_volume || []);
      setHeatmapPoints(heat.points || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [timeWindow]);

  const ZONE_COLORS = {
    Central: '#2DD4BF',
    North: '#38BDF8',
    South: '#34D399',
    East: '#F59E0B',
    West: '#A78BFA'
  };

  return (
    <div className="space-y-4 pb-12">
      
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#141A22] border border-[#232B36]">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold uppercase text-slate-100">
            Aggregated Traffic Dynamics & Spatial Flow
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#0B0F14] p-0.5 rounded border border-[#232B36] text-xs">
            {[6, 12, 24, 48].map((hrs) => (
              <button
                key={hrs}
                onClick={() => setTimeWindow(hrs)}
                className={`px-2.5 py-1 rounded transition-all ${
                  timeWindow === hrs
                    ? 'bg-teal-500 text-white font-bold shadow-[0_0_8px_rgba(45,212,191,0.25)]'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {hrs}h
              </button>
            ))}
          </div>

          <button
            onClick={loadAllAnalytics}
            title="Refresh Analytics"
            className="p-1 rounded bg-[#0B0F14] border border-[#232B36] text-slate-400 hover:text-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Row 1: Time-Series Volume & Zone Spatial Density */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Hourly Volume */}
        <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2">
          <div className="flex items-center justify-between border-b border-[#232B36] pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-100">
                24-Hour Sighting Volume Wave
              </h3>
              <p className="text-[11px] text-slate-400">
                Cumulative plate detections aggregated hourly
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              TIME SERIES
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232B36" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} fontVariant="tabular-nums" />
                <YAxis stroke="#64748b" fontSize={10} fontVariant="tabular-nums" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141A22', borderColor: '#232B36', borderRadius: '4px', color: '#e2e8f0', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#2DD4BF" strokeWidth={1.5} fill="#2DD4BF" fillOpacity={0.1} name="Detections" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Density */}
        <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2">
          <div className="flex items-center justify-between border-b border-[#232B36] pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-100">
                Spatial Density by Municipal Zone
              </h3>
              <p className="text-[11px] text-slate-400">
                Cumulative vehicle volume recorded per zone
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              DISTRIBUTION
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={densityData?.by_zone || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232B36" />
                <XAxis dataKey="zone" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} fontVariant="tabular-nums" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141A22', borderColor: '#232B36', borderRadius: '4px', color: '#e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="vehicle_count" radius={[2, 2, 0, 0]} name="Vehicle Count">
                  {(densityData?.by_zone || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ZONE_COLORS[entry.zone] || '#2DD4BF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Origin-Destination Matrix & Speed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* O-D Matrix Table (Span 8) */}
        <div className="lg:col-span-8 p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2">
          <div className="flex items-center justify-between border-b border-[#232B36] pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-100">
                Top Origin-Destination (O-D) Transit Corridors
              </h3>
              <p className="text-[11px] text-slate-400">
                Sequential vehicle transitions between camera nodes
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              {odData?.total_od_transitions || 0} TOTAL TRIPS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0B0F14] text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#232B36]">
                <tr>
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Origin Node</th>
                  <th className="py-2 px-2.5">Destination Node</th>
                  <th className="py-2 px-2.5 text-right">Flow Volume</th>
                  <th className="py-2 px-2.5 text-right">Relative Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232B36]">
                {(odData?.top_od_routes || []).map((route, idx) => {
                  const maxFlow = odData?.top_od_routes[0]?.flow_count || 1;
                  const pct = Math.round((route.flow_count / maxFlow) * 100);

                  return (
                    <tr key={idx} className="hover:bg-[#0B0F14]/50 transition-colors">
                      <td className="py-2 px-2.5 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2.5 text-slate-100 font-bold">
                        {route.origin_name}
                      </td>
                      <td className="py-2 px-2.5 text-teal-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{route.destination_name}</span>
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-100 font-bold">
                        {route.flow_count} trips
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-[#0B0F14] h-1.5 rounded overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-7">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Velocity Compliance (Span 4) */}
        <div className="lg:col-span-4 p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-3">
          <div className="border-b border-[#232B36] pb-2">
            <h3 className="text-xs font-bold uppercase text-slate-100">
              Corridor Velocity & Compliance
            </h3>
            <p className="text-[11px] text-slate-400">
              Average velocity vs infractions per zone
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {(speedData?.zone_speeds || []).map((z) => (
              <div key={z.zone} className="p-2 rounded bg-[#0B0F14] border border-[#232B36] space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-100">{z.zone} Zone</span>
                  <span className="text-teal-400">{z.avg_speed} km/h avg</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Infractions:</span>
                  <span className={z.violation_rate_pct > 15 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                    {z.speeding_violations} ({z.violation_rate_pct}%)
                  </span>
                </div>
                <div className="w-full bg-[#0B0F14] h-1 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${z.violation_rate_pct > 15 ? 'bg-rose-500' : 'bg-teal-500'}`}
                    style={{ width: `${Math.min(100, z.violation_rate_pct * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3: City-Wide Spatial Density Heatmap */}
      <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2">
        <div className="border-b border-[#232B36] pb-2">
          <h3 className="text-xs font-bold uppercase text-slate-100">
            City-Wide Density Heatmap Layer
          </h3>
          <p className="text-[11px] text-slate-400">
            Kernel density estimation across all 18 smart-city surveillance nodes
          </p>
        </div>

        <MapView
          heatmapPoints={heatmapPoints}
          showHeatmap={true}
          showCameras={true}
          height="380px"
        />
      </div>

    </div>
  );
}
