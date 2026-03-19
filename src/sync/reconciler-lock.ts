/**
 * File-based Reconciler Lock
 *
 * Prevents multiple concurrent reconciler runs across processes.
 * Lock file: .specweave/state/reconciler.lock
 * Contains: { pid, startedAt }
 *
 * Stale lock detection:
 * - Lock older than 5 minutes → stale (force-acquire)
 * - PID not running → stale (force-acquire)
 */

import { promises as fs } from 'fs';
import path from 'path';

export const LOCK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface LockData {
  pid: number;
  startedAt: string;
}

function lockPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'reconciler.lock');
}

/**
 * Check if a process is still running by sending signal 0.
 */
function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read lock data from disk. Returns null if file missing or corrupt.
 */
async function readLock(projectRoot: string): Promise<LockData | null> {
  try {
    const raw = await fs.readFile(lockPath(projectRoot), 'utf-8');
    return JSON.parse(raw) as LockData;
  } catch {
    return null;
  }
}

/**
 * Write lock file with current PID and timestamp.
 */
async function writeLock(projectRoot: string): Promise<void> {
  const filePath = lockPath(projectRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const data: LockData = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Check if an existing lock is stale (age > 5min OR PID not running).
 */
function isStale(lock: LockData): boolean {
  const age = Date.now() - new Date(lock.startedAt).getTime();
  if (age >= LOCK_MAX_AGE_MS) return true;
  if (!isPidRunning(lock.pid)) return true;
  return false;
}

/**
 * Attempt to acquire the reconciler lock.
 *
 * 1. If no lock exists → acquire
 * 2. If lock exists and is fresh (< 5min, PID running) → return false
 * 3. If lock is stale (> 5min or PID dead) → delete and acquire
 *
 * @returns true if lock acquired, false if another process holds it
 */
export async function acquireLock(projectRoot: string): Promise<boolean> {
  const existing = await readLock(projectRoot);

  if (existing) {
    if (!isStale(existing)) {
      return false; // Active lock — skip
    }
    // Stale lock — remove and acquire
  }

  await writeLock(projectRoot);
  return true;
}

/**
 * Release the reconciler lock by deleting the lock file.
 */
export async function releaseLock(projectRoot: string): Promise<void> {
  try {
    await fs.unlink(lockPath(projectRoot));
  } catch {
    // Lock file already gone — nothing to do
  }
}

/**
 * Check if the lock is currently held by an active process.
 */
export async function isLockHeld(projectRoot: string): Promise<boolean> {
  const lock = await readLock(projectRoot);
  if (!lock) return false;
  return !isStale(lock);
}
