/**
 * Session lifecycle CLI command.
 *
 * Replaces SessionStart and Stop hooks with explicit CLI subcommands:
 *   specweave session start  — session initialization
 *   specweave session end    — session cleanup (reflect + auto + sync flush)
 *
 * @module cli/commands/session
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  clearStaleAutoFiles,
  resetPressureFiles,
  writeBaselineHealth,
  cleanOrphaned,
} from '../../core/session/session-lifecycle.js';
import { checkReflectConfig } from '../../core/session/reflect-checker.js';
import { scanAutoSession } from '../../core/session/auto-scanner.js';
import { flushEventQueue } from '../../core/sync/event-queue-ops.js';
import { createSessionDir } from '../../core/session/session-state-manager.js';

export interface SessionCommandResult {
  success: boolean;
  action: 'start' | 'end';
  details: Record<string, unknown>;
}

export interface SessionStartOptions {
  projectRoot?: string;
  sessionId?: string;
  silent?: boolean;
  json?: boolean;
}

export interface SessionEndOptions {
  projectRoot?: string;
  silent?: boolean;
  json?: boolean;
}

function resolveProjectRoot(provided?: string): string | null {
  const root = provided ?? process.cwd();
  const configPath = path.join(root, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  return root;
}

/**
 * Execute `specweave session start`.
 */
export async function sessionStartCommand(
  options: SessionStartOptions = {},
): Promise<SessionCommandResult> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  if (!projectRoot) {
    const msg = 'Not a SpecWeave project (no .specweave/config.json found)';
    if (!options.silent) console.error(msg);
    return { success: false, action: 'start', details: { error: msg } };
  }

  const stateDir = path.join(projectRoot, '.specweave', 'state');
  const timestamp = new Date().toISOString();

  try {
    fs.mkdirSync(stateDir, { recursive: true });
  } catch {
    return { success: false, action: 'start', details: { error: 'Cannot create state directory' } };
  }

  const details: Record<string, unknown> = {};

  // 1. Clear stale auto files
  details.staleFilesCleaned = clearStaleAutoFiles(stateDir);

  // 2. Reset pressure files
  details.pressureReset = resetPressureFiles(stateDir);

  // 3. Baseline health check
  const health = writeBaselineHealth(projectRoot, stateDir, timestamp);
  details.healthWritten = health !== null;
  if (health) details.warningLevel = health.warningLevel;

  // 4. Session directory
  if (options.sessionId) {
    try {
      createSessionDir(options.sessionId, projectRoot);
      details.sessionDirCreated = true;
      details.sessionId = options.sessionId;
    } catch {
      details.sessionDirCreated = false;
    }
  }

  // 5. Clean orphaned state files
  details.orphansCleaned = cleanOrphaned(stateDir);

  const result: SessionCommandResult = { success: true, action: 'start', details };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Session started');
      if (details.staleFilesCleaned) console.log(`  Cleaned ${details.staleFilesCleaned} stale auto-mode files`);
      if (health) console.log(`  Prompt health: ${health.warningLevel} (baseline: ${health.baseline})`);
      if (options.sessionId) console.log(`  Session ID: ${options.sessionId}`);
    }
  }

  return result;
}

/**
 * Execute `specweave session end`.
 */
export async function sessionEndCommand(
  options: SessionEndOptions = {},
): Promise<SessionCommandResult> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  if (!projectRoot) {
    const msg = 'Not a SpecWeave project (no .specweave/config.json found)';
    if (!options.silent) console.error(msg);
    return { success: false, action: 'end', details: { error: msg } };
  }

  const stateDir = path.join(projectRoot, '.specweave', 'state');
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const details: Record<string, unknown> = {};

  // 1. Reflect check — errors do not abort other operations
  try {
    const reflectResult = checkReflectConfig(configPath);
    details.reflect = reflectResult;
  } catch (err) {
    details.reflect = { error: String(err) };
  }

  // 2. Auto-mode scan — errors do not abort other operations
  try {
    const autoResult = scanAutoSession(stateDir, projectRoot, configPath);
    details.auto = autoResult;
  } catch (err) {
    details.auto = { error: String(err) };
  }

  // 3. Event queue flush — errors do not abort other operations
  try {
    const flushResult = flushEventQueue(stateDir);
    details.sync = flushResult;
  } catch (err) {
    details.sync = { error: String(err) };
  }

  const result: SessionCommandResult = { success: true, action: 'end', details };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Session ended');
      const reflect = details.reflect as { enabled?: boolean } | undefined;
      if (reflect?.enabled) console.log('  Reflection requested');
      const auto = details.auto as { active?: boolean; pendingTasks?: { pending?: number } } | undefined;
      if (auto?.active && auto?.pendingTasks?.pending) {
        console.log(`  Auto-mode: ${auto.pendingTasks.pending} pending tasks`);
      }
      const sync = details.sync as { flushed?: number } | undefined;
      if (sync?.flushed) console.log(`  Flushed ${sync.flushed} unique increment(s)`);
    }
  }

  return result;
}
