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
  rateLimitRemaining: number | null;
  rateLimitTotal: number | null;
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
  repoUrl: string;
  tier1Result?: { passed: boolean; findings: number; score: number };
  tier2Result?: { verdict: string; score: number; threats: string[] };
  updatedAt: string;
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

function trustScore(skill: VerifiedSkill): number {
  const t1 = skill.tier1Result?.score ?? 0;
  const t2 = skill.tier2Result?.score ?? 0;
  if (t1 && t2) return Math.round((t1 + t2) / 2);
  return t1 || t2;
}

function trustScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function trustScoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function popularityRank(skill: VerifiedSkill): number {
  const starWeight = Math.log10(Math.max(skill.stars, 1)) * 20;
  const trust = trustScore(skill);
  return starWeight + trust;
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
  const [skillSearch, setSkillSearch] = useState('');

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
            value={scanner.rateLimitRemaining != null && scanner.rateLimitTotal != null
              ? `${scanner.rateLimitRemaining}/${scanner.rateLimitTotal}`
              : 'No token'}
            subtitle={scanner.rateLimitRemaining != null && scanner.rateLimitTotal != null && scanner.rateLimitTotal > 0
              ? `${Math.round((scanner.rateLimitRemaining / scanner.rateLimitTotal) * 100)}% remaining`
              : 'Set GITHUB_TOKEN in environment'}
            color={scanner.rateLimitRemaining != null && scanner.rateLimitTotal != null
              ? rateLimitColor(scanner.rateLimitRemaining, scanner.rateLimitTotal)
              : 'amber'}
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
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-gray-300 shrink-0">Popular Skills</h3>
          {verifiedSkills.length > 0 && (
            <div className="relative max-w-xs w-full">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Discover popular skills..."
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
          )}
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
          <VerifiedSkillsGrid skills={verifiedSkills} search={skillSearch} />
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

function VerifiedSkillsGrid({ skills, search }: { skills: VerifiedSkill[]; search: string }) {
  const sorted = [...skills].sort((a, b) => popularityRank(b) - popularityRank(a));
  const trendingIds = new Set(sorted.slice(0, 3).map(s => s.id));

  const filtered = search
    ? sorted.filter(s =>
        s.repoFullName.toLowerCase().includes(search.toLowerCase()) ||
        s.author.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  if (filtered.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm">No skills match "{search}"</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {filtered.map(skill => (
        <SkillCard key={skill.id} skill={skill} trending={trendingIds.has(skill.id)} />
      ))}
    </div>
  );
}

function SkillCard({ skill, trending }: { skill: VerifiedSkill; trending: boolean }) {
  const score = trustScore(skill);
  const barColor = trustScoreColor(score);
  const textColor = trustScoreTextColor(score);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors">
      {/* Header: name + badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          {skill.repoUrl ? (
            <a
              href={skill.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-200 hover:text-indigo-300 truncate block transition-colors"
            >
              {skill.repoFullName.split('/').pop()}
            </a>
          ) : (
            <div className="text-sm font-medium text-gray-200 truncate">
              {skill.repoFullName.split('/').pop()}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">{skill.author}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {trending && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/15 text-orange-400 text-[10px] font-medium rounded">
              <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Hot
            </span>
          )}
          <Badge label="Verified" variant="success" />
        </div>
      </div>

      {/* Trust Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Trust</span>
          <span className={`text-xs font-mono font-medium ${textColor}`}>{score}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Footer: stars + link */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {formatCompact(skill.stars)}
        </span>
        {skill.repoUrl && (
          <a
            href={skill.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            View on GitHub
          </a>
        )}
      </div>
    </div>
  );
}

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
