/**
 * Unit tests for the PreCompact (+ gated Stop) hook handler (T-014, AC-US7-*).
 *
 * Verifies:
 * - PreCompact ALWAYS writes a handoff and returns the safe { continue: true }.
 * - Stop is GATED on an active auto session (auto-mode.json) (AC-US7-02).
 * - An agent-supplied `reason` flows through to the written doc, falling back
 *   to the hook-specific default when absent (AC-US7-04, regression guard for
 *   the dropped-reason bug F-002).
 * - A builder failure never breaks compaction (still returns continue:true).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { handle, handleStop } from './pre-compact.js';
import type { HookContext } from './types.js';

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'precompact-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  execFileSync('git', ['checkout', '-q', '-b', 'main'], { cwd: root });
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: root });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: root });
  // Mark as a SpecWeave project so the builder takes the high-fidelity path.
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

function ctx(root: string): HookContext {
  return {
    projectRoot: root,
    stateDir: path.join(root, '.specweave', 'state'),
    logsDir: path.join(root, '.specweave', 'logs'),
    configPath: path.join(root, '.specweave', 'config.json'),
    timestamp: new Date().toISOString(),
  };
}

/** Read whichever handoff doc the builder wrote (root HANDOFF.md or .handoff/). */
function readHandoffDoc(root: string): string {
  const candidates = [
    path.join(root, 'HANDOFF.md'),
    path.join(root, '.handoff', 'HANDOFF.md'),
    path.join(root, '.specweave', 'state', 'handoff-latest.md'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, 'utf-8');
  }
  return '';
}

describe('pre-compact handler', () => {
  let repo: string;

  afterEach(() => {
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
  });

  it('PreCompact always writes a handoff and returns continue:true', async () => {
    repo = mkRepo();
    const res = await handle({}, ctx(repo));
    expect(res).toEqual({ continue: true });
    expect(readHandoffDoc(repo).length).toBeGreaterThan(0);
  });

  it('honors an agent-supplied reason (AC-US7-04 — regression guard)', async () => {
    repo = mkRepo();
    await handle({ reason: 'out of subscription tokens' }, ctx(repo));
    expect(readHandoffDoc(repo)).toContain('out of subscription tokens');
  });

  it('falls back to the default reason when the agent supplies none', async () => {
    repo = mkRepo();
    await handle({}, ctx(repo));
    expect(readHandoffDoc(repo)).toContain('auto: pre-compact');
  });

  it('Stop does NOT write without an active auto session (AC-US7-02)', async () => {
    repo = mkRepo();
    const res = await handleStop({}, ctx(repo));
    expect(res).toEqual({ continue: true });
    expect(readHandoffDoc(repo)).toBe('');
  });

  it('Stop writes when auto-mode.json is present', async () => {
    repo = mkRepo();
    fs.writeFileSync(path.join(repo, '.specweave', 'state', 'auto-mode.json'), '{}');
    await handleStop({ reason: 'auto run paused' }, ctx(repo));
    expect(readHandoffDoc(repo)).toContain('auto run paused');
  });

  it('never breaks compaction even if the builder cannot run', async () => {
    // Point the project root at a path with no git + no .specweave; the builder
    // degrades, but the handler must still return the safe shape.
    const bogus = fs.mkdtempSync(path.join(os.tmpdir(), 'precompact-bogus-'));
    try {
      const res = await handle({}, ctx(bogus));
      expect(res).toEqual({ continue: true });
    } finally {
      fs.rmSync(bogus, { recursive: true, force: true });
    }
  });
});
