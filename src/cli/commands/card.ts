/**
 * CLI: `specweave card <action>` and `specweave cards [inc] --md` — the card
 * checklist folded from the ledger.
 *
 *   card add "<text>"                      new card C-NN in .specweave/cards/<branch>.jsonl
 *   card start <id> [inc] [--line]         claim   (T-NN → `task claim`)
 *   card done <id> [inc] [--line] [--link] done    (T-NN → `task done`)
 *   card wait <id> [inc] [--line]          block   (T-NN → `task block`)
 *   card list [inc]                        `task list` for an increment, else the branch checklist
 *   cards [inc] --md                       header, blank line, one `✓ / ✱ / ○ text (link)` per card
 *
 * T-NN ids are thin aliases of `specweave task`; C-NN ids live in the
 * branch-keyed store for work without an increment (0933 D-01).
 *
 * @module cli/commands/card
 */

import { execFileSync } from 'child_process';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { clampCardLine, getAgentId, type LedgerEvent } from '../../core/tasks/ledger.js';
import { incrementCards, readOriginUrl, renderChecklist, type Card } from '../../core/tasks/cards.js';
import { resolveIncrement, readLeaseHours, IncrementResolutionError, type ResolvedIncrement } from '../../core/tasks/resolve-increment.js';
import { addBranchCard, appendBranchEvent, branchCardIds, branchCards, branchCardsPath, currentBranch, normalizeCardId } from '../../core/tasks/branch-cards.js';
import { readTitle } from '../../core/session/pickup.js';
import { taskCommand, type TaskCommandOptions } from './task.js';

export interface CardCommandOptions extends TaskCommandOptions {
  md?: boolean;
  /** Override the branch (tests). */
  branch?: string;
}

const ACTIONS = ['add', 'start', 'done', 'wait', 'list'] as const;
const TASK_ACTION: Record<string, string> = { start: 'claim', done: 'done', wait: 'block' };

/** Entry point. Returns the process exit code. */
export async function cardCommand(action: string, a?: string, b?: string, opts: CardCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  if (!(ACTIONS as readonly string[]).includes(action)) {
    err(`Unknown card action "${action}". Actions: ${ACTIONS.join(', ')}`);
    return 2;
  }
  const cwd = opts.cwd ?? process.cwd();
  const projectRoot = resolveEffectiveRoot(cwd);
  const agent = opts.agent ?? getAgentId();
  const branch = opts.branch ?? currentBranch(projectRoot);
  const file = branchCardsPath(projectRoot, branch);

  if (action === 'add') {
    const text = [a, b].filter(Boolean).join(' ').trim() || opts.line?.trim();
    if (!text) { err('Usage: specweave card add "<text>"'); return 2; }
    const { line, truncated } = clampCardLine(text);
    if (truncated) err(`warning: card text is longer than 100 characters; stored as "${line}"`);
    const id = addBranchCard(file, line, agent);
    out(`Added ${id} on ${branch ?? 'no branch'}: ${line}`);
    return 0;
  }

  if (action === 'list') {
    const inc = boundIncrement(projectRoot, a, err);
    if (inc === null) return 1;
    if (inc) return taskCommand('list', inc.id, undefined, opts);
    out(renderChecklist(branchCards(file, cardOpts(projectRoot)), branchHeader(branch)));
    return 0;
  }

  if (!a) { err(`Usage: specweave card ${action} <T-NN | C-NN> [increment]`); return 2; }
  const cardId = /^c-?\d+$/i.test(a.trim()) ? normalizeCardId(a) : undefined;
  if (!cardId) {
    const taskOpts: TaskCommandOptions = { ...opts };
    if (action === 'wait' && !taskOpts.reason && !taskOpts.note) taskOpts.reason = opts.line ?? 'waiting';
    return taskCommand(TASK_ACTION[action], a, b, taskOpts);
  }

  if (!branchCardIds(file).includes(cardId)) {
    err(`Card ${cardId} not found in ${rel(projectRoot, file)}. Add one with \`specweave card add "<text>"\`.`);
    return 1;
  }
  const event: LedgerEvent = { t: cardId, e: 'claim', by: agent, at: new Date().toISOString() };
  if (opts.line?.trim()) {
    const { line, truncated } = clampCardLine(opts.line);
    if (truncated) err(`warning: --line is longer than 100 characters; stored as "${line}"`);
    event.line = line;
  }
  if (opts.link?.trim()) event.link = opts.link.trim();
  if (action === 'done') {
    event.e = 'done';
    const sha = headSha(projectRoot);
    event.evidence = [opts.evidence?.trim(), opts.link?.trim(), sha ? `HEAD ${sha}` : undefined].filter(Boolean).join('\n') || 'card done';
  } else if (action === 'wait') {
    event.e = 'block';
    event.note = (opts.reason ?? opts.note ?? opts.line ?? 'waiting').trim();
  }
  appendBranchEvent(file, event);
  const card = branchCards(file, cardOpts(projectRoot)).find((c) => c.id === cardId);
  const wanted = { start: 'doing', done: 'done', wait: 'waiting' }[action as 'start' | 'done' | 'wait'];
  if (card?.state !== wanted) {
    err(`${cardId} is ${card?.state ?? 'unknown'}: another agent holds it, or it is already finished`);
    return 3;
  }
  out(`${cardId} ${card.state}: ${card.line}${card.link ? ` (${card.link})` : ''}`);
  return 0;
}

/** `specweave cards [inc] [--md|--json]`. */
export async function cardsCommand(incrementId?: string, opts: CardCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const projectRoot = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const inc = boundIncrement(projectRoot, incrementId, err);
  if (inc === null) return 1;
  let header: string;
  let cards: Card[];
  if (inc) {
    const title = readTitle(inc.dir);
    header = `${inc.id}${title ? ` ${title}` : ''}`;
    cards = incrementCards(inc.dir, { ...cardOpts(projectRoot), leaseHours: readLeaseHours(projectRoot) });
  } else {
    const branch = opts.branch ?? currentBranch(projectRoot);
    header = branchHeader(branch);
    cards = branchCards(branchCardsPath(projectRoot, branch), cardOpts(projectRoot));
  }
  out(opts.json ? JSON.stringify({ increment: inc?.id ?? null, header, cards }, null, 2) : renderChecklist(cards, header));
  return 0;
}

/**
 * The increment cards bind to: the named one, else the single active one.
 * `undefined` when none is open (branch-keyed cards), `null` on an error
 * already printed (unknown id, several active).
 */
function boundIncrement(projectRoot: string, id: string | undefined, err: (s: string) => void): ResolvedIncrement | undefined | null {
  try {
    return resolveIncrement(projectRoot, id);
  } catch (e) {
    if (!(e instanceof IncrementResolutionError)) throw e;
    if (!id && e.candidates.length === 0) return undefined;
    err(e.message);
    return null;
  }
}

function branchHeader(branch: string | undefined): string {
  return `Cards on ${branch ?? 'no branch'}`;
}

function cardOpts(projectRoot: string) {
  return { origin: readOriginUrl(projectRoot) };
}

function rel(root: string, p: string): string {
  return p.startsWith(root) ? p.slice(root.length + 1) : p;
}

function headSha(cwd: string): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
