import { Link } from 'react-router-dom';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSE } from '../hooks/useSSE.js';
import { useState, useCallback, useEffect, useRef } from 'react';
import { KpiCard } from '../components/ui/KpiCard.js';
import { StatusDonut, buildDonutSegments } from '../components/charts/StatusDonut.js';
import { Badge, statusBadgeVariant } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { useProject } from '../hooks/useProject.js';

interface OverviewData {
  project: {
    name?: string;
    totalIncrements: number;
    activeIncrements: number;
    completedIncrements: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    priorityBreakdown?: Record<string, number>;
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
    billingContext?: { planType: 'api' | 'subscription'; monthlyAmount?: number };
  };
  notifications: {
    pendingCount: number;
    criticalCount: number;
  };
  sync: {
    platforms: Record<string, {
      connectionStatus?: string;
      diagnosticMessage?: string;
      configDetail?: string;
      lastImport?: string;
      lastSyncResult?: string;
      lastImportCount?: number;
      lastSkippedCount?: number;
    }>;
  };
}

interface ActivityItem {
  category: string;
  severity: string;
  title: string;
  timestamp?: string;
}

function syncStatusVariant(status?: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'connected': return 'success';
    case 'sync_failed': return 'warning';
    case 'configured_never_synced': return 'info';
    case 'not_configured':
    default: return 'default';
  }
}

function syncStatusLabel(status?: string): string {
  switch (status) {
    case 'connected': return 'Connected';
    case 'sync_failed': return 'Sync Failed';
    case 'configured_never_synced': return 'Ready';
    case 'not_configured': return 'Not Configured';
    default: return status || 'Unknown';
  }
}

const isSubscriptionPlan = (costs: OverviewData['costs']): boolean =>
  costs.billingContext?.planType === 'subscription';

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
        <Link to="/increments?status=active" className="group">
          <KpiCard
            title="Active Increments"
            value={data.project.activeIncrements}
            subtitle={`${data.project.totalIncrements} total`}
            color="indigo"
          />
        </Link>
        <Link to="/increments?status=completed" className="group">
          <KpiCard
            title="Completed"
            value={data.project.completedIncrements}
            subtitle={`${Math.round((data.project.completedIncrements / Math.max(data.project.totalIncrements, 1)) * 100)}% done`}
            color="emerald"
          />
        </Link>
        <Link to="/costs" className="group">
          <KpiCard
            title={isSubscriptionPlan(data.costs) ? 'Usage Value' : 'Total Cost'}
            value={`$${data.costs.totalCost.toFixed(2)}`}
            subtitle={isSubscriptionPlan(data.costs)
              ? `$${data.costs.billingContext?.monthlyAmount ?? '?'}/mo plan`
              : `${data.costs.sessionCount.toLocaleString()} sessions`}
            color="amber"
          />
        </Link>
        <Link to="/analytics" className="group">
          <KpiCard
            title="Events Today"
            value={data.analytics.last24hEvents}
            subtitle={`${data.analytics.totalEvents.toLocaleString()} total`}
            color="cyan"
          />
        </Link>
      </div>

      {/* Prompt Health Banner */}
      <PromptHealthBanner />

      {/* Subscription Banner */}
      {isSubscriptionPlan(data.costs) && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Badge label="Subscription" variant="info" />
          <span className="text-xs text-gray-300">
            Costs shown as API-equivalent usage value.
          </span>
        </div>
      )}

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
              <Link
                key={s.label}
                to={`/increments?status=${s.label.toLowerCase()}`}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500 hover:text-gray-300">{s.label} ({s.value})</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sync Platforms */}
        <Link to="/sync" className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors block">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Sync Health</h3>
          <div className="space-y-3">
            {Object.entries(data.sync.platforms).length === 0 ? (
              <p className="text-gray-600 text-xs">No sync platforms configured</p>
            ) : (
              Object.entries(data.sync.platforms).map(([platform, info]) => (
                <div key={platform} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-300 capitalize">{platform}</span>
                    {info.configDetail && (
                      <div className="text-[10px] text-gray-600 mt-0.5">{info.configDetail}</div>
                    )}
                    {!info.configDetail && info.lastImport && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        Last: {new Date(info.lastImport).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <Badge
                    label={syncStatusLabel(info.connectionStatus || info.lastSyncResult)}
                    variant={syncStatusVariant(info.connectionStatus) !== 'default'
                      ? syncStatusVariant(info.connectionStatus)
                      : statusBadgeVariant(info.lastSyncResult || '')}
                  />
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
                  <Link to="/notifications" onClick={(e) => e.stopPropagation()}>
                    <Badge label={`${data.notifications.criticalCount} critical`} variant="error" />
                  </Link>
                )}
                <Link to="/notifications" onClick={(e) => e.stopPropagation()}>
                  <Badge
                    label={`${data.notifications.pendingCount} pending`}
                    variant={data.notifications.pendingCount > 0 ? 'warning' : 'default'}
                  />
                </Link>
              </div>
            </div>
          </div>
        </Link>

        {/* Live Activity Stream */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Live Activity</h3>
            <Link to="/activity" className="text-[10px] text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
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
            <Link
              key={type}
              to={`/increments?type=${type}`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-800/80 transition-colors"
            >
              <span className="text-sm text-gray-300 capitalize">{type}</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{count as number}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PromptHealthData {
  health: {
    baseline: number;
    claudeMdSize: number;
    memoryMdSize: number;
    skillBudget: number;
    warningLevel: string;
  } | null;
  alert: {
    level: string;
    compactionCount: number;
    advice: string;
  } | null;
}

function PromptHealthBanner() {
  const { data } = useProjectApi<PromptHealthData>('/api/prompt-health');

  if (!data?.health || data.health.warningLevel === 'normal') return null;

  const { health, alert } = data;
  const isEmergency = alert?.level === 'emergency';
  const isCritical = health.warningLevel === 'critical' || isEmergency;

  const borderColor = isCritical ? 'border-rose-500/30' : 'border-amber-500/20';
  const bgColor = isCritical ? 'bg-rose-500/10' : 'bg-amber-500/10';
  const textColor = isCritical ? 'text-rose-400' : 'text-amber-400';

  const baselineKb = Math.round(health.baseline / 1000);
  const pct = Math.min(Math.round((health.baseline / 200000) * 100), 100);
  const barColor = isCritical ? 'bg-rose-500' : 'bg-amber-500';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl px-4 py-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge label={isCritical ? 'Critical' : 'Warning'} variant={isCritical ? 'error' : 'warning'} />
          <span className={`text-xs ${textColor}`}>
            Prompt baseline: {baselineKb}KB ({pct}% of context window)
          </span>
        </div>
        <Link to="/errors" className="text-[10px] text-gray-500 hover:text-gray-300">
          Details
        </Link>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-4 text-[10px] text-gray-500">
        <span>CLAUDE.md: {Math.round(health.claudeMdSize / 1000)}KB</span>
        <span>MEMORY.md: {Math.round(health.memoryMdSize / 1000)}KB</span>
        <span>Skills: {Math.round(health.skillBudget / 1000)}KB</span>
        {alert && <span className={textColor}>Compactions: {alert.compactionCount}</span>}
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
