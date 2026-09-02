/**
 * Stop hook handler — the `/sw:auto` loop driver, and nothing else (Stop
 * fires on every turn; handoff automation lives in PreCompact).
 *
 * Decision table (any throw short-circuits to `{}` so ordinary sessions are
 * never trapped):
 *
 *   no auto-mode.json | active !== true          -> reset counter;  {}
 *   stale session (auto.maxSessionAge, 7200 s)   -> reset;          {}
 *   turns > auto.maxTurns (default 20)           -> reset;          {}   // safety stop
 *   stop_hook_active + no progress for 3 turns   -> reset;          {}   // loop guard
 *   no increment to work on                      -> reset;          {}
 *   0 pending tasks AND all ACs satisfied        -> reset;          block: all_complete_needs_closure
 *   otherwise (work remains)                     -> counter + 1;    block: <P> task(s) / <A> AC(s) remain
 *
 * Output shapes: pass = `{}`; block = top-level `decision:"block"` + `reason`.
 *
 * @module core/hooks/handlers/stop
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookContext } from './types.js';
import { pass, stopBlock } from './types.js';
import { logHook, readActiveIncrements, readJsonSafe } from './utils.js';
import { loadTaskBoard } from '../../tasks/task-board.js';

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

/** Count satisfied/total ACs from spec.md `- [ ]`/`- [x]` AC lines. */
function countAcs(specPath: string): { total: number; satisfied: number } {
  let total = 0;
  let satisfied = 0;
  try {
    for (const line of fs.readFileSync(specPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*-\s*\[([ xX])\]\s*\*{0,2}AC[-\w]/);
      if (!m) continue;
      total++;
      if (m[1].toLowerCase() === 'x') satisfied++;
    }
  } catch { /* no spec — no ACs */ }
  return { total, satisfied };
}

/** Increment ids from the session marker, else the active-increment state/scan. */
function resolveIncrementIds(session: Record<string, unknown>, projectRoot: string): string[] {
  const fromMarker = Array.isArray(session.incrementIds)
    ? session.incrementIds.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  return fromMarker.length > 0 ? fromMarker : readActiveIncrements(projectRoot);
}

/** On-disk increment dir for an id (exact, else 4-digit prefix match). */
function findIncrementDir(projectRoot: string, id: string): string | null {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  const exact = path.join(incDir, id);
  if (fs.existsSync(exact)) return exact;
  try {
    const prefix = id.match(/^\d{4}/)?.[0] ?? id;
    for (const dir of fs.readdirSync(incDir)) {
      if (dir.startsWith(prefix)) return path.join(incDir, dir);
    }
  } catch { /* fall through */ }
  return null;
}

function computeRemaining(
  projectRoot: string,
  incrementIds: string[],
): { pendingTasks: number; pendingAcs: number } {
  let pendingTasks = 0;
  let pendingAcs = 0;
  for (const id of incrementIds) {
    const dir = findIncrementDir(projectRoot, id);
    if (!dir) continue;
    if (fs.existsSync(path.join(dir, 'tasks.md'))) {
      try {
        // The ledger fold is the one counter (same source as `specweave task
        // list` / verify.json / the closure gate). done and skipped are both
        // terminal; everything else (open/claimed/blocked/stale) is work left.
        const { total, done, skipped } = loadTaskBoard(dir).counts;
        pendingTasks += Math.max(0, total - done - skipped);
      } catch { /* unparseable tasks file — skip */ }
    }
    const { total, satisfied } = countAcs(path.join(dir, 'spec.md'));
    pendingAcs += total - satisfied;
  }
  return { pendingTasks, pendingAcs };
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
      return pass();
    }

    const config = readJsonSafe<{ auto?: { maxSessionAge?: number; maxTurns?: number } }>(configPath);
    const maxSessionAge = config?.auto?.maxSessionAge ?? 7200;
    if (isSessionStale(sessionPath, maxSessionAge)) return exitLoop(context, 'stale session');

    const maxTurns = config?.auto?.maxTurns ?? 20;
    const state = readTurns(stateDir);
    if (state.turns > maxTurns) {
      return exitLoop(context, `safety stop: turns ${state.turns} > auto.maxTurns ${maxTurns}`);
    }

    const incrementIds = resolveIncrementIds(session, projectRoot);
    if (incrementIds.length === 0) return exitLoop(context, 'no increment to work on');

    const { pendingTasks, pendingAcs } = computeRemaining(projectRoot, incrementIds);
    const idLabel = incrementIds[0];

    if (pendingTasks === 0 && pendingAcs === 0) {
      resetTurns(stateDir);
      return stopBlock(`${idLabel}: all_complete_needs_closure — run sw:done --auto ${idLabel}`);
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
