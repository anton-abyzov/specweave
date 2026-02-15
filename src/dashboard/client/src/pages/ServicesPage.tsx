import { useProjectApi } from '../hooks/useProjectApi.js';
import { useCommand } from '../hooks/useCommand.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { CommandOutput } from '../components/ui/CommandOutput.js';

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
  const { execute, running, output, status: cmdStatus, reset } = useCommand();

  if (ll || sl) return <PageLoader />;

  const runningCount = (services || []).filter(s => s.status === 'running').length;
  const totalServices = (services || []).length;

  // Detect port conflicts among running services
  const portConflicts: Map<number, string[]> = new Map();
  for (const svc of (services || [])) {
    if (svc.port > 0 && svc.status === 'running') {
      const existing = portConflicts.get(svc.port) || [];
      existing.push(svc.name);
      portConflicts.set(svc.port, existing);
    }
  }
  const conflicts = Array.from(portConflicts.entries()).filter(([, names]) => names.length > 1);

  const handleStart = async (commandName: string) => {
    await execute(commandName);
    setTimeout(() => refetch(), 3000);
  };

  const handleStop = async (commandName: string) => {
    await execute(commandName);
    setTimeout(() => refetch(), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Services & Links</h2>

      {/* Command Output */}
      <CommandOutput lines={output} status={cmdStatus} onDismiss={reset} />

      {/* Port Conflict Warning */}
      {conflicts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-amber-300">Port Conflict Detected</div>
            <div className="text-xs text-amber-400/80 mt-1">
              {conflicts.map(([port, names]) => (
                <span key={port} className="block">
                  Port {port} is used by: {names.join(', ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Services" value={totalServices} color="indigo" tooltip={`${totalServices} managed services`} />
        <KpiCard title="Running" value={runningCount} color="emerald" tooltip={`${runningCount} services currently active`} />
        <KpiCard title="External Links" value={(links || []).length} color="cyan" tooltip="Configured external links (docs, repos, etc.)" />
        <KpiCard title="Stopped" value={totalServices - runningCount} color="rose" tooltip={`${totalServices - runningCount} services not running`} />
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
                  <div className="text-[10px] text-gray-600">
                    {svc.status === 'running' && svc.detail ? (
                      <a
                        href={svc.detail}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                      >
                        {svc.detail}
                      </a>
                    ) : (
                      svc.detail
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {svc.status === 'running' && svc.port > 0 && (
                  <Badge label={`Port ${svc.port}`} variant="info" />
                )}
                {svc.status === 'running' ? (
                  <Badge label="Running" variant="success" />
                ) : (
                  <Badge label="Stopped" variant="default" />
                )}
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
                        onClick={() => handleStop('docs-preview-stop')}
                        disabled={running}
                        className="px-2 py-1 text-[10px] text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded transition-colors disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStart('docs-preview-start')}
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
