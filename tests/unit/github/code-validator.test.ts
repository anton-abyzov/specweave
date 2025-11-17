/**
 * Unit tests for CodeValidator
 *
 * Tests file validation logic for completed tasks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CodeValidator } from '../../../plugins/specweave-github/lib/CodeValidator.js';
import type { TaskValidationResult } from '../../../plugins/specweave-github/lib/CodeValidator.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('CodeValidator', () => {
  let validator: CodeValidator;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `code-validator-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    validator = new CodeValidator({
      projectRoot: testDir,
      minLines: 3,
      minChars: 50
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('extractFilePaths', () => {
    it('should extract file paths from **Files** format', () => {
      const description = `
**Files**: src/foo.ts, src/bar.ts, src/baz.tsx
Other content here
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/foo.ts');
      expect(paths).toContain('src/bar.ts');
      expect(paths).toContain('src/baz.tsx');
      expect(paths).toHaveLength(3);
    });

    it('should extract file paths from **Files to create** format', () => {
      const description = `
**Files to create**: src/new-file.ts, src/another.tsx
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/new-file.ts');
      expect(paths).toContain('src/another.tsx');
      expect(paths).toHaveLength(2);
    });

    it('should extract file paths from **Files to modify** format', () => {
      const description = `
**Files to modify**: src/existing.ts, src/legacy.js
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/existing.ts');
      expect(paths).toContain('src/legacy.js');
      expect(paths).toHaveLength(2);
    });

    it('should extract inline file references', () => {
      const description = `
Update \`src/utils/helper.ts\` and \`tests/unit/test.spec.ts\`
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/utils/helper.ts');
      expect(paths).toContain('tests/unit/test.spec.ts');
      expect(paths).toHaveLength(2);
    });

    it('should extract file paths from markdown lists', () => {
      const description = `
- src/component.ts
- tests/test.ts
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/component.ts');
      expect(paths).toContain('tests/test.ts');
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate file paths', () => {
      const description = `
**Files**: src/foo.ts, src/bar.ts
**Files to modify**: src/foo.ts
Update \`src/bar.ts\`
      `;

      const paths = validator.extractFilePaths(description);

      expect(paths).toContain('src/foo.ts');
      expect(paths).toContain('src/bar.ts');
      expect(paths).toHaveLength(2); // Deduplicated
    });

    it('should return empty array if no file paths found', () => {
      const description = 'Just some text without file references';

      const paths = validator.extractFilePaths(description);

      expect(paths).toHaveLength(0);
    });
  });

  describe('validateFile', () => {
    it('should pass validation for file with meaningful content', async () => {
      const filePath = path.join(testDir, 'valid.ts');
      await fs.writeFile(filePath, `
/**
 * Valid TypeScript file with meaningful content
 */
export function hello() {
  console.log("Hello, World!");
  return 42;
}
      `.trim());

      const result = await validator.validateFile('valid.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(true);
      expect(result.lineCount).toBeGreaterThanOrEqual(3);
      expect(result.reason).toBeUndefined();
    });

    it('should fail validation for non-existent file', async () => {
      const result = await validator.validateFile('non-existent.ts');

      expect(result.exists).toBe(false);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('should fail validation for empty file', async () => {
      const filePath = path.join(testDir, 'empty.ts');
      await fs.writeFile(filePath, '');

      const result = await validator.validateFile('empty.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('non-empty lines');
    });

    it('should fail validation for file with only whitespace', async () => {
      const filePath = path.join(testDir, 'whitespace.ts');
      await fs.writeFile(filePath, '\n\n  \n\t\n   \n');

      const result = await validator.validateFile('whitespace.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
    });

    it('should fail validation for file with too few lines', async () => {
      const filePath = path.join(testDir, 'short.ts');
      await fs.writeFile(filePath, 'const x = 1;\n');

      const result = await validator.validateFile('short.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('non-empty lines');
    });

    it('should fail validation for file with too few characters', async () => {
      const filePath = path.join(testDir, 'tiny.ts');
      await fs.writeFile(filePath, 'a\nb\nc\nd\ne\n'); // 5 lines but < 50 chars

      const result = await validator.validateFile('tiny.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('characters');
    });

    it('should fail validation for TODO stub', async () => {
      const filePath = path.join(testDir, 'stub.ts');
      await fs.writeFile(filePath, `
// TODO: Implement this function
export function notImplemented() {
  throw new Error('Not implemented');
}
      `.trim());

      const result = await validator.validateFile('stub.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('stub');
    });

    it('should fail validation for placeholder return null', async () => {
      const filePath = path.join(testDir, 'placeholder.ts');
      await fs.writeFile(filePath, `
export function placeholder() {
  // This is a placeholder function
  // It should be implemented properly
  return null;
}
      `.trim());

      const result = await validator.validateFile('placeholder.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(false);
      expect(result.reason).toContain('stub');
    });

    it('should support absolute paths', async () => {
      const absolutePath = path.join(testDir, 'absolute.ts');
      await fs.writeFile(absolutePath, `
export function absolute() {
  console.log("Absolute path test");
  return true;
}
      `.trim());

      const result = await validator.validateFile(absolutePath);

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(true);
    });
  });

  describe('validateTask', () => {
    it('should validate task with all files present', async () => {
      // Create test files
      const file1 = path.join(testDir, 'src/component.tsx');
      const file2 = path.join(testDir, 'src/utils.ts');

      await fs.ensureDir(path.dirname(file1));
      await fs.writeFile(file1, `
export function Component() {
  return <div>Hello</div>;
}
      `.trim());

      await fs.writeFile(file2, `
export function utils() {
  console.log("Utils");
  return 42;
}
      `.trim());

      const taskDescription = '**Files**: src/component.tsx, src/utils.ts';
      const result = await validator.validateTask(taskDescription, 'T-001');

      expect(result.taskId).toBe('T-001');
      expect(result.valid).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].hasContent).toBe(true);
      expect(result.files[1].hasContent).toBe(true);
    });

    it('should fail validation if any file missing', async () => {
      const file1 = path.join(testDir, 'src/exists.ts');
      await fs.ensureDir(path.dirname(file1));
      await fs.writeFile(file1, `
export function exists() {
  console.log("I exist");
  return true;
}
      `.trim());

      const taskDescription = '**Files**: src/exists.ts, src/missing.ts';
      const result = await validator.validateTask(taskDescription, 'T-002');

      expect(result.taskId).toBe('T-002');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should fail validation if file has no content', async () => {
      const file1 = path.join(testDir, 'src/empty.ts');
      await fs.ensureDir(path.dirname(file1));
      await fs.writeFile(file1, '');

      const taskDescription = '**Files**: src/empty.ts';
      const result = await validator.validateTask(taskDescription, 'T-003');

      expect(result.taskId).toBe('T-003');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('no meaningful content');
    });

    it('should pass validation for task with no file paths', async () => {
      const taskDescription = 'Update documentation (no code files)';
      const result = await validator.validateTask(taskDescription, 'T-004');

      expect(result.taskId).toBe('T-004');
      expect(result.valid).toBe(true);
      expect(result.files).toHaveLength(0);
      expect(result.reason).toContain('No file paths specified');
    });
  });

  describe('validateTasks (batch)', () => {
    it('should validate multiple tasks in parallel', async () => {
      // Create test files
      await fs.ensureDir(path.join(testDir, 'src'));
      await fs.writeFile(path.join(testDir, 'src/a.ts'), 'export const a = 1;\nexport const b = 2;\nexport const c = 3;');
      await fs.writeFile(path.join(testDir, 'src/b.ts'), 'export const x = 1;\nexport const y = 2;\nexport const z = 3;');

      const tasks = [
        { taskId: 'T-001', description: '**Files**: src/a.ts' },
        { taskId: 'T-002', description: '**Files**: src/b.ts' },
        { taskId: 'T-003', description: '**Files**: src/missing.ts' }
      ];

      const results = await validator.validateTasks(tasks);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
    });
  });

  describe('summarizeResults', () => {
    it('should provide summary statistics', () => {
      const results: TaskValidationResult[] = [
        { taskId: 'T-001', valid: true, files: [{ path: 'a.ts', exists: true, hasContent: true, lineCount: 5 }] },
        { taskId: 'T-002', valid: true, files: [{ path: 'b.ts', exists: true, hasContent: true, lineCount: 10 }] },
        { taskId: 'T-003', valid: false, files: [{ path: 'c.ts', exists: false, hasContent: false, lineCount: 0, reason: 'Not found' }], reason: 'File not found' },
        { taskId: 'T-004', valid: true, files: [], reason: 'No files' }
      ];

      const summary = validator.summarizeResults(results);

      expect(summary.total).toBe(4);
      expect(summary.valid).toBe(3);
      expect(summary.invalid).toBe(1);
      expect(summary.noFiles).toBe(1);
      expect(summary.invalidTasks).toEqual(['T-003']);
    });
  });
});
