/**
 * Jev headless browser delegation.
 *
 * A mechanical navigation loop where Jev picks the next action from an enumerated set
 * of things visible on the page. The loop is always HEADLESS: it never launches a
 * visible window, never types text the model chose (values come from `inputs` only),
 * blocks main-frame document navigation outside `allowDomains`, and hands control back when the page
 * needs judgement (login, captcha, payment, free text).
 *
 * Subresources are not confined by this navigation policy. Playwright is loaded lazily.
 *
 * @module core/jev/browse
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';

import { createJevClient, type JevClient, type Json, type Question } from './client.js';
import { JEV_DEFAULTS, loadJevConfig, type JevConfig } from './config.js';

export interface BrowseOptions {
  goal: string;
  url?: string;
  allowDomains?: string[];
  maxSteps?: number;
  maxMs?: number;
  minConfidence?: number;
  inputs?: Record<string, string>;
  screenshotDir?: string;
  allowSensitive?: boolean;
  projectRoot?: string;
  client?: JevClient;
  playwright?: unknown;
}

export interface BrowseStep {
  n: number;
  url: string;
  action: string;
  choice: string;
  confidence: number;
  apiMs: number;
  executed: boolean;
  reason?: string;
}

export interface BrowseResult {
  status: 'done' | 'blocked' | 'needs_agent' | 'low_confidence' | 'step_limit' | 'budget' | 'error';
  handoff?: string;
  url: string;
  title: string;
  steps: BrowseStep[];
  pageText: string;
  screenshots: string[];
  elapsedMs: number;
  cost: number;
  error?: string;
}

/* ------------------------------------------------------------------ constants */

/** Interactive things worth enumerating. Everything else is page furniture. */
const INTERACTIVE_SELECTOR =
  'a[href], button, [role=button], [role=link], [role=tab], [role=menuitem], input, select, textarea, summary, [onclick]';

/** Controls we never click on the agent's behalf unless `allowSensitive` is set. */
const SENSITIVE =
  /delete|remove|pay|purchase|buy|checkout|confirm order|send|submit|sign in|log in|password|unsubscribe|transfer/i;

/**
 * The same judgement for a link's destination: a harmless label ("Manage", "Preferences")
 * can hide `/account/subscription/cancel?confirm=1`, and a GET performs it.
 */
const SENSITIVE_URL =
  /(^|[/_.-])(delete|destroy|remove|cancel|unsubscribe|opt-out|logout|signout|checkout|purchase|payments?|transfers?|refunds?)([/_.?&=-]|$)|[?&](confirm|delete|cancel|unsubscribe)=/i;

/** Stamped on every described element so an action binds to it, not to its ordinal. */
const REF_ATTR = 'data-jev-ref';

const MAX_ELEMENTS = 120;
const MAX_NAME_CHARS = 80;
const MAX_EXCERPT_CHARS = 1500;
const MAX_PAGE_TEXT_CHARS = 4000;
const HARD_MAX_STEPS = 40;
const DEFAULT_MAX_MS = 60_000;
const DEFAULT_MIN_CONFIDENCE = 0.55;
const HISTORY_STEPS = 8;
const ACTION_TIMEOUT_MS = 10_000;
/** Grace for a click that kicks off its navigation from JS (SPA routing, deferred assign). */
const SETTLE_MS = 150;

const PLAYWRIGHT_HINT = 'npm i -g playwright && npx playwright install chromium';

const FIXED_ACTIONS: Record<string, string> = {
  SCROLL_DOWN: 'Scroll further down this page to reveal content that is not visible yet.',
  SCROLL_UP: 'Scroll back up this page to content that has scrolled out of view.',
  BACK: 'Go back to the previous page; this page is a dead end or the wrong turn.',
  WAIT: 'The page is still loading or updating; wait briefly and look again.',
  DONE: 'The goal is fully achieved and visible on this page; nothing further is needed.',
  BLOCKED:
    'The goal cannot be reached from here: the path does not exist, the page is an error, or the site refuses.',
  NEEDS_AGENT:
    'This step needs login, a captcha, a payment, a file upload, free text, or a judgement only the agent can make.',
};

const NEXT_INSTRUCTIONS =
  'Given the goal and the page described in the state, which single action moves closest to achieving the goal? Pick exactly one.';

const GOAL_REACHED: Question = {
  type: 'noul',
  instructions: 'Given the goal and the current page, is the requested end state already visible?',
  criteria: {
    true: 'the page currently shows the end state the goal describes',
    false: 'the end state is not visible yet, or only a link towards it is visible',
  },
};

/* ------------------------------------------------- minimal structural Playwright */

interface PwElement {
  click(opts?: { timeout?: number }): Promise<unknown>;
  fill(value: string, opts?: { timeout?: number }): Promise<unknown>;
}
interface PwLocator {
  evaluateAll(fn: (els: Element[], stamp?: boolean) => unknown, arg?: boolean): Promise<unknown>;
  nth(index: number): PwElement;
}
interface PwPage {
  context(): { newCDPSession(page: PwPage): Promise<PwCdpSession> };
  goto(url: string, opts?: Record<string, unknown>): Promise<unknown>;
  url(): string;
  waitForLoadState?(state: string, opts?: Record<string, unknown>): Promise<unknown>;
  title?(): Promise<string>;
  evaluate(fn: (arg: number) => unknown, arg?: number): Promise<unknown>;
  locator(selector: string): PwLocator;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  goBack(opts?: Record<string, unknown>): Promise<unknown>;
  close?(): Promise<unknown>;
}
interface PwCdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
  on(event: string, handler: (event: { requestId: string; frameId: string; request: { url: string } }) => void): void;
}
interface PwBrowser {
  newPage(opts?: Record<string, unknown>): Promise<PwPage>;
  close(): Promise<unknown>;
}
interface PwModule {
  chromium: { launch(opts: { headless: boolean }): Promise<PwBrowser> };
}

interface Observed {
  url: string;
  title: string;
  pageText: string;
  textExcerpt: string;
  elements: Array<{ i: number; role: string; name: string; href?: string; kind: string }>;
}

/* ------------------------------------------------------------------- utilities */

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown): string {
  return (error as { message?: string } | null)?.message ?? String(error);
}

function hostOf(url: string): string {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.hostname.toLowerCase() : '';
  } catch {
    return '';
  }
}

/** Host-suffix match: `docs.example.com` is inside `example.com`. */
function hostAllowed(host: string, allow: string[]): boolean {
  if (!host) return false;
  return allow.some((raw) => {
    const d = raw.replace(/^\./, '').trim().toLowerCase();
    if (!d) return false;
    return host === d || host.endsWith(`.${d}`);
  });
}

/**
 * The project's `jev.browse` settings, or the built-in defaults when the config cannot
 * be read. Never throws: browsing degrades to the defaults rather than failing.
 */
function browseConfig(projectRoot?: string): JevConfig['browse'] {
  try {
    return loadJevConfig(projectRoot).browse;
  } catch {
    return { allowDomains: [...JEV_DEFAULTS.browse.allowDomains], maxSteps: JEV_DEFAULTS.browse.maxSteps };
  }
}

/**
 * Let an action's navigation actually commit before anyone reads `page.url()`.
 *
 * `click()` resolves as soon as the click is dispatched: a `history.pushState` route
 * change or a `fetch().then(() => location.assign(...))` has not happened yet, so the
 * URL still reads as the previous (allowed) page. Sleep first so the handler can start
 * the navigation, then wait for the new document to commit.
 */
async function settle(page: PwPage): Promise<void> {
  await sleep(SETTLE_MS);
  try {
    if (typeof page.waitForLoadState === 'function') {
      await page.waitForLoadState('domcontentloaded', { timeout: ACTION_TIMEOUT_MS });
    }
  } catch {
    /* no navigation to wait for is the normal case — carry on */
  }
}

/** Best-effort retreat from a page we are not allowed to be on. */
async function retreat(page: PwPage): Promise<void> {
  try {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });
  } catch {
    /* best effort — we are leaving anyway */
  }
}

/**
 * Why this link must never be offered or followed (null = fine). The label is only half
 * the story: the target decides what a click actually does.
 */
function linkRefusal(href: string | undefined, base: string, allowSensitive: boolean): string | null {
  const raw = (href ?? '').trim();
  if (!raw) return null;

  let target: URL;
  try {
    target = new URL(raw, base || undefined);
  } catch {
    return `unreadable link target "${raw.slice(0, 60)}"`;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return `link target is not a web page (${target.protocol})`;
  }
  if (allowSensitive) return null;

  let where = `${target.pathname}${target.search}`;
  try {
    where = decodeURIComponent(where);
  } catch {
    /* keep the encoded form — it is still worth matching */
  }
  if (SENSITIVE.test(where) || SENSITIVE_URL.test(where)) {
    return `link target looks destructive (${where.slice(0, 60)})`;
  }
  return null;
}

/** Lazy Playwright: injected → local install → global npm root. Never throws. */
async function loadPlaywright(injected?: unknown): Promise<PwModule | null> {
  const pick = (mod: unknown): PwModule | null => {
    const m = mod as { chromium?: unknown; default?: { chromium?: unknown } } | null;
    if (m && typeof m === 'object' && m.chromium) return m as unknown as PwModule;
    if (m && typeof m === 'object' && m.default?.chromium) return m.default as unknown as PwModule;
    return null;
  };

  const direct = pick(injected);
  if (direct) return direct;

  const specs: string[] = ['playwright', 'playwright-core'];
  for (const spec of specs) {
    try {
      const found = pick(await import(spec));
      if (found) return found;
    } catch {
      /* not installed next to us — try the next strategy */
    }
  }

  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const res = spawnSync(npm, ['root', '-g'], { encoding: 'utf-8', timeout: 15_000 });
    const root = String(res.stdout ?? '').trim().split(/\r?\n/).pop() ?? '';
    if (root) {
      const req = createRequire(path.join(root, 'noop.js'));
      for (const spec of specs) {
        try {
          const found = pick(req(spec));
          if (found) return found;
        } catch {
          /* keep looking */
        }
      }
    }
  } catch {
    /* npm missing or sandboxed — fall through to the hint */
  }

  return null;
}

/**
 * Runs in the page: describe every interactive element we could act on.
 *
 * With `stamp` it also writes `data-jev-ref="<i>"` on each described element (and clears
 * it from the ones it skips), so the action taken after the Jev round trip is aimed at
 * the element itself instead of at an ordinal the page is free to shift meanwhile.
 */
function describeElements(els: Element[], stamp?: boolean): unknown {
  const out: Array<{ i: number; role: string; name: string; href?: string; kind: string }> = [];
  els.forEach((el, i) => {
    const any = el as unknown as Record<string, any>;
    const unstamp = () => {
      if (!stamp) return;
      try {
        any.removeAttribute?.('data-jev-ref');
      } catch {
        /* nothing we can do from in here */
      }
    };
    let visible = true;
    try {
      const rect = any.getBoundingClientRect();
      const view = any.ownerDocument?.defaultView;
      const style = view?.getComputedStyle ? view.getComputedStyle(el) : null;
      visible =
        rect.width > 0 &&
        rect.height > 0 &&
        (!style || (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'));
    } catch {
      visible = true;
    }
    if (!visible) {
      unstamp();
      return;
    }

    const tag = String(any.tagName ?? '').toLowerCase();
    const type = String(any.getAttribute?.('type') ?? '').toLowerCase();
    const explicitRole = String(any.getAttribute?.('role') ?? '').toLowerCase();
    const role =
      explicitRole ||
      (tag === 'a' ? 'link' : tag === 'input' ? (type || 'text') + ' input' : tag || 'element');

    const raw =
      any.getAttribute?.('aria-label') ||
      (typeof any.innerText === 'string' ? any.innerText : '') ||
      any.getAttribute?.('placeholder') ||
      any.getAttribute?.('title') ||
      (typeof any.value === 'string' ? any.value : '') ||
      any.getAttribute?.('name') ||
      '';
    const name = String(raw).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) {
      unstamp();
      return;
    }

    const textish = ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''];
    const kind =
      tag === 'textarea' || (tag === 'input' && textish.indexOf(type) >= 0)
        ? 'input'
        : tag === 'select'
          ? 'select'
          : 'clickable';

    const href = tag === 'a' ? String(any.getAttribute?.('href') ?? '') : '';
    if (stamp) {
      try {
        any.setAttribute?.('data-jev-ref', String(i));
      } catch {
        /* an element we cannot stamp is one we will refuse to act on later */
      }
    }
    out.push(href ? { i, role, name, href, kind } : { i, role, name, kind });
  });
  return out;
}

async function observe(page: PwPage): Promise<Observed> {
  const url = page.url();
  let title = '';
  try {
    title = typeof page.title === 'function' ? String(await page.title()) : '';
  } catch {
    title = '';
  }

  let bodyText = '';
  try {
    bodyText = String((await page.evaluate(() => (document.body ? document.body.innerText : ''))) ?? '');
  } catch {
    bodyText = '';
  }
  const pageText = collapse(bodyText).slice(0, MAX_PAGE_TEXT_CHARS);

  let elements: Observed['elements'] = [];
  try {
    const raw = (await page.locator(INTERACTIVE_SELECTOR).evaluateAll(describeElements, true)) as
      | Observed['elements']
      | null;
    const seen = new Set<string>();
    for (const el of Array.isArray(raw) ? raw : []) {
      if (!el || typeof el.i !== 'number' || !el.name) continue;
      const key = `${el.role}|${el.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push({ ...el, name: el.name.slice(0, MAX_NAME_CHARS) });
      if (elements.length >= MAX_ELEMENTS) break;
    }
  } catch {
    elements = [];
  }

  return { url, title, pageText, textExcerpt: pageText.slice(0, MAX_EXCERPT_CHARS), elements };
}

interface Candidate {
  key: string;
  label: string;
  index?: number;
  input?: string;
  /** What Jev was shown — re-checked on the live element before we act on it. */
  role?: string;
  name?: string;
}

/** Enumerate the answers: one option per thing Jev is allowed to do here. */
function buildCandidates(
  elements: Observed['elements'],
  inputs: Record<string, string>,
  allowSensitive: boolean,
  baseUrl: string,
  allowDomains: string[],
): { candidates: Map<string, Candidate>; criteria: Record<string, Json> } {
  const candidates = new Map<string, Candidate>();
  const criteria: Record<string, Json> = {};
  const inputKeys = Object.keys(inputs);

  for (const el of elements) {
    if (!allowSensitive && SENSITIVE.test(el.name)) continue;
    if (linkRefusal(el.href, baseUrl, allowSensitive)) continue;
    if (el.href && !hostAllowed(hostOf(new URL(el.href, baseUrl).href), allowDomains)) continue;
    const key = `a${el.i}`;

    if (el.kind === 'clickable') {
      const label = `Click ${el.role} '${el.name}'`;
      candidates.set(key, { key, label, index: el.i, role: el.role, name: el.name });
      criteria[key] = label;
    } else if (el.kind === 'input') {
      const match = inputKeys.find((k) => k.toLowerCase() === el.name.toLowerCase());
      if (!match) continue;
      const label = `Type the provided value into '${el.name}'`;
      candidates.set(key, { key, label, index: el.i, input: inputs[match], role: el.role, name: el.name });
      criteria[key] = label;
    }
  }

  for (const [key, description] of Object.entries(FIXED_ACTIONS)) {
    candidates.set(key, { key, label: key });
    criteria[key] = description;
  }

  return { candidates, criteria };
}

/**
 * Bind the action to the element, not to its ordinal. Between `observe()` and here sits a
 * full Jev round trip, and anything the page does meanwhile — a lazily loaded row, an ad,
 * a cookie banner, an SPA re-render — shifts the ordinals. We re-read the element by its
 * `data-jev-ref` stamp and refuse when it is not the one Jev was shown, or when it has
 * become a control we are not allowed to touch. Returns a refusal, or null when it is safe.
 */
async function recheckTarget(
  page: PwPage,
  chosen: Candidate,
  allowSensitive: boolean,
  baseUrl: string,
  allowDomains: string[],
): Promise<string | null> {
  let live: Observed['elements'][number] | null = null;
  try {
    const raw = (await page
      .locator(`[${REF_ATTR}="${chosen.index}"]`)
      .evaluateAll(describeElements, false)) as Observed['elements'] | null;
    live = Array.isArray(raw) && raw.length > 0 ? raw[0] : null;
  } catch {
    return 'could not re-check the chosen element before acting';
  }
  if (!live || !live.name) return 'the chosen element is no longer on the page';

  const name = String(live.name).slice(0, MAX_NAME_CHARS);
  if (live.role !== chosen.role || name !== chosen.name) {
    return `the element changed after it was chosen (now ${live.role} '${name}')`;
  }
  if (!allowSensitive && SENSITIVE.test(name)) return 'the element is now a sensitive control';
  const refusal = linkRefusal(live.href, baseUrl, allowSensitive);
  if (refusal) return `refusing to act: ${refusal}`;
  if (live.href && !hostAllowed(hostOf(new URL(live.href, baseUrl).href), allowDomains)) return 'link destination is outside allowed domains';
  return null;
}

function fingerprint(url: string, elements: Observed['elements']): string {
  return `${url}::${elements.map((e) => `${e.i}${e.role}${e.name}`).join('|')}`;
}

async function capture(page: PwPage, dir: string | null, n: number): Promise<string | null> {
  if (!dir) return null;
  const file = path.join(dir, `step-${n}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    return file;
  } catch {
    return null;
  }
}

function screenshotDirFor(opts: BrowseOptions): string | null {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir =
      opts.screenshotDir ??
      path.join(opts.projectRoot ?? process.cwd(), '.specweave', 'state', 'jev-browse', stamp);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return null;
  }
}

function errorResult(error: string, extra?: Partial<BrowseResult>): BrowseResult {
  return {
    status: 'error',
    url: '',
    title: '',
    steps: [],
    pageText: '',
    screenshots: [],
    elapsedMs: 0,
    cost: 0,
    error,
    ...extra,
  };
}

/* ----------------------------------------------------------------------- loop */

/**
 * Run the headless browse loop. Always resolves — failures come back as
 * `status: 'error'` so an agent can keep going without a try/catch.
 */
export async function runBrowse(opts: BrowseOptions): Promise<BrowseResult> {
  const started = Date.now();

  const goal = (opts.goal ?? '').trim();
  if (!goal) return errorResult('a goal is required');

  const startUrl = (opts.url ?? '').trim();
  if (!startUrl) return errorResult('a start url is required');
  if (!hostOf(startUrl)) return errorResult(`not a browsable url: ${startUrl}`);

  // Flags win over `jev.browse` in .specweave/config.json, which wins over "this host only".
  const cfgBrowse = browseConfig(opts.projectRoot);
  const allow = opts.allowDomains?.length
    ? opts.allowDomains
    : cfgBrowse.allowDomains.length
      ? cfgBrowse.allowDomains
      : [hostOf(startUrl)];

  // Nothing is fetched, screenshotted or sent to Jev from an origin the operator excluded
  // — including the very first page, which used to be loaded unconditionally.
  if (!hostAllowed(hostOf(startUrl), allow)) {
    return errorResult(
      `start url is outside the allowed origins (${hostOf(startUrl)} not in ${allow.join(', ')})`,
      { status: 'blocked', handoff: `${goal} — start url ${startUrl} is not an allowed origin` },
    );
  }

  const client = opts.client ?? createJevClient(opts.projectRoot);
  if (!client) return errorResult('jev unavailable');

  const pw = await loadPlaywright(opts.playwright);
  if (!pw) return errorResult(`playwright is not installed — ${PLAYWRIGHT_HINT}`);

  const maxSteps = Math.max(1, Math.min(opts.maxSteps ?? cfgBrowse.maxSteps, HARD_MAX_STEPS));
  const maxMs = opts.maxMs ?? DEFAULT_MAX_MS;
  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const inputs = opts.inputs ?? {};
  const allowSensitive = opts.allowSensitive === true;
  const dir = screenshotDirFor(opts);

  const steps: BrowseStep[] = [];
  const screenshots: string[] = [];
  const history: Array<{ action: string; outcome: string }> = [];
  let status: BrowseResult['status'] = 'step_limit';
  let error: string | undefined;
  let cost = 0;
  let url = startUrl;
  let title = '';
  let pageText = '';
  let prevSignature = '';
  let unconfirmedDone = 0;

  // HEADLESS IS NOT AN OPTION — there is deliberately no way to open a window here.
  let browser: PwBrowser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch (e) {
    return errorResult(`could not launch headless chromium: ${messageOf(e)} — ${PLAYWRIGHT_HINT}`, {
      elapsedMs: Date.now() - started,
      handoff: `${goal} — browser unavailable`,
    });
  }
  let page: PwPage | null = null;
  let blockedNavigation = '';

  try {
    page = await browser.newPage({ serviceWorkers: 'block' });
    // Playwright route() sees only the first URL in an HTTP redirect chain.
    // Chromium Fetch pauses every document request, including each redirect,
    // before network dispatch. Fail closed when interception cannot be installed.
    const cdp = await page.context().newCDPSession(page);
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const mainFrameId = frameTree.frame.id as string;
    cdp.on('Fetch.requestPaused', (event) => {
      const blocked = event.frameId === mainFrameId && !hostAllowed(hostOf(event.request.url), allow);
      if (blocked) blockedNavigation = event.request.url;
      void cdp.send(blocked ? 'Fetch.failRequest' : 'Fetch.continueRequest', blocked
        ? { requestId: event.requestId, errorReason: 'BlockedByClient' }
        : { requestId: event.requestId }).catch((e: unknown) => {
          error = `navigation interception failed: ${messageOf(e)}`;
          void browser.close().catch(() => {});
        });
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'Document', requestStage: 'Request' }] });
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS * 3 });

    for (let n = 1; n <= maxSteps; n++) {
      if (blockedNavigation) { status = 'blocked'; break; }
      if (error) { status = 'error'; break; }
      if (Date.now() - started > maxMs) {
        status = 'budget';
        break;
      }

      // Backstop for a navigation that committed after the previous step's check (SPA
      // routing, a deferred `location.assign`). Checked BEFORE we observe or screenshot,
      // so an off-origin page is never scraped or sent to Jev.
      const landedUrl = page.url();
      const landedHost = hostOf(landedUrl);
      if (!hostAllowed(landedHost, allow)) {
        steps.push({
          n,
          url: landedUrl,
          action: 'origin check',
          choice: '',
          confidence: 0,
          apiMs: 0,
          executed: false,
          reason: `navigated outside the allowed origins (${landedHost || landedUrl})`,
        });
        await retreat(page);
        url = page.url();
        status = 'blocked';
        break;
      }

      const obs = await observe(page);
      url = obs.url;
      title = obs.title;
      pageText = obs.pageText;

      const shot = await capture(page, dir, n);
      if (shot) screenshots.push(shot);

      const { candidates, criteria } = buildCandidates(obs.elements, inputs, allowSensitive, obs.url, allow);
      const state: Json = {
        goal,
        url: obs.url,
        title: obs.title,
        textExcerpt: obs.textExcerpt,
        elements: obs.elements.map((e) => ({ i: e.i, role: e.role, name: e.name, href: e.href ?? null })),
        history: history.slice(-HISTORY_STEPS),
      };

      let answerChoice = '';
      let confidence = 0;
      let goalReached = 0;
      let apiMs = 0;
      try {
        const response = await client.ask(
          state,
          { next: { type: 'choice', instructions: NEXT_INSTRUCTIONS, criteria }, goal_reached: GOAL_REACHED },
          { kind: 'browse' },
        );
        cost += response.usage.cost ?? 0;
        apiMs = response.latencyMs;
        const next = response.answers.next;
        if (next && next.type === 'choice') {
          answerChoice = next.choice;
          confidence = next.confidence;
        }
        const reached = response.answers.goal_reached;
        goalReached = reached && reached.type === 'noul' ? reached.noul : 0;
      } catch (e) {
        status = 'error';
        error = messageOf(e);
        steps.push({ n, url: obs.url, action: 'ask', choice: '', confidence: 0, apiMs: 0, executed: false, reason: error });
        break;
      }

      const chosen = candidates.get(answerChoice);
      const action = chosen?.label ?? answerChoice ?? 'unknown';
      const step: BrowseStep = { n, url: obs.url, action, choice: answerChoice, confidence, apiMs, executed: false };

      if (!chosen) {
        step.reason = `Jev returned an unknown option "${answerChoice}"`;
        steps.push(step);
        status = 'blocked';
        break;
      }

      if (confidence < minConfidence) {
        step.reason = `confidence ${confidence.toFixed(2)} below minimum ${minConfidence} (goal_reached ${goalReached.toFixed(2)})`;
        steps.push(step);
        status = 'low_confidence';
        break;
      }

      const signature = `${answerChoice}::${fingerprint(obs.url, obs.elements)}`;

      switch (answerChoice) {
        case 'DONE': {
          if (goalReached >= 0.8) {
            step.executed = true;
            step.reason = `goal visible (${goalReached.toFixed(2)})`;
            steps.push(step);
            status = 'done';
          } else if (unconfirmedDone === 0) {
            unconfirmedDone++;
            step.reason = `done claimed but the goal is not visible (${goalReached.toFixed(2)}) — looking again`;
            steps.push(step);
            history.push({ action, outcome: 'done not confirmed' });
            prevSignature = signature;
            continue;
          } else {
            step.reason = 'done claimed twice without the goal being visible';
            steps.push(step);
            status = 'blocked';
          }
          break;
        }
        case 'BLOCKED': {
          step.reason = 'Jev reports the goal is unreachable from here';
          steps.push(step);
          status = 'blocked';
          break;
        }
        case 'NEEDS_AGENT': {
          step.reason = 'the page needs a human or agent judgement (login, captcha, payment, free text)';
          steps.push(step);
          status = 'needs_agent';
          break;
        }
        default: {
          if (signature === prevSignature) {
            step.reason = 'no progress: the same action on an unchanged page';
            steps.push(step);
            status = 'blocked';
            break;
          }
          prevSignature = signature;

          try {
            if (answerChoice === 'SCROLL_DOWN') {
              await page.evaluate((d: number) => window.scrollBy(0, Math.round(window.innerHeight * 0.9) * d), 1);
            } else if (answerChoice === 'SCROLL_UP') {
              await page.evaluate((d: number) => window.scrollBy(0, Math.round(window.innerHeight * 0.9) * d), -1);
            } else if (answerChoice === 'BACK') {
              await page.goBack({ waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });
            } else if (answerChoice === 'WAIT') {
              await sleep(1000);
            } else if (chosen.index !== undefined) {
              // Act on the element itself, never on its ordinal: `observe()` stamped it,
              // and this re-check refuses the step if the page swapped it meanwhile.
              const stale = await recheckTarget(page, chosen, allowSensitive, obs.url, allow);
              if (stale) {
                step.reason = stale;
                steps.push(step);
                history.push({ action, outcome: 'skipped: the page changed under the choice' });
                continue;
              }
              const target = page.locator(`[${REF_ATTR}="${chosen.index}"]`).nth(0);
              if (chosen.input !== undefined) {
                await target.fill(chosen.input, { timeout: ACTION_TIMEOUT_MS });
              } else {
                await target.click({ timeout: ACTION_TIMEOUT_MS });
              }
            }
            step.executed = true;
          } catch (e) {
            if (blockedNavigation) {
              step.reason = 'navigation blocked before contacting an excluded domain';
              steps.push(step);
              status = 'blocked';
              break;
            }
            step.reason = `action failed: ${messageOf(e)}`;
            steps.push(step);
            history.push({ action, outcome: 'action failed' });
            continue;
          }

          // Wait for any navigation the action started to commit — `page.url()` read
          // straight after `click()` still reports the previous, allowed page.
          await settle(page);
          if (blockedNavigation) {
            step.reason = 'navigation blocked before contacting an excluded domain';
            steps.push(step);
            status = 'blocked';
            break;
          }

          const landed = page.url();
          if (!hostAllowed(hostOf(landed), allow)) {
            step.reason = `navigated outside the allowed origins (${hostOf(landed) || landed})`;
            steps.push(step);
            await retreat(page);
            url = page.url();
            status = 'blocked';
            break;
          }

          steps.push(step);
          history.push({ action, outcome: `now at ${landed}` });
          url = landed;
          continue;
        }
      }

      break;
    }

    if (status !== 'error') {
      try {
        // Only re-read the page when we are still somewhere we are allowed to be: the
        // final observation ends up in `pageText`, and that must never be off-origin.
        if (hostAllowed(hostOf(page.url()), allow)) {
          const final = await observe(page);
          url = final.url;
          title = final.title;
          pageText = final.pageText;
        }
      } catch {
        /* keep the last known observation */
      }
    }
  } catch (e) {
    status = blockedNavigation ? 'blocked' : 'error';
    error = blockedNavigation ? 'navigation blocked before contacting an excluded domain' : messageOf(e);
  } finally {
    try {
      if (page?.close) await page.close();
    } catch {
      /* ignore */
    }
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
  }

  const result: BrowseResult = {
    status,
    url,
    title,
    steps,
    pageText,
    screenshots,
    elapsedMs: Date.now() - started,
    cost,
  };
  if (error) result.error = error;
  if (status !== 'done') result.handoff = `${goal} — unfinished at ${url} (${status})`;
  return result;
}
