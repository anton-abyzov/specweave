import { useApi } from '../../hooks/useApi';
import { useProject } from '../../hooks/useProject';

interface HealthData {
  uptime: number;
  connections: number;
}

export function Header() {
  const { data } = useApi<HealthData>('/api/health');
  const { activeProject } = useProject();

  const projectName = activeProject?.name || 'Project';
  const uptime = data?.uptime
    ? formatUptime(data.uptime)
    : '...';

  return (
    <header className="h-14 bg-gray-900/50 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-gray-200 font-medium text-sm">{projectName}</h1>
        <span className="text-gray-600 text-xs">|</span>
        <span className="text-gray-500 text-xs">Uptime: {uptime}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-500 text-xs">
          {data?.connections ?? 0} client{(data?.connections ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </header>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
