/**
 * Code Validator - Validates that code exists for completed tasks
 *
 * Prevents tasks from being marked complete without actual implementation.
 * Parses task descriptions to extract file paths and verifies they exist.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * File validation result
 */
export interface FileValidationResult {
  /** File path */
  path: string;

  /** File exists */
  exists: boolean;

  /** File has meaningful content (not empty) */
  hasContent: boolean;

  /** File size in bytes */
  size: number;
}

/**
 * CodeValidator - Validates code exists for tasks
 */
export class CodeValidator {
  /**
   * Validate that code exists for a completed task
   *
   * @param taskId - Task ID (e.g., "T-001")
   * @param incrementPath - Path to increment
   * @returns True if all expected files exist with content
   */
  async validateCodeExists(taskId: string, incrementPath: string): Promise<boolean> {
    try {
      // Read tasks.md to find the task
      const tasksPath = path.join(incrementPath, 'tasks.md');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      // Extract task section
      const taskSection = this.extractTaskSection(tasksContent, taskId);
      if (!taskSection) {
        // Task not found
        return false;
      }

      // Extract file paths from task description
      const filePaths = this.extractFilePaths(taskSection);

      if (filePaths.length === 0) {
        // No files specified - assume valid
        // (Some tasks like "Write documentation" may not have specific files)
        return true;
      }

      // Validate each file
      const results = await Promise.all(
        filePaths.map(filePath => this.validateFile(filePath))
      );

      // All files must exist and have content
      return results.every(r => r.exists && r.hasContent);

    } catch (error) {
      // On error, assume code doesn't exist (safe default)
      return false;
    }
  }

  /**
   * Validate a single file
   *
   * @param filePath - Absolute or relative file path
   */
  async validateFile(filePath: string): Promise<FileValidationResult> {
    try {
      const stats = await fs.stat(filePath);
      const isFile = stats.isFile();
      const size = stats.size;

      return {
        path: filePath,
        exists: isFile,
        hasContent: isFile && size > 0,
        size
      };
    } catch {
      return {
        path: filePath,
        exists: false,
        hasContent: false,
        size: 0
      };
    }
  }

  /**
   * Extract task section from tasks.md content
   */
  private extractTaskSection(content: string, taskId: string): string | null {
    const pattern = new RegExp(`### ${taskId}:.*?(?=###|$)`, 's');
    const match = content.match(pattern);
    return match ? match[0] : null;
  }

  /**
   * Extract file paths from task description
   *
   * Looks for:
   * - **Files**: section with file paths
   * - Code blocks with file paths in comments
   * - Inline file references (e.g., `src/foo/bar.ts`)
   */
  private extractFilePaths(taskSection: string): string[] {
    const paths: string[] = [];

    // Method 1: **Files**: section
    const filesMatch = taskSection.match(/\*\*Files\*\*:\s*\n((?:- .+\n?)+)/);
    if (filesMatch) {
      const fileLines = filesMatch[1].split('\n');
      for (const line of fileLines) {
        const match = line.match(/^- (.+?)(?:\s+\(.*\))?$/);
        if (match) {
          paths.push(match[1].trim());
        }
      }
    }

    // Method 2: Inline code references (e.g., `src/foo/bar.ts`)
    const inlineMatches = taskSection.matchAll(/`([a-zA-Z0-9_\-\/\.]+\.(?:ts|js|tsx|jsx|md|json))`/g);
    for (const match of inlineMatches) {
      const filePath = match[1];
      if (!paths.includes(filePath)) {
        paths.push(filePath);
      }
    }

    // Method 3: File path patterns in descriptions
    // Match paths like: src/core/living-docs/ThreeLayerSyncManager.ts
    const pathMatches = taskSection.matchAll(/\b([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)+\.(?:ts|js|tsx|jsx|md|json|yml|yaml))/g);
    for (const match of pathMatches) {
      const filePath = match[1];
      if (!paths.includes(filePath)) {
        paths.push(filePath);
      }
    }

    return paths;
  }

  /**
   * Validate multiple tasks at once
   *
   * @param taskIds - Array of task IDs
   * @param incrementPath - Path to increment
   * @returns Map of task ID to validation result
   */
  async validateMultipleTasks(
    taskIds: string[],
    incrementPath: string
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const taskId of taskIds) {
      const isValid = await this.validateCodeExists(taskId, incrementPath);
      results.set(taskId, isValid);
    }

    return results;
  }

  /**
   * Get validation details for a task
   *
   * @param taskId - Task ID
   * @param incrementPath - Path to increment
   * @returns Array of file validation results
   */
  async getValidationDetails(
    taskId: string,
    incrementPath: string
  ): Promise<FileValidationResult[]> {
    try {
      const tasksPath = path.join(incrementPath, 'tasks.md');
      const tasksContent = await fs.readFile(tasksPath, 'utf-8');

      const taskSection = this.extractTaskSection(tasksContent, taskId);
      if (!taskSection) {
        return [];
      }

      const filePaths = this.extractFilePaths(taskSection);
      return await Promise.all(filePaths.map(p => this.validateFile(p)));

    } catch {
      return [];
    }
  }
}
