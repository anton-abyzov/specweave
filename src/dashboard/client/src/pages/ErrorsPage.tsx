import { useProjectApi } from '../hooks/useProjectApi.js';
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
  context?: { lastToolCall?: string; messageIndex?: number };
}

interface ErrorGroup {
  type: string;
  count: number;
  lastSeen: string;
  sessions: number;
  recentMessages: string[];
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

type Tab = 'groups' | 'timeline' | 'sessions';

const TYPE_COLORS: Record<string, string> = {
  prompt_too_long: 'error',
  api_error: 'warning',
  tool_failure: 'info',
  hook_error: 'default',
  rate_limit: 'warning',
  unknown: 'default',
};

export function ErrorsPage() {
  const [tab, setTab] = useUrlState('tab', 'groups');
  const [typeFilter, setTypeFilter] = useUrlState('type', '');
  const [selectedSession, setSelectedSession] = useUrlState('session', '');

  const { data: groups, loading: gl } = useProjectApi<ErrorGroup[]>('/api/errors/groups');
  const { data: errors, loading: el } = useProjectApi<SessionError[]>('/api/errors/recent?limit=100');
  const { data: sessions, loading: sl } = useProjectApi<SessionSummary[]>('/api/errors/sessions?limit=30');

  if (gl || el || sl) return <PageLoader />;

  const totalErrors = errors?.length || 0;
  const errorTypes = groups?.length || 0;
  const affectedSessions = new Set(errors?.map(e => e.sessionId)).size;
  const mostCommon = groups?.[0]?.type || '-';

  const sessionDetail = selectedSession
    ? sessions?.find(s => s.sessionId === selectedSession)
    : null;

  // Filter errors/sessions by type if a type filter is set
  const filteredErrors = typeFilter
    ? (errors || []).filter(e => e.type === typeFilter)
    : (errors || []);

  const filteredSessions = typeFilter
    ? (sessions || []).filter(s => s.errors.some(e => e.type === typeFilter))
    : (sessions || []);

  const handleGroupCountClick = (errorType: string) => {
    setTypeFilter(errorType);
    setTab('sessions');
    setSelectedSession('');
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSelectedSession('');
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
  };

  const handleBackFromSession = () => {
    setSelectedSession('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Error Tracing</h2>
        <span className="text-xs text-gray-500">New Relic-style error investigation</span>
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
          {(['groups', 'timeline', 'sessions'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t === 'groups' ? 'Error Groups' : t === 'timeline' ? 'Timeline' : 'Sessions'}
            </button>
          ))}
        </div>
        {typeFilter && (
          <div className="flex items-center gap-1">
            <Badge label={`type: ${typeFilter.replace(/_/g, ' ')}`} variant="info" />
            <button
              onClick={() => setTypeFilter('')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              clear
            </button>
          </div>
        )}
      </div>

      {/* Session Detail Overlay */}
      {selectedSession && sessionDetail && (
        <SessionDetailPanel
          session={sessionDetail}
          onClose={handleBackFromSession}
        />
      )}

      {/* Tab Content */}
      {!selectedSession && tab === 'groups' && (
        <ErrorGroupTable groups={groups || []} onGroupClick={handleGroupCountClick} />
      )}

      {!selectedSession && tab === 'timeline' && (
        <ErrorTimeline errors={filteredErrors} onSessionClick={handleSessionSelect} />
      )}

      {!selectedSession && tab === 'sessions' && (
        <SessionList sessions={filteredSessions} onSelect={handleSessionSelect} />
      )}

      {totalErrors === 0 && !selectedSession && (
        <EmptyState title="No errors detected" description="Claude Code session logs are clean" />
      )}
    </div>
  );
}

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
                  title="View sessions with this error type"
                >
                  {g.count}
                </button>
              </td>
              <td className="px-4 py-2 text-xs text-gray-500 text-right">{g.sessions}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(g.lastSeen)}</td>
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

function ErrorTimeline({ errors, onSessionClick }: { errors: SessionError[]; onSessionClick: (id: string) => void }) {
  if (errors.length === 0) return null;

  const severityDot: Record<string, string> = {
    prompt_too_long: 'bg-rose-400',
    api_error: 'bg-amber-400',
    tool_failure: 'bg-blue-400',
    hook_error: 'bg-gray-400',
    rate_limit: 'bg-amber-400',
    unknown: 'bg-gray-500',
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-300 mb-4">Error Timeline</h3>
      <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
        {errors.map((err, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-2 px-2 hover:bg-gray-800/30 rounded cursor-pointer"
            onClick={() => onSessionClick(err.sessionId)}
          >
            <div className="flex flex-col items-center mt-1">
              <div className={`w-2 h-2 rounded-full ${severityDot[err.type] || 'bg-gray-500'}`} />
              {i < errors.length - 1 && <div className="w-px h-full bg-gray-800 mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">
                  {err.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-gray-600">{timeAgo(err.timestamp)}</span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{err.message}</div>
              <div className="text-[10px] text-gray-700 font-mono mt-0.5">
                Session: {err.sessionId.slice(0, 8)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
              <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(s.startTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionDetailPanel({ session, onClose }: { session: SessionSummary; onClose: () => void }) {
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
          {session.errors.map((err, i) => (
            <div key={i} className="p-3 bg-gray-800/50 rounded-lg border-l-2 border-rose-500/50">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  label={err.type.replace(/_/g, ' ')}
                  variant="error"
                />
                <span className="text-[10px] text-gray-600">{timeAgo(err.timestamp)}</span>
              </div>
              <div className="text-xs text-gray-400 break-words">{err.message}</div>
              {err.context?.messageIndex != null && (
                <div className="text-[10px] text-gray-600 mt-1">
                  At message #{err.context.messageIndex}
                  {err.context.lastToolCall && ` | Tool: ${err.context.lastToolCall.slice(0, 20)}`}
                </div>
              )}
            </div>
          ))}
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
