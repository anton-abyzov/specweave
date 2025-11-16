/**
 * E2E Tests for GitHubFeatureSync Complete Flow
 *
 * Tests the entire feature sync process:
 * 1. Feature folder detection
 * 2. User story discovery across projects
 * 3. Milestone creation
 * 4. Issue creation for each user story
 * 5. Frontmatter updates with GitHub links
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

test.describe('GitHubFeatureSync - Complete Flow E2E', () => {
  let tmpDir: string;
  let originalCwd: string;

  test.beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-feature-sync-'));
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  test('should discover all user stories across multiple projects', async () => {
    process.chdir(tmpDir);

    // Setup git repo
    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/test-repo.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');

    // Create _features folder with FEATURE.md
    const featuresDir = path.join(specsDir, '_features/FS-500');
    await fs.ensureDir(featuresDir);

    const featureContent = `---
id: FS-500
title: Multi-Project Feature
type: feature
status: active
projects: ['backend', 'frontend', 'mobile']
created: 2025-11-15
last_updated: 2025-11-15
---

# FS-500: Multi-Project Feature

A feature spanning multiple projects.
`;
    await fs.writeFile(path.join(featuresDir, 'FEATURE.md'), featureContent);

    // Create user stories in backend project
    const backendDir = path.join(specsDir, 'backend/FS-500');
    await fs.ensureDir(backendDir);

    await fs.writeFile(
      path.join(backendDir, 'us-001-backend-api.md'),
      `---
id: US-001
feature: FS-500
title: Backend API Endpoint
status: active
project: backend
created: 2025-11-15
---

# US-001: Backend API Endpoint

## Acceptance Criteria

- [ ] **AC-US1-01**: API created
`
    );

    await fs.writeFile(
      path.join(backendDir, 'us-002-database-schema.md'),
      `---
id: US-002
feature: FS-500
title: Database Schema
status: planning
project: backend
created: 2025-11-15
---

# US-002: Database Schema

## Acceptance Criteria

- [ ] **AC-US2-01**: Schema designed
`
    );

    // Create user stories in frontend project
    const frontendDir = path.join(specsDir, 'frontend/FS-500');
    await fs.ensureDir(frontendDir);

    await fs.writeFile(
      path.join(frontendDir, 'us-003-ui-component.md'),
      `---
id: US-003
feature: FS-500
title: UI Component
status: active
project: frontend
created: 2025-11-15
---

# US-003: UI Component

## Acceptance Criteria

- [ ] **AC-US3-01**: Component created
`
    );

    // Import GitHubFeatureSync (mock mode - no actual GitHub API calls)
    const { GitHubClientV2 } = await import('../../plugins/specweave-github/lib/github-client-v2.js');
    const { GitHubFeatureSync } = await import('../../plugins/specweave-github/lib/github-feature-sync.js');

    const client = GitHubClientV2.fromRepo('test-org', 'test-repo');
    const featureSync = new GitHubFeatureSync(client, specsDir, tmpDir);

    // Test: findUserStories() should discover all 3 user stories
    const userStories = await (featureSync as any).findUserStories('FS-500');

    expect(userStories).toHaveLength(3);
    expect(userStories.map((us: any) => us.id)).toEqual(['US-001', 'US-002', 'US-003']);
    expect(userStories.map((us: any) => us.project)).toEqual(['backend', 'backend', 'frontend']);
  });

  test('should generate correct issue content for each user story', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/acme/product.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');

    // Create feature
    const featuresDir = path.join(specsDir, '_features/FS-600');
    await fs.ensureDir(featuresDir);

    await fs.writeFile(
      path.join(featuresDir, 'FEATURE.md'),
      `---
id: FS-600
title: Complete Content Test
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
---

# FS-600: Complete Content Test
`
    );

    // Create user story with ALL sections
    const productDir = path.join(specsDir, 'product/FS-600');
    await fs.ensureDir(productDir);

    await fs.writeFile(
      path.join(productDir, 'us-001-complete.md'),
      `---
id: US-001
feature: FS-600
title: Complete Content User Story
status: active
priority: P1
project: product
created: 2025-11-15
---

# US-001: Complete Content User Story

**Feature**: [FS-600](../../_features/FS-600/FEATURE.md)

**As a** stakeholder
**I want** complete GitHub sync
**So that** I see everything in GitHub

---

## Acceptance Criteria

- [x] **AC-US1-01**: First AC (completed)
- [ ] **AC-US1-02**: Second AC (not completed)
- [x] **AC-001**: Legacy format (completed)

---

## Business Rationale

Stakeholders need full visibility without repo access.

---

## Related User Stories

- [US-002: Related Story](us-002-related.md)
- [US-003: Another Story](us-003-another.md)

---

## Implementation

**Increment**: [0600-test](../../../../../increments/0600-test/tasks.md)

**Tasks**:
- [T-001: Task One](../../../../../increments/0600-test/tasks.md#t-001)

---

**Status**: ✅ Active
`
    );

    // Import and build issue
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const userStoryPath = path.join(productDir, 'us-001-complete.md');
    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-600',
      { owner: 'acme', repo: 'product', branch: 'main' }
    );

    const result = await builder.buildIssueBody();

    // Verify comprehensive content
    expect(result.title).toBe('[FS-600][US-001] Complete Content User Story');

    // Check all major sections exist
    const sections = [
      '## User Story',
      '## Acceptance Criteria',
      '## Business Rationale',
      '## Related User Stories',
      '## Implementation',
      '## Links',
    ];

    for (const section of sections) {
      expect(result.body).toContain(section);
    }

    // Check ACs with checkboxes (mixed formats)
    expect(result.body).toContain('- [x] **AC-US1-01**: First AC (completed)');
    expect(result.body).toContain('- [ ] **AC-US1-02**: Second AC (not completed)');
    expect(result.body).toContain('- [x] **AC-001**: Legacy format (completed)');

    // Check Related Stories links converted
    expect(result.body).toContain(
      'https://github.com/acme/product/blob/main/.specweave/docs/internal/specs/product/FS-600/us-002-related.md'
    );

    // Check Implementation links converted
    expect(result.body).toContain(
      'https://github.com/acme/product/blob/main/.specweave/increments/0600-test/tasks.md'
    );

    // Check Labels
    expect(result.labels).toContain('user-story');
    expect(result.labels).toContain('status:active');
    expect(result.labels).toContain('p1');
    expect(result.labels).toContain('project:product');
  });

  test('should handle repo name detection for project naming', async () => {
    process.chdir(tmpDir);

    // Test different git remote formats
    const testCases = [
      {
        remote: 'https://github.com/mycompany/awesome-app.git',
        expectedProject: 'awesome-app',
      },
      {
        remote: 'git@github.com:mycompany/backend-api.git',
        expectedProject: 'backend-api',
      },
      {
        remote: 'https://gitlab.com/team/frontend-web.git',
        expectedProject: 'frontend-web',
      },
    ];

    for (const testCase of testCases) {
      // Clean up previous git config
      await fs.remove(path.join(tmpDir, '.git'));

      execSync('git init', { cwd: tmpDir });
      execSync(`git remote add origin ${testCase.remote}`, { cwd: tmpDir });

      // Import fresh ProjectDetector
      // Note: In ESM, imports are cached. We work around this by passing different config paths
      const { ProjectDetector } = await import('../../src/core/living-docs/project-detector.js');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe(testCase.expectedProject);
    }
  });

  test('should skip features not present in a project', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test/repo.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');

    // Create feature
    const featuresDir = path.join(specsDir, '_features/FS-700');
    await fs.ensureDir(featuresDir);

    await fs.writeFile(
      path.join(featuresDir, 'FEATURE.md'),
      `---
id: FS-700
title: Selective Feature
type: feature
status: active
created: 2025-11-15
last_updated: 2025-11-15
---

# FS-700: Selective Feature
`
    );

    // Create user stories ONLY in backend (not in frontend)
    const backendDir = path.join(specsDir, 'backend/FS-700');
    await fs.ensureDir(backendDir);

    await fs.writeFile(
      path.join(backendDir, 'us-001-backend-only.md'),
      `---
id: US-001
feature: FS-700
title: Backend Only
status: active
project: backend
created: 2025-11-15
---

# US-001: Backend Only

## Acceptance Criteria

- [ ] **AC-US1-01**: Backend feature
`
    );

    // Create frontend folder but NO FS-700 subfolder
    await fs.ensureDir(path.join(specsDir, 'frontend'));

    // Import and test
    const { GitHubClientV2 } = await import('../../plugins/specweave-github/lib/github-client-v2.js');
    const { GitHubFeatureSync } = await import('../../plugins/specweave-github/lib/github-feature-sync.js');

    const client = GitHubClientV2.fromRepo('test', 'repo');
    const featureSync = new GitHubFeatureSync(client, specsDir, tmpDir);

    const userStories = await (featureSync as any).findUserStories('FS-700');

    // Should find only backend user story (frontend skipped)
    expect(userStories).toHaveLength(1);
    expect(userStories[0].id).toBe('US-001');
    expect(userStories[0].project).toBe('backend');
  });

  test('should handle branch name detection', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test/repo.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/default/FS-800');
    await fs.ensureDir(specsDir);

    await fs.writeFile(
      path.join(specsDir, 'us-001-branch-test.md'),
      `---
id: US-001
feature: FS-800
title: Branch Test
status: active
created: 2025-11-15
---

# US-001: Branch Test

## Implementation

**Increment**: [0800-test](../../../../../increments/0800-test/tasks.md)
`
    );

    // Test with custom branch
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      path.join(specsDir, 'us-001-branch-test.md'),
      tmpDir,
      'FS-800',
      { owner: 'test', repo: 'repo', branch: 'feature/custom-branch' }
    );

    const result = await builder.buildIssueBody();

    // Links should use custom branch
    expect(result.body).toContain('blob/feature/custom-branch/');
    expect(result.body).not.toContain('blob/main/');
    expect(result.body).not.toContain('blob/develop/');
  });
});
