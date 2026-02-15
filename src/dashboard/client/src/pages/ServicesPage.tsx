import { useProjectApi } from '../hooks/useProjectApi';
import { useCommand } from '../hooks/useCommand';
import { PageLoader } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';

interface LinkItem {
  name: string;
  url: string;
  type: string;
}

interface ServiceInfo {
  name: string;
  status: string;
  detail: string;
  port: number;
}

export function ServicesPage() {
  const { data: links, loading: ll } = useProjectApi<LinkItem[]>('/api/links');
  const { data: services, loading: sl, refetch } = useProjectApi<ServiceInfo[]>('/api/services');
  const { execute, running } = useCommand();

  if (ll || sl) return <PageLoader />;

  const runningCount = (services || []).filter(s => s.status === 'running').length;
  const totalServices = (services || []).length;

  const handleDocsStart = async () => {
    await execute('docs-preview-start');
    setTimeout(() => refetch(), 3000);
  };

  const handleDocsStop = async () => {
    await execute('docs-preview-stop');
    setTimeout(() => refetch(), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Services & Links</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Services" value={totalServices} color="indigo" />
        <KpiCard title="Running" value={runningCount} color="emerald" />
        <KpiCard title="External Links" value={(links || []).length} color="cyan" />
        <KpiCard title="Stopped" value={totalServices - runningCount} color="rose" />
      </div>

      {/* Service Status */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Service Status</h3>
        <div className="space-y-3">
          {(services || []).map((svc, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${svc.status === 'running' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                <div>
                  <span className="text-sm text-gray-300">{svc.name}</span>
                  <div className="text-[10px] text-gray-600">{svc.detail}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={svc.status} variant={svc.status === 'running' ? 'success' : 'default'} />
                {svc.name === 'Docs Preview' && (
                  svc.status === 'running' ? (
                    <div className="flex items-center gap-1">
                      <a
                        href={svc.detail}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded transition-colors"
                      >
                        Open
                      </a>
                      <button
                        onClick={handleDocsStop}
                        disabled={running}
                        className="px-2 py-1 text-[10px] text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded transition-colors disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleDocsStart}
                      disabled={running}
                      className="px-2 py-1 text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded transition-colors disabled:opacity-50"
                    >
                      {running ? 'Starting...' : 'Start'}
                    </button>
                  )
                )}
                {svc.status === 'running' && svc.name !== 'Docs Preview' && (
                  <a
                    href={svc.detail}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-[10px] text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded transition-colors"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* External Links */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">External Links</h3>
        {(links || []).length === 0 ? (
          <p className="text-xs text-gray-500">No external links configured</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(links || []).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LinkIcon type={link.type} />
                  <div>
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">{link.name}</div>
                    <div className="text-[10px] text-gray-600 truncate max-w-[200px]">{link.url}</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    docs: 'bg-indigo-600',
    github: 'bg-gray-700',
    jira: 'bg-blue-700',
    ado: 'bg-blue-600',
  };
  return (
    <div className={`w-8 h-8 rounded-lg ${colors[type] || 'bg-gray-700'} flex items-center justify-center`}>
      <span className="text-xs text-white font-bold">{type[0]?.toUpperCase()}</span>
    </div>
  );
}
