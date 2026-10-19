/**
 * Task cards — a readable checklist folded from the ledger.
 *
 * A card is one line per task in the right tense with a link to the PR,
 * report or artifact behind it. Nothing new is stored: the ledger events
 * may carry `line` and `link` (see core/tasks/ledger.ts), and the fold
 * fills the gaps — the line falls back to the task title, the link to the
 * first PR URL, `log: <path>` or `HEAD <sha>` found in the done evidence.
 *
 * The fold is shared with SpecWithCode through
 * tests/fixtures/cards/fold-fixture.json; change both together.
 *
 * @module core/tasks/cards
 */

import { execFileSync } from 'child_process';
import { loadTaskBoard } from './task-board.js';
import { foldLedger, readLedger, ledgerPath, type FoldOptions, type LedgerEvent, type TaskLedgerState, type TaskLedgerStatus } from './ledger.js';

export type CardState = 'todo' | 'doing' | 'waiting' | 'done' | 'skipped';

export interface Card {
  id: string;
  state: CardState;
  line: string;
  link: string | null;
}

export interface CardTaskDef {
  id: string;
  title: string;
  /** Pre-folded state (the task board adds the tasks.md fallback); default: the ledger fold. */
  state?: TaskLedgerState;
}

export interface CardFoldOptions extends FoldOptions {
  /** `remote.origin.url`; a github.com origin turns `HEAD <sha>` into a commit URL. */
  origin?: string;
}

const STATE_OF: Record<TaskLedgerStatus, CardState> = {
  open: 'todo',
  claimed: 'doing',
  stale: 'doing',
  blocked: 'waiting',
  done: 'done',
  skipped: 'skipped',
};

export const CARD_MARKS: Record<CardState, string> = {
  done: '✓',
  doing: '✱',
  todo: '○',
  waiting: '⏸',
  skipped: '–',
};

/** Ledger task status → card state. */
export function cardState(status: TaskLedgerStatus | undefined): CardState {
  return STATE_OF[status ?? 'open'] ?? 'todo';
}

/** `https://github.com/<owner>/<repo>` for a github.com origin URL, else undefined. */
export function githubRepoUrl(origin: string | undefined): string | undefined {
  const o = origin?.trim();
  if (!o) return undefined;
  const m = o.match(/^(?:https?:\/\/(?:[^@/]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return m ? `https://github.com/${m[1]}/${m[2]}` : undefined;
}

/**
 * A link derived from `done` evidence, in this order:
 * 1. the first GitHub PR URL (`https://github.com/o/r/pull/N`);
 * 2. a `log: <path>` token, as a path relative to the increment directory
 *    (a `.specweave/increments/<id>/` prefix is stripped);
 * 3. `HEAD <sha>`: a commit URL when the origin is on github.com, else the sha.
 */
export function deriveLink(evidence: string | undefined, opts: { origin?: string } = {}): string | null {
  if (!evidence) return null;
  const pr = evidence.match(/https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/);
  if (pr) return pr[0];
  const log = evidence.match(/(?:^|\s)log:\s*(\S+)/);
  if (log) return incrementRelative(log[1]);
  const head = evidence.match(/\bHEAD ([0-9a-f]{7,40})\b/);
  if (head) {
    const repo = githubRepoUrl(opts.origin);
    return repo ? `${repo}/commit/${head[1]}` : head[1];
  }
  return null;
}

function incrementRelative(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const m = norm.match(/(?:^|\/)\.specweave\/increments\/[^/]+\/(.+)$/);
  return m ? m[1] : norm.replace(/^\.\//, '');
}

/**
 * Fold ledger events and task definitions into cards: spec tasks first, in
 * their order, then ids that only the ledger knows (branch cards `C-NN`) in
 * the order they first appear.
 */
export function foldCards(tasks: CardTaskDef[], events: LedgerEvent[], opts: CardFoldOptions = {}): Card[] {
  const fold = foldLedger(events, opts);
  const defs = new Map(tasks.map((t) => [t.id, t]));
  const ids = [...tasks.map((t) => t.id), ...[...fold.cards.keys(), ...fold.tasks.keys()].filter((id) => !defs.has(id))];
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const def = defs.get(id);
    const state = def?.state ?? fold.tasks.get(id);
    const meta = fold.cards.get(id) ?? {};
    const line = meta.line ?? def?.title ?? id;
    const link = meta.link ?? (state?.status === 'done' ? deriveLink(state.evidence, opts) : null);
    cards.push({ id, state: cardState(state?.status), line, link });
  }
  return cards;
}

/** Cards for an increment: its task board (spec.md or tasks.md) joined with ledger.jsonl. */
export function incrementCards(incrementDir: string, opts: CardFoldOptions = {}): Card[] {
  const board = loadTaskBoard(incrementDir, opts);
  const { events } = readLedger(ledgerPath(incrementDir));
  return foldCards(board.tasks.map((t) => ({ id: t.id, title: t.title, state: t.state })), events, opts);
}

/** Header line, blank line, then `<mark> <text>[ (link)]` per card. */
export function renderChecklist(cards: Card[], header: string): string {
  const rows = cards.map((c) => `${CARD_MARKS[c.state]} ${c.line}${c.link ? ` (${c.link})` : ''}`);
  return [header, '', ...rows].join('\n');
}

/** `remote.origin.url` of the repository at `cwd`, if any. */
export function readOriginUrl(cwd: string): string | undefined {
  try {
    return execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).trim() || undefined;
  } catch {
    return undefined;
  }
}
