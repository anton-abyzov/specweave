#!/usr/bin/env node
/**
 * Cleanup Zombies CLI
 *
 * Detects and cleans up zombie/stale processes
 *
 * Usage:
 *   node dist/src/cli/cleanup-zombies.js [threshold-seconds]
 *
 * Arguments:
 *   threshold-seconds: Heartbeat age threshold (default: 60)
 */

import { SessionRegistry } from '../utils/session-registry.js';
import { consoleLogger } from '../utils/logger.js';
import * as childProcess from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const exec = util.promisify(childProcess.exec);

// Cleanup logging
function logCleanupAction(level: string, action: string, details: string): void {
  const logDir = path.join(process.cwd(), '.specweave', 'logs');
  const logFile = path.join(logDir, 'cleanup.log');

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [${action}] ${details}\n`;

  try {
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (err) {
    // If we can't log, just continue
    console.error('Failed to write cleanup log:', err);
  }
}

async function killProcess(pid: number, signal: string = 'SIGTERM'): Promise<void> {
  try {
    process.kill(pid, signal);
  } catch (err) {
    // Process may not exist, ignore
  }
}

async function validatePidIsSpecWeave(pid: number): Promise<boolean> {
  try {
    const { stdout } = await exec(`ps -p ${pid} -o command= || true`);
    const command = stdout.trim().toLowerCase();

    // Valid SpecWeave/Claude processes
    const validPatterns = [
      'claude',
      'specweave',
      'cat.*eof',
      'esbuild',
      'processor.sh',
      'session-watchdog',
      'heartbeat.sh',
      'node.*specweave',
      'bash.*specweave',
    ];

    return validPatterns.some((pattern) => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });
  } catch {
    // If we can't determine, err on the side of caution
    return false;
  }
}

async function killZombieProcesses(
  registry: SessionRegistry
): Promise<{ killed: number; skipped: number }> {
  let killedCount = 0;
  let skippedCount = 0;

  // Pattern 1: Heredoc zombies
  try {
    const { stdout } = await exec("pgrep -f 'cat.*EOF' || true");
    const pids = stdout
      .trim()
      .split('\n')
      .filter((p) => p);

    for (const pidStr of pids) {
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid)) {
        await killProcess(pid, 'SIGKILL');
        const msg = `Killed heredoc zombie: PID ${pid}`;
        console.log(msg);
        logCleanupAction('INFO', 'KILL_ZOMBIE', `heredoc cat EOF process - PID ${pid}`);
        killedCount++;
      }
    }
  } catch (err) {
    // Ignore errors
  }

  // Pattern 2: Stale esbuild services (>1 hour old)
  try {
    const { stdout } = await exec("pgrep -f 'esbuild.*--service' || true");
    const pids = stdout
      .trim()
      .split('\n')
      .filter((p) => p);

    for (const pidStr of pids) {
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid)) {
        // Check age using ps
        try {
          const { stdout: psOut } = await exec(`ps -o etime= -p ${pid}`);
          const etime = psOut.trim();

          // Parse elapsed time (format: [[dd-]hh:]mm:ss)
          const parts = etime.split(/[-:]/);
          let totalSeconds = 0;

          if (parts.length >= 2) {
            const seconds = parseInt(parts[parts.length - 1], 10);
            const minutes = parseInt(parts[parts.length - 2], 10);
            totalSeconds = minutes * 60 + seconds;

            if (parts.length >= 3) {
              const hours = parseInt(parts[parts.length - 3], 10);
              totalSeconds += hours * 3600;
            }

            if (parts.length >= 4) {
              const days = parseInt(parts[parts.length - 4], 10);
              totalSeconds += days * 86400;
            }
          }

          // Kill if older than 1 hour
          if (totalSeconds > 3600) {
            await killProcess(pid, 'SIGKILL');
            const ageMinutes = Math.floor(totalSeconds / 60);
            console.log(`Killed stale esbuild: PID ${pid} (age: ${ageMinutes}m)`);
            logCleanupAction('INFO', 'KILL_ZOMBIE', `stale esbuild service - PID ${pid} - age ${ageMinutes}m`);
            killedCount++;
          }
        } catch (err) {
          // Ignore errors
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }

  // Pattern 3: Orphaned processor.sh daemons (not in registry)
  try {
    const { stdout } = await exec("pgrep -f 'processor\\.sh.*--daemon' || true");
    const pids = stdout
      .trim()
      .split('\n')
      .filter((p) => p);

    for (const pidStr of pids) {
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid)) {
        // Check if this processor is registered in any session
        const sessions = await registry.getAllSessions();
        const isRegistered = sessions.some((s) => s.child_pids?.includes(pid) || s.pid === pid);

        if (!isRegistered) {
          // Orphaned processor daemon - kill it
          await killProcess(pid, 'SIGTERM');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await killProcess(pid, 'SIGKILL');
          console.log(`Killed orphaned processor daemon: PID ${pid}`);
          logCleanupAction('INFO', 'KILL_ZOMBIE', `orphaned processor.sh daemon - PID ${pid} - not in registry`);
          killedCount++;
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }

  return { killed: killedCount, skipped: skippedCount };
}

async function main() {
  const thresholdArg = process.argv[2];
  const threshold = thresholdArg ? parseInt(thresholdArg, 10) : 60;

  if (isNaN(threshold)) {
    console.error('Invalid threshold:', thresholdArg);
    process.exit(1);
  }

  const registry = new SessionRegistry(process.cwd(), { logger: consoleLogger });

  try {
    // Get stale sessions
    const staleSessions = await registry.getStaleSessions(threshold);

    let totalKilled = 0;

    // Kill stale session processes
    for (const staleInfo of staleSessions) {
      const { session, pid_exists } = staleInfo;

      const staleAge = Math.floor(staleInfo.stale_duration_seconds);
      console.log(
        `Found stale session: ${session.session_id} (PID: ${session.pid}, ${staleAge}s old)`
      );
      logCleanupAction('INFO', 'DETECT_STALE', `session ${session.session_id} - PID ${session.pid} - age ${staleAge}s`);

      // PID validation: ensure process is SpecWeave-related
      if (pid_exists) {
        const isValid = await validatePidIsSpecWeave(session.pid);
        if (!isValid) {
          console.log(`  ⚠️  Skipping PID ${session.pid} - not a SpecWeave process`);
          logCleanupAction('WARN', 'SKIP_PID', `PID ${session.pid} not a SpecWeave process - removed from registry only`);
          // Remove from registry but don't kill
          await registry.removeSession(session.session_id);
          continue;
        }
      }

      // Kill parent process
      if (pid_exists) {
        await killProcess(session.pid, 'SIGTERM');
        // Wait 2 seconds, then SIGKILL if still exists
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await killProcess(session.pid, 'SIGKILL');
        console.log(`  Killed parent PID: ${session.pid}`);
        logCleanupAction('INFO', 'KILL_PARENT', `session ${session.session_id} - PID ${session.pid} - SIGTERM -> SIGKILL`);
        totalKilled++;
      }

      // Kill child processes
      if (session.child_pids && session.child_pids.length > 0) {
        for (const childPid of session.child_pids) {
          await killProcess(childPid, 'SIGTERM');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await killProcess(childPid, 'SIGKILL');
          console.log(`  Killed child PID: ${childPid}`);
          logCleanupAction('INFO', 'KILL_CHILD', `session ${session.session_id} - child PID ${childPid}`);
          totalKilled++;
        }
      }

      // Remove from registry
      await registry.removeSession(session.session_id);
      logCleanupAction('INFO', 'REMOVE_SESSION', `session ${session.session_id} removed from registry`);
    }

    // Kill zombie processes by pattern
    const zombieResults = await killZombieProcesses(registry);
    totalKilled += zombieResults.killed;

    if (totalKilled > 0) {
      console.log(`\nTotal processes cleaned up: ${totalKilled}`);
      logCleanupAction('INFO', 'SUMMARY', `Total processes cleaned: ${totalKilled}`);

      // Send notification if >3 processes cleaned
      // Use explicit, user-friendly messages (not vague alerts!)
      // CRITICAL: Fire-and-forget to prevent blocking cleanup completion!
      if (totalKilled > 3) {
        const title = 'SpecWeave: Cleanup Done';
        const message = `Cleaned up ${totalKilled} zombie processes. No action needed.`;
        // Use "Pop" sound (neutral) instead of alarming sounds
        const sound = 'Pop';

        // Fire-and-forget: DON'T await! Notifications should NEVER block cleanup
        if (process.platform === 'darwin') {
          // macOS notification with explicit SpecWeave branding
          childProcess.exec(
            `osascript -e 'display notification "${message}" with title "${title}" sound name "${sound}"'`,
            (error) => {
              if (error) {
                logCleanupAction('WARN', 'NOTIFICATION', `Failed to send notification: ${error.message}`);
              } else {
                logCleanupAction('INFO', 'NOTIFICATION', `Sent notification - ${totalKilled} processes cleaned`);
              }
            }
          );
        } else if (process.platform === 'linux') {
          // Linux notification
          childProcess.exec(`notify-send "${title}" "${message}" --urgency=low`, (error) => {
            if (error) {
              logCleanupAction('WARN', 'NOTIFICATION', `Failed to send notification: ${error.message}`);
            } else {
              logCleanupAction('INFO', 'NOTIFICATION', `Sent notification - ${totalKilled} processes cleaned`);
            }
          });
        } else if (process.platform === 'win32') {
          // Windows notification (PowerShell)
          const psScript = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; $null`;
          childProcess.exec(`powershell -Command "${psScript}"`, (error) => {
            if (error) {
              logCleanupAction('WARN', 'NOTIFICATION', `Failed to send notification: ${error.message}`);
            } else {
              logCleanupAction('INFO', 'NOTIFICATION', `Sent notification - ${totalKilled} processes cleaned`);
            }
          });
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

main();
