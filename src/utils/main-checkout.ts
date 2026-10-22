/**
 * Main checkout of a Git worktree.
 *
 * SpecWithCode runs threads in linked worktrees outside the project
 * (`~/.specwithcode/<machine>/worktrees/*`), where no `.specweave/` is found by
 * walking up. A linked worktree's `.git` is a file whose `gitdir:` line points
 * into `<main>/.git/worktrees/<name>`, so the main checkout (and the planning
 * root above it) can be found from that line alone.
 *
 * Sync `fs` only and no Git process: the hook launcher inlines the same logic
 * (`plugins/specweave/hooks/run.mjs`, `run-worker.mjs`) and a parity test keeps
 * the copies equal.
 *
 * @module utils/main-checkout
 */

import * as fs from 'fs';
import path from 'path';

const WORKTREE_GITDIR = /^gitdir:\s*(.*?)[\\/]\.git[\\/]worktrees[\\/][^\\/]+[\\/]?\s*$/;

/**
 * The main checkout of the linked worktree containing `dir`, or null when the
 * nearest `.git` is a directory (an ordinary checkout), a submodule link
 * (`.git/modules/`), unreadable, or absent.
 */
export function mainCheckoutOf(dir: string): string | null {
  return worktreeLink(dir)?.main ?? null;
}

/** Top of the linked worktree containing `dir` (the folder holding its `.git` file), or null. */
export function linkedWorktreeRoot(dir: string): string | null {
  return worktreeLink(dir)?.root ?? null;
}

/**
 * Where Git commands for work started in `startDir` run. Planning state may
 * resolve to the main checkout (`findEffectiveRoot`), but a thread's branch,
 * diff and pushes live in its own worktree.
 */
export function gitCheckoutFor(startDir: string, planningRoot: string): string {
  const own = linkedWorktreeRoot(startDir);
  if (!own) return planningRoot;
  const rel = path.relative(own, path.resolve(planningRoot));
  const inside = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  return inside ? planningRoot : own;
}

function worktreeLink(dir: string): { root: string; main: string } | null {
  let current: string;
  try {
    current = path.resolve(dir);
  } catch {
    return null;
  }
  for (let depth = 0; depth < 100; depth++) {
    const dotGit = path.join(current, '.git');
    try {
      const stat = fs.statSync(dotGit, { throwIfNoEntry: false });
      if (stat) {
        if (!stat.isFile()) return null;
        const first = fs.readFileSync(dotGit, 'utf8').split(/\r?\n/, 1)[0] ?? '';
        const match = WORKTREE_GITDIR.exec(first.trim());
        return match && match[1] ? { root: current, main: path.resolve(current, match[1]) } : null;
      }
    } catch {
      return null;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}
