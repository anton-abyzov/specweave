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

import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { buildPickup } from '../../core/session/pickup.js';
import { appendEvent, getAgentId, ledgerPath, INCREMENT_EVENT_TASK } from '../../core/tasks/ledger.js';
import { resolveIncrement, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { scrubSecrets } from '../../core/session/handoff-secret-scrub.js';

export interface PickupCommandOptions {
  incrementId?: string;
  json?: boolean;
  cwd?: string;
  agent?: string;
}

export async function pickupCommand(opts: PickupCommandOptions = {}): Promise<number> {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  let incrementId: string | undefined;
  if (opts.incrementId) {
    try {
      incrementId = resolveIncrement(root, opts.incrementId).id;
    } catch (e) {
      if (e instanceof IncrementResolutionError) { process.stderr.write(e.message + '\n'); return 1; }
      throw e;
    }
  }
  const result = buildPickup(root, { incrementId, agent: opts.agent });
  process.stdout.write((opts.json ? JSON.stringify(result, null, 2) : result.text) + '\n');
  return 0;
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
