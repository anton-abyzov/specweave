/**
 * E2E Tests for GitHub User Story Sync
 *
 * Tests the complete flow:
 * 1. User story file creation with all sections
 * 2. GitHub sync (issue creation)
 * 3. Verification of issue content
 *
 * CRITICAL: These tests ensure GitHub issues always have:
 * - Checkable Acceptance Criteria (both formats)
 * - Related User Stories with working links
 * - Business Rationale
 * - Proper link conversion to GitHub blob URLs
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

test.describe('GitHub User Story Sync - E2E', () => {
  let tmpDir: string;
  let originalCwd: string;

  test.beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-e2e-'));
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  test('should sync user story with all content to GitHub issue', async () => {
    // 1. Setup test environment
    process.chdir(tmpDir);

    // Initialize git repo (required for repo name detection)
    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-owner/test-repo.git', { cwd: tmpDir });

    // Create SpecWeave structure
    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    await fs.ensureDir(specsDir);

    // Create _features folder with FEATURE.md
    const featuresDir = path.join(specsDir, '_features/FS-999');
    await fs.ensureDir(featuresDir);

    const featureContent = `---
id: FS-999
title: Test Feature for E2E
type: feature
status: active
projects: ['test-repo']
created: 2025-11-15
last_updated: 2025-11-15
---

# FS-999: Test Feature for E2E

Complete end-to-end test for GitHub sync.
`;
    await fs.writeFile(path.join(featuresDir, 'FEATURE.md'), featureContent);

    // Create project folder (should be auto-detected as "test-repo")
    const projectDir = path.join(specsDir, 'test-repo/FS-999');
    await fs.ensureDir(projectDir);

    // 2. Create comprehensive user story file
    const userStoryContent = `---
id: US-001
feature: FS-999
title: Complete User Story Test
status: active
priority: P1
project: test-repo
created: 2025-11-15
---

# US-001: Complete User Story Test

**Feature**: [FS-999](../../_features/FS-999/FEATURE.md)

**As a** QA tester
**I want** comprehensive GitHub sync
**So that** all content appears correctly in GitHub issues

---

## Acceptance Criteria

- [x] **AC-US1-01**: Checkboxes preserved with state (completed)
- [ ] **AC-US1-02**: Proper formatting in GitHub (not completed)
- [x] **AC-001**: Legacy format supported (completed)
- [ ] **AC-002**: Both formats work together (not completed)

---

## Business Rationale

External stakeholders need complete context in GitHub issues without accessing the repository directly. This reduces friction and enables faster decision-making.

---

## Related User Stories

- [US-002: Second User Story](us-002-second-story.md)
- [US-003: Third User Story](us-003-third-story.md)
- [US-004: Fourth User Story](us-004-fourth-story.md)

---

## Implementation

**Increment**: [0099-test-increment](../../../../../increments/0099-test-increment/tasks.md)

**Tasks**:
- [T-001: Create Test](../../../../../increments/0099-test-increment/tasks.md#t-001-create-test)
- [T-002: Verify Sync](../../../../../increments/0099-test-increment/tasks.md#t-002-verify-sync)

---

**Status**: ✅ Active
`;

    const userStoryPath = path.join(projectDir, 'us-001-complete-test.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // 3. Import builder and test
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-999',
      { owner: 'test-owner', repo: 'test-repo', branch: 'main' }
    );

    const result = await builder.buildIssueBody();

    // 4. Verify ALL critical content

    // Title format
    expect(result.title).toBe('[FS-999][US-001] Complete User Story Test');

    // Labels
    expect(result.labels).toContain('user-story');
    expect(result.labels).toContain('specweave');
    expect(result.labels).toContain('status:active');
    expect(result.labels).toContain('p1');
    expect(result.labels).toContain('project:test-repo');

    // User Story statement
    expect(result.body).toContain('## User Story');
    expect(result.body).toContain('**As a** QA tester');
    expect(result.body).toContain('**I want** comprehensive GitHub sync');
    expect(result.body).toContain('**So that** all content appears correctly');

    // Acceptance Criteria with checkboxes (both formats!)
    expect(result.body).toContain('## Acceptance Criteria');
    expect(result.body).toContain('- [x] **AC-US1-01**: Checkboxes preserved with state (completed)');
    expect(result.body).toContain('- [ ] **AC-US1-02**: Proper formatting in GitHub (not completed)');
    expect(result.body).toContain('- [x] **AC-001**: Legacy format supported (completed)');
    expect(result.body).toContain('- [ ] **AC-002**: Both formats work together (not completed)');

    // Business Rationale
    expect(result.body).toContain('## Business Rationale');
    expect(result.body).toContain('External stakeholders need complete context');
    expect(result.body).toContain('reduces friction and enables faster decision-making');

    // Related User Stories with converted links
    expect(result.body).toContain('## Related User Stories');
    expect(result.body).toContain('US-002: Second User Story');
    expect(result.body).toContain('US-003: Third User Story');
    expect(result.body).toContain('US-004: Fourth User Story');
    expect(result.body).toContain(
      'https://github.com/test-owner/test-repo/blob/main/.specweave/docs/internal/specs/test-repo/FS-999/us-002-second-story.md'
    );

    // Implementation with converted links
    expect(result.body).toContain('## Implementation');
    expect(result.body).toContain('**Increment**:');
    expect(result.body).toContain('0099-test-increment');
    expect(result.body).toContain(
      'https://github.com/test-owner/test-repo/blob/main/.specweave/increments/0099-test-increment/tasks.md'
    );
    expect(result.body).toContain('T-001: Create Test');
    expect(result.body).toContain('#t-001-create-test');

    // Links section
    expect(result.body).toContain('## Links');
    expect(result.body).toContain(
      '**Feature Spec**: [FS-999](https://github.com/test-owner/test-repo/blob/main/.specweave/docs/internal/specs/_features/FS-999/FEATURE.md)'
    );
    expect(result.body).toContain(
      '**User Story File**: [us-001-complete-test.md](https://github.com/test-owner/test-repo/blob/main/.specweave/docs/internal/specs/test-repo/FS-999/us-001-complete-test.md)'
    );

    // Footer
    expect(result.body).toContain('🤖 Auto-created by SpecWeave User Story Sync');
  });

  test('should detect repo name from git remote and use it as project name', async () => {
    // Setup test environment
    process.chdir(tmpDir);

    // Initialize git repo with specific remote
    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/mycompany/awesome-app.git', { cwd: tmpDir });

    // Create minimal config
    const configPath = path.join(tmpDir, '.specweave/config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, {
      project: { name: 'Awesome App' },
    });

    // Import ProjectDetector
    const { ProjectDetector } = await import('../../src/core/living-docs/project-detector.js');

    const detector = new ProjectDetector({ configPath });
    const projects = detector.getProjects();

    // Should detect "awesome-app" from git remote, NOT "default"
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].id).toBe('awesome-app');
  });

  test('should handle multi-repo setup with separate project folders', async () => {
    // Setup test environment
    process.chdir(tmpDir);

    // Initialize git repo for backend
    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin git@github.com:mycompany/backend-api.git', { cwd: tmpDir });

    // Create backend project structure
    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const backendDir = path.join(specsDir, 'backend-api/FS-100');
    await fs.ensureDir(backendDir);

    // Create user story for backend
    const userStoryContent = `---
id: US-001
feature: FS-100
title: Backend API Feature
status: active
priority: P1
project: backend-api
created: 2025-11-15
---

# US-001: Backend API Feature

## Acceptance Criteria

- [ ] **AC-US1-01**: API endpoint created

## Related User Stories

- [US-002: Database Schema](us-002-database-schema.md)
`;

    const userStoryPath = path.join(backendDir, 'us-001-backend-api.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // Import builder and test
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-100',
      { owner: 'mycompany', repo: 'backend-api', branch: 'develop' }
    );

    const result = await builder.buildIssueBody();

    // Should have project label
    expect(result.labels).toContain('project:backend-api');

    // Links should point to backend-api project folder
    expect(result.body).toContain(
      '.specweave/docs/internal/specs/backend-api/FS-100/us-002-database-schema.md'
    );
  });

  test('should preserve absolute URLs and not convert them', async () => {
    process.chdir(tmpDir);

    // Create test structure
    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/default/FS-200');
    await fs.ensureDir(specsDir);

    const userStoryContent = `---
id: US-001
feature: FS-200
title: External Links Test
status: active
created: 2025-11-15
---

# US-001: External Links Test

## Related User Stories

- [External Documentation](https://docs.example.com/guide.md)
- [Another External Link](https://github.com/other/repo/blob/main/README.md)
- [Internal US](us-002-internal.md)
`;

    const userStoryPath = path.join(specsDir, 'us-001-external-links.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-200',
      { owner: 'test-owner', repo: 'test-repo', branch: 'main' }
    );

    const result = await builder.buildIssueBody();

    // Absolute URLs should remain unchanged
    expect(result.body).toContain('https://docs.example.com/guide.md');
    expect(result.body).toContain('https://github.com/other/repo/blob/main/README.md');

    // Relative URL should be converted
    expect(result.body).toContain('test-repo/blob/main/.specweave/docs/internal/specs/default/FS-200/us-002-internal.md');
  });

  test('should handle edge case: no Business Rationale or Related Stories', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/default/FS-300');
    await fs.ensureDir(specsDir);

    // Minimal user story (only required sections)
    const userStoryContent = `---
id: US-001
feature: FS-300
title: Minimal User Story
status: planning
created: 2025-11-15
---

# US-001: Minimal User Story

**As a** user
**I want** a feature
**So that** I can do something

## Acceptance Criteria

- [ ] **AC-US1-01**: Basic criterion
`;

    const userStoryPath = path.join(specsDir, 'us-001-minimal.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-300'
    );

    const result = await builder.buildIssueBody();

    // Should still generate valid issue
    expect(result.title).toBe('[FS-300][US-001] Minimal User Story');
    expect(result.body).toContain('## User Story');
    expect(result.body).toContain('## Acceptance Criteria');

    // Optional sections should not appear
    expect(result.body).not.toContain('## Business Rationale');
    expect(result.body).not.toContain('## Related User Stories');

    // But Links section should still be present
    expect(result.body).toContain('## Links');
  });
});
