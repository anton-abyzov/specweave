/**
 * E2E Tests for GitHub Sync Idempotency
 *
 * Critical: Ensures syncing the same user story multiple times doesn't create duplicates
 * and properly updates existing issues.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

test.describe('GitHub Sync - Idempotency', () => {
  let tmpDir: string;
  let originalCwd: string;

  test.beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-idempotency-'));
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  test('should generate same content when syncing user story twice', async () => {
    process.chdir(tmpDir);

    // Setup git repo
    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/idempotency-test.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'idempotency-test/FS-900');
    await fs.ensureDir(projectDir);

    // Create user story
    const userStoryContent = `---
id: US-001
feature: FS-900
title: Idempotency Test
status: active
priority: P1
created: 2025-11-15
---

# US-001: Idempotency Test

**As a** developer
**I want** sync to be idempotent
**So that** I can run it multiple times safely

## Acceptance Criteria

- [x] **AC-US1-01**: First sync creates issue
- [ ] **AC-US1-02**: Second sync updates existing issue
- [x] **AC-US1-03**: No duplicates created

## Related User Stories

- [US-002: Related Story](us-002-related.md)

## Business Rationale

Users often re-sync to update content after making changes.
`;

    const userStoryPath = path.join(projectDir, 'us-001-idempotency.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    // Import builder
    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const repoInfo = { owner: 'test-org', repo: 'idempotency-test', branch: 'main' };

    // First sync
    const builder1 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-900', repoInfo);
    const result1 = await builder1.buildIssueBody();

    // Second sync (same content)
    const builder2 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-900', repoInfo);
    const result2 = await builder2.buildIssueBody();

    // Results should be identical
    expect(result1.title).toBe(result2.title);
    expect(result1.body).toBe(result2.body);
    expect(result1.labels).toEqual(result2.labels);
    expect(result1.userStoryId).toBe(result2.userStoryId);
  });

  test('should preserve AC checkbox states when syncing multiple times', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/checkbox-test.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'checkbox-test/FS-901');
    await fs.ensureDir(projectDir);

    // Initial user story with some ACs completed
    const initialContent = `---
id: US-001
feature: FS-901
title: Checkbox Preservation Test
status: active
created: 2025-11-15
---

# US-001: Checkbox Preservation Test

## Acceptance Criteria

- [x] **AC-US1-01**: First AC (completed)
- [ ] **AC-US1-02**: Second AC (not completed)
- [x] **AC-US1-03**: Third AC (completed)
`;

    const userStoryPath = path.join(projectDir, 'us-001-checkbox.md');
    await fs.writeFile(userStoryPath, initialContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    // First sync
    const builder1 = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-901',
      { owner: 'test-org', repo: 'checkbox-test', branch: 'main' }
    );
    const result1 = await builder1.buildIssueBody();

    // Verify initial state
    expect(result1.body).toContain('- [x] **AC-US1-01**: First AC (completed)');
    expect(result1.body).toContain('- [ ] **AC-US1-02**: Second AC (not completed)');
    expect(result1.body).toContain('- [x] **AC-US1-03**: Third AC (completed)');

    // Update user story (complete AC-US1-02)
    const updatedContent = initialContent.replace(
      '- [ ] **AC-US1-02**: Second AC (not completed)',
      '- [x] **AC-US1-02**: Second AC (completed)'
    );
    await fs.writeFile(userStoryPath, updatedContent);

    // Second sync
    const builder2 = new UserStoryIssueBuilder(
      userStoryPath,
      tmpDir,
      'FS-901',
      { owner: 'test-org', repo: 'checkbox-test', branch: 'main' }
    );
    const result2 = await builder2.buildIssueBody();

    // Verify updated state
    expect(result2.body).toContain('- [x] **AC-US1-01**: First AC (completed)');
    expect(result2.body).toContain('- [x] **AC-US1-02**: Second AC (completed)'); // Now completed!
    expect(result2.body).toContain('- [x] **AC-US1-03**: Third AC (completed)');
  });

  test('should handle content changes between syncs', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/content-change.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'content-change/FS-902');
    await fs.ensureDir(projectDir);

    // Initial version
    const version1 = `---
id: US-001
feature: FS-902
title: Content Change Test V1
status: active
created: 2025-11-15
---

# US-001: Content Change Test V1

## Acceptance Criteria

- [ ] **AC-US1-01**: Original criterion
`;

    const userStoryPath = path.join(projectDir, 'us-001-content-change.md');
    await fs.writeFile(userStoryPath, version1);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const repoInfo = { owner: 'test-org', repo: 'content-change', branch: 'main' };

    // First sync
    const builder1 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-902', repoInfo);
    const result1 = await builder1.buildIssueBody();

    expect(result1.title).toBe('[FS-902][US-001] Content Change Test V1');
    expect(result1.body).toContain('Original criterion');

    // Update content
    const version2 = `---
id: US-001
feature: FS-902
title: Content Change Test V2
status: active
created: 2025-11-15
---

# US-001: Content Change Test V2

## Acceptance Criteria

- [ ] **AC-US1-01**: Original criterion
- [ ] **AC-US1-02**: New criterion added

## Business Rationale

Added new business context.
`;

    await fs.writeFile(userStoryPath, version2);

    // Second sync
    const builder2 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-902', repoInfo);
    const result2 = await builder2.buildIssueBody();

    // Title should update
    expect(result2.title).toBe('[FS-902][US-001] Content Change Test V2');

    // New AC should appear
    expect(result2.body).toContain('**AC-US1-02**: New criterion added');

    // New section should appear
    expect(result2.body).toContain('## Business Rationale');
    expect(result2.body).toContain('Added new business context');
  });

  test('should handle Related Stories changes between syncs', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/related-changes.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'related-changes/FS-903');
    await fs.ensureDir(projectDir);

    // Initial version (no Related Stories)
    const version1 = `---
id: US-001
feature: FS-903
title: Related Stories Evolution
status: active
created: 2025-11-15
---

# US-001: Related Stories Evolution

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion
`;

    const userStoryPath = path.join(projectDir, 'us-001-related-evolution.md');
    await fs.writeFile(userStoryPath, version1);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const repoInfo = { owner: 'test-org', repo: 'related-changes', branch: 'main' };

    // First sync
    const builder1 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-903', repoInfo);
    const result1 = await builder1.buildIssueBody();

    // No Related Stories section
    expect(result1.body).not.toContain('## Related User Stories');

    // Add Related Stories
    const version2 = `---
id: US-001
feature: FS-903
title: Related Stories Evolution
status: active
created: 2025-11-15
---

# US-001: Related Stories Evolution

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion

## Related User Stories

- [US-002: First Related](us-002-first.md)
- [US-003: Second Related](us-003-second.md)
`;

    await fs.writeFile(userStoryPath, version2);

    // Second sync
    const builder2 = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-903', repoInfo);
    const result2 = await builder2.buildIssueBody();

    // Related Stories section should appear
    expect(result2.body).toContain('## Related User Stories');
    expect(result2.body).toContain('US-002: First Related');
    expect(result2.body).toContain('US-003: Second Related');

    // Links should be converted
    expect(result2.body).toContain(
      'https://github.com/test-org/related-changes/blob/main/.specweave/docs/internal/specs/related-changes/FS-903/us-002-first.md'
    );
  });

  test('should consistently format links across multiple syncs', async () => {
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });
    execSync('git remote add origin https://github.com/test-org/link-format.git', { cwd: tmpDir });

    const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs');
    const projectDir = path.join(specsDir, 'link-format/FS-904');
    await fs.ensureDir(projectDir);

    const userStoryContent = `---
id: US-001
feature: FS-904
title: Link Formatting Consistency
status: active
created: 2025-11-15
---

# US-001: Link Formatting Consistency

## Related User Stories

- [US-002: Related](us-002-related.md)

## Implementation

**Increment**: [0904-test](../../../../../increments/0904-test/tasks.md)
`;

    const userStoryPath = path.join(projectDir, 'us-001-link-format.md');
    await fs.writeFile(userStoryPath, userStoryContent);

    const { UserStoryIssueBuilder } = await import('../../plugins/specweave-github/lib/user-story-issue-builder.js');

    const repoInfo = { owner: 'test-org', repo: 'link-format', branch: 'develop' };

    // Sync multiple times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const builder = new UserStoryIssueBuilder(userStoryPath, tmpDir, 'FS-904', repoInfo);
      const result = await builder.buildIssueBody();
      results.push(result);
    }

    // All syncs should produce identical link formatting
    const baseUrl = 'https://github.com/test-org/link-format/blob/develop';
    const expectedRelatedLink = `${baseUrl}/.specweave/docs/internal/specs/link-format/FS-904/us-002-related.md`;
    const expectedIncrementLink = `${baseUrl}/.specweave/increments/0904-test/tasks.md`;

    for (const result of results) {
      expect(result.body).toContain(expectedRelatedLink);
      expect(result.body).toContain(expectedIncrementLink);
    }

    // All results should be identical
    expect(results[0].body).toBe(results[1].body);
    expect(results[1].body).toBe(results[2].body);
  });
});
