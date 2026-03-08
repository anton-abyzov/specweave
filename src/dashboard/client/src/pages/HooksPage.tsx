import { useState, useMemo } from 'react';
import { useProjectApi } from '../hooks/useProjectApi';
import { useSSEEvent } from '../contexts/SSEContext';
import { useUrlState } from '../hooks/useUrlState';
import { Badge } from '../components/ui/Badge';

interface HookEventItem {
  id: string;
  eventName: string;
  sessionId: string;
  timestamp: string;
  payload: unknown;
  result?: { decision?: string; reason?: string };
  durationMs?: number;
}

const EVENT_TYPE_OPTIONS = [
  'All', 'PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
  'TaskCompleted', 'UserPromptSubmit', 'PostToolUseFailure',
  'PermissionRequest', 'SessionStart', 'SessionEnd',
  'Notification', 'SubagentStart', 'ConfigChange',
  'PreCompact', 'TeammateIdle',
];

const TIME_RANGES = [
  { label: 'All time', value: '0' },
  { label: 'Last 1h', value: '3600000' },
  { label: 'Last 6h', value: '21600000' },
  { label: 'Last 24h', value: '86400000' },
];

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function collapseConsecutive(events: HookEventItem[]): Array<{ type: string; count: number; events: HookEventItem[]; collapsed: boolean }> {
  const groups: Array<{ type: string; count: number; events: HookEventItem[]; collapsed: boolean }> = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.type === event.eventName && last.count < 100) {
      last.count++;
      last.events.push(event);
    } else {
      groups.push({ type: event.eventName, count: 1, events: [event], collapsed: true });
    }
  }
  return groups;
}

export function HooksPage() {
  const { data, loading } = useProjectApi<{ data: HookEventItem[] }>('/api/hooks/events?limit=200');
  const [liveEvents, setLiveEvents] = useState<HookEventItem[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useUrlState('eventType', 'All');
  const [sessionFilter, setSessionFilter] = useUrlState('session', '');
  const [timeRange, setTimeRange] = useUrlState('range', '0');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  useSSEEvent('hook-event', (eventData) => {
    const event = eventData as HookEventItem;
    if (event.id) {
      setLiveEvents(prev => [event, ...prev].slice(0, 50));
    }
  });

  const allEvents = useMemo(() => {
    const historical = data?.data ?? [];
    const seen = new Set(historical.map(e => e.id));
    const merged = [...liveEvents.filter(e => !seen.has(e.id)), ...historical];
    return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data, liveEvents]);

  const filtered = useMemo(() => {
    let result = allEvents;
    if (eventTypeFilter !== 'All') {
      result = result.filter(e => e.eventName === eventTypeFilter);
    }
    if (sessionFilter) {
      result = result.filter(e => e.sessionId.includes(sessionFilter));
    }
    const rangeMs = parseInt(timeRange, 10);
    if (rangeMs > 0) {
      const cutoff = Date.now() - rangeMs;
      result = result.filter(e => new Date(e.timestamp).getTime() > cutoff);
    }
    return result;
  }, [allEvents, eventTypeFilter, sessionFilter, timeRange]);

  const groups = useMemo(() => collapseConsecutive(filtered), [filtered]);

  if (loading && !data) {
    return <div className="p-6 text-center text-gray-500">Loading hook events...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-100">Hook Events</h1>
        <span className="text-sm text-gray-500">{filtered.length} events</span>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={eventTypeFilter}
          onChange={e => setEventTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          {EVENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="text"
          placeholder="Filter by session ID..."
          value={sessionFilter}
          onChange={e => setSessionFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5 w-48"
        />
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Event timeline */}
      <div className="space-y-1">
        {groups.map((group, gi) => {
          const isExpanded = expandedGroups.has(gi);
          const showEvents = group.count === 1 || isExpanded ? group.events : [group.events[0]];

          return (
            <div key={gi}>
              {group.count > 1 && (
                <button
                  onClick={() => {
                    setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(gi)) next.delete(gi); else next.add(gi);
                      return next;
                    });
                  }}
                  className="w-full text-left px-3 py-1 text-xs text-gray-500 hover:text-gray-300 bg-gray-900 rounded"
                >
                  {isExpanded ? '▾' : '▸'} {group.count}× {group.type}
                </button>
              )}
              {showEvents.map(event => {
                const isDeny = event.result?.decision === 'deny' || event.result?.decision === 'block';
                return (
                  <div key={event.id}>
                    <button
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded text-sm hover:bg-gray-800/50 ${isDeny ? 'bg-red-950/30 border border-red-900/40' : ''}`}
                    >
                      <span className="text-gray-500 text-xs font-mono w-16 shrink-0">{timeAgo(event.timestamp)}</span>
                      <Badge label={event.eventName} variant={isDeny ? 'error' : 'default'} />
                      <span className="text-gray-400 text-xs truncate">{event.sessionId.slice(0, 12)}</span>
                      {event.durationMs != null && (
                        <span className="text-gray-600 text-xs ml-auto">{event.durationMs}ms</span>
                      )}
                    </button>
                    {expandedId === event.id && (
                      <pre className="mx-3 mb-2 p-3 bg-gray-900 rounded text-xs text-gray-400 overflow-x-auto max-h-64">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="text-center text-gray-600 py-8">No hook events yet</div>
        )}
      </div>
    </div>
  );
}
