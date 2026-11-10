import { useProject } from '../../hooks/useProject';

/** Names the machine and folder on screen: `localhost` alone never says whose files these are. */
export function Header() {
  const { activeProject, foreignProjectId } = useProject();
  return (
    <header className="work-header">
      <span className="work-header-where">
        Workspace <b>/</b> <strong>{activeProject?.name || 'Project'}</strong>
        {activeProject && (
          <span className="work-header-path" title="The machine and folder this dashboard reads">
            {activeProject.machine && <em>{activeProject.machine}</em>}
            <code>{activeProject.path}</code>
          </span>
        )}
      </span>
      {foreignProjectId ? (
        <span className="work-header-notice" role="status">
          This link named a project from another machine or path ({foreignProjectId}). Showing the copy on{' '}
          {activeProject?.machine || 'this machine'}.
        </span>
      ) : (
        <span>Intent → evidence → continuation</span>
      )}
    </header>
  );
}
