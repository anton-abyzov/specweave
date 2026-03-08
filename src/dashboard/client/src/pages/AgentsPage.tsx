import { useState, useMemo, useEffect } from 'react';
import { useProjectApi } from '../hooks/useProjectApi';
import { useSSEEvent } from '../contexts/SSEContext';
import { useUrlState } from '../hooks/useUrlState';
import { Badge } from '../components/ui/Badge';

interface AgentItem {
  agentId: string;
  agentType: string;
  sessionId: string;
  startedAt: string;
  stoppedAt?: string;
  durationMs?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function AgentsPage() {
  const { data, loading } = useProjectApi<{ data: AgentItem[] }>('/api/hooks/agents');
  const [liveAgents, setLiveAgents] = useState<AgentItem[]>([]);
  const [sessionFilter, setSessionFilter] = useUrlState('session', '');
  const [, setTick] = useState(0);

  useSSEEvent('hook-agent', (agentData) => {
    const agent = agentData as AgentItem;
    if (agent.agentId) {
      setLiveAgents(prev => {
        const idx = prev.findIndex(a => a.agentId === agent.agentId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...agent };
          return updated;
        }
        return [agent, ...prev];
      });
    }
  });

  const allAgents = useMemo(() => {
    const historical = data?.data ?? [];
    const ids = new Set(historical.map(a => a.agentId));
    return [...liveAgents.filter(a => !ids.has(a.agentId)), ...historical];
  }, [data, liveAgents]);

  const filtered = useMemo(() => {
    if (!sessionFilter) return allAgents;
    return allAgents.filter(a => a.sessionId.includes(sessionFilter));
  }, [allAgents, sessionFilter]);

  const sessions = useMemo(() => {
    const set = new Set(allAgents.map(a => a.sessionId));
    return Array.from(set);
  }, [allAgents]);

  const runningCount = useMemo(() => filtered.filter(a => !a.stoppedAt).length, [filtered]);

  // Only tick when agents are actively running (live duration display)
  useEffect(() => {
    if (runningCount === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [runningCount]);

  const avgDuration = useMemo(() => {
    const completed = filtered.filter(a => a.durationMs != null);
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((sum, a) => sum + (a.durationMs ?? 0), 0) / completed.length);
  }, [filtered]);

  if (loading && !data) {
    return <div className="p-6 text-center text-gray-500">Loading agents...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-100">Agents</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>Total: {filtered.length}</span>
          <span>Running: {runningCount}</span>
          <span>Avg duration: {formatDuration(avgDuration)}</span>
        </div>
      </div>

      {/* Session filter */}
      <div className="flex gap-3">
        <select
          value={sessionFilter}
          onChange={e => setSessionFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s} value={s}>{s.slice(0, 20)}</option>)}
        </select>
      </div>

      {/* Agent table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="py-2 px-3">Agent ID</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Session</th>
              <th className="py-2 px-3">Started</th>
              <th className="py-2 px-3">Stopped</th>
              <th className="py-2 px-3">Duration</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(agent => {
              const isRunning = !agent.stoppedAt;
              const duration = isRunning
                ? Date.now() - new Date(agent.startedAt).getTime()
                : (agent.durationMs ?? 0);

              return (
                <tr key={agent.agentId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 px-3 font-mono text-xs text-gray-300">{agent.agentId.slice(0, 16)}</td>
                  <td className="py-2 px-3 text-gray-300">{agent.agentType}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{agent.sessionId.slice(0, 12)}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{new Date(agent.startedAt).toLocaleTimeString()}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {agent.stoppedAt ? new Date(agent.stoppedAt).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{formatDuration(duration)}</td>
                  <td className="py-2 px-3">
                    <Badge
                      label={isRunning ? 'running' : 'stopped'}
                      variant={isRunning ? 'success' : 'default'}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-600">No agents tracked yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
