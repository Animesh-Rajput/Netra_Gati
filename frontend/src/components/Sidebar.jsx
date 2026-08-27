import React from 'react';
import { 
  LayoutDashboard, 
  Route, 
  BarChart2, 
  ShieldAlert, 
  ScanLine, 
  Radio, 
  Cpu
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { activeAlerts } = useWebSocket();
  const unresolvedAlertsCount = activeAlerts.filter(a => !a.is_resolved).length;

  const navItems = [
    { id: 'dashboard', label: 'Overview & Grid', icon: LayoutDashboard },
    { id: 'trajectory', label: 'Trajectory Forensics', icon: Route },
    { id: 'analytics', label: 'Traffic Analytics', icon: BarChart2 },
    { id: 'alerts', label: 'Security & Watchlist', icon: ShieldAlert, badge: unresolvedAlertsCount },
    { id: 'ocr-demo', label: 'ANPR Vision Lab', icon: ScanLine },
  ];

  return (
    <aside className="w-56 bg-[#141A22] border-r border-[#232B36] flex flex-col shrink-0 h-screen sticky top-0 select-none z-40">
      
      {/* Brand Header */}
      <div className="p-4 border-b border-[#232B36] flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-[#0B0F14] border border-[#232B36] flex items-center justify-center text-teal-400 font-bold text-sm">
          NG
        </div>
        <div>
          <h1 className="text-xs font-bold tracking-wider text-slate-100 uppercase">
            NetraGati
          </h1>
          <p className="text-[10px] text-slate-400 tracking-tight">
            RAIPUR OPS // v1.2
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-2.5 space-y-1 flex-1">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#0B0F14] text-teal-400 border-l-4 border-l-teal-500 font-semibold shadow-[0_0_12px_rgba(45,212,191,0.15)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#0B0F14]/50 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Diagnostics */}
      <div className="p-3 border-t border-[#232B36] bg-[#0B0F14] text-[10px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span>SURVEILLANCE GRID</span>
          <span className="text-teal-400 font-semibold">18 NODES</span>
        </div>
      </div>
      
    </aside>
  );
}