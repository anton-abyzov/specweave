/** Filesystem-only workspace context. No Git, network, recursive scan or config migration. */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RegisteredRepository {
  id: string;
  path: string;
  prefix?: string;
  identity?: string;
  [key: string]: unknown;
}

export function canonicalPath(value: string): string {
  return fs.realpathSync.native(path.resolve(value));
}

export function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function readWorkspaceConfig(root: string): Record<string, any> {
  const file = path.join(root, '.specweave', 'config.json');
  let config: Record<string, any>;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Cannot read workspace config: ${file}`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Invalid workspace config: ${file}`);
  if (config.workspace !== undefined && (!config.workspace || typeof config.workspace !== 'object'
    || !Array.isArray(config.workspace.repos))) throw new Error(`Invalid workspace.repos in ${file}`);
  const repos = config.workspace?.repos ?? config.umbrella?.childRepos ?? [];
  if (!Array.isArray(repos) || repos.some((repo: any) => !repo || typeof repo.id !== 'string'
    || typeof repo.path !== 'string' || !repo.path.trim())) throw new Error(`Invalid repository paths in ${file}`);
  return config;
}

/** Only visits explicitly registered paths. Missing checkouts stay registered but are not scanned. */
export function registeredRepositories(root: string): Array<RegisteredRepository & { absolutePath: string }> {
  const config = readWorkspaceConfig(root);
  const repos: RegisteredRepository[] = config.workspace?.repos ?? config.umbrella?.childRepos ?? [];
  return repos.flatMap(repo => {
    try {
      const absolutePath = canonicalPath(path.resolve(root, repo.path));
      if (!fs.statSync(absolutePath).isDirectory()) return [];
      return [{ ...repo, absolutePath }];
    } catch { return []; }
  });
}

/** Explicit selection never falls back when invalid, and inherited context must match membership. */
export function explicitWorkspaceRoot(startDir: string, selected = process.env.SPECWEAVE_WORKSPACE,
  requireMembership = true): string | null {
  if (selected === undefined) return null;
  if (!selected.trim()) throw new Error('SPECWEAVE_WORKSPACE must name a workspace directory');
  let root: string;
  try { root = canonicalPath(selected); } catch { throw new Error(`Workspace does not exist: ${selected}`); }
  readWorkspaceConfig(root);
  if (requireMembership) {
    let start: string;
    try { start = canonicalPath(startDir); } catch { throw new Error(`Working directory does not exist: ${startDir}`); }
    if (!isWithin(root, start) && !registeredRepositories(root).some(repo => isWithin(repo.absolutePath, start))) {
      throw new Error(`Working directory is not a member of workspace ${root}: ${start}`);
    }
  }
  return root;
}

/** Config membership replaces the directory convention, which remains a legacy fallback. */
export function isWorkspaceRoot(root: string): boolean {
  try {
    const config = readWorkspaceConfig(root);
    if (config.workspace?.repos.length > 0 || config.umbrella?.enabled || config.repository?.umbrellaRepo) return true;
  } catch { /* Legacy malformed config may still have the conventional directory marker. */ }
  try { return fs.statSync(path.join(root, 'repositories')).isDirectory(); } catch { return false; }
}

/** Old umbrella flags predate explicit inventories and imply nested membership. */
export function hasLegacyWorkspaceLayout(root: string): boolean {
  try {
    const config = readWorkspaceConfig(root);
    if (config.umbrella?.enabled || config.repository?.umbrellaRepo) return true;
  } catch { /* Keep conventional directory compatibility. */ }
  try { return fs.statSync(path.join(root, 'repositories')).isDirectory(); } catch { return false; }
}
