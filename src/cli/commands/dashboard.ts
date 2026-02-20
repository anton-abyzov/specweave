/**
 * Dashboard Command
 *
 * Launches a single-instance per-machine dashboard for real-time SpecWeave observability.
 * If a dashboard is already running, registers the project and opens browser to it.
 *
 * @module cli/commands/dashboard
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import chalk from 'chalk';
import { findAvailablePort } from '../../utils/docs-preview/server-manager.js';
import type { DashboardLockFile } from '../../dashboard/types.js';

const LOCK_FILE = path.join(process.env.HOME || '', '.specweave-dashboard.json');

export interface DashboardOptions {
  port?: string;
  browser?: boolean;
}

export async function dashboardCommand(options: DashboardOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const specweavePath = path.join(projectRoot, '.specweave');

  if (!fs.existsSync(specweavePath)) {
    console.log(chalk.red('No SpecWeave project found in current directory.'));
    console.log(chalk.dim('Run `specweave init` first.'));
    process.exit(1);
  }

  // Check if dashboard is already running
  const existing = readLockFile();
  if (existing && isProcessAlive(existing.pid)) {
    // Dashboard already running — register this project and open browser
    const projectSlug = pathToSlug(projectRoot);
    const url = `http://localhost:${existing.port}/?project=${projectSlug}`;

    // Register project via API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (existing.authToken) {
        headers['X-Specweave-Dashboard-Token'] = existing.authToken;
      }

      const registerResponse = await fetch(`http://localhost:${existing.port}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: projectRoot }),
      });

      if (!registerResponse.ok) {
        throw new Error(`Failed to register project (HTTP ${registerResponse.status})`);
      }
    } catch {
      // Server might not be responding — fall through to start new one
      console.log(chalk.yellow('Existing dashboard not responding. Starting new instance...'));
      removeLockFile();
      return startNewDashboard(projectRoot, options);
    }

    console.log('');
    console.log(chalk.bold.green('  SpecWeave Dashboard'));
    console.log(chalk.dim('  ────────────────────'));
    console.log(`  ${chalk.cyan('URL:')}     ${chalk.underline(url)}`);
    console.log(`  ${chalk.dim('Already running (PID ' + existing.pid + ')')}`);
    console.log('');

    if (options.browser !== false) {
      await openUrl(url);
    }
    return;
  }

  // No running instance — start new one
  await startNewDashboard(projectRoot, options);
}

async function startNewDashboard(projectRoot: string, options: DashboardOptions): Promise<void> {
  const requestedPort = options.port ? parseInt(options.port, 10) : 3456;
  const port = await findAvailablePort(requestedPort, requestedPort + 20);
  const authToken = randomBytes(32).toString('hex');

  const { DashboardServer } = await import('../../dashboard/server/dashboard-server.js');

  const server = new DashboardServer({
    port,
    authToken,
    projectRoots: [projectRoot],
    openBrowser: options.browser !== false,
  });

  const instance = await server.start();

  // Write lock file
  writeLockFile({
    port,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    projects: [projectRoot],
    authToken,
  });

  const projectSlug = pathToSlug(projectRoot);
  const url = `${instance.url}/?project=${projectSlug}`;

  console.log('');
  console.log(chalk.bold.green('  SpecWeave Dashboard'));
  console.log(chalk.dim('  ────────────────────'));
  console.log(`  ${chalk.cyan('URL:')}     ${chalk.underline(url)}`);
  console.log(`  ${chalk.cyan('Project:')} ${projectRoot}`);
  console.log(`  ${chalk.cyan('PID:')}     ${process.pid}`);
  console.log('');
  console.log(chalk.dim('  Run `specweave dashboard` from other projects to add them'));
  console.log(chalk.dim('  Press Ctrl+C to stop'));
  console.log('');

  if (options.browser !== false) {
    await openUrl(url);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log(chalk.dim('\n  Shutting down dashboard...'));
    removeLockFile();
    await instance.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

/** Convert absolute path to URL-safe slug */
export function pathToSlug(p: string): string {
  return p.replace(/^\//, '').replace(/\//g, '-');
}

/** Convert slug back to path */
export function slugToPath(slug: string): string {
  return '/' + slug.replace(/-/g, '/');
}

function readLockFile(): DashboardLockFile | null {
  try {
    if (!fs.existsSync(LOCK_FILE)) return null;
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeLockFile(lock: DashboardLockFile): void {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  } catch { /* best effort */ }
}

function removeLockFile(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch { /* best effort */ }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function openUrl(url: string): Promise<void> {
  try {
    const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');
    await execFileNoThrow('open', [url]);
  } catch { /* best effort */ }
}
