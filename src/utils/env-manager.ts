/**
 * .env File Management Utilities
 *
 * Atomic updates, backup management, and project list merging
 *
 * NEW (v0.24.0): Supports import command .env updates
 *
 * @module utils/env-manager
 */

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import type { Logger } from './logger.js';
import { consoleLogger } from './logger.js';

export interface EnvUpdateOptions {
  key: string;
  value: string;
  projectRoot: string;
  logger?: Logger;
  createBackup?: boolean;
}

export interface EnvMergeOptions {
  key: string;
  newValues: string[];
  projectRoot: string;
  logger?: Logger;
  createBackup?: boolean;
}

/**
 * Parse .env file content into key-value pairs
 */
export function parseEnvContent(content: string): Map<string, string> {
  const envMap = new Map<string, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envMap.set(key, value);
    }
  }

  return envMap;
}

/**
 * Serialize env map to .env file format
 */
export function serializeEnvContent(envMap: Map<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of envMap.entries()) {
    lines.push(`${key}=${value}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Update single key in .env file (atomic write with backup)
 *
 * TC-075: Atomic .env Update
 *
 * @param options - Update options
 */
export async function updateEnvFile(options: EnvUpdateOptions): Promise<void> {
  const { key, value, projectRoot, logger = consoleLogger, createBackup = true } = options;

  const envPath = path.join(projectRoot, '.env');
  const tempPath = path.join(projectRoot, '.env.tmp');
  const backupPath = path.join(projectRoot, '.env.backup');

  try {
    // Step 1: Read existing .env content
    let existingContent = '';
    if (existsSync(envPath)) {
      existingContent = await fs.readFile(envPath, 'utf-8');
    }

    // Step 2: Parse and update
    const envMap = parseEnvContent(existingContent);
    envMap.set(key, value);

    // Step 3: Serialize
    const newContent = serializeEnvContent(envMap);

    // Step 4: Write to temp file (atomic write step 1)
    await fs.writeFile(tempPath, newContent, 'utf-8');

    // Step 5: Backup existing .env (if exists)
    if (createBackup && existsSync(envPath)) {
      await fs.copyFile(envPath, backupPath);
      logger.log(`Created backup: .env.backup`);
    }

    // Step 6: Atomic rename (atomic write step 2)
    await fs.rename(tempPath, envPath);
    logger.log(`Updated .env: ${key}=${value}`);

  } catch (error: any) {
    // Cleanup temp file on error
    if (existsSync(tempPath)) {
      await fs.unlink(tempPath);
    }
    throw new Error(`Failed to update .env file: ${error.message}`);
  }
}

/**
 * Merge new values with existing comma-separated list (no duplicates)
 *
 * TC-076: Merge Project Lists (No Duplicates)
 *
 * Example:
 * - Existing: JIRA_PROJECTS=BACKEND,FRONTEND
 * - New: [MOBILE, INFRA, BACKEND]
 * - Result: JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE,INFRA
 *
 * @param options - Merge options
 */
export async function mergeEnvList(options: EnvMergeOptions): Promise<void> {
  const { key, newValues, projectRoot, logger = consoleLogger, createBackup = true } = options;

  const envPath = path.join(projectRoot, '.env');

  // Step 1: Read existing value
  let existingValues: string[] = [];
  if (existsSync(envPath)) {
    const content = await fs.readFile(envPath, 'utf-8');
    const envMap = parseEnvContent(content);
    const existingValue = envMap.get(key);

    if (existingValue) {
      existingValues = existingValue.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
  }

  // Step 2: Merge (no duplicates)
  const merged = mergeProjectList(existingValues, newValues);

  // Step 3: Update .env
  const mergedValue = merged.join(',');
  await updateEnvFile({
    key,
    value: mergedValue,
    projectRoot,
    logger,
    createBackup
  });

  logger.log(`Merged ${newValues.length} new value(s) into ${key}`);
  logger.log(`Total: ${merged.length} unique value(s)`);
}

/**
 * Merge two project lists without duplicates
 *
 * Preserves existing order, appends new projects
 *
 * @param existing - Existing project list
 * @param newProjects - New projects to add
 * @returns Merged list without duplicates
 */
export function mergeProjectList(existing: string[], newProjects: string[]): string[] {
  const merged = [...existing];
  const existingSet = new Set(existing.map(p => p.toLowerCase()));

  for (const project of newProjects) {
    // Case-insensitive duplicate check
    if (!existingSet.has(project.toLowerCase())) {
      merged.push(project);
      existingSet.add(project.toLowerCase());
    }
  }

  return merged;
}

/**
 * Get value from .env file
 *
 * @param projectRoot - Project root path
 * @param key - Environment variable key
 * @returns Value or null if not found
 */
export async function getEnvValue(projectRoot: string, key: string): Promise<string | null> {
  const envPath = path.join(projectRoot, '.env');

  if (!existsSync(envPath)) {
    return null;
  }

  const content = await fs.readFile(envPath, 'utf-8');
  const envMap = parseEnvContent(content);
  return envMap.get(key) || null;
}

/**
 * Check if .env file exists
 *
 * @param projectRoot - Project root path
 * @returns True if .env exists
 */
export function envFileExists(projectRoot: string): boolean {
  return existsSync(path.join(projectRoot, '.env'));
}

/**
 * Restore .env from backup
 *
 * @param projectRoot - Project root path
 * @param logger - Logger instance
 */
export async function restoreEnvBackup(projectRoot: string, logger: Logger = consoleLogger): Promise<void> {
  const envPath = path.join(projectRoot, '.env');
  const backupPath = path.join(projectRoot, '.env.backup');

  if (!existsSync(backupPath)) {
    throw new Error('No .env.backup file found');
  }

  await fs.copyFile(backupPath, envPath);
  logger.log('Restored .env from backup');
}
