import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { BarChart } from '../components/charts/BarChart';
import { PageLoader } from '../components/ui/Spinner';

interface AnalyticsData {
  totalEvents: number;
  topCommands?: Array<{ name: string; count: number }>;
  topSkills?: Array<{ name: string; count: number }>;
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

type Tab = 'overview' | 'skills';

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error } = useProjectApi<AnalyticsData>('/api/analytics/summary');
  const { data: skills, loading: sl } = useProjectApi<SkillUsage[]>('/api/analytics/skills');

  if (loading || sl) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const commandCount = data.topCommands?.reduce((s, c) => s + c.count, 0) || 0;
  const skillCount = data.topSkills?.reduce((s, c) => s + c.count, 0) || 0;
  const agentCount = data.topAgents?.reduce((s, c) => s + c.count, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Analytics</h2>
        <span className="text-sm text-gray-500">{data.totalEvents} total events</span>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Events" value={data.totalEvents} color="indigo" />
        <KpiCard title="Commands" value={commandCount} color="cyan" />
        <KpiCard title="Skills" value={skillCount} color="emerald" />
        <KpiCard title="Agents" value={agentCount} color="amber" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
        {(['overview', 'skills'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t === 'overview' ? 'Usage Charts' : 'Skill Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSection title="Top Commands" items={data.topCommands} color="#6366f1" />
          <ChartSection title="Top Skills" items={data.topSkills} color="#10b981" />
          <ChartSection title="Top Agents" items={data.topAgents} color="#06b6d4" />

          {/* Daily Events */}
          {data.dailySummaries && data.dailySummaries.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Daily Events (Last 14 Days)</h3>
              <DailyBarChart days={data.dailySummaries.slice(-14)} />
            </div>
          )}
        </div>
      )}

      {tab === 'skills' && (
        <SkillLeaderboard skills={skills || []} />
      )}
    </div>
  );
}

function ChartSection({ title, items, color }: {
  title: string;
  items?: Array<{ name: string; count: number }>;
  color: string;
}) {
  const barItems = (items || []).map((i) => ({ label: i.name, value: i.count, color }));
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-300 mb-4">{title}</h3>
      {barItems.length > 0 ? (
        <BarChart items={barItems} />
      ) : (
        <p className="text-gray-600 text-xs">No data available</p>
      )}
    </div>
  );
}

function SkillLeaderboard({ skills }: { skills: SkillUsage[] }) {
  const sorted = [...skills].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-600 text-xs">No skill usage data available</p>
      </div>
    );
  }

  const maxCount = sorted[0]?.count || 1;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">Skill Usage Leaderboard</h3>
      </div>
      <div className="divide-y divide-gray-800/50">
        {sorted.map((skill, i) => {
          const successRate = skill.count > 0
            ? Math.round((skill.successCount / skill.count) * 100)
            : 100;
          const barWidth = Math.max(2, (skill.count / maxCount) * 100);

          return (
            <div key={skill.name} className="px-5 py-3 hover:bg-gray-800/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-5 text-right">#{i + 1}</span>
                  <span className="text-sm text-gray-300">{skill.name}</span>
                  {skill.plugin && (
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                      {skill.plugin}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {skill.avgDuration != null && (
                    <span className="text-[10px] text-gray-600">{(skill.avgDuration / 1000).toFixed(1)}s avg</span>
                  )}
                  <Badge
                    label={`${successRate}%`}
                    variant={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}
                  />
                  <span className="text-sm font-mono text-gray-400 w-12 text-right">{skill.count}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2 ml-7">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/60 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {skill.lastUsed && (
                  <span className="text-[10px] text-gray-700 whitespace-nowrap">{timeAgo(skill.lastUsed)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyBarChart({ days }: { days: Array<{ date: string; totalEvents: number }> }) {
  const max = Math.max(...days.map(d => d.totalEvents), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const height = Math.max(2, (d.totalEvents / max) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-indigo-500/40 rounded-t hover:bg-indigo-500/60 transition-colors"
              style={{ height: `${height}%` }}
              title={`${d.date}: ${d.totalEvents} events`}
            />
            <span className="text-[8px] text-gray-700">{d.date.slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(ts: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
