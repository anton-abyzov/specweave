/**
 * SessionStart hook handler — the single context-injection point.
 *
 * Emits one `additionalContext` string: the compact form of `specweave pickup`
 * (active increments with their next task, the last handoff, notes and the
 * memory pointer). No banner, no doctor, no Git, no network — a few small file
 * reads, well under 300 ms. Returns `{}` when there is nothing to say.
 *
 * Unchanged state gives identical bytes (absolute times, no ages). After a
 * compaction (`source: "compact"`) only the active increments with their next
 * task, the memory pointer and the pickup hint are restated; the rest is one
 * `specweave pickup` away and was already said at startup.
 *
 * Side effects: clears auto-mode session files older than 24 h so a crashed
 * `/sw:auto` run cannot trap the next session, resets per-session pressure
 * alerts, and purges junk state at most once per 24 h.
 *
 * @module core/hooks/handlers/session-start
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';
import { pass, sessionContext } from './types.js';
import { readActiveIncrements } from './utils.js';
import { isGcDue, purgeState, formatBytes } from '../../state/state-gc.js';
import { buildPickup } from '../../session/pickup.js';
import { listPendingHandoffs } from '../../session/handoff-list.js';

const STALE_AUTO_MS = 24 * 60 * 60 * 1000;

function safeRemove(p: string): void {
  try { fs.unlinkSync(p); } catch { /* absent */ }
}

function clearStaleAutoSession(stateDir: string): void {
  const autoFile = path.join(stateDir, 'auto-mode.json');
  try {
    if (Date.now() - fs.statSync(autoFile).mtimeMs <= STALE_AUTO_MS) return;
  } catch {
    return;
  }
  safeRemove(autoFile);
  safeRemove(path.join(stateDir, '.stop-auto-turns'));
}

/** Silent purge of known junk state, at most once per 24 h. Best-effort. */
function runStateGc(stateDir: string, logsDir: string, timestamp: string): void {
  try {
    if (!isGcDue(stateDir)) return;
    const gc = purgeState(stateDir, { apply: true });
    if (gc.deleted.length === 0) return;
    fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(
      path.join(logsDir, 'session.log'),
      `[${timestamp}] SessionStart: gc removed ${gc.deleted.length} state entries (${formatBytes(gc.bytes)})\n`,
    );
  } catch {
    // GC is best-effort — never fail the hook
  }
}

export const handle: HandlerFn = async (input, context) => {
  const { projectRoot, stateDir, logsDir, timestamp } = context;
  clearStaleAutoSession(stateDir);
  runStateGc(stateDir, logsDir, timestamp);
  // A pressure/health alert belongs to the session that raised it.
  safeRemove(path.join(stateDir, 'context-pressure.json'));
  safeRemove(path.join(stateDir, 'prompt-health-alert.json'));

  const afterCompaction = input.source === 'compact';
  const { text } = buildPickup(projectRoot, { compact: true, afterCompaction, activeIds: readActiveIncrements(projectRoot) });
  const pending = afterCompaction ? '' : pendingLine(projectRoot);
  const all = [text, pending].filter(Boolean).join('\n');
  if (!all) return pass();
  return sessionContext(`SpecWeave: ${all}`);
};

/**
 * Sessions handed off here: the newest by name (what "pick up" takes) and a
 * count of the rest, which `specweave pickup --list` and pickup's "Also
 * pending" block name in full.
 */
function pendingLine(projectRoot: string): string {
  try {
    const pending = listPendingHandoffs(projectRoot);
    if (!pending.length) return '';
    const [newest] = pending;
    const title = newest.title.length > 60 ? newest.title.slice(0, 59) + '…' : newest.title;
    const more = pending.length > 1 ? `, +${pending.length - 1} more (\`specweave pickup --list\`)` : '';
    return `Pending handoffs: newest ${newest.id}${title ? ` (${title})` : ''}${more}. "pick up" takes the newest; "pick up <id>" a specific one (\`specweave pickup <id>\`).`;
  } catch { return ''; }
}
