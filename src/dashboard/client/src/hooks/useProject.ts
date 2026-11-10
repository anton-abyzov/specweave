import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchProjectId } from '../../../project-id';

export interface ProjectInfo {
  id: string;
  path: string;
  name: string;
  hasSpecweave: boolean;
  machine?: string;
}

interface ProjectContextValue {
  projects: ProjectInfo[];
  activeProject: ProjectInfo | null;
  /** The link named a project id this dashboard does not serve (another machine's path, or a removed project). */
  foreignProjectId: string | null;
  setActiveProject: (id: string) => void;
  refreshProjects: () => void;
}

export const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  activeProject: null,
  foreignProjectId: null,
  setActiveProject: () => {},
  refreshProjects: () => {},
});

export function useProject() {
  return useContext(ProjectContext);
}

/** Hook that manages project list and active project selection */
export function useProjectManager(): ProjectContextValue {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.ok) setProjects(json.data || []);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const activeProjectId = searchParams.get('project');
  const activeProject = matchProjectId(activeProjectId, projects) || projects[0] || null;
  const foreign =
    activeProjectId && activeProject && activeProject.id !== activeProjectId ? activeProjectId : null;
  const [foreignProjectId, setForeignProjectId] = useState<string | null>(null);
  // Rewrite a foreign id to the local one, so API calls and copied links name this machine's project.
  useEffect(() => {
    if (!foreign || !activeProject) return;
    setForeignProjectId(foreign);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('project', activeProject.id);
        return next;
      },
      { replace: true },
    );
  }, [foreign, activeProject, setSearchParams]);

  const setActiveProject = useCallback((id: string) => {
    setForeignProjectId(null);
    setSearchParams((prev) => {
      prev.set('project', id);
      return prev;
    });
  }, [setSearchParams]);

  return { projects, activeProject, foreignProjectId, setActiveProject, refreshProjects: fetchProjects };
}
