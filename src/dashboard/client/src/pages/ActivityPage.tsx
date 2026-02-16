import { useState, useCallback } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { useUrlState } from '../hooks/useUrlState.js';
import { Badge, statusBadgeVariant } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';

interface ActivityEvent {
  timestamp: string;
  category: string;
  severity: string;
  title: string;
  detail?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

type CategoryFilter = 'all' | 'command' | 'hook' | 'notification' | 'cost';
type SeverityFilter = 'all' | 'info' | 'warning' | 'error';

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'command', label: 'Commands' },
  { value: 'hook', label: 'Hooks' },
  { value: 'notification', label: 'Notifications' },
  { value: 'cost', label: 'Cost' },
];

const SEVERITIES: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

export function ActivityPage() {
  const [categoryUrl, setCategoryUrl] = useUrlState('category', 'all');
  const [severityUrl, setSeverityUrl] = useUrlState('severity', 'all');
  const category = (categoryUrl || 'all') as CategoryFilter;
  const severity = (severityUrl || 'all') as SeverityFilter;

  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [limit, setLimit] = useState(200);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Load historical events from API
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (category !== 'all') params.set('categories', category);
  if (severity !== 'all') params.set('severity', severity);
  const { data: historical, loading } = useProjectApi<ActivityEvent[]>(
    `/api/activity/stream?${params.toString()}`
  );

  // Also receive live SSE events
  const handleActivity = useCallback((item: unknown) => {
    setLiveEvents((prev) => [item as ActivityEvent, ...prev].slice(0, 50));
  }, []);

  useSSEEvent('activity', handleActivity);

  if (loading) return <PageLoader />;

  // Merge live + historical, deduplicate by timestamp+title
  const allEvents = [...liveEvents, ...(historical || [])];
  const seen = new Set<string>();
  const deduped: ActivityEvent[] = [];
  for (const e of allEvents) {
    const key = `${e.timestamp}:${e.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }

  // Apply client-side filters to live events (historical already filtered server-side)
  const filtered = deduped.filter(e => {
    if (category !== 'all' && e.category !== category) return false;
    if (severity !== 'all' && e.severity !== severity) return false;
    return true;
  });

  // KPI stats
  const errorCount = deduped.filter(e => e.severity === 'error').length;
  const warningCount = deduped.filter(e => e.severity === 'warning').length;
  const sourceSet = new Set(deduped.map(e => e.source));

  const toggleRow = (key: string) => {
    setExpandedRow(prev => prev === key ? null : key);
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 200);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Activity Stream</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Events" value={deduped.length} color="indigo" />
        <KpiCard title="Errors" value={errorCount} color="rose" />
        <KpiCard title="Warnings" value={warningCount} color="amber" />
        <KpiCard title="Sources" value={sourceSet.size} color="cyan" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategoryUrl(c.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                category === c.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
          {SEVERITIES.map(s => (
            <button
              key={s.value}
              onClick={() => setSeverityUrl(s.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                severity === s.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 self-center">{filtered.length} events</span>
      </div>

      {/* Event List */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl divide-y divide-gray-800/50">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No events match filters</p>
            <p className="text-gray-600 text-xs mt-1">Try adjusting category or severity filters</p>
          </div>
        ) : (
          <>
            {filtered.slice(0, limit).map((event, i) => {
              const rowKey = `${event.timestamp}-${i}`;
              const isExpanded = expandedRow === rowKey;
              return (
                <EventRow
                  key={rowKey}
                  event={event}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRow(rowKey)}
                />
              );
            })}
            {filtered.length >= limit && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
                >
                  Load more events
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EventRow({ event, isExpanded, onToggle }: { event: ActivityEvent; isExpanded: boolean; onToggle: () => void }) {
  const severityColor = event.severity === 'error' ? 'bg-rose-400' :
    event.severity === 'warning' ? 'bg-amber-400' : 'bg-gray-600';

  const categoryIcon: Record<string, string> = {
    command: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    hook: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101',
    notification: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    cost: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1',
    sync: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581',
  };

  const hasExpandableContent = event.detail || (event.metadata && Object.keys(event.metadata).length > 0);

  return (
    <div>
      <div
        className={`px-4 py-3 flex items-start gap-3 transition-colors ${
          hasExpandableContent ? 'cursor-pointer hover:bg-gray-800/20' : ''
        }`}
        onClick={hasExpandableContent ? onToggle : undefined}
      >
        <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${severityColor}`} />
        <div className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={categoryIcon[event.category] || categoryIcon.command} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">{event.title}</span>
            <Badge label={event.category} variant={statusBadgeVariant(event.severity)} />
          </div>
          {event.detail && !isExpanded && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{event.detail}</p>
          )}
          {event.source && (
            <span className="text-[10px] text-gray-600 mt-0.5 block">via {event.source}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {event.timestamp && (
            <span className="text-[10px] text-gray-600 whitespace-nowrap">
              {timeAgo(event.timestamp)}
            </span>
          )}
          {hasExpandableContent && (
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-3 ml-10 space-y-2">
          {event.detail && (
            <div className="bg-gray-800/50 rounded p-3">
              <span className="text-[10px] text-gray-500 uppercase block mb-1">Detail</span>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{event.detail}</p>
            </div>
          )}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="bg-gray-800/50 rounded p-3">
              <span className="text-[10px] text-gray-500 uppercase block mb-1">Metadata</span>
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
