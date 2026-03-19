/**
 * Per-Session State Manager
 *
 * Manages per-session directory isolation under `.specweave/state/sessions/<id>/`.
 * Each Claude Code session gets its own directory with a lock.json and optionally
 * per-session auto-mode.json for session-scoped auto mode state.
 *
 * @module core/session/session-state-manager
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SessionLock {
  pid: number;
  started_at: string;
  last_heartbeat: string;
  increments: string[];
}

/**
 * Get the sessions directory path
 */
export function getSessionsDir(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'sessions');
}

/**
 * Get the directory for a specific session
 */
export function getSessionDir(sessionId: string, projectRoot: string): string {
  return path.join(getSessionsDir(projectRoot), sessionId);
}

/**
 * Get the auto-mode.json path for a session, falling back to global
 */
export function getAutoModePath(sessionId: string | undefined, projectRoot: string): string {
  if (sessionId) {
    const sessionPath = path.join(getSessionDir(sessionId, projectRoot), 'auto-mode.json');
    // Check per-session first
    if (fs.existsSync(sessionPath)) {
      return sessionPath;
    }
    // Also return per-session path for WRITING even if file doesn't exist yet
    const sessionDir = getSessionDir(sessionId, projectRoot);
    if (fs.existsSync(sessionDir)) {
      return sessionPath;
    }
  }
  // Fallback to global
  return path.join(projectRoot, '.specweave', 'state', 'auto-mode.json');
}

/**
 * Create per-session directory with lock.json
 */
export function createSessionDir(sessionId: string, projectRoot: string): string {
  const sessionDir = getSessionDir(sessionId, projectRoot);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const lockPath = path.join(sessionDir, 'lock.json');
  const lock: SessionLock = {
    pid: process.pid,
    started_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    increments: [],
  };

  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
  return sessionDir;
}

/**
 * Bridge session ID to environment via CLAUDE_ENV_FILE
 */
export function bridgeSessionId(sessionId: string, envFile: string): void {
  if (!envFile || !sessionId) return;
  try {
    fs.appendFileSync(envFile, `export CLAUDE_SESSION_ID='${sessionId}'\n`, 'utf-8');
  } catch {
    // Non-blocking: env bridge failure shouldn't abort session start
  }
}

/**
 * Garbage collect dead sessions
 * Removes session directories where:
 * 1. The PID in lock.json is no longer running
 * 2. The lock.json is older than maxAgeSeconds (default 300s = 5min)
 */
export function gcDeadSessions(projectRoot: string, maxAgeSeconds: number = 300): number {
  const sessionsDir = getSessionsDir(projectRoot);
  if (!fs.existsSync(sessionsDir)) return 0;

  let cleaned = 0;

  try {
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionDir = path.join(sessionsDir, entry.name);
      const lockPath = path.join(sessionDir, 'lock.json');

      if (!fs.existsSync(lockPath)) {
        // No lock.json — orphaned dir, remove
        fs.rmSync(sessionDir, { recursive: true, force: true });
        cleaned++;
        continue;
      }

      try {
        const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as SessionLock;
        const lockStat = fs.statSync(lockPath);
        const ageSeconds = (Date.now() - lockStat.mtimeMs) / 1000;

        // Check if PID is still alive
        let pidAlive = false;
        try {
          process.kill(lockContent.pid, 0);
          pidAlive = true;
        } catch {
          pidAlive = false;
        }

        // Remove if PID is dead AND lock is old enough
        if (!pidAlive && ageSeconds > maxAgeSeconds) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          cleaned++;
        }
      } catch {
        // Corrupted lock.json — remove if old
        try {
          const stat = fs.statSync(sessionDir);
          const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
          if (ageSeconds > maxAgeSeconds) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            cleaned++;
          }
        } catch {
          // Can't stat — skip
        }
      }
    }
  } catch {
    // Can't read sessions dir — skip
  }

  return cleaned;
}

/**
 * Update heartbeat timestamp for a session
 */
export function touchSession(sessionId: string, projectRoot: string): void {
  const lockPath = path.join(getSessionDir(sessionId, projectRoot), 'lock.json');
  if (!fs.existsSync(lockPath)) return;

  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as SessionLock;
    lock.last_heartbeat = new Date().toISOString();
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
  } catch {
    // Non-blocking
  }
}

/**
 * Add increment claim to session
 */
export function claimIncrement(sessionId: string, projectRoot: string, incrementId: string): void {
  const lockPath = path.join(getSessionDir(sessionId, projectRoot), 'lock.json');
  if (!fs.existsSync(lockPath)) return;

  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as SessionLock;
    if (!lock.increments.includes(incrementId)) {
      lock.increments.push(incrementId);
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
    }
  } catch {
    // Non-blocking
  }
}
