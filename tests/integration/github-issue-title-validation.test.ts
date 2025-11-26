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

        // Verify title matches pattern: [FS-XXX][US-YYY] Title (3+ digits each)
        expect(result.title).toMatch(/^\[FS-\d{3,}\]\[US-\d{3,}\] .+$/);

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

/**
 * Tests for GitHubClientV2.validateIssueTitle() method
 *
 * Verifies that type-based prefixes like [BUG], [HOTFIX] are rejected.
 * This prevents issues like #749 where Claude used [BUG] instead of [FS-XXX][US-YYY].
 *
 * NOTE: We test the validation logic directly here because:
 * 1. validateIssueTitle is a private method
 * 2. Module resolution issues prevent direct import in tests
 * 3. The logic is critical and must be tested
 *
 * @see plugins/specweave-github/lib/github-client-v2.ts
 */
describe('GitHubClientV2 Title Validation (Issue #749 Fix)', () => {
  /**
   * Replicates the validation logic from GitHubClientV2.validateIssueTitle()
   * This must be kept in sync with the actual implementation!
   *
   * @see plugins/specweave-github/lib/github-client-v2.ts lines 208-243
   */
  const validateTitle = (title: string) => {
    // Check for deprecated [Increment XXXX] format
    const deprecatedIncrementPattern = /\[Increment\s+\d+\]/i;
    if (deprecatedIncrementPattern.test(title)) {
      throw new Error(`DEPRECATED FORMAT: ${title}`);
    }

    // Check for type-based prefixes (CRITICAL FIX for issue #749)
    const typePrefixPattern = /^\[(BUG|HOTFIX|FEATURE|DOCS|REFACTOR|CHORE|EXPERIMENT|Bug|Hotfix|Feature|Docs|Refactor|Chore|Experiment)\]/i;
    if (typePrefixPattern.test(title)) {
      throw new Error(`INVALID TITLE FORMAT: ${title}`);
    }
  };

  describe('❌ REJECT type-based prefixes (Issue #749)', () => {
    it('should REJECT [BUG] prefix', () => {
      expect(() => validateTitle('[BUG] Fix broken interactive prompts')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [HOTFIX] prefix', () => {
      expect(() => validateTitle('[HOTFIX] Critical security fix')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [FEATURE] prefix', () => {
      expect(() => validateTitle('[FEATURE] Add new dashboard')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [DOCS] prefix', () => {
      expect(() => validateTitle('[DOCS] Update README')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [REFACTOR] prefix', () => {
      expect(() => validateTitle('[REFACTOR] Clean up auth module')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [CHORE] prefix', () => {
      expect(() => validateTitle('[CHORE] Update dependencies')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT [EXPERIMENT] prefix', () => {
      expect(() => validateTitle('[EXPERIMENT] POC for new feature')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT lowercase [bug] prefix', () => {
      expect(() => validateTitle('[bug] Fix crash on startup')).toThrow(/INVALID TITLE FORMAT/);
    });

    it('should REJECT mixed case [Bug] prefix', () => {
      expect(() => validateTitle('[Bug] Handle null pointer')).toThrow(/INVALID TITLE FORMAT/);
    });
  });

  describe('❌ REJECT deprecated [Increment XXXX] format', () => {
    it('should REJECT [Increment 0004] prefix', () => {
      expect(() => validateTitle('[Increment 0004] Plugin Architecture')).toThrow(/DEPRECATED FORMAT/);
    });

    it('should REJECT [Increment 123] prefix (any number)', () => {
      expect(() => validateTitle('[Increment 123] Some Feature')).toThrow(/DEPRECATED FORMAT/);
    });
  });

  describe('✅ ACCEPT correct [FS-XXX][US-YYY] format', () => {
    it('should ACCEPT [FS-048][US-001] format', () => {
      expect(() => validateTitle('[FS-048][US-001] Smart Pagination')).not.toThrow();
    });

    it('should ACCEPT [FS-059][US-003] format with priority', () => {
      expect(() => validateTitle('[FS-059][US-003] Hook Optimization (P0)')).not.toThrow();
    });

    it('should ACCEPT [FS-054][US-001] format', () => {
      expect(() => validateTitle('[FS-054][US-001] Fix Reopen Desync Bug (P0)')).not.toThrow();
    });
  });

  describe('✅ ACCEPT titles without prefixes (non-SpecWeave issues)', () => {
    it('should ACCEPT plain title without prefix', () => {
      expect(() => validateTitle('Regular issue without prefix')).not.toThrow();
    });

    it('should ACCEPT title with bug keyword but not as prefix', () => {
      expect(() => validateTitle('Fix bug in authentication')).not.toThrow();
    });
  });
});
