import { useState } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { useProject } from '../hooks/useProject.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  dismissedAt?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

type FilterMode = 'pending' | 'dismissed' | 'all';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function NotificationsPage() {
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useSSEEvent('notification', () => setRefreshKey((k) => k + 1));
  const { activeProject } = useProject();
  const { data, loading, error, refetch } = useProjectApi<Notification[]>(`/api/notifications?_r=${refreshKey}`);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;

  const notifications = data || [];
  const pending = notifications.filter(n => !n.dismissedAt);
  const dismissed = notifications.filter(n => !!n.dismissedAt);
  const critical = pending.filter(n => n.severity === 'critical');
  const warnings = pending.filter(n => n.severity === 'warning');

  const filtered = filter === 'pending' ? pending :
    filter === 'dismissed' ? dismissed : notifications;

  // Sort by severity (critical first, then warning, then info)
  const sorted = [...filtered].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity] ?? 3;
    const bOrder = SEVERITY_ORDER[b.severity] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDismiss = async (id: string) => {
    setDismissing(id);
    try {
      const projectParam = activeProject ? `?project=${activeProject.id}` : '';
      const res = await fetch(`/api/notifications/${id}/dismiss${projectParam}`, { method: 'POST' });
      if (res.ok) {
        refetch();
      }
    } finally {
      setDismissing(null);
    }
  };

  const handleDismissAll = async () => {
    setDismissing('__all__');
    try {
      const projectParam = activeProject ? `?project=${activeProject.id}` : '';
      for (const n of pending) {
        await fetch(`/api/notifications/${n.id}/dismiss${projectParam}`, { method: 'POST' });
      }
      refetch();
    } finally {
      setDismissing(null);
    }
  };

  const severityVariant = (sev: string) => {
    if (sev === 'critical') return 'error' as const;
    if (sev === 'warning') return 'warning' as const;
    return 'info' as const;
  };

  const severityColor = (sev: string) => {
    if (sev === 'critical') return 'border-l-rose-500';
    if (sev === 'warning') return 'border-l-amber-500';
    return 'border-l-blue-500';
  };

  // Group by severity for display
  const groupedBySeverity = (items: Notification[]) => {
    const groups: Record<string, Notification[]> = {};
    for (const n of items) {
      if (!groups[n.severity]) groups[n.severity] = [];
      groups[n.severity].push(n);
    }
    return groups;
  };

  const groups = groupedBySeverity(sorted);
  const severityLabels: Record<string, string> = {
    critical: 'Critical',
    warning: 'Warnings',
    info: 'Informational',
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Notifications</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Pending" value={pending.length} color="indigo" />
        <KpiCard title="Critical" value={critical.length} color="rose" />
        <KpiCard title="Warnings" value={warnings.length} color="amber" />
        <KpiCard title="Dismissed" value={dismissed.length} color="cyan" />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
          {([
            { value: 'pending' as FilterMode, label: `Pending (${pending.length})` },
            { value: 'dismissed' as FilterMode, label: `Dismissed (${dismissed.length})` },
            { value: 'all' as FilterMode, label: `All (${notifications.length})` },
          ]).map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filter === f.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {pending.length > 0 && (
          <button
            onClick={handleDismissAll}
            disabled={dismissing === '__all__'}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {dismissing === '__all__' ? 'Dismissing...' : 'Dismiss All'}
          </button>
        )}
      </div>

      {/* Notification List - Grouped by Severity */}
      {sorted.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">
            {filter === 'pending' ? 'No pending notifications' : 'No notifications'}
          </p>
          <p className="text-gray-600 text-xs mt-1 max-w-xs mx-auto">
            Notifications appear here when imports complete, discrepancies are found, or syncs fail
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {['critical', 'warning', 'info'].map(sev => {
            const items = groups[sev];
            if (!items || items.length === 0) return null;
            return (
              <div key={sev}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-medium text-gray-400 uppercase">
                    {severityLabels[sev] || sev}
                  </h3>
                  <span className="text-[10px] text-gray-600">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map(n => (
                    <div
                      key={n.id}
                      className={`bg-gray-900/50 border border-gray-800 border-l-4 ${severityColor(n.severity)} rounded-xl p-4 flex items-start gap-4 ${
                        n.dismissedAt ? 'opacity-60' : ''
                      }`}
                    >
                      <SeverityIcon severity={n.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-200">{n.title}</span>
                          <Badge label={n.severity} variant={severityVariant(n.severity)} />
                          {n.type && (
                            <Badge label={n.type} variant="default" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-gray-400 mb-2">{n.message}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                          {n.source && <span>via {n.source}</span>}
                          {n.dismissedAt && <span>Dismissed {new Date(n.dismissedAt).toLocaleString()}</span>}
                        </div>
                      </div>
                      {!n.dismissedAt && (
                        <button
                          onClick={() => handleDismiss(n.id)}
                          disabled={dismissing === n.id}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          {dismissing === n.id ? '...' : 'Dismiss'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'critical') {
    return (
      <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    );
  }
  if (severity === 'warning') {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}
