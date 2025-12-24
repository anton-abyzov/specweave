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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically resolve and import the job launcher module.
 * Searches multiple possible locations to handle different installation contexts:
 * 1. Local development (relative from this file)
 * 2. Compiled dist/ output
 * 3. Marketplace/cache installation
 * 4. CLAUDE_PLUGIN_ROOT environment variable
 */
async function importJobLauncher(projectPath: string, log: (msg: string) => void): Promise<typeof import('../../../../src/core/background/job-launcher.js')> {
  const candidatePaths = [
    // Local development - relative from this plugin file
    path.resolve(__dirname, '../../../../src/core/background/job-launcher.js'),
    // Compiled dist output - from project root
    path.join(projectPath, 'dist/src/core/background/job-launcher.js'),
    // Project src - from project root (for tsx/ts-node)
    path.join(projectPath, 'src/core/background/job-launcher.ts'),
    // Marketplace cache - glob pattern requires manual resolution
    ...(process.env.HOME ? [
      path.join(process.env.HOME, '.claude/plugins/cache/specweave/sw/latest/dist/src/core/background/job-launcher.js'),
    ] : []),
    // CLAUDE_PLUGIN_ROOT - if set
    ...(process.env.CLAUDE_PLUGIN_ROOT ? [
      path.join(process.env.CLAUDE_PLUGIN_ROOT, 'dist/src/core/background/job-launcher.js'),
      path.join(process.env.CLAUDE_PLUGIN_ROOT, 'src/core/background/job-launcher.js'),
    ] : []),
  ];

  log(`Searching for job-launcher module...`);
  for (const candidatePath of candidatePaths) {
    log(`  Checking: ${candidatePath}`);
    if (fs.existsSync(candidatePath)) {
      log(`  Found: ${candidatePath}`);
      try {
        // Convert to file:// URL for ESM import
        const moduleUrl = `file://${candidatePath}`;
        const module = await import(moduleUrl);
        return module;
      } catch (importErr: any) {
        log(`  Import failed: ${importErr.message}`);
        // Continue to next candidate
      }
    }
  }

  throw new Error(`Could not find job-launcher module. Searched:\n${candidatePaths.map(p => `  - ${p}`).join('\n')}`);
}

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
  log(`Script location: ${__filename}`);

  try {
    // Dynamically import the job launcher with path resolution
    const { launchCodebaseRescanJob } = await importJobLauncher(projectPath, log);

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
