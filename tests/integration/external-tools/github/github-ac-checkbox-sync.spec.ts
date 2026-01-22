/**
 * Integration Test: GitHub AC Checkbox Sync
 *
 * Validates that AC checkbox changes in spec.md are reflected in GitHub issues.
 *
 * Test Scenarios:
 * 1. Marking AC as complete updates checkbox in GitHub issue body
 * 2. Marking AC as incomplete unchecks checkbox in GitHub issue
 * 3. Multiple AC updates in single sync operation
 * 4. Sync adds progress comment with AC count
 * 5. Race condition prevention (no duplicate comments)
 *
 * Related Files:
 * - plugins/specweave-github/lib/per-us-sync.ts (syncACCheckboxesToGitHub)
 * - src/sync/sync-coordinator.ts (syncACCheckboxesToGitHub method)
 * - plugins/specweave-github/lib/github-feature-sync.ts (updateUserStoryIssue)
 *
 * @see https://github.com/anton-abyzov/specweave/issues/966
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { getCleanEnv } from '../../../test-utils/clean-env.js';

// ✅ SAFE: Isolated test directory with unique ID (prevents race conditions)
const TEST_ROOT = path.join(
  os.tmpdir(),
  `specweave-test-ac-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`
);
const FEATURE_ID = 'FS-997';

// Check if GitHub CLI is available and authenticated
const isGitHubAvailable = (): boolean => {
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe', env: getCleanEnv() });
    return true;
  } catch {
    return false;
  }
};

// Get current repo info
const getRepoInfo = (): { owner: string; repo: string } | null => {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      env: getCleanEnv()
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

describe('GitHub AC Checkbox Sync', () => {
  // Skip tests if GitHub is not available
  const skipIfNoGitHub = !isGitHubAvailable();

  beforeEach(async () => {
    if (skipIfNoGitHub) return;

    // Clean up test directory
    if (await fs.stat(TEST_ROOT).catch(() => null)) {
      await fs.rm(TEST_ROOT, { recursive: true });
    }
    await fs.mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    if (skipIfNoGitHub) return;

    // Clean up test issues on GitHub
    try {
      const issues = execSync(
        `gh issue list --search "${FEATURE_ID}" --state all --json number --limit 10`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const issueNumbers = JSON.parse(issues).map((i: any) => i.number);

      for (const number of issueNumbers) {
        try {
          execSync(`gh issue delete ${number} --yes`, { stdio: 'pipe', env: getCleanEnv() });
        } catch {
          // Issue may already be deleted
        }
      }
    } catch {
      // Failed to clean up test issues
    }

    // Clean up test directory
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  it.skipIf(skipIfNoGitHub)(
    'should update AC checkboxes in GitHub issue when marked complete',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // Arrange: Create a test issue with AC checkboxes
      const issueBody = `# Test User Story

## Acceptance Criteria

- [ ] **AC-US1-01**: First criterion should be checkable
- [ ] **AC-US1-02**: Second criterion should be checkable
- [ ] **AC-US1-03**: Third criterion should be checkable

---
**Feature**: ${FEATURE_ID}
**User Story**: US-001`;

      const createResult = execSync(
        `gh issue create --title "[${FEATURE_ID}][US-001] Test AC Sync" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      expect(issueMatch).toBeTruthy();
      const issueNumber = parseInt(issueMatch![1], 10);

      // Act: Import and call syncACCheckboxesToGitHub
      const { syncACCheckboxesToGitHub } = await import(
        '../../../../plugins/specweave-github/lib/per-us-sync.js'
      );

      const token =
        process.env.GITHUB_TOKEN ||
        execSync('gh auth token', { encoding: 'utf-8', env: getCleanEnv() }).trim();

      const acStatus = new Map<string, boolean>([
        ['AC-US1-01', true], // Mark first AC as complete
        ['AC-US1-02', false], // Keep second incomplete
        ['AC-US1-03', true] // Mark third as complete
      ]);

      const result = await syncACCheckboxesToGitHub(
        token,
        repoInfo.owner,
        repoInfo.repo,
        issueNumber,
        acStatus,
        { addComment: true }
      );

      // Assert: Sync should succeed
      expect(result.success).toBe(true);
      expect(result.updated).toContain('AC-US1-01');
      expect(result.updated).toContain('AC-US1-03');
      expect(result.updated).not.toContain('AC-US1-02');

      // Verify: Fetch issue body and check checkboxes
      const issueData = execSync(
        `gh issue view ${issueNumber} --json body`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const { body } = JSON.parse(issueData);

      // Check that AC-US1-01 is now checked
      expect(body).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
      // Check that AC-US1-02 is still unchecked
      expect(body).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);
      // Check that AC-US1-03 is now checked
      expect(body).toMatch(/- \[x\] \*\*AC-US1-03\*\*/);

      // Verify: Check for progress comment
      const comments = execSync(
        `gh issue view ${issueNumber} --json comments --jq '.comments[-1].body'`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      expect(comments).toContain('Progress Update');
      expect(comments).toContain('2/3'); // 2 out of 3 complete

      // Cleanup
      execSync(`gh issue delete ${issueNumber} --yes`, { stdio: 'pipe', env: getCleanEnv() });
    }
  );

  it.skipIf(skipIfNoGitHub)(
    'should not add duplicate comments on repeated sync',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // Arrange: Create a test issue
      const issueBody = `# Test Duplicate Prevention

## Acceptance Criteria

- [ ] **AC-US2-01**: Test criterion

---
**Feature**: ${FEATURE_ID}`;

      const createResult = execSync(
        `gh issue create --title "[${FEATURE_ID}][US-002] Test Duplicate Prevention" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      const issueNumber = parseInt(issueMatch![1], 10);

      const { syncACCheckboxesToGitHub } = await import(
        '../../../../plugins/specweave-github/lib/per-us-sync.js'
      );

      const token =
        process.env.GITHUB_TOKEN ||
        execSync('gh auth token', { encoding: 'utf-8', env: getCleanEnv() }).trim();

      const acStatus = new Map<string, boolean>([['AC-US2-01', true]]);

      // Act: Call sync twice with same status
      await syncACCheckboxesToGitHub(
        token,
        repoInfo.owner,
        repoInfo.repo,
        issueNumber,
        acStatus,
        { addComment: true }
      );

      // Second sync with same status - should not add duplicate comment
      const result2 = await syncACCheckboxesToGitHub(
        token,
        repoInfo.owner,
        repoInfo.repo,
        issueNumber,
        acStatus,
        { addComment: true }
      );

      // Assert: Second sync should have no updates (already synced)
      expect(result2.success).toBe(true);
      expect(result2.updated).toHaveLength(0); // No changes

      // Verify: Should only have one progress comment
      const commentsData = execSync(
        `gh issue view ${issueNumber} --json comments`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const { comments } = JSON.parse(commentsData);
      const progressComments = comments.filter((c: any) =>
        c.body.includes('Progress Update')
      );
      expect(progressComments.length).toBe(1); // Only ONE comment

      // Cleanup
      execSync(`gh issue delete ${issueNumber} --yes`, { stdio: 'pipe', env: getCleanEnv() });
    }
  );

  it.skipIf(skipIfNoGitHub)(
    'should handle legacy AC format (AC-001)',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // Arrange: Create issue with legacy AC format
      const issueBody = `# Test Legacy Format

## Acceptance Criteria

- [ ] **AC-001**: Legacy format criterion
- [ ] **AC-002**: Another legacy criterion

---
**Feature**: ${FEATURE_ID}`;

      const createResult = execSync(
        `gh issue create --title "[${FEATURE_ID}][US-003] Test Legacy Format" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      const issueNumber = parseInt(issueMatch![1], 10);

      const { syncACCheckboxesToGitHub } = await import(
        '../../../../plugins/specweave-github/lib/per-us-sync.js'
      );

      const token =
        process.env.GITHUB_TOKEN ||
        execSync('gh auth token', { encoding: 'utf-8', env: getCleanEnv() }).trim();

      // Act: Update legacy format ACs
      const acStatus = new Map<string, boolean>([
        ['AC-001', true],
        ['AC-002', false]
      ]);

      const result = await syncACCheckboxesToGitHub(
        token,
        repoInfo.owner,
        repoInfo.repo,
        issueNumber,
        acStatus
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.updated).toContain('AC-001');

      // Verify checkbox state
      const issueData = execSync(
        `gh issue view ${issueNumber} --json body`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const { body } = JSON.parse(issueData);

      expect(body).toMatch(/- \[x\] \*\*AC-001\*\*/);
      expect(body).toMatch(/- \[ \] \*\*AC-002\*\*/);

      // Cleanup
      execSync(`gh issue delete ${issueNumber} --yes`, { stdio: 'pipe', env: getCleanEnv() });
    }
  );
});

describe('AC Sync via SyncCoordinator', () => {
  const skipIfNoGitHub = !isGitHubAvailable();

  beforeEach(async () => {
    if (skipIfNoGitHub) return;

    if (await fs.stat(TEST_ROOT).catch(() => null)) {
      await fs.rm(TEST_ROOT, { recursive: true });
    }
    await fs.mkdir(TEST_ROOT, { recursive: true });
    await fs.mkdir(path.join(TEST_ROOT, '.specweave/increments/0001-test'), {
      recursive: true
    });
    await fs.mkdir(
      path.join(TEST_ROOT, '.specweave/docs/internal/specs/specweave/FS-001'),
      { recursive: true }
    );
  });

  afterEach(async () => {
    if (skipIfNoGitHub) return;

    // Clean up test issues
    try {
      const issues = execSync(
        `gh issue list --search "FS-COORD-TEST" --state all --json number --limit 10`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const issueNumbers = JSON.parse(issues).map((i: any) => i.number);
      for (const number of issueNumbers) {
        try {
          execSync(`gh issue delete ${number} --yes`, { stdio: 'pipe', env: getCleanEnv() });
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }

    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  it.skipIf(skipIfNoGitHub)(
    'should sync AC checkboxes via SyncCoordinator.syncACCheckboxesToGitHub',
    async () => {
      const repoInfo = getRepoInfo();
      if (!repoInfo) {
        console.log('Skipping: not in a GitHub repo');
        return;
      }

      // Create config.json with GitHub settings
      await fs.mkdir(path.join(TEST_ROOT, '.specweave'), { recursive: true });
      await fs.writeFile(
        path.join(TEST_ROOT, '.specweave/config.json'),
        JSON.stringify(
          {
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

      // Create user story spec file with external GitHub issue reference
      const issueBody = `# Coordinator Test

## Acceptance Criteria

- [ ] **AC-US1-01**: Criterion A
- [ ] **AC-US1-02**: Criterion B

---
**Feature**: FS-COORD-TEST`;

      const createResult = execSync(
        `gh issue create --title "[FS-COORD-TEST][US-001] Coordinator Test" --body "${issueBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );

      const issueMatch = createResult.match(/issues\/(\d+)/);
      const issueNumber = parseInt(issueMatch![1], 10);

      const userStoryPath = path.join(
        TEST_ROOT,
        '.specweave/docs/internal/specs/specweave/FS-001/us-001-test.md'
      );
      await fs.writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-COORD-TEST
title: Coordinator Test
status: active
external:
  github:
    issue: ${issueNumber}
    url: https://github.com/${repoInfo.owner}/${repoInfo.repo}/issues/${issueNumber}
---

## Acceptance Criteria

- [x] **AC-US1-01**: Criterion A
- [x] **AC-US1-02**: Criterion B
`
      );

      // Create increment metadata
      const incrementPath = path.join(
        TEST_ROOT,
        '.specweave/increments/0001-test'
      );
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify({
          id: '0001-test',
          status: 'active',
          feature_id: 'FS-COORD-TEST'
        })
      );

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0001-test
feature: FS-COORD-TEST
---

### US-001: Coordinator Test
**Project**: specweave

## Acceptance Criteria
- [x] **AC-US1-01**: Criterion A
- [x] **AC-US1-02**: Criterion B
`
      );

      // Import SyncCoordinator
      const { SyncCoordinator } = await import(
        '../../../../dist/src/sync/sync-coordinator.js'
      );

      const coordinator = new SyncCoordinator({
        projectRoot: TEST_ROOT,
        incrementId: '0001-test'
      });

      // Read config
      const configContent = await fs.readFile(
        path.join(TEST_ROOT, '.specweave/config.json'),
        'utf-8'
      );
      const config = JSON.parse(configContent);

      // Act: Call syncACCheckboxesToGitHub
      const result = await coordinator.syncACCheckboxesToGitHub(config, {
        addComment: true
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.updated).toBeGreaterThan(0);

      // Verify checkboxes in GitHub
      const issueData = execSync(
        `gh issue view ${issueNumber} --json body`,
        { encoding: 'utf-8', env: getCleanEnv() }
      );
      const { body } = JSON.parse(issueData);

      expect(body).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
      expect(body).toMatch(/- \[x\] \*\*AC-US1-02\*\*/);

      // Cleanup
      execSync(`gh issue delete ${issueNumber} --yes`, { stdio: 'pipe', env: getCleanEnv() });
    }
  );
});
