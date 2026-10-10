export const MODES = ['balanced', 'reset-first', 'spend-first'];
export const QUOTA_TTL_MS = 15 * 60 * 1000;
export function claudeProfileIsolationUnverified(account) {
  // Legacy native oauth_token status can report the same ambient keychain login
  // for empty isolated config roots. No supported profile binding is observed.
  return account.authError === 'profile-isolation-unverified' || (account.provider === 'claude' && !account.nativeDefault && account.id !== 'claude-1' && ['oauth_token', 'oauth-token'].includes(account.authKind));
}
export function claudeSubscriptionAuthUnverified(account) {
  // oauth_token also appears for a native default backed by a credit balance.
  // A token method alone cannot establish a consumer subscription entitlement.
  return account.authError === 'subscription-auth-unverified' || (account.provider === 'claude' && ['oauth_token', 'oauth-token'].includes(account.authKind));
}
export function validateQuota(quota, now = Date.now()) {
  if (!quota || !['native-app-server', 'manual'].includes(quota.source)) throw new Error('Quota requires a native-app-server or explicit manual source');
  const observed = Date.parse(quota.observedAt), expiry = Date.parse(quota.expiresAt);
  if (!Number.isFinite(observed) || !Number.isFinite(expiry) || observed > now + 5000 || expiry <= observed || expiry - observed > 60 * 60 * 1000) throw new Error('Quota observation timestamp or expiry is invalid');
  for (const name of ['window', 'weekly']) {
    const q = quota[name]; if (q == null) continue;
    if (!Number.isFinite(q.usedPercent) || q.usedPercent < 0 || q.usedPercent > 100 || !Number.isFinite(q.resetsAt) || q.resetsAt <= 0) throw new Error('Invalid quota percentage or reset timestamp');
  }
  if (!quota.window && !quota.weekly && !(quota.denied === true && quota.source === 'native-app-server')) throw new Error('Quota observation requires an observed window or an authoritative native denial');
  return quota;
}
export function accountStatus(account, runs = [], now = Date.now()) {
  if (runs.some(r => r.accountId === account.id && r.status === 'running')) return 'active';
  if (claudeProfileIsolationUnverified(account) || claudeSubscriptionAuthUnverified(account)) return 'unknown';
  if (account.authenticated !== true) return account.authenticated === false ? 'auth-required' : 'unknown';
  if (['api_key', 'api-key', 'apikey', 'bedrock', 'vertex', 'foundry', 'unknown'].includes(account.authKind)) return 'auth-required';
  const q = account.quota;
  if (account.lastQuotaErrorAt) {
    const failedAt = Date.parse(account.lastQuotaErrorAt);
    if (!Number.isFinite(failedAt)) return 'stale';
    if (!q?.observedAt || Date.parse(q.observedAt) <= failedAt) return 'exhausted';
  }
  if (!q || (!q.window && !q.weekly && !q.denied)) return 'unknown';
  try { validateQuota(q, now); } catch { return 'stale'; }
  if (Date.parse(q.expiresAt) <= now || now - Date.parse(q.observedAt) > QUOTA_TTL_MS) return 'stale';
  if (q.denied === true || q.ordinaryUsageAllowed === false || q.spendControlReached === true) return 'exhausted';
  // A passed reset does not prove quota replenishment. Require fresh native
  // readback rather than treating the prior observation as available capacity.
  if ([q.window, q.weekly].filter(Boolean).some(w => w.resetsAt * 1000 <= now)) return 'stale';
  if ([q.window, q.weekly].filter(Boolean).some(w => w.usedPercent >= 100)) return 'exhausted';
  return 'ready';
}
function score(account, mode) {
  const windows = [account.quota?.window, account.quota?.weekly].filter(Boolean);
  if (!windows.length) return Number.POSITIVE_INFINITY;
  const used = Math.max(...windows.map(w => w.usedPercent));
  const reset = Math.min(...windows.map(w => w.resetsAt));
  if (mode === 'reset-first') return reset;
  if (mode === 'spend-first') return -used;
  return used;
}
export function recommend(state, { provider = state.policy.preferredProvider, accountId, allowUnknown = false, exclude = [], now = Date.now() } = {}) {
  const explicit = accountId || state.policy.selectedAccount;
  const candidates = state.accounts.filter(a => (!provider || a.provider === provider) && !exclude.includes(a.id) && (!explicit || a.id === explicit));
  const eligible = candidates.filter(a => {
    const status = accountStatus(a, state.runs, now);
    return a.authenticated === true && !claudeProfileIsolationUnverified(a) && !claudeSubscriptionAuthUnverified(a) && (status === 'ready' || (status === 'unknown' && allowUnknown && accountId === a.id));
  }).sort((a, b) => score(a, state.policy.mode) - score(b, state.policy.mode) || a.id.localeCompare(b.id));
  const account = eligible[0] || null;
  return { provider: provider || 'any', id: account?.id || null, reason: account ? `${state.policy.mode}; ${accountStatus(account, state.runs, now)} observation` : 'No eligible profile with fresh observed quota; unknown quota requires an explicit account and --allow-unknown' };
}
export function publicState(state) {
  return { accounts: state.accounts.map(({ id, provider, label, authenticated, quota, authKind, authError }) => ({ id, provider, label, authenticated, authKind, authError: authError || null,
    status: accountStatus(state.accounts.find(a => a.id === id), state.runs), quota: quota || { window: null, weekly: null, observedAt: null, expiresAt: null, source: null } })),
    policy: state.policy, hosts: state.hosts, services: state.services,
    runs: state.runs.slice(-30).reverse().map(({ id, accountId, provider, cwd, status, startedAt, endedAt, exitCode, model, checkpointId, error }) => ({ id, accountId, provider, cwd, status, startedAt, endedAt, exitCode, model, checkpointId, error })),
    recommendations: [null, 'codex', 'claude'].map(provider => recommend(state, { provider })), };
}
export function setPolicy(state, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['mode', 'preferredProvider'].includes(k)) || !MODES.includes(value.mode)) throw new Error('Invalid policy; use balanced, reset-first or spend-first');
  if (value.preferredProvider !== undefined && value.preferredProvider !== null && !['codex', 'claude'].includes(value.preferredProvider)) throw new Error('Invalid preferred provider');
  state.policy.mode = value.mode;
  if (value.preferredProvider !== undefined) state.policy.preferredProvider = value.preferredProvider;
}
export function selectAccount(state, value) {
  if (!value || Object.keys(value).some(k => k !== 'id') || (value.id !== null && (typeof value.id !== 'string' || !state.accounts.some(a => a.id === value.id)))) throw new Error('Unknown profile');
  state.policy.selectedAccount = value.id;
}
