/**
 * CI/CD Monitor CLI Command
 *
 * Command-line interface for starting/stopping/querying the CI/CD monitor.
 */

import { Command } from 'commander';
import { WorkflowMonitor } from '../../core/cicd/workflow-monitor.js';
import { StateManager } from '../../core/cicd/state-manager.js';
import { Notifier } from '../../core/cicd/notifier.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CI/CD monitor CLI command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (monitor status, workflow updates, notifications).
// Logger infrastructure available for future internal debug logs if needed.

/**
 * Monitor configuration from environment or .env file
 */
interface MonitorEnvConfig {
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  CICD_POLL_INTERVAL?: string;
  CICD_NOTIFICATION_CHANNELS?: string;
  CICD_WEBHOOK_URL?: string;
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): MonitorEnvConfig {
  return {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    CICD_POLL_INTERVAL: process.env.CICD_POLL_INTERVAL || '60000',
    CICD_NOTIFICATION_CHANNELS:
      process.env.CICD_NOTIFICATION_CHANNELS || 'console,file',
    CICD_WEBHOOK_URL: process.env.CICD_WEBHOOK_URL
  };
}

/**
 * Start CI/CD monitor
 */
async function startMonitor(options: any): Promise<void> {
  const config = loadConfig();

  // Validate required config
  if (!config.GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    console.error('   Set it in .env or export GITHUB_TOKEN=<your-token>');
    process.exit(1);
  }

  if (!config.GITHUB_OWNER || !config.GITHUB_REPO) {
    console.error('❌ Error: GITHUB_OWNER and GITHUB_REPO are required');
    console.error('   Set them in .env or pass as arguments');
    process.exit(1);
  }

  // Override from CLI arguments
  const owner = options.owner || config.GITHUB_OWNER;
  const repo = options.repo || config.GITHUB_REPO;
  const pollInterval = parseInt(options.interval || config.CICD_POLL_INTERVAL, 10);

  console.log('🚀 Starting CI/CD Monitor...');
  console.log(`   Repository: ${owner}/${repo}`);
  console.log(`   Poll interval: ${pollInterval}ms (${pollInterval / 1000}s)`);

  // Create state manager
  const stateManager = new StateManager();

  // Create notifier
  const notificationChannels = config.CICD_NOTIFICATION_CHANNELS!.split(',').filter(
    (c) => c.trim()
  ) as any;

  const notifier = new Notifier({
    channels: notificationChannels,
    webhookUrl: config.CICD_WEBHOOK_URL,
    debug: options.debug || false
  });

  // Create and start monitor
  const monitor = new WorkflowMonitor(
    {
      token: config.GITHUB_TOKEN!,
      owner,
      repo,
      pollInterval,
      debug: options.debug || false
    },
    stateManager
  );

  monitor.start();

  console.log('✅ Monitor started');
  console.log('   Press Ctrl+C to stop');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping monitor...');
    monitor.stop();
    console.log('✅ Monitor stopped');
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Query monitor status
 */
async function queryStatus(): Promise<void> {
  const stateManager = new StateManager();
  const state = await stateManager.loadState();

  console.log('📊 CI/CD Monitor Status\n');

  // Last poll
  if (state.lastPoll) {
    const lastPollDate = new Date(state.lastPoll);
    const elapsed = Date.now() - lastPollDate.getTime();
    console.log(`   Last poll: ${lastPollDate.toLocaleString()} (${Math.floor(elapsed / 1000)}s ago)`);
  } else {
    console.log('   Last poll: Never');
  }

  // Failure statistics
  console.log(`\n📈 Statistics:`);
  console.log(`   Total failures detected: ${state.totalFailures}`);
  console.log(`   Failures processed: ${state.totalProcessed}`);
  console.log(`   Failures fixed: ${state.totalFixed}`);

  // Unprocessed failures
  const unprocessed = Object.values(state.failures).filter((f) => !f.processed);
  console.log(`\n⏳ Unprocessed failures: ${unprocessed.length}`);

  if (unprocessed.length > 0) {
    console.log('\n   Recent unprocessed failures:');
    unprocessed.slice(0, 5).forEach((failure) => {
      console.log(`   • ${failure.workflowName} (run #${failure.runId})`);
      console.log(`     Branch: ${failure.branch}`);
      console.log(`     Detected: ${new Date(failure.detectedAt).toLocaleString()}`);
      console.log(`     URL: ${failure.url}\n`);
    });

    if (unprocessed.length > 5) {
      console.log(`   ... and ${unprocessed.length - 5} more`);
    }
  }
}

/**
 * Clear monitor state (reset)
 */
async function clearState(): Promise<void> {
  const statePath = path.join(process.cwd(), '.specweave/state/cicd-monitor.json');

  if (await fs.pathExists(statePath)) {
    await fs.remove(statePath);
    console.log('✅ State cleared');
  } else {
    console.log('ℹ️  No state to clear');
  }
}

/**
 * Register cicd-monitor command
 */
export function registerCICDMonitorCommand(program: Command): void {
  const monitorCmd = program
    .command('cicd-monitor')
    .description('CI/CD workflow monitoring and auto-fix');

  // Start monitor
  monitorCmd
    .command('start')
    .description('Start monitoring GitHub Actions workflows')
    .option('-o, --owner <owner>', 'GitHub repository owner')
    .option('-r, --repo <repo>', 'GitHub repository name')
    .option('-i, --interval <ms>', 'Poll interval in milliseconds (default: 60000)')
    .option('-d, --debug', 'Enable debug logging')
    .action(startMonitor);

  // Query status
  monitorCmd
    .command('status')
    .description('Show monitor status and statistics')
    .action(queryStatus);

  // Clear state
  monitorCmd
    .command('clear')
    .description('Clear monitor state (reset)')
    .action(clearState);
}
