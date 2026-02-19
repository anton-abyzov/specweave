import { useState, useCallback } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useSSEEvent } from '../contexts/SSEContext.js';
import { useCommand } from '../hooks/useCommand.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';
import { CommandOutput } from '../components/ui/CommandOutput.js';

// --- Types ---

interface ScannerStatus {
  running: boolean;
  lastScanTime?: string;
  reposScanned: number;
  rateLimitRemaining: number;
  rateLimitTotal: number;
}

interface QueueItem {
  id: string;
  repoFullName: string;
  author: string;
  stars: number;
  status: string;
  tier: string;
  securityScore: number;
  discoveredAt: string;
  repoUrl?: string;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
}

interface VerifiedSkill {
  id: string;
  repoFullName: string;
  author: string;
  stars: number;
  securityScore: number;
  repoUrl?: string;
  verifiedAt?: string;
}

interface InsightsData {
  totalDiscovered: number;
  totalVerified: number;
  totalRejected: number;
  totalPending: number;
  tier1PassRate: number;
  tier2PassRate: number;
}

// --- Constants ---

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'discovered', label: 'Discovered' },
  { value: 'scanning', label: 'Scanning' },
  { value: 'tier1_passed', label: 'Passed' },
  { value: 'tier1_failed', label: 'Failed' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const PAGE_SIZE = 20;

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'discovered': return 'default';
    case 'queued': return 'info';
    case 'scanning': return 'warning';
    case 'tier1_passed': return 'success';
    case 'tier1_failed': return 'error';
    case 'tier2_pending': return 'info';
    case 'verified': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'discovered': return 'Discovered';
    case 'queued': return 'Queued';
    case 'scanning': return 'Scanning';
    case 'tier1_passed': return 'T1 Passed';
    case 'tier1_failed': return 'T1 Failed';
    case 'tier2_pending': return 'T2 Pending';
    case 'verified': return 'Verified';
    case 'rejected': return 'Rejected';
    default: return status;
  }
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

function securityScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

type KpiColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan';

function rateLimitColor(remaining: number, total: number): KpiColor {
  if (total === 0) return 'rose';
  const pct = remaining / total;
  if (pct > 0.5) return 'emerald';
  if (pct > 0.1) return 'amber';
  return 'rose';
}

// --- Main Component ---

export function MarketplacePage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { execute, running, output, status: cmdStatus, reset } = useCommand();

  // Data fetching
  const queueParams = statusFilter
    ? `status=${statusFilter}&limit=${PAGE_SIZE}&offset=${offset}`
    : `limit=${PAGE_SIZE}&offset=${offset}`;

  const { data: scanner, loading: scannerLoading, error: scannerError, refetch: refetchScanner } =
    useProjectApi<ScannerStatus>(`/api/marketplace/scanner/status?_r=${refreshKey}`);
  const { data: queue, loading: queueLoading, refetch: refetchQueue } =
    useProjectApi<QueueResponse>(`/api/marketplace/queue?${queueParams}&_r=${refreshKey}`);
  const { data: verified, loading: verifiedLoading, refetch: refetchVerified } =
    useProjectApi<VerifiedSkill[]>(`/api/marketplace/verified?_r=${refreshKey}`);
  const { data: insights, loading: insightsLoading, refetch: refetchInsights } =
    useProjectApi<InsightsData>(`/api/marketplace/insights?_r=${refreshKey}`);

  // SSE real-time updates
  const refetchAll = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useSSEEvent('submission-update', useCallback(() => {
    refetchAll();
  }, [refetchAll]));

  useSSEEvent('marketplace-scan', useCallback(() => {
    refetchAll();
  }, [refetchAll]));

  useSSEEvent('verification-complete', useCallback(() => {
    refetchAll();
  }, [refetchAll]));

  // Actions
  const startScanner = async () => {
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const qs = projectParam ? `?project=${projectParam}` : '';
      await fetch(`/api/marketplace/scanner/start${qs}`, { method: 'POST' });
      refetchScanner();
    } catch { /* ignore */ }
  };

  const stopScanner = async () => {
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const qs = projectParam ? `?project=${projectParam}` : '';
      await fetch(`/api/marketplace/scanner/stop${qs}`, { method: 'POST' });
      refetchScanner();
    } catch { /* ignore */ }
  };

  const approveSubmission = async (id: string) => {
    setActionLoading(id);
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const qs = projectParam ? `?project=${projectParam}` : '';
      await fetch(`/api/marketplace/queue/${id}/approve${qs}`, { method: 'POST' });
      refetchQueue();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const rejectSubmission = async (id: string) => {
    setActionLoading(id);
    try {
      const projectParam = new URLSearchParams(window.location.search).get('project') || '';
      const qs = projectParam ? `?project=${projectParam}` : '';
      await fetch(`/api/marketplace/queue/${id}/reject${qs}`, { method: 'POST' });
      refetchQueue();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const isLoading = scannerLoading && queueLoading && verifiedLoading && insightsLoading;
  if (isLoading) return <PageLoader />;

  const queueItems = queue?.items || [];
  const queueTotal = queue?.total || 0;
  const verifiedSkills = verified || [];
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(queueTotal / PAGE_SIZE);

  const canApproveReject = (status: string) =>
    status === 'tier1_passed' || status === 'tier2_pending';

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Marketplace Scanner</h2>
        <div className="flex gap-2">
          {scanner?.running ? (
            <button
              onClick={stopScanner}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
            >
              Stop Scanner
            </button>
          ) : (
            <button
              onClick={startScanner}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
            >
              Start Scanner
            </button>
          )}
        </div>
      </div>

      {/* Command Output */}
      <CommandOutput lines={output} status={cmdStatus} onDismiss={reset} />

      {/* Scanner Error */}
      {scannerError && <ErrorAlert message={scannerError} onRetry={refetchScanner} />}

      {/* Section 1: Scanner Status KPIs */}
      {scanner ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Scanner"
            value={scanner.running ? 'Running' : 'Stopped'}
            subtitle={scanner.running ? 'Active' : 'Idle'}
            color={scanner.running ? 'emerald' : 'amber'}
          />
          <KpiCard
            title="Last Scan"
            value={scanner.lastScanTime ? timeAgo(scanner.lastScanTime) : 'Never'}
            color="cyan"
          />
          <KpiCard
            title="Repos Scanned"
            value={scanner.reposScanned}
            color="indigo"
          />
          <KpiCard
            title="Rate Limit"
            value={`${scanner.rateLimitRemaining}/${scanner.rateLimitTotal}`}
            subtitle={scanner.rateLimitTotal > 0
              ? `${Math.round((scanner.rateLimitRemaining / scanner.rateLimitTotal) * 100)}% remaining`
              : 'Unknown'}
            color={rateLimitColor(scanner.rateLimitRemaining, scanner.rateLimitTotal)}
          />
        </div>
      ) : !scannerLoading && !scannerError ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <div className="text-gray-400 text-sm mb-2">No scanner data available</div>
          <p className="text-gray-600 text-xs mb-4">
            Start the marketplace scanner to discover and verify community skills.
          </p>
          <button
            onClick={startScanner}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Start Scanner
          </button>
        </div>
      ) : null}

      {/* Section 2: Submission Queue */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Submission Queue</h3>
          <span className="text-xs text-gray-500">{queueTotal} total</span>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setOffset(0); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Queue Table */}
        {queueLoading ? (
          <div className="p-8 flex justify-center"><PageLoader /></div>
        ) : queueItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No submissions found</p>
            <p className="text-gray-600 text-xs mt-1">
              {statusFilter ? 'Try a different filter.' : 'Submissions will appear here once the scanner discovers repos.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Repo</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Author</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Stars</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Tier</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Security</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Discovered</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2">
                        {item.repoUrl ? (
                          <a
                            href={item.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                          >
                            {item.repoFullName}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 font-mono">{item.repoFullName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">{item.author}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 text-right font-mono">{item.stars.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <Badge label={statusLabel(item.status)} variant={statusToBadgeVariant(item.status)} />
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">{item.tier || '-'}</td>
                      <td className={`px-4 py-2 text-xs text-right font-mono ${securityScoreColor(item.securityScore)}`}>
                        {item.securityScore != null ? item.securityScore : '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{timeAgo(item.discoveredAt)}</td>
                      <td className="px-4 py-2 text-right">
                        {canApproveReject(item.status) && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => approveSubmission(item.id)}
                              disabled={actionLoading === item.id}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] rounded transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectSubmission(item.id)}
                              disabled={actionLoading === item.id}
                              className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-[10px] rounded transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {queueTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  {offset + 1}-{Math.min(offset + PAGE_SIZE, queueTotal)} of {queueTotal}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1 text-xs text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={offset + PAGE_SIZE >= queueTotal}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 3: Verified Skills Gallery */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Verified Skills</h3>
        </div>

        {verifiedLoading ? (
          <div className="p-8 flex justify-center"><PageLoader /></div>
        ) : verifiedSkills.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No verified skills yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Skills will appear here after passing security verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {verifiedSkills.map(skill => (
              <div key={skill.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-200 truncate">{skill.repoFullName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{skill.author}</div>
                  </div>
                  <Badge label="Verified" variant="success" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {skill.stars.toLocaleString()}
                    </span>
                    <span className={`text-xs font-mono ${securityScoreColor(skill.securityScore)}`}>
                      Score: {skill.securityScore}
                    </span>
                  </div>
                  {skill.repoUrl && (
                    <a
                      href={skill.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Insights */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Insights</h3>
        </div>

        {insightsLoading ? (
          <div className="p-8 flex justify-center"><PageLoader /></div>
        ) : insights ? (
          <div className="p-4 space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Discovered" value={insights.totalDiscovered} color="cyan" />
              <KpiCard title="Verified" value={insights.totalVerified} color="emerald" />
              <KpiCard title="Rejected" value={insights.totalRejected} color="rose" />
              <KpiCard title="Pending" value={insights.totalPending} color="amber" />
            </div>

            {/* Pass Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PassRateBar label="Tier 1 Pass Rate" rate={insights.tier1PassRate} />
              <PassRateBar label="Tier 2 Pass Rate" rate={insights.tier2PassRate} />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No insights data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function PassRateBar({ label, rate }: { label: string; rate: number }) {
  const pct = Math.round(rate);
  const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm font-bold text-gray-200">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
