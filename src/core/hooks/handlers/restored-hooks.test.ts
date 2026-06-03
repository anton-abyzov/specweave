/**
 * Routed tests for the 5 non-blocking hooks restored in 0870.
 *
 * These were dead since 0f81519b1: hooks.json invoked `specweave hook <X>` but
 * the router never registered them, so they silently returned the safe default.
 *
 * Every test routes THROUGH `hookRouter('<name>', stdin)` (never a direct handler
 * call) so the dispatcher -> handler contract is what is locked, and asserts the
 * observable side-effect on disk plus that the hook never blocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { hookRouter } from './hook-router.js';

/** A throwaway SpecWeave git repo so findProjectRoot() resolves to it. */
function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'restored-hooks-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

const stateFile = (root: string, ...p: string[]) =>
  path.join(root, '.specweave', 'state', ...p);

describe('restored hooks (0870) — routed through the dispatcher', () => {
  let repo = '';
  const cwd0 = process.cwd();

  afterEach(() => {
    process.chdir(cwd0);
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('post-tool-use-analytics appends a Skill event to analytics/events.jsonl', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const res = await hookRouter(
      'post-tool-use-analytics',
      JSON.stringify({ tool_name: 'Skill', tool_input: { skill: 'sw:do' } }),
    );

    // Never blocks.
    expect(res.decision).not.toBe('block');

    const eventsPath = stateFile(repo, 'analytics', 'events.jsonl');
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(1);
    const ev = JSON.parse(lines[0]);
    expect(ev.type).toBe('skill');
    expect(ev.name).toBe('sw:do');
    expect(ev.plugin).toBe('specweave');
  });

  it('post-tool-use queues an event when an increment file is edited', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const tasksPath = path.join(
      repo, '.specweave', 'increments', '0001-demo', 'tasks.md',
    );

    const res = await hookRouter(
      'post-tool-use',
      JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: tasksPath } }),
    );

    expect(res.decision).not.toBe('block');

    const pendingPath = stateFile(repo, 'event-queue', 'pending.jsonl');
    expect(fs.existsSync(pendingPath)).toBe(true);
    const lines = fs.readFileSync(pendingPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(1);
    const ev = JSON.parse(lines[0]);
    expect(ev.event).toBe('task.updated');
    expect(ev.incrementId).toBe('0001-demo');
  });

  it('post-tool-use ignores non-increment edits (no queue created)', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const res = await hookRouter(
      'post-tool-use',
      JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: path.join(repo, 'README.md') } }),
    );

    expect(res.decision).not.toBe('block');
    expect(fs.existsSync(stateFile(repo, 'event-queue', 'pending.jsonl'))).toBe(false);
  });

  it('stop-sync dedups by increment and clears the pending queue', async () => {
    repo = mkRepo();
    process.chdir(repo);

    // Seed two events for the same increment + one for another.
    const queueDir = stateFile(repo, 'event-queue');
    fs.mkdirSync(queueDir, { recursive: true });
    const pendingPath = path.join(queueDir, 'pending.jsonl');
    fs.writeFileSync(
      pendingPath,
      [
        JSON.stringify({ event: 'task.updated', incrementId: '0001-demo', timestamp: 'a' }),
        JSON.stringify({ event: 'spec.updated', incrementId: '0001-demo', timestamp: 'b' }),
        JSON.stringify({ event: 'task.updated', incrementId: '0002-other', timestamp: 'c' }),
      ].join('\n') + '\n',
    );

    const res = await hookRouter('stop-sync', JSON.stringify({}));

    // Approves, never blocks.
    expect(res.decision).toBe('approve');

    // Queue cleared after processing.
    expect(fs.readFileSync(pendingPath, 'utf8').trim()).toBe('');
  });

  it('session-start clears a stale auto-mode file (>24h)', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const autoFile = stateFile(repo, 'auto-mode.json');
    fs.writeFileSync(autoFile, JSON.stringify({ active: true }));
    // Backdate mtime to 25h ago to trip the stale threshold.
    const old = Date.now() / 1000 - 25 * 60 * 60;
    fs.utimesSync(autoFile, old, old);

    const res = await hookRouter('session-start', JSON.stringify({}));

    expect(res.decision).not.toBe('block');
    expect(res.continue).toBe(true);
    expect(fs.existsSync(autoFile)).toBe(false);
  });

  it('session-start leaves a fresh auto-mode file intact', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const autoFile = stateFile(repo, 'auto-mode.json');
    fs.writeFileSync(autoFile, JSON.stringify({ active: true }));

    const res = await hookRouter('session-start', JSON.stringify({}));

    expect(res.continue).toBe(true);
    expect(fs.existsSync(autoFile)).toBe(true);
  });

  it('stop-reflect approves (never blocks)', async () => {
    repo = mkRepo();
    process.chdir(repo);

    const res = await hookRouter('stop-reflect', JSON.stringify({}));
    expect(res.decision).toBe('approve');
  });
});
