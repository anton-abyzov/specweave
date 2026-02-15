import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useCommand } from '../hooks/useCommand.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';

interface PlatformInfo {
  connectionStatus?: string;
  diagnosticMessage?: string;
  configDetail?: string;
  lastImport?: string;
  lastImportCount?: number;
  lastSkippedCount?: number;
  lastSyncResult?: string;
}

interface SyncData {
  platforms: Record<string, PlatformInfo>;
  lastUpdated?: string;
}

interface AuditEntry {
  timestamp: string;
  platform: string;
  operation: string;
  itemId: string;
  result: string;
  direction: string;
  duration?: number;
  message?: string;
  conflict?: boolean;
}

interface AuditSummary {
  [platform: string]: {
    total: number;
    success: number;
    errors: number;
    denied: number;
    lastEntry?: string;
  };
}

type Tab = 'health' | 'audit' | 'conflicts';

function connectionBadgeVariant(status?: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'connected': return 'success';
    case 'sync_failed': return 'warning';
    case 'configured_never_synced': return 'info';
    case 'not_configured':
    default: return 'default';
  }
}

function connectionLabel(status?: string): string {
  switch (status) {
    case 'connected': return 'Connected';
    case 'sync_failed': return 'Sync Failed';
    case 'configured_never_synced': return 'Ready';
    case 'not_configured': return 'Not Configured';
    default: return status || 'Unknown';
  }
}

export function SyncPage() {
  const [tab, setTab] = useState<Tab>('health');
  const { data, loading, error } = useProjectApi<SyncData>('/api/sync/status');
  const { data: audit, loading: al } = useProjectApi<AuditEntry[]>('/api/sync/audit?limit=100');
  const { data: auditSummary, loading: asl } = useProjectApi<AuditSummary>('/api/sync/audit/summary');
  const { execute, running } = useCommand();

  if (loading || al || asl) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const platforms = Object.entries(data.platforms).filter(
    ([key]) => ['github', 'jira', 'ado'].includes(key)
  );

  const totalAudit = audit?.length || 0;
  const errorCount = audit?.filter(e => e.result === 'error').length || 0;
  const conflicts = audit?.filter(e => e.conflict) || [];

  const connectedCount = platforms.filter(([, info]) => info.connectionStatus === 'connected').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Sync Health</h2>
        <button
          onClick={() => execute('sync-push')}
          disabled={running}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
        >
          {running ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Platforms" value={platforms.length} subtitle={`${connectedCount} connected`} color="indigo" />
        <KpiCard title="Audit Entries" value={totalAudit} color="cyan" />
        <KpiCard title="Errors" value={errorCount} color="rose" />
        <KpiCard title="Conflicts" value={conflicts.length} color="amber" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
        {(['health', 'audit', 'conflicts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t === 'health' ? 'Platform Health' : t === 'audit' ? 'Audit Log' : `Conflicts (${conflicts.length})`}
          </button>
        ))}
      </div>

      {tab === 'health' && (
        <>
          {platforms.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No sync platforms configured</p>
              <p className="text-gray-600 text-xs mt-1">Configure GitHub, JIRA, or ADO in your config</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map(([platform, info]) => {
                const summary = auditSummary?.[platform];
                const status = info.connectionStatus || 'unknown';

                return (
                  <div key={platform} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} />
                        <div>
                          <span className="text-sm font-medium text-gray-300 capitalize">{platform}</span>
                          {info.configDetail && (
                            <div className="text-[10px] text-gray-600 mt-0.5">{info.configDetail}</div>
                          )}
                        </div>
                      </div>
                      <Badge
                        label={connectionLabel(status)}
                        variant={connectionBadgeVariant(status)}
                      />
                    </div>

                    {/* Diagnostic message */}
                    {info.diagnosticMessage && (
                      <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-800/30 rounded-lg">
                        {info.diagnosticMessage}
                      </div>
                    )}

                    {/* Action area based on connection status */}
                    {status === 'not_configured' && (
                      <Link
                        to="/config"
                        className="block text-center text-xs text-indigo-400 hover:text-indigo-300 py-2 border border-gray-800 rounded-lg hover:border-indigo-500/30 transition-colors"
                      >
                        Configure in Settings
                      </Link>
                    )}
                    {status === 'configured_never_synced' && (
                      <button
                        onClick={() => execute('sync-push')}
                        disabled={running}
                        className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-2 border border-gray-800 rounded-lg hover:border-indigo-500/30 transition-colors disabled:opacity-50"
                      >
                        {running ? 'Syncing...' : 'Run First Sync'}
                      </button>
                    )}
                    {status === 'sync_failed' && (
                      <button
                        onClick={() => execute('sync-push')}
                        disabled={running}
                        className="w-full text-xs text-amber-400 hover:text-amber-300 py-2 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-colors disabled:opacity-50"
                      >
                        {running ? 'Retrying...' : 'Retry Sync'}
                      </button>
                    )}

                    {/* Connection details */}
                    <div className="space-y-2 mt-3">
                      {info.lastImport && (
                        <InfoRow label="Last Import" value={new Date(info.lastImport).toLocaleString()} />
                      )}
                      {status === 'connected' && !info.lastImport && (
                        <InfoRow label="Status" value="Connected, no imports yet" />
                      )}
                      {info.lastImportCount != null && (
                        <InfoRow label="Items Imported" value={info.lastImportCount.toLocaleString()} />
                      )}
                      {info.lastSkippedCount != null && info.lastSkippedCount > 0 && (
                        <InfoRow label="Skipped" value={info.lastSkippedCount.toLocaleString()} />
                      )}
                      {summary && (
                        <>
                          <div className="border-t border-gray-800 my-2" />
                          <InfoRow label="Total Ops" value={summary.total.toLocaleString()} />
                          <InfoRow label="Success" value={summary.success.toLocaleString()} />
                          {summary.errors > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Errors</span>
                              <Badge label={String(summary.errors)} variant="error" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <AuditTable entries={audit || []} />
      )}

      {tab === 'conflicts' && (
        <AuditTable entries={conflicts} />
      )}

      {data.lastUpdated && (
        <p className="text-xs text-gray-600">
          Last metadata update: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No audit entries</p>
      </div>
    );
  }

  const resultVariant: Record<string, string> = {
    success: 'success',
    error: 'error',
    denied: 'warning',
    skipped: 'default',
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-500">Time</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Platform</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Operation</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Item</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Direction</th>
            <th className="text-left px-4 py-2 text-xs text-gray-500">Result</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500">Duration</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(entry.timestamp)}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <PlatformIcon platform={entry.platform} />
                  <span className="text-xs text-gray-400 capitalize">{entry.platform}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-xs text-gray-400">{entry.operation}</td>
              <td className="px-4 py-2 text-xs text-gray-500 font-mono max-w-[120px] truncate">{entry.itemId || '-'}</td>
              <td className="px-4 py-2">
                <Badge label={entry.direction} variant={entry.direction === 'push' ? 'info' : 'default'} />
              </td>
              <td className="px-4 py-2">
                <Badge label={entry.result} variant={(resultVariant[entry.result] || 'default') as any} />
              </td>
              <td className="px-4 py-2 text-xs text-gray-600 text-right">
                {entry.duration ? `${entry.duration}ms` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-400">{value}</span>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    github: 'bg-gray-700',
    jira: 'bg-blue-700',
    ado: 'bg-blue-600',
  };
  return (
    <div className={`w-5 h-5 rounded ${colors[platform] || 'bg-gray-700'} flex items-center justify-center`}>
      <span className="text-[9px] text-white font-bold">{platform[0]?.toUpperCase()}</span>
    </div>
  );
}

function timeAgo(ts: string): string {
  if (!ts) return '-';
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
    return '-';
  }
}
