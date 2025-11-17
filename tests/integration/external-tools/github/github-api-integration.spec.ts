/**
 * E2E Tests for Real GitHub API Integration
 *
 * IMPORTANT: These tests require:
 * - GitHub CLI (gh) installed and authenticated
 * - GITHUB_TEST_REPO environment variable set (format: owner/repo)
 * - Write access to the test repository
 *
 * These tests are SKIPPED by default to avoid polluting repos.
 * Run explicitly with: GITHUB_API_TESTS=true npx playwright test github-api-integration.spec.ts
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Only run if explicitly enabled
const GITHUB_API_TESTS = process.env.GITHUB_API_TESTS === 'true';

test.describe('GitHub API Integration - Real', () => {
  // Skip all tests in this suite unless explicitly enabled
  test.skip(!GITHUB_API_TESTS, 'GitHub API tests disabled (set GITHUB_API_TESTS=true to enable)');

  let tmpDir: string;
  let originalCwd: string;
  let testRepo: { owner: string; repo: string } | null = null;
  let createdIssues: number[] = [];

  test.beforeAll(async () => {
    // Check GitHub CLI available
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch {
      throw new Error('GitHub CLI (gh) not installed. Install from: https://cli.github.com/');
    }

    // Check authentication
    try {
      execSync('gh auth status', { stdio: 'ignore' });
    } catch {
      throw new Error('GitHub CLI not authenticated. Run: gh auth login');
    }

    // Get test repo from environment or use default
    const testRepoEnv = process.env.GITHUB_TEST_REPO || 'anton-abyzov/specweave-test';
    const [owner, repo] = testRepoEnv.split('/');
    testRepo = { owner, repo };

    console.log(`Using test repository: ${testRepoEnv}`);
  });

  test.beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-gh-api-'));
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);

    // Clean up created issues
    if (createdIssues.length > 0) {
      console.log(`Cleaning up ${createdIssues.length} test issues...`);
      for (const issueNumber of createdIssues) {
        try {
          execSync(
            `gh issue close ${issueNumber} --repo ${testRepo!.owner}/${testRepo!.repo} --comment "Cleaning up test issue"`,
            { stdio: 'ignore' }
          );
        } catch (error) {
          console.warn(`Failed to close issue #${issueNumber}:`, error);
        }
      }
      createdIssues = [];
    }
  });

  test('should create real GitHub issue with complete content', async () => {
    if (!testRepo) {
      throw new Error('Test repo not configured');
    }

    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync(`git remote add origin https://github.com/${testRepo.owner}/${testRepo.repo}.git`, { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, testRepo.repo, 'FS-999');
    await fs.ensureDir(projectDir);

    // Create comprehensive user story
    const timestamp = Date.now();
    const userStoryContent = `---
id: US-001
feature: FS-999
title: API Test ${timestamp}
status: active
priority: P1
created: 2025-11-15
---

# US-001: API Test ${timestamp}

**As a** test
**I want** to verify GitHub API integration
**So that** I can ensure sync works end-to-end

## Acceptance Criteria

- [x] **AC-US1-01**: Issue created successfully
- [ ] **AC-US1-02**: All sections visible in GitHub
- [x] **AC-US1-03**: Links work correctly

## Business Rationale

This is a test issue to verify the complete GitHub sync flow.

## Related User Stories

- [US-002: Second Test](us-002-second.md)

---

**Test Issue**: Will be closed automatically
`;

    const userStoryPath = path.join(projectDir, 'us-001-api-test.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // Create issue via GitHub CLI
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-999',
      { owner: testRepo.owner, repo: testRepo.repo, branch: 'main' }
    );

    const issueContent = await builder.buildIssueBody();

    // Write issue body to temp file
    const bodyFile = path.join(tmpDir, 'issue-body.md');
    await fs.writeFile(bodyFile, issueContent.body);

    // Create issue
    const createResult = execSync(
      `gh issue create --title "${issueContent.title}" --body-file "${bodyFile}" --repo ${testRepo.owner}/${testRepo.repo} ${issueContent.labels.map(l => `--label "${l}"`).join(' ')}`,
      { encoding: 'utf-8' }
    );

    // Extract issue number from URL
    const match = createResult.match(/issues\/(\d+)/);
    expect(match).not.toBeNull();

    const issueNumber = parseInt(match![1], 10);
    createdIssues.push(issueNumber);

    console.log(`Created test issue #${issueNumber}`);

    // Verify issue was created
    const issueData = execSync(
      `gh issue view ${issueNumber} --repo ${testRepo.owner}/${testRepo.repo} --json title,body,labels,state`,
      { encoding: 'utf-8' }
    );

    const issue = JSON.parse(issueData);

    // Verify title
    expect(issue.title).toBe(issueContent.title);

    // Verify sections in body
    expect(issue.body).toContain('## User Story');
    expect(issue.body).toContain('## Acceptance Criteria');
    expect(issue.body).toContain('- [x] **AC-US1-01**: Issue created successfully');
    expect(issue.body).toContain('- [ ] **AC-US1-02**: All sections visible in GitHub');
    expect(issue.body).toContain('## Business Rationale');
    expect(issue.body).toContain('## Related User Stories');

    // Verify links are GitHub blob URLs
    expect(issue.body).toContain(`https://github.com/${testRepo.owner}/${testRepo.repo}/blob/main`);

    // Verify state
    expect(issue.state).toBe('OPEN');

    // Verify labels
    const labelNames = issue.labels.map((l: any) => l.name);
    expect(labelNames).toContain('user-story');
    expect(labelNames).toContain('specweave');
  });

  test('should update existing GitHub issue', async () => {
    if (!testRepo) {
      throw new Error('Test repo not configured');
    }

    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync(`git remote add origin https://github.com/${testRepo.owner}/${testRepo.repo}.git`, { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, testRepo.repo, 'FS-999');
    await fs.ensureDir(projectDir);

    const timestamp = Date.now();

    // Create initial issue
    const initialContent = `---
id: US-002
feature: FS-999
title: Update Test ${timestamp} V1
status: active
created: 2025-11-15
---

# US-002: Update Test ${timestamp} V1

## Acceptance Criteria

- [ ] **AC-US2-01**: Initial version
`;

    const userStoryPath = path.join(projectDir, 'us-002-update-test.md');
    await fs.writeFile(userStoryPath, initialContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder1 = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-999',
      { owner: testRepo.owner, repo: testRepo.repo, branch: 'main' }
    );

    const initialIssue = await builder1.buildIssueBody();

    const bodyFile = path.join(tmpDir, 'issue-body-initial.md');
    await fs.writeFile(bodyFile, initialIssue.body);

    const createResult = execSync(
      `gh issue create --title "${initialIssue.title}" --body-file "${bodyFile}" --repo ${testRepo.owner}/${testRepo.repo} --label "user-story"`,
      { encoding: 'utf-8' }
    );

    const match = createResult.match(/issues\/(\d+)/);
    const issueNumber = parseInt(match![1], 10);
    createdIssues.push(issueNumber);

    console.log(`Created issue #${issueNumber} for update test`);

    // Update user story
    const updatedContent = `---
id: US-002
feature: FS-999
title: Update Test ${timestamp} V2
status: active
created: 2025-11-15
---

# US-002: Update Test ${timestamp} V2

## Acceptance Criteria

- [ ] **AC-US2-01**: Initial version
- [ ] **AC-US2-02**: New criterion added
`;

    await fs.writeFile(userStoryPath, updatedContent);

    const builder2 = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-999',
      { owner: testRepo.owner, repo: testRepo.repo, branch: 'main' }
    );

    const updatedIssue = await builder2.buildIssueBody();

    const updatedBodyFile = path.join(tmpDir, 'issue-body-updated.md');
    await fs.writeFile(updatedBodyFile, updatedIssue.body);

    // Update issue
    execSync(
      `gh issue edit ${issueNumber} --title "${updatedIssue.title}" --body-file "${updatedBodyFile}" --repo ${testRepo.owner}/${testRepo.repo}`,
      { stdio: 'ignore' }
    );

    // Verify update
    const issueData = execSync(
      `gh issue view ${issueNumber} --repo ${testRepo.owner}/${testRepo.repo} --json title,body`,
      { encoding: 'utf-8' }
    );

    const issue = JSON.parse(issueData);

    expect(issue.title).toContain('V2');
    expect(issue.body).toContain('**AC-US2-02**: New criterion added');
  });

  test('should verify links work in GitHub web interface', async () => {
    if (!testRepo) {
      throw new Error('Test repo not configured');
    }

    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync(`git remote add origin https://github.com/${testRepo.owner}/${testRepo.repo}.git`, { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, testRepo.repo, 'FS-999');
    await fs.ensureDir(projectDir);

    const timestamp = Date.now();
    const userStoryContent = `---
id: US-003
feature: FS-999
title: Link Test ${timestamp}
status: active
created: 2025-11-15
---

# US-003: Link Test ${timestamp}

## Related User Stories

- [US-004: Related](us-004-related.md)

## Implementation

**Increment**: [0999-test](../../../../../increments/0999-test/tasks.md)
`;

    const userStoryPath = path.join(projectDir, 'us-003-link-test.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-999',
      { owner: testRepo.owner, repo: testRepo.repo, branch: 'main' }
    );

    const issueContent = await builder.buildIssueBody();

    // Verify links are properly formatted GitHub blob URLs
    const baseUrl = `https://github.com/${testRepo.owner}/${testRepo.repo}/blob/main`;

    expect(issueContent.body).toContain(`${baseUrl}/.specweave/docs/internal/specs/${testRepo.repo}/FS-999/us-004-related.md`);
    expect(issueContent.body).toContain(`${baseUrl}/.specweave/increments/0999-test/tasks.md`);

    const bodyFile = path.join(tmpDir, 'issue-body-links.md');
    await fs.writeFile(bodyFile, issueContent.body);

    const createResult = execSync(
      `gh issue create --title "${issueContent.title}" --body-file "${bodyFile}" --repo ${testRepo.owner}/${testRepo.repo} --label "user-story"`,
      { encoding: 'utf-8' }
    );

    const match = createResult.match(/issues\/(\d+)/);
    const issueNumber = parseInt(match![1], 10);
    createdIssues.push(issueNumber);

    console.log(`Created issue #${issueNumber} - verify links manually at:`);
    console.log(`https://github.com/${testRepo.owner}/${testRepo.repo}/issues/${issueNumber}`);

    // Verify issue created
    const issueData = execSync(
      `gh issue view ${issueNumber} --repo ${testRepo.owner}/${testRepo.repo} --json url`,
      { encoding: 'utf-8' }
    );

    const issue = JSON.parse(issueData);
    expect(issue.url).toBeTruthy();
  });
});
