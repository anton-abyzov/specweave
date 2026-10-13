'use strict';

const $ = (selector) => document.querySelector(selector);
const SLOTS = { codex: 4, claude: 3 };
const NAMES = { claude: 'Claude', codex: 'Codex', copilot: 'Copilot' };
const LOGOS = { claude: '✳', codex: '>_', copilot: 'GH' };
const MODE_HELP = {
  'balanced': 'Least-used ready account first.',
  'reset-first': 'The ready account whose limit resets soonest first.',
  'spend-first': 'Most-used ready account first, so it runs out before the next one starts.',
};
// Best first: a subscription seen on several Macs shows the most usable copy's status.
const STATUS_RANK = ['active', 'ready', 'stale', 'exhausted', 'unknown', 'auth-required'];
const CACHE_KEY = 'switch-fleet-v1';
let fleet = null;
let cached = false;
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
const number = (value, digits = 0) => Number(value).toLocaleString([], { maximumFractionDigits: digits });
function money(value, currency) {
  try { return Number(value).toLocaleString([], { style: 'currency', currency, maximumFractionDigits: 2 }); } catch { return `${number(value, 2)} ${currency}`; }
}
const capital = (text) => text ? text[0].toUpperCase() + text.slice(1) : text;
const tone = (left) => left <= 0 ? 'out' : left <= 20 ? 'low' : '';
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
  if (account.subscriptionType) return capital(account.subscriptionType);
  if (account.provider === 'codex' && account.authKind === 'chatgpt') return 'ChatGPT';
  return account.authKind ? 'Signed in' : 'Not signed in';
}

/** Every window worth a bar: the two that pick the account, then per-model limits. */
function windowsOf(quota) {
  const rows = [];
  if (quota?.window) rows.push({ label: '5-hour', ...quota.window });
  if (quota?.weekly) rows.push({ label: 'Weekly', ...quota.weekly });
  for (const w of (quota?.windows || []).filter((x) => !x.appliesToSelection && x.label)) rows.push({ ...w, label: w.label, title: `${w.label} weekly limit`, extra: true });
  return rows.filter((w) => typeof w.usedPercent === 'number' && Number.isFinite(w.usedPercent))
    .map((w) => ({ ...w, left: Math.max(0, Math.min(100, Math.round(100 - w.usedPercent))), reset: epoch(w.resetsAt) }));
}
/** What is usable now: the tightest window that picks the account. */
function headroom(quota) {
  const main = windowsOf(quota).filter((w) => !w.extra);
  return main.length ? Math.min(...main.map((w) => w.left)) : null;
}
/** The soonest future reset that hands something back. */
function nextReset(quota) {
  const now = Date.now();
  return windowsOf(quota).filter((w) => w.reset && w.reset > now && w.left < 100).sort((a, b) => a.reset - b.reset)[0] || null;
}

/** One entry per subscription: the same login on several Macs counts once. */
function subscriptions(hosts) {
  const groups = new Map();
  for (const host of hosts) {
    if (!host.ok) continue;
    const state = host.state;
    const preferred = state.policy?.preferredProvider || 'any';
    const nextId = state.recommendations?.find((r) => r.provider === preferred)?.id;
    for (const account of state.accounts || []) {
      if (!visible(account)) continue;
      const key = account.identity ? `${account.provider}:${account.identity}` : `${host.id}/${account.id}`;
      if (!groups.has(key)) groups.set(key, { key, provider: account.provider, account, copies: [] });
      const sub = groups.get(key);
      const pinned = state.policy?.selectedAccount === account.id;
      sub.copies.push({ host, account, pinned, next: !pinned && nextId === account.id });
      if ((epoch(account.quota?.observedAt) || 0) > (epoch(sub.account.quota?.observedAt) || 0)) sub.account = account;
    }
  }
  return [...groups.values()].map((sub) => {
    const best = sub.copies.map((c) => c.account).sort((a, b) => STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status))[0];
    return { ...sub, status: best, left: headroom(sub.account.quota), reset: nextReset(sub.account.quota) };
  }).sort((a, b) => {
    const usable = (s) => ['ready', 'active'].includes(s.status.status) ? 0 : 1;
    return a.provider.localeCompare(b.provider) || usable(a) - usable(b) || (a.reset?.reset ?? Infinity) - (b.reset?.reset ?? Infinity);
  });
}

function meters(windows) {
  const node = el('div', 'meters');
  if (!windows.length) { node.append(el('span', 'none', 'No limits reported yet')); return node; }
  for (const w of windows) {
    const label = el('span', 'label', w.label);
    if (w.title) label.title = w.title;
    const track = el('div', 'track');
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', `${w.title || w.label} left`);
    track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', String(w.left));
    const fill = el('div', `fill ${tone(w.left)}`);
    fill.style.width = `${w.left}%`;
    track.append(fill);
    const when = el('span', 'when', w.reset ? (w.reset > Date.now() ? `↻ ${span(w.reset - Date.now())}` : 'refresh') : '');
    if (w.reset) when.title = `Resets ${new Date(w.reset).toLocaleString()}`;
    node.append(label, track, el('span', 'pct', `${w.left}%`), when);
  }
  return node;
}

// Paid overflow that never picks the account but is worth seeing.
function extras(quota) {
  const list = [];
  const balance = Number(quota?.credits?.balance);
  if (quota?.credits?.unlimited) list.push(['Unlimited credits', '']);
  else if (Number.isFinite(balance) && (quota.credits.hasCredits || balance > 0)) list.push([`${number(balance)} credits`, 'Purchased flexible-usage balance, spent only after the limits are reached']);
  const resets = quota?.resetCredits?.availableCount;
  if (Number.isFinite(resets) && resets > 0) {
    const until = epoch(quota.resetCredits.nextExpiresAt);
    list.push([`${resets} reset${resets === 1 ? '' : 's'} banked${until ? ` · until ${clock(until)}` : ''}`, 'A banked reset clears a used-up limit once. Switch never spends it.']);
  }
  if (quota?.extraUsage) list.push([`${money(quota.extraUsage.used, quota.extraUsage.currency)} of ${money(quota.extraUsage.limit, quota.extraUsage.currency)} extra this month${quota.extraUsage.limitReached ? ' · limit reached' : ''}`, 'Claude extra usage at API rates, used after a window is full']);
  if (!list.length) return null;
  const node = el('div', 'extras');
  for (const [text, title] of list) { const item = el('span', '', text); if (title) item.title = title; node.append(item); }
  return node;
}

/** When an empty account comes back: the latest reset among its empty windows. */
function backAt(quota) {
  const now = Date.now(), empty = windowsOf(quota).filter((w) => !w.extra && w.left <= 0);
  if (!empty.length || empty.some((w) => !w.reset || w.reset <= now)) return null;
  return Math.max(...empty.map((w) => w.reset));
}
function bigLeft(left, caption = 'left') {
  const node = el('div', `left ${left === null ? '' : left <= 0 ? 'bad' : left <= 20 ? 'warn' : ''}`);
  node.append(el('b', '', left === null ? '–' : `${left}%`), el('span', '', caption));
  return node;
}

function macChip(copy) {
  const chip = el('span', 'mac');
  chip.append(el('span', '', copy.host.label));
  if (copy.pinned) chip.append(el('span', 'tag', 'Pinned'));
  if (copy.next) { const tag = el('span', 'tag next', 'Next'); tag.title = 'The account the policy picks for the next run on this Mac'; chip.append(tag); }
  if (copy.pinned || copy.account.status === 'ready') {
    const pin = el('button', 'pin', copy.pinned ? 'Unpin' : 'Pin');
    pin.type = 'button';
    pin.disabled = busy || cached;
    pin.dataset.account = `${copy.host.id}/${copy.account.id}`;
    pin.title = copy.pinned ? `Go back to the policy on ${copy.host.label}` : `Always use this account for new runs on ${copy.host.label}`;
    pin.addEventListener('click', () => act('/api/fleet/select', { host: copy.host.id, id: copy.pinned ? null : copy.account.id }, copy.pinned ? 'Back to automatic choice.' : `Pinned on ${copy.host.label}.`));
    chip.append(pin);
  } else chip.classList.add('plain');
  return chip;
}

function card(sub) {
  const { account } = sub;
  const node = el('article', 'card');
  node.dataset.sub = sub.key;
  const [label, pillTone] = statusOf(sub.status);
  if (!['ready', 'active'].includes(sub.status.status)) node.classList.add('dim');
  const head = el('div', 'card-head');
  const title = el('div', 'title');
  const slot = account.id.endsWith('-1') ? '' : ` ${account.id.split('-')[1]}`;
  const planName = account.authKind && plan(account) !== 'Signed in' ? ` ${plan(account)}` : '';
  title.append(el('b', '', `${NAMES[account.provider]}${slot}${planName}`));
  const status = el('span', 'status-line');
  status.append(el('span', `pill ${pillTone}`, label));
  title.append(status);
  const back = sub.left === 0 ? backAt(account.quota) : null;
  const big = bigLeft(sub.left, back ? `back in ${span(back - Date.now())}` : 'left');
  if (back) big.title = `Usable again ${new Date(back).toLocaleString()}`;
  head.append(el('span', `logo ${account.provider}`, LOGOS[account.provider]), title, big);
  node.append(head, meters(windowsOf(account.quota)));
  const more = extras(account.quota);
  if (more) node.append(more);
  const where = el('div', 'where');
  where.append(el('span', 'where-label', sub.copies.length > 1 ? 'Signed in on' : 'On'));
  for (const copy of sub.copies) where.append(macChip(copy));
  node.append(where);
  return node;
}

function copilotCard(item) {
  const node = el('article', 'card');
  node.dataset.sub = item.id;
  const head = el('div', 'card-head');
  const title = el('div', 'title');
  title.append(el('b', '', `Copilot ${item.plan ? capital(item.plan) : ''}`.trim()));
  title.append(el('span', '', [item.login, item.org].filter(Boolean).join(' · ')));
  let left = null, windows = [];
  if (item.meter) {
    const remaining = Math.max(0, item.meter.entitlement - item.meter.used);
    left = Math.round((remaining / item.meter.entitlement) * 100);
    windows = [{ label: item.meter.name === 'AI credits' ? 'Credits' : 'Chat', title: item.meter.name, left, reset: epoch(item.resetsAt) }];
  }
  head.append(el('span', 'logo copilot', LOGOS.copilot), title, bigLeft(left));
  node.append(head, meters(windows));
  if (item.meter) {
    const remaining = Math.max(0, item.meter.entitlement - item.meter.used);
    const line = el('div', 'extras');
    const amount = el('span', '', `${number(remaining, 1)} of ${number(item.meter.entitlement)} ${item.meter.name === 'AI credits' ? 'AI credits' : 'chats'} left`);
    if (item.meter.name === 'AI credits') amount.title = `1 credit = $0.01, ${money(remaining / 100, 'USD')} left${item.meter.overagePermitted ? '. Usage beyond this is billed to the organization.' : ''}`;
    line.append(amount);
    if (item.cliActive) { const cli = el('span', '', 'Copilot CLI uses this'); cli.title = 'Copilot CLI is signed in as this account, so its turns spend this allowance'; line.append(cli); }
    node.append(line);
  }
  const where = el('div', 'where');
  const seen = epoch(item.observedAt), live = item.source === 'live';
  const chip = el('span', 'mac plain', item.host);
  where.append(el('span', 'where-label', 'Read on'), chip);
  const pill = el('span', `pill ${live ? 'ok' : 'idle'}`, live ? 'Live' : `As of ${ago(seen)}`);
  pill.title = `${live ? 'Read from GitHub' : 'From Copilot CLI\'s cache'}${seen ? `, ${new Date(seen).toLocaleString()}` : ''}`;
  where.append(pill);
  node.append(where);
  return node;
}

function tile(provider, subs) {
  const node = el('div', 'tile');
  node.dataset.provider = provider;
  const head = el('div', 'tile-head');
  head.append(el('span', `logo sm ${provider}`, LOGOS[provider]), el('span', '', NAMES[provider]));
  node.append(head);
  if (provider === 'copilot') {
    const metered = subs.filter((s) => s.meter);
    const credits = metered.filter((s) => s.meter.name === 'AI credits').reduce((sum, s) => sum + Math.max(0, s.meter.entitlement - s.meter.used), 0);
    const big = el('div', 'tile-big', number(credits));
    big.append(' ', el('small', '', 'AI credits left'));
    const reset = Math.min(...subs.map((s) => epoch(s.resetsAt) || Infinity));
    const sub = el('p');
    sub.append(`${subs.length} account${subs.length === 1 ? '' : 's'}`);
    if (Number.isFinite(reset)) sub.append(` · resets ${clock(reset)}`);
    node.classList.add(credits > 0 ? 'ok' : 'warn');
    node.append(big, sub);
    return node;
  }
  const ready = subs.filter((s) => ['ready', 'active'].includes(s.status.status));
  const big = el('div', 'tile-big', `${ready.length} of ${subs.length}`);
  big.append(' ', el('small', '', 'ready'));
  node.classList.add(ready.length ? 'ok' : 'bad');
  const bestReady = ready.filter((s) => s.left !== null).sort((a, b) => b.left - a.left)[0];
  const best = el('p');
  if (bestReady) { best.append('Most left: '); best.append(el('b', '', `${bestReady.left}%`)); best.append(` on ${bestReady.copies.map((c) => c.host.label).join(', ')}`); }
  else best.append('Nothing usable right now');
  const soon = subs.filter((s) => s.reset).sort((a, b) => a.reset.reset - b.reset.reset)[0];
  const next = el('p');
  if (soon) {
    next.append('Next reset ');
    next.append(el('b', '', `in ${span(soon.reset.reset - Date.now())}`));
    next.append(` · ${clock(soon.reset.reset)} · ${soon.copies[0].host.label} ${soon.reset.label.toLowerCase()}`);
    next.title = new Date(soon.reset.reset).toLocaleString();
  } else next.append('No reset pending');
  node.append(big, best, next);
  return node;
}

function machine(host) {
  const node = el('div', 'machine');
  node.dataset.host = host.id;
  if (!host.ok) {
    node.append(el('span', 'dot bad'), el('strong', '', host.label), el('span', '', host.error || 'Unreachable'));
    node.title = 'Its own page still works on that Mac at 127.0.0.1:8318.';
    return node;
  }
  const seen = newest(host.state);
  const stale = !host.refreshing && (!seen || Date.now() - seen > 30 * 60000);
  node.append(el('span', `dot ${stale ? 'warn' : 'ok'}`), el('strong', '', host.label));
  if (host.local) node.append(el('span', '', 'this Mac'));
  const age = el('span', stale ? 'stale-age' : '', host.refreshing ? 'refreshing…' : `checked ${ago(seen)}`);
  if (seen) age.title = new Date(seen).toLocaleString();
  node.append(age);
  const signedIn = (host.state.accounts || []).filter(visible);
  const free = Object.entries(SLOTS).map(([p, total]) => [p, total - signedIn.filter((a) => a.provider === p).length]).filter(([, n]) => n > 0);
  const proxy = (host.state.services || []).find((s) => s.id === 'cli-proxy');
  const notes = [];
  if (free.length) notes.push(`Free slots: ${free.map(([p, n]) => `${n} ${NAMES[p]}`).join(', ')}`);
  if (proxy) notes.push(`CLIProxyAPI on port ${proxy.port}: ${proxy.status}${Number.isInteger(proxy.accounts) ? `, ${proxy.accounts} account${proxy.accounts === 1 ? '' : 's'}` : ''}`);
  node.title = notes.join('\n');
  return node;
}

function render() {
  const hosts = fleet?.hosts || [];
  const subs = subscriptions(hosts);
  const copilot = fleet?.providers || [];
  if (fleet) {
    const tiles = ['claude', 'codex'].map((p) => [p, subs.filter((s) => s.provider === p)]).filter(([, list]) => list.length).map(([p, list]) => tile(p, list));
    if (copilot.length) tiles.push(tile('copilot', copilot));
    $('#summary').replaceChildren(...tiles);
  }
  const groups = [];
  for (const provider of ['claude', 'codex']) {
    const list = subs.filter((s) => s.provider === provider);
    if (!list.length) continue;
    groups.push(group(provider, list.length, list.map(card)));
  }
  if (copilot.length) groups.push(group('copilot', copilot.length, copilot.map(copilotCard)));
  if (fleet && !groups.length) groups.push(el('p', 'muted', 'No signed-in subscriptions on any Mac yet.'));
  $('#groups').replaceChildren(...groups);
  $('#macs').replaceChildren(...hosts.map(machine));

  const local = hosts.find((h) => h.local && h.ok);
  const modes = new Set(hosts.filter((h) => h.ok).map((h) => h.state.policy?.mode));
  const mode = local?.state.policy?.mode;
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    button.disabled = busy || cached;
  }
  $('#policy-help').textContent = `${MODE_HELP[mode] || ''} ${modes.size > 1 ? 'Macs currently differ; pick one to align them.' : 'Same on every Mac. Used for specweave-switch runs and Studio\'s capacity-policy drafts; running chats keep their account.'}`;
  const seen = local ? newest(local.state) : null;
  const every = fleet?.autoRefreshMinutes;
  $('#updated').textContent = refreshing ? 'Refreshing every Mac…' : cached ? 'Showing the last reading…' : local?.refreshing ? 'Refreshing…' : `Checked ${ago(seen)}${every ? ` · auto every ${every} min` : ''}`;
  $('#refresh').disabled = busy;
}
function group(provider, count, cards) {
  const node = el('section', 'group');
  node.dataset.provider = provider;
  const head = el('h3', 'group-head', NAMES[provider]);
  head.append(el('span', '', `${count} subscription${count === 1 ? '' : 's'}`));
  const grid = el('div', 'cards');
  grid.append(...cards);
  node.append(head, grid);
  return node;
}

function remember(value) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
async function load() {
  try {
    const response = await fetch('/api/fleet', { cache: 'no-store' });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    fleet = value; cached = false;
    remember(value);
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
    fleet = value; cached = false;
    remember(value);
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
  // Paint the last reading at once; the live one replaces it a moment later.
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (saved && Array.isArray(saved.hosts)) { fleet = saved; cached = true; render(); }
  } catch { /* storage unavailable or corrupt */ }
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
