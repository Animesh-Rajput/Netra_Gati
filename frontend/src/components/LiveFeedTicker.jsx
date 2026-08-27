import React from 'react';
import { Radio, ShieldAlert, AlertTriangle, ArrowRight, Gauge, Clock } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function LiveFeedTicker({ onSelectPlate }) {
  const { liveReads } = useWebSocket();

  return (
    <div className="flex flex-col h-full rounded-lg bg-[#141A22] border border-[#232B36] shadow-lg overflow-hidden">
      
      {/* Header */}
      <div className="p-3.5 border-b border-[#232B36] flex items-center justify-between bg-[#0B0F14]">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping absolute opacity-75"></span>
            <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]"></span>
          </div>
          <h3 className="text-[10px] font-bold tracking-wider text-slate-100 uppercase">
            Live ANPR Stream Feed
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40">
          {liveReads.length} BUFFERED
        </span>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-[#232B36]">
        {liveReads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 text-xs p-4">
            <Radio className="w-8 h-8 mb-2 animate-pulse text-teal-400" />
            <p>Listening to 18 Raipur ANPR camera nodes...</p>
            <p className="text-[10px] text-slate-300 mt-1">Detections will appear as vehicles transit.</p>
          </div>
        ) : (
          liveReads.map((read, idx) => {
            const isAlert = read.is_blacklisted || read.has_anomaly;
            const timeStr = new Date(read.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div
                key={`${read.id || idx}-${read.timestamp}`}
                onClick={() => onSelectPlate && onSelectPlate(read.plate_no)}
                className={`pt-2 first:pt-0 p-2.5 rounded-lg transition-all cursor-pointer border ${
                  isAlert
                    ? 'bg-rose-500/10 border-rose-500/40 border-l-4 border-l-rose-500 hover:bg-rose-500/20'
                    : 'bg-[#0B0F14] border-[#232B36] hover:bg-[#0B0F14]/80 hover:border-teal-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs tracking-wider text-slate-100">
                      {read.plate_no}
                    </span>
                    {isAlert && (
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-rose-500 text-white animate-pulse">
                        FLAGGED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {timeStr}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                    {read.camera_name || read.camera_id}
                  </span>
                  <span className="text-[10px] text-teal-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-slate-400" />
                    {read.speed_estimate} km/h
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}