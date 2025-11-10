/**
 * Git Diff Analyzer
 *
 * Extracts modified files from git diff for reflection analysis
 * Parses git diff output to get file changes, line counts, and content
 *
 * @module git-diff-analyzer
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { GitDiffInfo } from './types/reflection-types';

/**
 * Execute git command safely
 * @param command Git command to execute
 * @param cwd Working directory (optional)
 * @returns Command output as string
 * @throws Error if command fails
 */
function executeGitCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error: any) {
    throw new Error(`Git command failed: ${command}. ${error.message}`);
  }
}

/**
 * Check if directory is a git repository
 * @param dir Directory to check (defaults to cwd)
 * @returns True if directory is in a git repository
 */
export function isGitRepository(dir: string = process.cwd()): boolean {
  try {
    executeGitCommand('git rev-parse --git-dir', dir);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of modified files in the working directory
 * Includes both staged and unstaged changes
 *
 * @param cwd Working directory (optional, defaults to process.cwd())
 * @returns Array of file paths relative to git root
 */
export function getModifiedFilesList(cwd?: string): string[] {
  if (!isGitRepository(cwd)) {
    return [];
  }

  try {
    // Get both staged and unstaged changes
    const output = executeGitCommand('git diff --name-only HEAD', cwd);

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .filter(file => file.length > 0)
      .filter(file => !file.startsWith('.git/')); // Exclude .git directory
  } catch {
    return [];
  }
}

/**
 * Parse git diff numstat output to get line counts
 * Format: <added>\t<removed>\t<filename>
 *
 * @param numstatOutput Output from git diff --numstat
 * @returns Map of filename to {added, removed} counts
 */
export function parseNumstat(numstatOutput: string): Map<string, { added: number; removed: number }> {
  const stats = new Map<string, { added: number; removed: number }>();

  if (!numstatOutput.trim()) {
    return stats;
  }

  const lines = numstatOutput.trim().split('\n');

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
    const removed = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
    const filename = parts[2];

    stats.set(filename, { added, removed });
  }

  return stats;
}

/**
 * Get diff content for a specific file
 * @param file File path relative to git root
 * @param cwd Working directory (optional)
 * @returns Diff content as string
 */
export function getFileDiff(file: string, cwd?: string): string {
  if (!isGitRepository(cwd)) {
    return '';
  }

  try {
    // Get unified diff for the file
    const output = executeGitCommand(`git diff HEAD -- "${file}"`, cwd);
    return output;
  } catch {
    return '';
  }
}

/**
 * Get current file content
 * @param file File path (can be absolute or relative to cwd)
 * @param cwd Working directory (optional)
 * @returns File content as string, or empty string if file doesn't exist
 */
export function getFileContent(file: string, cwd?: string): string {
  try {
    const workingDir = cwd || process.cwd();
    const absolutePath = path.isAbsolute(file) ? file : path.join(workingDir, file);

    if (!fs.existsSync(absolutePath)) {
      return '';
    }

    return fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Get modified files with diff information
 * Main function for reflection analysis
 *
 * @param cwd Working directory (optional, defaults to process.cwd())
 * @param maxFiles Maximum number of files to return (optional, defaults to 100)
 * @returns Array of GitDiffInfo objects with file changes
 */
export function getModifiedFiles(
  cwd?: string,
  maxFiles: number = 100
): GitDiffInfo[] {
  if (!isGitRepository(cwd)) {
    return [];
  }

  const workingDir = cwd || process.cwd();

  // Get list of modified files
  const modifiedFiles = getModifiedFilesList(workingDir);

  if (modifiedFiles.length === 0) {
    return [];
  }

  // Limit number of files to prevent overwhelming the analysis
  const filesToAnalyze = modifiedFiles.slice(0, maxFiles);

  // Get line count statistics
  let numstatOutput = '';
  try {
    numstatOutput = executeGitCommand('git diff --numstat HEAD', workingDir);
  } catch {
    // If numstat fails, continue with empty stats
  }

  const stats = parseNumstat(numstatOutput);

  // Build GitDiffInfo array
  const result: GitDiffInfo[] = [];

  for (const file of filesToAnalyze) {
    const fileStat = stats.get(file) || { added: 0, removed: 0 };
    const diffContent = getFileDiff(file, workingDir);

    // Only include files with actual changes
    if (fileStat.added > 0 || fileStat.removed > 0 || diffContent.length > 0) {
      result.push({
        file,
        linesAdded: fileStat.added,
        linesRemoved: fileStat.removed,
        content: diffContent
      });
    }
  }

  return result;
}

/**
 * Get summary statistics for modified files
 * Useful for reflection metadata
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @returns Summary with file count, total lines added/removed
 */
export function getModifiedFilesSummary(modifiedFiles: GitDiffInfo[]): {
  count: number;
  linesAdded: number;
  linesRemoved: number;
  totalChanges: number;
} {
  return {
    count: modifiedFiles.length,
    linesAdded: modifiedFiles.reduce((sum, file) => sum + file.linesAdded, 0),
    linesRemoved: modifiedFiles.reduce((sum, file) => sum + file.linesRemoved, 0),
    totalChanges: modifiedFiles.reduce(
      (sum, file) => sum + file.linesAdded + file.linesRemoved,
      0
    )
  };
}

/**
 * Filter files by extension
 * Useful for focusing reflection on specific file types
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @param extensions Array of file extensions (e.g., ['.ts', '.js'])
 * @returns Filtered array of GitDiffInfo objects
 */
export function filterFilesByExtension(
  modifiedFiles: GitDiffInfo[],
  extensions: string[]
): GitDiffInfo[] {
  return modifiedFiles.filter(file => {
    const ext = path.extname(file.file).toLowerCase();
    return extensions.some(allowedExt => ext === allowedExt.toLowerCase());
  });
}

/**
 * Exclude files matching patterns
 * Useful for excluding generated files, test files, etc.
 *
 * @param modifiedFiles Array of GitDiffInfo objects
 * @param patterns Array of glob patterns to exclude
 * @returns Filtered array of GitDiffInfo objects
 */
export function excludeFilesByPattern(
  modifiedFiles: GitDiffInfo[],
  patterns: string[]
): GitDiffInfo[] {
  return modifiedFiles.filter(file => {
    return !patterns.some(pattern => {
      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(file.file);
    });
  });
}
