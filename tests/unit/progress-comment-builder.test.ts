/**
 * Unit Tests: Progress Comment Builder
 *
 * Tests the ProgressCommentBuilder module for generating
 * GitHub progress comments with AC/task checkboxes.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ProgressCommentBuilder } from '../../plugins/specweave-github/lib/progress-comment-builder';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('ProgressCommentBuilder', () => {
  let tempDir: string;
  let userStoryPath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'progress-comment-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('buildProgressComment', () => {
    it('should build progress comment with completed and remaining ACs', async () => {
      // Arrange: Create test user story file
      const userStoryContent = `---
id: US-002
epic: FS-031
title: "Task-Level Mapping & Traceability"
status: active
created: 2025-11-15
---

# US-002: Task-Level Mapping & Traceability

**As a** developer or PM
**I want** to see which tasks implement which user stories
**So that** I can track progress and understand implementation history

## Acceptance Criteria

- [x] **AC-US2-01**: Spec frontmatter includes linked_increments mapping (P1, testable)
- [x] **AC-US2-02**: User stories map to specific tasks (P1, testable)
- [ ] **AC-US2-03**: Tasks include GitHub/JIRA/ADO issue numbers (P2, testable)
- [ ] **AC-US2-04**: Can query implementation history (P3, testable)
`;

      userStoryPath = path.join(tempDir, 'us-002-task-mapping.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031-external-tool-status-sync');

      // Assert
      expect(comment).toContain('📊 **Progress Update from Increment 0031-external-tool-status-sync**');
      expect(comment).toContain('Core Complete'); // P1 criteria done
      expect(comment).toContain('2/4 AC implemented - 50%');

      // Completed criteria
      expect(comment).toContain('## ✅ Completed Acceptance Criteria');
      expect(comment).toContain('- [x] **AC-US2-01**');
      expect(comment).toContain('- [x] **AC-US2-02**');

      // Remaining criteria
      expect(comment).toContain('## ⏳ Remaining Work (P2-P3)');
      expect(comment).toContain('- [ ] **AC-US2-03**');
      expect(comment).toContain('- [ ] **AC-US2-04**');

      // Footer
      expect(comment).toContain('🤖 Auto-synced by SpecWeave');
    });

    it('should show 100% when all ACs completed', async () => {
      // Arrange: User story with all ACs completed
      const userStoryContent = `---
id: US-001
epic: FS-031
title: "Rich External Issue Content"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-001: Rich External Issue Content

## Acceptance Criteria

- [x] **AC-US1-01**: External issues show executive summary (P1, testable)
- [x] **AC-US1-02**: External issues show all user stories (P1, testable)
`;

      userStoryPath = path.join(tempDir, 'us-001-complete.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031');

      // Assert
      expect(comment).toContain('Complete (2/2 AC implemented - 100%)');
      expect(comment).toContain('## ✅ Completed Acceptance Criteria');
      expect(comment).not.toContain('## ⏳ Remaining Work');
    });

    it('should prioritize P1 criteria separately from P2/P3', async () => {
      // Arrange: User story with mixed priority ACs
      const userStoryContent = `---
id: US-003
epic: FS-031
title: "Status Mapping Configuration"
status: active
created: 2025-11-15
---

# US-003: Status Mapping Configuration

## Acceptance Criteria

- [x] **AC-US3-01**: Config schema supports status mappings (P1, testable)
- [ ] **AC-US3-02**: Default mappings provided (P1, testable)
- [ ] **AC-US3-03**: Users can customize mappings (P2, testable)
- [ ] **AC-US3-04**: Validation prevents invalid mappings (P3, testable)
`;

      userStoryPath = path.join(tempDir, 'us-003-priority.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031');

      // Assert
      // Should show P1 remaining work separately
      expect(comment).toContain('## 🔴 Remaining Work (P1 - Critical)');
      expect(comment).toContain('- [ ] **AC-US3-02**');

      // P2/P3 in separate section
      expect(comment).toContain('## ⏳ Remaining Work (P2-P3)');
      expect(comment).toContain('- [ ] **AC-US3-03**');
      expect(comment).toContain('- [ ] **AC-US3-04**');
    });
  });

  describe('calculateProgressSummary', () => {
    it('should correctly calculate progress percentage', async () => {
      // Arrange
      const userStoryContent = `---
id: US-004
epic: FS-031
title: "Test Progress"
status: active
created: 2025-11-15
---

# US-004: Test Progress

## Acceptance Criteria

- [x] **AC-US4-01**: First criterion (P1, testable)
- [x] **AC-US4-02**: Second criterion (P1, testable)
- [x] **AC-US4-03**: Third criterion (P1, testable)
- [ ] **AC-US4-04**: Fourth criterion (P2, testable)
- [ ] **AC-US4-05**: Fifth criterion (P2, testable)
`;

      userStoryPath = path.join(tempDir, 'us-004-progress.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const summary = await builder.calculateProgressSummary();

      // Assert
      expect(summary.totalACs).toBe(5);
      expect(summary.completedACs).toBe(3);
      expect(summary.percentage).toBe(60);
      expect(summary.statusSummary).toBe('Core Complete'); // All P1 done
      expect(summary.completedCriteria.length).toBe(3);
      expect(summary.remainingCriteria.length).toBe(2);
    });

    it('should return "In Progress" when no P1 criteria completed', async () => {
      // Arrange
      const userStoryContent = `---
id: US-005
epic: FS-031
title: "Just Started"
status: active
created: 2025-11-15
---

# US-005: Just Started

## Acceptance Criteria

- [ ] **AC-US5-01**: First criterion (P1, testable)
- [ ] **AC-US5-02**: Second criterion (P2, testable)
`;

      userStoryPath = path.join(tempDir, 'us-005-started.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const summary = await builder.calculateProgressSummary();

      // Assert
      expect(summary.statusSummary).toBe('In Progress');
      expect(summary.percentage).toBe(0);
    });
  });

  describe('calculateProgressPercentage', () => {
    it('should return correct percentage', async () => {
      // Arrange
      const userStoryContent = `---
id: US-006
epic: FS-031
title: "Percentage Test"
status: active
created: 2025-11-15
---

# US-006: Percentage Test

## Acceptance Criteria

- [x] **AC-US6-01**: Done (P1, testable)
- [ ] **AC-US6-02**: Not done (P1, testable)
`;

      userStoryPath = path.join(tempDir, 'us-006-percentage.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const percentage = await builder.calculateProgressPercentage();

      // Assert
      expect(percentage).toBe(50);
    });
  });

  describe('task extraction', () => {
    it('should extract tasks from user story with increment link', async () => {
      // Arrange: User story with tasks
      const userStoryContent = `---
id: US-007
epic: FS-031
title: "Task Test"
status: active
created: 2025-11-15
---

# US-007: Task Test

## Acceptance Criteria

- [x] **AC-US7-01**: First AC (P1, testable)
- [ ] **AC-US7-02**: Second AC (P2, testable)

## Implementation

**Increment**: [0031-test-tasks](../../increments/0031-test-tasks)

Tasks:
- [T-001: Implement feature A](../../increments/0031-test-tasks/tasks.md#t-001)
- [T-002: Add tests](../../increments/0031-test-tasks/tasks.md#t-002)
- [T-003: Update docs](../../increments/0031-test-tasks/tasks.md#t-003)
`;

      const tasksContent = `# Tasks for Increment 0031-test-tasks

### T-001: Implement feature A

**Status**: [x] (100% - Completed)

### T-002: Add tests

**Status**: [x] (100% - Completed)

### T-003: Update docs

**Status**: [ ] (0% - Not Started)
`;

      // Create increment directory and tasks.md
      const incrementDir = path.join(tempDir, '.specweave', 'increments', '0031-test-tasks');
      await fs.mkdir(incrementDir, { recursive: true });
      await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

      userStoryPath = path.join(tempDir, 'us-007-with-tasks.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031-test-tasks');

      // Assert
      expect(comment).toContain('## 📋 Implementation Tasks (2/3)');
      expect(comment).toContain('- [x] T-001: Implement feature A');
      expect(comment).toContain('- [x] T-002: Add tests');
      expect(comment).toContain('- [ ] T-003: Update docs');
    });

    it('should handle user story without increment link', async () => {
      // Arrange: User story without implementation section
      const userStoryContent = `---
id: US-008
epic: FS-031
title: "No Tasks"
status: active
created: 2025-11-15
---

# US-008: No Tasks

## Acceptance Criteria

- [x] **AC-US8-01**: First AC (P1, testable)
`;

      userStoryPath = path.join(tempDir, 'us-008-no-tasks.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031');

      // Assert
      expect(comment).not.toContain('## 📋 Implementation Tasks');
    });

    it('should handle missing tasks.md file gracefully', async () => {
      // Arrange: User story with increment link but missing tasks.md
      const userStoryContent = `---
id: US-009
epic: FS-031
title: "Missing Tasks File"
status: active
created: 2025-11-15
---

# US-009: Missing Tasks File

## Acceptance Criteria

- [x] **AC-US9-01**: First AC (P1, testable)

## Implementation

**Increment**: [0031-missing-tasks](../../increments/0031-missing-tasks)

Tasks:
- [T-001: Some task](../../increments/0031-missing-tasks/tasks.md#t-001)
`;

      userStoryPath = path.join(tempDir, 'us-009-missing-tasks-file.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031-missing-tasks');

      // Assert - Should not throw, just skip tasks section
      expect(comment).not.toContain('## 📋 Implementation Tasks');
      expect(comment).toContain('🤖 Auto-synced by SpecWeave');
    });
  });

  describe('error handling', () => {
    it('should throw error for missing frontmatter', async () => {
      // Arrange: User story without frontmatter
      const userStoryContent = `# US-010: No Frontmatter

This file is missing YAML frontmatter.
`;

      userStoryPath = path.join(tempDir, 'us-010-no-frontmatter.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act & Assert
      await expect(builder.buildProgressComment('0031')).rejects.toThrow('missing YAML frontmatter');
    });

    it('should handle user story with no ACs gracefully', async () => {
      // Arrange: User story without ACs
      const userStoryContent = `---
id: US-011
epic: FS-031
title: "No ACs"
status: planning
created: 2025-11-15
---

# US-011: No ACs

This user story has no acceptance criteria yet.
`;

      userStoryPath = path.join(tempDir, 'us-011-no-acs.md');
      await fs.writeFile(userStoryPath, userStoryContent);

      const builder = new ProgressCommentBuilder(userStoryPath, tempDir);

      // Act
      const comment = await builder.buildProgressComment('0031');

      // Assert
      expect(comment).toContain('0/0 AC');
      expect(comment).toContain('In Progress');
      expect(comment).toContain('🤖 Auto-synced by SpecWeave');
    });
  });
});
