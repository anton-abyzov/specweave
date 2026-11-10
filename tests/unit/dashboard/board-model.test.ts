import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  aggregate,
  buildView,
  facets,
  readFilters,
  relativeTime,
  shortId,
  writeFilters,
} from '../../../src/dashboard/client/src/pages/work/board-model.js';
import type { WorkItem, WorkState } from '../../../src/dashboard/work-types.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW - days * 86400000).toISOString();
function item(id: string, state: WorkState, patch: Partial<WorkItem> = {}): WorkItem {
  return {
    id: `increment:${id}`,
    title: `Item ${id}`,
    summary: '',
    state,
    incrementId: id,
    incrementStatus: 'active',
    source: 'increment',
    revision: 0,
    updatedAt: daysAgo(1),
    tasks: { total: 4, done: 2, skipped: 0, claimed: 0, blocked: 0, stale: 0, open: 2 },
    acs: { total: 2, done: 1 },
    verification: { status: 'missing', ranAt: null },
    evidenceCount: 0,
    handoff: null,
    executions: [],
    type: 'feature',
    priority: 'P1',
    project: 'demo',
    createdAt: daysAgo(3),
    path: `.specweave/increments/${id}`,
    stateReason: '',
    ...patch,
  };
}
const by = (actor: string) => ({
  id: actor, sessionId: null, harness: null, model: null, effort: null, provider: null, surface: null,
  actor, startedAt: daysAgo(1), source: 'ledger' as const, note: '',
});
const ITEMS = [
  item('0001-login', 'active', { title: 'Login form', executions: [by('codex@a')], updatedAt: daysAgo(2) }),
  item('0002-billing', 'blocked', { stateReason: '2 stale claims', executions: [by('claude@b')], priority: 'P2' }),
  item('0003-search', 'done', { verification: { status: 'passed', ranAt: daysAgo(3) }, updatedAt: daysAgo(3), tasks: { total: 2, done: 2, skipped: 0, claimed: 0, blocked: 0, stale: 0, open: 0 }, type: 'bug' }),
  item('0004-old', 'done', { updatedAt: daysAgo(40) }),
];
const ids = (view: { items: WorkItem[] }) => view.items.map((i) => shortId(i));

describe('work board model', () => {
  it('hides done work outside the window and keeps everything with the window off', () => {
    expect(ids(buildView(ITEMS, DEFAULT_FILTERS, NOW))).toEqual(['0002', '0001', '0003']);
    expect(buildView(ITEMS, { ...DEFAULT_FILTERS, doneDays: 0 }, NOW).items).toHaveLength(4);
  });
  it('filters by text, agent, verification, type, priority and state', () => {
    const view = (patch: object) => ids(buildView(ITEMS, { ...DEFAULT_FILTERS, doneDays: 0, ...patch }, NOW));
    expect(view({ query: 'login' })).toEqual(['0001']);
    expect(view({ query: 'stale claims' })).toEqual(['0002']);
    expect(view({ query: '0003' })).toEqual(['0003']);
    expect(view({ agent: 'claude' })).toEqual(['0002']);
    expect(view({ verification: 'passed' })).toEqual(['0003']);
    expect(view({ type: 'bug' })).toEqual(['0003']);
    expect(view({ priority: 'P2' })).toEqual(['0002']);
    expect(view({ states: ['active', 'blocked'] })).toEqual(['0002', '0001']);
  });
  it('counts every number from the one filtered set', () => {
    const view = buildView(ITEMS, { ...DEFAULT_FILTERS, states: ['blocked'] }, NOW);
    expect(view.shownStates).toEqual(['blocked']);
    expect(view.items).toHaveLength(1);
    expect(view.columns.blocked).toHaveLength(1);
    expect(view.columns.active).toHaveLength(0);
    // The chips still say how many each state would show.
    expect(view.stateCounts).toEqual({ backlog: 0, active: 1, blocked: 1, review: 0, done: 1 });
    const all = buildView(ITEMS, DEFAULT_FILTERS, NOW);
    expect(Object.values(all.columns).flat()).toHaveLength(all.items.length);
    expect(aggregate(all.items)).toMatchObject({ items: 3, tasks: 10, tasksDone: 6, acs: 6, acsDone: 3, increments: 3, verified: 1 });
  });
  it('counts an increment once when several intents link it', () => {
    const twice = [ITEMS[0], { ...ITEMS[0], id: 'intent-1', source: 'intent' as const }];
    expect(aggregate(twice)).toMatchObject({ items: 2, increments: 1, tasks: 4 });
  });
  it('sorts by ID, progress and title in both directions', () => {
    const view = (patch: object) => ids(buildView(ITEMS, { ...DEFAULT_FILTERS, doneDays: 0, ...patch }, NOW));
    expect(view({ sort: 'id', ascending: true })).toEqual(['0001', '0002', '0003', '0004']);
    expect(view({ sort: 'id' })).toEqual(['0004', '0003', '0002', '0001']);
    const loose = item('x', 'backlog', { id: 'zz-intent', incrementId: null });
    for (const ascending of [true, false])
      expect(buildView([loose, ...ITEMS], { ...DEFAULT_FILTERS, doneDays: 0, sort: 'id', ascending }, NOW).items.at(-1)).toBe(loose);
    expect(view({ sort: 'progress' })[0]).toBe('0003');
    expect(view({ sort: 'title' })[0]).toBe('0002');
  });
  it('round-trips filters through the address and drops defaults', () => {
    const params = writeFilters(new URLSearchParams('project=p&item=0001'), {
      query: 'log in', states: ['blocked', 'review'], agent: 'codex', doneDays: 0, sort: 'progress', ascending: true,
    });
    expect(params.get('project')).toBe('p');
    expect(params.get('item')).toBe('0001');
    expect(readFilters(params)).toEqual({
      ...DEFAULT_FILTERS, query: 'log in', states: ['blocked', 'review'], agent: 'codex', doneDays: 0, sort: 'progress', ascending: true,
    });
    expect(activeFilterCount(readFilters(params))).toBe(4);
    const cleared = writeFilters(params, DEFAULT_FILTERS);
    expect(cleared.toString()).toBe('project=p&item=0001');
    expect(readFilters(new URLSearchParams('state=nope&sort=bad&done=-3'))).toEqual(DEFAULT_FILTERS);
  });
  it('lists the agents, types and priorities present', () => {
    expect(facets(ITEMS)).toEqual({ agents: ['claude', 'codex'], types: ['bug', 'feature'], priorities: ['P1', 'P2'] });
  });
  it('writes short relative times', () => {
    expect(relativeTime(new Date(NOW - 5 * 60000).toISOString(), NOW)).toBe('5m ago');
    expect(relativeTime(daysAgo(2), NOW)).toBe('2d ago');
    expect(relativeTime('', NOW)).toBe('Unknown');
  });
});
