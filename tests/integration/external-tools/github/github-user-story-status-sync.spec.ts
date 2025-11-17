/**
 * E2E Test: GitHub User Story Status Sync
 *
 * Validates that GitHub issues are created with correct state (open vs closed)
 * based on user story status in living docs.
 *
 * Test Scenarios:
 * 1. Completed user story → GitHub issue created as CLOSED
 * 2. Active user story → GitHub issue created as OPEN
 * 3. Status change (active → complete) → GitHub issue closed
 *
 * Related Files:
 * - plugins/specweave-github/lib/github-feature-sync.ts (createUserStoryIssue)
 * - .specweave/increments/0034-github-ac-checkboxes-fix/reports/ULTRATHINK-AC-PROJECT-SPECIFIC-DESIGN.md
 */

import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// ✅ SAFE: Isolated test directory (prevents .specweave deletion)
const TEST_ROOT = path.join(os.tmpdir(), 'specweave-test-github-status-sync-' + Date.now());
const FEATURE_ID = 'FS-TEST-STATUS';

test.describe('GitHub User Story Status Sync', () => {
  test.beforeEach(async () => {
    // Clean up test directory
    if (await fs.stat(TEST_ROOT).catch(() => null)) {
      await fs.rm(TEST_ROOT, { recursive: true });
    }
    await fs.mkdir(TEST_ROOT, { recursive: true });
  });

  test.afterEach(async () => {
    // Clean up test issues on GitHub
    try {
      const issues = execSync(
        `gh issue list --search "${FEATURE_ID}" --state all --json number`,
        { encoding: 'utf-8' }
      );
      const issueNumbers = JSON.parse(issues).map((i: any) => i.number);

      for (const number of issueNumbers) {
        execSync(`gh issue close ${number} --delete`);
      }
    } catch (err) {
      console.warn('Failed to clean up test issues:', err);
    }

    // Clean up test directory
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  test('creates closed issue for completed user story', async () => {
    // Setup: Create living docs structure with completed user story
    const specsDir = path.join(TEST_ROOT, '.specweave/docs/internal/specs');
    const featureDir = path.join(specsDir, '_features', FEATURE_ID);
    const projectDir = path.join(specsDir, 'specweave', FEATURE_ID);

    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });

    // Create FEATURE.md
    await fs.writeFile(
      path.join(featureDir, 'FEATURE.md'),
      `---
id: ${FEATURE_ID}
title: "Test Status Sync"
type: feature
status: completed
priority: P1
created: 2025-11-15
projects: ["specweave"]
---

# Test Status Sync Feature

Test feature for validating GitHub status sync.
`
    );

    // Create user story with status: complete
    await fs.writeFile(
      path.join(projectDir, 'us-001-test-completed.md'),
      `---
id: US-001
feature: ${FEATURE_ID}
title: Test Completed User Story
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-001: Test Completed User Story

**As a** developer
**I want** to test status sync
**So that** issues are created with correct state

## Acceptance Criteria

- [x] AC-US1-01: Issue created as CLOSED (P1, testable)
`
    );

    // Execute: Sync to GitHub
    const { GitHubClientV2 } = await import(
      '../../dist/plugins/specweave-github/lib/github-client-v2.js'
    );
    const { GitHubFeatureSync } = await import(
      '../../dist/plugins/specweave-github/lib/github-feature-sync.js'
    );

    const repo = await GitHubClientV2.detectRepo(process.cwd());
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
    const featureSync = new GitHubFeatureSync(client, specsDir, TEST_ROOT);

    const result = await featureSync.syncFeatureToGitHub(FEATURE_ID);

    // Verify: Issue created as CLOSED
    expect(result.issuesCreated).toBe(1);

    // Get issue details
    const issues = execSync(
      `gh issue list --search "${FEATURE_ID}" --state all --json number,state,title`,
      { encoding: 'utf-8' }
    );
    const issueList = JSON.parse(issues);

    expect(issueList.length).toBe(1);
    expect(issueList[0].state).toBe('CLOSED');
    expect(issueList[0].title).toContain('US-001');
    expect(issueList[0].title).toContain('Test Completed User Story');
  });

  test('creates open issue for active user story', async () => {
    // Setup: Create living docs structure with active user story
    const specsDir = path.join(TEST_ROOT, '.specweave/docs/internal/specs');
    const featureDir = path.join(specsDir, '_features', FEATURE_ID);
    const projectDir = path.join(specsDir, 'specweave', FEATURE_ID);

    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(featureDir, 'FEATURE.md'),
      `---
id: ${FEATURE_ID}
title: "Test Status Sync"
type: feature
status: active
priority: P1
created: 2025-11-15
projects: ["specweave"]
---

# Test Status Sync Feature
`
    );

    // Create user story with status: active
    await fs.writeFile(
      path.join(projectDir, 'us-001-test-active.md'),
      `---
id: US-001
feature: ${FEATURE_ID}
title: Test Active User Story
status: active
created: 2025-11-15
---

# US-001: Test Active User Story

**As a** developer
**I want** to test status sync
**So that** issues are created with correct state

## Acceptance Criteria

- [ ] AC-US1-01: Issue created as OPEN (P1, testable)
`
    );

    // Execute: Sync to GitHub
    const { GitHubClientV2 } = await import(
      '../../dist/plugins/specweave-github/lib/github-client-v2.js'
    );
    const { GitHubFeatureSync } = await import(
      '../../dist/plugins/specweave-github/lib/github-feature-sync.js'
    );

    const repo = await GitHubClientV2.detectRepo(process.cwd());
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
    const featureSync = new GitHubFeatureSync(client, specsDir, TEST_ROOT);

    const result = await featureSync.syncFeatureToGitHub(FEATURE_ID);

    // Verify: Issue created as OPEN
    expect(result.issuesCreated).toBe(1);

    const issues = execSync(
      `gh issue list --search "${FEATURE_ID}" --state all --json number,state,title`,
      { encoding: 'utf-8' }
    );
    const issueList = JSON.parse(issues);

    expect(issueList.length).toBe(1);
    expect(issueList[0].state).toBe('OPEN');
    expect(issueList[0].title).toContain('US-001');
  });

  test('updates existing issue when status changes from active to complete', async () => {
    // Setup: Create user story as active first
    const specsDir = path.join(TEST_ROOT, '.specweave/docs/internal/specs');
    const featureDir = path.join(specsDir, '_features', FEATURE_ID);
    const projectDir = path.join(specsDir, 'specweave', FEATURE_ID);

    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(featureDir, 'FEATURE.md'),
      `---
id: ${FEATURE_ID}
title: "Test Status Change"
type: feature
status: active
priority: P1
created: 2025-11-15
projects: ["specweave"]
---
`
    );

    const userStoryPath = path.join(projectDir, 'us-001-test-status-change.md');
    await fs.writeFile(
      userStoryPath,
      `---
id: US-001
feature: ${FEATURE_ID}
title: Test Status Change
status: active
created: 2025-11-15
---

# US-001: Test Status Change

## Acceptance Criteria
- [ ] AC-US1-01: Status changes should sync (P1, testable)
`
    );

    // Execute: First sync (creates OPEN issue)
    const { GitHubClientV2 } = await import(
      '../../dist/plugins/specweave-github/lib/github-client-v2.js'
    );
    const { GitHubFeatureSync } = await import(
      '../../dist/plugins/specweave-github/lib/github-feature-sync.js'
    );

    const repo = await GitHubClientV2.detectRepo(process.cwd());
    const client = GitHubClientV2.fromRepo(repo.owner, repo.repo);
    const featureSync = new GitHubFeatureSync(client, specsDir, TEST_ROOT);

    await featureSync.syncFeatureToGitHub(FEATURE_ID);

    // Verify: Issue is OPEN
    let issues = execSync(
      `gh issue list --search "${FEATURE_ID}" --state all --json number,state`,
      { encoding: 'utf-8' }
    );
    let issueList = JSON.parse(issues);
    expect(issueList[0].state).toBe('OPEN');
    const issueNumber = issueList[0].number;

    // Setup: Change status to complete
    await fs.writeFile(
      userStoryPath,
      `---
id: US-001
feature: ${FEATURE_ID}
title: Test Status Change
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: ${issueNumber}
    url: https://github.com/${repo.owner}/${repo.repo}/issues/${issueNumber}
---

# US-001: Test Status Change

## Acceptance Criteria
- [x] AC-US1-01: Status changes should sync (P1, testable)
`
    );

    // Execute: Second sync (updates to CLOSED)
    await featureSync.syncFeatureToGitHub(FEATURE_ID);

    // Verify: Issue is now CLOSED
    issues = execSync(
      `gh issue list --search "${FEATURE_ID}" --state all --json number,state`,
      { encoding: 'utf-8' }
    );
    issueList = JSON.parse(issues);
    expect(issueList[0].state).toBe('CLOSED');
    expect(issueList[0].number).toBe(issueNumber); // Same issue, just closed
  });
});
