/**
 * State garbage collection for .specweave/state/
 *
 * Whitelist-driven: only entries matching KNOWN junk patterns are ever deleted,
 * and never anything on the KEEP list. Everything else is left alone.
 *
 * Used by `specweave gc` (dry-run by default) and by the SessionStart hook
 * (silent, at most once per 24h via the `.gc-last` marker).
 */

import * as fs from 'fs';
import * as path from 'path';

export const GC_MARKER = '.gc-last';
export const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const INTERVIEW_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Files/dirs (top-level in state/) that coordination depends on. Never touched. */
export const STATE_KEEP: readonly string[] = [
  'event-queue',
  'sync-throttle.json',
  'sessions',
  '.locks',
  'active-increment.json',
  'auto-mode.json',
  'projects.json',
  'analytics',
  GC_MARKER,
];

const KEEP_PREFIXES = ['handoff-latest.'];

/** Junk patterns: top-level entry-name predicates. */
const JUNK_DIRS = ['prompt-cache'];
const JUNK_PREFIXES = [
  '.us-completion-',
  '.prev-status-',
  '.status-mtime-',
  '.github-sync-',
  '.living-specs-',
  '.project-bridge-',
  '.hook-circuit-breaker-',
  'skill-chain-',
];
const JUNK_EXACT = ['.context-hash'];
const EVENT_TYPES_PREFIX = '.event-types-';
const INTERVIEW_RE = /^interview-.*\.json$/;

export interface GcEntry {
  /** Path relative to stateDir, forward slashes */
  path: string;
  bytes: number;
  kind: 'file' | 'dir';
}

export interface GcOptions {
  /** Delete when true; otherwise only plan. Default false. */
  apply?: boolean;
  /** Clock override for tests */
  now?: number;
  /** Age after which interview-*.json is junk. Default 30 days. */
  interviewMaxAgeMs?: number;
}

export interface GcResult {
  stateDir: string;
  candidates: GcEntry[];
  deleted: GcEntry[];
  bytes: number;
  applied: boolean;
}

function isKept(name: string): boolean {
  return STATE_KEEP.includes(name) || KEEP_PREFIXES.some((p) => name.startsWith(p));
}

function isJunkName(name: string, isDir: boolean): boolean {
  if (isDir) return JUNK_DIRS.includes(name);
  return JUNK_EXACT.includes(name) || JUNK_PREFIXES.some((p) => name.startsWith(p));
}

export function dirSize(dir: string): number {
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) total += dirSize(full);
    else if (e.isFile()) {
      try { total += fs.statSync(full).size; } catch { /* ignore */ }
    }
  }
  return total;
}

function statSafe(p: string): fs.Stats | null {
  try { return fs.lstatSync(p); } catch { return null; }
}

/**
 * List junk entries in stateDir without deleting anything.
 */
export function planStatePurge(stateDir: string, options: GcOptions = {}): GcEntry[] {
  const now = options.now ?? Date.now();
  const interviewMaxAge = options.interviewMaxAgeMs ?? INTERVIEW_MAX_AGE_MS;
  const out: GcEntry[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(stateDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const e of entries) {
    const name = e.name;
    if (isKept(name)) {
      // event-queue/.event-types-* lives inside a kept dir
      if (name === 'event-queue' && e.isDirectory()) {
        const eq = path.join(stateDir, name);
        let sub: fs.Dirent[] = [];
        try { sub = fs.readdirSync(eq, { withFileTypes: true }); } catch { /* ignore */ }
        for (const s of sub) {
          if (s.isFile() && s.name.startsWith(EVENT_TYPES_PREFIX)) {
            const full = path.join(eq, s.name);
            out.push({ path: `${name}/${s.name}`, bytes: statSafe(full)?.size ?? 0, kind: 'file' });
          }
        }
      }
      continue;
    }

    const full = path.join(stateDir, name);
    if (e.isSymbolicLink()) continue;

    if (e.isDirectory()) {
      if (isJunkName(name, true)) {
        out.push({ path: name, bytes: dirSize(full), kind: 'dir' });
      }
      continue;
    }

    if (!e.isFile()) continue;
    const st = statSafe(full);
    if (!st) continue;

    if (isJunkName(name, false)) {
      out.push({ path: name, bytes: st.size, kind: 'file' });
    } else if (INTERVIEW_RE.test(name) && now - st.mtimeMs > interviewMaxAge) {
      out.push({ path: name, bytes: st.size, kind: 'file' });
    }
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Purge junk from stateDir. Dry-run unless `apply` is true.
 * Writes the `.gc-last` marker after an applied run.
 */
export function purgeState(stateDir: string, options: GcOptions = {}): GcResult {
  const candidates = planStatePurge(stateDir, options);
  const deleted: GcEntry[] = [];

  if (options.apply) {
    for (const c of candidates) {
      const full = path.join(stateDir, ...c.path.split('/'));
      try {
        fs.rmSync(full, { recursive: c.kind === 'dir', force: true });
        deleted.push(c);
      } catch {
        // Best-effort; skip what cannot be removed
      }
    }
    try {
      fs.writeFileSync(path.join(stateDir, GC_MARKER), new Date(options.now ?? Date.now()).toISOString());
    } catch {
      // ignore
    }
  }

  return {
    stateDir,
    candidates,
    deleted,
    bytes: (options.apply ? deleted : candidates).reduce((n, e) => n + e.bytes, 0),
    applied: !!options.apply,
  };
}

/**
 * True when no applied purge has run in the last GC_INTERVAL_MS.
 */
export function isGcDue(stateDir: string, now: number = Date.now()): boolean {
  const st = statSafe(path.join(stateDir, GC_MARKER));
  if (!st) return true;
  return now - st.mtimeMs > GC_INTERVAL_MS;
}

export interface NestedSpecweaveDir {
  /** Path relative to projectRoot, forward slashes */
  path: string;
  bytes: number;
  /** No config.json → never `specweave init`-ed here; likely a stray copy */
  stale: boolean;
}

const SCAN_SKIP = new Set(['node_modules', '.git', '.worktrees', 'dist', '.specweave']);

/**
 * Find .specweave/ directories nested below the project root (max depth 4).
 * Reports only; never deletes.
 */
export function findNestedSpecweaveDirs(projectRoot: string, maxDepth = 4): NestedSpecweaveDir[] {
  const found: NestedSpecweaveDir[] = [];

  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.name === '.specweave') {
        if (depth === 0) continue; // the project's own
        found.push({
          path: path.relative(projectRoot, full).split(path.sep).join('/'),
          bytes: dirSize(full),
          stale: !fs.existsSync(path.join(full, 'config.json')),
        });
        continue;
      }
      if (SCAN_SKIP.has(e.name) || e.name.startsWith('.')) continue;
      walk(full, depth + 1);
    }
  };

  walk(projectRoot, 0);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** Size of <projectRoot>/.worktrees (0 when absent). */
export function worktreesSize(projectRoot: string): number {
  return dirSize(path.join(projectRoot, '.worktrees'));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
