/**
 * Code Validator
 *
 * Validates that completed tasks have actual code implementation.
 * Prevents marking tasks as complete when:
 * - Files don't exist
 * - Files are empty or have trivial content
 * - Implementation is incomplete
 *
 * Used by ThreeLayerSyncManager to enforce code-completion discipline.
 *
 * @module CodeValidator
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * File validation result
 */
export interface FileValidationResult {
  path: string;
  exists: boolean;
  hasContent: boolean;
  lineCount: number;
  reason?: string; // Why validation failed
}

/**
 * Task validation result
 */
export interface TaskValidationResult {
  taskId: string;
  valid: boolean;
  files: FileValidationResult[];
  reason?: string; // Summary of why task validation failed
}

/**
 * CodeValidator options
 */
export interface CodeValidatorOptions {
  minLines?: number; // Minimum lines for a file to be considered non-empty (default: 3)
  minChars?: number; // Minimum characters for meaningful content (default: 50)
  projectRoot?: string; // Project root for resolving relative paths
}

export class CodeValidator {
  private options: Required<CodeValidatorOptions>;

  constructor(options: CodeValidatorOptions = {}) {
    this.options = {
      minLines: options.minLines ?? 3,
      minChars: options.minChars ?? 50,
      projectRoot: options.projectRoot ?? process.cwd()
    };
  }

  /**
   * Validate that code exists for a task
   *
   * Extracts file paths from task description and verifies:
   * 1. Files exist
   * 2. Files have meaningful content
   * 3. Files are not just stubs
   *
   * @param taskDescription - Task description with file paths
   * @param taskId - Task ID for error messages
   * @returns Validation result
   */
  async validateTask(taskDescription: string, taskId: string): Promise<TaskValidationResult> {
    const filePaths = this.extractFilePaths(taskDescription);

    if (filePaths.length === 0) {
      // No file paths specified - consider it valid (task might be non-code)
      return {
        taskId,
        valid: true,
        files: [],
        reason: 'No file paths specified in task description'
      };
    }

    const fileResults: FileValidationResult[] = [];
    let allValid = true;
    const reasons: string[] = [];

    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      fileResults.push(result);

      if (!result.exists) {
        allValid = false;
        reasons.push(`File not found: ${filePath}`);
      } else if (!result.hasContent) {
        allValid = false;
        reasons.push(`File has no meaningful content: ${filePath} (${result.reason})`);
      }
    }

    return {
      taskId,
      valid: allValid,
      files: fileResults,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined
    };
  }

  /**
   * Validate a single file
   *
   * @param filePath - Path to file (relative or absolute)
   * @returns File validation result
   */
  async validateFile(filePath: string): Promise<FileValidationResult> {
    // Resolve relative paths
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.options.projectRoot, filePath);

    // Check if file exists
    const exists = await fs.pathExists(absolutePath);
    if (!exists) {
      return {
        path: filePath,
        exists: false,
        hasContent: false,
        lineCount: 0,
        reason: 'File does not exist'
      };
    }

    // Read file content
    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    // Check line count
    if (nonEmptyLines.length < this.options.minLines) {
      return {
        path: filePath,
        exists: true,
        hasContent: false,
        lineCount: nonEmptyLines.length,
        reason: `Only ${nonEmptyLines.length} non-empty lines (minimum: ${this.options.minLines})`
      };
    }

    // Check character count
    const trimmedContent = content.trim();
    if (trimmedContent.length < this.options.minChars) {
      return {
        path: filePath,
        exists: true,
        hasContent: false,
        lineCount: nonEmptyLines.length,
        reason: `Only ${trimmedContent.length} characters (minimum: ${this.options.minChars})`
      };
    }

    // Check for stub patterns (common placeholder patterns)
    const stubPatterns = [
      /^\/\/\s*TODO:/i,
      /^#\s*TODO:/i,
      /^\s*throw new Error\(['"]Not implemented['"]\)/i,
      /^\s*return null;?\s*$/m,
      /^\s*pass\s*$/m, // Python
      /^\s*\.\.\.$/m    // TypeScript
    ];

    const isStub = stubPatterns.some(pattern => pattern.test(trimmedContent));
    if (isStub) {
      return {
        path: filePath,
        exists: true,
        hasContent: false,
        lineCount: nonEmptyLines.length,
        reason: 'File contains stub/placeholder code'
      };
    }

    // All checks passed
    return {
      path: filePath,
      exists: true,
      hasContent: true,
      lineCount: nonEmptyLines.length
    };
  }

  /**
   * Extract file paths from task description
   *
   * Supports multiple formats:
   * - **Files**: src/foo.ts, src/bar.ts
   * - **Files to create**: src/foo.ts
   * - **Files to modify**: src/bar.ts
   * - Inline code blocks with file paths
   *
   * @param description - Task description text
   * @returns Array of file paths
   */
  extractFilePaths(description: string): string[] {
    const paths: Set<string> = new Set();

    // Pattern 1: **Files**: path1, path2, path3
    const filesMatch = description.match(/\*\*Files\*\*:\s*([^\n]+)/i);
    if (filesMatch) {
      const filePaths = filesMatch[1].split(',').map(p => p.trim());
      filePaths.forEach(p => paths.add(p));
    }

    // Pattern 2: **Files to create**: path1, path2
    const createMatch = description.match(/\*\*Files to create\*\*:\s*([^\n]+)/i);
    if (createMatch) {
      const filePaths = createMatch[1].split(',').map(p => p.trim());
      filePaths.forEach(p => paths.add(p));
    }

    // Pattern 3: **Files to modify**: path1, path2
    const modifyMatch = description.match(/\*\*Files to modify\*\*:\s*([^\n]+)/i);
    if (modifyMatch) {
      const filePaths = modifyMatch[1].split(',').map(p => p.trim());
      filePaths.forEach(p => paths.add(p));
    }

    // Pattern 4: Inline file references (e.g., `src/foo/bar.ts`)
    const inlineMatches = description.matchAll(/`([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|py|java|go|rs|cpp|c|h))`/g);
    for (const match of inlineMatches) {
      paths.add(match[1]);
    }

    // Pattern 5: Markdown list items with file paths
    const listMatches = description.matchAll(/^[-*]\s+([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|py|java|go|rs|cpp|c|h))/gm);
    for (const match of listMatches) {
      paths.add(match[1]);
    }

    return Array.from(paths);
  }

  /**
   * Batch validate multiple tasks
   *
   * @param tasks - Array of {taskId, description}
   * @returns Array of validation results
   */
  async validateTasks(tasks: Array<{ taskId: string; description: string }>): Promise<TaskValidationResult[]> {
    // Use parallel validation for performance
    const validationPromises = tasks.map(task =>
      this.validateTask(task.description, task.taskId)
    );

    return Promise.all(validationPromises);
  }

  /**
   * Get summary of validation results
   *
   * @param results - Array of task validation results
   * @returns Summary statistics
   */
  summarizeResults(results: TaskValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    noFiles: number;
    invalidTasks: string[];
  } {
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    const invalid = results.filter(r => !r.valid).length;
    const noFiles = results.filter(r => r.files.length === 0).length;
    const invalidTasks = results.filter(r => !r.valid).map(r => r.taskId);

    return {
      total,
      valid,
      invalid,
      noFiles,
      invalidTasks
    };
  }
}
