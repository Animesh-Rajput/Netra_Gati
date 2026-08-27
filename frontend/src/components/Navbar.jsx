import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  MapPin, 
  BarChart3, 
  ScanLine, 
  Radio, 
  Volume2, 
  VolumeX,
  Layers
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { isConnected, activeAlerts, soundEnabled, toggleSound } = useWebSocket();

  const unresolvedAlertsCount = activeAlerts.filter(a => !a.is_resolved).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'trajectory', label: 'Trajectory Tracking', icon: MapPin },
    { id: 'analytics', label: 'City Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts & Blacklist', icon: ShieldAlert, badge: unresolvedAlertsCount },
    { id: 'ocr-demo', label: 'Live OCR Demo', icon: ScanLine, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c121e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-400">
                NetraGati
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                AI ANPR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wide">
              Raipur Smart City Trajectory & Traffic Grid
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } ${item.highlight && !isActive ? 'text-emerald-400/90 hover:text-emerald-300' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                
                {item.highlight && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Indicators & Controls */}
        <div className="flex items-center space-x-3">
          {/* Audio toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Alert Audio: ACTIVE (Click to Mute)' : 'Alert Audio: MUTED (Click to Enable)'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              soundEnabled
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline font-mono text-[11px]">AUDIO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline font-mono text-[11px] text-rose-400">MUTED</span>
              </>
            )}
          </button>

          {/* WebSocket Live Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
            <span className="font-mono text-[11px] text-slate-300 hidden sm:inline">
              {isConnected ? 'RAIPUR STREAM: LIVE' : 'CONNECTING...'}
            </span>
          </div>
        </div>

      </div>
      
      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around pt-3 mt-2 border-t border-slate-800/60 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium ${
                isActive ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}