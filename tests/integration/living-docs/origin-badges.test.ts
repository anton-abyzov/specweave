/**
 * Integration tests for origin badges in living docs User Story files
 * Tests for T-034: Add origin badges to living docs US files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { syncUSTasksToLivingDocs } from '../../../plugins/specweave/lib/hooks/sync-us-tasks.js';

describe('Origin Badges Integration Tests', () => {
  let testRoot: string;
  let incrementPath: string;
  let livingDocsPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    incrementPath = path.join(testRoot, '.specweave', 'increments', '0047-us-task-linkage');
    livingDocsPath = path.join(testRoot, '.specweave', 'docs', 'internal', 'specs', 'specweave', 'FS-047');

    await fs.ensureDir(incrementPath);
    await fs.ensureDir(livingDocsPath);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  // TC-093: Render origin badge for internal US
  it('TC-093: should add Internal origin badge for internal US', async () => {
    // Setup: Create tasks.md with internal US
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-001 - Internal Feature

### T-001: Test task

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create US file without origin badge
    const usFilePath = path.join(livingDocsPath, 'us-001-internal-feature.md');
    const usContent = `# US-001: Internal Feature

## Overview
This is an internal user story.

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: Origin badge added
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 🏠 **Internal**');
    expect(result.success).toBe(true);
    expect(result.updatedFiles).toContain(usFilePath);
  });

  // TC-094: Render origin badge for external US (GitHub)
  it('TC-094: should add GitHub origin badge for external US', async () => {
    // Setup: Create tasks.md with external US
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-002E - External GitHub Feature

### T-002: Test task

**User Story**: US-002E
**Satisfies ACs**: AC-US2E-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create external US file with GitHub metadata
    const usFilePath = path.join(livingDocsPath, 'us-002e-external-github-feature.md');
    const usContent = `---
externalId: GH-#638
externalUrl: https://github.com/owner/repo/issues/638
externalSource: github
---

# US-002E: External GitHub Feature

## Overview
This is an external user story from GitHub.

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: GitHub origin badge with link
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 🔗 [GitHub GH-#638](https://github.com/owner/repo/issues/638)');
    expect(result.success).toBe(true);
  });

  // TC-095: Prevent origin field mutation
  it('TC-095: should prevent changing origin from internal to external', async () => {
    // Setup: Create tasks.md with external US reference
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-001 - Feature

### T-001: Test task

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create US file with existing Internal origin badge
    // Filename is us-001 (internal) but has origin badge already
    const usFilePath = path.join(livingDocsPath, 'us-001-feature.md');
    const usContent = `# US-001: Feature

**Origin**: 🏠 **Internal**

## Overview
This is an internal user story.

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: Origin badge unchanged (still Internal)
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 🏠 **Internal**');
    expect(updatedContent).not.toContain('**External**');
    expect(result.success).toBe(true);
  });

  // TC-096: Render JIRA origin badge
  it('TC-096: should add JIRA origin badge for external US from JIRA', async () => {
    // Setup: Create tasks.md with external US
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-003E - JIRA Feature

### T-003: Test task

**User Story**: US-003E
**Satisfies ACs**: AC-US3E-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create external US file with JIRA metadata
    const usFilePath = path.join(livingDocsPath, 'us-003e-jira-feature.md');
    const usContent = `---
external_id: JIRA-SPEC-789
external_url: https://company.atlassian.net/browse/SPEC-789
external_source: jira
---

# US-003E: JIRA Feature

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: JIRA origin badge with link
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 🎫 [JIRA JIRA-SPEC-789](https://company.atlassian.net/browse/SPEC-789)');
    expect(result.success).toBe(true);
  });

  // TC-097: Render ADO origin badge
  it('TC-097: should add ADO origin badge for external US from Azure DevOps', async () => {
    // Setup: Create tasks.md with external US
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-004E - ADO Feature

### T-004: Test task

**User Story**: US-004E
**Satisfies ACs**: AC-US4E-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create external US file with ADO metadata
    const usFilePath = path.join(livingDocsPath, 'us-004e-ado-feature.md');
    const usContent = `---
external_id: ADO-12345
external_url: https://dev.azure.com/org/project/_workitems/edit/12345
external_source: ado
---

# US-004E: ADO Feature

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: ADO origin badge with link
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 📋 [ADO ADO-12345](https://dev.azure.com/org/project/_workitems/edit/12345)');
    expect(result.success).toBe(true);
  });

  // TC-098: Update existing origin badge (no duplication)
  it('TC-098: should update existing origin badge without duplication', async () => {
    // Setup: Create tasks.md
    const tasksContent = `---
total_tasks: 1
---

## User Story: US-005E - Feature

### T-005: Test task

**User Story**: US-005E
**Satisfies ACs**: AC-US5E-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

    // Setup: Create US file with existing (incomplete) origin badge
    const usFilePath = path.join(livingDocsPath, 'us-005e-feature.md');
    const usContent = `---
external_id: GH-#999
external_url: https://github.com/owner/repo/issues/999
external_source: github
---

# US-005E: Feature

**Origin**: 🔗 **GitHub**

## Tasks

_No tasks defined_
`;
    await fs.writeFile(usFilePath, usContent);

    // Execute sync
    const result = await syncUSTasksToLivingDocs('0047-us-task-linkage', testRoot, 'FS-047');

    // Verify: Origin badge updated with link (no duplication)
    const updatedContent = await fs.readFile(usFilePath, 'utf-8');
    expect(updatedContent).toContain('**Origin**: 🔗 [GitHub GH-#999](https://github.com/owner/repo/issues/999)');

    // Verify: No duplicate origin badges
    const originMatches = updatedContent.match(/\*\*Origin\*\*:/g);
    expect(originMatches).toHaveLength(1);
    expect(result.success).toBe(true);
  });
});
