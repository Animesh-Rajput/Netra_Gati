import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'cyan', trend = null }) {
  const colorMap = {
    cyan: {
      border: 'border-[#232B36] border-l-4 border-l-teal-500',
      bg: 'from-teal-500/10 to-transparent',
      text: 'text-teal-400',
      iconBg: 'bg-[#0B0F14] text-teal-400 border-[#232B36]'
    },
    emerald: {
      border: 'border-[#232B36] border-l-4 border-l-emerald-500',
      bg: 'from-emerald-500/10 to-transparent',
      text: 'text-emerald-400',
      iconBg: 'bg-[#0B0F14] text-emerald-400 border-[#232B36]'
    },
    rose: {
      border: 'border-[#232B36] border-l-4 border-l-rose-500',
      bg: 'from-rose-500/10 to-transparent',
      text: 'text-rose-400',
      iconBg: 'bg-[#0B0F14] text-rose-400 border-[#232B36]'
    },
    amber: {
      border: 'border-[#232B36] border-l-4 border-l-amber-500',
      bg: 'from-amber-500/10 to-transparent',
      text: 'text-amber-400',
      iconBg: 'bg-[#0B0F14] text-amber-400 border-[#232B36]'
    },
    indigo: {
      border: 'border-[#232B36] border-l-4 border-l-indigo-500',
      bg: 'from-indigo-500/10 to-transparent',
      text: 'text-indigo-400',
      iconBg: 'bg-[#0B0F14] text-indigo-400 border-[#232B36]'
    }
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`relative overflow-hidden rounded-lg border ${scheme.border} bg-[#141A22] p-3.5 shadow-lg transition-all hover:shadow-xl`}>
      <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-br ${scheme.bg} blur-xl pointer-events-none`} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${scheme.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <h3 className={`text-xl lg:text-2xl font-bold tracking-tight ${scheme.text}`}>
          {value}
        </h3>
        {trend && (
          <span className={`text-[10px] font-semibold ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[10px] text-slate-400 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}