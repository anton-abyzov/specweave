/**
 * `specweave handoff --push`: make the work visible to a session that only
 * sees the remote (a cloud thread, another machine, another account).
 *
 * 1. Pushes the current branch when it has no upstream or is ahead of it.
 * 2. Snapshots uncommitted edits (tracked and untracked, minus ignored files)
 *    as a commit built through a private index, and force-pushes it to
 *    `wip/<branch>`. The user's index, working tree and branch are untouched,
 *    so nothing they have staged changes and no commit lands on their branch.
 *
 * The next agent applies the snapshot with
 * `git fetch origin wip/<branch> && git cherry-pick --no-commit FETCH_HEAD`.
 *
 * @module core/session/handoff-push
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { HandoffPushInfo } from './handoff-doc-format.js';

const PUSH_TIMEOUT_MS = 60_000;

export function wipRefFor(branch: string): string {
  return `wip/${branch}`;
}

export function pushHandoff(repoRoot: string, remote = 'origin'): HandoffPushInfo {
  const warnings: string[] = [];
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' };
  const git = (args: string[], extraEnv: NodeJS.ProcessEnv = {}): string =>
    execFileSync('git', args, {
      cwd: repoRoot, env: { ...env, ...extraEnv }, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'], timeout: PUSH_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024,
    }).trim();
  const tryGit = (args: string[]): string | null => { try { return git(args); } catch { return null; } };

  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') return { warnings: ['not a git repository'] };
  const branch = tryGit(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (!branch) return { warnings: ['detached HEAD; check out a branch to push'] };
  if (tryGit(['remote', 'get-url', remote]) === null) return { warnings: [`no "${remote}" remote`] };
  const head = tryGit(['rev-parse', 'HEAD']);
  if (!head) return { warnings: ['no commits yet; commit once before pushing a handoff'] };

  const info: HandoffPushInfo = { warnings };

  // 1. The branch itself.
  const upstream = tryGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const ahead = upstream ? Number(tryGit(['rev-list', '--count', `${upstream}..HEAD`]) ?? '0') : undefined;
  if (!upstream || (ahead ?? 0) > 0) {
    try {
      if (upstream) {
        const slash = upstream.indexOf('/');
        git(['push', upstream.slice(0, slash), `HEAD:refs/heads/${upstream.slice(slash + 1)}`]);
      } else {
        git(['push', '-u', remote, branch]);
      }
      info.branch = branch;
    } catch (e) {
      warnings.push(`branch push failed (${firstLine(e)}); push it yourself`);
    }
  }

  // 2. Uncommitted edits, through a private index.
  let tmp: string | undefined;
  try {
    const indexPath = git(['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-wip-index-'));
    const privateIndex = path.join(tmp, 'index');
    if (fs.existsSync(indexPath)) fs.copyFileSync(indexPath, privateIndex);
    const withIndex = { GIT_INDEX_FILE: privateIndex };
    git(['add', '-A', '--', '.'], withIndex);
    const tree = git(['write-tree'], withIndex);
    const headTree = git(['rev-parse', 'HEAD^{tree}']);
    if (tree === headTree) return info; // nothing uncommitted
    const identity = tryGit(['config', 'user.email']) ? {} : {
      GIT_AUTHOR_NAME: 'SpecWeave handoff', GIT_AUTHOR_EMAIL: 'handoff@specweave.local',
      GIT_COMMITTER_NAME: 'SpecWeave handoff', GIT_COMMITTER_EMAIL: 'handoff@specweave.local',
    };
    const commit = git(['commit-tree', tree, '-p', head, '-m', `WIP handoff snapshot of ${branch}`], identity);
    const ref = wipRefFor(branch);
    git(['push', '--force', remote, `${commit}:refs/heads/${ref}`]);
    info.wipRef = ref;
  } catch (e) {
    warnings.push(`WIP snapshot push failed (${firstLine(e)}); the diff file still has the edits`);
  } finally {
    if (tmp) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  return info;
}

function firstLine(e: unknown): string {
  const err = e as { stderr?: string | Buffer; message?: string };
  const text = (err.stderr ? String(err.stderr) : '') || err.message || String(e);
  return text.split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 160) ?? 'unknown error';
}
