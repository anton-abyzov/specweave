/**
 * BudgetIndicator — progress bar showing current spend vs monthly limit
 *
 * Green (<80%), amber (80-100%), red+pulse (>100%). Returns null if no budget configured.
 */

interface BudgetIndicatorProps {
  currentSpend: number;
  monthlyLimit: number | undefined;
}

export function BudgetIndicator({ currentSpend, monthlyLimit }: BudgetIndicatorProps) {
  if (!monthlyLimit) return null;

  const percent = (currentSpend / monthlyLimit) * 100;
  const clampedWidth = Math.min(percent, 100);

  let barColor = 'bg-emerald-500';
  let borderClass = '';

  if (percent >= 100) {
    barColor = 'bg-red-500';
    borderClass = 'animate-pulse ring-1 ring-red-500/50';
  } else if (percent >= 80) {
    barColor = 'bg-amber-500';
  }

  return (
    <div className={`rounded-lg p-3 bg-gray-800/50 ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">Monthly Budget</span>
        <span className="text-sm font-medium text-gray-200">
          ${currentSpend.toFixed(2)} / ${monthlyLimit.toFixed(2)}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
      <div className="mt-1 text-right">
        <span className="text-xs text-gray-500">{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
