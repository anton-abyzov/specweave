/**
 * Auto-mode scanner core module.
 *
 * Extracted from hooks/handlers/stop-auto.ts.
 * Scans active increments for pending tasks and checks auto-mode session state.
 *
 * Never throws.
 *
 * @module core/session/auto-scanner
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PendingTasksResult {
  pending: number;
  completed: number;
  incrementIds: string[];
}

export interface AutoSessionState {
  active: boolean;
  stale: boolean;
  pendingTasks: PendingTasksResult;
}

function readJsonSafe(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Get auto-mode session file path (per-session or global fallback).
 */
export function getAutoSessionPath(stateDir: string): string {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId) {
    const perSession = path.join(stateDir, 'sessions', sessionId, 'auto-mode.json');
    if (fs.existsSync(perSession)) return perSession;
  }
  return path.join(stateDir, 'auto-mode.json');
}

/**
 * Check if session file is stale (older than maxSessionAge seconds).
 */
export function isSessionStale(sessionPath: string, maxSessionAge: number): boolean {
  try {
    const stat = fs.statSync(sessionPath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs > maxSessionAge * 1000;
  } catch {
    return true;
  }
}

/**
 * Count pending tasks across active increments.
 */
export function scanPendingTasks(projectRoot: string): PendingTasksResult {
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

/**
 * Scan auto-mode session state including pending tasks.
 */
export function scanAutoSession(
  stateDir: string,
  projectRoot: string,
  configPath: string,
): AutoSessionState {
  try {
    const sessionPath = getAutoSessionPath(stateDir);
    if (!fs.existsSync(sessionPath)) {
      return { active: false, stale: false, pendingTasks: { pending: 0, completed: 0, incrementIds: [] } };
    }

    const session = readJsonSafe(sessionPath);
    if (!session || session.active !== true) {
      return { active: false, stale: false, pendingTasks: { pending: 0, completed: 0, incrementIds: [] } };
    }

    const config = readJsonSafe(configPath);
    const maxSessionAge = config?.auto?.maxSessionAge ?? 7200;
    const stale = isSessionStale(sessionPath, maxSessionAge);

    if (stale) {
      return { active: true, stale: true, pendingTasks: { pending: 0, completed: 0, incrementIds: [] } };
    }

    const pendingTasks = scanPendingTasks(projectRoot);
    return { active: true, stale: false, pendingTasks };
  } catch {
    return { active: false, stale: false, pendingTasks: { pending: 0, completed: 0, incrementIds: [] } };
  }
}
