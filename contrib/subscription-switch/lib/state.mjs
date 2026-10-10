import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { atomicJSON, withLock } from './util.mjs';
import { existsSync } from 'node:fs';

export function stateRoot() { return process.env.SPECWEAVE_SWITCH_STATE || join(homedir(), '.local/share/specweave/switch'); }
export function profiles(home = homedir()) {
  const base = join(home, '.local/share/specweave/account-profiles');
  return [['codex', 4], ['claude', 3]].flatMap(([provider, count]) => Array.from({ length: count }, (_, n) => ({
    id: `${provider}-${n + 1}`, provider, label: `${provider === 'codex' ? 'Codex' : 'Claude'} ${n + 1}`,
    configDir: n === 0 ? join(home, `.${provider}`) : join(base, `${provider}-${n + 1}`),
    nativeDefault: n === 0,
    binary: findBinary(provider, home),
    authenticated: null, authObservedAt: null, authKind: null, quota: null,
  })));
}
export function findBinary(provider, home = homedir()) {
  const candidates = ['.local/share/t3/providers/node_modules/.bin', '.local/share/specweave/providers/node_modules/.bin'].map(p => join(home, p, provider));
  candidates.push(...(process.env.PATH || '').split(':').filter(Boolean).map(p => join(p, provider)));
  return candidates.find(existsSync) || candidates[0];
}
export async function initState(root = stateRoot(), home = homedir()) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  return withLock(join(root, '.state.lock'), async () => {
    try { return await readState(root); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const accounts = profiles(home);
    // Only create isolated slots. Existing native auth/config is never copied,
    // opened, overwritten, or initialized by this companion.
    for (const a of accounts.filter(a => !a.id.endsWith('-1'))) await mkdir(a.configDir, { recursive: true, mode: 0o700 });
    const state = { version: 1, accounts, policy: { mode: 'balanced', preferredProvider: null, selectedAccount: null }, runs: [],
      hosts: [{ id: 'local', label: hostname(), hostname: hostname(), role: 'local', status: 'local', sshReachable: null, installed: true },
        { id: 'm1', label: 'M1 Mac', hostname: '192.168.40.134', role: 'worker', status: 'unknown', sshReachable: null, installed: null },
        { id: 'm3', label: 'M3 Mac', hostname: '192.168.40.66', role: 'worker', status: 'unknown', sshReachable: null, installed: null }],
      services: [{ id: 't3', label: 'T3 stable', port: 3773, status: 'unknown' }, { id: 't3-nightly', label: 'T3 nightly', port: 3774, status: 'unknown' }, { id: 'cli-proxy', label: 'CLIProxyAPI', port: 8317, status: 'unknown' }], };
    await atomicJSON(join(root, 'state.json'), state); return state;
  });
}
export async function readState(root = stateRoot()) {
  const s = JSON.parse(await readFile(join(root, 'state.json'), 'utf8'));
  if (s.version !== 1 || !Array.isArray(s.accounts) || !Array.isArray(s.runs) || !s.policy) throw new Error('Invalid companion state; preserve it and repair explicitly');
  return s;
}
export async function mutateState(root, change) {
  return withLock(join(root, '.state.lock'), async () => { const state = await readState(root); await change(state); await atomicJSON(join(root, 'state.json'), state); return state; });
}
export async function ensureState(root = stateRoot()) {
  try { return await readState(root); } catch (e) { if (e.code !== 'ENOENT') throw e; return initState(root); }
}
