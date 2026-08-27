import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Trash2, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { 
  fetchBlacklist, 
  addBlacklistPlate, 
  removeBlacklistPlate, 
  fetchAlerts, 
  resolveAlert 
} from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';

export default function Alerts({ onNavigateToPlate }) {
  const [blacklist, setBlacklist] = useState([]);
  const [alertsList, setAlertsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  
  const [newPlate, setNewPlate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newType, setNewType] = useState('Car');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  const { activeAlerts } = useWebSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [bl, al] = await Promise.all([
        fetchBlacklist(),
        fetchAlerts(null, 50)
      ]);
      setBlacklist(bl);
      setAlertsList(al);
    } catch (err) {
      console.error('Failed to load alerts & blacklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeAlerts && activeAlerts.length > 0) {
      setAlertsList((prev) => {
        const existingIds = new Set(prev.map(a => a.id));
        const newUniques = activeAlerts.filter(a => !existingIds.has(a.id));
        return [...newUniques, ...prev];
      });
    }
  }, [activeAlerts]);

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!newPlate.trim() || !newReason.trim()) return;

    setFormSubmitting(true);
    setFormMsg(null);

    try {
      await addBlacklistPlate({
        plate_no: newPlate.trim().toUpperCase(),
        reason: newReason.trim(),
        vehicle_type: newType,
        severity: newSeverity
      });

      setFormMsg({ type: 'success', text: `Plate ${newPlate.toUpperCase()} added to Raipur Police Watchlist` });
      setNewPlate('');
      setNewReason('');
      loadData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to add plate' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRemoveBlacklist = async (plateNo) => {
    try {
      await removeBlacklistPlate(plateNo);
      setBlacklist((prev) => prev.filter(b => b.plate_no !== plateNo));
    } catch (err) {
      console.error('Failed to remove plate:', err);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setAlertsList((prev) => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const filteredAlerts = alertsList.filter((a) => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#141A22] border border-[#232B36]">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span className="text-[11px] font-bold uppercase text-slate-100">
            Incident Dispatch & Surveillance Hotlist
          </span>
        </div>

        <button
          onClick={loadData}
          title="Refresh Feeds"
          className="p-1 rounded bg-[#0B0F14] border border-[#232B36] text-slate-400 hover:text-slate-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
        </button>
      </div>

      {/* Main Grid: Alert Log + Watchlist Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left: Incident Stream Table (Span 8) */}
        <div className="lg:col-span-8 space-y-2">
          
          <div className="flex items-center justify-between p-2 rounded bg-[#141A22] border border-[#232B36]">
            <span className="text-xs font-bold text-slate-100 uppercase">
              Live Incident Stream ({filteredAlerts.length})
            </span>

            {/* Severity Filter */}
            <div className="flex items-center space-x-1 text-xs font-mono">
              <span className="text-slate-400 text-[10px] mr-1">Severity:</span>
              {['ALL', 'CRITICAL', 'HIGH'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    filterSeverity === sev
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-[#0B0F14] text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Stream Items */}
          <div className="space-y-1.5">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center rounded bg-[#141A22] border border-[#232B36] text-slate-400 text-xs">
                No active security alerts matching the current filter.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const timeStr = new Date(alert.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = new Date(alert.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={`${alert.id}-${alert.timestamp}`}
                    className={`p-3 rounded border transition-colors ${
                      alert.is_resolved
                        ? 'bg-[#141A22] border-[#232B36] opacity-50'
                        : isCritical
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : 'bg-amber-500/10 border-amber-500/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#232B36] pb-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-100 tracking-wider">
                          {alert.plate_no}
                        </span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded ${
                          isCritical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {alert.severity}
                        </span>
                        {alert.is_resolved && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-400 uppercase">
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <span className="text-[10.5px] text-slate-400">
                        {dateStr} {timeStr}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                      {alert.reason}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#232B36]">
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span>Node: <strong className="text-slate-200">{alert.camera_name || alert.camera_id}</strong></span>
                        {alert.speed > 0 && (
                          <span>Speed: <strong className="text-teal-400">{alert.speed} km/h</strong></span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!alert.is_resolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="px-2 py-0.5 rounded text-[10.5px] bg-[#0B0F14] hover:bg-[#0B0F14]/80 text-slate-400 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => onNavigateToPlate && onNavigateToPlate(alert.plate_no)}
                          className="px-2 py-0.5 rounded text-[10.5px] bg-teal-500 text-white font-bold hover:bg-teal-600 transition-all shadow-[0_0_8px_rgba(45,212,191,0.25)] hover:shadow-[0_0_12px_rgba(45,212,191,0.35)] flex items-center space-x-1"
                        >
                          <span>Track</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right: Blacklist Admin (Span 4) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Add to Watchlist Form */}
          <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2.5">
            <div className="border-b border-[#232B36] pb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-100">
                Enroll Vehicle in Watchlist
              </span>
            </div>

            {formMsg && (
              <div className={`p-2 rounded text-xs ${
                formMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/10 text-rose-400 border border-rose-500/40'
              }`}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleAddBlacklist} className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">Plate Number</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="E.G. CG04CD9999"
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0F14] border border-[#232B36] text-slate-100 font-bold focus:outline-none focus:border-teal-400 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">Reason / Case Ref</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g., Stolen Vehicle / FIR #812"
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0F14] border border-[#232B36] text-slate-100 focus:outline-none focus:border-teal-400 font-sans text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">Vehicle Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-[#0B0F14] border border-[#232B36] text-slate-100 focus:outline-none focus:border-teal-400 text-xs"
                  >
                    <option>Car</option>
                    <option>SUV</option>
                    <option>Commercial Truck</option>
                    <option>Motorcycle</option>
                    <option>Luxury Sedan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-[#0B0F14] border border-[#232B36] text-slate-100 focus:outline-none focus:border-teal-400 text-xs"
                  >
                    <option>CRITICAL</option>
                    <option>HIGH</option>
                    <option>MEDIUM</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-1.5 rounded bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)] hover:shadow-[0_0_16px_rgba(45,212,191,0.35)]"
              >
                {formSubmitting ? 'ENROLLING...' : 'ENROLL TARGET'}
              </button>
            </form>
          </div>

          {/* Enrolled Targets List */}
          <div className="p-3.5 rounded bg-[#141A22] border border-[#232B36] space-y-2">
            <div className="border-b border-[#232B36] pb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-100 uppercase">Enrolled Targets</span>
              <span className="text-[10px] text-slate-400">{blacklist.length} TOTAL</span>
            </div>

            <div className="overflow-y-auto max-h-80 divide-y divide-[#232B36]">
              {blacklist.map((item) => (
                <div key={item.plate_no} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-100">{item.plate_no}</span>
                      <span className="text-slate-400 text-[10px]">{item.vehicle_type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
                      {item.reason}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveBlacklist(item.plate_no)}
                    className="text-slate-400 hover:text-rose-400 p-1 shrink-0"
                    title="Remove target"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
