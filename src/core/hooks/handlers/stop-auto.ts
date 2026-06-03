/**
 * Stop-auto hook handler — the autonomous-loop driver for `/sw:auto`.
 *
 * Fires when a session ends. Unlike the other Stop hooks, this one is allowed to
 * BLOCK so that Claude Code re-prompts the model and the auto loop continues
 * (see plugins/specweave/skills/auto/SKILL.md "Core Loop"):
 *
 *   IMPLEMENT -> TEST -> FIX -> PASS -> NEXT -> ... -> ALL DONE -> sw:done --auto
 *
 * Decision table (any throw short-circuits to `approve` so ordinary sessions are
 * never trapped):
 *
 *   no auto-mode.json | active !== true | stale      -> reset .stop-auto-turns; { approve }
 *   turns > auto.maxTurns (default 20)                -> clear counter;          { approve }  // safety stop
 *   0 pending tasks AND all ACs satisfied             -> clear counter;          { block: all_complete_needs_closure }
 *   otherwise (work remains)                          -> increment counter;      { block: <P> task(s) / <A> AC(s) remain }
 *
 * @module core/hooks/handlers/stop-auto
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookContext } from './types.js';
import { logHook } from './utils.js';
import { calculateProgressFromTasksFile } from '../../../progress/us-progress-tracker.js';

/** Read JSON safely, return null on error */
function readJsonSafe(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Resolve the auto-mode session file (per-session if present, else global). */
function getSessionPath(stateDir: string): string {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId) {
    const perSession = path.join(stateDir, 'sessions', sessionId, 'auto-mode.json');
    if (fs.existsSync(perSession)) return perSession;
  }
  return path.join(stateDir, 'auto-mode.json');
}

/** True when the session file's mtime is older than maxSessionAge seconds. */
function isSessionStale(sessionPath: string, maxSessionAge: number): boolean {
  try {
    const ageMs = Date.now() - fs.statSync(sessionPath).mtimeMs;
    return ageMs > maxSessionAge * 1000;
  } catch {
    return true;
  }
}

const TURNS_FILE = '.stop-auto-turns';

function readTurns(stateDir: string): number {
  try {
    const n = parseInt(fs.readFileSync(path.join(stateDir, TURNS_FILE), 'utf8').trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeTurns(stateDir: string, n: number): void {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, TURNS_FILE), String(n));
  } catch {
    // Never throw from counter bookkeeping
  }
}

function resetTurns(stateDir: string): void {
  try {
    fs.unlinkSync(path.join(stateDir, TURNS_FILE));
  } catch {
    // Already absent — fine
  }
}

/** Count satisfied/total ACs from a spec.md by `- [ ]`/`- [x]` AC lines. */
function countAcs(specPath: string): { total: number; satisfied: number } {
  let total = 0;
  let satisfied = 0;
  try {
    const text = fs.readFileSync(specPath, 'utf8');
    for (const line of text.split('\n')) {
      // Match an AC checkbox line: `- [ ] **AC-US1-01**: ...` (id optional but must mention AC).
      const m = line.match(/^\s*-\s*\[([ xX])\]\s*\*{0,2}AC[-\w]/);
      if (!m) continue;
      total++;
      if (m[1].toLowerCase() === 'x') satisfied++;
    }
  } catch {
    // No spec / unreadable — treat as no ACs.
  }
  return { total, satisfied };
}

/** Increment ids from the session marker, falling back to an active-increment scan. */
function resolveIncrementIds(session: Record<string, any>, projectRoot: string): string[] {
  const fromMarker = Array.isArray(session.incrementIds)
    ? session.incrementIds.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  if (fromMarker.length > 0) return fromMarker;

  const incDir = path.join(projectRoot, '.specweave', 'increments');
  const active: string[] = [];
  try {
    for (const dir of fs.readdirSync(incDir)) {
      const meta = readJsonSafe(path.join(incDir, dir, 'metadata.json'));
      if (meta && (meta.status === 'active' || meta.status === 'in-progress')) {
        active.push(dir);
      }
    }
  } catch {
    // No increments dir — empty.
  }
  return active;
}

/** Resolve the on-disk increment directory for an id (exact, else prefix match). */
function findIncrementDir(projectRoot: string, id: string): string | null {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  const exact = path.join(incDir, id);
  if (fs.existsSync(exact)) return exact;
  try {
    const prefix = id.match(/^\d{4}/)?.[0] ?? id;
    for (const dir of fs.readdirSync(incDir)) {
      if (dir.startsWith(prefix)) return path.join(incDir, dir);
    }
  } catch {
    // fall through
  }
  return null;
}

/** Aggregate remaining work (pending tasks + unsatisfied ACs) across increments. */
async function computeRemaining(
  projectRoot: string,
  incrementIds: string[],
): Promise<{ pendingTasks: number; pendingAcs: number; primaryId: string }> {
  let pendingTasks = 0;
  let pendingAcs = 0;
  let primaryId = incrementIds[0] ?? '';

  for (const id of incrementIds) {
    const dir = findIncrementDir(projectRoot, id);
    if (!dir) continue;

    // Tasks — prefer the shared parser for accurate same-line/status handling.
    const tasksPath = path.join(dir, 'tasks.md');
    if (fs.existsSync(tasksPath)) {
      try {
        const progress = await calculateProgressFromTasksFile(tasksPath);
        pendingTasks += progress.pendingTasks + progress.inProgressTasks;
      } catch {
        // Unparseable tasks file — skip its tasks.
      }
    }

    // ACs — parse spec.md checkbox lines.
    const { total, satisfied } = countAcs(path.join(dir, 'spec.md'));
    pendingAcs += total - satisfied;
  }

  return { pendingTasks, pendingAcs, primaryId };
}

export const handle: HandlerFn = async (_input, context: HookContext) => {
  const { stateDir, projectRoot, configPath } = context;

  try {
    // 1. No auto session -> approve (and make sure the counter is reset).
    const sessionPath = getSessionPath(stateDir);
    const session = fs.existsSync(sessionPath) ? readJsonSafe(sessionPath) : null;
    if (!session || session.active !== true) {
      resetTurns(stateDir);
      logHook(context, 'stop-auto', 'No active auto session — approve');
      return { decision: 'approve' };
    }

    // 2. Stale session -> approve.
    const config = readJsonSafe(configPath);
    const maxSessionAge = config?.auto?.maxSessionAge ?? 7200;
    if (isSessionStale(sessionPath, maxSessionAge)) {
      resetTurns(stateDir);
      logHook(context, 'stop-auto', 'Stale auto session — approve');
      return { decision: 'approve' };
    }

    // 3. Turn-counter safety stop -> approve.
    const maxTurns = config?.auto?.maxTurns ?? 20;
    const turns = readTurns(stateDir);
    if (turns > maxTurns) {
      resetTurns(stateDir);
      logHook(context, 'stop-auto', `Safety stop: turns ${turns} > maxTurns ${maxTurns} — approve`);
      return { decision: 'approve' };
    }

    // 4. Compute remaining work.
    const incrementIds = resolveIncrementIds(session, projectRoot);
    // No increment to act on (empty marker + none active) -> approve rather than
    // spuriously blocking for closure on a 0/0 count.
    if (incrementIds.length === 0) {
      resetTurns(stateDir);
      logHook(context, 'stop-auto', 'Auto session active but no increment to work on — approve');
      return { decision: 'approve' };
    }
    const { pendingTasks, pendingAcs, primaryId } = await computeRemaining(projectRoot, incrementIds);
    const idLabel = primaryId || incrementIds[0] || 'active increment';

    // 5. All complete -> block for closure (the trigger sw:auto consumes).
    if (pendingTasks === 0 && pendingAcs === 0) {
      resetTurns(stateDir);
      logHook(context, 'stop-auto', `${idLabel}: all_complete_needs_closure`);
      return {
        decision: 'block',
        reason: `${idLabel}: all_complete_needs_closure — run sw:done --auto ${idLabel}`,
      };
    }

    // 6. Work remains -> block to continue + increment the counter.
    writeTurns(stateDir, turns + 1);
    const userGoal = typeof session.userGoal === 'string' && session.userGoal ? session.userGoal : '';
    const reason =
      `${idLabel}: ${pendingTasks} task(s) / ${pendingAcs} AC(s) remain. Run sw:do to continue.` +
      (userGoal ? ` Goal: ${userGoal}` : '');
    logHook(context, 'stop-auto', reason);
    return { decision: 'block', reason };
  } catch {
    // Never throw — any failure must not trap the session.
    return { decision: 'approve' };
  }
};
