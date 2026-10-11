import { mkdtemp, realpath, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { git } from '../lib/checkpoint.mjs';
import { initState, mutateState } from '../lib/state.mjs';
export async function fixture(t) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'sw-switch-test-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const repo = join(base, 'repo'), root = join(base, 'state'), home = join(base, 'home');
  await mkdir(repo); await mkdir(home);
  await git(repo, ['init', '-q']); await git(repo, ['config', 'user.name', 'Fixture']); await git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  await writeFile(join(repo, 'main.txt'), 'original\n'); await git(repo, ['add', 'main.txt']); await git(repo, ['commit', '-qm', 'base']);
  await initState(root, home);
  return { base, repo, root, home };
}
export function quota({ used = 20, reset = 3600, weekly = 35, now = Date.now() } = {}) {
  return { window: { usedPercent: used, resetsAt: Math.floor(now / 1000) + reset }, weekly: { usedPercent: weekly, resetsAt: Math.floor(now / 1000) + 86400 }, observedAt: new Date(now).toISOString(), expiresAt: new Date(now + 900000).toISOString(), source: 'manual' };
}
export async function fakeBinary(base, name, code) {
  const file = join(base, name + '.mjs'); await writeFile(file, `#!/usr/bin/env node\n${code}\n`, { mode: 0o755 }); return file;
}
export async function authed(root, id, binary, observation = quota()) {
  await mutateState(root, s => Object.assign(s.accounts.find(a => a.id === id), { authenticated: true, binary, quota: observation }));
}
export async function patchManifest(root, id, fn) {
  const file = join(root, 'checkpoints', id + '.json'); const manifest = JSON.parse(await readFile(file, 'utf8')); fn(manifest); await writeFile(file, JSON.stringify(manifest));
}
