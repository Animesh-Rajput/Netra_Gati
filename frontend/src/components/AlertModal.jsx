import React from 'react';
import { X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function AlertModal({ onNavigateToPlate }) {
  const { bannerAlert, dismissBanner } = useWebSocket();

  if (!bannerAlert) return null;

  const isCritical = bannerAlert.severity === 'CRITICAL';
  const timeStr = new Date(bannerAlert.timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  return (
    <aside 
      aria-label="Security Alert Toast"
      className="fixed top-6 right-6 z-50 max-w-sm w-full transition-transform duration-200 ease-out"
    >
      <div className={`rounded bg-[#141A22] p-3.5 border shadow-lg ${
        isCritical 
          ? 'border-rose-500 text-slate-100' 
          : 'border-amber-500 text-slate-100'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#232B36]">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {bannerAlert.alert_type} // {bannerAlert.severity}
            </span>
          </div>
          <button
            onClick={dismissBanner}
            className="text-slate-400 hover:text-slate-100 p-0.5"
            title="Dismiss Alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target Plate & Timestamp */}
        <div className="mt-2 flex items-baseline justify-between">
          <h4 className="text-base font-bold text-slate-100 tracking-wider">
            {bannerAlert.plate_no}
          </h4>
          <span className="text-[10px] text-slate-400">
            {timeStr}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-slate-400">
          {bannerAlert.camera_name || bannerAlert.camera_id}
        </p>

        <p className="mt-1.5 text-xs text-slate-300 bg-[#0B0F14] p-2 rounded border border-[#232B36] leading-relaxed">
          {bannerAlert.reason}
        </p>

        {/* Action Controls */}
        <div className="mt-2.5 flex items-center justify-end space-x-2">
          <button
            onClick={dismissBanner}
            className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-100 hover:bg-[#0B0F14] transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              if (onNavigateToPlate) onNavigateToPlate(bannerAlert.plate_no);
              dismissBanner();
            }}
            className="px-3 py-1 rounded text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 transition-colors flex items-center space-x-1"
          >
            <span>Track Vehicle</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </aside>
  );
}