/**
 * Cross-Platform Hook Utilities
 *
 * Provides platform detection and process spawning for Windows, macOS, and Linux.
 * Optimized for hook execution with minimal overhead.
 *
 * @module hooks/platform
 */

import { spawn, SpawnOptions, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Platform types
 */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * WSL availability status
 */
export interface WslStatus {
  available: boolean;
  version?: 1 | 2;
  defaultDistro?: string;
}

/**
 * Cached platform info (computed once at module load)
 */
const platformInfo = {
  platform: process.platform as NodeJS.Platform,
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isPosix: process.platform !== 'win32',
};

/**
 * Get normalized platform identifier
 */
export function getPlatform(): Platform {
  if (platformInfo.isWindows) return 'windows';
  if (platformInfo.isMacOS) return 'macos';
  if (platformInfo.isLinux) return 'linux';
  return 'unknown';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return platformInfo.isWindows;
}

/**
 * Check if running on POSIX system (macOS, Linux)
 */
export function isPosix(): boolean {
  return platformInfo.isPosix;
}

/**
 * Check WSL availability on Windows
 *
 * Checks for WSL installation without requiring it.
 * Returns cached result for performance.
 */
let wslStatusCache: WslStatus | null = null;

export function checkWslStatus(): WslStatus {
  if (wslStatusCache !== null) {
    return wslStatusCache;
  }

  if (!platformInfo.isWindows) {
    wslStatusCache = { available: false };
    return wslStatusCache;
  }

  try {
    // Check if wsl.exe exists
    const wslPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'wsl.exe');
    if (!fs.existsSync(wslPath)) {
      wslStatusCache = { available: false };
      return wslStatusCache;
    }

    // WSL exists - we could check version but keep it simple for now
    wslStatusCache = { available: true };
    return wslStatusCache;
  } catch {
    wslStatusCache = { available: false };
    return wslStatusCache;
  }
}

/**
 * Find project root by looking for .specweave directory
 *
 * @param startDir - Directory to start searching from
 * @returns Project root path or null if not found
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const specweavePath = path.join(current, '.specweave');
    if (fs.existsSync(specweavePath) && fs.statSync(specweavePath).isDirectory()) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Spawn a detached background process (cross-platform)
 *
 * On Windows: Uses 'start' command or direct spawn with detached option
 * On POSIX: Uses spawn with detached + unref
 *
 * @param command - Command to run
 * @param args - Arguments
 * @param options - Spawn options
 * @returns ChildProcess or null if spawn failed
 */
export function spawnDetached(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): ChildProcess | null {
  try {
    const spawnOptions: SpawnOptions = {
      ...options,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    };

    // Direct spawn with detached + windowsHide works on all platforms
    // On Windows: windowsHide prevents console window, detached allows orphaning
    // On POSIX: detached creates new process group, unref allows parent to exit
    // NOTE: Previously used cmd.exe /c start /b on Windows, but that has
    // argument escaping issues and loses exit codes. Direct spawn is more reliable.
    const child = spawn(command, args, spawnOptions);
    child.unref();
    return child;
  } catch {
    return null;
  }
}

/**
 * Spawn Node.js script in background (cross-platform)
 *
 * Optimized for spawning Node.js scripts as background daemons.
 *
 * @param scriptPath - Path to the Node.js script
 * @param args - Arguments to pass to the script
 * @param cwd - Working directory
 * @returns ChildProcess or null if spawn failed
 */
export function spawnNodeBackground(
  scriptPath: string,
  args: string[] = [],
  cwd?: string
): ChildProcess | null {
  const nodeExecutable = process.execPath;

  try {
    const spawnOptions: SpawnOptions = {
      cwd: cwd || process.cwd(),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        SPECWEAVE_BACKGROUND_PROCESS: '1',
      },
    };

    // Same spawn logic works for both Windows and POSIX
    // - Windows: windowsHide prevents console window, detached allows orphaning
    // - POSIX: detached creates new process group, unref allows parent to exit
    const child = spawn(nodeExecutable, [scriptPath, ...args], spawnOptions);
    child.unref();
    return child;
  } catch {
    return null;
  }
}

/**
 * Read JSON file safely with error handling
 *
 * @param filePath - Path to JSON file
 * @returns Parsed JSON or null if failed
 */
export function readJsonSafe<T = unknown>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON file safely with atomic write
 *
 * @param filePath - Path to JSON file
 * @param data - Data to write
 * @returns true if successful, false otherwise
 */
export function writeJsonSafe(filePath: string, data: unknown): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Atomic write: write to temp file, then rename
    const tempPath = `${filePath}.tmp.${process.pid}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Append to log file (creates directory if needed)
 *
 * @param logPath - Path to log file
 * @param message - Message to append
 */
export function appendLog(logPath: string, message: string): void {
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf-8');
  } catch {
    // Silently ignore log failures
  }
}

/**
 * Cross-platform file locking using directory creation
 *
 * mkdir is atomic on all platforms (Windows, macOS, Linux)
 */
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
   *
   * @param staleLockSeconds - Consider lock stale after this many seconds
   * @returns true if lock acquired, false if held by another process
   */
  acquire(staleLockSeconds = 300): boolean {
    try {
      // Try atomic mkdir
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

        // Check if process is still running
        if (!isNaN(lockPid)) {
          try {
            process.kill(lockPid, 0); // Signal 0 just checks existence
            return false; // Process is running, lock is valid
          } catch {
            // Process not running, check age
          }
        }

        // Check lock age
        const stat = fs.statSync(this.pidFile);
        const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;

        if (ageSeconds > staleLockSeconds) {
          // Stale lock - remove and retry
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

/**
 * Hook result interface (matches Claude Code hook protocol)
 */
export interface HookResult {
  continue: boolean;
  systemMessage?: string;
  error?: string;
}

/**
 * Output hook result to stdout
 */
export function outputHookResult(result: HookResult): void {
  console.log(JSON.stringify(result));
}

/**
 * Consume stdin (required for hooks that receive input)
 */
export async function consumeStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    // Handle case where stdin is empty/closed
    if (process.stdin.isTTY) {
      resolve('');
    }
  });
}
