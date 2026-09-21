/**
 * Headless browse loop: a fake Playwright and a scripted Jev client, no network and
 * no real browser. Covers the terminal statuses, the safety rails (origin allowlist,
 * sensitive controls, typed input) and the non-negotiable `headless: true`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBrowse, type BrowseOptions } from '../../../src/core/jev/browse.js';
import type { JevClient, Question } from '../../../src/core/jev/client.js';

/* ------------------------------------------------------------------ fake page */

interface FakeElement {
  i: number;
  role: string;
  name: string;
  kind: 'clickable' | 'input' | 'select';
  href?: string;
}

interface Env {
  url: string;
  title: string;
  text: string;
  elements: FakeElement[];
  clicks: number[];
  fills: Array<{ index: number; value: string }>;
  scrolls: number[];
  backs: number;
  shots: string[];
  gotos: string[];
  launches: number;
  launchOpts: unknown;
  browserClosed: boolean;
  onClick?: (index: number, env: Env) => void;
}

function makeEnv(partial: Partial<Env> = {}): Env {
  return {
    url: 'https://example.com/',
    title: 'Example Domain',
    text: 'Example Domain. This domain is for use in illustrative examples.',
    elements: [],
    clicks: [],
    fills: [],
    scrolls: [],
    backs: 0,
    shots: [],
    gotos: [],
    launches: 0,
    launchOpts: undefined,
    browserClosed: false,
    ...partial,
  };
}

function makePlaywright(env: Env): unknown {
  const page = {
    goto: vi.fn(async (url: string) => {
      env.gotos.push(url);
      env.url = url;
      return null;
    }),
    url: () => env.url,
    title: async () => env.title,
    evaluate: async (_fn: unknown, arg?: number) => {
      if (typeof arg === 'number') {
        env.scrolls.push(arg);
        return null;
      }
      return env.text;
    },
    // Honours `[data-jev-ref="i"]` the way the real page does: the loop stamps every
    // described element and then re-reads it by that stamp, so a fake that ignores the
    // selector would happily "click" whatever now sits at that ordinal — exactly the
    // bug the stamping exists to prevent.
    locator: (selector: string) => {
      const ref = /\[data-jev-ref="(\d+)"\]/.exec(selector);
      const matched = ref ? env.elements.filter((el) => String(el.i) === ref[1]) : env.elements;
      return {
        evaluateAll: async () => matched,
        nth: (index: number) => {
          const el = matched[index];
          return {
            click: async () => {
              if (!el) throw new Error(`no element for ${selector}`);
              env.clicks.push(el.i);
              env.onClick?.(el.i, env);
            },
            fill: async (value: string) => {
              if (!el) throw new Error(`no element for ${selector}`);
              env.fills.push({ index: el.i, value });
            },
          };
        },
      };
    },
    screenshot: async ({ path: file }: { path: string }) => {
      env.shots.push(file);
      return null;
    },
    goBack: async () => {
      env.backs += 1;
      env.url = 'https://example.com/';
      return null;
    },
    close: async () => null,
  };

  return {
    chromium: {
      launch: vi.fn(async (launchOpts: { headless: boolean }) => {
        env.launches += 1;
        env.launchOpts = launchOpts;
        return {
          newPage: async () => page,
          close: async () => {
            env.browserClosed = true;
            return null;
          },
        };
      }),
    },
  };
}

/* ---------------------------------------------------------------- fake client */

interface Scripted {
  choice: string;
  confidence?: number;
  goal?: number;
  /**
   * Runs inside `ask` — i.e. in the real seam between `observe()` and the action,
   * which is where a lazily loaded row, an ad or an SPA re-render lands.
   */
  mutate?: (env: Env) => void;
}

function stubClient(script: Scripted[], env?: Env): {
  client: JevClient;
  asked: Array<{ state: unknown; questions: Record<string, Question> }>;
} {
  const asked: Array<{ state: unknown; questions: Record<string, Question> }> = [];
  const queue = [...script];
  const client = {
    ask: async (state: unknown, questions: Record<string, Question>) => {
      asked.push({ state, questions });
      const next = queue.shift() ?? { choice: 'BLOCKED', confidence: 0.99 };
      const confidence = next.confidence ?? 0.95;
      if (env) next.mutate?.(env);
      return {
        provider: 'openrouter' as const,
        model: 'typesafe/jev-1.13-20260917',
        answers: {
          next: {
            type: 'choice' as const,
            choice: next.choice,
            probabilities: { [next.choice]: confidence },
            confidence,
          },
          goal_reached: { type: 'noul' as const, noul: next.goal ?? 0 },
        },
        usage: { input_tokens: 300, output_tokens: 20, cost: 0.00001 },
        latencyMs: 250,
      };
    },
  };
  return { client: client as unknown as JevClient, asked };
}

/* -------------------------------------------------------------------- harness */

const tmpDirs: string[] = [];

function shotDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-browse-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

function run(env: Env, script: Scripted[], extra: Partial<BrowseOptions> = {}) {
  const { client, asked } = stubClient(script, env);
  return {
    asked,
    promise: runBrowse({
      goal: 'Open the More information link',
      url: 'https://example.com/',
      client,
      playwright: makePlaywright(env),
      screenshotDir: shotDir(),
      ...extra,
    }),
  };
}

const MORE_INFO: FakeElement = {
  i: 0,
  role: 'link',
  name: 'More information...',
  kind: 'clickable',
  href: 'https://www.iana.org/domains/example',
};

/* ---------------------------------------------------------------------- tests */

describe('runBrowse — happy path', () => {
  it('clicks the chosen element and finishes with done', async () => {
    const env = makeEnv({
      elements: [MORE_INFO],
      onClick: (_i, e) => {
        e.url = 'https://example.com/more';
        e.title = 'More';
      },
    });
    const { promise } = run(env, [
      { choice: 'a0', confidence: 0.92 },
      { choice: 'DONE', confidence: 0.96, goal: 0.93 },
    ]);
    const result = await promise;

    expect(result.status).toBe('done');
    expect(env.clicks).toEqual([0]);
    expect(result.steps.map((s) => s.choice)).toEqual(['a0', 'DONE']);
    expect(result.steps[0].action).toBe("Click link 'More information...'");
    expect(result.steps[0].executed).toBe(true);
    expect(result.url).toBe('https://example.com/more');
    expect(result.cost).toBeCloseTo(0.00002, 8);
    expect(result.screenshots).toHaveLength(2);
    expect(result.screenshots[0].endsWith(`step-1.png`)).toBe(true);
    expect(result.handoff).toBeUndefined();
    expect(result.pageText.length).toBeLessThanOrEqual(4000);
  });

  it('always launches headless and closes the browser', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [{ choice: 'DONE', confidence: 0.9, goal: 0.9 }]);
    await promise;

    expect(env.launchOpts).toEqual({ headless: true });
    expect(env.browserClosed).toBe(true);
  });

  it('sends one request per step with both questions and the element list', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise, asked } = run(env, [{ choice: 'DONE', confidence: 0.9, goal: 0.95 }]);
    await promise;

    expect(asked).toHaveLength(1);
    expect(Object.keys(asked[0].questions).sort()).toEqual(['goal_reached', 'next']);
    const nextQuestion = asked[0].questions.next as { type: 'choice'; criteria: Record<string, unknown> };
    expect(nextQuestion.type).toBe('choice');
    expect(Object.keys(nextQuestion.criteria)).toContain('a0');
    expect(Object.keys(nextQuestion.criteria)).toEqual(
      expect.arrayContaining(['SCROLL_DOWN', 'SCROLL_UP', 'BACK', 'WAIT', 'DONE', 'BLOCKED', 'NEEDS_AGENT']),
    );
    expect((asked[0].state as { goal: string }).goal).toBe('Open the More information link');
  });
});

describe('runBrowse — handing control back', () => {
  it('stops with needs_agent when the page needs a human judgement', async () => {
    const env = makeEnv({ elements: [{ i: 0, role: 'button', name: 'Continue', kind: 'clickable' }] });
    const { promise } = run(env, [{ choice: 'NEEDS_AGENT', confidence: 0.88 }]);
    const result = await promise;

    expect(result.status).toBe('needs_agent');
    expect(env.clicks).toEqual([]);
    expect(result.handoff).toContain('needs_agent');
    expect(result.steps[0].executed).toBe(false);
  });

  it('stops with blocked when Jev says the goal is unreachable', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [{ choice: 'BLOCKED', confidence: 0.9 }]);
    const result = await promise;

    expect(result.status).toBe('blocked');
    expect(env.clicks).toEqual([]);
  });

  it('stops with low_confidence below the minimum and never acts', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [{ choice: 'a0', confidence: 0.3 }]);
    const result = await promise;

    expect(result.status).toBe('low_confidence');
    expect(env.clicks).toEqual([]);
    expect(result.steps[0].reason).toContain('below minimum');
  });

  it('stops with step_limit when the budget of steps runs out', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(
      env,
      [
        { choice: 'SCROLL_DOWN', confidence: 0.9 },
        { choice: 'SCROLL_UP', confidence: 0.9 },
      ],
      { maxSteps: 2 },
    );
    const result = await promise;

    expect(result.status).toBe('step_limit');
    expect(result.steps).toHaveLength(2);
    expect(env.scrolls).toEqual([1, -1]);
  });

  it('blocks a repeated action on an unchanged page', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [
      { choice: 'SCROLL_DOWN', confidence: 0.9 },
      { choice: 'SCROLL_DOWN', confidence: 0.9 },
    ]);
    const result = await promise;

    expect(result.status).toBe('blocked');
    expect(result.steps[1].reason).toContain('no progress');
  });

  it('gives an unconfirmed DONE one more look, then blocks', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [
      { choice: 'DONE', confidence: 0.9, goal: 0.2 },
      { choice: 'DONE', confidence: 0.9, goal: 0.2 },
    ]);
    const result = await promise;

    expect(result.status).toBe('blocked');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].reason).toContain('not visible');
  });
});

describe('runBrowse — safety rails', () => {
  it('goes back and blocks when a click leaves the allowed origins', async () => {
    const env = makeEnv({
      elements: [{ i: 0, role: 'link', name: 'Sponsored', kind: 'clickable', href: 'https://evil.test/' }],
      onClick: (_i, e) => {
        e.url = 'https://evil.test/landing';
      },
    });
    const { promise } = run(env, [{ choice: 'a0', confidence: 0.9 }]);
    const result = await promise;

    expect(result.status).toBe('blocked');
    expect(env.backs).toBe(1);
    expect(result.steps[0].reason).toContain('outside the allowed origins');
  });

  it('allows a subdomain of an explicitly allowed domain', async () => {
    const env = makeEnv({
      elements: [MORE_INFO],
      onClick: (_i, e) => {
        e.url = 'https://docs.example.com/page';
      },
    });
    const { promise } = run(
      env,
      [
        { choice: 'a0', confidence: 0.9 },
        { choice: 'DONE', confidence: 0.9, goal: 0.95 },
      ],
      { allowDomains: ['example.com'] },
    );
    const result = await promise;

    expect(result.status).toBe('done');
    expect(env.backs).toBe(0);
  });

  it('never offers a sensitive control unless allowSensitive is set', async () => {
    const elements: FakeElement[] = [
      { i: 0, role: 'button', name: 'Delete account', kind: 'clickable' },
      { i: 1, role: 'link', name: 'Help', kind: 'clickable' },
    ];
    const guarded = run(makeEnv({ elements }), [{ choice: 'BLOCKED', confidence: 0.9 }]);
    await guarded.promise;
    const guardedCriteria = Object.keys(
      (guarded.asked[0].questions.next as { criteria: Record<string, unknown> }).criteria,
    );
    expect(guardedCriteria).not.toContain('a0');
    expect(guardedCriteria).toContain('a1');

    const opened = run(makeEnv({ elements }), [{ choice: 'BLOCKED', confidence: 0.9 }], {
      allowSensitive: true,
    });
    await opened.promise;
    const openedCriteria = Object.keys(
      (opened.asked[0].questions.next as { criteria: Record<string, unknown> }).criteria,
    );
    expect(openedCriteria).toContain('a0');
  });

  it('offers a text field only when inputs provides a matching value', async () => {
    const elements: FakeElement[] = [{ i: 0, role: 'text input', name: 'Search', kind: 'input' }];

    const without = run(makeEnv({ elements }), [{ choice: 'BLOCKED', confidence: 0.9 }]);
    await without.promise;
    expect(
      Object.keys((without.asked[0].questions.next as { criteria: Record<string, unknown> }).criteria),
    ).not.toContain('a0');

    const env = makeEnv({ elements });
    const withInput = run(env, [{ choice: 'a0', confidence: 0.9 }, { choice: 'DONE', confidence: 0.9, goal: 0.95 }], {
      inputs: { search: 'jev' },
    });
    const result = await withInput.promise;

    expect(
      Object.keys((withInput.asked[0].questions.next as { criteria: Record<string, unknown> }).criteria),
    ).toContain('a0');
    expect(env.fills).toEqual([{ index: 0, value: 'jev' }]);
    expect(env.clicks).toEqual([]);
    expect(result.status).toBe('done');
  });
});

/** A temp project whose `.specweave/config.json` carries a `jev.browse` section. */
function projectWith(browse: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-browse-cfg-'));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.specweave', 'config.json'),
    JSON.stringify({ version: '2.0', jev: { enabled: true, browse } }, null, 2),
  );
  return root;
}

describe('runBrowse — jev.browse config', () => {
  it('honours allowDomains from the project config', async () => {
    const projectRoot = projectWith({ allowDomains: ['allowed.test'], maxSteps: 20 });
    const env = makeEnv({
      url: 'https://allowed.test/',
      elements: [{ i: 0, role: 'link', name: 'Sponsored', kind: 'clickable', href: 'https://other.test/' }],
      onClick: (_i, e) => {
        e.url = 'https://other.test/landing';
      },
    });

    const { promise } = run(env, [{ choice: 'a0', confidence: 0.9 }], {
      url: 'https://allowed.test/',
      projectRoot,
    });
    const result = await promise;

    expect(result.status).toBe('blocked');
    expect(result.steps[0].reason).toContain('outside the allowed origins');
    expect(env.backs).toBe(1);
  });

  it('allows a subdomain of a config-listed domain', async () => {
    const projectRoot = projectWith({ allowDomains: ['allowed.test'] });
    const env = makeEnv({
      url: 'https://allowed.test/',
      elements: [{ i: 0, role: 'link', name: 'Docs', kind: 'clickable', href: 'https://docs.allowed.test/' }],
      onClick: (_i, e) => {
        e.url = 'https://docs.allowed.test/page';
      },
    });

    const { promise } = run(
      env,
      [
        { choice: 'a0', confidence: 0.9 },
        { choice: 'DONE', confidence: 0.9, goal: 0.95 },
      ],
      { url: 'https://allowed.test/', projectRoot },
    );

    expect((await promise).status).toBe('done');
    expect(env.backs).toBe(0);
  });

  it('honours maxSteps from the project config', async () => {
    const projectRoot = projectWith({ allowDomains: ['example.com'], maxSteps: 2 });
    const env = makeEnv({ elements: [MORE_INFO] });

    const { promise } = run(
      env,
      [
        { choice: 'SCROLL_DOWN', confidence: 0.9 },
        { choice: 'SCROLL_UP', confidence: 0.9 },
        { choice: 'SCROLL_DOWN', confidence: 0.9 },
      ],
      { projectRoot },
    );
    const result = await promise;

    expect(result.status).toBe('step_limit');
    expect(result.steps).toHaveLength(2);
  });

  it('lets the flags win over the config for both settings', async () => {
    const projectRoot = projectWith({ allowDomains: ['nowhere.test'], maxSteps: 1 });
    const env = makeEnv({ elements: [MORE_INFO] });

    const { promise } = run(
      env,
      [
        { choice: 'SCROLL_DOWN', confidence: 0.9 },
        { choice: 'SCROLL_UP', confidence: 0.9 },
      ],
      { projectRoot, allowDomains: ['example.com'], maxSteps: 2 },
    );
    const result = await promise;

    // `nowhere.test` would have blocked the very first page; `maxSteps: 1` would have
    // stopped after one step.
    expect(result.status).toBe('step_limit');
    expect(result.steps).toHaveLength(2);
    expect(env.scrolls).toEqual([1, -1]);
  });
});

describe('runBrowse — the start url is checked first', () => {
  it('blocks a start url outside the allow-list before any navigation', async () => {
    const env = makeEnv();
    const { client } = stubClient([{ choice: 'DONE', confidence: 0.99, goal: 0.99 }]);

    const result = await runBrowse({
      goal: 'read the page',
      url: 'https://evil.test/landing',
      allowDomains: ['example.com'],
      client,
      playwright: makePlaywright(env),
      screenshotDir: shotDir(),
    });

    expect(result.status).toBe('blocked');
    expect(result.error).toContain('outside the allowed origins');
    expect(result.handoff).toContain('not an allowed origin');
    // Nothing was fetched, launched, screenshotted or sent to Jev.
    expect(env.gotos).toEqual([]);
    expect(env.launches).toBe(0);
    expect(env.shots).toEqual([]);
  });

  it('blocks a start url outside a config allow-list', async () => {
    const projectRoot = projectWith({ allowDomains: ['allowed.test'] });
    const env = makeEnv();
    const { client } = stubClient([]);

    const result = await runBrowse({
      goal: 'read the page',
      url: 'https://example.com/',
      projectRoot,
      client,
      playwright: makePlaywright(env),
      screenshotDir: shotDir(),
    });

    expect(result.status).toBe('blocked');
    expect(env.launches).toBe(0);
  });
});

describe('runBrowse — link targets', () => {
  /** The option keys Jev was offered on the first step. */
  async function offered(elements: FakeElement[], extra: Partial<BrowseOptions> = {}): Promise<string[]> {
    const handle = run(makeEnv({ elements }), [{ choice: 'BLOCKED', confidence: 0.9 }], extra);
    await handle.promise;
    return Object.keys(
      (handle.asked[0].questions.next as { criteria: Record<string, unknown> }).criteria,
    );
  }

  const NON_WEB: FakeElement[] = [
    { i: 0, role: 'link', name: 'Run it', kind: 'clickable', href: 'javascript:void(0)' },
    { i: 1, role: 'link', name: 'Contact us', kind: 'clickable', href: 'mailto:hi@example.com' },
    { i: 2, role: 'link', name: 'Download', kind: 'clickable', href: 'data:text/html,<h1>hi</h1>' },
    { i: 3, role: 'link', name: 'Help', kind: 'clickable', href: '/help' },
  ];

  it('never offers a javascript:, mailto: or data: target', async () => {
    expect(await offered(NON_WEB)).toEqual(expect.arrayContaining(['a3']));
    expect(await offered(NON_WEB)).not.toEqual(expect.arrayContaining(['a0', 'a1', 'a2']));
  });

  it('keeps refusing non-web targets even with --allow-sensitive', async () => {
    const keys = await offered(NON_WEB, { allowSensitive: true });
    expect(keys).toContain('a3');
    for (const key of ['a0', 'a1', 'a2']) expect(keys).not.toContain(key);
  });

  // A harmless label can hide a destructive GET: the target decides what a click does.
  it('excludes an innocuous label whose href path is sensitive', async () => {
    const elements: FakeElement[] = [
      { i: 0, role: 'link', name: 'Manage', kind: 'clickable', href: '/account/subscription/cancel?confirm=1' },
      { i: 1, role: 'link', name: 'Preferences', kind: 'clickable', href: '/settings/unsubscribe' },
      { i: 2, role: 'link', name: 'Overview', kind: 'clickable', href: '/account/overview' },
    ];

    expect(await offered(elements)).toEqual(expect.arrayContaining(['a2']));
    const guarded = await offered(elements);
    expect(guarded).not.toContain('a0');
    expect(guarded).not.toContain('a1');

    const opened = await offered(elements, { allowSensitive: true });
    expect(opened).toContain('a0');
    expect(opened).toContain('a1');
  });
});

describe('runBrowse — the page changing under the choice', () => {
  it('skips the click when the element at the ref is no longer the one Jev chose', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [
      {
        choice: 'a0',
        confidence: 0.95,
        // A lazily loaded row lands while the Jev round trip is in flight: ref 0 is now
        // a different control. Acting on the ordinal would click "Delete account".
        mutate: (e) => {
          e.elements = [{ i: 0, role: 'button', name: 'Delete account', kind: 'clickable' }];
        },
      },
      { choice: 'BLOCKED', confidence: 0.9 },
    ]);
    const result = await promise;

    expect(env.clicks).toEqual([]);
    expect(result.steps[0].executed).toBe(false);
    expect(result.steps[0].reason).toContain('changed after it was chosen');
    expect(result.steps[0].reason).toContain('Delete account');
    expect(result.status).toBe('blocked');
  });

  it('skips the click when the chosen element has gone away entirely', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const { promise } = run(env, [
      { choice: 'a0', confidence: 0.95, mutate: (e) => { e.elements = []; } },
      { choice: 'BLOCKED', confidence: 0.9 },
    ]);
    const result = await promise;

    expect(env.clicks).toEqual([]);
    expect(result.steps[0].reason).toContain('no longer on the page');
  });

  it('still clicks when the element at the ref is unchanged', async () => {
    const HELP: FakeElement = { i: 0, role: 'link', name: 'Help', kind: 'clickable', href: '/help' };
    const env = makeEnv({
      elements: [HELP, { ...MORE_INFO, i: 1 }],
      onClick: (_i, e) => {
        e.url = 'https://example.com/more';
      },
    });
    const { promise } = run(env, [
      {
        choice: 'a0',
        confidence: 0.95,
        // The list grows, but ref 0 is still the same control — the loop must not refuse.
        mutate: (e) => {
          e.elements = [
            HELP,
            { ...MORE_INFO, i: 1 },
            { i: 2, role: 'link', name: 'Extra', kind: 'clickable', href: '/extra' },
          ];
        },
      },
      { choice: 'DONE', confidence: 0.95, goal: 0.95 },
    ]);
    const result = await promise;

    expect(env.clicks).toEqual([0]);
    expect(result.steps[0].executed).toBe(true);
    expect(result.status).toBe('done');
  });
});

describe('runBrowse — refusals', () => {
  it('returns an error result when Jev is unavailable', async () => {
    // Force the "off" path: no client injected, Jev disabled for this process, empty root.
    vi.stubEnv('SPECWEAVE_JEV', '0');
    try {
      const result = await runBrowse({
        goal: 'anything',
        url: 'https://example.com/',
        projectRoot: shotDir(),
      });
      expect(result.status).toBe('error');
      expect(result.error).toBe('jev unavailable');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('requires a goal and a browsable url', async () => {
    const { client } = stubClient([]);
    expect((await runBrowse({ goal: '  ', url: 'https://example.com/', client })).error).toContain('goal');
    expect((await runBrowse({ goal: 'g', client })).error).toContain('url');
    expect((await runBrowse({ goal: 'g', url: 'not-a-url', client })).error).toContain('browsable');
  });

  it('returns an error result (never throws) when chromium cannot launch', async () => {
    const result = await runBrowse({
      goal: 'g',
      url: 'https://example.com/',
      client: stubClient([]).client,
      playwright: {
        chromium: {
          launch: async () => {
            throw new Error("Executable doesn't exist");
          },
        },
      },
      screenshotDir: shotDir(),
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('could not launch headless chromium');
    expect(result.error).toContain('npx playwright install chromium');
  });

  it('reports an error result when the Jev call fails mid-loop', async () => {
    const env = makeEnv({ elements: [MORE_INFO] });
    const client = {
      ask: async () => {
        throw new Error('rate_limit: too many requests');
      },
    } as unknown as JevClient;
    const result = await runBrowse({
      goal: 'g',
      url: 'https://example.com/',
      client,
      playwright: makePlaywright(env),
      screenshotDir: shotDir(),
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('rate_limit');
    expect(env.browserClosed).toBe(true);
  });
});
