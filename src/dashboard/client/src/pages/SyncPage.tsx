import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { useCommand } from '../hooks/useCommand.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';

// --- Types ---

interface PlatformInfo {
  connectionStatus?: string;
  diagnosticMessage?: string;
  configDetail?: string;
  lastImport?: string;
  lastImportCount?: number;
  lastSkippedCount?: number;
  lastSyncResult?: string;
}

interface RepoStatus {
  repoId: string;
  repoName: string;
  repoPath: string;
  hasSpecweave: boolean;
  platforms: Record<string, PlatformInfo>;
}

interface SyncPermissions {
  canUpsertInternalItems: boolean;
  canUpdateExternalItems: boolean;
  canUpdateStatus: boolean;
  autoSyncOnCompletion: boolean;
}

interface SyncData {
  platforms: Record<string, PlatformInfo>;
  lastUpdated?: string;
  isUmbrella?: boolean;
  repos?: RepoStatus[];
  permissions?: SyncPermissions;
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

// --- Helpers ---

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

// --- Main Page ---

export function SyncPage() {
  const [tab, setTab] = useState<Tab>('health');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useSSEEvent('sync-update', () => setRefreshKey((k) => k + 1));
  const { data, loading, error, refetch } = useProjectApi<SyncData>(`/api/sync/status?_r=${refreshKey}`);
  const { data: audit, loading: al } = useProjectApi<AuditEntry[]>(`/api/sync/audit?limit=100&_r=${refreshKey}`);
  const { data: auditSummary, loading: asl } = useProjectApi<AuditSummary>(`/api/sync/audit/summary?_r=${refreshKey}`);
  const { execute, running } = useCommand();

  const verifyPlatform = async (platform: string, repoId?: string) => {
    const key = repoId ? `${repoId}-${platform}` : platform;
    setVerifying(key);
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const params = new URLSearchParams();
      params.set('platform', platform);
      if (repoId) params.set('repo', repoId);
      if (projectParam) params.set('project', projectParam);
      await fetch(`/api/sync/verify?${params.toString()}`, { method: 'POST' });
      refetch();
    } catch { /* ignore */ }
    setVerifying(null);
  };

  if (loading || al || asl) return <PageLoader />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!data) return null;

  const totalAudit = audit?.length || 0;
  const errorCount = audit?.filter(e => e.result === 'error').length || 0;
  const conflicts = audit?.filter(e => e.conflict) || [];

  // Compute connected count across repos for umbrella, or from top-level for single
  const isUmbrella = data.isUmbrella && data.repos && data.repos.length > 0;
  let connectedCount = 0;
  let totalPlatformCount = 0;

  if (isUmbrella && data.repos) {
    for (const repo of data.repos) {
      const repoPlatforms = Object.values(repo.platforms).filter(p => p.connectionStatus !== 'not_configured');
      totalPlatformCount += repoPlatforms.length;
      connectedCount += repoPlatforms.filter(p => p.connectionStatus === 'connected').length;
    }
  } else {
    const platforms = Object.entries(data.platforms).filter(([k]) => ['github', 'jira', 'ado'].includes(k));
    totalPlatformCount = platforms.length;
    connectedCount = platforms.filter(([, info]) => info.connectionStatus === 'connected').length;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Sync Health</h2>
        {!isUmbrella && (
          <button
            onClick={() => execute('sync-push')}
            disabled={running}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {running ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {/* Permissions Panel */}
      {data.permissions && (
        <PermissionsPanel permissions={data.permissions} onSave={refetch} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={isUmbrella ? 'Repos' : 'Platforms'}
          value={isUmbrella ? data.repos!.length : totalPlatformCount}
          subtitle={`${connectedCount} connected`}
          color="indigo"
        />
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
          {isUmbrella && data.repos ? (
            <UmbrellaHealthView
              repos={data.repos}
              auditSummary={auditSummary}
              verifying={verifying}
              onVerify={verifyPlatform}
              execute={execute}
              running={running}
            />
          ) : (
            <SingleProjectHealthView
              platforms={data.platforms}
              auditSummary={auditSummary}
              verifying={verifying}
              onVerify={verifyPlatform}
            />
          )}
        </>
      )}

      {tab === 'audit' && <AuditTable entries={audit || []} />}
      {tab === 'conflicts' && <AuditTable entries={conflicts} />}

      {data.lastUpdated && (
        <p className="text-xs text-gray-600">
          Last metadata update: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// --- Permissions Panel ---

function PermissionsPanel({ permissions, onSave }: { permissions: SyncPermissions; onSave: () => void }) {
  const [local, setLocal] = useState(permissions);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(local) !== JSON.stringify(permissions);

  const save = async () => {
    setSaving(true);
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const qs = projectParam ? `?project=${projectParam}` : '';
      await fetch(`/api/config${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync: { settings: local } }),
      });
      onSave();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const toggles: Array<{ key: keyof SyncPermissions; label: string; desc: string }> = [
    { key: 'canUpsertInternalItems', label: 'Create/Update Internal', desc: 'Can create/update items created by SpecWeave' },
    { key: 'canUpdateExternalItems', label: 'Update External', desc: 'Can modify items originally from external tools' },
    { key: 'canUpdateStatus', label: 'Update Status', desc: 'Can close/reopen issues on external platforms' },
    { key: 'autoSyncOnCompletion', label: 'Auto-Sync', desc: 'Automatically sync when tasks are completed' },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sync Permissions</span>
        {changed && (
          <button
            onClick={save}
            disabled={saving}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {toggles.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setLocal(prev => ({ ...prev, [key]: !prev[key] }))}
            className={`text-left p-2.5 rounded-lg border transition-colors ${
              local[key]
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-gray-800/30 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${local[key] ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              <span className="text-xs font-medium text-gray-300">{label}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Umbrella Health View (per-repo sections) ---

function UmbrellaHealthView({
  repos,
  auditSummary,
  verifying,
  onVerify,
  execute,
  running,
}: {
  repos: RepoStatus[];
  auditSummary?: AuditSummary | null;
  verifying: string | null;
  onVerify: (platform: string, repoId?: string) => void;
  execute: (cmd: string, params?: Record<string, string>) => void;
  running: boolean;
}) {
  return (
    <div className="space-y-4">
      {repos.map(repo => {
        const platforms = Object.entries(repo.platforms).filter(
          ([key]) => ['github', 'jira', 'ado'].includes(key)
        );
        const configuredPlatforms = platforms.filter(([, info]) => info.connectionStatus !== 'not_configured');

        return (
          <div key={repo.repoId} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            {/* Repo header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{repo.repoName}</span>
                  {repo.hasSpecweave && (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/15 text-emerald-400 rounded">
                      .specweave
                    </span>
                  )}
                  {!repo.hasSpecweave && (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-700/50 text-gray-500 rounded">
                      no .specweave
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600">{repo.repoPath}</span>
              </div>
              <button
                onClick={() => execute('sync-push', { repo: repo.repoId })}
                disabled={running || !repo.hasSpecweave}
                title={!repo.hasSpecweave ? 'Initialize .specweave in this repo to enable sync' : 'Sync this repository'}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
              >
                {running ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {/* Platform cards */}
            {configuredPlatforms.length === 0 ? (
              <div className="text-xs text-gray-600 p-3 bg-gray-800/20 rounded-lg">
                No platforms configured for this repository.
                <Link to="/config" className="ml-1 text-indigo-400 hover:text-indigo-300">Configure</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {configuredPlatforms.map(([platform, info]) => (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    info={info}
                    summary={auditSummary?.[platform]}
                    verifying={verifying === `${repo.repoId}-${platform}`}
                    onVerify={() => onVerify(platform, repo.repoId)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Single Project Health View (backward compatible) ---

function SingleProjectHealthView({
  platforms: rawPlatforms,
  auditSummary,
  verifying,
  onVerify,
}: {
  platforms: Record<string, PlatformInfo>;
  auditSummary?: AuditSummary | null;
  verifying: string | null;
  onVerify: (platform: string) => void;
}) {
  const platforms = Object.entries(rawPlatforms).filter(
    ([key]) => ['github', 'jira', 'ado'].includes(key)
  );

  if (platforms.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No sync platforms configured</p>
        <p className="text-gray-600 text-xs mt-1">Configure GitHub, JIRA, or ADO in your config</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {platforms.map(([platform, info]) => (
        <PlatformCard
          key={platform}
          platform={platform}
          info={info}
          summary={auditSummary?.[platform]}
          verifying={verifying === platform}
          onVerify={() => onVerify(platform)}
        />
      ))}
    </div>
  );
}

// --- Shared Platform Card ---

function PlatformCard({
  platform,
  info,
  summary,
  verifying,
  onVerify,
}: {
  platform: string;
  info: PlatformInfo;
  summary?: { total: number; success: number; errors: number; denied: number };
  verifying: boolean;
  onVerify: () => void;
}) {
  const status = info.connectionStatus || 'unknown';

  return (
    <div className="bg-gray-800/30 border border-gray-800/50 rounded-xl p-4">
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
        <Badge label={connectionLabel(status)} variant={connectionBadgeVariant(status)} />
      </div>

      {/* Diagnostic message */}
      {info.diagnosticMessage && (
        <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-800/30 rounded-lg">
          {info.diagnosticMessage}
        </div>
      )}

      {/* Action area */}
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
          onClick={onVerify}
          disabled={verifying}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-2 border border-gray-800 rounded-lg hover:border-indigo-500/30 transition-colors disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Verify Connection'}
        </button>
      )}
      {status === 'sync_failed' && (
        <button
          onClick={onVerify}
          disabled={verifying}
          className="w-full text-xs text-amber-400 hover:text-amber-300 py-2 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-colors disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Retry Sync'}
        </button>
      )}

      {/* Details */}
      <div className="space-y-2 mt-3">
        {info.lastImport && (
          <InfoRow label="Last Import" value={new Date(info.lastImport).toLocaleString()} />
        )}
        {status === 'connected' && !info.lastImport && (
          <InfoRow label="Status" value="Connected, no imports yet" />
        )}
        {info.lastImportCount != null && info.lastImportCount > 0 && (
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
}

// --- Shared Sub-Components ---

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
