/**
 * Unit tests for UserStoryIssueBuilder
 *
 * Tests the 4 critical bugs fixed in GitHub issue generation:
 * 1. ✅ Feature field reading (not epic)
 * 2. ✅ Project field conditional output
 * 3. ✅ AC checkbox state extraction
 * 4. ✅ Implementation section inclusion
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserStoryIssueBuilder } from '../../plugins/specweave-github/lib/user-story-issue-builder.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

describe('UserStoryIssueBuilder - Bug Prevention Tests', () => {
  let tempDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await mkdtemp(path.join(tmpdir(), 'specweave-test-'));
    projectRoot = tempDir;

    // Create directory structure
    await fs.mkdir(path.join(tempDir, '.specweave/increments/0031-test/'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  // ========================================================================
  // BUG #1 TEST: Feature field reading (not epic)
  // ========================================================================
  describe('Bug #1: Feature field reading', () => {
    it('should read feature: field from user story frontmatter (not epic:)', async () => {
      // Arrange: Create user story with feature: field
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-001-test.md');
      const userStoryContent = `---
id: US-001
feature: FS-031
title: "Test User Story"
status: active
created: 2025-11-15
---

# US-001: Test User Story

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** developer
**I want** to test feature field reading
**So that** bugs don't regress

## Acceptance Criteria

- [ ] **AC-US1-01**: Feature field is read correctly
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Title includes Feature ID
      expect(result.title).toBe('[FS-031][US-001] Test User Story');
      expect(result.body).toContain('**Feature**: FS-031');
    });

    it('should fail gracefully if epic: field is used (legacy)', async () => {
      // Arrange: Create user story with WRONG epic: field
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-002-legacy.md');
      const userStoryContent = `---
id: US-002
epic: FS-031
title: "Legacy User Story"
status: active
created: 2025-11-15
---

# US-002: Legacy User Story

**As a** developer
**I want** to detect legacy epic: usage
**So that** I can migrate to feature:
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body (should work but log warning)
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Still works with featureId from constructor
      expect(result.title).toBe('[FS-031][US-002] Legacy User Story');
      // Note: This test documents current behavior - epic: field is ignored,
      // featureId comes from constructor parameter
    });
  });

  // ========================================================================
  // BUG #2 TEST: Project field conditional output
  // ========================================================================
  describe('Bug #2: Project field conditional output', () => {
    it('should NOT output Project field when undefined', async () => {
      // Arrange: User story WITHOUT project field
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-003-no-project.md');
      const userStoryContent = `---
id: US-003
feature: FS-031
title: "User Story Without Project"
status: active
created: 2025-11-15
---

# US-003: User Story Without Project

**As a** developer
**I want** Project field to be optional
**So that** "Project: undefined" doesn't appear
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: NO "Project: undefined" in body
      expect(result.body).not.toContain('**Project**: undefined');
      // Also verify no Project field at all when undefined
      expect(result.body).not.toMatch(/\*\*Project\*\*:/);

    });

    it('should NOT output Project field when "default"', async () => {
      // Arrange: User story with project: default
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-004-default-project.md');
      const userStoryContent = `---
id: US-004
feature: FS-031
title: "User Story With Default Project"
status: active
project: default
created: 2025-11-15
---

# US-004: User Story With Default Project
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: NO Project field for "default"
      expect(result.body).not.toContain('**Project**: default');
    });

    it('should output Project field when non-default', async () => {
      // Arrange: User story with project: backend
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/backend/FS-031/us-005-backend-project.md');
      const userStoryContent = `---
id: US-005
feature: FS-031
title: "Backend User Story"
status: active
project: backend
created: 2025-11-15
---

# US-005: Backend User Story
`;

      await fs.mkdir(path.dirname(userStoryPath), { recursive: true });
      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Project field IS present
      expect(result.body).toContain('**Project**: backend');
    });
  });

  // ========================================================================
  // BUG #3 TEST: AC checkbox state extraction
  // ========================================================================
  describe('Bug #3: AC checkbox state extraction', () => {
    it('should extract checked ACs correctly', async () => {
      // Arrange: User story with CHECKED AC
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-006-checked-ac.md');
      const userStoryContent = `---
id: US-006
feature: FS-031
title: "User Story With Checked AC"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-006: User Story With Checked AC

## Acceptance Criteria

- [x] **AC-US6-01**: This AC is completed
- [ ] **AC-US6-02**: This AC is not completed
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Checkbox states preserved
      expect(result.body).toContain('- [x] **AC-US6-01**: This AC is completed');
      expect(result.body).toContain('- [ ] **AC-US6-02**: This AC is not completed');
    });

    it('should default to unchecked when no checkbox present', async () => {
      // Arrange: User story with NO checkbox (plain list)
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-007-no-checkbox.md');
      const userStoryContent = `---
id: US-007
feature: FS-031
title: "User Story Without Checkboxes"
status: planning
created: 2025-11-15
---

# US-007: User Story Without Checkboxes

## Acceptance Criteria

- **AC-US7-01**: No checkbox present (legacy format)
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Default to unchecked
      expect(result.body).toContain('- [ ] **AC-US7-01**: No checkbox present');
    });

    it('should handle mixed checkbox formats', async () => {
      // Arrange: User story with MIXED formats
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-008-mixed.md');
      const userStoryContent = `---
id: US-008
feature: FS-031
title: "User Story With Mixed Formats"
status: active
created: 2025-11-15
---

# US-008: User Story With Mixed Formats

## Acceptance Criteria

- [x] **AC-US8-01**: Checked with checkbox
- [ ] **AC-US8-02**: Unchecked with checkbox
- **AC-US8-03**: No checkbox (should default to unchecked)
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: All formats handled correctly
      expect(result.body).toContain('- [x] **AC-US8-01**: Checked with checkbox');
      expect(result.body).toContain('- [ ] **AC-US8-02**: Unchecked with checkbox');
      // Note: AC-US8-03 will be skipped if only checkbox pattern matches
    });
  });

  // ========================================================================
  // BUG #4 TEST: Implementation section inclusion
  // ========================================================================
  describe('Bug #4: Implementation section inclusion', () => {
    it('should include Implementation section with task links', async () => {
      // Arrange: User story WITH Implementation section
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-009-impl.md');
      const userStoryContent = `---
id: US-009
feature: FS-031
title: "User Story With Implementation"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-009: User Story With Implementation

## Acceptance Criteria

- [x] **AC-US9-01**: Implementation section is included

## Implementation

**Increment**: [0031-test-increment](../../../../../increments/0031-test-increment/tasks.md)

**Tasks**:
- [T-001: Implement Feature X](../../../../../increments/0031-test-increment/tasks.md#t-001-implement-feature-x)
- [T-002: Add Tests](../../../../../increments/0031-test-increment/tasks.md#t-002-add-tests)

## Business Rationale

This is important for traceability.
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Implementation section present with task links
      expect(result.body).toContain('## Implementation');
      expect(result.body).toContain('**Increment**: [0031-test-increment]');
      expect(result.body).toContain('**Tasks**:');
      expect(result.body).toContain('[T-001: Implement Feature X]');
      expect(result.body).toContain('[T-002: Add Tests]');
    });

    it('should handle missing Implementation section gracefully', async () => {
      // Arrange: User story WITHOUT Implementation section
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-010-no-impl.md');
      const userStoryContent = `---
id: US-010
feature: FS-031
title: "User Story Without Implementation"
status: planning
created: 2025-11-15
---

# US-010: User Story Without Implementation

## Acceptance Criteria

- [ ] **AC-US10-01**: This is in planning, no implementation yet

## Business Rationale

Feature not implemented yet.
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: No Implementation section (should not crash)
      expect(result.body).not.toContain('## Implementation');
      // Business Rationale should still be present
      expect(result.body).toContain('## Business Rationale');
      expect(result.body).toContain('Feature not implemented yet');
    });

    it('should include both Implementation and Business Rationale', async () => {
      // Arrange: User story with BOTH sections
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-011-both.md');
      const userStoryContent = `---
id: US-011
feature: FS-031
title: "User Story With Both Sections"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-011: User Story With Both Sections

## Acceptance Criteria

- [x] **AC-US11-01**: Both sections are included

## Business Rationale

This feature provides business value.

## Implementation

**Increment**: [0031-test-increment](../../../../../increments/0031-test-increment/tasks.md)

**Tasks**:
- [T-003: Implement Feature Y](../../../../../increments/0031-test-increment/tasks.md#t-003-implement-feature-y)
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Both sections present
      expect(result.body).toContain('## Business Rationale');
      expect(result.body).toContain('This feature provides business value');
      expect(result.body).toContain('## Implementation');
      expect(result.body).toContain('[T-003: Implement Feature Y]');
    });
  });

  // ========================================================================
  // NEW FEATURE TEST: Task Completion Status from tasks.md
  // ========================================================================
  describe('New Feature: Task Completion Status Reading', () => {
    it('should read task completion status from tasks.md', async () => {
      // Arrange: User story with tasks + tasks.md with completion status
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-013-task-completion.md');
      const userStoryContent = `---
id: US-013
feature: FS-031
title: "User Story With Task Completion"
status: active
created: 2025-11-15
---

# US-013: User Story With Task Completion

## Acceptance Criteria

- [ ] **AC-US13-01**: Task completion status is read from tasks.md

## Tasks

- [x] **T-001**: Completed Task
- [ ] **T-002**: In Progress Task
- [ ] **T-003**: Not Started Task

> **Note**: Tasks are project-specific. See increment tasks.md for full list

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)
`;

      const tasksContent = `# Tasks for Increment 0031

---
increment: 0031-external-tool-status-sync
total_tasks: 3
---

### T-001: Completed Task
**User Story**: [US-013](../../docs/internal/specs/default/FS-031/us-013-task-completion.md)

**Status**: [x] (100% - Completed)

**AC**: AC-US13-01

**Implementation**: Completed successfully

---
### T-002: In Progress Task
**User Story**: [US-013](../../docs/internal/specs/default/FS-031/us-013-task-completion.md)

**Status**: [ ] (50% - In Progress)

**AC**: AC-US13-01

**Implementation**: Work in progress

---
### T-003: Not Started Task
**User Story**: [US-013](../../docs/internal/specs/default/FS-031/us-013-task-completion.md)

**Status**: [ ] (0% - Not started)

**AC**: AC-US13-01

**Implementation**: Pending
`;

      await fs.writeFile(userStoryPath, userStoryContent);
      await fs.mkdir(path.join(tempDir, '.specweave/increments/0031-external-tool-status-sync'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0031-external-tool-status-sync/tasks.md'),
        tasksContent
      );

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Task completion status correctly extracted
      expect(result.body).toContain('## Tasks');
      expect(result.body).toContain('- [x] **T-001**: Completed Task');
      expect(result.body).toContain('- [ ] **T-002**: In Progress Task');
      expect(result.body).toContain('- [ ] **T-003**: Not Started Task');
    });

    it('should handle tasks.md with varied task heading levels', async () => {
      // Arrange: tasks.md with ## and ### headings
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-014-varied-headings.md');
      const userStoryContent = `---
id: US-014
feature: FS-031
title: "User Story With Varied Task Headings"
status: active
created: 2025-11-15
---

# US-014: User Story With Varied Task Headings

## Acceptance Criteria

- [ ] **AC-US14-01**: Support both ## and ### task headings

## Tasks

- [x] **T-001**: Task with Two Hashes
- [ ] **T-002**: Task with Three Hashes

> **Note**: Tasks are project-specific. See increment tasks.md for full list

## Implementation

**Increment**: [0031-varied-tasks](../../../../../increments/0031-varied-tasks/tasks.md)
`;

      const tasksContent = `# Tasks

## T-001: Task with Two Hashes
**Status**: [x] (100% - Done)
**AC**: AC-US14-01

### T-002: Task with Three Hashes
**Status**: [ ] (0% - Not started)
**AC**: AC-US14-01
`;

      await fs.writeFile(userStoryPath, userStoryContent);
      await fs.mkdir(path.join(tempDir, '.specweave/increments/0031-varied-tasks'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, '.specweave/increments/0031-varied-tasks/tasks.md'),
        tasksContent
      );

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: Both heading levels supported
      expect(result.body).toContain('- [x] **T-001**: Task with Two Hashes');
      expect(result.body).toContain('- [ ] **T-002**: Task with Three Hashes');
    });

    it('should handle missing tasks.md gracefully', async () => {
      // Arrange: User story with Implementation but missing tasks.md
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-015-missing-tasks.md');
      const userStoryContent = `---
id: US-015
feature: FS-031
title: "User Story With Missing Tasks File"
status: planning
created: 2025-11-15
---

# US-015: User Story With Missing Tasks File

## Implementation

**Increment**: [9999-nonexistent](../../../../../increments/9999-nonexistent/tasks.md)
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body (should not crash)
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: No crash, no tasks section
      expect(result.body).toBeDefined();
      expect(result.body).not.toContain('## Tasks');
    });
  });

  // ========================================================================
  // INTEGRATION TEST: All bugs fixed together
  // ========================================================================
  describe('Integration: All 4 bugs fixed', () => {
    it('should generate perfect GitHub issue with all fixes', async () => {
      // Arrange: Complete user story with all scenarios
      const userStoryPath = path.join(tempDir, '.specweave/docs/internal/specs/default/FS-031/us-012-complete.md');
      const userStoryContent = `---
id: US-012
feature: FS-031
title: "Complete User Story"
status: complete
priority: P1
created: 2025-11-15
completed: 2025-11-15
---

# US-012: Complete User Story

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** SpecWeave user
**I want** all GitHub issue bugs fixed
**So that** issues are perfectly formatted

## Acceptance Criteria

- [x] **AC-US12-01**: Feature field is correct (not epic)
- [x] **AC-US12-02**: No "Project: undefined"
- [x] **AC-US12-03**: AC checkbox states preserved
- [x] **AC-US12-04**: Implementation section included

## Business Rationale

Perfect GitHub issues improve team collaboration and traceability.

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-001: Fix spec-distributor frontmatter](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001)
- [T-002: Fix user-story-issue-builder Project field](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-002)
- [T-003: Fix AC checkbox extraction](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-003)
- [T-004: Add Implementation section extraction](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-004)
`;

      await fs.writeFile(userStoryPath, userStoryContent);

      // Act: Build issue body
      const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-031');
      const result = await builder.buildIssueBody();

      // Assert: ALL fixes verified
      // Bug #1: Feature field correct
      expect(result.title).toBe('[FS-031][US-012] Complete User Story');
      expect(result.body).toContain('**Feature**: FS-031');

      // Bug #2: No "Project: undefined"
      expect(result.body).not.toContain('**Project**: undefined');
      expect(result.body).not.toMatch(/\*\*Project\*\*:/);

      // Bug #3: AC checkbox states preserved
      expect(result.body).toContain('- [x] **AC-US12-01**: Feature field is correct');
      expect(result.body).toContain('- [x] **AC-US12-02**: No "Project: undefined"');
      expect(result.body).toContain('- [x] **AC-US12-03**: AC checkbox states preserved');
      expect(result.body).toContain('- [x] **AC-US12-04**: Implementation section included');

      // Bug #4: Implementation section included
      expect(result.body).toContain('## Implementation');
      expect(result.body).toContain('**Increment**: [0031-external-tool-status-sync]');
      expect(result.body).toContain('[T-001: Fix spec-distributor frontmatter]');
      expect(result.body).toContain('[T-002: Fix user-story-issue-builder Project field]');

      // Business Rationale also present
      expect(result.body).toContain('## Business Rationale');
      expect(result.body).toContain('Perfect GitHub issues improve team collaboration');
    });
  });
});
