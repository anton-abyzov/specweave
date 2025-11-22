/**
 * Integration Test: GitHub Issue Title Format Validation
 *
 * Tests that UserStoryIssueBuilder correctly validates and generates
 * GitHub issue titles in the [FS-XXX][US-YYY] format.
 *
 * Prevents regression of incidents:
 * - 2025-11-22: 8 issues created with deprecated [SP-US-XXX] format
 * - 2025-11-22: 2 issues created with [FS-XXX] Feature-only format
 *
 * @see CLAUDE.md Section 10 (GitHub Issue Format Policy)
 * @see ADR-0032 (Universal Hierarchy Mapping)
 * @see .specweave/increments/0050-external-tool-import-phase-1b-7/reports/SP-PREFIX-BUG-ROOT-CAUSE-2025-11-22.md
 */

import { describe, it, expect } from 'vitest';
import { UserStoryIssueBuilder } from '../../plugins/specweave-github/lib/user-story-issue-builder.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('GitHub Issue Title Validation (ADR-0032)', () => {
  // Helper to create test user story file
  function createTestUserStory(dir: string, frontmatter: string, content: string = ''): string {
    const filePath = join(dir, 'us-001-test.md');
    const fullContent = `---\n${frontmatter}\n---\n\n${content}`;
    writeFileSync(filePath, fullContent, 'utf-8');
    return filePath;
  }

  describe('❌ REJECT deprecated SP- prefix', () => {
    it('should THROW on SP-US-XXX format', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            'SP-US-001', // ❌ DEPRECATED format
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/Invalid featureId format/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should THROW on SP-FS-XXX format', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            'SP-FS-048', // ❌ DEPRECATED format
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/Invalid featureId format/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should THROW on SP-FS-XXX-specweave format', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            'SP-FS-048-specweave', // ❌ DEPRECATED format with project suffix
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/Invalid featureId format/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('❌ REJECT missing Feature ID', () => {
    it('should THROW on undefined featureId', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            undefined as any, // ❌ Missing featureId
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/featureId is required/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should THROW on empty string featureId', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            '', // ❌ Empty featureId
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/featureId is required/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('❌ REJECT project suffix in featureId', () => {
    it('should THROW on FS-XXX-specweave format (project suffix belongs in README.md only)', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        expect(() => {
          new UserStoryIssueBuilder(
            join(testDir, 'us-001-test.md'),
            testDir,
            'FS-048-specweave', // ❌ Project suffix (internal use only, NOT GitHub!)
            { owner: 'test', repo: 'test' }
          );
        }).toThrow(/Invalid featureId format/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('✅ ACCEPT correct FS-XXX format', () => {
    it('should ACCEPT FS-001 format', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        const builder = new UserStoryIssueBuilder(
          join(testDir, 'us-001-test.md'),
          testDir,
          'FS-001', // ✅ CORRECT format
          { owner: 'test', repo: 'test' }
        );
        expect(builder).toBeDefined();
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should ACCEPT FS-048 format', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        const builder = new UserStoryIssueBuilder(
          join(testDir, 'us-001-test.md'),
          testDir,
          'FS-048', // ✅ CORRECT format
          { owner: 'test', repo: 'test' }
        );
        expect(builder).toBeDefined();
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should ACCEPT FS-999 format (3-digit)', () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        const builder = new UserStoryIssueBuilder(
          join(testDir, 'us-001-test.md'),
          testDir,
          'FS-999', // ✅ CORRECT format
          { owner: 'test', repo: 'test' }
        );
        expect(builder).toBeDefined();
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('✅ Generate correct [FS-XXX][US-YYY] title', () => {
    it('should generate [FS-048][US-001] Title format', async () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        const frontmatter = `id: US-001
feature: FS-048
title: Smart Pagination During Init
status: active
priority: P0
created: 2025-11-22`;

        const content = `## User Story

**As a** developer
**I want** pagination
**So that** I can avoid rate limits

## Acceptance Criteria

- [ ] **AC-US1-01**: Init prompts for limit
- [ ] **AC-US1-02**: API calls estimated
`;

        const filePath = createTestUserStory(testDir, frontmatter, content);

        const builder = new UserStoryIssueBuilder(
          filePath,
          testDir,
          'FS-048',
          { owner: 'test', repo: 'test' }
        );

        const result = await builder.buildIssueBody();

        // Verify title matches pattern: [FS-XXX][US-YYY] Title
        expect(result.title).toMatch(/^\[FS-\d{3}\]\[US-\d{3}\] .+$/);

        // Verify exact format
        expect(result.title).toBe('[FS-048][US-001] Smart Pagination During Init');

        // Verify NO SP- prefix
        expect(result.title).not.toContain('SP-');
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should generate [FS-033][US-015] Title format (different IDs)', async () => {
      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        const frontmatter = `id: US-015
feature: FS-033
title: Task Completion Tracking
status: complete
priority: P1
created: 2025-10-15`;

        const filePath = createTestUserStory(testDir, frontmatter, '## User Story\n\nTest');

        const builder = new UserStoryIssueBuilder(
          filePath,
          testDir,
          'FS-033',
          { owner: 'test', repo: 'test' }
        );

        const result = await builder.buildIssueBody();

        expect(result.title).toBe('[FS-033][US-015] Task Completion Tracking');
        expect(result.title).not.toContain('SP-');
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('❌ REJECT malformed title after generation (safety check)', () => {
    it('should catch if generated title somehow violates pattern', async () => {
      // This is a defensive test - if the title generation logic breaks,
      // the final pattern check should catch it

      const testDir = join(tmpdir(), `test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });

      try {
        // Create a user story with malformed ID (should fail during generation)
        const frontmatter = `id: INVALID
feature: FS-048
title: Test Story
status: active
priority: P0
created: 2025-11-22`;

        const filePath = createTestUserStory(testDir, frontmatter, '## User Story\n\nTest');

        const builder = new UserStoryIssueBuilder(
          filePath,
          testDir,
          'FS-048',
          { owner: 'test', repo: 'test' }
        );

        // Should throw because generated title won't match pattern
        await expect(builder.buildIssueBody()).rejects.toThrow(/incorrect format/);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });
});
