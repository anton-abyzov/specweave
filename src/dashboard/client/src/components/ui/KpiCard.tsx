interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan';
}

const COLOR_MAP = {
  indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20',
  emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
  amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
  rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20',
  cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
};

const TEXT_COLOR = {
  indigo: 'text-indigo-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  cyan: 'text-cyan-400',
};

export function KpiCard({ title, value, subtitle, tooltip, color = 'indigo' }: KpiCardProps) {
  return (
    <div className={`bg-gradient-to-br ${COLOR_MAP[color]} border rounded-xl p-4 relative group`} title={tooltip}>
      <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">{title}</div>
      <div className={`text-2xl font-bold ${TEXT_COLOR[color]}`}>{value}</div>
      {subtitle && <div className="text-gray-500 text-xs mt-1">{subtitle}</div>}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-[10px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
