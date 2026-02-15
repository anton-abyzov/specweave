import { useProjectApi } from '../hooks/useProjectApi';
import { useCommand } from '../hooks/useCommand';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';
import { PageLoader } from '../components/ui/Spinner';

interface RepoInfo {
  name: string;
  org: string;
  path: string;
  hasSpecweave: boolean;
  lastModified: string;
}

export function ReposPage() {
  const { data, loading, error } = useProjectApi<RepoInfo[]>('/api/repos');
  const { execute, running } = useCommand();

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;

  const repos = data || [];
  const orgs = [...new Set(repos.map(r => r.org))];
  const withSpecweave = repos.filter(r => r.hasSpecweave).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Repositories</h2>
        {repos.length > 0 && (
          <button
            onClick={() => execute('clone-repos')}
            disabled={running}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {running ? 'Cloning...' : 'Clone All'}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Repositories" value={repos.length} color="indigo" />
        <KpiCard title="Organizations" value={orgs.length} color="cyan" />
        <KpiCard title="With SpecWeave" value={withSpecweave} color="emerald" />
        <KpiCard title="Without SpecWeave" value={repos.length - withSpecweave} color="amber" />
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
          {/* Org-grouped repo cards */}
          {orgs.map(org => {
            const orgRepos = repos.filter(r => r.org === org);
            return (
              <div key={org}>
                <div className="flex items-center gap-2 mb-3">
                  <OrgIcon />
                  <h3 className="text-sm font-medium text-gray-300">{org}</h3>
                  <span className="text-[10px] text-gray-600">{orgRepos.length} repos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orgRepos.map(repo => (
                    <div key={repo.path} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RepoIcon />
                          <span className="text-sm font-medium text-gray-300">{repo.name}</span>
                        </div>
                        <Badge
                          label={repo.hasSpecweave ? 'initialized' : 'no specweave'}
                          variant={repo.hasSpecweave ? 'success' : 'default'}
                        />
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Organization</span>
                          <span className="text-[10px] text-gray-400">{repo.org}</span>
                        </div>
                        {repo.lastModified && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Last Modified</span>
                            <span className="text-[10px] text-gray-400">{timeAgo(repo.lastModified)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Path</span>
                          <span className="text-[10px] text-gray-600 font-mono truncate max-w-[150px]" title={repo.path}>
                            {repo.path.split('/').slice(-2).join('/')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
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

function timeAgo(ts: string): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
