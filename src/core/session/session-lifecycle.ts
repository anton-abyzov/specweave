/**
 * Session lifecycle core module.
 *
 * Extracted from hooks/handlers/session-start.ts.
 * Provides reusable session initialization logic for CLI commands.
 *
 * All functions are idempotent and never throw.
 *
 * @module core/session/session-lifecycle
 */

import * as fs from 'fs';
import * as path from 'path';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_THRESHOLD = 80000;
const CRITICAL_THRESHOLD = 120000;
const SYSTEM_ESTIMATE = 12000;
const SKILL_BUDGET = 15000;
const HOOK_PER_TURN = 3000;

export interface HealthCheckResult {
  baseline: number;
  claudeMdSize: number;
  memoryMdSize: number;
  skillBudget: number;
  systemEstimate: number;
  hookPerTurn: number;
  warningLevel: 'normal' | 'warning' | 'critical';
  checkedAt: string;
}

export interface SessionLifecycleResult {
  staleFilesCleaned: number;
  pressureReset: boolean;
  healthWritten: boolean;
  sessionDirCreated: boolean;
  orphansCleaned: boolean;
}

function isStale(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs > STALE_THRESHOLD_MS;
  } catch {
    return false;
  }
}

function safeRemove(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    // Never throw
  }
  return false;
}

function fileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Clear stale auto-mode files older than 24 hours.
 */
export function clearStaleAutoFiles(stateDir: string): number {
  let cleaned = 0;
  try {
    const autoFile = path.join(stateDir, 'auto-mode.json');
    if (fs.existsSync(autoFile) && isStale(autoFile)) {
      if (safeRemove(autoFile)) cleaned++;
      if (safeRemove(path.join(stateDir, '.stop-auto-dedup'))) cleaned++;
      if (safeRemove(path.join(stateDir, '.stop-auto-dedup-prev'))) cleaned++;
      if (safeRemove(path.join(stateDir, '.stop-auto-turns'))) cleaned++;
    }
  } catch {
    // Never throw
  }
  return cleaned;
}

/**
 * Reset context-pressure.json and prompt-health-alert.json.
 */
export function resetPressureFiles(stateDir: string): boolean {
  try {
    safeRemove(path.join(stateDir, 'context-pressure.json'));
    safeRemove(path.join(stateDir, 'prompt-health-alert.json'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Perform baseline prompt health check and write prompt-health.json.
 */
export function writeBaselineHealth(
  projectRoot: string,
  stateDir: string,
  timestamp: string,
): HealthCheckResult | null {
  try {
    const claudeMdSize = fileSize(path.join(projectRoot, 'CLAUDE.md'));
    const memoryDir = path.join(projectRoot, '.claude', 'projects');
    let memoryMdSize = 0;
    try {
      if (fs.existsSync(memoryDir)) {
        const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const memPath = path.join(memoryDir, entry.name, 'memory', 'MEMORY.md');
            memoryMdSize += fileSize(memPath);
          }
        }
      }
    } catch {
      // Best-effort
    }

    const baseline = claudeMdSize + memoryMdSize + SYSTEM_ESTIMATE + SKILL_BUDGET + HOOK_PER_TURN;

    let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (baseline > CRITICAL_THRESHOLD) {
      warningLevel = 'critical';
    } else if (baseline > WARNING_THRESHOLD) {
      warningLevel = 'warning';
    }

    const health: HealthCheckResult = {
      baseline,
      claudeMdSize,
      memoryMdSize,
      skillBudget: SKILL_BUDGET,
      systemEstimate: SYSTEM_ESTIMATE,
      hookPerTurn: HOOK_PER_TURN,
      warningLevel,
      checkedAt: timestamp,
    };

    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'prompt-health.json'), JSON.stringify(health));
    return health;
  } catch {
    return null;
  }
}

/**
 * Clean orphaned state files (lock files without active sessions).
 */
export function cleanOrphaned(stateDir: string): boolean {
  try {
    const lockFiles = ['.lock', 'session.lock'];
    for (const lock of lockFiles) {
      const lockPath = path.join(stateDir, lock);
      if (fs.existsSync(lockPath) && isStale(lockPath)) {
        safeRemove(lockPath);
      }
    }
    return true;
  } catch {
    return false;
  }
}
