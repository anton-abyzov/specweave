import { useProject } from '../../hooks/useProject';
export function Header() {
  const { activeProject } = useProject();
  return (
    <header className="work-header">
      <span>
        Workspace <b>/</b> <strong>{activeProject?.name || 'Project'}</strong>
      </span>
      <span>Intent → evidence → continuation</span>
    </header>
  );
}
