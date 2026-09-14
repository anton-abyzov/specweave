import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

describe('minimal default hooks', () => {
  it('does not intercept edits or capture Git during compaction', () => {
    const manifest = JSON.parse(readFileSync('plugins/specweave/hooks/hooks.json', 'utf8'));
    expect(Object.keys(manifest.hooks).sort()).toEqual(['SessionStart', 'Stop']);
  });

  function run(active?: boolean, nested = false) {
    const root = mkdtempSync(path.join(tmpdir(), 'sw-minimal-hook-'));
    dirs.push(root);
    mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
    writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
    if (active !== undefined) writeFileSync(path.join(root, '.specweave', 'state', 'auto-mode.json'), JSON.stringify({ active }));
    copyFileSync('plugins/specweave/hooks/run.mjs', path.join(root, 'run.mjs'));
    // The worker makes invocation observable without an installed CLI.
    writeFileSync(path.join(root, 'run-worker.mjs'), 'process.stdin.resume(); process.stdin.on("end",()=>console.log(JSON.stringify({workerLoaded:true})));');
    const cwd = nested ? path.join(root, 'src', 'nested') : root;
    mkdirSync(cwd, { recursive: true });
    const result = spawnSync(process.execPath, [path.join(root, 'run.mjs'), 'stop'], {
      cwd, input: JSON.stringify({ cwd }), encoding: 'utf8', timeout: 3000,
      env: { ...process.env, CLAUDE_SESSION_ID: '' },
    });
    expect(result.status).toBe(0);
    return JSON.parse(result.stdout);
  }

  it('inactive ordinary turns never load the CLI worker', () => {
    expect(run()).toEqual({});
    expect(run(false)).toEqual({});
    expect(run(undefined, true)).toEqual({});
  });

  it('explicit auto mode still loads the loop worker from nested directories', () => {
    expect(run(true, true)).toEqual({ workerLoaded: true });
  });
});
