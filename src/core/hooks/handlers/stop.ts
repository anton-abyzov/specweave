/**
 * Stop hook handler — the `/sw:auto` loop driver, plus a one-time close
 * reminder for ordinary sessions (Stop fires on every turn; handoff automation
 * lives in PreCompact).
 *
 * Decision table (any throw short-circuits to `{}` so ordinary sessions are
 * never trapped):
 *
 *   no auto-mode.json | active !== true          -> reset counter;  close reminder below
 *   every auto increment completed/abandoned     -> reset;          {}
 *   stale session (auto.maxSessionAge, 7200 s)   -> reset;          {}
 *   turns > auto.maxTurns (default 20)           -> reset;          {}   // safety stop
 *   stop_hook_active + no progress for 3 turns   -> reset;          {}   // loop guard
 *   no increment to work on                      -> reset;          {}
 *   0 pending tasks AND all ACs satisfied        -> reset;          block: all_complete_needs_closure
 *   otherwise (work remains)                     -> counter + 1;    block: <P> task(s) / <A> AC(s) remain
 *
 * Close reminder (no auto session): `task done`/`skip` leaves a marker in
 * `~/.specweave/close-pending/<session>.json` when an increment's last task
 * turns terminal. That session's next stop blocks once with the close chain
 * and the entry is removed; other sessions never see it. Entries also go once
 * the increment is closed, gets new open tasks, or is a day old.
 *
 * Output shapes: pass = `{}`; block = top-level `decision:"block"` + `reason`.
 *
 * @module core/hooks/handlers/stop
 */

import * as fs from 'fs';
import * as path from 'path';
import { matchIncrementIds } from '../../../utils/increment-id-validator.js';
import type { HandlerFn, HookContext } from './types.js';
import { pass, stopBlock } from './types.js';
import { logHook, readActiveIncrements, readJsonSafe } from './utils.js';
import { loadTaskBoard } from '../../tasks/task-board.js';
import { hasTasksFile } from '../../tasks/tasks-source.js';
import { readSpecAcs, deriveAcStatus } from '../../tasks/verify-runner.js';
import { acsLeftToClose } from '../../tasks/accepted-skip.js';
import {
  CLOSE_PENDING_MAX_AGE_MS,
  closeChain,
  isClosedStatus,
  readClosePending,
  removeClosePending,
} from '../../increment/close-pending.js';

const TURNS_FILE = '.stop-auto-turns';

/** Resolve the auto-mode session file (per-session if present, else global). */
function getSessionPath(stateDir: string): string {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId) {
    const perSession = path.join(stateDir, 'sessions', sessionId, 'auto-mode.json');
    if (fs.existsSync(perSession)) return perSession;
  }
  return path.join(stateDir, 'auto-mode.json');
}

function isSessionStale(sessionPath: string, maxSessionAgeSec: number): boolean {
  try {
    return Date.now() - fs.statSync(sessionPath).mtimeMs > maxSessionAgeSec * 1000;
  } catch {
    return true;
  }
}

/** Loop bookkeeping: turn counter + last remaining-work snapshot + no-progress streak. */
interface TurnState {
  turns: number;
  remaining?: number;
  noProgress?: number;
}

/** Consecutive no-progress turns (while `stop_hook_active`) before the loop is released. */
export const MAX_NO_PROGRESS_TURNS = 3;

function readTurns(stateDir: string): TurnState {
  try {
    const raw = fs.readFileSync(path.join(stateDir, TURNS_FILE), 'utf8').trim();
    if (/^\d+$/.test(raw)) return { turns: parseInt(raw, 10) }; // 1.x plain counter
    const parsed = JSON.parse(raw) as TurnState;
    const turns = Number.isFinite(parsed.turns) && parsed.turns >= 0 ? parsed.turns : 0;
    return { ...parsed, turns };
  } catch {
    return { turns: 0 };
  }
}

function writeTurns(stateDir: string, state: TurnState): void {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, TURNS_FILE), JSON.stringify(state));
  } catch { /* counter bookkeeping must never throw */ }
}

function resetTurns(stateDir: string): void {
  try { fs.unlinkSync(path.join(stateDir, TURNS_FILE)); } catch { /* absent */ }
}

/** Increment ids from the session marker, else the active-increment state/scan. */
function resolveIncrementIds(session: Record<string, unknown>, projectRoot: string): string[] {
  const fromMarker = Array.isArray(session.incrementIds)
    ? session.incrementIds.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  return fromMarker.length > 0 ? fromMarker : readActiveIncrements(projectRoot);
}

/** Resolve exact IDs or an unambiguous whole-number alias; never numeric prefixes. */
function findIncrementDir(projectRoot: string, id: string): string | null {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  try {
    const directories = fs.readdirSync(incDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => entry.name);
    const matches = matchIncrementIds(directories, id);
    return matches.length === 1 ? path.join(incDir, matches[0]) : null;
  } catch { return null; }
}

function computeRemaining(
  projectRoot: string,
  incrementIds: string[],
): { pendingTasks: number; pendingAcs: number; unresolvedIds: string[] } {
  let pendingTasks = 0;
  let pendingAcs = 0;
  const unresolvedIds: string[] = [];
  for (const id of incrementIds) {
    const dir = findIncrementDir(projectRoot, id);
    if (!dir) { unresolvedIds.push(id); continue; }
    try {
      // The ledger fold is the one counter (same source as `specweave task
      // list`, verify.json and the closure gate), for tasks in spec.md or a
      // legacy tasks.md. done and skipped are terminal; the rest is work left.
      // ACs are met when their tasks are done, as `verify` derives them; a
      // skipped-accepted AC (accepted skips only) is not work left either.
      const board = hasTasksFile(dir) ? loadTaskBoard(dir) : undefined;
      if (board) pendingTasks += Math.max(0, board.counts.total - board.counts.done - board.counts.skipped);
      const acs = board ? deriveAcStatus(readSpecAcs(dir), board) : readSpecAcs(dir);
      pendingAcs += acsLeftToClose(acs, board ?? null).length;
    } catch { /* unparseable increment — skip */ }
  }
  return { pendingTasks, pendingAcs, unresolvedIds };
}

function isClosed(dir: string): boolean {
  return isClosedStatus(readJsonSafe<{ status?: unknown }>(path.join(dir, 'metadata.json'))?.status);
}

/**
 * Outside auto mode: remind the session that finished an increment's last
 * task, once, to verify and close it. Only the session named in the marker is
 * reminded; every other session in the folder passes untouched. The entry is
 * removed before blocking, and a stop that a Stop hook already continued is
 * never blocked again, so a failed write can never trap a session.
 */
function closeReminder(input: Parameters<HandlerFn>[0], context: HookContext): ReturnType<typeof pass> {
  if (input.stop_hook_active === true) return pass();
  const session = typeof input.session_id === 'string' ? input.session_id : '';
  if (!session) return pass();
  const pending = readClosePending(session);
  const now = Date.now();
  const due: string[] = [];
  const drop: string[] = [];
  for (const [key, entry] of Object.entries(pending)) {
    drop.push(key);
    const dir = findIncrementDir(entry.root, entry.id);
    const at = Date.parse(entry.at);
    const stale = !Number.isFinite(at) || now - at > CLOSE_PENDING_MAX_AGE_MS;
    // A task added after the finish reopens the work; the next `task done` re-marks it.
    if (dir && !stale && !isClosed(dir) && computeRemaining(entry.root, [entry.id]).pendingTasks === 0) due.push(entry.id);
  }
  if (!removeClosePending(session, pending, drop) || due.length === 0) return pass();
  logHook(context, 'stop', `close reminder: ${due.join(', ')}`, 'block');
  return stopBlock(
    `${due.join(', ')}: you finished every task, and the increment is still open. ` +
      `Close it now, without asking: ${due.map((id) => closeChain(id)).join('; and ')}. ` +
      'If a close gate stops you (verify fails, a check only the user can do), say which in your reply. ' +
      'A lane agent leaves the close to its lead.',
  );
}

/** The loop is ending under an auto session: reset the counter and let Claude stop. */
function exitLoop(context: HookContext, why: string): ReturnType<typeof pass> {
  resetTurns(context.stateDir);
  logHook(context, 'stop', `auto loop released: ${why}`, 'warn');
  return pass();
}

export const handle: HandlerFn = async (input, context) => {
  const { stateDir, projectRoot, configPath } = context;
  try {
    const sessionPath = getSessionPath(stateDir);
    const session = fs.existsSync(sessionPath) ? readJsonSafe(sessionPath) : null;
    if (!session || session.active !== true) {
      resetTurns(stateDir);
      return closeReminder(input, context);
    }

    const config = readJsonSafe<{ auto?: { maxSessionAge?: number; maxTurns?: number } }>(configPath);
    const maxSessionAge = config?.auto?.maxSessionAge ?? 7200;
    if (isSessionStale(sessionPath, maxSessionAge)) return exitLoop(context, 'stale session');

    const maxTurns = config?.auto?.maxTurns ?? 20;
    const state = readTurns(stateDir);
    if (state.turns > maxTurns) {
      return exitLoop(context, `safety stop: turns ${state.turns} > auto.maxTurns ${maxTurns}`);
    }

    // A closed increment has nothing left to loop on, even while the marker still names it.
    const incrementIds = resolveIncrementIds(session, projectRoot).filter((id) => {
      const dir = findIncrementDir(projectRoot, id);
      return !dir || !isClosed(dir);
    });
    if (incrementIds.length === 0) return exitLoop(context, 'no increment to work on');

    const { pendingTasks, pendingAcs, unresolvedIds } = computeRemaining(projectRoot, incrementIds);
    if (unresolvedIds.length > 0) return exitLoop(context, `unresolved or ambiguous increments: ${unresolvedIds.join(', ')}`);
    const idLabel = incrementIds[0];

    if (pendingTasks === 0 && pendingAcs === 0) {
      resetTurns(stateDir);
      return stopBlock(`${idLabel}: all_complete_needs_closure — run sw-done ${idLabel}`);
    }

    // Honor `stop_hook_active`: when we are the reason Claude keeps going and
    // nothing changed for MAX_NO_PROGRESS_TURNS turns, release the loop.
    const remaining = pendingTasks + pendingAcs;
    const noProgress =
      input.stop_hook_active === true && state.remaining === remaining ? (state.noProgress ?? 0) + 1 : 0;
    if (noProgress >= MAX_NO_PROGRESS_TURNS) {
      return exitLoop(context, `no progress for ${noProgress} turns (${remaining} item(s) still remain)`);
    }

    writeTurns(stateDir, { turns: state.turns + 1, remaining, noProgress });
    const userGoal = typeof session.userGoal === 'string' && session.userGoal ? session.userGoal : '';
    return stopBlock(
      `${idLabel}: ${pendingTasks} task(s) / ${pendingAcs} AC(s) remain. Run sw:do to continue.` +
        (userGoal ? ` Goal: ${userGoal}` : ''),
    );
  } catch (err) {
    logHook(context, 'stop', `[ERROR] ${err instanceof Error ? err.message : String(err)}`, 'error');
    return pass();
  }
};
