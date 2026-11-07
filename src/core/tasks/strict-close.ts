import * as fs from 'fs';
import * as path from 'path';
import type { TaskBoard } from './task-board.js';

export interface ScopedCheck {
  cmd: string;
  cwd: string;
  source: string;
}

export function readStrictClose(root: string): { ownerCommands?: Record<string, string[]> } | undefined {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error('Cannot read .specweave/config.json; fix the configuration before verifying or closing');
  }
  if (config.testing?.strictClose !== true) return undefined;
  const commands = config.testing.commands;
  if (commands !== undefined && (!Array.isArray(commands) || commands.some((cmd) => typeof cmd !== 'string' || !cmd.trim()))) {
    throw new Error('testing.commands must contain nonblank strings');
  }
  return { ownerCommands: config.testing.ownerCommands };
}

/** A repository registered in `.specweave/config.json`, with its path relative to the project root. */
export interface RepositoryEntry {
  id: string;
  /** POSIX path relative to the project root, e.g. `repositories/acme/api` or `../web`. */
  path: string;
}

/**
 * Registered repositories: `workspace.repos`, `umbrella.childRepos` (adopted
 * checkouts are written to `workspace.repos`). Any location works, including
 * absolute paths and siblings of the project root. Read leniently and offline;
 * the project root itself is never an entry.
 */
export function registeredRepositoryEntries(root: string, config?: Record<string, any>): RepositoryEntry[] {
  if (!config) {
    try {
      config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf8'));
    } catch { return []; }
  }
  const lists = [config?.workspace?.repos, config?.umbrella?.childRepos].filter(Array.isArray);
  const seen = new Set<string>();
  const entries: RepositoryEntry[] = [];
  for (const repo of lists.flat()) {
    if (!repo || typeof repo.path !== 'string' || !repo.path.trim()) continue;
    const rel = toProjectPath(root, repo.path);
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);
    entries.push({ id: typeof repo.id === 'string' && repo.id ? repo.id : rel, path: rel });
  }
  return entries;
}

/** Real location of `p`, resolving its nearest existing ancestor when `p` does not exist yet. */
function realLocation(p: string): string {
  try { return fs.realpathSync.native(p); } catch {
    const parent = path.dirname(p);
    return parent === p ? p : path.join(realLocation(parent), path.basename(p));
  }
}

/** POSIX path relative to `root` ('' for the root itself), compared by real location. */
export function toProjectPath(root: string, value: string): string {
  const absolute = path.resolve(root, value.replace(/\\/g, '/'));
  return path.relative(realLocation(path.resolve(root)), realLocation(absolute)).split(path.sep).join('/');
}

export type FileOwner = { owner: string; id?: string } | { error: string } | undefined;

/**
 * The repository that owns a task `Files` entry: the longest registered
 * repository path containing it, else the `repositories/<org>/<repo>/`
 * convention. `undefined` means the project root owns the file.
 */
export function resolveFileOwner(root: string, file: string, repos: RepositoryEntry[]): FileOwner {
  const normalized = path.posix.normalize(file.replace(/\\/g, '/'));
  if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(file)) return { error: `declare a project-relative Files path: ${file}` };
  const match = repos
    .filter((repo) => normalized === repo.path || normalized.startsWith(`${repo.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (match) return { owner: match.path, id: match.id };
  // A glob inside a folder that holds registered repositories (`libs/*/a.ts`) hides the owner.
  // Globs from the root (`*.md`, `**/*.ts`) stay root-owned, as before.
  const glob = normalized.search(/[*?\[\]{}]/);
  const literal = glob >= 0 ? normalized.slice(0, glob).replace(/[^/]*$/, '') : '';
  if (literal && repos.some((repo) => repo.path.startsWith(literal))) {
    return { error: `declare the owning repository explicitly in Files: ${file}` };
  }
  if (normalized.startsWith('../') || normalized === '..') return { error: `declare a project-relative Files path or register its repository: ${file}` };
  if (!normalized.startsWith('repositories/')) return undefined;
  const parts = normalized.split('/');
  if (parts.length < 3 || !parts[2] || /[*?\[\]{}]/.test(parts.slice(1, 3).join('/'))) {
    return { error: `declare the owning repository explicitly in Files: ${file}` };
  }
  return { owner: parts.slice(0, 3).join('/') };
}

/** Registered repositories first, then the umbrella convention repositories/<organization>/<repository>. */
export function resolveOwnerChecks(root: string, board: TaskBoard, config: NonNullable<ReturnType<typeof readStrictClose>>) {
  const owners = new Map<string, string | undefined>();
  const errors = [...board.warnings];
  const checks: ScopedCheck[] = [];
  const repos = registeredRepositoryEntries(root);
  for (const task of board.tasks) {
    for (const file of task.filesAffected ?? []) {
      const owner = resolveFileOwner(root, file, repos);
      if (!owner) continue;
      if ('error' in owner) { errors.push(`${task.id}: ${owner.error}`); continue; }
      owners.set(owner.owner, owner.id);
    }
  }
  const own = (key: string | undefined) => key !== undefined && config.ownerCommands && Object.prototype.hasOwnProperty.call(config.ownerCommands, key)
    ? config.ownerCommands[key] : undefined;
  for (const cwd of [...owners.keys()].sort()) {
    // Keyed by the repository path, or by its registered id.
    const commands = own(cwd) ?? own(owners.get(cwd));
    if (!Array.isArray(commands) || !commands.length || commands.some((cmd) => typeof cmd !== 'string' || !cmd.trim())) {
      errors.push(`No testing.ownerCommands configured for ${cwd}`);
      continue;
    }
    try {
      if (!fs.statSync(path.join(root, cwd)).isDirectory()) throw new Error();
    } catch {
      errors.push(`Owning repository directory is unavailable: ${cwd}`);
      continue;
    }
    checks.push(...commands.map((cmd) => ({ cmd, cwd, source: 'config testing.ownerCommands' })));
  }
  return { checks, errors };
}
