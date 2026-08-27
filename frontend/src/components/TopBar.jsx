import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Radio, Clock } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function TopBar({ activeTab }) {
  const { isConnected, liveReads, soundEnabled, toggleSound } = useWebSocket();
  const [timeStr, setTimeStr] = useState('');

  // Running digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles = {
    dashboard: 'Municipal Overview & Real-Time Sensor Grid',
    trajectory: 'Vehicle Trajectory Tracking & Kinematic Forensics',
    analytics: 'City Traffic Volume & Origin-Destination Matrix',
    alerts: 'Security Watchlist & Incident Response Log',
    'ocr-demo': 'Edge Computer Vision & Benchmark Testing Lab'
  };

  return (
    <header className="h-12 bg-[#141A22] border-b border-[#232B36] px-4 lg:px-6 flex items-center justify-between z-30 select-none">
      
      {/* Left Title */}
      <div className="flex items-center space-x-3">
        <span className="text-[11px] font-bold tracking-wider text-teal-400 uppercase">
          RAIPUR //
        </span>
        <h2 className="text-xs font-semibold text-slate-100">
          {tabTitles[activeTab] || 'NetraGati Operations Console'}
        </h2>
      </div>

      {/* Right Telemetry & Controls */}
      <div className="flex items-center space-x-4">
        
        {/* Live Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 border-r border-[#232B36] pr-3">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-100 font-medium">{timeStr || '00:00:00'} IST</span>
        </div>

        {/* Live Socket Indicator */}
        <div className="flex items-center space-x-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]' : 'bg-red-500'}`} />
          <span className="text-slate-400 hidden md:inline text-[11px]">
            {isConnected ? 'NODE STREAM: ACTIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Audio Mute Toggle Button */}
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? 'Alert Audio: Active (Click to Mute)' : 'Alert Audio: Muted (Click to Enable)'}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            soundEnabled
              ? 'bg-[#0B0F14] border-[#232B36] text-teal-400 hover:border-teal-400'
              : 'bg-[#0B0F14] border-[#232B36] text-slate-500 hover:text-slate-100'
          }`}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[10px]">SOUND ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] text-red-500">MUTED</span>
            </>
          )}
        </button>

      </div>
    </header>
  );
}