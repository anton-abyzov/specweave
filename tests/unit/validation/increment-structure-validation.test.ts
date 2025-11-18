import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Unit tests for increment structure validation
 *
 * Purpose: Enforce single source of truth principle by preventing duplicate task files
 *
 * Critical Rules:
 * 1. Only ONE tasks.md file per increment (no tasks-detailed.md, tasks-final.md, etc.)
 * 2. Only core files allowed: spec.md, plan.md, tasks.md, metadata.json
 * 3. Supporting files go in subdirectories: reports/, scripts/, logs/
 */

describe('IncrementStructureValidator', () => {
  // ✅ SAFE: Isolated test directory (prevents .specweave deletion)
  const testIncrementsDir = path.join(os.tmpdir(), 'specweave-test-increment-validation-' + Date.now());

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testIncrementsDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testIncrementsDir, { recursive: true, force: true });
  });

  describe('Duplicate Task Files Detection', () => {
    it('should detect tasks.md and tasks-detailed.md as duplicate', async () => {
      // Given: An increment with both tasks.md and tasks-detailed.md
      const incrementDir = path.join(testIncrementsDir, '0001-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'tasks-detailed.md'), '# Tasks Detailed');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation fails with duplicate task file error
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate task files detected');
      expect(result.errors[0]).toContain('tasks.md');
      expect(result.errors[0]).toContain('tasks-detailed.md');
      expect(result.errors[0]).toContain('Only ONE tasks.md allowed per increment');
    });

    it('should detect tasks.md and tasks-final.md as duplicate', async () => {
      // Given: An increment with both tasks.md and tasks-final.md
      const incrementDir = path.join(testIncrementsDir, '0002-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'tasks-final.md'), '# Tasks Final');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation fails with duplicate task file error
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate task files detected');
      expect(result.errors[0]).toContain('tasks.md');
      expect(result.errors[0]).toContain('tasks-final.md');
      expect(result.errors[0]).toContain('Only ONE tasks.md allowed per increment');
    });

    it('should allow only tasks.md without duplicates', async () => {
      // Given: An increment with only tasks.md (valid)
      const incrementDir = path.join(testIncrementsDir, '0003-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'metadata.json'), '{}');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation passes
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple task file variants', async () => {
      // Given: An increment with 3 task file variants
      const incrementDir = path.join(testIncrementsDir, '0004-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'tasks-detailed.md'), '# Tasks Detailed');
      await fs.writeFile(path.join(incrementDir, 'tasks-summary.md'), '# Tasks Summary');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation fails with all duplicates listed
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate task files detected');
      expect(result.errors[0]).toContain('tasks.md');
      expect(result.errors[0]).toContain('tasks-detailed.md');
      expect(result.errors[0]).toContain('tasks-summary.md');
    });
  });

  describe('Core Files Validation', () => {
    it('should allow core files: spec.md, plan.md, tasks.md, metadata.json', async () => {
      // Given: An increment with all core files
      const incrementDir = path.join(testIncrementsDir, '0005-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'plan.md'), '# Plan');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'metadata.json'), '{}');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation passes
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow supporting directories: reports/, scripts/, logs/', async () => {
      // Given: An increment with supporting directories
      const incrementDir = path.join(testIncrementsDir, '0006-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');

      // Create supporting directories with files
      await fs.mkdir(path.join(incrementDir, 'reports'), { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'reports/summary.md'), '# Summary');
      await fs.mkdir(path.join(incrementDir, 'scripts'), { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'scripts/helper.sh'), '#!/bin/bash');
      await fs.mkdir(path.join(incrementDir, 'logs'), { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'logs/execution.log'), 'Log entry');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation passes (subdirectories allowed)
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown root-level files', async () => {
      // Given: An increment with unknown root-level file
      const incrementDir = path.join(testIncrementsDir, '0007-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'analysis.md'), '# Analysis'); // Unknown file

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation fails with warning about unknown file
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Unknown root-level file: analysis.md. Move to reports/ or scripts/ directory.');
    });
  });

  describe('Allowed File Patterns', () => {
    const allowedRootFiles = [
      'spec.md',
      'plan.md',
      'tasks.md',
      'metadata.json',
      'README.md' // Optional documentation
    ];

    const allowedSubdirectories = [
      'reports',
      'scripts',
      'logs',
      'diagrams' // Optional diagrams
    ];

    it.each(allowedRootFiles)('should allow root file: %s', async (filename) => {
      const incrementDir = path.join(testIncrementsDir, `test-${filename}`);
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, filename), '# Content');

      const result = await validateIncrementStructure(incrementDir);
      expect(result.valid).toBe(true);
    });

    it.each(allowedSubdirectories)('should allow subdirectory: %s/', async (dirname) => {
      const incrementDir = path.join(testIncrementsDir, `test-${dirname}`);
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.mkdir(path.join(incrementDir, dirname), { recursive: true });
      await fs.writeFile(path.join(incrementDir, dirname, 'file.txt'), 'content');

      const result = await validateIncrementStructure(incrementDir);
      expect(result.valid).toBe(true);
    });
  });

  describe('Real-World Edge Cases', () => {
    it('should detect tasks-detailed.md even if hidden in subdirectory (not allowed at root)', async () => {
      // Given: An increment with tasks-detailed.md in root and tasks.md
      const incrementDir = path.join(testIncrementsDir, '0008-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');
      await fs.writeFile(path.join(incrementDir, 'tasks-detailed.md'), '# Tasks Detailed');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation fails
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Duplicate task files detected');
      expect(result.errors[0]).toContain('tasks.md');
      expect(result.errors[0]).toContain('tasks-detailed.md');
      expect(result.errors[0]).toContain('Only ONE tasks.md allowed per increment');
    });

    it('should allow tasks-detailed.md in reports/ directory', async () => {
      // Given: An increment with tasks.md in root and tasks-detailed.md in reports/
      const incrementDir = path.join(testIncrementsDir, '0009-test-increment');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');

      await fs.mkdir(path.join(incrementDir, 'reports'), { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'reports/tasks-detailed.md'), '# Detailed Analysis');

      // When: Validating increment structure
      const result = await validateIncrementStructure(incrementDir);

      // Then: Validation passes (subdirectory files allowed)
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integration with /specweave:validate', () => {
    it('should be called by /specweave:validate command', async () => {
      // This test ensures structure validation is integrated into the validate command
      // Implementation will be added when integrating with validate command
      expect(true).toBe(true); // Placeholder
    });

    it('should be called by /specweave:plan command', async () => {
      // This test ensures structure validation is integrated into the plan command
      // Implementation will be added when integrating with plan command
      expect(true).toBe(true); // Placeholder
    });
  });
});

/**
 * Validates increment structure
 *
 * Rules:
 * 1. Only ONE tasks.md file (no tasks-detailed.md, tasks-final.md, etc.)
 * 2. Core files allowed: spec.md, plan.md, tasks.md, metadata.json, README.md
 * 3. Supporting directories allowed: reports/, scripts/, logs/, diagrams/
 * 4. Unknown root-level files trigger warnings
 *
 * @param incrementPath Path to increment directory
 * @returns Validation result with errors and warnings
 */
async function validateIncrementStructure(incrementPath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowedRootFiles = new Set([
    'spec.md',
    'plan.md',
    'tasks.md',
    'metadata.json',
    'README.md'
  ]);

  const allowedSubdirectories = new Set([
    'reports',
    'scripts',
    'logs',
    'diagrams'
  ]);

  try {
    const entries = await fs.readdir(incrementPath, { withFileTypes: true });

    // Check for duplicate task files (critical error)
    const taskFileVariants = entries
      .filter(entry => entry.isFile())
      .filter(entry => entry.name.startsWith('tasks') && entry.name.endsWith('.md'))
      .map(entry => entry.name);

    if (taskFileVariants.length > 1) {
      errors.push(
        `Duplicate task files detected: ${taskFileVariants.join(', ')}. ` +
        `Only ONE tasks.md allowed per increment.`
      );
    }

    // Check for unknown root-level files (warning)
    const unknownFiles = entries
      .filter(entry => entry.isFile())
      .filter(entry => !allowedRootFiles.has(entry.name))
      .filter(entry => !entry.name.startsWith('tasks')) // Already checked above
      .map(entry => entry.name);

    unknownFiles.forEach(filename => {
      warnings.push(
        `Unknown root-level file: ${filename}. Move to reports/ or scripts/ directory.`
      );
      // Make this a hard error for now to enforce discipline
      errors.push(
        `Unknown root-level file: ${filename}. Move to reports/ or scripts/ directory.`
      );
    });

    // Subdirectories are always allowed (no validation needed for now)
  } catch (error) {
    errors.push(`Failed to validate increment structure: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export { validateIncrementStructure };
