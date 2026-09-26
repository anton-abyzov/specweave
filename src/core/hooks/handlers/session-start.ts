/**
 * SessionStart hook handler — the single context-injection point.
 *
 * Emits one `additionalContext` string: the compact form of `specweave pickup`
 * (active increments with their next task, the last handoff, notes and the
 * memory pointer). No banner, no doctor, no Git, no network — a few small file
 * reads, well under 300 ms. Returns `{}` when there is nothing to say.
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

export const handle: HandlerFn = async (_input, context) => {
  const { projectRoot, stateDir, logsDir, timestamp } = context;
  clearStaleAutoSession(stateDir);
  runStateGc(stateDir, logsDir, timestamp);
  // A pressure/health alert belongs to the session that raised it.
  safeRemove(path.join(stateDir, 'context-pressure.json'));
  safeRemove(path.join(stateDir, 'prompt-health-alert.json'));

  const { text } = buildPickup(projectRoot, { compact: true, activeIds: readActiveIncrements(projectRoot) });
  if (!text) return pass();
  return sessionContext(`SpecWeave: ${text}`);
};
