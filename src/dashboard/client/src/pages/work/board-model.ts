/** Pure board logic: what is visible, in which order, and what the numbers on screen add up to. */
import { WORK_STATES, type WorkItem, type WorkState } from '../../../../work-types';

export const SORTS = ['updated', 'id', 'progress', 'title'] as const;
export type BoardSort = (typeof SORTS)[number];
export const VERIFICATIONS = ['passed', 'failed', 'stale', 'missing'] as const;

export interface BoardFilters {
  query: string;
  /** Empty means every state. */
  states: WorkState[];
  agent: string;
  verification: string;
  type: string;
  priority: string;
  /** Done items older than this many days are hidden; 0 keeps them all. */
  doneDays: number;
  sort: BoardSort;
  ascending: boolean;
}

export const DEFAULT_FILTERS: BoardFilters = {
  query: '',
  states: [],
  agent: 'all',
  verification: 'all',
  type: 'all',
  priority: 'all',
  doneDays: 14,
  sort: 'updated',
  ascending: false,
};

/** Cards a column renders before "Show more". */
export const COLUMN_PAGE = 40;

const TOOL_NAMES: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  opencode: 'OpenCode',
  copilot: 'Copilot',
  gemini: 'Gemini',
  grok: 'Grok',
  user: 'You',
};

/** `claude@ministorm` → `claude`. */
export function toolOf(actor: string): string {
  return actor.split('@')[0].trim().toLowerCase();
}
export function toolName(tool: string): string {
  return TOOL_NAMES[tool] ?? (tool ? tool.charAt(0).toUpperCase() + tool.slice(1) : 'Unknown');
}
/** Tools that worked on an item, most recent first. */
export function itemTools(item: WorkItem): string[] {
  const tools: string[] = [];
  for (let i = item.executions.length - 1; i >= 0; i--) {
    const tool = toolOf(item.executions[i].actor);
    if (tool && !tools.includes(tool)) tools.push(tool);
  }
  return tools;
}

/** `1150` for an increment, `Intent` for work with no increment. */
export function shortId(item: Pick<WorkItem, 'incrementId'>): string {
  return item.incrementId ? item.incrementId.split('-')[0] : 'Intent';
}

/** Share of tasks that need no more work (done or skipped), 0 to 1. */
export function progressOf(item: Pick<WorkItem, 'tasks'>): number {
  return item.tasks.total > 0 ? (item.tasks.done + item.tasks.skipped) / item.tasks.total : 0;
}
export function percent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

function matches(item: WorkItem, filters: BoardFilters, now: number): boolean {
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) {
    const text = `${item.title} ${item.summary} ${item.incrementId ?? ''} ${item.stateReason}`.toLowerCase();
    if (!words.every((word) => text.includes(word))) return false;
  }
  if (filters.agent !== 'all' && !item.executions.some((s) => toolOf(s.actor) === filters.agent)) return false;
  if (filters.verification !== 'all' && item.verification.status !== filters.verification) return false;
  if (filters.type !== 'all' && (item.type ?? 'none') !== filters.type) return false;
  if (filters.priority !== 'all' && (item.priority ?? 'none') !== filters.priority) return false;
  if (item.state === 'done' && filters.doneDays > 0) {
    const updated = Date.parse(item.updatedAt);
    if (Number.isFinite(updated) && updated < now - filters.doneDays * 86400000) return false;
  }
  return true;
}

const compare: Record<BoardSort, (a: WorkItem, b: WorkItem) => number> = {
  updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  id: (a, b) =>
    (a.incrementId ?? a.id).localeCompare(b.incrementId ?? b.id, undefined, { numeric: true }),
  progress: (a, b) => progressOf(a) - progressOf(b) || a.tasks.total - b.tasks.total,
  title: (a, b) => b.title.localeCompare(a.title),
};

export function sortItems(items: WorkItem[], sort: BoardSort, ascending: boolean): WorkItem[] {
  const by = compare[sort] ?? compare.updated;
  return [...items].sort((a, b) => {
    // Work with no increment has no number: it follows the numbered items in either direction.
    if (sort === 'id' && Boolean(a.incrementId) !== Boolean(b.incrementId)) return a.incrementId ? -1 : 1;
    return (ascending ? by(a, b) : by(b, a)) || a.id.localeCompare(b.id);
  });
}

export interface BoardView {
  /** Everything that passes the filters, sorted: the one set every number on the page is counted from. */
  items: WorkItem[];
  columns: Record<WorkState, WorkItem[]>;
  /** Per-state counts with the state filter ignored, for the state chips. */
  stateCounts: Record<WorkState, number>;
  /** Columns on screen: the selected states, or all of them. */
  shownStates: WorkState[];
}

export function buildView(all: WorkItem[], filters: BoardFilters, now = Date.now()): BoardView {
  const passing = all.filter((item) => matches(item, filters, now));
  const stateCounts = Object.fromEntries(
    WORK_STATES.map((state) => [state, passing.filter((item) => item.state === state).length]),
  ) as Record<WorkState, number>;
  const shownStates = filters.states.length
    ? WORK_STATES.filter((state) => filters.states.includes(state))
    : [...WORK_STATES];
  const items = sortItems(
    passing.filter((item) => shownStates.includes(item.state)),
    filters.sort,
    filters.ascending,
  );
  const columns = Object.fromEntries(
    WORK_STATES.map((state) => [state, items.filter((item) => item.state === state)]),
  ) as Record<WorkState, WorkItem[]>;
  return { items, columns, stateCounts, shownStates };
}

export interface Aggregate {
  items: number;
  tasks: number;
  tasksDone: number;
  acs: number;
  acsDone: number;
  /** Distinct increments, and how many of them have a passing, current verify report. */
  increments: number;
  verified: number;
  /** Tasks done or skipped over all tasks, 0 to 1. */
  progress: number;
}

/** Several intents may link one increment; its tasks count once. */
export function aggregate(items: WorkItem[]): Aggregate {
  const seen = new Set<string>();
  const total = { items: items.length, tasks: 0, tasksDone: 0, acs: 0, acsDone: 0, increments: 0, verified: 0 };
  let closed = 0;
  for (const item of items) {
    if (!item.incrementId || seen.has(item.incrementId)) continue;
    seen.add(item.incrementId);
    total.increments++;
    total.tasks += item.tasks.total;
    total.tasksDone += item.tasks.done;
    closed += item.tasks.done + item.tasks.skipped;
    total.acs += item.acs.total;
    total.acsDone += item.acs.done;
    if (item.verification.status === 'passed') total.verified++;
  }
  return { ...total, progress: total.tasks > 0 ? closed / total.tasks : 0 };
}

export interface Facets {
  agents: string[];
  types: string[];
  priorities: string[];
}
export function facets(items: WorkItem[]): Facets {
  const unique = (values: Array<string | null>) => [...new Set(values.filter(Boolean) as string[])].sort();
  return {
    agents: unique(items.flatMap((item) => item.executions.map((s) => toolOf(s.actor)))),
    types: unique(items.map((item) => item.type)),
    priorities: unique(items.map((item) => item.priority)),
  };
}

/** How many filters differ from the defaults (the done window counts). */
export function activeFilterCount(filters: BoardFilters): number {
  return [
    filters.query.trim() !== '',
    filters.states.length > 0,
    filters.agent !== 'all',
    filters.verification !== 'all',
    filters.type !== 'all',
    filters.priority !== 'all',
    filters.doneDays !== DEFAULT_FILTERS.doneDays,
  ].filter(Boolean).length;
}

const PARAMS = { query: 'q', states: 'state', agent: 'tool', verification: 'verify', type: 'type', priority: 'prio', doneDays: 'done', sort: 'sort', ascending: 'dir' } as const;

/** Filters from the address; anything unreadable falls back to its default. */
export function readFilters(params: URLSearchParams): BoardFilters {
  const done = params.get(PARAMS.doneDays);
  const sort = params.get(PARAMS.sort) as BoardSort | null;
  return {
    query: params.get(PARAMS.query) ?? '',
    states: (params.get(PARAMS.states) ?? '')
      .split(',')
      .filter((s): s is WorkState => WORK_STATES.includes(s as WorkState)),
    agent: params.get(PARAMS.agent) || 'all',
    verification: params.get(PARAMS.verification) || 'all',
    type: params.get(PARAMS.type) || 'all',
    priority: params.get(PARAMS.priority) || 'all',
    doneDays: done === 'all' ? 0 : Number(done) > 0 ? Number(done) : DEFAULT_FILTERS.doneDays,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    ascending: params.get(PARAMS.ascending) === 'asc',
  };
}

/** Writes a change into the address, dropping every value that equals its default. */
export function writeFilters(params: URLSearchParams, patch: Partial<BoardFilters>): URLSearchParams {
  const next = new URLSearchParams(params);
  const merged = { ...readFilters(params), ...patch };
  const put = (key: string, value: string, fallback: string) =>
    value && value !== fallback ? next.set(key, value) : next.delete(key);
  put(PARAMS.query, merged.query, '');
  put(PARAMS.states, merged.states.join(','), '');
  put(PARAMS.agent, merged.agent, 'all');
  put(PARAMS.verification, merged.verification, 'all');
  put(PARAMS.type, merged.type, 'all');
  put(PARAMS.priority, merged.priority, 'all');
  put(PARAMS.doneDays, merged.doneDays === 0 ? 'all' : String(merged.doneDays), String(DEFAULT_FILTERS.doneDays));
  put(PARAMS.sort, merged.sort, DEFAULT_FILTERS.sort);
  put(PARAMS.ascending, merged.ascending ? 'asc' : '', '');
  return next;
}

/** `3m ago`, `5h ago`, `2d ago`, then a date. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at)) return 'Unknown';
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 30) return `${Math.round(minutes / (60 * 24))}d ago`;
  return new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
