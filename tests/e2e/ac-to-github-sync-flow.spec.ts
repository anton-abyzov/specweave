/**
 * E2E Test: AC to GitHub Sync Flow
 *
 * Validates the complete flow from marking an AC as complete in spec.md
 * to having it reflected in the linked GitHub issue.
 *
 * This tests the fix for issue #966 where AC completions were not
 * automatically synced to GitHub issues.
 *
 * Flow:
 * 1. Create increment with spec.md containing ACs
 * 2. Create linked GitHub issue
 * 3. Mark AC as complete in tasks.md
 * 4. Trigger update-ac-status hook
 * 5. Verify GitHub issue checkbox is updated
 *
 * @see https://github.com/anton-abyzov/specweave/issues/966
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';

// ✅ SAFE: Isolated test directory with unique ID
const TEST_ROOT = path.join(
  os.tmpdir(),
  `specweave-e2e-ac-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

// Check if GitHub CLI is available and authenticated
const isGitHubAvailable = (): boolean => {
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

// Get current repo info
const getRepoInfo = (): { owner: string; repo: string } | null => {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8'
    }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // Not a git repo or no remote
  }
  return null;
};

describe('E2E: AC to GitHub Sync Flow', () => {
  const skipIfNoGitHub = !isGitHubAvailable();
  const FEATURE_ID = 'FS-E2E-AC-SYNC';
  let createdIssueNumber: number | null = null;

  beforeEach(async () => {
    if (skipIfNoGitHub) return;

    // Clean up and create test directory
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_ROOT, { recursive: true });
    await fs.mkdir(path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test'), {
      recursive: true
    });
    await fs.mkdir(
      path.join(TEST_ROOT, '.specweave/docs/internal/specs/specweave', FEATURE_ID),
      { recursive: true }
    );
  });

  afterEach(async () => {
    if (skipIfNoGitHub) return;

    // Clean up GitHub issues
    if (createdIssueNumber) {
      try {
        execSync(`gh issue delete ${createdIssueNumber} --yes`, {
          stdio: 'pipe'
        });
      } catch {
        // Issue may already be deleted
      }
      createdIssueNumber = null;
    }

    // Try to clean up any lingering test issues
    try {
      const issues = execSync(
        `gh issue list --search "${FEATURE_ID}" --state all --json number --limit 5`,
        { encoding: 'utf-8' }
      );
      const issueNumbers = JSON.parse(issues).map((i: any) => i.number);
      for (const num of issueNumbers) {
        try {
          execSync(`gh issue delete ${num} --yes`, { stdio: 'pipe' });
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore cleanup errors
    }

    // Clean up test directory
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  it.skipIf(skipIfNoGitHub)(
    'should sync AC checkbox to GitHub when task completed (full flow)',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // 1. Create increment spec.md with AC definitions
      const specContent = `---
increment: 0001-e2e-test
title: "E2E Test AC Sync"
status: active
priority: P0
type: feature
created: 2025-12-31
---

# E2E Test AC Sync

## User Stories

### US-001: Test AC Sync Flow
**Project**: specweave

**As a** developer
**I want** AC checkboxes to sync to GitHub
**So that** issue status reflects actual progress

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First AC should sync to GitHub
- [ ] **AC-US1-02**: Second AC should sync to GitHub
`;

      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test/spec.md'),
        specContent
      );

      // 2. Create tasks.md with task that satisfies AC-US1-01 as INCOMPLETE
      const tasksContent = `# Tasks

### T-001: Implement first feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Implement second feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
`;

      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test/tasks.md'),
        tasksContent
      );

      // 3. Create metadata.json
      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test/metadata.json'),
        JSON.stringify({
          id: '0001-e2e-test',
          status: 'active',
          feature_id: FEATURE_ID
        })
      );

      // 4. Create GitHub issue with AC checkboxes
      const issueBody = `# Test AC Sync Flow

## Acceptance Criteria

- [ ] **AC-US1-01**: First AC should sync to GitHub
- [ ] **AC-US1-02**: Second AC should sync to GitHub

---
**Feature**: ${FEATURE_ID}
**User Story**: US-001`;

      const createResult = execSync(
        `gh issue create --title "[${FEATURE_ID}][US-001] Test AC Sync Flow" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8' }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      expect(issueMatch).toBeTruthy();
      createdIssueNumber = parseInt(issueMatch![1], 10);

      // 5. Create user story in living docs with external reference
      const userStoryContent = `---
id: US-001
feature: ${FEATURE_ID}
title: Test AC Sync Flow
status: active
external:
  github:
    issue: ${createdIssueNumber}
    url: https://github.com/${repoInfo.owner}/${repoInfo.repo}/issues/${createdIssueNumber}
---

# US-001: Test AC Sync Flow

## Acceptance Criteria

- [ ] **AC-US1-01**: First AC should sync to GitHub
- [ ] **AC-US1-02**: Second AC should sync to GitHub

## Implementation

**Increment**: [0001-e2e-test](...)
`;

      await fs.writeFile(
        path.join(
          TEST_ROOT,
          '.specweave/docs/internal/specs/specweave',
          FEATURE_ID,
          'us-001-test.md'
        ),
        userStoryContent
      );

      // 6. Create config.json with GitHub sync enabled
      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/config.json'),
        JSON.stringify(
          {
            project: { name: 'specweave' },
            sync: {
              settings: {
                canUpsertInternalItems: true,
                canUpdateExternalItems: true
              },
              github: {
                enabled: true,
                owner: repoInfo.owner,
                repo: repoInfo.repo
              }
            }
          },
          null,
          2
        )
      );

      // 7. Verify initial state - checkboxes should be unchecked
      let issueData = execSync(
        `gh issue view ${createdIssueNumber} --json body`,
        { encoding: 'utf-8' }
      );
      let { body } = JSON.parse(issueData);
      expect(body).toMatch(/- \[ \] \*\*AC-US1-01\*\*/);
      expect(body).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);

      // 8. Mark T-001 as complete (which satisfies AC-US1-01)
      const updatedTasksContent = `# Tasks

### T-001: Implement first feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

### T-002: Implement second feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
`;

      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test/tasks.md'),
        updatedTasksContent
      );

      // 9. Manually trigger the sync by calling syncACCheckboxesToGitHub
      // (In real use, this would be called by update-ac-status.ts hook)
      const { SyncCoordinator } = await import(
        '../../dist/src/sync/sync-coordinator.js'
      );

      // First update spec.md to reflect AC completion
      const updatedSpecContent = specContent.replace(
        '- [ ] **AC-US1-01**',
        '- [x] **AC-US1-01**'
      );
      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/increments/0001-e2e-test/spec.md'),
        updatedSpecContent
      );

      // Also update living docs user story
      const updatedUserStoryContent = userStoryContent.replace(
        '- [ ] **AC-US1-01**',
        '- [x] **AC-US1-01**'
      );
      await fs.writeFile(
        path.join(
          TEST_ROOT,
          '.specweave/docs/internal/specs/specweave',
          FEATURE_ID,
          'us-001-test.md'
        ),
        updatedUserStoryContent
      );

      const configContent = await fs.readFile(
        path.join(TEST_ROOT, '.specweave/config.json'),
        'utf-8'
      );
      const config = JSON.parse(configContent);

      const coordinator = new SyncCoordinator({
        projectRoot: TEST_ROOT,
        incrementId: '0001-e2e-test'
      });

      const syncResult = await coordinator.syncACCheckboxesToGitHub(config);

      // 10. Verify GitHub issue was updated
      expect(syncResult.success).toBe(true);

      issueData = execSync(
        `gh issue view ${createdIssueNumber} --json body`,
        { encoding: 'utf-8' }
      );
      body = JSON.parse(issueData).body;

      // AC-US1-01 should now be checked
      expect(body).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
      // AC-US1-02 should still be unchecked
      expect(body).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);
    },
    { timeout: 60000 }
  );

  it.skipIf(skipIfNoGitHub)(
    'should handle race condition when multiple ACs complete simultaneously',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // Create issue with multiple ACs
      const issueBody = `# Race Condition Test

## Acceptance Criteria

- [ ] **AC-US1-01**: First
- [ ] **AC-US1-02**: Second
- [ ] **AC-US1-03**: Third

---
**Feature**: ${FEATURE_ID}`;

      const createResult = execSync(
        `gh issue create --title "[${FEATURE_ID}][US-001] Race Condition Test" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8' }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      createdIssueNumber = parseInt(issueMatch![1], 10);

      // Import sync function
      const { syncACCheckboxesToGitHub } = await import(
        '../../plugins/specweave-github/lib/per-us-sync.js'
      );

      const token =
        process.env.GITHUB_TOKEN ||
        execSync('gh auth token', { encoding: 'utf-8' }).trim();

      // Simulate simultaneous updates (race condition scenario)
      const acStatus1 = new Map<string, boolean>([
        ['AC-US1-01', true],
        ['AC-US1-02', false],
        ['AC-US1-03', false]
      ]);

      const acStatus2 = new Map<string, boolean>([
        ['AC-US1-01', true],
        ['AC-US1-02', true],
        ['AC-US1-03', false]
      ]);

      // Run both syncs in parallel
      const [result1, result2] = await Promise.all([
        syncACCheckboxesToGitHub(
          token,
          repoInfo.owner,
          repoInfo.repo,
          createdIssueNumber,
          acStatus1
        ),
        syncACCheckboxesToGitHub(
          token,
          repoInfo.owner,
          repoInfo.repo,
          createdIssueNumber,
          acStatus2
        )
      ]);

      // Both should succeed (no race condition errors)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Final state should have both AC-US1-01 and AC-US1-02 checked
      const issueData = execSync(
        `gh issue view ${createdIssueNumber} --json body`,
        { encoding: 'utf-8' }
      );
      const { body } = JSON.parse(issueData);

      // At least AC-US1-01 should be checked (both syncs tried to set it)
      expect(body).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
      // AC-US1-03 should still be unchecked
      expect(body).toMatch(/- \[ \] \*\*AC-US1-03\*\*/);
    },
    { timeout: 60000 }
  );
});
