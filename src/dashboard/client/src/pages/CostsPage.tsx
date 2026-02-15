import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { BarChart } from '../components/charts/BarChart';
import { PageLoader } from '../components/ui/Spinner';

interface CostsData {
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessions?: SessionCost[];
}

interface SessionCost {
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost: number;
  timestamp: string;
}

type Tab = 'overview' | 'sessions';

export function CostsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error } = useProjectApi<CostsData>('/api/costs/summary');

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const sessions = data.sessions || [];

  // Model breakdown
  const modelStats = new Map<string, { cost: number; tokens: number; sessions: number }>();
  for (const s of sessions) {
    const model = s.model || 'unknown';
    const existing = modelStats.get(model) || { cost: 0, tokens: 0, sessions: 0 };
    existing.cost += s.cost || 0;
    existing.tokens += (s.inputTokens || 0) + (s.outputTokens || 0);
    existing.sessions++;
    modelStats.set(model, existing);
  }
  const modelBreakdown = Array.from(modelStats.entries())
    .map(([model, stats]) => ({ model, ...stats }))
    .sort((a, b) => b.cost - a.cost);

  // Token type breakdown
  const totalInput = sessions.reduce((s, c) => s + (c.inputTokens || 0), 0);
  const totalOutput = sessions.reduce((s, c) => s + (c.outputTokens || 0), 0);
  const totalCacheRead = sessions.reduce((s, c) => s + (c.cacheReadTokens || 0), 0);
  const totalCacheWrite = sessions.reduce((s, c) => s + (c.cacheWriteTokens || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Token Usage & Costs</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Cost" value={`$${data.totalCost.toFixed(2)}`} color="amber" />
        <KpiCard title="Cache Savings" value={`$${data.totalSavings.toFixed(2)}`} color="emerald" />
        <KpiCard title="Total Tokens" value={formatTokens(data.totalTokens)} color="indigo" />
        <KpiCard title="Sessions" value={sessions.length} color="cyan" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
        {(['overview', 'sessions'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t === 'overview' ? 'Breakdown' : 'Sessions'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Breakdown */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Cost by Model</h3>
            {modelBreakdown.length > 0 ? (
              <BarChart
                items={modelBreakdown.map(m => ({
                  label: m.model,
                  value: parseFloat(m.cost.toFixed(2)),
                  color: '#f59e0b',
                }))}
              />
            ) : (
              <p className="text-gray-600 text-xs">No model data</p>
            )}
          </div>

          {/* Token Type Breakdown */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Token Breakdown</h3>
            <div className="space-y-3">
              <TokenBar label="Input" value={totalInput} total={data.totalTokens} color="bg-indigo-500" />
              <TokenBar label="Output" value={totalOutput} total={data.totalTokens} color="bg-cyan-500" />
              {totalCacheRead > 0 && (
                <TokenBar label="Cache Read" value={totalCacheRead} total={data.totalTokens} color="bg-emerald-500" />
              )}
              {totalCacheWrite > 0 && (
                <TokenBar label="Cache Write" value={totalCacheWrite} total={data.totalTokens} color="bg-amber-500" />
              )}
            </div>
          </div>

          {/* Model Table */}
          {modelBreakdown.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden lg:col-span-2">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-300">Model Details</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Model</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Sessions</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Tokens</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Cost</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Avg/Session</th>
                  </tr>
                </thead>
                <tbody>
                  {modelBreakdown.map(m => (
                    <tr key={m.model} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-sm text-gray-300">{m.model}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">{m.sessions}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(m.tokens)}</td>
                      <td className="px-4 py-2 text-xs text-amber-400 text-right">${m.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">${(m.cost / m.sessions).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && sessions.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-300">Recent Sessions</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-2 text-xs text-gray-500">Session</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Model</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Input</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Output</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Cost</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">When</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 30).map((s, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                    {s.sessionId?.slice(0, 8) || '-'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge label={s.model || 'unknown'} variant="default" />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(s.inputTokens)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(s.outputTokens)}</td>
                  <td className="px-4 py-2 text-xs text-amber-400 text-right">${s.cost?.toFixed(4) || '0'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(s.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TokenBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  // Use inline style for color since dynamic Tailwind classes aren't generated by JIT
  const bgColor: Record<string, string> = {
    'bg-indigo-500': 'rgb(99 102 241 / 0.6)',
    'bg-cyan-500': 'rgb(6 182 212 / 0.6)',
    'bg-emerald-500': 'rgb(16 185 129 / 0.6)',
    'bg-amber-500': 'rgb(245 158 11 / 0.6)',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500">{formatTokens(value)} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bgColor[color] || color }} />
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: string): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
