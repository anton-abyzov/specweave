import { useProjectApi } from '../hooks/useProjectApi';
import { useSSE } from '../hooks/useSSE';
import { useState, useCallback, useEffect, useRef } from 'react';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusDonut, buildDonutSegments } from '../components/charts/StatusDonut';
import { Badge, statusBadgeVariant } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import { useProject } from '../hooks/useProject';

interface OverviewData {
  project: {
    name?: string;
    totalIncrements: number;
    activeIncrements: number;
    completedIncrements: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
  };
  analytics: {
    totalEvents: number;
    successRate: number;
    last24hEvents: number;
  };
  costs: {
    totalCost: number;
    totalSavings: number;
    totalTokens: number;
    sessionCount: number;
  };
  notifications: {
    pendingCount: number;
    criticalCount: number;
  };
  sync: {
    platforms: Record<string, { lastImport: string; lastSyncResult: string }>;
  };
}

interface ActivityItem {
  category: string;
  severity: string;
  title: string;
  timestamp?: string;
}

export function OverviewPage() {
  const { data, loading, error } = useProjectApi<OverviewData>('/api/overview');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const { activeProject } = useProject();

  // Seed with recent historical events; re-fetch when project changes
  const lastProjectId = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProject) return;
    if (lastProjectId.current === activeProject.id) return;
    lastProjectId.current = activeProject.id;
    const projectParam = `project=${activeProject.id}`;
    fetch(`/api/activity/stream?limit=20&${projectParam}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok && Array.isArray(json.data)) {
          setActivity(json.data);
        }
      })
      .catch(() => {});
  }, [activeProject]);

  const handleActivity = useCallback((item: unknown) => {
    setActivity((prev) => [item as ActivityItem, ...prev].slice(0, 20));
  }, []);

  useSSE({
    onEvent: {
      activity: handleActivity,
    },
  });

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const donutSegments = buildDonutSegments(data.project.statusBreakdown);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">
        {data.project.name || 'Project'} Overview
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Increments"
          value={data.project.activeIncrements}
          subtitle={`${data.project.totalIncrements} total`}
          color="indigo"
        />
        <KpiCard
          title="Completed"
          value={data.project.completedIncrements}
          subtitle={`${Math.round((data.project.completedIncrements / Math.max(data.project.totalIncrements, 1)) * 100)}% done`}
          color="emerald"
        />
        <KpiCard
          title="Total Cost"
          value={`$${data.costs.totalCost.toFixed(2)}`}
          subtitle={`${data.costs.sessionCount} sessions`}
          color="amber"
        />
        <KpiCard
          title="Events Today"
          value={data.analytics.last24hEvents}
          subtitle={`${data.analytics.totalEvents} total`}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Donut */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Increment Status</h3>
          <div className="flex items-center justify-center">
            <StatusDonut
              segments={donutSegments}
              centerValue={data.project.totalIncrements}
              centerLabel="total"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {donutSegments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.label} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Platforms */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Sync Health</h3>
          <div className="space-y-3">
            {Object.entries(data.sync.platforms).length === 0 ? (
              <p className="text-gray-600 text-xs">No sync platforms configured</p>
            ) : (
              Object.entries(data.sync.platforms).map(([platform, info]) => (
                <div key={platform} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-300 capitalize">{platform}</span>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {info.lastImport ? `Last: ${new Date(info.lastImport).toLocaleDateString()}` : 'Never synced'}
                    </div>
                  </div>
                  <Badge label={info.lastSyncResult || 'unknown'} variant={statusBadgeVariant(info.lastSyncResult)} />
                </div>
              ))
            )}
          </div>

          {/* Notifications summary */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Notifications</span>
              <div className="flex gap-2">
                {data.notifications.criticalCount > 0 && (
                  <Badge label={`${data.notifications.criticalCount} critical`} variant="error" />
                )}
                <Badge
                  label={`${data.notifications.pendingCount} pending`}
                  variant={data.notifications.pendingCount > 0 ? 'warning' : 'default'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Live Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {activity.length === 0 ? (
              <p className="text-gray-600 text-xs">No recent activity</p>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1 slide-in">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    item.severity === 'error' ? 'bg-rose-400' :
                    item.severity === 'warning' ? 'bg-amber-400' : 'bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 truncate">{item.title}</div>
                    <div className="text-[10px] text-gray-600">
                      {item.category}
                      {item.timestamp && ` · ${timeAgo(item.timestamp)}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Type breakdown */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Increment Types</h3>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(data.project.typeBreakdown).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-300 capitalize">{type}</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
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
