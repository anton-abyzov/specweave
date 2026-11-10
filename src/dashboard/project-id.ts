/**
 * Project ids in dashboard links. An id is the project's absolute path on the
 * machine that made the link, so a link copied from another machine names a
 * path that does not exist here. Pure: shared by the server and the client.
 */

/** `/srv/work/app` → `srv-work-app`; `C:\work\app` → `C-work-app`. */
export function pathToProjectId(projectPath: string): string {
  return projectPath
    .replace(/^[\\/]+/, '')
    .replace(/[\\/:]+/g, '-')
    .replace(/-+$/, '');
}

/**
 * The registered project a requested id means: the exact id, or the only
 * project whose folder name ends the requested id (the same checkout under
 * another machine's path). Null when nothing or more than one project fits.
 */
export function matchProjectId<T extends { id: string; path: string }>(
  requested: string | null | undefined,
  projects: readonly T[],
): T | null {
  if (!requested) return null;
  const exact = projects.find((project) => project.id === requested);
  if (exact) return exact;
  const wanted = requested.toLowerCase();
  const sameFolder = projects.filter((project) => {
    const folder = pathToProjectId(project.path.split(/[\\/]/).filter(Boolean).pop() ?? '').toLowerCase();
    return folder !== '' && (wanted === folder || wanted.endsWith(`-${folder}`));
  });
  return sameFolder.length === 1 ? sameFolder[0] : null;
}
