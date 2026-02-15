import { useProject } from './useProject';
import { useApi } from './useApi';

/** useApi wrapper that automatically appends ?project=<id> */
export function useProjectApi<T>(path: string) {
  const { activeProject } = useProject();
  const sep = path.includes('?') ? '&' : '?';
  const url = activeProject ? `${path}${sep}project=${activeProject.id}` : path;
  return useApi<T>(url);
}
