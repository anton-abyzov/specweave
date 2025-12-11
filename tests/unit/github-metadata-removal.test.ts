/**
 * Tests for GitHub Issue Body - Metadata Header Removal
 *
 * Validates that metadata (Feature, Status, Priority, Project) is NOT in issue body
 * and IS in GitHub native fields (labels, milestones) instead.
 *
 * See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserStoryIssueBuilder } from '../../plugins/specweave-github/lib/user-story-issue-builder.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('UserStoryIssueBuilder - Metadata Removal (v0.34.0)', () => {
  let tempDir: string;
  let userStoryPath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(tmpdir(), `specweave-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create test user story file
    userStoryPath = path.join(tempDir, 'us-001-test-story.md');
    const userStoryContent = `---
id: US-001
feature: FS-135
title: Test User Story
status: not-started
priority: P1
created: 2025-12-10
project: specweave
---

# US-001: Test User Story

**As a** developer
**I want** to test metadata removal
**So that** issue bodies are clean

## Acceptance Criteria

- [ ] **AC-US1-01**: Metadata NOT in body
- [ ] **AC-US1-02**: Labels set correctly
- [ ] **AC-US1-03**: Body starts with Progress

## Tasks

- [ ] **T-001**: Remove metadata header
- [ ] **T-002**: Add validation tests

## Implementation

**Increment**: [0135-test-increment](../increments/0135-test-increment)
`;

    await fs.writeFile(userStoryPath, userStoryContent);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('🔴 CRITICAL: Metadata NOT in Body', () => {
    it('should NOT contain **Feature**: in body', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // CRITICAL: Body MUST NOT contain metadata header
      expect(body).not.toContain('**Feature**:');
      expect(body).not.toMatch(/\*\*Feature\*\*:\s*FS-135/);
    });

    it('should NOT contain **Status**: in body', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      expect(body).not.toContain('**Status**:');
      expect(body).not.toMatch(/\*\*Status\*\*:\s*(not-started|active|completed)/);
    });

    it('should NOT contain **Priority**: in body', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      expect(body).not.toContain('**Priority**:');
      expect(body).not.toMatch(/\*\*Priority\*\*:\s*P[0-3]/);
    });

    it('should NOT contain **Project**: in body', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      expect(body).not.toContain('**Project**:');
      expect(body).not.toMatch(/\*\*Project\*\*:\s*specweave/);
    });

    it('should NOT contain ALL metadata fields in body', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // Comprehensive check: NO metadata at all
      const forbiddenPatterns = [
        /\*\*Feature\*\*:/,
        /\*\*Status\*\*:/,
        /\*\*Priority\*\*:/,
        /\*\*Project\*\*:/
      ];

      for (const pattern of forbiddenPatterns) {
        expect(body).not.toMatch(pattern);
      }
    });
  });

  describe('✅ Body Starts with Actual Content', () => {
    it('should start with ## Progress section', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // Body should start with Progress section (not metadata)
      expect(body).toMatch(/^## Progress/);
    });

    it('should have Progress section before User Story', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // Verify order: Progress → User Story
      const progressIndex = body.indexOf('## Progress');
      const userStoryIndex = body.indexOf('## User Story');

      expect(progressIndex).toBeGreaterThan(-1);
      expect(userStoryIndex).toBeGreaterThan(progressIndex);
    });

    it('should contain Acceptance Criteria section', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      expect(body).toContain('## Acceptance Criteria');
      expect(body).toContain('**AC-US1-01**');
      expect(body).toContain('**AC-US1-02**');
      expect(body).toContain('**AC-US1-03**');
    });

    it('should contain Tasks section', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      expect(body).toContain('## Tasks');
      expect(body).toContain('**T-001**');
      expect(body).toContain('**T-002**');
    });
  });

  describe('✅ Metadata STILL in Labels (GitHub Native)', () => {
    it('should set status label correctly', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { labels } = await builder.buildIssueBody();

      // Status MUST be in labels (not body!)
      expect(labels).toContain('status:not_started');
      expect(labels).not.toContain('status:not-started'); // Verify underscore, not dash
    });

    it('should set priority label correctly', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { labels } = await builder.buildIssueBody();

      // Priority MUST be in labels (not body!)
      expect(labels).toContain('p1');
    });

    it('should set project label correctly', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { labels } = await builder.buildIssueBody();

      // Project MUST be in labels (not body!)
      expect(labels).toContain('project:specweave');
    });

    it('should set ALL required labels', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { labels } = await builder.buildIssueBody();

      // Verify ALL metadata is in labels
      expect(labels).toEqual(
        expect.arrayContaining([
          'user-story',
          'specweave',
          'status:not_started',
          'p1',
          'project:specweave'
        ])
      );
    });
  });

  describe('✅ Title Format Unchanged', () => {
    it('should use correct [FS-XXX][US-YYY] format', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { title } = await builder.buildIssueBody();

      // Title format MUST be: [FS-XXX][US-YYY] Title
      expect(title).toMatch(/^\[FS-\d{3,}E?\]\[US-\d{3,}E?\] .+$/);
      expect(title).toContain('[FS-135][US-001]');
    });
  });

  describe('🔍 Edge Cases', () => {
    it('should handle user story with no ACs', async () => {
      // Create user story WITHOUT ACs
      const noAcsPath = path.join(tempDir, 'us-002-no-acs.md');
      await fs.writeFile(noAcsPath, `---
id: US-002
feature: FS-135
title: No ACs Story
status: active
priority: P2
project: specweave
---

## User Story

**As a** tester
**I want** to test edge case
**So that** code is robust
`);

      const builder = new UserStoryIssueBuilder(
        noAcsPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // Still NO metadata in body
      expect(body).not.toContain('**Feature**:');
      expect(body).not.toContain('**Status**:');
      expect(body).not.toContain('**Priority**:');

      // But labels STILL set
      const { labels } = await builder.buildIssueBody();
      expect(labels).toContain('status:active');
      expect(labels).toContain('p2');
    });

    it('should handle user story with "default" project', async () => {
      // Create user story with project: default
      const defaultProjectPath = path.join(tempDir, 'us-003-default.md');
      await fs.writeFile(defaultProjectPath, `---
id: US-003
feature: FS-135
title: Default Project Story
status: completed
priority: P3
project: default
---

## User Story

Test default project handling
`);

      const builder = new UserStoryIssueBuilder(
        defaultProjectPath,
        tempDir,
        'FS-135'
      );

      const { body, labels } = await builder.buildIssueBody();

      // NO metadata in body
      expect(body).not.toContain('**Project**:');

      // NO project label (default is omitted)
      expect(labels).not.toContain('project:default');

      // But other labels STILL set
      expect(labels).toContain('status:complete');
      expect(labels).toContain('p3');
    });
  });

  describe('🎯 Regression Prevention', () => {
    it('should verify body does NOT start with metadata', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      // Body MUST NOT start with any metadata field
      const forbiddenStarts = [
        '\\*\\*Feature\\*\\*:',
        '\\*\\*Status\\*\\*:',
        '\\*\\*Priority\\*\\*:',
        '\\*\\*Project\\*\\*:'
      ];

      for (const start of forbiddenStarts) {
        expect(body.trimStart()).not.toMatch(new RegExp(`^${start}`));
      }
    });

    it('should verify Progress comes before any metadata keywords', async () => {
      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tempDir,
        'FS-135'
      );

      const { body } = await builder.buildIssueBody();

      const progressIndex = body.indexOf('## Progress');

      // If body contains "Feature", "Status", "Priority" keywords
      // they MUST come AFTER Progress section (not before)
      const featureIndex = body.indexOf('Feature');
      if (featureIndex > -1 && featureIndex < body.indexOf('## Links')) {
        // Only check if "Feature" appears in content (not in links section)
        expect(progressIndex).toBeLessThan(featureIndex);
      }
    });
  });
});
