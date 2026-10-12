import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execute } from './util.mjs';

// Read-only allowance readers for subscriptions Switch does not route.
// They reuse logins that already exist on this Mac. Tokens stay in memory for
// one request and are never stored, logged or served; the keychain is never read
// directly (only through gh, which owns its own login).

const GH_CANDIDATES = ['/opt/homebrew/bin/gh', '/usr/local/bin/gh', '/usr/bin/gh'];
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;

async function firstExisting(paths) {
  for (const path of paths) { try { await access(path); return path; } catch { /* next */ } }
  return null;
}
async function readJsonc(path) {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text.split('\n').filter(line => !line.trimStart().startsWith('//')).join('\n'));
}

// Paid plans spend AI credits (premium_interactions); Free counts chat credits.
export function normalizeCopilot(response, { observedAt, source }) {
  if (!response || typeof response !== 'object' || !LOGIN.test(response.login || '')) return null;
  const snaps = response.quota_snapshots || {};
  const pick = [['premium_interactions', 'AI credits'], ['chat', 'Chat credits']]
    .map(([key, name]) => [snaps[key], name])
    .find(([q]) => q && q.unlimited !== true && Number.isFinite(q.entitlement) && q.entitlement > 0 && Number.isFinite(q.quota_remaining));
  const reset = Date.parse(response.quota_reset_date_utc || response.quota_reset_date || '');
  const plan = typeof response.copilot_plan === 'string' ? response.copilot_plan.slice(0, 32) : null;
  const org = Array.isArray(response.organization_login_list) && typeof response.organization_login_list[0] === 'string' ? response.organization_login_list[0].slice(0, 64) : null;
  const meter = pick ? {
    name: pick[1], entitlement: pick[0].entitlement,
    used: Math.max(0, Math.min(pick[0].entitlement, pick[0].entitlement - pick[0].quota_remaining)),
    overagePermitted: pick[0].overage_permitted === true,
  } : null;
  return { id: `copilot:${response.login.toLowerCase()}`, provider: 'copilot', login: response.login, plan, org, meter,
    resetsAt: Number.isFinite(reset) ? new Date(reset).toISOString() : null, observedAt, source };
}

// execute() redacts token-shaped output, so the one read that needs the token uses its own spawn.
function ghToken(gh, login) {
  return new Promise(resolve => {
    let out = '';
    const child = spawn(gh, ['auth', 'token', '-u', login], { stdio: ['ignore', 'pipe', 'ignore'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
    child.stdout.on('data', d => { if (out.length < 4096) out += d; });
    child.on('error', () => {});
    child.on('close', code => { clearTimeout(timer); resolve(code === 0 ? out.trim() : ''); });
  });
}
async function ghLogins(gh) {
  const status = await execute(gh, ['auth', 'status', '--json', 'hosts'], { timeoutMs: 10000, maxBytes: 64 * 1024 });
  try {
    const accounts = JSON.parse(status.stdout).hosts?.['github.com'] || [];
    return accounts.filter(a => a.state === 'success' && LOGIN.test(a.login || '')).map(a => a.login);
  } catch { return []; }
}

export async function readCopilot({ home = homedir(), fetchImpl = fetch, gh: ghPath } = {}) {
  const now = new Date().toISOString(), rows = new Map();
  const gh = ghPath === undefined ? await firstExisting(GH_CANDIDATES) : ghPath;
  if (gh) {
    for (const login of await ghLogins(gh)) {
      const token = await ghToken(gh, login);
      if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) continue;
      try {
        const response = await fetchImpl('https://api.github.com/copilot_internal/user', {
          headers: { authorization: `token ${token}`, accept: 'application/json', 'user-agent': 'specweave-switch' },
          redirect: 'error', signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) continue;
        const row = normalizeCopilot(await response.json(), { observedAt: now, source: 'live' });
        if (row) rows.set(row.id, row);
      } catch { /* fall back to the CLI cache */ }
    }
  }
  // Copilot CLI keeps its own last answer per signed-in account; use it, with its age, for accounts gh lacks.
  try {
    const cache = (await readJsonc(join(home, 'Library/Caches/copilot/copilot-user-cache.json'))).copilotUserCache || {};
    for (const entry of Object.values(cache)) {
      const at = Date.parse(entry?.retrievedAt || '');
      const row = normalizeCopilot(entry?.response, { observedAt: Number.isFinite(at) ? new Date(at).toISOString() : null, source: 'copilot-cli-cache' });
      if (row && !rows.has(row.id)) rows.set(row.id, row);
    }
  } catch { /* no Copilot CLI cache on this Mac */ }
  let cliLogin = null;
  try { cliLogin = (await readJsonc(join(home, '.copilot/config.json'))).lastLoggedInUser?.login || null; } catch { /* not installed */ }
  return [...rows.values()].map(row => ({ ...row, cliActive: !!cliLogin && cliLogin.toLowerCase() === row.login.toLowerCase() }));
}

// CLIProxyAPI's own account list; a port that answers is not the same as a proxy that can serve anything.
export async function readProxyAccounts({ home = homedir(), port = 8317, fetchImpl = fetch } = {}) {
  let key;
  try { key = (await readFile(join(home, '.local/share/specweave/proxy/secrets/management-key.txt'), 'utf8')).trim(); } catch { return null; }
  if (!key) return null;
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/v0/management/auth-files`, { headers: { authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body?.files) ? body.files.length : null;
  } catch { return null; }
}
