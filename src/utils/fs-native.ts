/**
 * Native Node.js fs API Helpers
 *
 * Drop-in replacements for fs-extra methods using only Node.js stdlib.
 * All methods use native Node.js 20+ APIs with no external dependencies.
 *
 * Migration from fs-extra:
 * - import fs from 'fs-extra' → import * as fs from './utils/fs-native.js'
 * - All fs-extra methods work as drop-in replacements
 *
 * Benefits:
 * - Zero bundle overhead (no npm packages)
 * - Works in marketplace (no node_modules needed)
 * - Faster startup (native APIs)
 * - Better debugging (native stack traces)
 */

import { promises as fsPromises, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync, unlinkSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * Ensures that a directory exists. If the directory does not exist, it is created.
 * @param dirPath - The directory path to ensure
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Synchronous version of ensureDir
 */
export function ensureDirSync(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Alias for ensureDirSync (fs-extra compatibility)
 */
export function mkdirpSync(dirPath: string): void {
  ensureDirSync(dirPath);
}

/**
 * Check if a path exists
 * @param filePath - The path to check
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return existsSync(filePath);
}

/**
 * Synchronous version of pathExists
 */
export { existsSync };

/**
 * Read a JSON file and parse it
 * @param filePath - The JSON file path
 */
export async function readJson(filePath: string): Promise<any> {
  const content = await fsPromises.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Synchronous version of readJson
 */
export function readJsonSync(filePath: string): any {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write a JSON file with formatting
 * @param filePath - The JSON file path
 * @param data - The data to write
 * @param options - Options (spaces for indentation)
 */
export async function writeJson(
  filePath: string,
  data: any,
  options?: { spaces?: number }
): Promise<void> {
  const spaces = options?.spaces ?? 2;
  const content = JSON.stringify(data, null, spaces);
  await fsPromises.writeFile(filePath, content, 'utf-8');
}

/**
 * Synchronous version of writeJson
 */
export function writeJsonSync(
  filePath: string,
  data: any,
  options?: { spaces?: number }
): void {
  const spaces = options?.spaces ?? 2;
  const content = JSON.stringify(data, null, spaces);
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Remove a file or directory (recursively)
 * @param targetPath - The path to remove
 */
export async function remove(targetPath: string): Promise<void> {
  if (existsSync(targetPath)) {
    await fsPromises.rm(targetPath, { recursive: true, force: true });
  }
}

/**
 * Synchronous version of remove
 */
export function removeSync(targetPath: string): void {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }
}

/**
 * Copy a file or directory
 * @param src - Source path
 * @param dest - Destination path
 * @param options - Copy options
 */
export async function copy(
  src: string,
  dest: string,
  options?: { overwrite?: boolean; filter?: (src: string) => boolean }
): Promise<void> {
  const srcStat = await fsPromises.stat(src);

  if (srcStat.isFile()) {
    // Copy single file
    await fsPromises.mkdir(path.dirname(dest), { recursive: true });
    await fsPromises.copyFile(src, dest);
  } else if (srcStat.isDirectory()) {
    // Copy directory recursively
    await fsPromises.mkdir(dest, { recursive: true });
    const entries = await fsPromises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      // Apply filter if provided
      if (options?.filter && !options.filter(srcPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await copy(srcPath, destPath, options);
      } else {
        await fsPromises.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Synchronous version of copy
 */
export function copySync(
  src: string,
  dest: string,
  options?: { overwrite?: boolean; filter?: (src: string) => boolean }
): void {
  const srcStat = statSync(src);

  if (srcStat.isFile()) {
    // Copy single file
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  } else if (srcStat.isDirectory()) {
    // Copy directory recursively
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      // Apply filter if provided
      if (options?.filter && !options.filter(srcPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        copySync(srcPath, destPath, options);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}

/**
 * Ensure a file exists (create if it doesn't)
 * @param filePath - The file path
 */
export async function ensureFile(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, '', 'utf-8');
  }
}

/**
 * Synchronous version of ensureFile
 */
export function ensureFileSync(filePath: string): void {
  if (!existsSync(filePath)) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, '', 'utf-8');
  }
}

// Re-export common fs/promises methods for convenience
export const {
  readFile,
  writeFile,
  appendFile,
  stat,
  readdir,
  access,
  unlink,
  rmdir,
  rename,
  chmod,
} = fsPromises;

// Re-export common synchronous methods
export {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  rmSync,
};

// Default export for convenience
export default {
  // Async methods
  ensureDir,
  pathExists,
  readJson,
  writeJson,
  remove,
  copy,
  ensureFile,
  readFile,
  writeFile,
  appendFile,
  stat,
  readdir,
  access,
  unlink,

  // Sync methods
  ensureDirSync,
  mkdirpSync,
  existsSync,
  readJsonSync,
  writeJsonSync,
  removeSync,
  copySync,
  ensureFileSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  rmSync,
};
