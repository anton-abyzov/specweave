import { NavLink, useSearchParams } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { useSSEStatus } from '../../contexts/SSEContext';

const PRIMARY = [
  ['/project', 'Project hub', '◈'],
  ['/', 'Work board', '▥'],
  ['/increments', 'Evidence', '▤'],
  ['/sessions', 'Sessions', '↗'],
  ['/sync', 'Connections', '⇄'],
];
const ADVANCED = [
  ['/overview', 'Overview'],
  ['/activity', 'Activity'],
  ['/costs', 'Usage & estimates'],
  ['/analytics', 'Analytics'],
  ['/errors', 'Errors'],
  ['/notifications', 'Notifications'],
  ['/workspace', 'Workspace'],
  ['/repos', 'Repositories'],
  ['/plugins', 'Plugins'],
  ['/marketplace', 'Marketplace'],
  ['/hooks', 'Hooks'],
  ['/agents', 'Agents'],
  ['/services', 'Services'],
  ['/config', 'Settings'],
];
export function Sidebar() {
  const { projects, activeProject, setActiveProject } = useProject();
  const [params] = useSearchParams();
  const sse = useSSEStatus();
  const to = (pathname: string) =>
    params.get('project') ? `${pathname}?project=${encodeURIComponent(params.get('project')!)}` : pathname;
  return (
    <aside className="work-sidebar">
      <LinkBrand />
      <div className="work-project-select">
        <label htmlFor="workspace-project">WORKSPACE</label>
        <select
          id="workspace-project"
          value={activeProject?.id || ''}
          onChange={(event) => setActiveProject(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <nav aria-label="Main navigation" className="work-navigation">
        {PRIMARY.map(([pathname, label, icon]) => (
          <NavLink
            title={label}
            end={pathname === '/'}
            key={pathname}
            to={to(pathname)}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span aria-hidden="true" className="work-nav-icon">
              {icon}
            </span>
            <span className="work-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="work-sidebar-note">
        <span>ONE INTENT.</span>
        <strong>
          Every tool.
          <br />
          Every next step.
        </strong>
        <p>Your work stays in your project.</p>
      </div>
      <details className="work-advanced">
        <summary title="Diagnostics and settings">Diagnostics & settings</summary>
        <nav aria-label="Advanced navigation">
          {ADVANCED.map(([pathname, label]) => (
            <NavLink key={pathname} to={to(pathname)}>
              {label}
            </NavLink>
          ))}
        </nav>
      </details>
      <div className="work-sidebar-footer">
        <span className={`work-live-dot ${sse === 'connected' ? 'connected' : ''}`} />
        <span>{sse === 'connected' ? 'Live connection' : 'Reconnecting…'}</span>
      </div>
    </aside>
  );
}
function LinkBrand() {
  return (
    <div className="work-brand">
      <div aria-hidden="true" className="work-brand-mark">
        S<span>W</span>
      </div>
      <span>
        SpecWeave<small>WORK CONTINUITY</small>
      </span>
    </div>
  );
}
