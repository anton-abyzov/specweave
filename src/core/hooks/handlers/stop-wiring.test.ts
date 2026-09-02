/**
 * Wiring tests for the gated Stop auto-handoff (0868, fixes 0867 AC-US7-02).
 *
 * The bug: hook-router maps the event key 'stop' -> pre-compact.js#handleStop,
 * but plugins/specweave/hooks/hooks.json's Stop[] array never invokes
 * `specweave hook stop` (only stop-reflect/stop-auto/stop-sync), so the handler
 * is unreachable in production. The existing pre-compact.test.ts called
 * handleStop() DIRECTLY, masking the gap.
 *
 * These tests exercise the REAL paths instead:
 *  1. A pin test on hooks.json so the plugin wiring can't silently regress.
 *  2. A routed test through hookRouter('stop', ...) so the dispatcher -> handler
 *     contract (incl. the auto-mode gate) is locked.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { hookRouter } from './hook-router.js';

/** Collect every `command` string under the Stop hook in hooks.json. */
function stopCommands(): string[] {
  const hooksJsonPath = path.resolve(process.cwd(), 'plugins/specweave/hooks/hooks.json');
  const data = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
  const root = data.hooks ?? data;
  const stopGroups: Array<{ hooks?: Array<{ command?: string }> }> = root.Stop ?? [];
  const cmds: string[] = [];
  for (const group of stopGroups) {
    for (const h of group.hooks ?? []) {
      if (typeof h.command === 'string') cmds.push(h.command);
    }
  }
  return cmds;
}

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-wiring-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  execFileSync('git', ['checkout', '-q', '-b', 'main'], { cwd: root });
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: root });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

function readHandoffDoc(root: string): string {
  const candidates = [
    path.join(root, 'HANDOFF.md'),
    path.join(root, '.handoff', 'HANDOFF.md'),
  ];
  // 2.0: the canonical location is next to the active increment; the state dir
  // only holds a pointer to it.
  const pointer = path.join(root, '.specweave', 'state', 'handoff-latest.txt');
  if (fs.existsSync(pointer)) candidates.unshift(fs.readFileSync(pointer, 'utf-8').trim());
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, 'utf-8');
  }
  return '';
}

describe('Stop auto-handoff wiring (AC-US7-02)', () => {
  let repo = '';
  const cwd0 = process.cwd();

  afterEach(() => {
    process.chdir(cwd0);
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('hooks.json Stop[] invokes `specweave hook stop` (AC-US1-03 pin)', () => {
    const cmds = stopCommands();
    // The bare `stop` event — NOT stop-reflect/stop-auto/stop-sync.
    const wired = cmds.some((c) => /specweave hook stop(?![-\w])/.test(c));
    expect(wired, `Stop commands found:\n${cmds.join('\n')}`).toBe(true);
  });

  it('routed Stop writes a handoff when auto-mode.json is present (AC-US1-02)', async () => {
    repo = mkRepo();
    fs.writeFileSync(path.join(repo, '.specweave', 'state', 'auto-mode.json'), '{}');
    process.chdir(repo);
    const res = await hookRouter('stop', JSON.stringify({ reason: 'auto run paused' }));
    expect(res).toEqual({ continue: true });
    expect(readHandoffDoc(repo)).toContain('auto run paused');
  });

  it('routed Stop writes nothing without auto-mode.json (AC-US1-02 gate)', async () => {
    repo = mkRepo();
    process.chdir(repo);
    const res = await hookRouter('stop', JSON.stringify({}));
    expect(res).toEqual({ continue: true });
    expect(readHandoffDoc(repo)).toBe('');
  });
});
