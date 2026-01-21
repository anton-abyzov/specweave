/**
 * Path Utilities for Windows Long Path Support
 *
 * Handles Windows paths longer than 260 characters using the \\?\ prefix.
 * Provides graceful degradation when long path support is disabled.
 *
 * Windows Long Path Support:
 * - Enabled by default in Windows 10 1607+ (with registry key)
 * - Registry key: HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1
 * - Also requires application manifest with longPathAware = true
 *
 * @module core/lazy-loading/path-utils
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/** Windows max path length without long path support */
export const WIN_MAX_PATH = 260;

/** Windows max path with \\?\ prefix */
export const WIN_LONG_PATH_MAX = 32767;

/** Long path prefix for Windows */
export const WIN_LONG_PATH_PREFIX = '\\\\?\\';

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return os.platform() === 'win32';
}

/**
 * Check if long paths are enabled in Windows registry
 * Returns true on non-Windows platforms
 */
export function isLongPathEnabled(): boolean {
  if (!isWindows()) {
    return true; // Not applicable on other platforms
  }

  try {
    const result = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v LongPathsEnabled',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.includes('0x1');
  } catch {
    // Registry key doesn't exist or can't be read
    return false;
  }
}

/**
 * Convert path to Windows long path format (\\?\)
 * Only applies on Windows for paths > 260 characters
 */
export function toLongPath(inputPath: string): string {
  if (!isWindows()) {
    return inputPath;
  }

  // Already has long path prefix
  if (inputPath.startsWith(WIN_LONG_PATH_PREFIX)) {
    return inputPath;
  }

  // Normalize to absolute path
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(inputPath);

  // Only apply for long paths
  if (absolutePath.length <= WIN_MAX_PATH) {
    return absolutePath;
  }

  // Convert forward slashes to backslashes (Windows)
  const normalizedPath = absolutePath.replace(/\//g, '\\');

  return WIN_LONG_PATH_PREFIX + normalizedPath;
}

/**
 * Convert long path format back to regular path
 */
export function fromLongPath(inputPath: string): string {
  if (inputPath.startsWith(WIN_LONG_PATH_PREFIX)) {
    return inputPath.substring(WIN_LONG_PATH_PREFIX.length);
  }
  return inputPath;
}

/**
 * Safely create directory, handling long paths on Windows
 */
export function mkdirSafe(dirPath: string, options?: { recursive?: boolean; mode?: number }): void {
  const safePath = toLongPath(dirPath);
  fs.mkdirSync(safePath, { recursive: true, ...options });
}

/**
 * Safely copy file, handling long paths on Windows
 */
export function copyFileSafe(src: string, dest: string): void {
  const safeSrc = toLongPath(src);
  const safeDest = toLongPath(dest);

  // Ensure destination directory exists
  const destDir = path.dirname(safeDest);
  if (!fs.existsSync(destDir)) {
    mkdirSafe(destDir);
  }

  fs.copyFileSync(safeSrc, safeDest);
}

/**
 * Safely check if path exists, handling long paths on Windows
 */
export function existsSafe(targetPath: string): boolean {
  try {
    const safePath = toLongPath(targetPath);
    return fs.existsSync(safePath);
  } catch {
    return false;
  }
}

/**
 * Safely read directory, handling long paths on Windows
 */
export function readdirSafe(dirPath: string): string[] {
  const safePath = toLongPath(dirPath);
  return fs.readdirSync(safePath);
}

/**
 * Safely remove directory, handling long paths on Windows
 */
export function rmSafe(targetPath: string, options?: fs.RmOptions): void {
  const safePath = toLongPath(targetPath);
  fs.rmSync(safePath, options);
}

/**
 * Calculate total path length after joining
 */
export function calculatePathLength(...segments: string[]): number {
  return path.join(...segments).length;
}

/**
 * Check if a path would exceed Windows MAX_PATH limit
 */
export function wouldExceedMaxPath(...segments: string[]): boolean {
  if (!isWindows()) {
    return false;
  }
  return calculatePathLength(...segments) > WIN_MAX_PATH;
}

/**
 * Get registry documentation for enabling long paths
 */
export function getLongPathRegistryDoc(): string {
  return `
Windows Long Path Support
=========================

To enable paths longer than 260 characters on Windows:

Option 1: Registry Editor (GUI)
1. Open regedit
2. Navigate to: HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\FileSystem
3. Set "LongPathsEnabled" to 1 (create DWORD if missing)
4. Restart computer

Option 2: PowerShell (Admin)
Run: Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "LongPathsEnabled" -Value 1 -Type DWord

Option 3: Group Policy (Enterprise)
1. Open gpedit.msc
2. Navigate to: Computer Configuration > Administrative Templates > System > Filesystem
3. Enable "Enable Win32 long paths"
4. Run: gpupdate /force

Note: Windows 10 version 1607 or later required.
`.trim();
}

/**
 * Validate path length and return warning if needed
 */
export function validatePathLength(targetPath: string): { valid: boolean; warning?: string } {
  if (!isWindows()) {
    return { valid: true };
  }

  const pathLength = path.resolve(targetPath).length;

  if (pathLength > WIN_LONG_PATH_MAX) {
    return {
      valid: false,
      warning: `Path exceeds Windows maximum of ${WIN_LONG_PATH_MAX} characters (${pathLength})`,
    };
  }

  if (pathLength > WIN_MAX_PATH && !isLongPathEnabled()) {
    return {
      valid: false,
      warning: `Path exceeds 260 characters (${pathLength}). Enable long paths in Windows registry.\n${getLongPathRegistryDoc()}`,
    };
  }

  if (pathLength > WIN_MAX_PATH) {
    return {
      valid: true,
      warning: `Path exceeds 260 characters (${pathLength}). Using long path support.`,
    };
  }

  return { valid: true };
}

/**
 * Copy directory recursively with long path support
 */
export function copyDirSafe(src: string, dest: string): { success: boolean; error?: string } {
  try {
    const safeSrc = toLongPath(src);
    const safeDest = toLongPath(dest);

    if (!fs.existsSync(safeSrc)) {
      return { success: false, error: `Source directory not found: ${src}` };
    }

    // Check path length
    const validation = validatePathLength(dest);
    if (!validation.valid) {
      return { success: false, error: validation.warning };
    }

    // Create destination directory
    mkdirSafe(safeDest);

    // Copy contents recursively
    const entries = fs.readdirSync(safeSrc, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(safeSrc, entry.name);
      const destPath = path.join(safeDest, entry.name);

      if (entry.isDirectory()) {
        const result = copyDirSafe(srcPath, destPath);
        if (!result.success) {
          return result;
        }
      } else {
        copyFileSafe(srcPath, destPath);
      }
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

/**
 * Get path info for debugging
 */
export function getPathInfo(targetPath: string): {
  original: string;
  absolute: string;
  longPath: string;
  length: number;
  wouldNeedLongPath: boolean;
  longPathEnabled: boolean;
} {
  const absolute = path.resolve(targetPath);
  return {
    original: targetPath,
    absolute,
    longPath: toLongPath(targetPath),
    length: absolute.length,
    wouldNeedLongPath: absolute.length > WIN_MAX_PATH,
    longPathEnabled: isLongPathEnabled(),
  };
}
