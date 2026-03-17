import * as fs from "../../../../../src/utils/fs-native.js";
import path from "path";
class CodeValidator {
  constructor(options = {}) {
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
  async validateTask(taskDescription, taskId) {
    const filePaths = this.extractFilePaths(taskDescription);
    if (filePaths.length === 0) {
      return {
        taskId,
        valid: true,
        files: [],
        reason: "No file paths specified in task description"
      };
    }
    const fileResults = [];
    let allValid = true;
    const reasons = [];
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
      reason: reasons.length > 0 ? reasons.join("; ") : void 0
    };
  }
  /**
   * Validate a single file
   *
   * @param filePath - Path to file (relative or absolute)
   * @returns File validation result
   */
  async validateFile(filePath) {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.options.projectRoot, filePath);
    const exists = await fs.pathExists(absolutePath);
    if (!exists) {
      return {
        path: filePath,
        exists: false,
        hasContent: false,
        lineCount: 0,
        reason: "File does not exist"
      };
    }
    const content = await fs.readFile(absolutePath, "utf-8");
    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length < this.options.minLines) {
      return {
        path: filePath,
        exists: true,
        hasContent: false,
        lineCount: nonEmptyLines.length,
        reason: `Only ${nonEmptyLines.length} non-empty lines (minimum: ${this.options.minLines})`
      };
    }
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
    const stubPatterns = [
      /^\/\/\s*TODO:/i,
      /^#\s*TODO:/i,
      /^\s*throw new Error\(['"]Not implemented['"]\)/i,
      /^\s*return null;?\s*$/m,
      /^\s*pass\s*$/m,
      // Python
      /^\s*\.\.\.$/m
      // TypeScript
    ];
    const isStub = stubPatterns.some((pattern) => pattern.test(trimmedContent));
    if (isStub) {
      return {
        path: filePath,
        exists: true,
        hasContent: false,
        lineCount: nonEmptyLines.length,
        reason: "File contains stub/placeholder code"
      };
    }
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
  extractFilePaths(description) {
    const paths = /* @__PURE__ */ new Set();
    const filesMatch = description.match(/\*\*Files\*\*:\s*([^\n]+)/i);
    if (filesMatch) {
      const filePaths = filesMatch[1].split(",").map((p) => p.trim());
      filePaths.forEach((p) => paths.add(p));
    }
    const createMatch = description.match(/\*\*Files to create\*\*:\s*([^\n]+)/i);
    if (createMatch) {
      const filePaths = createMatch[1].split(",").map((p) => p.trim());
      filePaths.forEach((p) => paths.add(p));
    }
    const modifyMatch = description.match(/\*\*Files to modify\*\*:\s*([^\n]+)/i);
    if (modifyMatch) {
      const filePaths = modifyMatch[1].split(",").map((p) => p.trim());
      filePaths.forEach((p) => paths.add(p));
    }
    const inlineMatches = description.matchAll(/`([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|py|java|go|rs|cpp|c|h))`/g);
    for (const match of inlineMatches) {
      paths.add(match[1]);
    }
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
  async validateTasks(tasks) {
    const validationPromises = tasks.map(
      (task) => this.validateTask(task.description, task.taskId)
    );
    return Promise.all(validationPromises);
  }
  /**
   * Get summary of validation results
   *
   * @param results - Array of task validation results
   * @returns Summary statistics
   */
  summarizeResults(results) {
    const total = results.length;
    const valid = results.filter((r) => r.valid).length;
    const invalid = results.filter((r) => !r.valid).length;
    const noFiles = results.filter((r) => r.files.length === 0).length;
    const invalidTasks = results.filter((r) => !r.valid).map((r) => r.taskId);
    return {
      total,
      valid,
      invalid,
      noFiles,
      invalidTasks
    };
  }
}
export {
  CodeValidator
};
