#!/usr/bin/env node
/**
 * Launch Codebase Rescan Job
 *
 * CLI wrapper to launch the codebase rescan background job.
 * Called by living-specs-handler.sh when increment.done event fires.
 *
 * Usage:
 *   node launch-codebase-rescan.js <increment-id> [feature-id]
 *
 * Example:
 *   node launch-codebase-rescan.js 0042-user-auth FS-128
 */

import * as fs from 'fs';
import * as path from 'path';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: launch-codebase-rescan.js <increment-id> [feature-id]');
    process.exit(1);
  }

  const incrementId = args[0];
  const featureId = args[1];

  // Find project root
  let projectPath = process.cwd();
  while (projectPath !== '/' && !fs.existsSync(path.join(projectPath, '.specweave'))) {
    projectPath = path.dirname(projectPath);
  }

  if (!fs.existsSync(path.join(projectPath, '.specweave'))) {
    console.error('ERROR: Could not find .specweave directory');
    process.exit(1);
  }

  // Log file for debugging
  const logFile = path.join(projectPath, '.specweave/logs/codebase-rescan.log');
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
  };

  log(`Starting codebase rescan for increment: ${incrementId}`);
  log(`Feature ID: ${featureId || 'not specified'}`);
  log(`Project path: ${projectPath}`);

  try {
    // Dynamically import the job launcher
    const { launchCodebaseRescanJob } = await import('../../../../src/core/background/job-launcher.js');

    const result = await launchCodebaseRescanJob({
      projectPath,
      closedIncrementId: incrementId,
      featureId,
      depth: 'quick' // Use quick mode for automatic post-closure scan
    });

    log(`Job launched successfully: ${result.job.id}`);
    log(`Background: ${result.isBackground}`);
    if (result.pid) {
      log(`PID: ${result.pid}`);
    }

    console.log(`Codebase rescan job launched: ${result.job.id}`);

  } catch (err: any) {
    log(`ERROR: ${err.message}`);
    log(err.stack || '');
    console.error(`Failed to launch codebase rescan: ${err.message}`);
    process.exit(1);
  }
}

main();
