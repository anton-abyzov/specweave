import { homedir, hostname } from 'node:os';
import { join, isAbsolute, resolve } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { atomicJSON, withLock } from './util.mjs';
import { accessSync, constants, statSync, realpathSync } from 'node:fs';

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
  if (!['codex', 'claude'].includes(provider)) return null;
  const candidates = ['.local/share/specweave/providers/bin', '.local/share/specweave/providers/node_modules/.bin'].map(p => join(home, p, provider));
  candidates.push(...(process.env.PATH || '').split(':').filter(Boolean).map(p => join(p, provider)));
  // Never return a bare name: spawning it would search rejected PATH entries again.
  return candidates.map(file => resolve(file)).find(file => { try { validateNativeBinary(file); return true; } catch { return false; } }) || null;
}
/** Service rows left in older state files by the retired pre-Studio workbench; never probed or shown. */
export const isRetiredService = s => String(s?.id ?? '').startsWith('t3');
const legacyWorkbenchPath = /(?:^|\/)\.local\/share\/t3(?:-nightly)?(?:\/|$)/i;
/** Validate both the requested path and its actual target without running it. */
export function validateNativeBinary(binary) {
  if (typeof binary !== 'string' || !isAbsolute(binary) || binary.includes('\0') || legacyWorkbenchPath.test(resolve(binary))) throw new Error('Native binary must be an absolute independent executable file');
  let target;
  try {
    target = realpathSync(binary);
    if (legacyWorkbenchPath.test(target)) throw new Error('legacy target');
    accessSync(target, constants.X_OK);
    if (!statSync(target).isFile()) throw new Error('not a regular file');
  } catch { throw new Error('Native binary must resolve to an executable file outside legacy workbench directories'); }
  return target;
}
/** Explicit binary-only repair. Authentication, discovery and provider execution are forbidden here. */
export async function rebindAccountBinary(root, accountId, binary) {
  return withLock(join(root, '.state.lock'), async () => {
    const state = await readState(root), account = state.accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Unknown profile');
    if (!['codex', 'claude'].includes(account.provider) || !account.id.startsWith(`${account.provider}-`)) throw new Error('Unsupported profile provider');
    if (['active', 'running'].includes(account.status) || state.runs.some(r => r.accountId === account.id && ['active', 'running'].includes(r.status))) throw new Error('Profile has an active native run; binary was not changed');
    const target = validateNativeBinary(binary), changed = account.binary !== target;
    if (changed) { account.binary = target; await atomicJSON(join(root, 'state.json'), state); }
    return { id: account.id, provider: account.provider, binary: target, changed };
  });
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
        { id: 'm1', label: 'M1 Mac', hostname: process.env.SPECWEAVE_SWITCH_M1_HOST || 'm1.local', role: 'worker', status: 'unknown', sshReachable: null, installed: null },
        { id: 'm3', label: 'M3 Mac', hostname: process.env.SPECWEAVE_SWITCH_M3_HOST || 'm3.local', role: 'worker', status: 'unknown', sshReachable: null, installed: null }],
      services: [{ id: 'cli-proxy', label: 'CLIProxyAPI', port: 8317, status: 'unknown' }], };
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
