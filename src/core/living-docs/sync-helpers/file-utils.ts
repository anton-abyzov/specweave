/**
 * File utilities for Living Docs Sync
 * @module core/living-docs/sync-helpers/file-utils
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Logger } from '../../../utils/logger.js';

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse JSON file
 */
export async function readJson(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Find existing user story file in feature folder
 */
export async function findExistingUserStoryFile(
  projectPath: string,
  userStoryId: string,
  logger: Logger
): Promise<string | null> {
  try {
    const files = await fs.readdir(projectPath);
    const usIdLower = userStoryId.toLowerCase();
    const matchingFiles = files.filter(f => {
      const match = f.match(/^(us-\d+)-/);
      return match && match[1] === usIdLower;
    });

    if (matchingFiles.length === 0) {
      return null;
    }

    if (matchingFiles.length === 1) {
      return matchingFiles[0];
    }

    logger.warn(`   ⚠️  Found ${matchingFiles.length} files for ${userStoryId}, using most recent`);
    const fileTimes = await Promise.all(
      matchingFiles.map(async (f) => ({
        file: f,
        mtime: (await fs.stat(path.join(projectPath, f))).mtime.getTime()
      }))
    );
    fileTimes.sort((a, b) => b.mtime - a.mtime);
    return fileTimes[0].file;
  } catch {
    return null;
  }
}

/**
 * Clean up duplicate user story files
 */
export async function cleanupDuplicateFiles(
  projectPath: string,
  logger: Logger
): Promise<void> {
  const files = await fs.readdir(projectPath);
  const filesByStory = new Map<string, string[]>();

  for (const file of files) {
    const match = file.match(/^(us-\d+)-/);
    if (match) {
      const storyId = match[1].toUpperCase();
      if (!filesByStory.has(storyId)) {
        filesByStory.set(storyId, []);
      }
      filesByStory.get(storyId)!.push(file);
    }
  }

  for (const [storyId, storyFiles] of filesByStory.entries()) {
    if (storyFiles.length > 1) {
      logger.warn(`   ⚠️  Found ${storyFiles.length} duplicate files for ${storyId}`);
      const fileTimes = await Promise.all(
        storyFiles.map(async (f) => ({
          file: f,
          mtime: (await fs.stat(path.join(projectPath, f))).mtime.getTime()
        }))
      );
      fileTimes.sort((a, b) => b.mtime - a.mtime);
      const keepFile = fileTimes[0].file;
      const deleteFiles = fileTimes.slice(1).map(f => f.file);

      logger.warn(`      → Keeping: ${keepFile} (most recent)`);
      for (const file of deleteFiles) {
        await fs.rm(path.join(projectPath, file), { force: true, recursive: true });
        logger.warn(`      ✅ Deleted: ${file}`);
      }
    }
  }
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(
  projectPath: string,
  logger: Logger
): Promise<void> {
  const files = await fs.readdir(projectPath);
  for (const file of files) {
    if (file.endsWith('.tmp') || file.endsWith('.backup')) {
      await fs.rm(path.join(projectPath, file), { force: true });
      logger.log(`   🧹 Cleaned up: ${file}`);
    }
  }
}
