import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { execute, iso } from './util.mjs';
import { QUOTA_TTL_MS, claudeProfileIsolationUnverified } from './policy.mjs';
import { ensureState, mutateState } from './state.mjs';

export function nativeEnv(account) {
  const env = { ...process.env, PWDEBUG: '0', PLAYWRIGHT_HTML_OPEN: 'never' };
  // Inherited API/proxy auth must not silently charge API usage instead of the
  // selected native subscription. Do not replace HOME or copy credential data.
  for (const key of ['OPENAI_API_KEY', 'OPENAI_ACCESS_TOKEN', 'CODEX_ACCESS_TOKEN', 'OPENAI_BASE_URL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDECODE']) delete env[key];
  delete env.CLAUDE_CONFIG_DIR;
  if (account.provider === 'codex') env.CODEX_HOME = account.configDir;
  // Claude's native default keychain scope differs from an explicitly supplied
  // ~/.claude config directory. Leave its native default genuinely unset.
  // The ID fallback preserves already-created v0.1 companion state.
  else if (!account.nativeDefault && account.id !== 'claude-1') env.CLAUDE_CONFIG_DIR = account.configDir;
  return env;
}
export async function inspectAuth(account) {
  const args = account.provider === 'codex' ? ['login', 'status'] : ['auth', 'status', '--json'];
  const result = await execute(account.binary, args, { env: nativeEnv(account), timeoutMs: 12000, maxBytes: 128 * 1024 });
  if (result.error || result.timedOut) return { authenticated: null, authKind: null, authObservedAt: iso(), authError: result.error || 'native-auth-timeout' };
  if (account.provider === 'claude') {
    try {
      const body = JSON.parse(result.stdout), kind = String(body.authMethod || '').toLowerCase();
      const consumerAuth = ['claude.ai', 'claude_ai'].includes(kind);
      const knownApiAuth = ['api_key', 'api-key', 'apikey', 'bedrock', 'vertex', 'foundry'].includes(kind);
      if (result.exitCode === 0 && body.loggedIn === true && ['oauth_token', 'oauth-token'].includes(kind)) {
        const isolated = claudeProfileIsolationUnverified({ ...account, authKind: kind, authError: null });
        return { authenticated: null, authKind: kind, authObservedAt: iso(), authError: isolated ? 'profile-isolation-unverified' : 'subscription-auth-unverified' };
      }
      return { authenticated: result.exitCode === 0 && body.loggedIn === true && consumerAuth, authKind: consumerAuth || knownApiAuth ? kind : 'unknown', authObservedAt: iso(), authError: body.loggedIn === true && !consumerAuth ? 'subscription-auth-required' : null };
    }
    catch { return { authenticated: false, authKind: null, authObservedAt: iso(), authError: 'native-auth-output-unrecognized' }; }
  }
  const text = result.stdout + result.stderr;
  return { authenticated: result.exitCode === 0 && /logged in using ChatGPT/i.test(text), authKind: /logged in using ChatGPT/i.test(text) ? 'chatgpt' : /API key/i.test(text) ? 'api-key' : null, authObservedAt: iso(), authError: null };
}

// Supported Codex app-server protocol: initialize -> initialized notification ->
// account/rateLimits/read. No credential files or token payloads are inspected.
export function readCodexRateLimits(account, timeoutMs = 15000) {
  return new Promise(resolve => {
    const child = spawn(account.binary, ['app-server', '--stdio'], { env: nativeEnv(account), stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '', byteCount = 0, answer = null, error = null, phase = 'initialize', hardTimer;
    const stop = () => { child.kill('SIGTERM'); hardTimer = setTimeout(() => child.kill('SIGKILL'), 1500); hardTimer.unref(); };
    const timer = setTimeout(() => { error = 'quota-read-timeout'; stop(); }, timeoutMs);
    const write = msg => { if (!child.stdin.destroyed) child.stdin.write(JSON.stringify(msg) + '\n'); };
    child.stdin.on('error', () => {}); child.stderr.on('data', () => {});
    child.on('error', e => { error = `quota-read-${e.code || 'failed'}`; });
    child.stdout.on('data', chunk => {
      byteCount += chunk.length; if (byteCount > 1024 * 1024) { error = 'quota-output-limit'; stop(); return; }
      buffer += chunk.toString(); let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1 && phase === 'initialize') {
          if (msg.error) { error = 'quota-initialize-rejected'; stop(); return; }
          if (!msg.result) continue;
          phase = 'read'; write({ jsonrpc: '2.0', method: 'initialized' });
          write({ jsonrpc: '2.0', id: 2, method: 'account/rateLimits/read', params: {} });
        } else if (msg.id === 2 && phase === 'read') {
          if (msg.error) error = 'quota-read-unavailable'; else answer = msg.result;
          phase = 'done'; stop();
        }
      }
    });
    child.on('close', () => { clearTimeout(timer); clearTimeout(hardTimer); resolve({ data: answer, error }); });
    write({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'specweave_switch', title: 'SpecWeave Switch', version: '0.1.0' }, capabilities: { experimentalApi: true } } });
  });
}
export function normalizeCodexQuota(result, now = Date.now()) {
  const byId = result?.rateLimitsByLimitId;
  // A model bucket is not the account's main allowance. Never substitute it.
  const legacy = result?.rateLimits;
  const limits = byId?.codex || (!legacy?.limitId || legacy.limitId === 'codex' ? legacy : null);
  const ordinaryUsageAllowed = limits?.ordinaryUsageAllowed ?? result?.ordinaryUsageAllowed;
  const spendControlReached = limits?.spendControlReached ?? result?.spendControlReached;
  const reached = limits?.rateLimitReachedType;
  const rateLimitReachedType = typeof reached === 'string' && /^[a-z_]{1,80}$/.test(reached) ? reached : null;
  const denied = ordinaryUsageAllowed === false || spendControlReached === true || (rateLimitReachedType !== null && ordinaryUsageAllowed !== true);
  const rawCredits = limits?.credits;
  const credits = rawCredits && typeof rawCredits.hasCredits === 'boolean' && typeof rawCredits.unlimited === 'boolean'
    ? { hasCredits: rawCredits.hasCredits, unlimited: rawCredits.unlimited,
        ...(typeof rawCredits.balance === 'string' && /^\d{1,24}(?:\.\d{1,8})?$/.test(rawCredits.balance) ? { balance: rawCredits.balance } : {}) } : null;
  const rawResets = result?.rateLimitResetCredits;
  const resetCount = rawResets?.availableCount;
  const expiries = Array.isArray(rawResets?.credits) ? rawResets.credits.filter(c => c?.status === 'available' && Number.isFinite(c.expiresAt) && c.expiresAt > now / 1000 && c.expiresAt * 1000 <= 8640000000000000).map(c => c.expiresAt) : [];
  const resetCredits = Number.isSafeInteger(resetCount) && resetCount >= 0 && resetCount <= 1000000
    ? { availableCount: resetCount, ...(expiries.length ? { nextExpiresAt: new Date(Math.min(...expiries) * 1000).toISOString() } : {}) } : null;
  const normalize = w => w && Number.isFinite(w.usedPercent) && w.usedPercent >= 0 && w.usedPercent <= 100
    ? { usedPercent: w.usedPercent, resetsAt: Number.isFinite(w.resetsAt) && w.resetsAt > 0 ? w.resetsAt : null,
        ...(Number.isSafeInteger(w.windowDurationMins) && w.windowDurationMins > 0 ? { windowDurationMins: w.windowDurationMins } : {}) } : null;
  let window = null, weekly = null;
  for (const [position, observed] of [['primary', limits?.primary], ['secondary', limits?.secondary]]) {
    const w = normalize(observed); if (!w) continue;
    const weeklyWindow = Number.isFinite(observed.windowDurationMins) ? observed.windowDurationMins >= 10080 : position === 'secondary';
    if (weeklyWindow) { if (!weekly || w.usedPercent > weekly.usedPercent) weekly = w; }
    else if (!window || w.usedPercent > window.usedPercent) window = w;
  }
  const buckets = byId && typeof byId === 'object' && !Array.isArray(byId) ? Object.entries(byId) : [];
  if (limits && !buckets.some(([id]) => id === 'codex')) buckets.unshift(['codex', limits]);
  const windows = buckets.slice(0, 16).flatMap(([bucketId, bucket]) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(bucketId)) return [];
    return ['primary', 'secondary'].flatMap(position => {
      const w = normalize(bucket?.[position]);
      return w ? [{ ...w, id: `${bucketId}:${position}`, bucketId, appliesToSelection: bucketId === 'codex' }] : [];
    });
  });
  if (!window && !weekly && !windows.length && !denied && typeof ordinaryUsageAllowed !== 'boolean' && !credits && !resetCredits) return null;
  return { window, weekly, windows, observedAt: new Date(now).toISOString(), expiresAt: new Date(now + QUOTA_TTL_MS).toISOString(), source: 'native-app-server',
    ...(typeof ordinaryUsageAllowed === 'boolean' ? { ordinaryUsageAllowed } : {}), ...(typeof spendControlReached === 'boolean' ? { spendControlReached } : {}),
    ...(rateLimitReachedType ? { rateLimitReachedType } : {}), ...(denied ? { denied: true } : {}), ...(credits ? { credits } : {}), ...(resetCredits ? { resetCredits } : {}) };
}

function serviceProbe(service) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port: service.port });
    let settled = false;
    const done = status => { if (settled) return; settled = true; socket.destroy(); resolve({ ...service, status, observedAt: iso(), source: 'loopback-tcp' }); };
    socket.setTimeout(1500); socket.on('connect', () => done('running')); socket.on('error', () => done('unavailable')); socket.on('timeout', () => done('unavailable'));
  });
}
export async function refresh(root) {
  const state = await ensureState(root);
  const accounts = await Promise.all(state.accounts.map(async account => {
    const auth = await inspectAuth(account);
    let quota = account.quota, quotaError = null;
    if (auth.authenticated === true && account.provider === 'codex') {
      const readback = await readCodexRateLimits(account);
      const observed = normalizeCodexQuota(readback.data);
      // An unavailable refresh does not renew or erase the old observation.
      if (observed) quota = observed;
      quotaError = readback.error || (!observed ? 'quota-unavailable' : null);
    }
    return { ...account, ...auth, quota, quotaError };
  }));
  const services = await Promise.all(state.services.map(serviceProbe));
  return mutateState(root, current => {
    for (const update of accounts) {
      const target = current.accounts.find(a => a.id === update.id);
      if (target) Object.assign(target, { authenticated: update.authenticated, authKind: update.authKind, authObservedAt: update.authObservedAt, authError: update.authError, quota: update.quota, quotaError: update.quotaError });
    }
    current.services = services;
  });
}
export function nativeRunArgs(account, prompt, { model, sandbox = 'read-only' } = {}) {
  if (!['read-only', 'workspace-write'].includes(sandbox)) throw new Error('Companion sandbox must be read-only or workspace-write');
  if (account.provider === 'codex') return ['exec', '--json', '--sandbox', sandbox, ...(model ? ['--model', model] : []), '-'];
  // acceptEdits permits native file edits under normal Claude permissions.
  // Restricted file-only tools cannot run a shell/browser or silently bypass a
  // protected settings/git write. Such operations still require native approval.
  return ['--print', '--output-format', 'json', '--permission-mode', sandbox === 'workspace-write' ? 'acceptEdits' : 'dontAsk', '--permission-prompts', 'none', '--restricted', '--tools', sandbox === 'workspace-write' ? 'Read,Glob,Grep,Write,Edit' : 'Read,Glob,Grep', '--strict-mcp-config', ...(model ? ['--model', model] : [])];
}
