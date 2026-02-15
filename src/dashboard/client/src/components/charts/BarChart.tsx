interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  items: BarItem[];
  maxBars?: number;
}

export function BarChart({ items, maxBars = 10 }: BarChartProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxBars);
  const max = Math.max(...sorted.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-28 truncate text-right" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || '#6366f1',
              }}
            />
          </div>
          <span className="text-xs text-gray-500 w-10 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
