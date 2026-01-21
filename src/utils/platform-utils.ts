/**
 * Platform Utilities - Cross-platform OS operations
 *
 * Abstracts platform-specific operations for macOS, Linux, and Windows
 * Enhanced for process lifecycle management with async API, logger injection,
 * and system notifications
 */

import { exec, execSync } from 'child_process';
import { stat, mkdir, rmdir } from 'fs/promises';
import { Logger, consoleLogger } from './logger.js';

export type Platform = 'darwin' | 'linux' | 'win32';

/**
 * Gets the current platform
 */
export function getCurrentPlatform(): Platform {
  return process.platform as Platform;
}

/**
 * Checks if a process exists (cross-platform)
 *
 * @param pid - Process ID to check
 * @returns true if process exists
 */
export function checkProcessExists(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return output.includes(String(pid));
    } else {
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Gets file modification time in seconds since epoch (cross-platform)
 *
 * @param filePath - Path to file
 * @returns Modification time in seconds since epoch
 */
export function getFileMtime(filePath: string): number {
  try {
    if (process.platform === 'darwin') {
      const output = execSync(`stat -f %m "${filePath}"`, { encoding: 'utf-8' });
      return parseInt(output.trim(), 10);
    } else if (process.platform === 'win32') {
      const output = execSync(
        `powershell -Command "(Get-Item '${filePath}').LastWriteTime.ToFileTimeUtc()"`,
        { encoding: 'utf-8' }
      );
      const fileTime = parseInt(output.trim(), 10);
      return Math.floor((fileTime - 116444736000000000) / 10000000);
    } else {
      const output = execSync(`stat -c %Y "${filePath}"`, { encoding: 'utf-8' });
      return parseInt(output.trim(), 10);
    }
  } catch {
    return 0;
  }
}

/**
 * Kills a process (cross-platform)
 *
 * @param pid - Process ID to kill
 * @param signal - Signal to send (default: SIGTERM)
 */
export function killProcess(pid: number, signal: string = 'SIGTERM'): void {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(pid, signal);
    }
  } catch {
    // Process may not exist, ignore
  }
}

/**
 * Acquires a file lock using atomic directory creation (cross-platform)
 *
 * @param lockPath - Path to lock directory
 * @returns true if lock acquired
 */
export function acquireFileLock(lockPath: string): boolean {
  const fs = require('fs');
  try {
    fs.mkdirSync(lockPath, { recursive: false });
    return true;
  } catch (err: any) {
    if (err.code === 'EEXIST') {
      return false; // Lock already exists
    }
    throw err;
  }
}

// ===== Enhanced Class-Based API with Async Support =====

export interface PlatformUtilsOptions {
  logger?: Logger;
}

/**
 * Enhanced cross-platform utility functions with async API and logger injection
 */
export class PlatformUtils {
  private platform: Platform;
  private logger: Logger;

  constructor(options: PlatformUtilsOptions = {}) {
    this.platform = process.platform as Platform;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Check if current platform is Windows
   */
  isWindows(): boolean {
    return this.platform === 'win32';
  }

  /**
   * Check if current platform is POSIX (macOS or Linux)
   */
  isPosix(): boolean {
    return this.platform === 'darwin' || this.platform === 'linux';
  }

  /**
   * Check if a process exists by PID (async)
   *
   * - macOS/Linux: kill -0 $pid (signal 0 = existence check)
   * - Windows: tasklist /FI "PID eq $pid"
   *
   * @param pid Process ID to check
   * @returns true if process exists, false otherwise
   */
  async checkProcessExistsAsync(pid: number): Promise<boolean> {
    try {
      if (this.isWindows()) {
        const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          windowsHide: true
        });
        return output.includes(pid.toString());
      } else {
        // Signal 0 = check existence without actually sending a signal
        process.kill(pid, 0);
        return true;
      }
    } catch (err: any) {
      if (err.code === 'ESRCH') {
        // No such process
        return false;
      }
      if (err.code === 'EPERM') {
        // Process exists but we don't have permission to signal it
        return true;
      }
      this.logger.error(`Error checking process ${pid}:`, err);
      return false;
    }
  }

  /**
   * Get file modification time (async, uses fs.stat for cross-platform)
   *
   * @param path File path
   * @returns Modification time in seconds since epoch
   */
  async getFileMtimeAsync(path: string): Promise<number> {
    try {
      const stats = await stat(path);
      return Math.floor(stats.mtimeMs / 1000);
    } catch (err) {
      this.logger.error(`Error getting mtime for ${path}:`, err);
      throw err;
    }
  }

  /**
   * Acquire file lock using atomic mkdir (async)
   *
   * @param lockPath Path to lock directory
   * @param timeoutMs Maximum time to wait for lock (default: 5000ms)
   * @returns true if lock acquired, false if timeout
   */
  async acquireFileLockAsync(lockPath: string, timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        await mkdir(lockPath, { recursive: false });
        return true; // Lock acquired
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          // Lock exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        this.logger.error(`Error acquiring lock at ${lockPath}:`, err);
        throw err;
      }
    }

    this.logger.warn(`Lock acquisition timeout after ${timeoutMs}ms: ${lockPath}`);
    return false;
  }

  /**
   * Release file lock (async)
   *
   * @param lockPath Path to lock directory
   */
  async releaseFileLockAsync(lockPath: string): Promise<void> {
    try {
      await rmdir(lockPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        this.logger.error(`Error releasing lock at ${lockPath}:`, err);
        throw err;
      }
    }
  }

  /**
   * Kill process with signal (async)
   *
   * @param pid Process ID to kill
   * @param signal Signal to send (default: SIGTERM)
   */
  async killProcessAsync(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    try {
      if (this.isWindows()) {
        execSync(`taskkill /PID ${pid} /F`, {
          stdio: 'ignore',
          windowsHide: true
        });
        this.logger.debug(`Killed process ${pid} (Windows taskkill /F)`);
      } else {
        process.kill(pid, signal);
        this.logger.debug(`Killed process ${pid} with signal ${signal}`);
      }
    } catch (err: any) {
      if (err.code === 'ESRCH') {
        this.logger.debug(`Process ${pid} doesn't exist (already terminated)`);
        return;
      }
      this.logger.error(`Error killing process ${pid}:`, err);
      throw err;
    }
  }

  /**
   * Kill process with graceful fallback (SIGTERM → SIGKILL)
   *
   * @param pid Process ID to kill
   * @param gracePeriodMs Time to wait after SIGTERM before SIGKILL (default: 2000ms)
   */
  async killProcessGracefully(pid: number, gracePeriodMs: number = 2000): Promise<void> {
    const exists = await this.checkProcessExistsAsync(pid);
    if (!exists) {
      this.logger.debug(`Process ${pid} doesn't exist, skipping kill`);
      return;
    }

    try {
      // Step 1: Send SIGTERM (graceful shutdown)
      await this.killProcessAsync(pid, 'SIGTERM');
      this.logger.debug(`Sent SIGTERM to process ${pid}, waiting ${gracePeriodMs}ms`);

      // Step 2: Wait for grace period
      await new Promise(resolve => setTimeout(resolve, gracePeriodMs));

      // Step 3: Check if process still exists
      const stillExists = await this.checkProcessExistsAsync(pid);
      if (!stillExists) {
        this.logger.debug(`Process ${pid} terminated gracefully after SIGTERM`);
        return;
      }

      // Step 4: Force kill with SIGKILL
      this.logger.warn(`Process ${pid} didn't terminate after SIGTERM, sending SIGKILL`);
      await this.killProcessAsync(pid, 'SIGKILL');
      this.logger.debug(`Sent SIGKILL to process ${pid}`);
    } catch (err) {
      this.logger.error(`Error during graceful kill of process ${pid}:`, err);
      throw err;
    }
  }

  /**
   * Send system notification
   *
   * - macOS: osascript (AppleScript)
   * - Linux: notify-send (if available)
   * - Windows: PowerShell toast notification
   *
   * Fails gracefully if notification system is unavailable
   *
   * IMPORTANT: Notifications MUST be explicit! Always:
   * 1. Start title with "SpecWeave:" to identify source
   * 2. Use explicit message describing what happened
   * 3. Include "No action needed" for informational notifications
   *
   * @param title Notification title (should start with "SpecWeave:")
   * @param body Notification body text (should be explicit about what happened)
   * @param sound Optional sound name for macOS (default: "Pop" for neutral notifications)
   */
  async sendNotification(title: string, body: string, sound?: string): Promise<void> {
    try {
      if (this.platform === 'darwin') {
        this.sendNotificationMacOS(title, body, sound);
      } else if (this.platform === 'linux') {
        this.sendNotificationLinux(title, body);
      } else if (this.platform === 'win32') {
        this.sendNotificationWindows(title, body);
      }
      this.logger.debug(`Sent notification: ${title}`);
    } catch (err) {
      this.logger.warn(`Failed to send notification "${title}": ${err}`);
    }
  }

  /**
   * macOS notification using osascript (NON-BLOCKING)
   *
   * CRITICAL: Uses exec() without await to prevent blocking the main thread!
   * Notifications should NEVER block Claude Code execution.
   *
   * @param title Notification title (should start with "SpecWeave:")
   * @param body Notification body (should be explicit about what happened)
   * @param sound Optional sound name (default: "Pop" for neutral notifications)
   */
  private sendNotificationMacOS(title: string, body: string, sound: string = 'Pop'): void {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');
    const soundParam = sound ? ` sound name "${sound}"` : '';
    const cmd = `osascript -e 'display notification "${escapedBody}" with title "${escapedTitle}"${soundParam}'`;

    // Fire-and-forget: DON'T await or block!
    exec(cmd, (error) => {
      if (error) {
        this.logger.debug(`Notification failed (non-critical): ${error.message}`);
      }
    });
  }

  /**
   * Linux notification using notify-send (NON-BLOCKING)
   *
   * CRITICAL: Fire-and-forget pattern to prevent blocking Claude Code!
   * Notifications should NEVER block execution.
   */
  private sendNotificationLinux(title: string, body: string): void {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');
    const cmd = `notify-send "${escapedTitle}" "${escapedBody}" --urgency=normal`;

    // Fire-and-forget: DON'T wait for completion!
    exec(cmd, (error) => {
      if (error) {
        this.logger.debug(`Notification failed (non-critical): ${error.message}`);
      }
    });
  }

  /**
   * Windows notification using PowerShell toast (NON-BLOCKING)
   *
   * CRITICAL: Fire-and-forget pattern to prevent blocking Claude Code!
   * Notifications should NEVER block execution.
   */
  private sendNotificationWindows(title: string, body: string): void {
    const escapedTitle = title.replace(/'/g, "''");
    const escapedBody = body.replace(/'/g, "''");
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
      $xml = [xml]$template.GetXml();
      $xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${escapedTitle}')) | Out-Null;
      $xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode('${escapedBody}')) | Out-Null;
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml);
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('SpecWeave').Show($toast);
    `;

    // Fire-and-forget: DON'T wait for completion!
    exec(`powershell -Command "${psScript}"`, (error) => {
      if (error) {
        this.logger.debug(`Notification failed (non-critical): ${error.message}`);
      }
    });
  }
}

// Export singleton instance for convenience
export const platformUtils = new PlatformUtils();
