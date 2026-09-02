/**
 * SessionStart runs the state GC silently, at most once per 24h (.gc-last marker).
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { hookRouter } from './hook-router.js';
import { GC_MARKER } from '../../state/state-gc.js';

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-start-gc-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.mkdirSync(path.join(root, '.specweave', 'state', 'event-queue'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  return root;
}

const stateFile = (root: string, ...p: string[]) => path.join(root, '.specweave', 'state', ...p);

describe('session-start state GC', () => {
  let repo = '';
  const cwd0 = process.cwd();

  afterEach(() => {
    process.chdir(cwd0);
    if (repo && fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    repo = '';
  });

  it('purges junk on first session and writes the marker; keeps coordination files', async () => {
    repo = mkRepo();
    process.chdir(repo);
    fs.writeFileSync(stateFile(repo, '.us-completion-0001'), 'x');
    fs.writeFileSync(stateFile(repo, '.prev-status-0001'), 'x');
    fs.writeFileSync(stateFile(repo, 'event-queue', 'pending.jsonl'), '');
    fs.writeFileSync(stateFile(repo, 'sync-throttle.json'), '{}');

    const res = await hookRouter('session-start', '{}');
    expect(res.decision).not.toBe('block');

    expect(fs.existsSync(stateFile(repo, '.us-completion-0001'))).toBe(false);
    expect(fs.existsSync(stateFile(repo, '.prev-status-0001'))).toBe(false);
    expect(fs.existsSync(stateFile(repo, 'event-queue', 'pending.jsonl'))).toBe(true);
    expect(fs.existsSync(stateFile(repo, 'sync-throttle.json'))).toBe(true);
    expect(fs.existsSync(stateFile(repo, GC_MARKER))).toBe(true);
  });

  it('skips the purge when the marker is fresh (< 24h)', async () => {
    repo = mkRepo();
    process.chdir(repo);
    fs.writeFileSync(stateFile(repo, GC_MARKER), new Date().toISOString());
    fs.writeFileSync(stateFile(repo, '.us-completion-0001'), 'x');

    await hookRouter('session-start', '{}');

    expect(fs.existsSync(stateFile(repo, '.us-completion-0001'))).toBe(true);
  });

  it('runs again once the marker is older than 24h', async () => {
    repo = mkRepo();
    process.chdir(repo);
    const marker = stateFile(repo, GC_MARKER);
    fs.writeFileSync(marker, 'old');
    const old = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
    fs.utimesSync(marker, old, old);
    fs.writeFileSync(stateFile(repo, '.us-completion-0001'), 'x');

    await hookRouter('session-start', '{}');

    expect(fs.existsSync(stateFile(repo, '.us-completion-0001'))).toBe(false);
    expect(fs.statSync(marker).mtimeMs).toBeGreaterThan(old * 1000 + 1000);
  });
});
