/**
 * Regression: the pre-commit hook `specweave init` installs must not block the
 * SpecWeave 2.0 loop.
 *
 * Two failures shipped in the 1.x hook body and survived a green suite because
 * nothing ever ran `git commit` through the installed hook:
 *   1. the increment-root allow-list was the 1.x "only 4 files" set, so
 *      `ledger.jsonl` / `handoff.md` / `handoff.diff` — written to the
 *      increment root by the 2.0 CLI itself — were rejected as pollution.
 *   2. the duplicate-increment scan used `find -maxdepth 2 -type d`, which
 *      counts `0001-slug/reports` as a second `0001`, so every increment that
 *      had run `task done` or `verify` reported a false duplicate.
 *
 * These tests install the RENDERED hook into a throwaway git repo and drive a
 * real commit through it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import {
  renderPreCommitHook,
  installGitHooks,
  needsHookRefresh,
  readInstalledHookVersion,
  PRE_COMMIT_HOOK_VERSION,
} from '../../../src/cli/helpers/init/git-hooks-installer.js';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../src/templates');
const TEMPLATE = path.join(TEMPLATES_DIR, 'git-hooks', 'pre-commit.template');

let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  });
}

/** Commit, capturing BOTH streams (the hook writes to stdout via git's tty). */
function tryCommit(message: string): { ok: boolean; output: string } {
  const r = spawnSync('git', ['commit', '-m', message], {
    cwd: repo,
    encoding: 'utf-8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  });
  return { ok: r.status === 0, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function writeIncrement(id: string, slug: string, files: Record<string, string>): void {
  const dir = path.join(repo, '.specweave', 'increments', `${id}-${slug}`);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
  }
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hook-'));
  git('init', '-q', '.');
  // A machine-global core.hooksPath (common on dev boxes) would silently
  // shadow .git/hooks and make this test vacuous.
  git('config', 'core.hooksPath', '.git/hooks');
  installGitHooks(repo, TEMPLATES_DIR);
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe('installed pre-commit hook (2.0)', () => {
  it('allows the first commit of a valid 2.0 increment (ledger.jsonl + handoff at root)', () => {
    writeIncrement('0001', 'add-a-health-endpoint', {
      'metadata.json': '{"id":"0001","status":"active"}\n',
      'spec.md': '# Spec\n',
      'tasks.md': '# Tasks\n',
      'ledger.jsonl': '{"t":"T-01","e":"claim","by":"a","at":"2026-09-02T10:00:00Z"}\n',
      'handoff.md': '# Handoff\n',
      'handoff.diff': 'diff --git a b\n',
      'rubric.md': '# Rubric\n',
      'reports/verify.json': '{}\n',
    });
    git('add', '-A');

    const result = tryCommit('0001: add GET /health returning 200');
    expect(result.output).not.toMatch(/pollution detected/i);
    expect(result.output).not.toMatch(/Duplicate increment IDs found/i);
    expect(result.ok).toBe(true);
  });

  it('does not report a false duplicate when an increment has a reports/ subfolder', () => {
    // The exact shape `task done --run` + `verify` leave behind.
    writeIncrement('0001', 'only-one', {
      'metadata.json': '{}\n',
      'spec.md': '# S\n',
      'tasks.md': '# T\n',
      'reports/task-T-01.log': 'ok\n',
      'reports/verify.json': '{}\n',
      'logs/run.log': 'ok\n',
    });
    git('add', '-A');

    const result = tryCommit('0001: work');
    expect(result.output).toMatch(/No duplicates found/);
    expect(result.ok).toBe(true);
  });

  it('still blocks a REAL duplicate increment id across lifecycle folders', () => {
    writeIncrement('0001', 'live', { 'metadata.json': '{}\n', 'spec.md': '# S\n', 'tasks.md': '# T\n' });
    const archived = path.join(repo, '.specweave', 'increments', '_archive', '0001-old');
    fs.mkdirSync(archived, { recursive: true });
    fs.writeFileSync(path.join(archived, 'metadata.json'), '{}\n');
    git('add', '-A');

    const result = tryCommit('0001: work');
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/Duplicate ID: 0001/);
  });

  it('still blocks genuine increment-root pollution', () => {
    writeIncrement('0001', 'live', {
      'metadata.json': '{}\n',
      'spec.md': '# S\n',
      'tasks.md': '# T\n',
      'random-analysis.md': 'stuff\n',
    });
    git('add', '-A');

    const result = tryCommit('0001: work');
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/Increment folder pollution detected/i);
    expect(result.output).toMatch(/random-analysis\.md/);
  });
});

describe('hook rendering and refresh', () => {
  it('leaves no unsubstituted placeholder in the installed hook', () => {
    const installed = fs.readFileSync(path.join(repo, '.git', 'hooks', 'pre-commit'), 'utf-8');
    expect(installed).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(installed).toContain('ledger.jsonl');
    expect(installed).toContain('handoff.md');
  });

  it('is POSIX sh clean (dash is /bin/sh on Debian) - no bash arrays', () => {
    const template = fs.readFileSync(TEMPLATE, 'utf-8');
    expect(template).not.toMatch(/\$\{[A-Z_]+\[@\]\}/);
    expect(template.startsWith('#!/bin/sh')).toBe(true);
  });

  it('refreshes an already-installed stale 1.x hook instead of leaving it', () => {
    const hookPath = path.join(repo, '.git', 'hooks', 'pre-commit');
    const stale = renderPreCommitHook(fs.readFileSync(TEMPLATE, 'utf-8'))
      .replace(`# Version: ${PRE_COMMIT_HOOK_VERSION}`, '# Version: 1.0.0')
      .replace('ledger.jsonl|', ''); // simulate the 1.x allow-list
    fs.writeFileSync(hookPath, stale, 'utf-8');

    expect(readInstalledHookVersion(stale)).toBe('1.0.0');
    expect(needsHookRefresh(stale)).toBe(true);

    installGitHooks(repo, TEMPLATES_DIR);

    const after = fs.readFileSync(hookPath, 'utf-8');
    expect(readInstalledHookVersion(after)).toBe(PRE_COMMIT_HOOK_VERSION);
    expect(after).toContain('ledger.jsonl');
  });

  it('never overwrites a foreign (non-SpecWeave) pre-commit hook', () => {
    const hookPath = path.join(repo, '.git', 'hooks', 'pre-commit');
    fs.writeFileSync(hookPath, '#!/bin/sh\necho mine\n', 'utf-8');
    expect(needsHookRefresh('#!/bin/sh\necho mine\n')).toBe(false);

    installGitHooks(repo, TEMPLATES_DIR);
    expect(fs.readFileSync(hookPath, 'utf-8')).toBe('#!/bin/sh\necho mine\n');
  });
});
