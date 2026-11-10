/**
 * Dashboard Command
 *
 * Launches a single-instance per-machine dashboard for real-time SpecWeave observability.
 * If a dashboard is already running, registers the project and opens browser to it.
 *
 * @module cli/commands/dashboard
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import chalk from 'chalk';
import { findAvailablePort } from '../../utils/docs-preview/server-manager.js';
import type { DashboardLockFile } from '../../dashboard/types.js';
import { findEffectiveRoot } from '../../utils/find-project-root.js';
import { pathToProjectId } from '../../dashboard/project-id.js';

const LOCK_FILE = path.join(process.env.HOME || '', '.specweave-dashboard.json');

export interface DashboardOptions {
  port?: string;
  browser?: boolean;
}

export async function dashboardCommand(options: DashboardOptions = {}): Promise<void> {
  // The real folder, so a symlinked spelling of the same checkout gets the same link.
  const found = findEffectiveRoot();
  const projectRoot = found ? realPath(found) : null;

  if (!projectRoot) {
    console.log(chalk.red(`No SpecWeave project found: no .specweave/config.json in ${process.cwd()} or any parent directory`));
    console.log(chalk.dim('Run `specweave init` first.'));
    process.exitCode = 1;
    return;
  }

  // Check if dashboard is already running
  const existing = readLockFile();
  if (existing && isProcessAlive(existing.pid)) {
    // Dashboard already running — register this project and open browser
    const projectSlug = pathToSlug(projectRoot);
    const url = `http://localhost:${existing.port}/?project=${projectSlug}`;

    // Register project via API
    try {
      await fetch(`http://localhost:${existing.port}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectRoot }),
      });
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
    console.log(`  ${chalk.cyan('Timeline:')} ${chalk.underline(`http://localhost:${existing.port}/timeline?project=${projectSlug}`)}`);
    console.log(`  ${chalk.cyan('Project:')} ${projectRoot}`);
    console.log(`  ${chalk.dim('Already running (PID ' + existing.pid + ')')}`);
    printRemoteHint(existing.port);
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

  const { DashboardServer } = await import('../../dashboard/server/dashboard-server.js');

  const server = new DashboardServer({
    port,
    projectRoots: [projectRoot],
    openBrowser: options.browser !== false,
  });

  const instance = await server.start();

  // Write lock file
  writeLockFile({ port, pid: process.pid, startedAt: new Date().toISOString(), projects: [projectRoot] });

  const projectSlug = pathToSlug(projectRoot);
  const url = `${instance.url}/?project=${projectSlug}`;

  console.log('');
  console.log(chalk.bold.green('  SpecWeave Dashboard'));
  console.log(chalk.dim('  ────────────────────'));
  console.log(`  ${chalk.cyan('URL:')}     ${chalk.underline(url)}`);
  console.log(`  ${chalk.cyan('Timeline:')} ${chalk.underline(`${instance.url}/timeline?project=${projectSlug}`)}`);
  console.log(`  ${chalk.cyan('Project:')} ${projectRoot}`);
  console.log(`  ${chalk.cyan('Machine:')} ${os.hostname()}`);
  console.log(`  ${chalk.cyan('PID:')}     ${process.pid}`);
  printRemoteHint(port);
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
  return pathToProjectId(p);
}

function realPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

/**
 * The dashboard listens on this machine's loopback only. Over SSH, or on a
 * Linux machine with no display, `localhost` in the reader's browser is a
 * different computer, so say how to reach this one.
 */
function printRemoteHint(port: number): void {
  const remote = Boolean(process.env.SSH_CONNECTION || process.env.SSH_TTY);
  const headless = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
  if (!remote && !headless) return;
  const user = os.userInfo().username;
  console.log('');
  console.log(chalk.dim(`  This dashboard is on ${os.hostname()} and answers only on its own localhost.`));
  console.log(chalk.dim('  From another computer, forward a port and open http://localhost:' + (port + 1) + '/ there:'));
  console.log(`  ${chalk.cyan(`ssh -N -L ${port + 1}:localhost:${port} ${user}@${os.hostname()}`)}`);
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
  // No display to open a browser on: the remote hint above says how to reach the page.
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return;
  try {
    const { default: open } = await import('open');
    await open(url);
  } catch { /* best effort */ }
}
