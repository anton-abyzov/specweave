'use strict';

const $ = (selector) => document.querySelector(selector);
const profileSlots = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: `codex-${i + 1}`, provider: 'codex', label: `Codex ${i + 1}` })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `claude-${i + 1}`, provider: 'claude', label: `Claude ${i + 1}` })),
];
const hostSlots = [
  { id: 'm4', label: 'M4 Max', role: 'main' },
  { id: 'm1', label: 'M1 Max', role: 'worker' },
  { id: 'm3', label: 'M3 / Olympus', role: 'worker' },
];
let state = {};
let pending = false;
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

function text(value, fallback = 'Unknown') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}
function resetDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'number' ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() > 0 ? dateFormatter.format(date) : null;
}
function notice(message, kind = 'info') {
  const node = $('#notice');
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = !message;
}
function asArray(value) { return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : []; }
function statusLabel(account) {
  const labels = {
    exhausted: ['Quota exhausted', 'danger'], stale: ['Observation stale', 'warning'],
    active: ['Working', 'success'], error: ['Needs attention', 'danger'],
    'auth-required': ['Sign-in required', 'warning'],
  };
  if (labels[account.status]) return labels[account.status];
  if (account.authenticated === true) return ['Signed in', 'success'];
  if (account.authenticated === false) return ['Sign-in required', 'warning'];
  return ['Authentication unknown', 'neutral'];
}
function quotaBlock(title, window) {
  const block = element('div', 'quota-block');
  block.append(element('p', 'quota-heading', title));
  const used = typeof window?.usedPercent === 'number' && Number.isFinite(window.usedPercent)
    ? Math.min(100, Math.max(0, window.usedPercent)) : null;
  if (used === null) {
    block.append(element('p', 'quota-amount unknown', 'Unknown'));
    const meter = element('div', 'meter'); meter.setAttribute('aria-hidden', 'true'); block.append(meter);
  } else {
    const remaining = 100 - used;
    const amount = element('p', 'quota-amount');
    amount.append(element('span', '', `${Number(remaining.toFixed(1))}%`), element('small', '', 'remaining'));
    const meter = element('div', 'meter');
    meter.setAttribute('role', 'meter'); meter.setAttribute('aria-label', `${title} remaining`);
    meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', '100'); meter.setAttribute('aria-valuenow', String(remaining));
    meter.dataset.low = String(remaining <= 20); meter.dataset.exhausted = String(remaining === 0);
    const fill = element('div', 'meter-fill'); fill.style.width = `${remaining}%`; meter.append(fill);
    block.append(amount, meter);
  }
  const reset = resetDate(window?.resetsAt);
  block.append(element('p', 'quota-reset', reset ? `Resets ${reset}` : 'Reset time unknown'));
  return block;
}
function nativeLoginHint(account) {
  const details = element('details', 'login-details');
  details.append(element('summary', '', 'Native sign-in'));
  // Known profile IDs only: no state-supplied commands or credentials are rendered.
  const slot = profileSlots.find((entry) => entry.id === account.id);
  let command = 'Use the native provider sign-in for this profile.';
  if (slot?.provider === 'claude') command = `specweave-switch account login ${slot.id}`;
  if (slot?.provider === 'codex') command = `specweave-switch account login ${slot.id}`;
  details.append(element('code', '', command));
  return details;
}
function renderAccounts() {
  const supplied = asArray(state.accounts);
  const accounts = profileSlots.map((slot) => ({ ...slot, ...supplied.find((account) => account.id === slot.id) }));
  const selected = state.policy?.selectedAccount;
  const list = $('#account-list'); list.replaceChildren();
  for (const account of accounts) {
    const card = element('article', 'account-card');
    card.dataset.accountId = account.id; card.dataset.selected = String(selected === account.id);
    const info = element('div', 'account-info');
    const top = element('div', 'profile-topline');
    top.append(element('span', 'provider-symbol', account.provider === 'claude' ? '✳' : '›_'), element('span', 'provider-label', text(account.provider)));
    if (selected === account.id) top.append(element('span', 'selected-label', 'Selected'));
    const [label, tone] = statusLabel(account);
    const status = element('p', 'account-status'); status.dataset.tone = tone;
    const dot = element('span', 'status-dot'); dot.setAttribute('aria-hidden', 'true');
    status.append(dot, element('span', '', label));
    info.append(top, element('h3', 'account-title', text(account.label, account.id)), status);
    const actions = element('div', 'account-actions');
    const button = element('button', 'select-button', selected === account.id ? 'Selected profile' : 'Select profile');
    button.type = 'button'; button.dataset.select = account.id;
    button.setAttribute('aria-label', `Select ${text(account.label, account.id)}`);
    button.setAttribute('aria-pressed', String(selected === account.id));
    button.disabled = pending || account.authenticated !== true || ['exhausted', 'active', 'error'].includes(account.status);
    button.addEventListener('click', () => mutate('/api/select', { id: account.id }, `${text(account.label, account.id)} selected for new managed runs.`));
    actions.append(button);
    if (account.authenticated === false) info.append(nativeLoginHint(account));
    card.append(info, quotaBlock('Current window', account.quota?.window), quotaBlock('Weekly window', account.quota?.weekly), actions);
    const observation = element('div', 'quota-observation');
    const observed = resetDate(account.quota?.observedAt);
    const source = text(account.quota?.source, 'No quota source');
    observation.append(element('span', '', observed ? `Observed ${observed} · ${source}` : 'Usage has not been observed'), element('span', '', `Profile ${account.id}`));
    card.append(observation); list.append(card);
  }
  $('#account-count').textContent = Array.isArray(state.accounts)
    ? `${accounts.filter((account) => account.authenticated === true).length} signed in / 7 slots` : '7 profile slots';
  list.setAttribute('aria-busy', String(pending));
}
function renderPolicy() {
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(state.policy?.mode === button.dataset.mode)); button.disabled = pending;
  }
  const list = $('#recommendations'); list.replaceChildren();
  const recommendations = asArray(state.recommendations);
  if (!recommendations.length) list.append(element('p', 'muted', 'Recommendations are unknown.'));
  for (const recommendation of recommendations) {
    const account = asArray(state.accounts).find((entry) => entry.id === recommendation.id);
    const block = element('div', 'recommendation');
    const name = recommendation.id ? text(account?.label, recommendation.id) : `${text(recommendation.provider, 'Account')} · No eligible profile`;
    block.append(element('strong', '', name), element('p', '', text(recommendation.reason, 'Eligibility has not been observed.')));
    list.append(block);
  }
}
function renderHosts() {
  const supplied = asArray(state.hosts);
  const hosts = hostSlots.map((slot) => ({ ...slot, ...(supplied.find((host) => host.id === slot.id)
    || (slot.role === 'main' ? supplied.find((host) => host.role === 'main') : null)) }));
  const list = $('#host-list'); list.replaceChildren();
  for (const host of hosts) {
    const card = element('article', 'host-card');
    const status = host.status === 'local' ? 'Local host' : host.status === 'auth-required' ? 'SSH sign-in required' : host.status === 'offline' ? 'Offline' : 'Access unknown';
    card.append(element('p', 'host-role', host.role === 'main' ? 'Main host' : 'Worker'), element('h3', '', text(host.label, host.id)), element('p', 'host-name', text(host.hostname, 'Hostname unknown')), element('p', 'host-status', status));
    card.append(element('p', 'host-fact', host.sshReachable === true ? 'SSH reachable' : host.sshReachable === false ? 'SSH unreachable' : 'SSH not verified'));
    card.append(element('p', 'host-fact', host.installed === true ? 'Companion installed' : host.installed === false ? 'Installation pending' : 'Installation unknown'));
    list.append(card);
  }
}
function renderServices() {
  const list = $('#service-list'); list.replaceChildren();
  const services = asArray(state.services);
  if (!services.length) list.append(element('p', 'empty-state', 'Service state has not been observed.'));
  for (const service of services) {
    const row = element('div', 'service-row'); const info = element('div');
    info.append(element('strong', '', text(service.label, service.id)), element('p', '', Number.isInteger(service.port) ? `Loopback :${service.port}` : 'Port unknown'));
    const status = element('span', 'service-state', service.status === 'running' ? 'Running' : service.status === 'unavailable' ? 'Unavailable' : 'Unknown');
    status.dataset.tone = service.status === 'running' ? 'success' : 'neutral'; row.append(info, status); list.append(row);
  }
}
function renderRuns() {
  const runs = asArray(state.runs); const list = $('#run-list'); list.replaceChildren();
  $('#run-count').textContent = Array.isArray(state.runs) ? `${runs.length} recorded` : 'Awaiting state';
  if (!runs.length) {
    const empty = element('div', 'empty-state');
    empty.append(element('strong', '', Array.isArray(state.runs) ? 'No managed runs recorded' : 'Managed runs have not been observed'), element('p', '', 'Completed work appears here with its actual outcome. Selecting a profile does not start a run.'));
    list.append(empty); return;
  }
  const labels = { running: 'Running', success: 'Succeeded', failed: 'Failed', 'quota-exhausted': 'Quota exhausted', 'timed-out': 'Timed out' };
  // The backend returns its newest 30 receipts first.
  for (const run of runs.slice(0, 20)) {
    const row = element('article', 'run-row');
    const info = element('div'); info.append(element('h3', '', text(run.accountId, 'Account unknown')), element('p', 'run-summary', `${text(run.provider, 'Provider unknown')} · ${text(run.model, 'Model not recorded')}`));
    const status = element('p', 'run-status', labels[run.status] || 'Outcome unknown');
    status.dataset.tone = run.status === 'success' ? 'success' : ['failed', 'quota-exhausted', 'timed-out'].includes(run.status) ? 'danger' : 'neutral';
    row.append(info, status);
    const details = element('p', 'run-details');
    const end = resetDate(run.endedAt), start = resetDate(run.startedAt);
    details.textContent = `${text(run.id, 'Run ID unknown')} · ${end ? `Ended ${end}` : start ? `Started ${start}` : 'Time unknown'}${Number.isInteger(run.exitCode) ? ` · Exit ${run.exitCode}` : ''}\n${text(run.cwd, 'Workspace unknown')}`;
    row.append(details); list.append(row);
  }
}
function render() { renderAccounts(); renderPolicy(); renderHosts(); renderServices(); renderRuns(); $('#refresh').disabled = pending; }
async function request(path, body) {
  const options = body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetch(path, options);
  let result;
  try { result = await response.json(); } catch { throw new Error('The local service returned an unreadable response.'); }
  if (!response.ok) throw new Error(text(result?.error, `Local request failed (${response.status}).`));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The local service returned an invalid state.');
  return result;
}
async function mutate(path, body, message) {
  if (pending) return;
  pending = true; render(); notice('Updating local state…');
  try { state = await request(path, body); $('#state-time').textContent = `State loaded ${dateFormatter.format(new Date())}`; notice(message); }
  catch (error) { notice(error.message, 'error'); }
  finally { pending = false; render(); }
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').setAttribute('aria-label', `Use ${theme === 'dark' ? 'light' : 'dark'} theme`);
  try { localStorage.setItem('specweave-switch-theme', theme); } catch { /* Theme works without storage. */ }
}
let storedTheme;
try { storedTheme = localStorage.getItem('specweave-switch-theme'); } catch { /* Storage may be disabled. */ }
setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#refresh').addEventListener('click', () => mutate('/api/refresh', {}, 'Native account observations refreshed. Unavailable usage remains unknown.'));
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => mutate('/api/policy', { mode: button.dataset.mode }, `${button.querySelector('.policy-name').firstChild.textContent.trim()} policy saved.`));
render();
request('/api/state').then((result) => { state = result; $('#state-time').textContent = `State loaded ${dateFormatter.format(new Date())}`; render(); }).catch((error) => { notice(error.message, 'error'); $('#account-list').setAttribute('aria-busy', 'false'); });
