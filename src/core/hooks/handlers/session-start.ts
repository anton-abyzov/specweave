/**
 * Session-start hook handler — session initialization.
 *
 * Clears stale auto-mode files, resets context pressure,
 * and performs baseline prompt health check.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_THRESHOLD = 80000;
const CRITICAL_THRESHOLD = 120000;
const SYSTEM_ESTIMATE = 12000;
const SKILL_BUDGET = 15000;
const HOOK_PER_TURN = 3000;

function isStale(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs > STALE_THRESHOLD_MS;
  } catch {
    return false;
  }
}

function safeRemove(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore
  }
}

function fileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export const handle: HandlerFn = async (_input, context) => {
  const { projectRoot, stateDir, logsDir, timestamp } = context;

  try {
    fs.mkdirSync(stateDir, { recursive: true });
  } catch {
    return { continue: true };
  }

  // --- Auto-mode cleanup: remove stale session files (>24h) ---
  const autoFile = path.join(stateDir, 'auto-mode.json');
  if (fs.existsSync(autoFile) && isStale(autoFile)) {
    safeRemove(autoFile);
    safeRemove(path.join(stateDir, '.stop-auto-dedup'));
    safeRemove(path.join(stateDir, '.stop-auto-dedup-prev'));
    safeRemove(path.join(stateDir, '.stop-auto-turns'));

    try {
      fs.mkdirSync(logsDir, { recursive: true });
      fs.appendFileSync(
        path.join(logsDir, 'session.log'),
        `[${timestamp}] SessionStart: Cleared stale auto-mode session files (>24h)\n`,
      );
    } catch {
      // Never throw from logging
    }
  }

  // --- Context pressure reset ---
  safeRemove(path.join(stateDir, 'context-pressure.json'));
  safeRemove(path.join(stateDir, 'prompt-health-alert.json'));

  // --- Baseline health check ---
  try {
    const claudeMdSize = fileSize(path.join(projectRoot, 'CLAUDE.md'));
    const memoryDir = path.join(projectRoot, '.claude', 'projects');
    let memoryMdSize = 0;
    try {
      // Find MEMORY.md in any project subdirectory
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

    let warningLevel = 'normal';
    if (baseline > CRITICAL_THRESHOLD) {
      warningLevel = 'critical';
    } else if (baseline > WARNING_THRESHOLD) {
      warningLevel = 'warning';
    }

    const health = {
      baseline,
      claudeMdSize,
      memoryMdSize,
      skillBudget: SKILL_BUDGET,
      systemEstimate: SYSTEM_ESTIMATE,
      hookPerTurn: HOOK_PER_TURN,
      warningLevel,
      checkedAt: timestamp,
    };

    fs.writeFileSync(path.join(stateDir, 'prompt-health.json'), JSON.stringify(health));
  } catch {
    // Health check is best-effort
  }

  return { continue: true };
};
