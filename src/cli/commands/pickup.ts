/**
 * CLI Commands: pickup, note
 *
 *   specweave pickup [incrementId] [--json]
 *   specweave note "<text>" [incrementId]
 *
 * `pickup` is the one read a fresh session needs, in any tool on any account.
 * `note` leaves a message on an increment for whoever works on it next (another
 * thread, another tool); `pickup` shows the latest notes.
 *
 * @module cli/commands/pickup
 */

import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { buildPickup } from '../../core/session/pickup.js';
import { appendEvent, getAgentId, ledgerPath, recordSessionOnce, INCREMENT_EVENT_TASK } from '../../core/tasks/ledger.js';
import { resolveIncrement, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { scrubSecrets } from '../../core/session/handoff-secret-scrub.js';
import { applyHandoff, type PickupApplyResult } from '../../core/session/handoff-remote.js';
import { writeHandoffReport } from '../../core/session/handoff-report.js';

export interface PickupCommandOptions {
  incrementId?: string;
  json?: boolean;
  /** `--no-apply`: only show the handoff, leave the checkout as it is. */
  apply?: boolean;
  cwd?: string;
  agent?: string;
}

export async function pickupCommand(opts: PickupCommandOptions = {}): Promise<number> {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const agent = opts.agent ?? getAgentId();

  // 1. Bring in the latest handoff pushed from any tool, machine or account.
  const applied: PickupApplyResult = applyHandoff(root, { dryRun: opts.apply === false });
  if (applied.status === 'applied' && opts.apply !== false) recordPickup(root, applied, agent);

  // 2. Describe what is here now.
  let incrementId: string | undefined;
  const wanted = opts.incrementId ?? (applied.status === 'applied' ? applied.meta?.increment : undefined);
  if (wanted) {
    try {
      incrementId = resolveIncrement(root, wanted).id;
    } catch (e) {
      if (!(e instanceof IncrementResolutionError)) throw e;
      if (opts.incrementId) { process.stderr.write(e.message + '\n'); return 1; }
    }
  }
  const result = buildPickup(root, { incrementId, agent });
  const text = [applied.message, result.text].filter(Boolean).join('\n');
  process.stdout.write((opts.json ? JSON.stringify({ ...result, text, handoff: applied }, null, 2) : text) + '\n');
  return applied.status === 'failed' ? 1 : 0;
}

/** Ledger evidence that the work changed hands: a `pickup` event and the new session. */
function recordPickup(root: string, applied: PickupApplyResult, agent: string): void {
  const id = applied.meta?.increment;
  if (!id) return;
  try {
    const inc = resolveIncrement(root, id);
    const ledger = ledgerPath(inc.dir);
    recordSessionOnce(ledger, agent);
    const from = [applied.meta?.by ? `from ${applied.meta.by}` : '', applied.snapshot ? `snapshot ${applied.snapshot.slice(0, 7)}` : ''].filter(Boolean).join(', ');
    appendEvent(ledger, { t: INCREMENT_EVENT_TASK, e: 'pickup', by: agent, at: new Date().toISOString(), ...(from ? { note: from } : {}) });
    writeHandoffReport(inc.dir, inc.id);
  } catch { /* the increment is not in this checkout; nothing to record */ }
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
