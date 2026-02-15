import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ProjectInfo {
  id: string;
  path: string;
  name: string;
  hasSpecweave: boolean;
}

interface ProjectContextValue {
  projects: ProjectInfo[];
  activeProject: ProjectInfo | null;
  setActiveProject: (id: string) => void;
  refreshProjects: () => void;
}

export const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  activeProject: null,
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
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) || projects[0] || null
    : projects[0] || null;

  const setActiveProject = useCallback((id: string) => {
    setSearchParams((prev) => {
      prev.set('project', id);
      return prev;
    });
  }, [setSearchParams]);

  return { projects, activeProject, setActiveProject, refreshProjects: fetchProjects };
}
