import { useState, useCallback } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSE } from '../hooks/useSSE.js';
import { useUrlState } from '../hooks/useUrlState.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { Badge } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';

interface SessionError {
  timestamp: string;
  sessionId: string;
  type: string;
  message: string;
  context?: {
    toolName?: string;
    toolInput?: string;
    messageIndex?: number;
    precedingAction?: string;
    recentTools?: Array<{ name: string; input: string }>;
  };
}

interface ErrorGroup {
  type: string;
  count: number;
  lastSeen: string;
  sessions: number;
  recentMessages: string[];
}

interface PaginatedErrors {
  total: number;
  errors: SessionError[];
  offset: number;
  limit: number;
}

interface ErrorTimelineBucket {
  start: string;
  end: string;
  count: number;
  byType: Record<string, number>;
}

interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  toolCallCount: number;
  errors: SessionError[];
  version: string;
  gitBranch: string;
}

type Tab = 'groups' | 'errors' | 'timeline' | 'sessions';

const TYPE_COLORS: Record<string, string> = {
  prompt_too_long: 'error',
  api_error: 'warning',
  tool_failure: 'info',
  hook_error: 'default',
  rate_limit: 'warning',
  unknown: 'default',
};

const PAGE_SIZE = 50;

export function ErrorsPage() {
  const [tab, setTab] = useUrlState('tab', 'groups');
  const [typeFilter, setTypeFilter] = useUrlState('type', '');
  const [searchQuery, setSearchQuery] = useUrlState('q', '');
  const [selectedSession, setSelectedSession] = useUrlState('session', '');
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const offset = page * PAGE_SIZE;
  const typeParam = typeFilter ? `&type=${encodeURIComponent(typeFilter)}` : '';
  const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

  // SSE-triggered refresh counter for real-time error updates
  const [refreshKey, setRefreshKey] = useState(0);
  useSSE({
    onEvent: {
      'error-detected': () => setRefreshKey((k) => k + 1),
    },
  });

  const { data: groups, loading: gl } = useProjectApi<ErrorGroup[]>(`/api/errors/groups?_r=${refreshKey}`);
  const { data: paginated, loading: el } = useProjectApi<PaginatedErrors>(
    `/api/errors/recent?limit=${PAGE_SIZE}&offset=${offset}${typeParam}${searchParam}&_r=${refreshKey}`,
  );
  const { data: sessions, loading: sl } = useProjectApi<SessionSummary[]>(`/api/errors/sessions?limit=50&_r=${refreshKey}`);
  const { data: timeline, loading: tl } = useProjectApi<ErrorTimelineBucket[]>(`/api/errors/timeline?bucket=60&_r=${refreshKey}`);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
    setPage(0);
    if (searchInput.trim()) setTab('errors');
  }, [searchInput, setSearchQuery, setTab]);

  if (gl || el || sl || tl) return <PageLoader />;

  const totalErrors = paginated?.total || 0;
  const errors = paginated?.errors || [];
  const errorTypes = groups?.length || 0;
  const affectedSessions = groups?.reduce((sum, g) => sum + g.sessions, 0) || 0;
  const mostCommon = groups?.[0]?.type || '-';

  const sessionDetail = selectedSession
    ? sessions?.find(s => s.sessionId === selectedSession)
    : null;

  const filteredSessions = typeFilter
    ? (sessions || []).filter(s => s.errors.some(e => e.type === typeFilter))
    : (sessions || []);

  const totalPages = Math.ceil(totalErrors / PAGE_SIZE);

  const handleGroupClick = (errorType: string) => {
    setTypeFilter(errorType);
    setTab('errors');
    setSelectedSession('');
    setPage(0);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSelectedSession('');
    if (newTab !== 'errors') setPage(0);
  };

  const handleClearFilter = () => {
    setTypeFilter('');
    setSearchQuery('');
    setSearchInput('');
    setPage(0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Error Tracing</h2>
        <span className="text-xs text-gray-500">Observability for Claude Code sessions</span>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search errors by message, tool name, or context..."
            className="w-full px-3 py-2 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchInput(''); setPage(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              clear
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Errors" value={totalErrors} color="rose" />
        <KpiCard title="Error Types" value={errorTypes} color="amber" />
        <KpiCard title="Affected Sessions" value={affectedSessions} color="indigo" />
        <KpiCard title="Most Common" value={mostCommon} color="cyan" />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
          {(['groups', 'errors', 'timeline', 'sessions'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t === 'groups' ? 'Error Groups' : t === 'errors' ? 'All Errors' : t === 'timeline' ? 'Timeline' : 'Sessions'}
            </button>
          ))}
        </div>
        {(typeFilter || searchQuery) && (
          <div className="flex items-center gap-2">
            {typeFilter && (
              <Badge label={`type: ${typeFilter.replace(/_/g, ' ')}`} variant="info" />
            )}
            {searchQuery && (
              <Badge label={`search: ${searchQuery.slice(0, 20)}`} variant="default" />
            )}
            <button
              onClick={handleClearFilter}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              clear all
            </button>
          </div>
        )}
      </div>

      {/* Session Detail Overlay */}
      {selectedSession && sessionDetail && (
        <SessionDetailPanel
          session={sessionDetail}
          onClose={() => setSelectedSession('')}
        />
      )}

      {/* Tab Content */}
      {!selectedSession && tab === 'groups' && (
        <ErrorGroupTable groups={groups || []} onGroupClick={handleGroupClick} />
      )}

      {!selectedSession && tab === 'errors' && (
        <ErrorList
          errors={errors}
          total={totalErrors}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onSessionClick={id => { setSelectedSession(id); }}
        />
      )}

      {!selectedSession && tab === 'timeline' && (
        <ErrorTimelineDensity
          buckets={timeline || []}
          errors={errors}
          onSessionClick={id => setSelectedSession(id)}
        />
      )}

      {!selectedSession && tab === 'sessions' && (
        <SessionList sessions={filteredSessions} onSelect={id => setSelectedSession(id)} />
      )}

      {totalErrors === 0 && !selectedSession && (
        <EmptyState title="No errors detected" description="Claude Code session logs are clean" />
      )}
    </div>
  );
}

/* ─── Error Groups Table ─── */

function ErrorGroupTable({ groups, onGroupClick }: { groups: ErrorGroup[]; onGroupClick: (type: string) => void }) {
  if (groups.length === 0) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Error Groups</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500">Type</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Count</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Sessions</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Last Seen</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Sample Message</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.type} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-2">
                <Badge
                  label={g.type.replace(/_/g, ' ')}
                  variant={(TYPE_COLORS[g.type] || 'default') as any}
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => onGroupClick(g.type)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                  title={`View all ${g.count} errors of this type`}
                >
                  {g.count}
                </button>
              </td>
              <td className="px-4 py-2 text-xs text-gray-500 text-right">{g.sessions}</td>
              <td className="px-4 py-2 text-xs text-gray-300 font-mono" title={timeAgo(g.lastSeen)}>{formatExactTime(g.lastSeen)}</td>
              <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                {g.recentMessages[0] || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Individual Error List (the core observability view) ─── */

function ErrorList({
  errors,
  total,
  page,
  totalPages,
  onPageChange,
  onSessionClick,
}: {
  errors: SessionError[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSessionClick: (id: string) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((i: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  if (errors.length === 0) {
    return <EmptyState title="No errors" description="No errors match the current filter" />;
  }

  const start = page * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE + errors.length, total);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Errors {start}–{end} of {total}
        </h3>
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        )}
      </div>
      <div className="divide-y divide-gray-800/50">
        {errors.map((err, i) => {
          const expanded = expandedRows.has(i);
          const isLong = err.message.length > 120;

          return (
            <div
              key={`${err.sessionId}-${err.timestamp}-${i}`}
              className="px-4 py-3 hover:bg-gray-800/20 transition-colors"
            >
              {/* Row header */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Badge
                    label={err.type.replace(/_/g, ' ')}
                    variant={(TYPE_COLORS[err.type] || 'default') as any}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs text-gray-300 ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'} ${isLong ? 'cursor-pointer' : ''}`}
                    onClick={() => toggleRow(i)}
                    title={!expanded ? 'Click to expand details' : 'Click to collapse'}
                  >
                    {expanded ? err.message : err.message.slice(0, 200)}
                    {!expanded && isLong && (
                      <span className="text-indigo-400 ml-1">...more</span>
                    )}
                  </div>

                  {/* Tool context */}
                  {err.context?.toolName && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-amber-400">
                        {err.context.toolName}
                      </span>
                      {err.context.toolInput && (
                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-md">
                          {err.context.toolInput}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded: Preceding action & recent tool chain */}
                  {expanded && (
                    <ErrorContextDetail context={err.context} />
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] text-gray-300 font-mono" title={timeAgo(err.timestamp)}>
                    {formatExactTime(err.timestamp)}
                  </div>
                  <div className="text-[10px] text-gray-600">{timeAgo(err.timestamp)}</div>
                  <button
                    onClick={() => onSessionClick(err.sessionId)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono mt-0.5 transition-colors"
                    title="View full session"
                  >
                    {err.sessionId.slice(0, 8)}
                  </button>
                  {err.context?.messageIndex != null && (
                    <div className="text-[10px] text-gray-600">msg #{err.context.messageIndex}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

/* ─── Error Context Detail (causal chain) ─── */

function ErrorContextDetail({ context }: { context?: SessionError['context'] }) {
  if (!context) return null;
  const { precedingAction, recentTools } = context;
  if (!precedingAction && (!recentTools || recentTools.length === 0)) return null;

  return (
    <div className="mt-2 p-2 bg-gray-900/60 border border-gray-800 rounded-lg space-y-1.5">
      {precedingAction && (
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">What preceded this error:</span>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            {precedingAction}
          </div>
        </div>
      )}
      {recentTools && recentTools.length > 0 && (
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Recent tool chain:</span>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {recentTools.map((t, j) => (
              <div key={j} className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-600">{recentTools.length - j}.</span>
                <span className="font-mono text-amber-400/80">{t.name}</span>
                {t.input && (
                  <span className="text-gray-600 font-mono truncate max-w-sm">{t.input}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Pagination ─── */

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="px-2 py-1 text-xs rounded transition-colors disabled:text-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
      >
        Prev
      </button>
      <span className="text-[10px] text-gray-500 px-2">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="px-2 py-1 text-xs rounded transition-colors disabled:text-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
      >
        Next
      </button>
    </div>
  );
}

/* ─── Error Timeline with Density Chart ─── */

function ErrorTimelineDensity({
  buckets,
  errors,
  onSessionClick,
}: {
  buckets: ErrorTimelineBucket[];
  errors: SessionError[];
  onSessionClick: (id: string) => void;
}) {
  const [selectedBucket, setSelectedBucket] = useState<ErrorTimelineBucket | null>(null);

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  const typeColors: Record<string, string> = {
    tool_failure: 'bg-blue-500',
    prompt_too_long: 'bg-rose-500',
    api_error: 'bg-amber-500',
    hook_error: 'bg-gray-500',
    rate_limit: 'bg-amber-400',
    unknown: 'bg-gray-600',
  };

  const filteredErrors = selectedBucket
    ? errors.filter(e => {
        const ts = new Date(e.timestamp).getTime();
        return ts >= new Date(selectedBucket.start).getTime() && ts < new Date(selectedBucket.end).getTime();
      })
    : errors;

  const formatBucketTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      {/* Density Chart */}
      {buckets.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Error Density (per hour)</h3>
            {selectedBucket && (
              <button
                onClick={() => setSelectedBucket(null)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex items-end gap-px h-24">
            {buckets.map((bucket, i) => {
              const pct = (bucket.count / maxCount) * 100;
              const isSelected = selectedBucket?.start === bucket.start;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end cursor-pointer group relative"
                  onClick={() => setSelectedBucket(isSelected ? null : bucket)}
                  title={`${formatBucketTime(bucket.start)}: ${bucket.count} errors`}
                >
                  <div
                    className={`w-full min-h-[2px] rounded-t transition-all ${
                      isSelected ? 'bg-indigo-400' : 'bg-rose-500/70 group-hover:bg-rose-400'
                    }`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-600">{buckets.length > 0 ? formatBucketTime(buckets[0].start) : ''}</span>
            <span className="text-[9px] text-gray-600">{buckets.length > 0 ? formatBucketTime(buckets[buckets.length - 1].start) : ''}</span>
          </div>
          {/* Type breakdown legend */}
          <div className="flex gap-3 mt-2">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[9px] text-gray-600">{type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtered error list below chart */}
      {selectedBucket && (
        <div className="text-xs text-gray-400 px-1">
          Showing {filteredErrors.length} errors from {formatBucketTime(selectedBucket.start)}
        </div>
      )}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">
          {selectedBucket ? 'Filtered Errors' : 'Recent Errors'}
        </h3>
        <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredErrors.length === 0 && (
            <p className="text-xs text-gray-600">No errors in this time range</p>
          )}
          {filteredErrors.slice(0, 100).map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-2 px-2 hover:bg-gray-800/30 rounded cursor-pointer"
              onClick={() => onSessionClick(err.sessionId)}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[err.type] || 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{err.type.replace(/_/g, ' ')}</span>
                  {err.context?.toolName && (
                    <span className="text-[10px] font-mono px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-amber-400">
                      {err.context.toolName}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300 font-mono">{formatExactTime(err.timestamp)}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(err.timestamp)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">{err.message}</div>
                {err.context?.precedingAction && (
                  <div className="text-[10px] text-gray-600 mt-0.5 truncate">
                    After: {err.context.precedingAction}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Session List ─── */

function SessionList({ sessions, onSelect }: { sessions: SessionSummary[]; onSelect: (id: string) => void }) {
  if (sessions.length === 0) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Recent Sessions</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500">Session</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Branch</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Messages</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Tool Calls</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Errors</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Started</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr
              key={s.sessionId}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
              onClick={() => onSelect(s.sessionId)}
            >
              <td className="px-4 py-2 text-xs text-gray-400 font-mono">{s.sessionId.slice(0, 8)}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{s.gitBranch || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-500 text-right">{s.messageCount}</td>
              <td className="px-4 py-2 text-xs text-gray-500 text-right">{s.toolCallCount}</td>
              <td className="px-4 py-2 text-right">
                {s.errors.length > 0 ? (
                  <Badge label={String(s.errors.length)} variant="error" />
                ) : (
                  <span className="text-xs text-gray-600">0</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-gray-300 font-mono" title={timeAgo(s.startTime)}>{formatExactTime(s.startTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Session Detail Panel ─── */

function SessionDetailPanel({ session, onClose }: { session: SessionSummary; onClose: () => void }) {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleError = (i: number) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-300">
            Session: <span className="font-mono">{session.sessionId.slice(0, 12)}</span>
          </h3>
          <div className="text-[10px] text-gray-600 mt-0.5">
            v{session.version} | {session.gitBranch} | {session.messageCount} messages | {session.toolCallCount} tool calls
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          Back
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="text-xs text-gray-500">
          Started: {new Date(session.startTime).toLocaleString()}
        </div>
        {session.endTime && (
          <div className="text-xs text-gray-500">
            Ended: {new Date(session.endTime).toLocaleString()}
          </div>
        )}
      </div>

      {session.errors.length === 0 ? (
        <p className="text-gray-600 text-xs">No errors in this session</p>
      ) : (
        <div className="space-y-2">
          {session.errors.map((err, i) => {
            const expanded = expandedErrors.has(i);
            const isLong = err.message.length > 150;

            return (
              <div key={i} className="p-3 bg-gray-800/50 rounded-lg border-l-2 border-rose-500/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    label={err.type.replace(/_/g, ' ')}
                    variant="error"
                  />
                  {err.context?.toolName && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-amber-400">
                      {err.context.toolName}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300 font-mono">{formatExactTime(err.timestamp)}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(err.timestamp)}</span>
                </div>

                <div
                  className={`text-xs text-gray-400 ${expanded ? 'whitespace-pre-wrap break-words' : ''} ${isLong ? 'cursor-pointer' : ''}`}
                  onClick={() => toggleError(i)}
                  title={!expanded ? 'Click to expand' : 'Click to collapse'}
                >
                  {expanded ? err.message : err.message.slice(0, 300)}
                  {!expanded && isLong && (
                    <span className="text-indigo-400 ml-1">...more</span>
                  )}
                </div>

                {err.context?.toolInput && (
                  <div className="text-[10px] text-gray-500 font-mono mt-1.5 bg-gray-900/50 px-2 py-1 rounded">
                    {err.context.toolInput}
                  </div>
                )}

                {err.context?.messageIndex != null && (
                  <div className="text-[10px] text-gray-600 mt-1">
                    At message #{err.context.messageIndex}
                  </div>
                )}

                {/* Causal context */}
                {expanded && <ErrorContextDetail context={err.context} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function timeAgo(ts: string): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatExactTime(ts: string): string {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}
