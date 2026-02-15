interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface StatusDonutProps {
  segments: DonutSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

const COLORS: Record<string, string> = {
  active: '#6366f1',
  completed: '#10b981',
  paused: '#f59e0b',
  planning: '#06b6d4',
  abandoned: '#ef4444',
  backlog: '#6b7280',
  ready_for_review: '#8b5cf6',
};

export function statusToColor(status: string): string {
  return COLORS[status] || '#6b7280';
}

export function StatusDonut({ segments, size = 160, centerLabel, centerValue }: StatusDonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-gray-600 text-xs">No data</span>
      </div>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue != null && (
          <span className="text-xl font-bold text-white">{centerValue}</span>
        )}
        {centerLabel && (
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}

export function buildDonutSegments(breakdown: Record<string, number>): DonutSegment[] {
  return Object.entries(breakdown)
    .filter(([_, v]) => v > 0)
    .map(([label, value]) => ({
      label,
      value,
      color: statusToColor(label),
    }));
}
