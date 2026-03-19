import { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectApi } from '../hooks/useProjectApi.js';
import { useProject } from '../hooks/useProject.js';
import { Badge } from '../components/ui/Badge.js';
import { KpiCard } from '../components/ui/KpiCard.js';
import { PageLoader } from '../components/ui/Spinner.js';
import { ErrorAlert } from '../components/ui/ErrorAlert.js';

interface WorkspaceRepoSync {
  github?: { owner: string; repo: string; direction?: string };
  jira?: { projectKey: string; domain?: string };
  ado?: { organization?: string; project: string };
}

interface WorkspaceRepo {
  id: string;
  path: string;
  prefix: string;
  name?: string;
  techStack?: string[];
  role?: string;
  sync?: WorkspaceRepoSync;
}

interface WorkspaceData {
  name: string;
  rootRepo: WorkspaceRepoSync | null;
  repos: WorkspaceRepo[];
}

/** Inline editable cell — click to edit, Enter to save, Escape to cancel */
function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        onBlur={save}
        className="bg-gray-800 border border-indigo-500/50 text-gray-200 text-xs rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className="text-xs text-gray-400 cursor-pointer hover:text-gray-200 hover:bg-gray-800/50 rounded px-1.5 py-0.5 transition-colors min-w-[60px] inline-block"
      title="Click to edit"
    >
      {value || <span className="text-gray-600 italic">{placeholder || 'Click to set'}</span>}
    </span>
  );
}

/** Format sync mapping as display string */
function formatMapping(sync: WorkspaceRepoSync | undefined, platform: 'github' | 'jira' | 'ado'): string {
  if (!sync) return '';
  if (platform === 'github' && sync.github) return `${sync.github.owner}/${sync.github.repo}`;
  if (platform === 'jira' && sync.jira) return sync.jira.projectKey;
  if (platform === 'ado' && sync.ado) return sync.ado.project;
  return '';
}

/** Parse mapping string back to sync structure */
function parseMappingUpdate(platform: 'github' | 'jira' | 'ado', value: string): Partial<WorkspaceRepoSync> {
  if (platform === 'github') {
    const parts = value.split('/');
    if (parts.length === 2) return { github: { owner: parts[0], repo: parts[1] } };
    return { github: { owner: '', repo: value } };
  }
  if (platform === 'jira') return { jira: { projectKey: value } };
  if (platform === 'ado') return { ado: { project: value } };
  return {};
}

/** Add Repo Modal */
function AddRepoModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (repo: { id: string; path: string; prefix: string; name?: string }) => void;
}) {
  const [id, setId] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [prefix, setPrefix] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => { idRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !repoPath.trim() || !prefix.trim()) {
      setError('ID, Path, and Prefix are required');
      return;
    }
    onSubmit({ id: id.trim(), path: repoPath.trim(), prefix: prefix.trim(), name: name.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Add Repository</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">ID *</label>
            <input
              ref={idRef}
              value={id}
              onChange={e => setId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., frontend-app"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Path *</label>
            <input
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., repositories/acme/frontend-app"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Prefix *</label>
            <input
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., FE"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Display Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Frontend App"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition-colors"
            >
              Add Repo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const { data, loading, error, refetch } = useProjectApi<WorkspaceData>('/api/workspace');
  const { activeProject } = useProject();
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectParam = activeProject?.id ? `?project=${activeProject.id}` : '';

  const patchRepo = useCallback(async (repoId: string, body: Record<string, unknown>) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/workspace/repos/${encodeURIComponent(repoId)}${projectParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error || `Failed to update ${repoId}`);
        return;
      }
      refetch();
    } catch (e: any) {
      setActionError(e.message);
    }
  }, [projectParam, refetch]);

  const addRepo = useCallback(async (repo: { id: string; path: string; prefix: string; name?: string }) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/workspace/repos${projectParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error || 'Failed to add repo');
        return;
      }
      setShowAddModal(false);
      refetch();
    } catch (e: any) {
      setActionError(e.message);
    }
  }, [projectParam, refetch]);

  const deleteRepo = useCallback(async (repoId: string) => {
    if (!confirm(`Remove "${repoId}" from workspace?`)) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/workspace/repos/${encodeURIComponent(repoId)}${projectParam}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        setActionError(err.error || `Failed to remove ${repoId}`);
        return;
      }
      refetch();
    } catch (e: any) {
      setActionError(e.message);
    }
  }, [projectParam, refetch]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;

  const workspace = data || { name: '', rootRepo: null, repos: [] };
  const githubCount = workspace.repos.filter(r => r.sync?.github).length;
  const jiraCount = workspace.repos.filter(r => r.sync?.jira).length;
  const adoCount = workspace.repos.filter(r => r.sync?.ado).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Workspace</h2>
          {workspace.name && <p className="text-xs text-gray-500 mt-0.5">{workspace.name}</p>}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Repo
        </button>
      </div>

      {actionError && (
        <div className="bg-rose-900/30 border border-rose-700 rounded-lg px-4 py-2">
          <p className="text-xs text-rose-400">{actionError}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Repositories" value={workspace.repos.length} color="indigo" />
        <KpiCard title="GitHub Mapped" value={githubCount} color="cyan" />
        <KpiCard title="Jira Mapped" value={jiraCount} color="amber" />
        <KpiCard title="ADO Mapped" value={adoCount} color="emerald" />
      </div>

      {/* Root Repo */}
      {workspace.rootRepo && (
        <div className="bg-gray-900/50 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge label="Root" variant="info" />
            <span className="text-sm font-medium text-gray-300">Umbrella Repository</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">GitHub</span>
              <span className="text-xs text-gray-400">{formatMapping(workspace.rootRepo, 'github') || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Jira</span>
              <span className="text-xs text-gray-400">{formatMapping(workspace.rootRepo, 'jira') || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">ADO</span>
              <span className="text-xs text-gray-400">{formatMapping(workspace.rootRepo, 'ado') || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Repos Table */}
      {workspace.repos.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No repositories in workspace</p>
          <p className="text-gray-600 text-xs mt-1">Click "Add Repo" to register your first repository</p>
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">ID</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">Prefix</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">GitHub</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">Jira</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">ADO</th>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {workspace.repos.map((repo) => (
                  <tr key={repo.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-300">{repo.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <EditableCell
                        value={repo.name || ''}
                        onSave={(val) => patchRepo(repo.id, { name: val })}
                        placeholder="Set name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={repo.prefix} variant="default" />
                    </td>
                    <td className="px-4 py-3">
                      <EditableCell
                        value={formatMapping(repo.sync, 'github')}
                        onSave={(val) => patchRepo(repo.id, { sync: { ...repo.sync, ...parseMappingUpdate('github', val) } })}
                        placeholder="owner/repo"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableCell
                        value={formatMapping(repo.sync, 'jira')}
                        onSave={(val) => patchRepo(repo.id, { sync: { ...repo.sync, ...parseMappingUpdate('jira', val) } })}
                        placeholder="PROJECT"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableCell
                        value={formatMapping(repo.sync, 'ado')}
                        onSave={(val) => patchRepo(repo.id, { sync: { ...repo.sync, ...parseMappingUpdate('ado', val) } })}
                        placeholder="project"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableCell
                        value={repo.role || ''}
                        onSave={(val) => patchRepo(repo.id, { role: val })}
                        placeholder="Set role"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteRepo(repo.id)}
                        className="text-gray-600 hover:text-rose-400 transition-colors p-1"
                        title="Remove from workspace"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddRepoModal
          onClose={() => setShowAddModal(false)}
          onSubmit={addRepo}
        />
      )}
    </div>
  );
}
