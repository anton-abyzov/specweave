/**
 * Cross-platform file locking using directory creation
 *
 * mkdir is atomic on all platforms (Windows, macOS, Linux).
 * Extracted from hooks/platform.ts for reuse in core modules.
 */

import * as fs from 'fs';
import * as path from 'path';

export class FileLock {
  private lockDir: string;
  private pidFile: string;
  private acquired = false;

  constructor(lockPath: string) {
    this.lockDir = lockPath + '.lock.d';
    this.pidFile = path.join(this.lockDir, 'pid');
  }

  /**
   * Try to acquire lock
   * @param staleLockSeconds - Consider lock stale after this many seconds
   * @returns true if lock acquired, false if held by another process
   */
  acquire(staleLockSeconds = 300): boolean {
    try {
      fs.mkdirSync(this.lockDir);
      fs.writeFileSync(this.pidFile, String(process.pid), 'utf-8');
      this.acquired = true;
      return true;
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        return false;
      }

      // Lock exists - check if stale
      try {
        const lockPid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim(), 10);

        if (!isNaN(lockPid)) {
          try {
            process.kill(lockPid, 0);
            return false; // Process is running, lock is valid
          } catch {
            // Process not running, check age
          }
        }

        const stat = fs.statSync(this.pidFile);
        const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;

        if (ageSeconds > staleLockSeconds) {
          fs.rmSync(this.lockDir, { recursive: true, force: true });
          return this.acquire(staleLockSeconds);
        }

        return false;
      } catch {
        return false;
      }
    }
  }

  /**
   * Release the lock
   */
  release(): void {
    if (this.acquired) {
      try {
        fs.rmSync(this.lockDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      this.acquired = false;
    }
  }
}
