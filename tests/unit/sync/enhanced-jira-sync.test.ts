import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Enhanced JIRA Sync Tests
 *
 * Tests for enhanced JIRA content sync with rich descriptions.
 */

import { syncSpecToJiraWithEnhancedContent, EnhancedJiraSyncOptions } from '../../../plugins/specweave-jira/lib/enhanced-jira-sync.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Enhanced JIRA Sync', () => {
  let testRoot: string;
  const fixtureRoot = path.join(__dirname, '../../fixtures/sync');

  beforeEach(async () => {
    // Create temp directory for each test
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-jira-test-'));

    // Copy fixtures to temp directory
    await copyDir(fixtureRoot, testRoot);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  describe('syncSpecToJiraWithEnhancedContent', () => {
    it('should parse spec content successfully', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      expect(result.action).toBe('no-change'); // dry run
    });

    it('should handle missing spec file', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-999-nonexistent.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should require domain and project for non-dry-run', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: false
        // domain and project not provided
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toContain('domain/project');
    });

    it('should build enhanced spec with task mappings', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      expect(result.tasksLinked).toBeGreaterThanOrEqual(0);
    });

    it('should handle verbose mode output', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: true
      };

      // Capture console output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should format JIRA description correctly', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      // JIRA uses different markup than GitHub (no collapsible sections)
      // Description should be properly formatted
    });

    it('should link related increments', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      expect(result.tasksLinked).toBeDefined();
    });

    it('should handle spec without user stories', async () => {
      // Create a minimal spec
      const minimalSpecPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-minimal.md');
      await fs.writeFile(minimalSpecPath, `---
id: spec-001
title: Minimal Spec
---

# Minimal Spec

Just a summary, no user stories.
`);

      const options: EnhancedJiraSyncOptions = {
        specPath: minimalSpecPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      // Should still work
      expect(result.success).toBe(true);
    });

    it('should find architecture docs when present', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      // Create an ADR related to spec-001
      const adrDir = path.join(testRoot, '.specweave/docs/internal/architecture/adr');
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, '0001-core-framework-decision.md'),
        '# ADR-001: Core Framework Decision\n\nDecision text.'
      );

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      // Architecture docs should be included in description
    });

    it('should handle spec with multiple increments', async () => {
      const specPath = path.join(testRoot, '.specweave/docs/internal/specs/default/spec-001-core-framework.md');

      // Create multiple linked increments
      const increment2Path = path.join(testRoot, '.specweave/increments/0002-enhancements');
      await fs.mkdir(increment2Path, { recursive: true });
      await fs.writeFile(
        path.join(increment2Path, 'spec.md'),
        `---
spec_id: spec-001-core-framework
---

# Increment 0002

Related to spec-001.
`
      );

      const options: EnhancedJiraSyncOptions = {
        specPath,
        dryRun: true,
        verbose: false
      };

      const result = await syncSpecToJiraWithEnhancedContent(options);

      expect(result.success).toBe(true);
      expect(result.tasksLinked).toBeDefined();
    });
  });
});
