import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Navigate wrapper that preserves the ?project= query parameter.
 * Use this instead of raw useNavigate() for all internal dashboard links.
 */
export function useProjectNavigate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback((path: string) => {
    const projectId = searchParams.get('project');
    if (projectId) {
      const sep = path.includes('?') ? '&' : '?';
      navigate(`${path}${sep}project=${encodeURIComponent(projectId)}`);
    } else {
      navigate(path);
    }
  }, [navigate, searchParams]);
}
