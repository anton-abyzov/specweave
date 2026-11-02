import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BIN = path.resolve('bin/specweave.js');

function run(args: string[]) {
  if (!fs.existsSync(path.resolve('dist/src/cli/commands/init.js'))) throw new Error('dist/ is missing: run `npm run build` before this test');
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
}

/** Plumbing and legacy commands: registered with { hidden: true }, still runnable. */
const HIDDEN = [
  'statusline', 'usage-guard', 'autocompact', 'lsp', 'team', 'qa', 'next-id', 'check-discipline',
  'auto', 'auto-status', 'cancel-auto', 'gc', 'save', 'link-pr', 'branch-name', 'refresh-plugins',
  'update-instructions',
];

describe('specweave --help', () => {
  const help = run(['--help']);
  const commandsBlock = help.stdout.split('Commands:')[1]?.split('The loop:')[0] ?? '';
  const listed = commandsBlock.split('\n').map((l) => l.trim().split(/[\s|]/)[0]).filter(Boolean);

  it('shows the loop: init, create-increment, task done --run, verify, complete, handoff, pickup', () => {
    expect(help.status).toBe(0);
    const loop = help.stdout.split('The loop:')[1] ?? '';
    for (const cmd of ['specweave init', 'specweave create-increment "', 'specweave task done T-01 --run', 'specweave verify', 'specweave complete', 'specweave handoff', 'specweave pickup']) {
      expect(loop).toContain(cmd);
    }
    expect(help.stdout).not.toContain('.cursorrules');
    expect(help.stdout).not.toContain('tasks.md');
  });

  it('does not list plumbing or legacy commands', () => {
    for (const name of HIDDEN) expect(listed, name).not.toContain(name);
    for (const name of ['init', 'create-increment', 'task', 'verify', 'complete', 'handoff', 'pickup', 'status']) {
      expect(listed, name).toContain(name);
    }
  });

  it('hidden commands still run', () => {
    for (const name of ['next-id', 'gc', 'qa']) {
      const r = run([name, '--help']);
      expect(r.status, name).toBe(0);
      expect(r.stdout, name).toContain(`Usage: specweave ${name}`);
    }
  });
});
