import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { Badge } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';

interface AnalyticsData {
  totalEvents: number;
  successRate: number;
  last24hEvents: number;
  topCommands?: Array<{ name: string; count: number }>;
  topSkills?: Array<{ name: string; plugin?: string; count: number; successCount?: number; failureCount?: number; lastUsed?: string }>;
  topAgents?: Array<{ name: string; count: number }>;
  dailySummaries?: Array<{ date: string; totalEvents: number }>;
}

interface SkillUsage {
  name: string;
  plugin: string;
  count: number;
  successCount: number;
  failureCount: number;
  avgDuration?: number;
  lastUsed: string;
}

type Tab = 'commands' | 'skills' | 'agents' | 'daily';

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('commands');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useSSEEvent('analytics-event', () => setRefreshKey((k) => k + 1));
  const { data, loading, error, refetch, fetchedAt } = useProjectApi<AnalyticsData>(`/api/analytics/summary?_r=${refreshKey}`);
  const { data: skills, loading: sl, refetch: refetchSkills } = useProjectApi<SkillUsage[]>(`/api/analytics/skills?_r=${refreshKey}`);

  if (loading || sl) return <PageLoader />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!data) return null;

  const commandCount = data.topCommands?.reduce((s, c) => s + c.count, 0) || 0;
  const skillCount = data.topSkills?.reduce((s, c) => s + c.count, 0) || 0;
  const agentCount = data.topAgents?.reduce((s, c) => s + c.count, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Analytics</h2>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-[10px] text-gray-600">
              Updated {fetchedAt.toLocaleTimeString()}
            </span>
          )}
          <span className="text-sm text-gray-500">{data.totalEvents.toLocaleString()} total events</span>
          <button
            onClick={() => { setRefreshing(true); refetch(); refetchSkills(); setTimeout(() => setRefreshing(false), 600); }}
            disabled={refreshing}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh analytics"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Events" value={data.totalEvents.toLocaleString()} subtitle={`${data.successRate}% success rate`} color="indigo" tooltip={`${data.totalEvents} events tracked from analytics JSONL`} />
        <KpiCard title="Commands" value={commandCount.toLocaleString()} subtitle={`${data.topCommands?.length || 0} unique`} color="cyan" tooltip={`${commandCount} total command invocations across ${data.topCommands?.length || 0} distinct commands`} />
        <KpiCard title="Skills" value={skillCount.toLocaleString()} subtitle={`${data.topSkills?.length || 0} unique`} color="emerald" tooltip={`${skillCount} total skill activations across ${data.topSkills?.length || 0} distinct skills`} />
        <KpiCard title="Agents" value={agentCount.toLocaleString()} subtitle={`${data.topAgents?.length || 0} unique`} color="amber" tooltip={`${agentCount} agent spawns across ${data.topAgents?.length || 0} distinct agent types`} />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
        {([
          { key: 'commands' as Tab, label: 'Commands' },
          { key: 'skills' as Tab, label: 'Skills' },
          { key: 'agents' as Tab, label: 'Agents' },
          { key: 'daily' as Tab, label: 'Daily Trends' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === t.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'commands' && (
        <CommandsTab commands={data.topCommands || []} />
      )}

      {tab === 'skills' && (
        <SkillLeaderboard skills={skills || []} />
      )}

      {tab === 'agents' && (
        <AgentsTab agents={data.topAgents || []} />
      )}

      {tab === 'daily' && (
        <DailyTrendsTab days={data.dailySummaries || []} />
      )}
    </div>
  );
}

function CommandsTab({ commands }: { commands: Array<{ name: string; count: number }> }) {
  if (commands.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No command data available</p>
      </div>
    );
  }

  const sorted = [...commands].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Top Commands</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500 w-12">Rank</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Command</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Usage</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Count</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cmd, i) => {
            const barWidth = Math.max(2, (cmd.count / maxCount) * 100);
            return (
              <tr key={cmd.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5 text-xs text-gray-600">#{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-gray-300 font-mono">{cmd.name}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500/60 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-gray-400 text-right">{cmd.count.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SkillLeaderboard({ skills }: { skills: SkillUsage[] }) {
  const sorted = [...skills].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No skill usage data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Skill Usage Leaderboard</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500 w-12">Rank</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Skill Name</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Plugin</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Invocations</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Success Rate</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Last Used</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((skill, i) => {
            const successRate = skill.count > 0
              ? Math.round((skill.successCount / skill.count) * 100)
              : 100;
            const rateBadgeVariant = successRate >= 90 ? 'success' as const : successRate >= 70 ? 'warning' as const : 'error' as const;

            return (
              <tr key={skill.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5 text-xs text-gray-600">#{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-gray-300 font-mono">{skill.name}</span>
                </td>
                <td className="px-4 py-2.5">
                  {skill.plugin && (
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                      {skill.plugin}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-gray-400 text-right">{skill.count.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <Badge label={`${successRate}%`} variant={rateBadgeVariant} />
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 text-right whitespace-nowrap">
                  {skill.lastUsed ? timeAgo(skill.lastUsed) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AgentsTab({ agents }: { agents: Array<{ name: string; count: number }> }) {
  if (agents.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No agent data available</p>
      </div>
    );
  }

  const sorted = [...agents].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Top Agents</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500 w-12">Rank</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Agent</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Usage</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Count</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent, i) => {
            const barWidth = Math.max(2, (agent.count / maxCount) * 100);
            return (
              <tr key={agent.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5 text-xs text-gray-600">#{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-gray-300">{agent.name}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500/60 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-gray-400 text-right">{agent.count.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendsTab({ days }: { days: Array<{ date: string; totalEvents: number }> }) {
  const recent = days.slice(-14);

  if (recent.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No daily data available</p>
      </div>
    );
  }

  const max = Math.max(...recent.map(d => d.totalEvents), 1);
  const total = recent.reduce((s, d) => s + d.totalEvents, 0);
  const avg = Math.round(total / recent.length);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Period Total" value={total.toLocaleString()} subtitle={`Last ${recent.length} days`} color="indigo" />
        <KpiCard title="Daily Average" value={avg.toLocaleString()} color="cyan" />
        <KpiCard title="Peak Day" value={max.toLocaleString()} subtitle={recent.find(d => d.totalEvents === max)?.date || ''} color="emerald" />
      </div>

      {/* Bar chart */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Daily Events (Last {recent.length} Days)</h3>
        <div className="flex items-end gap-1.5 h-40">
          {recent.map((d) => {
            const height = Math.max(2, (d.totalEvents / max) * 100);
            const dateLabel = d.date.slice(5); // MM-DD
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-500">{d.totalEvents}</span>
                <div
                  className="w-full bg-indigo-500/40 rounded-t hover:bg-indigo-500/60 transition-colors cursor-default"
                  style={{ height: `${height}%` }}
                  title={`${d.date}: ${d.totalEvents} events`}
                />
                <span className="text-[8px] text-gray-700">{dateLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  if (!ts) return '';
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
    return '';
  }
}
