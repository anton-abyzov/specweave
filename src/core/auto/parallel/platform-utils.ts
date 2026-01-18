/**
 * Platform Utilities for Cross-Platform Compatibility
 *
 * Provides utilities for handling platform-specific differences
 * across Windows, macOS, and Linux.
 */

import { spawn as nodeSpawn, SpawnOptions, ChildProcess } from 'child_process';
import { platform as osPlatform } from 'os';
import { join, normalize, sep } from 'path';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return osPlatform() === 'win32';
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return osPlatform() === 'darwin';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return osPlatform() === 'linux';
}

/**
 * Get the current platform name
 */
export function getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const p = osPlatform();
  if (p === 'win32') return 'windows';
  if (p === 'darwin') return 'macos';
  if (p === 'linux') return 'linux';
  return 'unknown';
}

// ============================================================================
// PATH HANDLING
// ============================================================================

/**
 * Normalize path separators to forward slashes
 * Useful for consistent path handling across platforms
 */
export function normalizePath(p: string): string {
  if (!p) return p;
  // Replace backslashes with forward slashes
  return p.replace(/\\/g, '/');
}

/**
 * Handle long paths on Windows (> 260 chars)
 * Adds \\?\ prefix for extended path support
 */
export function handleLongPath(p: string): string {
  if (!p) return p;

  // Only relevant on Windows
  if (!isWindows()) return p;

  // Already has long path prefix
  if (p.startsWith('\\\\?\\')) return p;

  // Normalize first
  const normalized = normalize(p);

  // Add prefix if path is too long
  if (normalized.length > 260) {
    return `\\\\?\\${normalized}`;
  }

  return normalized;
}

/**
 * Convert to platform-specific path
 */
export function toPlatformPath(p: string): string {
  if (!p) return p;
  if (isWindows()) {
    return p.replace(/\//g, '\\');
  }
  return p.replace(/\\/g, '/');
}

/**
 * Join paths with platform-specific separator
 */
export function joinPath(...parts: string[]): string {
  return join(...parts);
}

// ============================================================================
// SHELL & PROCESS
// ============================================================================

/**
 * Get the appropriate shell for the current platform
 */
export function getShell(): { shell: string; args: string[] } {
  if (isWindows()) {
    // Prefer PowerShell, fall back to cmd
    const psPath = process.env.POWERSHELL_PATH || 'powershell.exe';
    return {
      shell: psPath,
      args: ['-NoProfile', '-NonInteractive', '-Command'],
    };
  }

  // Unix-like systems
  const shellPath = process.env.SHELL || '/bin/bash';
  return {
    shell: shellPath,
    args: ['-c'],
  };
}

/**
 * Execute a command with platform-appropriate shell
 */
export interface SpawnResult {
  process: ChildProcess;
  promise: Promise<{ stdout: string; stderr: string; code: number | null }>;
}

export function spawnCommand(
  command: string,
  options: Omit<SpawnOptions, 'shell'> = {}
): SpawnResult {
  const shellInfo = getShell();

  const spawnOptions: SpawnOptions = {
    ...options,
    shell: isWindows() ? true : undefined,
    stdio: options.stdio || 'pipe',
  };

  let proc: ChildProcess;

  if (isWindows()) {
    // On Windows, use shell directly
    proc = nodeSpawn(command, [], { ...spawnOptions, shell: true });
  } else {
    // On Unix, use shell with -c
    proc = nodeSpawn(shellInfo.shell, [...shellInfo.args, command], spawnOptions);
  }

  const promise = new Promise<{ stdout: string; stderr: string; code: number | null }>(
    (resolve, reject) => {
      let stdout = '';
      let stderr = '';

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      proc.on('error', (error) => {
        reject(error);
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
    }
  );

  return { process: proc, promise };
}

/**
 * Execute a command and wait for result
 */
export async function execCommand(
  command: string,
  options: Omit<SpawnOptions, 'shell'> = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const { promise } = spawnCommand(command, options);
  return promise;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Sound types for notifications
 */
export type SoundType = 'success' | 'failure' | 'warning' | 'info';

/**
 * Play a notification sound (fails gracefully if not available)
 */
export async function playSound(type: SoundType): Promise<void> {
  try {
    if (isMacOS()) {
      const sounds: Record<SoundType, string> = {
        success: 'Glass',
        failure: 'Basso',
        warning: 'Ping',
        info: 'Pop',
      };
      const sound = sounds[type] || 'Pop';
      await execCommand(`afplay /System/Library/Sounds/${sound}.aiff 2>/dev/null || true`);
    } else if (isLinux()) {
      // Try paplay (PulseAudio) or aplay (ALSA)
      const frequencies: Record<SoundType, number> = {
        success: 800,
        failure: 300,
        warning: 600,
        info: 500,
      };
      const freq = frequencies[type] || 500;
      // Generate a simple beep using speaker-test or beep command
      await execCommand(
        `(command -v paplay && paplay /usr/share/sounds/freedesktop/stereo/complete.oga) || ` +
          `(command -v beep && beep -f ${freq} -l 200) || true`
      );
    } else if (isWindows()) {
      // Use PowerShell to play system sound
      const sounds: Record<SoundType, string> = {
        success: 'Asterisk',
        failure: 'Hand',
        warning: 'Exclamation',
        info: 'Asterisk',
      };
      const sound = sounds[type] || 'Asterisk';
      await execCommand(`[System.Media.SystemSounds]::${sound}.Play()`);
    }
  } catch {
    // Silently fail - sounds are optional
  }
}

// ============================================================================
// ENVIRONMENT
// ============================================================================

/**
 * Get environment variable with optional default
 */
export function getEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD // Azure DevOps
  );
}

/**
 * Get the home directory path
 */
export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '';
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Get current timestamp in ISO format
 */
export function timestamp(): string {
  return new Date().toISOString();
}
