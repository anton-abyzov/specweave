/**
 * Studio thread binding — which increment a SpecWeave Studio thread works on.
 *
 * Studio starts every provider turn with `SPECWEAVE_STUDIO_THREAD_ID`. When a
 * process inside such a turn appends to an increment's ledger (`task claim`,
 * `task done`, `pickup`, `note`, …), this records the increment for the thread
 * in `~/.specweave/studio/threads/<thread>.json`. Studio reads it to show the
 * thread's plan card from that increment's spec and ledger.
 *
 * It lives outside the repository and holds no task state: the ledger stays
 * the only source of truth. Best-effort — a failed write never fails the
 * command that appended to the ledger.
 *
 * @module core/tasks/studio-thread-binding
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface StudioThreadBinding {
  version: 1;
  threadId: string;
  /** Increment folder name, e.g. `0930-studio-plan-progress`. */
  incrementId: string;
  /** Absolute project root whose `.specweave/increments` holds it (a worktree when the agent works in one). */
  root: string;
  /** The task the last event touched; null for increment-level events (`*`). */
  taskId: string | null;
  /** The ledger event that bound the thread, e.g. `claim`. */
  event: string;
  at: string;
}

/** Where the binding of `threadId` lives. */
export function studioThreadBindingFile(threadId: string, home = os.homedir()): string {
  return path.join(home, '.specweave', 'studio', 'threads', `${threadId.replace(/[^\w.-]/g, '_')}.json`);
}

/**
 * Record that the current Studio thread works on the increment owning
 * `ledgerFile`. No-op outside Studio or for a ledger outside an increments folder.
 */
export function recordStudioThreadBinding(
  ledgerFile: string,
  event: { t: string; e: string; at: string },
  opts: { env?: NodeJS.ProcessEnv; home?: string } = {},
): void {
  const threadId = (opts.env ?? process.env).SPECWEAVE_STUDIO_THREAD_ID?.trim();
  if (!threadId) return;
  try {
    const incrementDir = path.resolve(path.dirname(ledgerFile));
    const incrementsDir = path.dirname(incrementDir);
    const specweaveDir = path.dirname(incrementsDir);
    if (path.basename(incrementsDir) !== 'increments' || path.basename(specweaveDir) !== '.specweave') return;
    const binding: StudioThreadBinding = {
      version: 1,
      threadId,
      incrementId: path.basename(incrementDir),
      root: path.dirname(specweaveDir),
      taskId: event.t === '*' ? null : event.t,
      event: event.e,
      at: event.at,
    };
    const file = studioThreadBindingFile(threadId, opts.home);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.${Date.now()}`;
    fs.writeFileSync(temporary, JSON.stringify(binding, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, file);
  } catch {
    // The ledger line is already written; the binding is a convenience for Studio.
  }
}
