/**
 * Branch-keyed cards — the checklist for work that has no increment.
 *
 * `.specweave/cards/<branch-slug>.jsonl` uses the ledger line format with ids
 * `C-01`, `C-02`, … A card is declared by a `note` event carrying its `line`
 * (`specweave card add`), then moves with `claim` / `done` / `block` like a
 * task. The branch is the one key every tool shares, so no increment number
 * is spent on spec-less work (0933 D-01).
 *
 * @module core/tasks/branch-cards
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { appendEvent, readLedger, type LedgerEvent } from './ledger.js';
import { foldCards, type Card, type CardFoldOptions } from './cards.js';

export const CARDS_DIR = path.join('.specweave', 'cards');

/** Current branch name, or undefined (detached HEAD, not a Git checkout). */
export function currentBranch(cwd: string): string | undefined {
  try {
    // symbolic-ref also names an unborn branch (a repository with no commit yet).
    const b = execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).trim();
    return b && b !== 'HEAD' ? b : undefined;
  } catch {
    return undefined;
  }
}

/** `inc/0933-cards` → `inc-0933-cards`; anything outside [a-z0-9._-] becomes `-`. */
export function branchSlug(branch: string | undefined): string {
  const slug = (branch ?? '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '');
  return slug || 'no-branch';
}

export function branchCardsPath(projectRoot: string, branch: string | undefined): string {
  return path.join(projectRoot, CARDS_DIR, `${branchSlug(branch)}.jsonl`);
}

export function readBranchEvents(file: string): LedgerEvent[] {
  return readLedger(file).events;
}

/** Ids already used in the file (`C-01` …), in first-appearance order. */
export function branchCardIds(file: string): string[] {
  const ids: string[] = [];
  for (const e of readBranchEvents(file)) if (/^C-\d+$/.test(e.t) && !ids.includes(e.t)) ids.push(e.t);
  return ids;
}

/** Next free id: one more than the highest `C-NN`, zero-padded to two digits. */
export function nextBranchCardId(file: string): string {
  const max = branchCardIds(file).reduce((m, id) => Math.max(m, parseInt(id.slice(2), 10)), 0);
  return `C-${String(max + 1).padStart(2, '0')}`;
}

/** Normalize `1`, `c1`, `C-1` → `C-01`. */
export function normalizeCardId(input: string): string | undefined {
  const m = input.trim().match(/^C?-?(\d+)$/i);
  return m ? `C-${String(parseInt(m[1], 10)).padStart(2, '0')}` : undefined;
}

/** Declare a new card; returns its id. */
export function addBranchCard(file: string, line: string, by: string, at = new Date().toISOString()): string {
  const id = nextBranchCardId(file);
  appendBranchEvent(file, { t: id, e: 'note', by, at, line });
  return id;
}

/** Append one event; no increment bookkeeping (there is no increment). */
export function appendBranchEvent(file: string, event: LedgerEvent): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendEvent(file, event);
}

export function branchCards(file: string, opts: CardFoldOptions = {}): Card[] {
  return foldCards([], readBranchEvents(file), opts);
}
