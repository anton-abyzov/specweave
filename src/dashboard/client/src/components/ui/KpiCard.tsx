interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
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

export function KpiCard({ title, value, subtitle, color = 'indigo' }: KpiCardProps) {
  return (
    <div className={`bg-gradient-to-br ${COLOR_MAP[color]} border rounded-xl p-4`}>
      <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">{title}</div>
      <div className={`text-2xl font-bold ${TEXT_COLOR[color]}`}>{value}</div>
      {subtitle && <div className="text-gray-500 text-xs mt-1">{subtitle}</div>}
    </div>
  );
}
