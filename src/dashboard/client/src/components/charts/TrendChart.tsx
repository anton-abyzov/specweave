/**
 * TrendChart — SVG time-series chart for daily cost trends
 *
 * Renders a line chart with optional per-provider breakdown lines.
 * Uses custom SVG (no external charting library) per dashboard convention.
 */

interface DailyRollup {
  date: string;
  total_cost: number;
  total_tokens: number;
  sessions: number;
  providers: Record<string, { cost: number; tokens: number; sessions: number }>;
}

interface TrendChartProps {
  data: DailyRollup[];
  showProviderLines?: boolean;
  height?: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#6366f1', // indigo
  openai: '#10b981',    // emerald
  google: '#f59e0b',    // amber
  mistral: '#ef4444',   // red
  groq: '#8b5cf6',      // violet
  together: '#06b6d4',  // cyan
  'aws-bedrock': '#f97316', // orange
  'azure-openai': '#3b82f6', // blue
};

export function TrendChart({ data, showProviderLines = false, height = 200 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No spend data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 600;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxCost = Math.max(...data.map(d => d.total_cost), 0.01);
  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - (v / maxCost) * chartH;

  // Main total cost line
  const totalPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.total_cost).toFixed(1)}`)
    .join(' ');

  // Provider lines
  const providerPaths: { provider: string; path: string; color: string }[] = [];
  if (showProviderLines) {
    const allProviders = new Set<string>();
    data.forEach(d => Object.keys(d.providers).forEach(p => allProviders.add(p)));

    for (const provider of allProviders) {
      const path = data
        .map((d, i) => {
          const cost = d.providers[provider]?.cost ?? 0;
          return `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(cost).toFixed(1)}`;
        })
        .join(' ');
      providerPaths.push({
        provider,
        path,
        color: PROVIDER_COLORS[provider] || '#9ca3af',
      });
    }
  }

  // Y-axis labels
  const yLabels = [0, maxCost / 2, maxCost].map(v => ({
    value: v,
    y: yScale(v),
    label: `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}`,
  }));

  // X-axis labels (show ~5 evenly spaced dates)
  const xLabelCount = Math.min(data.length, 5);
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1));
    return {
      x: xScale(idx),
      label: data[idx].date.slice(5), // MM-DD
    };
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={yl.y}
            x2={width - padding.right}
            y2={yl.y}
            stroke="#374151"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <text key={`y-${i}`} x={padding.left - 8} y={yl.y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">
            {yl.label}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text key={`x-${i}`} x={xl.x} y={height - 5} textAnchor="middle" fill="#9ca3af" fontSize="10">
            {xl.label}
          </text>
        ))}

        {/* Provider lines (behind main line) */}
        {providerPaths.map(pp => (
          <path
            key={pp.provider}
            d={pp.path}
            fill="none"
            stroke={pp.color}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        ))}

        {/* Main total cost line */}
        <path d={totalPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.total_cost)}
            r="3"
            fill="#6366f1"
            className="hover:r-5 transition-all"
          >
            <title>{`${d.date}: $${d.total_cost.toFixed(4)}`}</title>
          </circle>
        ))}
      </svg>

      {/* Legend */}
      {showProviderLines && providerPaths.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
          {providerPaths.map(pp => (
            <div key={pp.provider} className="flex items-center gap-1">
              <div className="w-3 h-0.5" style={{ backgroundColor: pp.color }} />
              <span>{pp.provider}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
