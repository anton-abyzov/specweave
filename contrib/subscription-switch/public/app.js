'use strict';

const $ = (selector) => document.querySelector(selector);
const SLOTS = { codex: 4, claude: 3 };
const MODE_HELP = {
  'balanced': 'Least-used account first.',
  'reset-first': 'The account whose limit resets soonest first.',
  'spend-first': 'Most-used account first, so it runs out before the next one starts.',
};
let fleet = null;
let busy = false;
let refreshing = false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function epoch(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function clock(ms) {
  const date = new Date(ms), now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  if (ms - now.getTime() < 6 * 864e5 && ms > now.getTime()) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function span(ms) {
  const minutes = Math.max(0, Math.round(Math.abs(ms) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
function ago(ms) {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  return diff < 60000 ? 'just now' : `${span(diff)} ago`;
}
function notice(message, kind = 'warn') {
  const node = $('#notice');
  node.textContent = message || '';
  node.dataset.kind = kind;
  node.hidden = !message;
}
function newest(state) {
  const times = (state?.accounts || []).map((a) => epoch(a.quota?.observedAt)).filter(Boolean);
  return times.length ? Math.max(...times) : null;
}

function visible(account) {
  return account.authenticated === true || Boolean(account.quota?.observedAt) || Boolean(account.subscriptionType)
    || (account.id.endsWith('-1') && Boolean(account.authKind));
}
function statusOf(account) {
  if (account.authError === 'subscription-auth-unverified') return ['Plan not verified', 'warn'];
  if (account.authError === 'profile-isolation-unverified') return ['Slot locked', 'idle'];
  const map = {
    ready: ['Ready', 'ok'], active: ['Running', 'ok'], exhausted: ['Limit reached', 'bad'],
    stale: ['Needs refresh', 'warn'], 'auth-required': ['Sign in', 'warn'], unknown: ['Not verified', 'idle'],
  };
  return map[account.status] || ['Unknown', 'idle'];
}
function plan(account) {
  if (account.subscriptionType) return account.subscriptionType[0].toUpperCase() + account.subscriptionType.slice(1);
  if (account.provider === 'codex' && account.authKind === 'chatgpt') return 'ChatGPT';
  return account.authKind ? 'Signed in' : 'Not signed in';
}

function meter(label, cls, window) {
  const used = window?.usedPercent;
  if (typeof used !== 'number' || !Number.isFinite(used)) {
    const none = el('div', `meter none ${cls}`, 'Not reported');
    none.dataset.label = label;
    return none;
  }
  const left = Math.max(0, Math.min(100, 100 - used));
  const node = el('div', `meter ${cls}`);
  node.dataset.label = label;
  const top = el('div', 'meter-top');
  top.append(el('b', '', `${Math.round(left)}% left`));
  const reset = epoch(window.resetsAt);
  if (reset) {
    const when = el('span', '', reset > Date.now() ? `${clock(reset)} · in ${span(reset - Date.now())}` : 'reset passed, refresh');
    when.title = `Resets ${new Date(reset).toLocaleString()}`;
    top.append(when);
  }
  const track = el('div', 'track');
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-label', `${label} left`);
  track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', String(Math.round(left)));
  const fill = el('div', `fill${left <= 0 ? ' out' : left <= 20 ? ' low' : ''}`);
  fill.style.width = `${left}%`;
  track.append(fill);
  node.append(top, track);
  return node;
}

function row(host, account, state) {
  const node = el('div', 'row');
  node.dataset.account = `${host.id}/${account.id}`;
  const who = el('div', 'who');
  who.append(el('span', `logo ${account.provider}`, account.provider === 'claude' ? '✳' : '>_'));
  const text = el('div', 'who-text');
  const name = el('b', '', account.provider === 'claude' ? 'Claude' : 'Codex');
  if (!account.id.endsWith('-1')) name.append(` ${account.id.split('-')[1]}`);
  const pinned = state.policy?.selectedAccount === account.id;
  const preferred = state.policy?.preferredProvider || 'any';
  const next = !pinned && state.recommendations?.find((r) => r.provider === preferred)?.id === account.id;
  if (pinned) name.append(el('span', 'tag', 'Pinned'));
  if (next) { const tag = el('span', 'tag next', 'Next'); tag.title = 'The account the current policy picks for the next run on this Mac'; name.append(tag); }
  const shared = Array.isArray(account.sharedWith) && account.sharedWith.length ? ` · same account as ${account.sharedWith.join(', ')}` : '';
  const sub = el('span', '', plan(account) + shared);
  if (shared) sub.title = 'Signed in to the same subscription on these Macs; every copy shows the newest reading.';
  text.append(name, sub);
  who.append(text);

  const status = el('div', 'status');
  const [label, tone] = statusOf(account);
  status.append(el('span', `pill ${tone}`, label));
  if (pinned || account.status === 'ready') {
    const pin = el('button', 'button small', pinned ? 'Unpin' : 'Pin');
    pin.type = 'button';
    pin.disabled = busy;
    pin.title = pinned ? 'Go back to the policy' : 'Always use this account for new runs on this Mac';
    pin.addEventListener('click', () => act('/api/fleet/select', { host: host.id, id: pinned ? null : account.id }, pinned ? 'Back to automatic choice.' : 'Pinned.'));
    status.append(pin);
  }
  node.append(who, meter('5-hour window', 'five', account.quota?.window), meter('Weekly', 'week', account.quota?.weekly), status);
  return node;
}

function hostBlock(host) {
  const block = el('section', 'host');
  block.setAttribute('aria-label', host.label);
  const head = el('div', 'host-head');
  head.append(el('strong', '', host.label));
  if (host.local) head.append(el('span', '', 'this Mac'));
  if (!host.ok) {
    const dot = el('span', 'svc'); dot.append(el('span', 'dot bad'), el('span', '', 'Offline'));
    head.append(dot);
    block.append(head, el('p', 'offline', `${host.error || 'Unreachable'}. Its own page still works on that Mac at 127.0.0.1:8318.`));
    return block;
  }
  const state = host.state;
  const seen = newest(state);
  const age = el('span', '', host.refreshing ? 'refreshing…' : `checked ${ago(seen)}`);
  if (seen) age.title = new Date(seen).toLocaleString();
  if (!host.refreshing && (!seen || Date.now() - seen > 30 * 60000)) age.className = 'stale-age';
  head.append(age, el('span', 'spacer'));
  for (const service of state.services || []) {
    if (service.id !== 'cli-proxy') continue;
    const item = el('span', 'svc');
    item.title = `${service.label} on port ${service.port}: ${service.status}`;
    item.append(el('span', `dot ${service.status === 'running' ? 'ok' : service.status === 'unavailable' ? 'bad' : ''}`), el('span', '', 'Proxy'));
    head.append(item);
  }
  block.append(head);
  const accounts = state.accounts || [];
  const shown = accounts.filter(visible).sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
  for (const account of shown) block.append(row(host, account, state));
  const free = Object.entries(SLOTS).map(([provider, total]) => [provider, total - shown.filter((a) => a.provider === provider).length]).filter(([, n]) => n > 0);
  if (!shown.length) block.append(el('p', 'offline', 'No signed-in accounts on this Mac yet.'));
  if (free.length) block.append(el('p', 'free', `Free slots: ${free.map(([p, n]) => `${n} ${p === 'codex' ? 'Codex' : 'Claude'}`).join(', ')}`));
  return block;
}

function render() {
  const hosts = fleet?.hosts || [];
  $('#hosts').replaceChildren(...hosts.map(hostBlock));
  const local = hosts.find((h) => h.local && h.ok);
  const modes = new Set(hosts.filter((h) => h.ok).map((h) => h.state.policy?.mode));
  const mode = local?.state.policy?.mode;
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    button.disabled = busy;
  }
  const help = $('#policy-help');
  help.textContent = `${MODE_HELP[mode] || ''} ${modes.size > 1 ? 'Macs currently differ; pick one to align them.' : 'Applies on every Mac to new runs only.'}`;
  const seen = local ? newest(local.state) : null;
  const every = fleet?.autoRefreshMinutes;
  $('#updated').textContent = refreshing ? 'Refreshing every Mac…' : local?.refreshing ? 'Refreshing…' : `Checked ${ago(seen)}${every ? ` · auto every ${every} min` : ''}`;
  $('#refresh').disabled = busy;
}

async function load() {
  try {
    const response = await fetch('/api/fleet', { cache: 'no-store' });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    fleet = value;
    if ($('#notice').dataset.kind === 'load') notice('');
    render();
  } catch (error) {
    notice(`Could not read Switch: ${error.message}`, 'load');
  }
}
async function act(path, payload, done) {
  if (busy) return;
  busy = true; render();
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    fleet = value;
    const failed = (value.failures || []).map((f) => `${f.id}: ${f.error}`);
    notice(failed.length ? `${done} Not applied on ${failed.join('; ')}` : done, failed.length ? 'warn' : 'ok');
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false; render();
  }
}

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
try { applyTheme(localStorage.getItem('switch-theme')); } catch { /* storage unavailable */ }

document.addEventListener('DOMContentLoaded', () => {
  $('#refresh').addEventListener('click', () => {
    refreshing = true;
    act('/api/fleet/refresh', {}, 'Refreshed.').finally(() => { refreshing = false; render(); });
  });
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => act('/api/fleet/policy', { mode: button.dataset.mode }, `${button.textContent} is now the policy on every Mac.`));
  }
  $('#theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('switch-theme', next); } catch { /* storage unavailable */ }
  });
  load();
  setInterval(() => { if (!busy && document.visibilityState === 'visible') load(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !busy) load(); });
});
