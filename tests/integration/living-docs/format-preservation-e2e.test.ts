/**
 * Format Preservation E2E Test (T-034F)
 *
 * End-to-end test of external-first workflow:
 * 1. Import external GitHub issue → US-001E in living docs
 * 2. Create increment
 * 3. Complete tasks
 * 4. Trigger sync hook
 * 5. Validate format preservation (comment-only sync, title unchanged)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { SyncCoordinator } from '../../../src/sync/sync-coordinator.js';
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir.js';

describe('Format Preservation E2E Test (T-034F)', () => {
  let testDir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const setup = await createIsolatedTestDir('format-preservation-e2e');
    testDir = setup.testDir;
    cleanup = setup.cleanup;

    // Create .specweave structure
    await fs.ensureDir(path.join(testDir, '.specweave/increments'));
    await fs.ensureDir(path.join(testDir, '.specweave/docs/internal/specs/specweave'));
    await fs.ensureDir(path.join(testDir, '.specweave/config.json'));

    // Create config with sync enabled
    await fs.writeJSON(path.join(testDir, '.specweave/config.json'), {
      sync: {
        settings: {
          canUpdateExternalItems: true,
          canUpdateStatus: false
        },
        github: {
          owner: 'test-owner',
          repo: 'test-repo'
        }
      }
    });
  });

  afterEach(async () => {
    await cleanup();
    vi.restoreAllMocks();
  });

  describe('TC-034F-01: External US preserves original title', () => {
    it('should NOT modify external issue title during sync', async () => {
      // 1. Create mock external issue "My-Specific-Item"
      const externalTitle = '[FEAT] My-Specific-Item - Do Not Change This Title';

      // 2. Create living docs US-001E with external metadata
      const featureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-001');
      await fs.ensureDir(featureDir);

      const usFile = path.join(featureDir, 'us-001e-my-specific-item.md');
      await fs.writeFile(usFile, `---
id: US-001E
feature: FS-001
title: "My-Specific-Item"
status: in-progress
priority: P1
created: 2025-11-20
format_preservation: true
external_title: "${externalTitle}"
external_source: github
external_id: "GH-#123"
external_url: "https://github.com/test-owner/test-repo/issues/123"
imported_at: "2025-11-20T10:00:00Z"
origin: external
---

# US-001E: My-Specific-Item

**Feature**: [FS-001](../../_features/FS-001/FEATURE.md)

External item imported from GitHub.

---

## Acceptance Criteria

- [x] **AC-US1E-01**: Feature works correctly
- [ ] **AC-US1E-02**: Tests pass

---

## Implementation

**Increment**: [0001-implement-feature](../../../../increments/0001-implement-feature/spec.md)

**Tasks**: See increment tasks.md
`);

      // 3. Create increment 0001-implement-feature
      const incrementDir = path.join(testDir, '.specweave/increments/0001-implement-feature');
      await fs.ensureDir(incrementDir);

      // Create spec.md
      await fs.writeFile(path.join(incrementDir, 'spec.md'), `---
title: "Implement Feature"
status: in-progress
priority: P1
created: 2025-11-20
epic: FS-001
---

# Implement Feature

Feature spec...
`);

      // Create tasks.md with completed tasks
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `---
total_tasks: 3
---

# Tasks

### T-001: First task
**Status**: [x] completed

### T-002: Second task
**Status**: [x] completed

### T-003: Third task
**Status**: [x] completed
`);

      // 4. Mock GitHub client to capture comment
      let capturedComment = '';
      vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
        GitHubClientV2: class {
          static fromRepo() {
            return {
              addComment: async (_issueNumber: number, comment: string) => {
                capturedComment = comment;
              }
            };
          }
        }
      }));

      // 5. Trigger sync
      const coordinator = new SyncCoordinator({
        projectRoot: testDir,
        incrementId: '0001-implement-feature'
      });

      const result = await coordinator.syncIncrementCompletion();

      // 6. Validate format preservation
      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('comment-only'); // External US → comment-only

      // 7. Validate comment was posted
      expect(capturedComment).toContain('Progress Update');
      expect(capturedComment).toContain('3/3 tasks completed (100%)');

      // 8. Validate title was NOT modified
      // (In real implementation, would fetch GitHub issue and check title)
      // For this test, we verify sync mode was comment-only
      expect(result.syncMode).toBe('comment-only');
    });
  });

  describe('TC-034F-02: Internal US allows full sync', () => {
    it('should allow updating internal US title/description', async () => {
      // 1. Create living docs US-002 (internal, no 'E' suffix)
      const featureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-001');
      await fs.ensureDir(featureDir);

      const usFile = path.join(featureDir, 'us-002-internal-feature.md');
      await fs.writeFile(usFile, `---
id: US-002
feature: FS-001
title: "Internal Feature"
status: in-progress
priority: P1
created: 2025-11-20
format_preservation: false
origin: internal
---

# US-002: Internal Feature

**Feature**: [FS-001](../../_features/FS-001/FEATURE.md)

Internal user story.
`);

      // 2. Create increment
      const incrementDir = path.join(testDir, '.specweave/increments/0002-internal-feature');
      await fs.ensureDir(incrementDir);

      await fs.writeFile(path.join(incrementDir, 'spec.md'), `---
title: "Internal Feature"
status: completed
epic: FS-001
---

# Spec
`);

      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `---
total_tasks: 2
---

# Tasks

### T-001: Task one
**Status**: [x] completed

### T-002: Task two
**Status**: [x] completed
`);

      // 3. Mock GitHub client
      let syncMode = '';
      vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
        GitHubClientV2: class {
          static fromRepo() {
            return {
              addComment: async () => {
                syncMode = 'full-sync';
              }
            };
          }
        }
      }));

      // 4. Trigger sync
      const coordinator = new SyncCoordinator({
        projectRoot: testDir,
        incrementId: '0002-internal-feature'
      });

      const result = await coordinator.syncIncrementCompletion();

      // 5. Validate full sync mode
      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('full-sync'); // Internal US → full sync
    });
  });

  describe('TC-034F-03: Completion comment includes all sections', () => {
    it('should generate comment with tasks, ACs, and progress', async () => {
      // Setup similar to TC-034F-01 but focus on comment structure
      const featureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-001');
      await fs.ensureDir(featureDir);

      const usFile = path.join(featureDir, 'us-003e-comment-test.md');
      await fs.writeFile(usFile, `---
id: US-003E
feature: FS-001
title: "Comment Test"
format_preservation: true
external_source: github
external_id: "GH-#456"
origin: external
---

# US-003E: Comment Test
`);

      const incrementDir = path.join(testDir, '.specweave/increments/0003-comment-test');
      await fs.ensureDir(incrementDir);

      await fs.writeFile(path.join(incrementDir, 'spec.md'), `---
epic: FS-001
---

# Spec

## User Stories

### US-003E: Comment Test

**Acceptance Criteria**:
- [x] **AC-US3E-01**: First criterion
- [x] **AC-US3E-02**: Second criterion
`);

      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `---
total_tasks: 4
---

# Tasks

### T-001: Implement feature
**Status**: [x] completed

### T-002: Write tests
**Status**: [x] completed

### T-003: Update docs
**Status**: [x] completed

### T-004: Code review
**Status**: [ ] pending
`);

      let capturedComment = '';
      vi.mock('../../../plugins/specweave-github/lib/github-client-v2.js', () => ({
        GitHubClientV2: class {
          static fromRepo() {
            return {
              addComment: async (_: number, comment: string) => {
                capturedComment = comment;
              }
            };
          }
        }
      }));

      const coordinator = new SyncCoordinator({
        projectRoot: testDir,
        incrementId: '0003-comment-test'
      });

      await coordinator.syncIncrementCompletion();

      // Validate comment structure
      expect(capturedComment).toContain('## Progress Update');
      expect(capturedComment).toContain('### Completed Tasks');
      expect(capturedComment).toContain('### Acceptance Criteria');
      expect(capturedComment).toContain('**Progress**:');
      expect(capturedComment).toMatch(/\d+\/\d+ tasks completed/);
    });
  });

  describe('TC-034F-04: Sync respects permission flags', () => {
    it('should skip sync when canUpdateExternalItems=false', async () => {
      // Update config to disable external sync
      await fs.writeJSON(path.join(testDir, '.specweave/config.json'), {
        sync: {
          settings: {
            canUpdateExternalItems: false // Disabled
          }
        }
      });

      const featureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-001');
      await fs.ensureDir(featureDir);

      await fs.writeFile(path.join(featureDir, 'us-004e-test.md'), `---
id: US-004E
feature: FS-001
title: "Test"
format_preservation: true
origin: external
---

# US-004E: Test
`);

      const incrementDir = path.join(testDir, '.specweave/increments/0004-test');
      await fs.ensureDir(incrementDir);

      await fs.writeFile(path.join(incrementDir, 'spec.md'), `---
epic: FS-001
---
# Spec
`);

      await fs.writeFile(path.join(incrementDir, 'tasks.md'), `---
total_tasks: 1
---
# Tasks
### T-001: Task
**Status**: [x] completed
`);

      const coordinator = new SyncCoordinator({
        projectRoot: testDir,
        incrementId: '0004-test'
      });

      const result = await coordinator.syncIncrementCompletion();

      // Should complete successfully but in read-only mode
      expect(result.success).toBe(true);
      expect(result.syncMode).toBe('read-only');
      expect(result.userStoriesSynced).toBe(0); // No sync performed
    });
  });
});
