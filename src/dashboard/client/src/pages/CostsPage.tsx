import { useState, Fragment } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { Badge } from '../components/ui/Badge.js';
import { BarChart } from '../components/charts/BarChart.js';
import { PageLoader } from '../components/ui/Spinner.js';

interface CostsData {
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessionCount: number;
  isMaxPlan?: boolean;
  billingContext?: { planType: 'api' | 'subscription'; monthlyAmount?: number };
  sessions?: SessionCost[];
  modelBreakdown?: Record<string, { cost: number; tokens: number; sessions: number }>;
}

interface SessionCost {
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost: number;
  savings?: number;
  timestamp: string;
  duration?: number;
}

type Tab = 'overview' | 'sessions';

export function CostsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useSSEEvent('cost-update', () => setRefreshKey((k) => k + 1));
  const { data, loading, error } = useProjectApi<CostsData>(`/api/costs/summary?_r=${refreshKey}`);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const sessions = data.sessions || [];
  const isSubscription = data.billingContext?.planType === 'subscription';

  // Use server-provided model breakdown if available, otherwise compute from sessions
  const modelBreakdown = data.modelBreakdown
    ? Object.entries(data.modelBreakdown)
        .map(([model, stats]) => ({ model, ...stats }))
        .sort((a, b) => b.cost - a.cost)
    : computeModelBreakdown(sessions);

  // Token type breakdown from sessions
  const totalInput = sessions.reduce((s, c) => s + (c.inputTokens || 0), 0);
  const totalOutput = sessions.reduce((s, c) => s + (c.outputTokens || 0), 0);
  const totalCacheRead = sessions.reduce((s, c) => s + (c.cacheReadTokens || 0), 0);
  const totalCacheWrite = sessions.reduce((s, c) => s + (c.cacheWriteTokens || 0), 0);
  const grandTotalTokens = totalInput + totalOutput + totalCacheRead + totalCacheWrite;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Token Usage & Costs</h2>

      {/* Subscription Banner */}
      {isSubscription && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Badge label="Subscription" variant="info" />
          <span className="text-xs text-gray-300">
            {data.billingContext?.monthlyAmount
              ? `$${data.billingContext.monthlyAmount}/mo plan. `
              : ''}
            Costs shown as API-equivalent value for usage analytics.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={isSubscription ? 'API-Equivalent Value' : 'Total Cost'}
          value={`$${data.totalCost.toFixed(2)}`}
          subtitle={isSubscription && data.billingContext?.monthlyAmount
            ? `Your plan: $${data.billingContext.monthlyAmount}/mo`
            : undefined}
          color="amber"
        />
        <KpiCard
          title={isSubscription ? 'Cache Efficiency' : 'Cache Savings'}
          value={`$${data.totalSavings.toFixed(2)}`}
          subtitle={isSubscription ? 'API-equivalent savings from cache' : undefined}
          color="emerald"
        />
        <KpiCard title="Total Tokens" value={formatTokens(data.totalTokens)} subtitle={formatTokensLong(data.totalTokens)} color="indigo" />
        <KpiCard title="Sessions" value={data.sessionCount.toLocaleString()} color="cyan" />
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
            {t === 'overview' ? 'Breakdown' : `Sessions (${sessions.length})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Breakdown Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">
              {isSubscription ? 'Usage Value by Model' : 'Cost by Model'}
            </h3>
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
              <TokenBar label="Input" value={totalInput} total={grandTotalTokens} color="bg-indigo-500" />
              <TokenBar label="Output" value={totalOutput} total={grandTotalTokens} color="bg-cyan-500" />
              {totalCacheRead > 0 && (
                <TokenBar label="Cache Read" value={totalCacheRead} total={grandTotalTokens} color="bg-emerald-500" />
              )}
              {totalCacheWrite > 0 && (
                <TokenBar label="Cache Write" value={totalCacheWrite} total={grandTotalTokens} color="bg-amber-500" />
              )}
            </div>
          </div>

          {/* Model Details Table */}
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
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">{m.sessions.toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(m.tokens)}</td>
                      <td className="px-4 py-2 text-xs text-amber-400 text-right">${m.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 text-right">
                        ${m.sessions > 0 ? (m.cost / m.sessions).toFixed(4) : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <SessionsTable
          sessions={sessions}
          expandedSession={expandedSession}
          onToggle={(id) => setExpandedSession(expandedSession === id ? null : id)}
        />
      )}
    </div>
  );
}

const PAGE_SIZE = 30;

function SessionsTable({ sessions, expandedSession, onToggle }: {
  sessions: SessionCost[];
  expandedSession: string | null;
  onToggle: (id: string) => void;
}) {
  const [page, setPage] = useState(0);

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No session data available</p>
      </div>
    );
  }

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageSessions = sessions.slice(pageStart, pageEnd);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Recent Sessions</h3>
        <span className="text-xs text-gray-500">
          {pageStart + 1}-{Math.min(pageEnd, sessions.length)} of {sessions.length}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500 w-8"></th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Session</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Model</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Input</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Output</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Cache</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Cost</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Duration</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">When</th>
          </tr>
        </thead>
        <tbody>
          {pageSessions.map((s) => {
            const id = s.sessionId || '-';
            const isExpanded = expandedSession === id;
            const totalCache = (s.cacheReadTokens || 0) + (s.cacheWriteTokens || 0);

            return (
              <Fragment key={id}>
                <tr
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => onToggle(id)}
                >
                  <td className="px-4 py-2 text-xs text-gray-600">
                    <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      &#9656;
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                    {id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge label={s.model || 'unknown'} variant="default" />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(s.inputTokens)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">{formatTokens(s.outputTokens)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">
                    {totalCache > 0 ? formatTokens(totalCache) : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs text-amber-400 text-right">${s.cost?.toFixed(4) || '0.0000'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 text-right">
                    {s.duration ? formatDuration(s.duration) : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(s.timestamp)}</td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-800/50">
                    <td colSpan={9} className="px-6 py-3 bg-gray-800/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500 block mb-1">Input Tokens</span>
                          <span className="text-gray-300 font-mono">{s.inputTokens.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Output Tokens</span>
                          <span className="text-gray-300 font-mono">{s.outputTokens.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Cache Write</span>
                          <span className="text-gray-300 font-mono">{(s.cacheWriteTokens || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Cache Read</span>
                          <span className="text-gray-300 font-mono">{(s.cacheReadTokens || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Cost</span>
                          <span className="text-amber-400 font-mono">${s.cost?.toFixed(6) || '0'}</span>
                        </div>
                        {s.savings != null && s.savings > 0 && (
                          <div>
                            <span className="text-gray-500 block mb-1">Cache Savings</span>
                            <span className="text-emerald-400 font-mono">${s.savings.toFixed(6)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 block mb-1">Duration</span>
                          <span className="text-gray-300">{s.duration ? formatDuration(s.duration) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Session ID</span>
                          <span className="text-gray-400 font-mono text-[10px]">{s.sessionId}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 text-xs rounded transition-colors ${
                    page === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TokenBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
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

function computeModelBreakdown(sessions: SessionCost[]) {
  const modelStats = new Map<string, { cost: number; tokens: number; sessions: number }>();
  for (const s of sessions) {
    const model = s.model || 'unknown';
    const existing = modelStats.get(model) || { cost: 0, tokens: 0, sessions: 0 };
    existing.cost += s.cost || 0;
    existing.tokens += (s.inputTokens || 0) + (s.outputTokens || 0);
    existing.sessions++;
    modelStats.set(model, existing);
  }
  return Array.from(modelStats.entries())
    .map(([model, stats]) => ({ model, ...stats }))
    .sort((a, b) => b.cost - a.cost);
}

function formatTokens(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTokensLong(n: number): string {
  if (!n) return '0';
  return n.toLocaleString();
}

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function timeAgo(ts: string): string {
  if (!ts) return '-';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '-';
  }
}
