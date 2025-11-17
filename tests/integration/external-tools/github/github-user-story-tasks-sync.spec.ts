/**
 * E2E Tests for GitHub User Story Sync with Project-Specific Tasks
 *
 * Tests the full workflow from increment → living docs → GitHub issue with checkable tasks.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

test.describe('GitHub User Story Tasks Sync E2E', () => {
  const testProjectRoot = path.join(__dirname, '../fixtures/e2e-github-tasks-test');

  test.beforeEach(async () => {
    // Create clean test environment
    await fs.ensureDir(testProjectRoot);
    await fs.ensureDir(path.join(testProjectRoot, '.specweave'));

    // Initialize SpecWeave
    execSync('specweave init --adapter github', {
      cwd: testProjectRoot,
      stdio: 'pipe',
    });
  });

  test.afterEach(async () => {
    // Clean up test environment
    await fs.remove(testProjectRoot);
  });

  test('should generate user story with project-specific tasks and sync to GitHub', async () => {
    // Step 1: Create increment with multi-project user stories
    const incrementId = '0040-github-tasks-e2e';
    const incrementPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    const specContent = `---
title: "GitHub Tasks E2E Test"
priority: P1
projects:
  - backend
  - frontend
---

# Increment 0040: GitHub Tasks E2E Test

## Quick Overview

Testing project-specific task generation and GitHub sync.

**Business Value**:
- **Traceability**: Clear task assignment per project
- **Collaboration**: Stakeholders can track progress in GitHub

---

### US-001: API Authentication

**As a** backend developer
**I want** to implement API authentication
**So that** only authorized users can access the API

**Acceptance Criteria**:
- AC-US1-01: JWT token generation works (P0, testable)
- AC-US1-02: Token validation middleware implemented (P0, testable)

**Business Rationale**: Security is critical for API access

---

### US-002: Login UI Component

**As a** frontend developer
**I want** to create a login UI component
**So that** users can authenticate via the interface

**Acceptance Criteria**:
- AC-US2-01: Login form renders correctly (P0, testable)
- AC-US2-02: Form submission triggers API call (P0, testable)

**Business Rationale**: Users need UI to authenticate
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

    const tasksContent = `# Tasks for 0040-github-tasks-e2e

## T-001: Setup JWT authentication middleware

**User Story**: [US-001: API Authentication](../../docs/internal/specs/backend/FS-040/us-001-api-authentication.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US1-01, AC-US1-02

**Description**: Implement JWT token generation and validation

## T-002: Add authentication routes to Express

**User Story**: [US-001: API Authentication](../../docs/internal/specs/backend/FS-040/us-001-api-authentication.md)

**Status**: [ ] (0% - Not started)

**AC**: AC-US1-02

**Description**: Create /auth/login and /auth/verify endpoints

## T-003: Create React login form component

**User Story**: [US-002: Login UI Component](../../docs/internal/specs/frontend/FS-040/us-002-login-ui-component.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US2-01

**Description**: Build reusable login form component

## T-004: Connect form to authentication API

**User Story**: [US-002: Login UI Component](../../docs/internal/specs/frontend/FS-040/us-002-login-ui-component.md)

**Status**: [ ] (0% - Not started)

**AC**: AC-US2-02

**Description**: Wire up form submission to backend API
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Step 2: Update living docs (generate user story files with ## Tasks)
    execSync('specweave sync-docs update', {
      cwd: testProjectRoot,
      stdio: 'pipe',
    });

    // Step 3: Verify backend user story file has correct tasks
    const backendUSPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'backend',
      'FS-040',
      'us-001-api-authentication.md'
    );

    expect(await fs.pathExists(backendUSPath)).toBe(true);

    const backendUSContent = await fs.readFile(backendUSPath, 'utf-8');

    // Verify backend tasks (T-001, T-002)
    expect(backendUSContent).toContain('## Tasks');
    expect(backendUSContent).toContain('- [x] **T-001**: Setup JWT authentication middleware');
    expect(backendUSContent).toContain('- [ ] **T-002**: Add authentication routes to Express');

    // Verify frontend tasks NOT included
    expect(backendUSContent).not.toContain('T-003');
    expect(backendUSContent).not.toContain('T-004');

    // Step 4: Verify frontend user story file has correct tasks
    const frontendUSPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'frontend',
      'FS-040',
      'us-002-login-ui-component.md'
    );

    expect(await fs.pathExists(frontendUSPath)).toBe(true);

    const frontendUSContent = await fs.readFile(frontendUSPath, 'utf-8');

    // Verify frontend tasks (T-003, T-004)
    expect(frontendUSContent).toContain('- [x] **T-003**: Create React login form component');
    expect(frontendUSContent).toContain('- [ ] **T-004**: Connect form to authentication API');

    // Verify backend tasks NOT included
    expect(frontendUSContent).not.toContain('T-001');
    expect(frontendUSContent).not.toContain('T-002');

    // Step 5: Sync to GitHub (dry-run mode for E2E test)
    const syncOutput = execSync('specweave-github sync-spec specweave/FS-040 --dry-run', {
      cwd: testProjectRoot,
      encoding: 'utf-8',
    });

    // Verify sync output shows task creation
    expect(syncOutput).toContain('Creating GitHub issue for US-001');
    expect(syncOutput).toContain('Creating GitHub issue for US-002');
    expect(syncOutput).toContain('## Tasks'); // Issue body includes tasks

    // Step 6: Verify GitHub issue builder generates correct body
    const { UserStoryIssueBuilder } = await import(
      path.join(testProjectRoot, 'node_modules', 'specweave', 'plugins', 'specweave-github', 'lib', 'user-story-issue-builder.js')
    );

    const builder = new UserStoryIssueBuilder(
      backendUSPath,
      testProjectRoot,
      'FS-040',
      {
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'develop',
      }
    );

    const issueData = await builder.buildIssueBody();

    // Verify issue title
    expect(issueData.title).toBe('[FS-040][US-001] API Authentication');

    // Verify issue body has Tasks section with checkboxes
    expect(issueData.body).toContain('## Tasks');
    expect(issueData.body).toContain('- [x] **T-001**: Setup JWT authentication middleware');
    expect(issueData.body).toContain('- [ ] **T-002**: Add authentication routes to Express');

    // Verify labels
    expect(issueData.labels).toContain('user-story');
    expect(issueData.labels).toContain('project:backend');
  });

  test('should handle user story without tasks gracefully', async () => {
    const incrementId = '0041-no-tasks';
    const incrementPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    const specContent = `---
title: "No Tasks Test"
---

# Increment 0041: No Tasks Test

### US-001: Planning Only

**As a** user
**I want** a user story without implementation tasks
**So that** we test edge cases

**Acceptance Criteria**:
- AC-001: Planning complete
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

    // No tasks.md file

    execSync('specweave sync-docs update', {
      cwd: testProjectRoot,
      stdio: 'pipe',
    });

    const usPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'default',
      'FS-041',
      'us-001-planning-only.md'
    );

    const usContent = await fs.readFile(usPath, 'utf-8');

    // Should not have ## Tasks section
    expect(usContent).not.toContain('## Tasks');

    // Should still have Implementation section
    expect(usContent).toContain('## Implementation');
  });

  test('should preserve task completion status through sync', async () => {
    const incrementId = '0042-completion-sync';
    const incrementPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    const specContent = `---
title: "Completion Sync Test"
---

# Increment 0042: Completion Sync Test

### US-001: Task Completion

**As a** developer
**I want** task completion to sync correctly
**So that** progress is accurately tracked

**Acceptance Criteria**:
- AC-001: Completed tasks show [x]
- AC-002: Incomplete tasks show [ ]
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

    const tasksContent = `
## T-001: Completed task

**Status**: [x] (100% - Completed)

**AC**: AC-001

## T-002: In progress task

**Status**: [ ] (50% - In progress)

**AC**: AC-002
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Generate living docs
    execSync('specweave sync-docs update', {
      cwd: testProjectRoot,
      stdio: 'pipe',
    });

    const usPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'default',
      'FS-042',
      'us-001-task-completion.md'
    );

    const usContent = await fs.readFile(usPath, 'utf-8');

    // Verify completion status preserved
    expect(usContent).toContain('- [x] **T-001**: Completed task');
    expect(usContent).toContain('- [ ] **T-002**: In progress task');

    // Build GitHub issue
    const { UserStoryIssueBuilder } = await import(
      path.join(testProjectRoot, 'node_modules', 'specweave', 'plugins', 'specweave-github', 'lib', 'user-story-issue-builder.js')
    );

    const builder = new UserStoryIssueBuilder(
      usPath,
      testProjectRoot,
      'FS-042'
    );

    const issueData = await builder.buildIssueBody();

    // Verify GitHub issue has correct checkbox states
    expect(issueData.body).toContain('- [x] **T-001**: Completed task');
    expect(issueData.body).toContain('- [ ] **T-002**: In progress task');
  });

  test('should support multi-project task filtering', async () => {
    const incrementId = '0043-multi-project-filter';
    const incrementPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    const specContent = `---
title: "Multi-Project Filter Test"
projects:
  - backend
  - frontend
---

# Increment 0043: Multi-Project Filter Test

### US-001: Cross-Platform Feature

**As a** user
**I want** the feature to work across platforms
**So that** I have a consistent experience

**Acceptance Criteria**:
- AC-001: Works on all platforms
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

    const tasksContent = `
## T-001: API endpoint

**Status**: [x]

**AC**: AC-001

## T-002: React component

**Status**: [ ]

**AC**: AC-001

## T-003: Mobile component

**Status**: [ ]

**AC**: AC-001
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Configure project keywords
    const config = {
      multiProject: {
        enabled: true,
        projects: {
          backend: {
            keywords: ['api', 'endpoint'],
          },
          frontend: {
            keywords: ['react', 'component'],
          },
        },
      },
    };

    await fs.writeFile(
      path.join(testProjectRoot, '.specweave', 'config.json'),
      JSON.stringify(config, null, 2)
    );

    execSync('specweave sync-docs update', {
      cwd: testProjectRoot,
      stdio: 'pipe',
    });

    // Backend should have API task only
    const backendUSPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'backend',
      'FS-043',
      'us-001-cross-platform-feature.md'
    );

    const backendContent = await fs.readFile(backendUSPath, 'utf-8');
    expect(backendContent).toContain('T-001');
    expect(backendContent).not.toContain('T-002');

    // Frontend should have React component task
    const frontendUSPath = path.join(
      testProjectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      'frontend',
      'FS-043',
      'us-001-cross-platform-feature.md'
    );

    const frontendContent = await fs.readFile(frontendUSPath, 'utf-8');
    expect(frontendContent).toContain('T-002');
    expect(frontendContent).not.toContain('T-001');
  });
});
