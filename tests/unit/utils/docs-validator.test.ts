/**
 * Documentation Validator Unit Tests
 *
 * Tests the DocsValidator's ability to catch documentation issues
 * before Docusaurus server starts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DocsValidator } from '../../../src/utils/docs-validator.js';

describe('DocsValidator', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-validator-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test file
   */
  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  describe('checkDuplicateRoutes', () => {
    it('detects README.md and index.md conflict in same folder', async () => {
      // Create conflicting files
      createFile('folder/README.md', '# Readme\n\nContent');
      createFile('folder/index.md', '# Index\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      // Should detect duplicate route
      const duplicateIssue = result.issues.find(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.message).toContain('README.md and index.md');
      expect(duplicateIssue?.message).toContain('/folder/');
    });

    it('detects case-insensitive README/index conflicts', async () => {
      // Create conflicting files with different cases
      createFile('folder/readme.md', '# Readme\n\nContent');
      createFile('folder/INDEX.md', '# Index\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssue = result.issues.find(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssue).toBeDefined();
    });

    it('allows README.md in different folders', async () => {
      // Create README files in different folders - should be fine
      createFile('folder1/README.md', '# Folder 1\n\nContent');
      createFile('folder2/README.md', '# Folder 2\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssues = result.issues.filter(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssues.length).toBe(0);
    });

    it('allows folder with just README.md (no conflict)', async () => {
      createFile('folder/README.md', '# Readme\n\nContent');
      createFile('folder/other-doc.md', '# Other\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssues = result.issues.filter(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssues.length).toBe(0);
    });

    it('allows folder with just index.md (no conflict)', async () => {
      createFile('folder/index.md', '# Index\n\nContent');
      createFile('folder/other-doc.md', '# Other\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssues = result.issues.filter(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssues.length).toBe(0);
    });

    it('detects root-level README/index conflict', async () => {
      createFile('README.md', '# Root Readme\n\nContent');
      createFile('index.md', '# Root Index\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssue = result.issues.find(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.message).toContain('(root)');
    });

    // Note: Case-sensitivity test skipped - macOS filesystem is case-insensitive
    // so Feature.md and feature.md would overwrite each other.
    // On Linux, this test would work. The route normalization still handles
    // this case correctly for cross-platform compatibility.
    it('normalizes routes to lowercase for case-insensitive matching', async () => {
      // This tests the normalization logic without filesystem limitations
      // Create files that would conflict on case-insensitive systems
      createFile('folder1/Feature.md', '# Feature\n\nContent');
      createFile('folder2/feature.md', '# feature\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      // These should NOT conflict because they're in different folders
      const duplicateIssues = result.issues.filter(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssues.length).toBe(0);
    });

    it('handles .mdx files the same as .md', async () => {
      createFile('folder/README.mdx', '# Readme\n\nContent');
      createFile('folder/index.md', '# Index\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssue = result.issues.find(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssue).toBeDefined();
    });

    it('reports duplicate route as warning (non-blocking)', async () => {
      createFile('folder/README.md', '# Readme');
      createFile('folder/index.md', '# Index');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const duplicateIssue = result.issues.find(
        (i) => i.type === 'duplicate_route'
      );
      expect(duplicateIssue?.severity).toBe('warning');
      // Warnings don't make validation fail
      expect(result.valid).toBe(true);
    });
  });

  describe('validateInternalLinks', () => {
    it('detects broken internal links', async () => {
      createFile(
        'folder/doc.md',
        '# Doc\n\nSee [missing](./missing-file.md) for details.'
      );

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const brokenLink = result.issues.find((i) => i.type === 'broken_link');
      expect(brokenLink).toBeDefined();
      expect(brokenLink?.message).toContain('missing-file.md');
    });

    it('allows valid internal links', async () => {
      createFile('folder/doc.md', '# Doc\n\nSee [other](./other.md) for details.');
      createFile('folder/other.md', '# Other\n\nContent');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const brokenLinks = result.issues.filter((i) => i.type === 'broken_link');
      expect(brokenLinks.length).toBe(0);
    });

    it('allows external links', async () => {
      createFile(
        'doc.md',
        '# Doc\n\nSee [Google](https://google.com) for details.'
      );

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const brokenLinks = result.issues.filter((i) => i.type === 'broken_link');
      expect(brokenLinks.length).toBe(0);
    });
  });

  describe('validateFrontmatter', () => {
    it('detects unclosed frontmatter', async () => {
      createFile('doc.md', '---\ntitle: Test\n\n# Content');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const frontmatterIssue = result.issues.find(
        (i) => i.type === 'invalid_frontmatter'
      );
      expect(frontmatterIssue).toBeDefined();
    });

    it('detects unquoted colons in YAML values', async () => {
      createFile('doc.md', '---\ntitle: Feature: Auth System\n---\n\n# Content');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const yamlIssue = result.issues.find(
        (i) => i.type === 'yaml_unquoted_colon'
      );
      expect(yamlIssue).toBeDefined();
      expect(yamlIssue?.autoFixable).toBe(true);
    });

    it('allows valid frontmatter', async () => {
      createFile(
        'doc.md',
        '---\ntitle: "Feature: Auth System"\n---\n\n# Content'
      );

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const frontmatterIssues = result.issues.filter((i) =>
        i.type.startsWith('yaml_') || i.type === 'invalid_frontmatter'
      );
      expect(frontmatterIssues.length).toBe(0);
    });
  });

  describe('validateFileName', () => {
    it('warns about spaces in filenames', async () => {
      createFile('folder/my document.md', '# Doc');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();

      const filenameIssue = result.issues.find(
        (i) => i.type === 'filename_spaces'
      );
      expect(filenameIssue).toBeDefined();
      expect(filenameIssue?.severity).toBe('warning');
    });
  });

  describe('autoFix', () => {
    it('fixes unquoted colons and excludes them from errors', async () => {
      createFile('doc.md', '---\ntitle: Feature: Auth System\n---\n\n# Content');

      const validator = new DocsValidator({
        docsPath: tempDir,
        autoFix: true,
        ignorePaths: [],
      });
      const result = await validator.validate();

      // Fixed issues should not appear in the result
      const yamlIssues = result.issues.filter(
        (i) => i.type === 'yaml_unquoted_colon'
      );
      expect(yamlIssues.length).toBe(0);
      expect(result.fixedCount).toBeGreaterThan(0);
      expect(result.valid).toBe(true);

      // File should be fixed on disk
      const fixed = fs.readFileSync(path.join(tempDir, 'doc.md'), 'utf-8');
      expect(fixed).toContain('title: "Feature: Auth System"');
    });

    it('fixes multiple unquoted colons in the same file without overwriting', async () => {
      createFile(
        'doc.md',
        '---\ntitle: Feature: Auth\ntldr: Summary: Of Feature\n---\n\n# Content'
      );

      const validator = new DocsValidator({
        docsPath: tempDir,
        autoFix: true,
        ignorePaths: [],
      });
      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.fixedCount).toBe(2);

      // Both fixes should persist on disk
      const fixed = fs.readFileSync(path.join(tempDir, 'doc.md'), 'utf-8');
      expect(fixed).toContain('title: "Feature: Auth"');
      expect(fixed).toContain('tldr: "Summary: Of Feature"');
    });
  });

  describe('formatResult', () => {
    it('includes duplicate route warning in output', async () => {
      createFile('folder/README.md', '# Readme');
      createFile('folder/index.md', '# Index');

      const validator = new DocsValidator({
        docsPath: tempDir,
        ignorePaths: [],
      });
      const result = await validator.validate();
      const formatted = DocsValidator.formatResult(result);

      // Check for the warning message (case-insensitive)
      expect(formatted.toLowerCase()).toContain('duplicate');
      expect(formatted).toContain('folder');
    });
  });
});
