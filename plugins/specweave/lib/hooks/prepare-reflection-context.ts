/**
 * Prepare Reflection Context
 *
 * Prepares context for reflection and saves to temp file
 * Used by post-task-completion hook to prepare for reflection invocation
 *
 * @module prepare-reflection-context
 */

import { mkdirpSync, writeJsonSync } from '../utils/fs-native.js';
import path from 'path';
import { createReflectionContext } from './run-self-reflection';
import { getModifiedFilesSummary } from './git-diff-analyzer';

/**
 * Prepare reflection context and save to temp file
 * This allows the hook to prepare data without actually invoking the agent
 *
 * @param incrementId Increment identifier
 * @param taskId Task identifier
 * @param projectRoot Project root directory (optional)
 * @returns Path to saved context file or null if reflection should be skipped
 */
export function prepareReflectionContext(
  incrementId: string,
  taskId: string,
  projectRoot?: string
): string | null {
  try {
    const context = createReflectionContext(incrementId, taskId, projectRoot);

    // Check if reflection should run
    if (!context.config.enabled || context.modifiedFiles.length === 0) {
      return null;
    }

    // Create temp directory for reflection context
    const rootDir = projectRoot || process.cwd();
    const tempDir = path.join(rootDir, '.specweave', 'increments', incrementId, 'logs', 'reflections', '.temp');
    mkdirpSync(tempDir);

    // Save context to temp file
    const contextFile = path.join(tempDir, 'reflection-context.json');

    const fileStats = getModifiedFilesSummary(context.modifiedFiles);

    const contextData = {
      incrementId: context.incrementId,
      taskId: context.taskId,
      modifiedFiles: context.modifiedFiles.map(f => ({
        file: f.file,
        linesAdded: f.linesAdded,
        linesRemoved: f.linesRemoved
        // Exclude diff content to save space
      })),
      fileSummary: {
        count: fileStats.count,
        linesAdded: fileStats.linesAdded,
        linesRemoved: fileStats.linesRemoved
      },
      config: context.config,
      timestamp: new Date().toISOString()
    };

    writeJsonSync(contextFile, contextData, { spaces: 2 });

    return contextFile;
  } catch (error: any) {
    console.error(`Failed to prepare reflection context: ${error.message}`);
    return null;
  }
}

/**
 * Check if reflection context exists for an increment
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 * @returns True if context file exists
 */
export function hasReflectionContext(
  incrementId: string,
  projectRoot?: string
): boolean {
  const rootDir = projectRoot || process.cwd();
  const contextFile = path.join(
    rootDir,
    '.specweave',
    'increments',
    incrementId,
    'logs',
    'reflections',
    '.temp',
    'reflection-context.json'
  );

  return fs.existsSync(contextFile);
}

/**
 * Read reflection context from file
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 * @returns Context data or null if not found
 */
export function readReflectionContext(
  incrementId: string,
  projectRoot?: string
): any | null {
  const rootDir = projectRoot || process.cwd();
  const contextFile = path.join(
    rootDir,
    '.specweave',
    'increments',
    incrementId,
    'logs',
    'reflections',
    '.temp',
    'reflection-context.json'
  );

  if (!fs.existsSync(contextFile)) {
    return null;
  }

  try {
    return fs.readJsonSync(contextFile);
  } catch {
    return null;
  }
}

/**
 * Clear reflection context after reflection completes
 *
 * @param incrementId Increment identifier
 * @param projectRoot Project root directory (optional)
 */
export function clearReflectionContext(
  incrementId: string,
  projectRoot?: string
): void {
  const rootDir = projectRoot || process.cwd();
  const tempDir = path.join(
    rootDir,
    '.specweave',
    'increments',
    incrementId,
    'logs',
    'reflections',
    '.temp'
  );

  if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
  }
}

// CLI entry point for hook integration
if (require.main === module) {
  const incrementId = process.argv[2];
  const taskId = process.argv[3];

  if (!incrementId || !taskId) {
    console.error('Usage: node prepare-reflection-context.js <increment-id> <task-id>');
    process.exit(1);
  }

  const contextFile = prepareReflectionContext(incrementId, taskId);

  if (contextFile) {
    console.log(`Reflection context prepared: ${contextFile}`);
    console.log('✨ Reflection ready. Run /specweave:reflect to analyze your work.');
  } else {
    console.log('Reflection skipped (disabled or no changes).');
  }
}
