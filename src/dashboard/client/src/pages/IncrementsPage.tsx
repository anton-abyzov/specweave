import { useNavigate } from 'react-router-dom';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useUrlState } from '../hooks/useUrlState.js';
import { Badge, statusBadgeVariant } from '../components/ui/Badge.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';

interface IncrementSummary {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  project?: string;
  tasks: { total: number; completed: number };
  acs: { total: number; completed: number };
  createdAt: string;
  lastActivity: string;
}

interface IncrementsData {
  increments: IncrementSummary[];
  summary: Record<string, number>;
}

export function IncrementsPage() {
  const { data, loading, error } = useProjectApi<IncrementsData>('/api/increments');
  const [statusFilter, setStatusFilter] = useUrlState('status', 'all');
  const [typeFilter, setTypeFilter] = useUrlState('type', 'all');
  const navigate = useNavigate();

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 text-rose-400 text-sm">Error: {error}</div>;
  if (!data) return null;

  const filteredIncrements = data.increments.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (typeFilter !== 'all' && inc.type !== typeFilter) return false;
    return true;
  });

  const statuses = [...new Set(data.increments.map((i) => i.status))];
  const types = [...new Set(data.increments.map((i) => i.type))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Increments</h2>
        <span className="text-sm text-gray-500">{data.increments.length} total</span>
      </div>

      {/* Filter Chips */}
      <div className="space-y-3">
        {/* Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-14">Status:</span>
          <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
            <FilterChip
              label="All"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            {statuses.map(s => (
              <FilterChip
                key={s}
                label={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                count={data.increments.filter(inc => inc.status === s).length}
              />
            ))}
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-14">Type:</span>
          <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-lg p-1">
            <FilterChip
              label="All"
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            />
            {types.map(t => (
              <FilterChip
                key={t}
                label={t}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                count={data.increments.filter(inc => inc.type === t).length}
              />
            ))}
          </div>
        </div>

        <span className="text-xs text-gray-500">{filteredIncrements.length} matching</span>
      </div>

      {/* Table */}
      {filteredIncrements.length === 0 ? (
        <EmptyState title="No increments match filters" description="Try adjusting your filters" />
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Tasks</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">ACs</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncrements.map((inc) => (
                <tr key={inc.id} onClick={() => navigate(`/increments/${inc.id}`)} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-xs text-indigo-400 font-mono">{inc.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">{inc.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={inc.status} variant={statusBadgeVariant(inc.status)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 capitalize">{inc.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={inc.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressCell completed={inc.tasks.completed} total={inc.tasks.total} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressCell completed={inc.acs.completed} total={inc.acs.total} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {inc.lastActivity ? formatRelativeDate(inc.lastActivity) : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick, count }: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
        active
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-gray-300'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 text-[10px] text-gray-500">{count}</span>
      )}
    </button>
  );
}

function ProgressCell({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{completed}/{total}</span>
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

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
