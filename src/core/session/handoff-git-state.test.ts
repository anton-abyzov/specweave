/**
 * Tests for handoff-git-state (T-003)
 *
 * Verifies branch/sha/status/stat capture, the sibling .diff dump (working +
 * staged), the non-git graceful-degrade path, and the hasUncommittedChanges flag.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { captureGitState } from './handoff-git-state.js';

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function git(repo: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
}

describe('captureGitState', () => {
  let repo: string;

  afterEach(() => {
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
  });

  it('captures branch, sha, porcelain status, stat and dumps the working diff', () => {
    repo = mkTmp('handoff-git-');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'checkout', '-q', '-b', 'main');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
    git(repo, 'add', 'a.txt');
    git(repo, 'commit', '-q', '-m', 'init');

    // unstaged edit + staged edit
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one\ntwo\n');
    fs.writeFileSync(path.join(repo, 'b.txt'), 'staged\n');
    git(repo, 'add', 'b.txt');

    const diffPath = path.join(repo, 'handoff.diff');
    const state = captureGitState(repo, diffPath);

    expect(state.branch).toBe('main');
    expect(state.shortSha).toMatch(/^[0-9a-f]{7,}$/);
    expect(state.statusPorcelain).toContain('a.txt');
    expect(state.statusPorcelain).toContain('b.txt');
    expect(state.diffStat).toMatch(/a\.txt/);
    expect(state.hasUncommittedChanges).toBe(true);

    expect(fs.existsSync(diffPath)).toBe(true);
    const diff = fs.readFileSync(diffPath, 'utf-8');
    // Working-tree change to a.txt and staged add of b.txt both present.
    expect(diff).toContain('a.txt');
    expect(diff).toContain('b.txt');
    expect(diff).toContain('+two');
  });

  it('captures the FULL body of a brand-new untracked file in the diff (AC-US4-01/02)', () => {
    repo = mkTmp('handoff-git-untracked-');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'checkout', '-q', '-b', 'main');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
    git(repo, 'add', 'a.txt');
    git(repo, 'commit', '-q', '-m', 'init');

    // A genuinely NEW file — never `git add`ed. Plain `git diff HEAD` would
    // emit only a `??` porcelain line and drop this content entirely.
    const newBody = 'brand new line A\nbrand new line B\n';
    fs.writeFileSync(path.join(repo, 'fresh.ts'), newBody);

    // Snapshot the index/status BEFORE the handoff so we can prove it is
    // restored afterward (a handoff is a read-only capture).
    const porcelainBefore = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf-8',
    });
    expect(porcelainBefore).toContain('?? fresh.ts');

    // Write the diff OUTSIDE the repo so it does not appear in the after-snapshot.
    const diffPath = path.join(os.tmpdir(), `handoff-untracked-${Date.now()}.diff`);
    const state = captureGitState(repo, diffPath);

    expect(state.hasUncommittedChanges).toBe(true);
    expect(state.statusPorcelain).toContain('fresh.ts');

    const diff = fs.readFileSync(diffPath, 'utf-8');
    expect(diff).toContain('fresh.ts');
    // The actual content lines must be present, not just the filename.
    expect(diff).toContain('+brand new line A');
    expect(diff).toContain('+brand new line B');

    // The intent-to-add MUST be reverted: the user's index is restored byte-for
    // byte to its pre-handoff state (fresh.ts is `?? ` untracked again, NOT a
    // staged `A ` intent entry). A handoff must never mutate the staging area.
    const porcelainAfter = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf-8',
    });
    expect(porcelainAfter).toBe(porcelainBefore);
    expect(porcelainAfter).toContain('?? fresh.ts');
  });

  it('restores the index for a brand-new repo with NO commits (no HEAD)', () => {
    repo = mkTmp('handoff-git-nohead-');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'checkout', '-q', '-b', 'main');

    // No commits yet → no HEAD. Untracked file must still be captured AND the
    // index restored via `git rm --cached` (since `git reset` needs a HEAD).
    fs.writeFileSync(path.join(repo, 'fresh.ts'), 'new\n');
    const porcelainBefore = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf-8',
    });
    expect(porcelainBefore).toContain('?? fresh.ts');

    // Write the diff OUTSIDE the repo so it does not appear in the after-snapshot.
    const diffPath = path.join(os.tmpdir(), `handoff-nohead-${Date.now()}.diff`);
    captureGitState(repo, diffPath);

    const diff = fs.readFileSync(diffPath, 'utf-8');
    expect(diff).toContain('+new');

    const porcelainAfter = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf-8',
    });
    expect(porcelainAfter).toBe(porcelainBefore);
    expect(porcelainAfter).toContain('?? fresh.ts');
  });

  it('reports no uncommitted changes on a clean repo and writes an empty diff', () => {
    repo = mkTmp('handoff-git-clean-');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'checkout', '-q', '-b', 'main');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
    git(repo, 'add', 'a.txt');
    git(repo, 'commit', '-q', '-m', 'init');

    const diffPath = path.join(repo, 'handoff.diff');
    const state = captureGitState(repo, diffPath);

    expect(state.hasUncommittedChanges).toBe(false);
    expect(state.diffStat).toBe('');
    expect(fs.existsSync(diffPath)).toBe(true);
    expect(fs.readFileSync(diffPath, 'utf-8')).toBe('');
  });

  it('degrades gracefully in a non-git directory (no throw, empty fields)', () => {
    repo = mkTmp('handoff-nogit-');
    const diffPath = path.join(repo, 'handoff.diff');
    const state = captureGitState(repo, diffPath);

    expect(state.branch).toBe('');
    expect(state.shortSha).toBe('');
    expect(state.statusPorcelain).toBe('');
    expect(state.diffStat).toBe('');
    expect(state.hasUncommittedChanges).toBe(false);
    expect(state.isGitRepo).toBe(false);
  });
});
