import { NavLink, useSearchParams } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useProject } from '../../hooks/useProject';
import { useProjectApi } from '../../hooks/useProjectApi';
import { useSSE } from '../../hooks/useSSE';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { path: '/increments', label: 'Increments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { path: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/costs', label: 'Costs', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/sync', label: 'Sync', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { path: '/errors', label: 'Errors', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { path: '/activity', label: 'Activity', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: true },
  { path: '/config', label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { path: '/plugins', label: 'Plugins', icon: 'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z' },
  { path: '/repos', label: 'Repos', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { path: '/services', label: 'Services', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
];

function SvgIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function Sidebar() {
  const { projects, activeProject, setActiveProject } = useProject();
  const [searchParams] = useSearchParams();

  // Get notification count from overview
  const { data: overview } = useProjectApi<{ notifications?: { pendingCount?: number } }>('/api/overview');
  const [liveNotifCount, setLiveNotifCount] = useState<number | null>(null);

  // Listen for SSE notification events to update badge in real-time
  const handleNotification = useCallback((data: unknown) => {
    const d = data as { pendingCount?: number };
    if (d?.pendingCount != null) setLiveNotifCount(d.pendingCount);
  }, []);
  const { status: sseStatus } = useSSE({ onEvent: { notification: handleNotification } });

  const notifCount = liveNotifCount ?? overview?.notifications?.pendingCount ?? 0;

  // Preserve project query param in nav links
  const projectParam = searchParams.get('project');
  const buildTo = (path: string) => {
    if (!projectParam) return path;
    return `${path}?project=${projectParam}`;
  };

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SW</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">SpecWeave</div>
            <div className="text-gray-500 text-xs">Dashboard</div>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-800">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Project</label>
          <select
            value={activeProject?.id || ''}
            onChange={(e) => setActiveProject(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={buildTo(item.path)}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            <SvgIcon d={item.icon} />
            <span className="flex-1">{item.label}</span>
            {item.badge && notifCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              sseStatus === 'connected' ? 'bg-emerald-400 pulse-dot' :
              sseStatus === 'connecting' ? 'bg-amber-400 pulse-dot' :
              'bg-gray-500'
            }`} />
            <span className="text-xs text-gray-500">
              {sseStatus === 'connected' ? 'Connected' :
               sseStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
          </div>
          <span className="text-[10px] text-gray-600">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </aside>
  );
}
