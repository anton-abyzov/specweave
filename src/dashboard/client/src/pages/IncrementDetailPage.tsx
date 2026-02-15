import { useParams } from 'react-router-dom';
import { useProjectApi } from '../hooks/useProjectApi';
import { Badge, statusBadgeVariant } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';
import { PageLoader } from '../components/ui/Spinner';

interface Task {
  id: string;
  title: string;
  status: string;
  userStory?: string;
  acs?: string[];
}

interface AC {
  id: string;
  text: string;
  completed: boolean;
}

interface IncrementDetail {
  id: string;
  metadata: {
    title?: string;
    status?: string;
    type?: string;
    priority?: string;
    project?: string;
    createdAt?: string;
    [key: string]: unknown;
  };
  tasks: Task[];
  taskSummary: { total: number; completed: number; pending: number };
  acs: AC[];
  acSummary: { total: number; completed: number };
  dirName: string;
}

export function IncrementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useProjectApi<IncrementDetail>(`/api/increments/${id || '_none'}`);

  if (!id) return <div className="p-6 text-gray-500 text-sm">No increment ID specified</div>;
  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return <div className="p-6 text-gray-500 text-sm">Increment not found</div>;

  const taskPct = data.taskSummary.total > 0
    ? Math.round((data.taskSummary.completed / data.taskSummary.total) * 100)
    : 0;
  const acPct = data.acSummary.total > 0
    ? Math.round((data.acSummary.completed / data.acSummary.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs text-indigo-400 font-mono">{data.dirName}</span>
          <Badge label={data.metadata.status || 'unknown'} variant={statusBadgeVariant(data.metadata.status || '')} />
          {data.metadata.type && (
            <span className="text-xs text-gray-400 capitalize">{data.metadata.type}</span>
          )}
          {data.metadata.priority && (
            <PriorityBadge priority={data.metadata.priority} />
          )}
        </div>
        <h2 className="text-lg font-semibold text-gray-200">
          {data.metadata.title || data.id}
        </h2>
        {data.metadata.project && (
          <span className="text-xs text-gray-500">Project: {data.metadata.project}</span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Tasks" value={`${data.taskSummary.completed}/${data.taskSummary.total}`} color="indigo" />
        <KpiCard title="Task Progress" value={`${taskPct}%`} color="cyan" />
        <KpiCard title="ACs" value={`${data.acSummary.completed}/${data.acSummary.total}`} color="emerald" />
        <KpiCard title="AC Progress" value={`${acPct}%`} color="amber" />
      </div>

      {/* Progress Bars */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4">
        <ProgressBar label="Tasks" completed={data.taskSummary.completed} total={data.taskSummary.total} color="indigo" />
        <ProgressBar label="Acceptance Criteria" completed={data.acSummary.completed} total={data.acSummary.total} color="emerald" />
      </div>

      {/* Tasks */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Tasks ({data.tasks.length})</h3>
        </div>
        {data.tasks.length === 0 ? (
          <div className="p-5 text-center text-gray-500 text-xs">No tasks found in tasks.md</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {data.tasks.map(task => (
              <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                    : 'border-gray-600'
                }`}>
                  {task.status === 'completed' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">{task.id}</span>
                    <span className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {task.title}
                    </span>
                  </div>
                  {(task.userStory || task.acs) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.userStory && <span className="text-[10px] text-indigo-400">{task.userStory}</span>}
                      {task.acs?.map(ac => (
                        <span key={ac} className="text-[10px] text-emerald-500">{ac}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acceptance Criteria */}
      {data.acs.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-300">Acceptance Criteria ({data.acs.length})</h3>
          </div>
          <div className="divide-y divide-gray-800/50">
            {data.acs.map(ac => (
              <div key={ac.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  ac.completed
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'border-gray-600'
                }`}>
                  {ac.completed && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="text-xs text-emerald-500 font-mono">{ac.id}</span>
                  <span className={`text-sm ml-2 ${ac.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                    {ac.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Metadata</h3>
        <div className="space-y-1.5">
          {Object.entries(data.metadata)
            .filter(([k]) => !['title'].includes(k))
            .map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono">{key}</span>
                <span className="text-xs text-gray-400">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, completed, total, color }: {
  label: string; completed: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const barColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500">{completed}/{total} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P0: 'text-rose-400 bg-rose-500/10',
    P1: 'text-amber-400 bg-amber-500/10',
    P2: 'text-cyan-400 bg-cyan-500/10',
    P3: 'text-gray-400 bg-gray-500/10',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[priority] || colors.P2}`}>
      {priority}
    </span>
  );
}
