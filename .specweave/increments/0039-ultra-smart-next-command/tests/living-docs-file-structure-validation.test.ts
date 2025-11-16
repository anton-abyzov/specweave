/**
 * Living Docs File Structure Validation Tests
 *
 * CRITICAL REGRESSION TESTS for Bug Fix: spec-XXXX-*.md file pattern
 *
 * Problem: sync-living-docs hook was creating files like:
 *   ❌ .specweave/docs/internal/specs/specweave/spec-0039-ultra-smart-next-command.md
 *
 * Expected structure:
 *   ✅ .specweave/docs/internal/specs/_features/FS-039/FEATURE.md
 *   ✅ .specweave/docs/internal/specs/specweave/FS-039/us-001-*.md
 *
 * Root Cause:
 *   - Deprecated copyIncrementSpecToLivingDocs() function in sync-living-docs hook
 *   - Fallback logic when hierarchicalDistribution() failed
 *
 * Fix:
 *   1. Removed deprecated copyIncrementSpecToLivingDocs() function
 *   2. Removed fallback logic (fail gracefully instead)
 *   3. Added validation in SpecDistributor.validateFeatureFilePath()
 *
 * @author SpecWeave Team
 * @version 1.0.0
 * @since v0.21.3
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { SpecDistributor } from '../../../src/core/living-docs/spec-distributor.js';

describe('Living Docs File Structure Validation', () => {
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  describe('CRITICAL: spec-XXXX-*.md pattern NEVER created', () => {
    it('should reject spec-XXXX-*.md file pattern', async () => {
      // This pattern should NEVER be created
      const wrongPattern = /spec-\d+-[^/]+\.md$/;

      // Scan all spec files in living docs
      const allSpecFiles = await findAllSpecFiles(specsDir);

      // Assert: NO files match the wrong pattern
      const wrongFiles = allSpecFiles.filter(f => wrongPattern.test(f));

      expect(wrongFiles).toEqual([]);

      if (wrongFiles.length > 0) {
        throw new Error(
          `CRITICAL BUG DETECTED: Found files with wrong pattern:\n${wrongFiles.join('\n')}\n\n` +
          `These should be organized in FS-XXX folder structure!`
        );
      }
    });

    it('should only create files in FS-XXX folder structure', async () => {
      // Correct patterns:
      // - _features/FS-XXX/FEATURE.md
      // - {project}/FS-XXX/us-*.md
      // - {project}/FS-XXX/README.md

      const allSpecFiles = await findAllSpecFiles(specsDir);
      const projectSpecFiles = allSpecFiles.filter(f => {
        // Exclude _features and _epics folders (they have their own structure)
        return !f.includes('/_features/') && !f.includes('/_epics/');
      });

      for (const file of projectSpecFiles) {
        // File should be inside a FS-XXX folder OR be in _features/_epics
        const hasFeatureFolder = /\/FS-\d{3}\//.test(file);
        const isFeatureOverview = file.includes('/_features/');
        const isEpicOverview = file.includes('/_epics/');

        const isValidStructure = hasFeatureFolder || isFeatureOverview || isEpicOverview;

        if (!isValidStructure) {
          throw new Error(
            `INVALID FILE STRUCTURE: ${file}\n` +
            `File must be inside FS-XXX folder or _features/_epics folder!`
          );
        }
      }
    });
  });

  describe('SpecDistributor validation', () => {
    let distributor: SpecDistributor;

    beforeEach(() => {
      distributor = new SpecDistributor(projectRoot);
    });

    it('should validate feature file paths', async () => {
      // Access private method via reflection for testing
      const validateMethod = (distributor as any).validateFeatureFilePath.bind(distributor);

      // Valid paths (should not throw)
      expect(() => {
        validateMethod(
          path.join(specsDir, '_features/FS-039/FEATURE.md'),
          'FS-039'
        );
      }).not.toThrow();

      expect(() => {
        validateMethod(
          path.join(specsDir, 'specweave/FS-039/us-001-test.md'),
          'FS-039'
        );
      }).not.toThrow();

      // Invalid paths (should throw)
      expect(() => {
        validateMethod(
          path.join(specsDir, 'specweave/spec-0039-test.md'),
          'FS-039'
        );
      }).toThrow(/CRITICAL.*wrong pattern/);

      expect(() => {
        validateMethod(
          path.join(specsDir, 'specweave/SPEC-0039-test.md'),
          'FS-039'
        );
      }).toThrow(/CRITICAL.*wrong pattern/);
    });

    it('should reject files not in feature folder', async () => {
      const validateMethod = (distributor as any).validateFeatureFilePath.bind(distributor);

      expect(() => {
        validateMethod(
          path.join(specsDir, 'specweave/FEATURE.md'), // Missing FS-XXX folder
          'FS-039'
        );
      }).toThrow(/doesn't contain feature folder/);
    });

    it('should require FEATURE.md or EPIC.md filename', async () => {
      const validateMethod = (distributor as any).validateFeatureFilePath.bind(distributor);

      // Valid filenames
      expect(() => {
        validateMethod(
          path.join(specsDir, '_features/FS-039/FEATURE.md'),
          'FS-039'
        );
      }).not.toThrow();

      expect(() => {
        validateMethod(
          path.join(specsDir, '_epics/EP-001/EPIC.md'),
          'EP-001'
        );
      }).not.toThrow();

      // Invalid filename
      expect(() => {
        validateMethod(
          path.join(specsDir, '_features/FS-039/overview.md'),
          'FS-039'
        );
      }).toThrow(/must be named FEATURE.md or EPIC.md/);
    });
  });

  describe('Hierarchical distribution integration', () => {
    it('should create proper folder structure for new increment', async () => {
      const testIncrementId = '9999-test-validation';
      const testSpecPath = path.join(projectRoot, '.specweave', 'increments', testIncrementId);

      try {
        // Create test increment with spec
        await fs.ensureDir(testSpecPath);
        await fs.writeFile(
          path.join(testSpecPath, 'spec.md'),
          `---
title: "Test Validation Feature"
epic: FS-999
status: planned
---

# Test Validation Feature

## Overview

Test feature for validation

## User Stories

### US-001: Test Story

**As a** developer
**I want** to test validation
**So that** bugs never happen again

**Acceptance Criteria**:

- AC-US1-01: Should validate file structure
- AC-US1-02: Should reject wrong patterns
`,
          'utf-8'
        );

        // Run distribution
        const distributor = new SpecDistributor(projectRoot);
        const result = await distributor.distribute(testIncrementId);

        // Verify: Feature file created in proper location
        expect(result.success).toBe(true);
        expect(result.epicPath).toMatch(/\/FS-999\/FEATURE\.md$/);

        // Verify: NO spec-XXXX-*.md files created
        const wrongFiles = await findFilesMatchingPattern(
          specsDir,
          /spec-9999-[^/]+\.md$/
        );
        expect(wrongFiles).toEqual([]);

      } finally {
        // Cleanup
        await fs.remove(testSpecPath);

        // Remove created living docs
        const testFeaturePath = path.join(specsDir, '_features/FS-999');
        if (await fs.pathExists(testFeaturePath)) {
          await fs.remove(testFeaturePath);
        }

        const testProjectPath = path.join(specsDir, 'specweave/FS-999');
        if (await fs.pathExists(testProjectPath)) {
          await fs.remove(testProjectPath);
        }
      }
    });
  });
});

/**
 * Helper: Find all .md files in specs directory
 */
async function findAllSpecFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  if (!await fs.pathExists(dir)) {
    return files;
  }

  async function scan(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Helper: Find files matching a pattern
 */
async function findFilesMatchingPattern(dir: string, pattern: RegExp): Promise<string[]> {
  const allFiles = await findAllSpecFiles(dir);
  return allFiles.filter(f => pattern.test(f));
}
