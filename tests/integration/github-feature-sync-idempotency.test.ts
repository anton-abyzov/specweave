/**
 * Integration tests for GitHubFeatureSync - Idempotency Testing
 *
 * Tests the triple idempotency check:
 * 1. Check frontmatter for existing issue number
 * 2. Search GitHub by title if frontmatter missing
 * 3. Create new issue if not found anywhere
 *
 * These tests use MOCKED GitHub CLI to avoid rate limiting and ensure deterministic results.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GitHubFeatureSync } from '../../plugins/specweave-github/lib/github-feature-sync.js';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

// Mock execFileNoThrow to avoid actual GitHub CLI calls
jest.mock('../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: jest.fn()
}));

import { execFileNoThrow } from '../../src/utils/execFileNoThrow.js';
const mockExecFileNoThrow = execFileNoThrow as jest.MockedFunction<typeof execFileNoThrow>;

describe('GitHubFeatureSync - Idempotency Integration Tests', () => {
  let tempDir: string;
  let specsDir: string;
  let featureDir: string;
  let projectRoot: string;
  let client: GitHubClientV2;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(path.join(tmpdir(), 'specweave-github-sync-test-'));
    projectRoot = tempDir;

    // Create directory structure
    specsDir = path.join(tempDir, '.specweave/docs/internal/specs');
    featureDir = path.join(specsDir, '_features/FS-999');
    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, 'default/FS-999'), { recursive: true });

    // Create GitHub client
    client = GitHubClientV2.fromRepo('test-owner', 'test-repo');

    // Reset mocks
    mockExecFileNoThrow.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Triple Idempotency Check', () => {
    it('Check 1: Should use existing issue number from frontmatter', async () => {
      // Arrange: Feature with milestone, User Story with existing issue number in frontmatter
      const featureContent = `---
id: FS-999
title: "Test Feature"
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
external_tools:
  github:
    type: milestone
    id: 10
    url: https://github.com/test-owner/test-repo/milestone/10
---

# FS-999: Test Feature

## Overview

Test feature for idempotency.
`;

      const userStoryContent = `---
id: US-001
feature: FS-999
title: "Existing Issue Test"
status: active
created: 2025-11-15
external:
  github:
    issue: 123
    url: https://github.com/test-owner/test-repo/issues/123
---

# US-001: Existing Issue Test

## Acceptance Criteria

- [ ] **AC-US1-01**: Issue number from frontmatter is used
`;

      await fs.writeFile(path.join(featureDir, 'FEATURE.md'), featureContent);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-001-existing.md'), userStoryContent);

      // Mock GitHub API responses
      mockExecFileNoThrow
        .mockResolvedValueOnce({ // getIssue (verify exists)
          exitCode: 0,
          success: true,
          stdout: JSON.stringify({
            number: 123,
            title: '[FS-999][US-001] Existing Issue Test',
            state: 'open',
            url: 'https://github.com/test-owner/test-repo/issues/123',
            labels: []
          }),
          stderr: ''
        })
        .mockResolvedValueOnce({ // updateIssue
          exitCode: 0,
          success: true,
          stdout: '',
          stderr: ''
        });

      // Act: Sync feature
      const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
      const result = await sync.syncFeatureToGitHub('FS-999');

      // Assert: Issue #123 was updated, not created
      expect(result.issuesCreated).toBe(0);
      expect(result.issuesUpdated).toBe(1);

      // Verify getIssue was called to verify it exists
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'view', '123'])
      );

      // Verify updateIssue was called
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'edit', '123'])
      );
    });

    it('Check 2: Should search by title when frontmatter missing', async () => {
      // Arrange: User Story WITHOUT issue number in frontmatter
      const featureContent = `---
id: FS-999
title: "Test Feature"
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
external_tools:
  github:
    type: milestone
    id: 10
    url: https://github.com/test-owner/test-repo/milestone/10
---

# FS-999: Test Feature
`;

      const userStoryContent = `---
id: US-002
feature: FS-999
title: "Search By Title Test"
status: active
created: 2025-11-15
---

# US-002: Search By Title Test

## Acceptance Criteria

- [ ] **AC-US2-01**: Issue is found by title search
`;

      await fs.writeFile(path.join(featureDir, 'FEATURE.md'), featureContent);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-002-search.md'), userStoryContent);

      // Mock GitHub API responses
      mockExecFileNoThrow
        .mockResolvedValueOnce({ // searchIssueByTitle (found!)
          exitCode: 0,
          success: true,
          stdout: JSON.stringify([{
            number: 456,
            title: '[FS-999][US-002] Search By Title Test',
            state: 'open',
            url: 'https://github.com/test-owner/test-repo/issues/456',
            labels: []
          }]),
          stderr: ''
        })
        .mockResolvedValueOnce({ // updateIssue
          exitCode: 0,
          success: true,
          stdout: '',
          stderr: ''
        });

      // Act: Sync feature
      const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
      const result = await sync.syncFeatureToGitHub('FS-999');

      // Assert: Found by search, updated (not created)
      expect(result.issuesCreated).toBe(0);
      expect(result.issuesUpdated).toBe(1);

      // Verify searchIssueByTitle was called
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'issue',
          'list',
          '--search',
          expect.stringContaining('[FS-999][US-002] Search By Title Test')
        ])
      );

      // Verify frontmatter was updated with found issue number
      const updatedContent = await fs.readFile(
        path.join(specsDir, 'default/FS-999/us-002-search.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('issue: 456');
    });

    it('Check 3: Should create new issue when not found anywhere', async () => {
      // Arrange: User Story with NO issue number and search returns nothing
      const featureContent = `---
id: FS-999
title: "Test Feature"
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
external_tools:
  github:
    type: milestone
    id: 10
    url: https://github.com/test-owner/test-repo/milestone/10
---

# FS-999: Test Feature
`;

      const userStoryContent = `---
id: US-003
feature: FS-999
title: "Create New Issue Test"
status: active
priority: P1
created: 2025-11-15
---

# US-003: Create New Issue Test

## Acceptance Criteria

- [ ] **AC-US3-01**: New issue is created when not found
`;

      await fs.writeFile(path.join(featureDir, 'FEATURE.md'), featureContent);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-003-new.md'), userStoryContent);

      // Mock GitHub API responses
      mockExecFileNoThrow
        .mockResolvedValueOnce({ // searchIssueByTitle (NOT found)
          exitCode: 0,
          success: true,
          stdout: '[]', // Empty array
          stderr: ''
        })
        .mockResolvedValueOnce({ // createIssue
          exitCode: 0,
          success: true,
          stdout: 'https://github.com/test-owner/test-repo/issues/789',
          stderr: ''
        });

      // Act: Sync feature
      const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
      const result = await sync.syncFeatureToGitHub('FS-999');

      // Assert: New issue created
      expect(result.issuesCreated).toBe(1);
      expect(result.issuesUpdated).toBe(0);

      // Verify createIssue was called
      expect(mockExecFileNoThrow).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'issue',
          'create',
          '--title',
          '[FS-999][US-003] Create New Issue Test'
        ])
      );

      // Verify frontmatter was updated with new issue number
      const updatedContent = await fs.readFile(
        path.join(specsDir, 'default/FS-999/us-003-new.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('issue: 789');
    });

    it('Should handle deleted issues gracefully (frontmatter has number but issue deleted)', async () => {
      // Arrange: User Story with issue number but GitHub returns 404
      const featureContent = `---
id: FS-999
title: "Test Feature"
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
external_tools:
  github:
    type: milestone
    id: 10
    url: https://github.com/test-owner/test-repo/milestone/10
---

# FS-999: Test Feature
`;

      const userStoryContent = `---
id: US-004
feature: FS-999
title: "Deleted Issue Test"
status: active
created: 2025-11-15
external:
  github:
    issue: 999
    url: https://github.com/test-owner/test-repo/issues/999
---

# US-004: Deleted Issue Test

## Acceptance Criteria

- [ ] **AC-US4-01**: New issue created when old one deleted
`;

      await fs.writeFile(path.join(featureDir, 'FEATURE.md'), featureContent);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-004-deleted.md'), userStoryContent);

      // Mock GitHub API responses
      mockExecFileNoThrow
        .mockResolvedValueOnce({ // getIssue (404 - deleted!)
          exitCode: 1,
          success: false,
          stdout: '',
          stderr: 'Not Found'
        })
        .mockResolvedValueOnce({ // searchIssueByTitle (not found)
          exitCode: 0,
          success: true,
          stdout: '[]',
          stderr: ''
        })
        .mockResolvedValueOnce({ // createIssue (create new)
          exitCode: 0,
          success: true,
          stdout: 'https://github.com/test-owner/test-repo/issues/1000',
          stderr: ''
        });

      // Act: Sync feature
      const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
      const result = await sync.syncFeatureToGitHub('FS-999');

      // Assert: New issue created (old one was deleted)
      expect(result.issuesCreated).toBe(1);
      expect(result.issuesUpdated).toBe(0);

      // Verify frontmatter updated with NEW issue number
      const updatedContent = await fs.readFile(
        path.join(specsDir, 'default/FS-999/us-004-deleted.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('issue: 1000');
    });
  });

  describe('Idempotency: Multiple Sync Runs', () => {
    it('Should produce identical results when syncing same feature twice', async () => {
      // Arrange: Feature with multiple user stories
      const featureContent = `---
id: FS-999
title: "Multi-Sync Test"
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
external_tools:
  github:
    type: milestone
    id: 10
    url: https://github.com/test-owner/test-repo/milestone/10
---

# FS-999: Multi-Sync Test
`;

      const us1Content = `---
id: US-005
feature: FS-999
title: "First User Story"
status: active
created: 2025-11-15
---

# US-005: First User Story

## Acceptance Criteria

- [ ] **AC-US5-01**: Idempotent sync test
`;

      const us2Content = `---
id: US-006
feature: FS-999
title: "Second User Story"
status: active
created: 2025-11-15
---

# US-006: Second User Story

## Acceptance Criteria

- [ ] **AC-US6-01**: Idempotent sync test
`;

      await fs.writeFile(path.join(featureDir, 'FEATURE.md'), featureContent);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-005-first.md'), us1Content);
      await fs.writeFile(path.join(specsDir, 'default/FS-999/us-006-second.md'), us2Content);

      // Mock first sync - both issues created
      mockExecFileNoThrow
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: '[]', stderr: '' }) // search US-005 (not found)
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: 'https://github.com/.../issues/100', stderr: '' }) // create US-005
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: '[]', stderr: '' }) // search US-006 (not found)
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: 'https://github.com/.../issues/101', stderr: '' }); // create US-006

      // Act: First sync
      const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
      const result1 = await sync.syncFeatureToGitHub('FS-999');

      // Assert first sync
      expect(result1.issuesCreated).toBe(2);
      expect(result1.issuesUpdated).toBe(0);

      // Mock second sync - both issues updated (frontmatter has numbers)
      mockExecFileNoThrow.mockReset();
      mockExecFileNoThrow
        .mockResolvedValueOnce({ // getIssue US-005
          exitCode: 0,
          success: true,
          stdout: JSON.stringify({ number: 100, title: '[FS-999][US-005]...', state: 'open', url: '...', labels: [] }),
          stderr: ''
        })
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: '', stderr: '' }) // update US-005
        .mockResolvedValueOnce({ // getIssue US-006
          exitCode: 0,
          success: true,
          stdout: JSON.stringify({ number: 101, title: '[FS-999][US-006]...', state: 'open', url: '...', labels: [] }),
          stderr: ''
        })
        .mockResolvedValueOnce({ exitCode: 0, success: true, stdout: '', stderr: '' }); // update US-006

      // Act: Second sync (idempotent!)
      const result2 = await sync.syncFeatureToGitHub('FS-999');

      // Assert second sync - NO new issues created!
      expect(result2.issuesCreated).toBe(0);
      expect(result2.issuesUpdated).toBe(2);
    });
  });
});
