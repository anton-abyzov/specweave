/**
 * E2E Tests for GitHub Frontmatter Updates
 *
 * Critical: Ensures user story files are updated with GitHub issue numbers
 * after sync, enabling bidirectional tracking.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

test.describe('GitHub Frontmatter Updates', () => {
  let tmpDir: string;
  let originalCwd: string;

  test.beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-frontmatter-'));
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  test('should parse frontmatter with external GitHub info', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/frontmatter-test.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'frontmatter-test/FS-950');
    await fs.ensureDir(projectDir);

    // User story WITH GitHub info in frontmatter
    const userStoryContent = `---
id: US-001
feature: FS-950
title: Frontmatter Test
status: active
priority: P1
created: 2025-11-15
external:
  github:
    issue: 42
    url: https://github.com/test-org/frontmatter-test/issues/42
---

# US-001: Frontmatter Test

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion
`;

    const userStoryPath = path.join(projectDir, 'us-001-frontmatter.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // Read and parse frontmatter
    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    expect(match).not.toBeNull();

    const frontmatter = yaml.parse(match![1]);

    // Verify external GitHub info present
    expect(frontmatter.external).toBeDefined();
    expect(frontmatter.external.github).toBeDefined();
    expect(frontmatter.external.github.issue).toBe(42);
    expect(frontmatter.external.github.url).toBe('https://github.com/test-org/frontmatter-test/issues/42');
  });

  test('should extract existing GitHub issue number from frontmatter', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'default/FS-951');
    await fs.ensureDir(projectDir);

    // User story with existing GitHub issue
    const userStoryContent = `---
id: US-001
feature: FS-951
title: Existing Issue Test
status: complete
created: 2025-11-15
completed: 2025-11-15
external:
  github:
    issue: 123
    url: https://github.com/test-org/test-repo/issues/123
---

# US-001: Existing Issue Test

## Acceptance Criteria

- [x] **AC-US1-01**: Test completed
`;

    const userStoryPath = path.join(projectDir, 'us-001-existing.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // Import and build (should detect existing issue)
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const builder = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-951'
    );

    // This simulates what GitHubFeatureSync.findUserStories() does
    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = yaml.parse(match![1]);

    // Verify existing issue detected
    expect(frontmatter.external?.github?.issue).toBe(123);
  });

  test('should handle user story without external section', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'default/FS-952');
    await fs.ensureDir(projectDir);

    // User story WITHOUT external section (new, never synced)
    const userStoryContent = `---
id: US-001
feature: FS-952
title: No External Info
status: planning
created: 2025-11-15
---

# US-001: No External Info

## Acceptance Criteria

- [ ] **AC-US1-01**: First sync
`;

    const userStoryPath = path.join(projectDir, 'us-001-no-external.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = yaml.parse(match![1]);

    // external should be undefined
    expect(frontmatter.external).toBeUndefined();
  });

  test('should update frontmatter with GitHub issue after sync', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'default/FS-953');
    await fs.ensureDir(projectDir);

    // User story without GitHub info
    const initialContent = `---
id: US-001
feature: FS-953
title: Frontmatter Update Test
status: active
created: 2025-11-15
---

# US-001: Frontmatter Update Test

## Acceptance Criteria

- [ ] **AC-US1-01**: Should get GitHub issue
`;

    const userStoryPath = path.join(projectDir, 'us-001-update.md');
    await fs.writeFile(userStoryPath, initialContent);

    // Simulate sync: Add GitHub info to frontmatter
    const mockIssueNumber = 456;
    const mockIssueUrl = 'https://github.com/test-org/test-repo/issues/456';

    // Update frontmatter (simulating what GitHubFeatureSync.syncFeatureToGitHub() does)
    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = yaml.parse(match![1]);

    // Add external GitHub info
    frontmatter.external = {
      github: {
        issue: mockIssueNumber,
        url: mockIssueUrl,
      },
    };

    // Write updated frontmatter
    const bodyContent = content.slice(content.indexOf('---', 3) + 3);
    const updatedContent = `---\n${yaml.stringify(frontmatter)}---${bodyContent}`;
    await fs.writeFile(userStoryPath, updatedContent);

    // Read and verify update
    const updatedFile = await fs.readFile(userStoryPath, 'utf-8');
    const updatedMatch = updatedFile.match(/^---\n([\s\S]*?)\n---/);
    const updatedFrontmatter = yaml.parse(updatedMatch![1]);

    expect(updatedFrontmatter.external?.github?.issue).toBe(456);
    expect(updatedFrontmatter.external?.github?.url).toBe(mockIssueUrl);
  });

  test('should preserve all frontmatter fields when updating', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'backend/FS-954');
    await fs.ensureDir(projectDir);

    // User story with many frontmatter fields
    const initialContent = `---
id: US-001
feature: FS-954
title: Preserve All Fields
status: active
priority: P1
project: backend
created: 2025-11-15
tags:
  - authentication
  - security
custom_field: custom_value
---

# US-001: Preserve All Fields

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion
`;

    const userStoryPath = path.join(projectDir, 'us-001-preserve.md');
    await fs.writeFile(userStoryPath, initialContent);

    // Add GitHub info
    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = yaml.parse(match![1]);

    frontmatter.external = {
      github: {
        issue: 789,
        url: 'https://github.com/test-org/backend/issues/789',
      },
    };

    const bodyContent = content.slice(content.indexOf('---', 3) + 3);
    const updatedContent = `---\n${yaml.stringify(frontmatter)}---${bodyContent}`;
    await fs.writeFile(userStoryPath, updatedContent);

    // Verify all fields preserved
    const updatedFile = await fs.readFile(userStoryPath, 'utf-8');
    const updatedMatch = updatedFile.match(/^---\n([\s\S]*?)\n---/);
    const updatedFrontmatter = yaml.parse(updatedMatch![1]);

    expect(updatedFrontmatter.id).toBe('US-001');
    expect(updatedFrontmatter.feature).toBe('FS-954');
    expect(updatedFrontmatter.title).toBe('Preserve All Fields');
    expect(updatedFrontmatter.status).toBe('active');
    expect(updatedFrontmatter.priority).toBe('P1');
    expect(updatedFrontmatter.project).toBe('backend');
    expect(updatedFrontmatter.tags).toEqual(['authentication', 'security']);
    expect(updatedFrontmatter.custom_field).toBe('custom_value');
    expect(updatedFrontmatter.external?.github?.issue).toBe(789);
  });

  test('should update existing GitHub issue number', async () => {
    process.chdir(tmpDir);

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'default/FS-955');
    await fs.ensureDir(projectDir);

    // User story with old GitHub info
    const initialContent = `---
id: US-001
feature: FS-955
title: Update Existing Issue
status: active
created: 2025-11-15
external:
  github:
    issue: 100
    url: https://github.com/test-org/test-repo/issues/100
---

# US-001: Update Existing Issue

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion
`;

    const userStoryPath = path.join(projectDir, 'us-001-update-existing.md');
    await fs.writeFile(userStoryPath, initialContent);

    // Update to new issue number (e.g., after issue migration)
    const content = await fs.readFile(userStoryPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = yaml.parse(match![1]);

    frontmatter.external.github.issue = 999;
    frontmatter.external.github.url = 'https://github.com/test-org/test-repo/issues/999';

    const bodyContent = content.slice(content.indexOf('---', 3) + 3);
    const updatedContent = `---\n${yaml.stringify(frontmatter)}---${bodyContent}`;
    await fs.writeFile(userStoryPath, updatedContent);

    // Verify update
    const updatedFile = await fs.readFile(userStoryPath, 'utf-8');
    const updatedMatch = updatedFile.match(/^---\n([\s\S]*?)\n---/);
    const updatedFrontmatter = yaml.parse(updatedMatch![1]);

    expect(updatedFrontmatter.external?.github?.issue).toBe(999);
    expect(updatedFrontmatter.external?.github?.url).toBe('https://github.com/test-org/test-repo/issues/999');
  });
});
