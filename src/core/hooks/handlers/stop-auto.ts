/**
 * Stop-auto hook handler.
 *
 * Fires when a session ends. Checks if an auto-mode session is active:
 * 1. Look for auto-mode.json (per-session or global)
 * 2. Check session staleness
 * 3. Scan active increments for pending tasks
 * 4. Include progress context but always approve
 *
 * Stop hooks should NEVER block session exit.
 *
 * @module core/hooks/handlers/stop-auto
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';
import { logHook } from './utils.js';

/** Read JSON safely, return null on error */
function readJsonSafe(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Get auto-mode session file path (per-session or global fallback) */
function getSessionPath(stateDir: string): string {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId) {
    const perSession = path.join(stateDir, 'sessions', sessionId, 'auto-mode.json');
    if (fs.existsSync(perSession)) return perSession;
  }
  return path.join(stateDir, 'auto-mode.json');
}

/** Check if session file is stale (older than maxSessionAge seconds) */
function isSessionStale(sessionPath: string, maxSessionAge: number): boolean {
  try {
    const stat = fs.statSync(sessionPath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs > maxSessionAge * 1000;
  } catch {
    return true;
  }
}

/** Count pending tasks across active increments */
function scanPendingTasks(projectRoot: string): { pending: number; completed: number; incrementIds: string[] } {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  let pending = 0;
  let completed = 0;
  const incrementIds: string[] = [];

  try {
    if (!fs.existsSync(incDir)) return { pending, completed, incrementIds };

    const dirs = fs.readdirSync(incDir);
    for (const dir of dirs) {
      const metaPath = path.join(incDir, dir, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;

      const meta = readJsonSafe(metaPath);
      if (!meta || (meta.status !== 'active' && meta.status !== 'in-progress')) continue;

      const tasksPath = path.join(incDir, dir, 'tasks.md');
      try {
        const tasks = fs.readFileSync(tasksPath, 'utf8');
        const p = (tasks.match(/\[ \]/g) || []).length;
        const c = (tasks.match(/\[x\]/g) || []).length;
        if (p > 0) {
          pending += p;
          completed += c;
          incrementIds.push(dir);
        }
      } catch {
        // No tasks file
      }
    }
  } catch {
    // fs errors
  }

  return { pending, completed, incrementIds };
}

export const handle: HandlerFn = async (input, context) => {
  try {
    // 1. Find auto-mode session file
    const sessionPath = getSessionPath(context.stateDir);
    if (!fs.existsSync(sessionPath)) {
      logHook(context, 'stop-auto', 'No auto session');
      return { decision: 'approve' };
    }

    // 2. Read session data
    const session = readJsonSafe(sessionPath);
    if (!session || session.active !== true) {
      logHook(context, 'stop-auto', 'Session not active');
      return { decision: 'approve' };
    }

    // 3. Read config for maxSessionAge
    const config = readJsonSafe(context.configPath);
    const maxSessionAge = config?.auto?.maxSessionAge ?? 7200;

    // 4. Check staleness
    if (isSessionStale(sessionPath, maxSessionAge)) {
      logHook(context, 'stop-auto', 'Stale session — expired');
      return { decision: 'approve' };
    }

    // 5. Scan active increments for pending tasks
    const { pending, completed, incrementIds } = scanPendingTasks(context.projectRoot);

    if (pending === 0) {
      logHook(context, 'stop-auto', 'All tasks complete');
      return { decision: 'approve' };
    }

    // 6. Pending tasks exist — include progress context but still approve
    logHook(context, 'stop-auto', `Pending tasks: ${pending} across ${incrementIds.length} increment(s)`);
    return { decision: 'approve' };
  } catch {
    // Never throw — always approve
    return { decision: 'approve' };
  }
};
