import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { Badge } from '../components/ui/Badge.js';
import { BarChart } from '../components/charts/BarChart.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';

interface CostsData {
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessionCount: number;
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
  const { data, loading, error, refetch } = useProjectApi<CostsData>(`/api/costs/summary?_r=${refreshKey}`);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
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
      {/* Source Header — T-007 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Claude Code Usage</h2>
            <span className="text-xs text-gray-500">
              {isSubscription && data.billingContext?.monthlyAmount
                ? `$${data.billingContext.monthlyAmount}/mo plan`
                : 'API-equivalent usage analytics'}
            </span>
          </div>
        </div>
      </div>

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
        <VirtualSessionsTable
          sessions={sessions}
          expandedSession={expandedSession}
          onToggle={(id) => setExpandedSession(expandedSession === id ? null : id)}
        />
      )}

      {/* Footer — T-008 */}
      <div className="text-center py-4 border-t border-gray-800/50">
        <span className="text-xs text-gray-600">More providers coming soon</span>
      </div>
    </div>
  );
}

/** Row height constants for virtualization */
const ROW_HEIGHT = 37;        // collapsed row height in px
const EXPANDED_HEIGHT = 160;  // expanded row height in px
const BUFFER_ROWS = 5;        // extra rows above/below viewport

/**
 * Virtualized sessions table — T-010, T-011
 * Hand-rolled virtualization: fixed-height container, overflow-y auto,
 * only renders visible rows + buffer. Supports expandable rows.
 */
function VirtualSessionsTable({ sessions, expandedSession, onToggle }: {
  sessions: SessionCost[];
  expandedSession: string | null;
  onToggle: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Compute row heights (expanded rows are taller)
  const rowHeights = useMemo(() => {
    return sessions.map(s => {
      const id = s.sessionId || '-';
      return id === expandedSession ? EXPANDED_HEIGHT : ROW_HEIGHT;
    });
  }, [sessions, expandedSession]);

  // Cumulative offsets for each row
  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const h of rowHeights) {
      offsets.push(acc);
      acc += h;
    }
    return offsets;
  }, [rowHeights]);

  const totalHeight = rowOffsets.length > 0
    ? rowOffsets[rowOffsets.length - 1] + rowHeights[rowHeights.length - 1]
    : 0;

  // Container viewport height: ~20 rows
  const containerHeight = Math.min(totalHeight, ROW_HEIGHT * 20);

  // Find visible range via binary search on offsets
  const visibleRange = useMemo(() => {
    if (sessions.length === 0) return { start: 0, end: 0 };

    const viewTop = scrollTop;
    const viewBottom = scrollTop + containerHeight;

    // Binary search for first visible row
    let lo = 0;
    let hi = sessions.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rowOffsets[mid] + rowHeights[mid] <= viewTop) lo = mid + 1;
      else hi = mid;
    }
    const start = Math.max(0, lo - BUFFER_ROWS);

    // Find last visible row
    lo = start;
    hi = sessions.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (rowOffsets[mid] >= viewBottom) hi = mid - 1;
      else lo = mid;
    }
    const end = Math.min(sessions.length, lo + BUFFER_ROWS + 1);

    return { start, end };
  }, [scrollTop, containerHeight, sessions.length, rowOffsets, rowHeights]);

  // Scroll expanded row into view
  useEffect(() => {
    if (!expandedSession || !containerRef.current) return;
    const idx = sessions.findIndex(s => (s.sessionId || '-') === expandedSession);
    if (idx < 0) return;
    const rowTop = rowOffsets[idx];
    const rowBottom = rowTop + EXPANDED_HEIGHT;
    const el = containerRef.current;
    if (rowBottom > el.scrollTop + containerHeight) {
      el.scrollTop = rowBottom - containerHeight;
    } else if (rowTop < el.scrollTop) {
      el.scrollTop = rowTop;
    }
  }, [expandedSession, sessions, rowOffsets, containerHeight]);

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No session data available</p>
      </div>
    );
  }

  const visibleSessions = sessions.slice(visibleRange.start, visibleRange.end);
  const topPad = visibleRange.start > 0 ? rowOffsets[visibleRange.start] : 0;
  const bottomPad = visibleRange.end < sessions.length
    ? totalHeight - rowOffsets[visibleRange.end]
    : 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Recent Sessions</h3>
        <span className="text-xs text-gray-500">{sessions.length} sessions</span>
      </div>
      {/* Sticky header */}
      <table className="w-full table-fixed">
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
      </table>
      {/* Scrollable virtualized body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto custom-scrollbar"
        style={{ maxHeight: `${containerHeight}px` }}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Top spacer */}
          {topPad > 0 && <div style={{ height: `${topPad}px` }} />}
          <table className="w-full table-fixed">
            <tbody>
              {visibleSessions.map((s) => {
                const id = s.sessionId || '-';
                const isExpanded = expandedSession === id;
                const totalCache = (s.cacheReadTokens || 0) + (s.cacheWriteTokens || 0);

                return (
                  <Fragment key={id}>
                    <tr
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                      style={{ height: `${ROW_HEIGHT}px` }}
                      onClick={() => onToggle(id)}
                    >
                      <td className="px-4 py-2 text-xs text-gray-600 w-8">
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
          {/* Bottom spacer */}
          {bottomPad > 0 && <div style={{ height: `${bottomPad}px` }} />}
        </div>
      </div>
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
