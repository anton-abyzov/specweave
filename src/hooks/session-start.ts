#!/usr/bin/env node
/**
 * Session Start Hook (Cross-Platform)
 *
 * Launches background processor on session start.
 * Works on Windows, macOS, and Linux without WSL requirement.
 *
 * Windows Support Strategy:
 * 1. Git Bash (PRIMARY - required for production use)
 * 2. WSL (FALLBACK - for development/emergency only)
 * 3. Graceful degradation (skip bash handlers if neither available)
 *
 * @module hooks/session-start
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import {
  findProjectRoot,
  spawnNodeBackground,
  outputHookResult,
  consumeStdin,
  appendLog,
} from './platform.js';
import { cleanOrphanedStateFiles } from '../utils/state-cleanup.js';

// Proper cross-platform URL-to-path conversion
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if hooks are disabled
 */
function isHooksDisabled(): boolean {
  return process.env.SPECWEAVE_DISABLE_HOOKS === '1';
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Check if hooks disabled
  if (isHooksDisabled()) {
    outputHookResult({ continue: true });
    return;
  }

  // Find project root
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    outputHookResult({ continue: true });
    return;
  }

  // Consume stdin (required by hook protocol)
  await consumeStdin();

  const logFile = path.join(projectRoot, '.specweave', 'logs', 'session-start.log');

  // v1.0.254: Clean up orphaned state files on session start
  const stateDir = path.join(projectRoot, '.specweave', 'state');
  const cleaned = cleanOrphanedStateFiles(stateDir);
  if (cleaned > 0) {
    appendLog(logFile, `Cleaned ${cleaned} orphaned state files`);
  }

  const distHooksDir = path.join(projectRoot, 'node_modules', 'specweave', 'dist', 'hooks');

  // Check for processor script
  // First try: built hooks in dist (production)
  // Fallback: development mode - hooks relative to this file
  let processorScript = path.join(distHooksDir, 'processor.js');
  if (!fs.existsSync(processorScript)) {
    // Development mode - use fileURLToPath for correct cross-platform path
    processorScript = path.join(__dirname, 'processor.js');
  }

  // Launch processor in background (daemon mode)
  if (fs.existsSync(processorScript)) {
    const child = spawnNodeBackground(processorScript, ['--daemon'], projectRoot);
    if (child) {
      appendLog(logFile, `Processor started (PID: ${child.pid})`);
    }
  }

  // Check for scheduler startup
  let schedulerScript = path.join(distHooksDir, 'scheduler-startup.js');
  if (!fs.existsSync(schedulerScript)) {
    // Development mode - use fileURLToPath for correct cross-platform path
    schedulerScript = path.join(__dirname, 'scheduler-startup.js');
  }

  // Run scheduler check (synchronously for hook response)
  if (fs.existsSync(schedulerScript)) {
    try {
      // Dynamic import to run scheduler check
      const schedulerModule = await import(schedulerScript);
      if (typeof schedulerModule.checkScheduledJobs === 'function') {
        const result = await schedulerModule.checkScheduledJobs(projectRoot);
        if (result && result.systemMessage) {
          outputHookResult({ continue: true, systemMessage: result.systemMessage });
          return;
        }
      }
    } catch (err) {
      appendLog(logFile, `Scheduler check failed: ${err}`);
    }
  }

  outputHookResult({ continue: true });
}

// Run main
main().catch((err) => {
  console.error(JSON.stringify({ continue: true, error: String(err) }));
  process.exit(0); // Don't block Claude Code on hook errors
});
