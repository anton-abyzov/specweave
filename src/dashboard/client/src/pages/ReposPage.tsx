import { useProjectApi } from '../hooks/useProjectApi.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';

interface RepoInfo {
  name: string;
  org: string;
  path: string;
  remote?: string;
  branch?: string;
  hasSpecweave: boolean;
  isCurrent?: boolean;
  lastModified?: string;
}

/** Convert SSH remote URL to HTTPS GitHub URL */
function sshToHttps(remote?: string): string | null {
  if (!remote) return null;
  // Already HTTPS
  if (remote.startsWith('https://')) {
    return remote.replace(/\.git$/, '');
  }
  // SSH format: git@github.com:org/repo.git
  const sshMatch = remote.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  // ssh://git@github.com/org/repo.git
  const sshProtoMatch = remote.match(/^ssh:\/\/git@([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshProtoMatch) {
    return `https://${sshProtoMatch[1]}/${sshProtoMatch[2]}`;
  }
  return null;
}

export function ReposPage() {
  const { data, loading, error } = useProjectApi<RepoInfo[]>('/api/repos');

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;

  const repos = data || [];
  const orgs = [...new Set(repos.map(r => r.org))];
  const withSpecweave = repos.filter(r => r.hasSpecweave).length;
  const currentRepo = repos.find(r => r.isCurrent);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Repositories</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Repositories" value={repos.length} color="indigo" />
        <KpiCard title="Organizations" value={orgs.length} color="cyan" />
        <KpiCard title="With SpecWeave" value={withSpecweave} color="emerald" />
        <KpiCard
          title="Current"
          value={currentRepo ? currentRepo.name : '-'}
          subtitle={currentRepo ? `${currentRepo.org}/${currentRepo.name}` : 'No current project'}
          color="amber"
        />
      </div>

      {repos.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No repositories found</p>
          <p className="text-gray-600 text-xs mt-1">
            This project doesn't use multi-repo mode, or the repositories/ directory hasn't been set up yet
          </p>
        </div>
      ) : (
        <>
          {orgs.map(org => {
            const orgRepos = repos.filter(r => r.org === org);
            return (
              <div key={org}>
                <div className="flex items-center gap-2 mb-3">
                  <OrgIcon />
                  <h3 className="text-sm font-medium text-gray-300">{org}</h3>
                  <span className="text-[10px] text-gray-600">{orgRepos.length} {orgRepos.length === 1 ? 'repo' : 'repos'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orgRepos.map(repo => {
                    const httpsUrl = sshToHttps(repo.remote);

                    return (
                      <div
                        key={repo.path || `${repo.org}/${repo.name}`}
                        className={`bg-gray-900/50 border rounded-xl p-4 ${
                          repo.isCurrent ? 'border-indigo-500/30' : 'border-gray-800'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <RepoIcon />
                            <span className="text-sm font-medium text-gray-300">{repo.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {repo.isCurrent && (
                              <Badge label="Current Project" variant="info" />
                            )}
                            <Badge
                              label={repo.hasSpecweave ? 'SpecWeave' : 'No SpecWeave'}
                              variant={repo.hasSpecweave ? 'success' : 'default'}
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Organization</span>
                            <span className="text-[10px] text-gray-400">{repo.org}</span>
                          </div>

                          {repo.branch && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Branch</span>
                              <Badge label={repo.branch} variant="default" />
                            </div>
                          )}

                          {httpsUrl && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Remote</span>
                              <a
                                href={httpsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-[180px]"
                                title={httpsUrl}
                              >
                                {httpsUrl.replace('https://', '')}
                              </a>
                            </div>
                          )}

                          {!httpsUrl && repo.remote && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Remote</span>
                              <span className="text-[10px] text-gray-600 font-mono truncate max-w-[180px]" title={repo.remote}>
                                {repo.remote}
                              </span>
                            </div>
                          )}

                          {repo.path && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Path</span>
                              <span className="text-[10px] text-gray-600 font-mono truncate max-w-[180px]" title={repo.path}>
                                {repo.path.split('/').slice(-3).join('/')}
                              </span>
                            </div>
                          )}

                          {repo.lastModified && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Last Modified</span>
                              <span className="text-[10px] text-gray-400">{timeAgo(repo.lastModified)}</span>
                            </div>
                          )}
                        </div>

                        {/* GitHub link button */}
                        {httpsUrl && (
                          <a
                            href={httpsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 py-2 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                          >
                            <GitHubIcon />
                            Open on GitHub
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function OrgIcon() {
  return (
    <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
  );
}

function RepoIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
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
