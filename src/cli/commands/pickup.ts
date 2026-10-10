/**
 * CLI Commands: pickup, note
 *
 *   specweave pickup [id | increment | title words] [--json]
 *   specweave pickup --all [--json]
 *   specweave pickup --list [--json]      (same as `specweave handoff list`)
 *   specweave note "<text>" [incrementId]
 *
 * `pickup` is the one read a fresh session needs, in any tool on any account.
 * When several handoffs are pending (several sessions handed off in one
 * project), it takes the one named, or the newest, and lists the others.
 * `note` leaves a message on an increment for whoever works on it next (another
 * thread, another tool); `pickup` shows the latest notes.
 *
 * @module cli/commands/pickup
 */

import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { buildPickup } from '../../core/session/pickup.js';
import { appendEvent, getAgentId, ledgerPath, readIncrementEvents, recordSessionOnce, INCREMENT_EVENT_TASK } from '../../core/tasks/ledger.js';
import { resolveIncrement, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { scrubSecrets } from '../../core/session/handoff-secret-scrub.js';
import { applyHandoff, type PickupApplyResult } from '../../core/session/handoff-remote.js';
import { writeHandoffReport } from '../../core/session/handoff-report.js';
import { readLatestIndex, renderPickupAll } from '../../core/session/handoff-all.js';
import {
  listPendingHandoffs, matchHandoff, markSessionPicked, renderChoices, renderHandoffList, handoffLine, handoffWhere,
  type PendingHandoff,
} from '../../core/session/handoff-list.js';

export interface PickupCommandOptions {
  /** What to pick up: a pending handoff's id, an increment, or words from its title. */
  incrementId?: string;
  json?: boolean;
  /** `--no-apply`: only show the handoff, leave the checkout as it is. */
  apply?: boolean;
  /** `--all`: print the newest handoff index, actionable rows first. Read-only. */
  all?: boolean;
  /** `--list`: print the pending handoffs and take none. */
  list?: boolean;
  cwd?: string;
  agent?: string;
  /** Home directory holding `.specweave/checkpoints` (tests). */
  home?: string;
}

export async function pickupCommand(opts: PickupCommandOptions = {}): Promise<number> {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  if (opts.all) {
    const latest = readLatestIndex(root);
    const text = renderPickupAll(root, latest);
    process.stdout.write((opts.json ? JSON.stringify({ ...latest, text }, null, 2) : text) + '\n');
    return 0;
  }
  if (opts.list) return handoffListCommand({ cwd: root, json: opts.json, home: opts.home });
  const agent = opts.agent ?? getAgentId();
  const target = opts.incrementId?.trim() || undefined;
  const dryRun = opts.apply === false;

  // 1. Which handoff: the one named, else (after fetching) the newest.
  let chosen: PendingHandoff | undefined;
  if (target) {
    const match = matchHandoff(listPendingHandoffs(root, { home: opts.home }), target);
    if (match.kind === 'several') {
      const text = [
        `"${target}" matches ${match.candidates.length} pending handoffs; nothing was picked up. Name one:`,
        ...renderChoices(match.candidates),
        'Run `specweave pickup <id>` with one of these ids.',
      ].join('\n');
      process.stdout.write((opts.json ? JSON.stringify({ text, candidates: match.candidates }, null, 2) : text) + '\n');
      return 2;
    }
    if (match.kind === 'one') chosen = match.handoff;
  }

  // 2. Bring in the latest handoff pushed from any tool, machine or account,
  //    unless it belongs to another increment than the one asked for.
  const applied: PickupApplyResult = chosen?.kind === 'session'
    ? { status: 'none', message: '' }
    : applyHandoff(root, { dryRun, ...(target ? { increment: chosen?.incrementId ?? target } : {}) });

  const pending = listPendingHandoffs(root, { home: opts.home });
  if (!target && pending.length) {
    const pushed = applied.status === 'applied' ? applied.meta?.increment : undefined;
    chosen = (pushed && pending.find((h) => h.incrementId === pushed)) || pending[0];
  }
  const others = pending.filter((h) => h.id !== chosen?.id);

  const head: string[] = [];
  if (chosen) {
    const which = !target && others.length ? `the newest of ${pending.length} pending handoffs` : 'handoff';
    head.push(`Picking up ${which}: ${handoffLine(chosen)}`);
  }

  // 3. A session handoff: its work is still in its own checkout on this machine.
  if (chosen?.kind === 'session') {
    head.push(...describeSession(root, chosen));
    if (applied.message) head.push(applied.message);
    let incrementId: string | undefined;
    if (chosen.incrementId) {
      try { incrementId = resolveIncrement(root, chosen.incrementId).id; } catch { /* gone since */ }
    }
    const result = buildPickup(root, { incrementId, agent, checkpointHome: opts.home });
    if (!dryRun) markSessionPicked(chosen, agent);
    const text = [...head, result.text, ...othersBlock(others)].filter(Boolean).join('\n');
    process.stdout.write((opts.json ? JSON.stringify({ ...result, text, picked: chosen, pending: others }, null, 2) : text) + '\n');
    return 0;
  }

  // 4. An increment: describe what is here now.
  let incrementId: string | undefined;
  const wanted = chosen?.incrementId ?? target ?? (applied.status === 'applied' ? applied.meta?.increment : undefined);
  if (wanted) {
    try {
      incrementId = resolveIncrement(root, wanted).id;
    } catch (e) {
      if (!(e instanceof IncrementResolutionError)) throw e;
      if (target) {
        const lines = [`Nothing pending or in this project matches "${target}". ${e.message}`];
        if (pending.length) lines.push('Pending handoffs:', ...renderChoices(pending));
        process.stderr.write(lines.join('\n') + '\n');
        return 1;
      }
    }
  }
  const result = buildPickup(root, { incrementId, agent, checkpointHome: opts.home });
  if (!dryRun && !['dirty', 'diverged', 'failed'].includes(applied.status)) {
    const pushed = applied.status === 'elsewhere' ? undefined : applied.meta?.increment;
    recordPickup(root, chosen?.incrementId ?? pushed ?? result.incrementId, applied, agent);
  }
  const text = [...head, applied.message, result.text, ...othersBlock(others)].filter(Boolean).join('\n');
  process.stdout.write((opts.json ? JSON.stringify({ ...result, text, handoff: applied, ...(chosen ? { picked: chosen } : {}), pending: others }, null, 2) : text) + '\n');
  return applied.status === 'failed' ? 1 : 0;
}

function describeSession(root: string, h: PendingHandoff): string[] {
  const L = [`Continue in ${handoffWhere(root, h)}: its uncommitted edits are still there on this machine.`];
  if (h.docPath) L.push(`Read the handoff first: ${h.docPath}${h.diffPath ? ` (edits: ${h.diffPath})` : ''}`);
  return L;
}

function othersBlock(others: PendingHandoff[]): string[] {
  if (!others.length) return [];
  return [`Also pending (${others.length}), for another session:`, ...renderChoices(others), 'Say "pick up <id>" there, or run `specweave pickup <id>`.'];
}

export interface HandoffListCommandOptions {
  cwd?: string;
  json?: boolean;
  home?: string;
}

/** `specweave handoff list` (and `pickup --list`): pending handoffs, newest first. Changes nothing. */
export async function handoffListCommand(opts: HandoffListCommandOptions = {}): Promise<number> {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const pending = listPendingHandoffs(root, { home: opts.home });
  process.stdout.write((opts.json ? JSON.stringify(pending, null, 2) : renderHandoffList(root, pending)) + '\n');
  return 0;
}

/**
 * Ledger evidence that the work changed hands: a `pickup` event and the new
 * session, once per handoff. Recorded whenever the increment's last handoff
 * has no pickup after it, whether the edits came over git or the handoff was
 * made in this same checkout (another tool or account on the same machine).
 */
export function recordPickup(root: string, id: string | undefined, applied: PickupApplyResult, agent: string): boolean {
  if (!id) return false;
  try {
    const inc = resolveIncrement(root, id);
    const ledger = ledgerPath(inc.dir);
    const events = readIncrementEvents(ledger, ['handoff', 'pickup']);
    const last = events[events.length - 1];
    if (last?.e !== 'handoff') return false;
    recordSessionOnce(ledger, agent);
    const by = applied.meta?.by ?? last.by;
    const from = [by ? `from ${by}` : '', applied.snapshot ? `snapshot ${applied.snapshot.slice(0, 7)}` : ''].filter(Boolean).join(', ');
    appendEvent(ledger, { t: INCREMENT_EVENT_TASK, e: 'pickup', by: agent, at: new Date().toISOString(), ...(from ? { note: from } : {}) });
    writeHandoffReport(inc.dir, inc.id);
    return true;
  } catch { /* the increment is not in this checkout; nothing to record */ }
  return false;
}

export interface NoteCommandOptions {
  incrementId?: string;
  cwd?: string;
  agent?: string;
}

export async function noteCommand(text: string, opts: NoteCommandOptions = {}): Promise<number> {
  const note = scrubSecrets(text ?? '').scrubbed.trim();
  if (!note) { process.stderr.write('Usage: specweave note "<text>" [increment]\n'); return 2; }
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  let inc;
  try {
    inc = resolveIncrement(root, opts.incrementId);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { process.stderr.write(e.message + '\n'); return 1; }
    throw e;
  }
  const by = opts.agent ?? getAgentId();
  appendEvent(ledgerPath(inc.dir), { t: INCREMENT_EVENT_TASK, e: 'note', by, at: new Date().toISOString(), note });
  process.stdout.write(`Noted on ${inc.id} as ${by}\n`);
  return 0;
}

export interface ReportCommandOptions {
  incrementId?: string;
  out?: string;
  cwd?: string;
}

/** `specweave report [increment]`: the HTML timeline of who did what, from the ledger. */
export async function reportCommand(opts: ReportCommandOptions = {}): Promise<number> {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  let inc;
  try {
    inc = resolveIncrement(root, opts.incrementId);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { process.stderr.write(e.message + '\n'); return 1; }
    throw e;
  }
  const out = opts.out ? path.resolve(opts.out) : undefined;
  const { path: file, report } = writeHandoffReport(inc.dir, inc.id, out);
  const relFile = path.relative(root, file).split(path.sep).join('/');
  process.stdout.write(`${relFile}\n${report.handoffs} handoff(s), ${report.pickups} pickup(s) across ${report.agents.join(', ') || 'no agents yet'}\n`);
  return 0;
}
