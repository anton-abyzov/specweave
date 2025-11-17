import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for CompletionCalculator
 *
 * Tests the AC/Task verification logic that prevents premature GitHub issue closure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompletionCalculator } from '../../plugins/specweave-github/lib/completion-calculator.js.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CompletionCalculator', () => {
  let tempDir: string;
  let calculator: CompletionCalculator;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), `completion-calculator-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await mkdir(path.join(tempDir, '.specweave/increments/0001-test'), { recursive: true });

    calculator = new CompletionCalculator(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('calculateCompletion', () => {
    it('should mark as complete when all ACs and tasks are [x]', async () => {
      // Arrange: User story with all ACs complete
      const userStoryPath = path.join(tempDir, 'us-001.md');
      await writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-001
title: Test User Story
status: complete
---

## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion

## Implementation

**Increment**: [0001-test](...)
`
      );

      // Arrange: Increment tasks.md with all tasks complete
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      await writeFile(
        tasksPath,
        `### T-001: Implement feature

**Status**: [x]
**AC**: AC-US1-01, AC-US1-02

### T-002: Write tests

**Status**: [x]
**AC**: AC-US1-01
`
      );

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(true);
      expect(result.acsCompleted).toBe(2);
      expect(result.acsTotal).toBe(2);
      expect(result.tasksCompleted).toBe(2);
      expect(result.tasksTotal).toBe(2);
      expect(result.blockingAcs).toHaveLength(0);
      expect(result.blockingTasks).toHaveLength(0);
    });

    it('should mark as incomplete when ACs are not checked', async () => {
      // Arrange: User story with incomplete ACs
      const userStoryPath = path.join(tempDir, 'us-001.md');
      await writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-001
title: Test User Story
status: complete
---

## Acceptance Criteria

- [ ] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
- [ ] **AC-US1-03**: Third criterion

## Implementation

**Increment**: [0001-test](...)
`
      );

      // Arrange: No tasks yet
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      await writeFile(tasksPath, '# Tasks\n\n(No tasks yet)');

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(false);
      expect(result.acsCompleted).toBe(1);
      expect(result.acsTotal).toBe(3);
      expect(result.acsPercentage).toBe(33.33333333333333);
      expect(result.blockingAcs).toEqual(['AC-US1-01', 'AC-US1-03']);
    });

    it('should mark as incomplete when tasks are not complete', async () => {
      // Arrange: User story with all ACs complete
      const userStoryPath = path.join(tempDir, 'us-001.md');
      await writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-001
title: Test User Story
status: complete
---

## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion

## Implementation

**Increment**: [0001-test](...)
`
      );

      // Arrange: Tasks with mix of complete/incomplete
      const tasksPath = path.join(tempDir, '.specweave/increments/0001-test/tasks.md');
      await writeFile(
        tasksPath,
        `### T-001: Implement feature

**Status**: [x]
**AC**: AC-US1-01

### T-002: Write tests

**Status**: [ ]
**AC**: AC-US1-02

### T-003: Documentation

**Status**: [ ]
**AC**: AC-US1-01, AC-US1-02
`
      );

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(false);
      expect(result.acsCompleted).toBe(2);
      expect(result.acsTotal).toBe(2);
      expect(result.tasksCompleted).toBe(1);
      expect(result.tasksTotal).toBe(3);
      expect(result.blockingTasks).toEqual(['T-002', 'T-003']);
    });

    it('should handle user stories without tasks (no implementation yet)', async () => {
      // Arrange: User story without Implementation section
      const userStoryPath = path.join(tempDir, 'us-001.md');
      await writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-001
title: Test User Story
status: planning
---

## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
`
      );

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(true); // No tasks required
      expect(result.acsCompleted).toBe(2);
      expect(result.acsTotal).toBe(2);
      expect(result.tasksCompleted).toBe(0);
      expect(result.tasksTotal).toBe(0);
    });

    it('should handle legacy AC format (AC-001, AC-002)', async () => {
      // Arrange: User story with legacy AC IDs
      const userStoryPath = path.join(tempDir, 'us-003.md');
      await writeFile(
        userStoryPath,
        `---
id: US-003
feature: FS-023
title: DORA Dashboard
status: complete
---

## Acceptance Criteria

- [ ] **AC-020**: Dashboard file exists
- [ ] **AC-021**: Auto-updates after deployment
- [ ] **AC-022**: Shows metrics + trends
`
      );

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(false);
      expect(result.acsCompleted).toBe(0);
      expect(result.acsTotal).toBe(3);
      expect(result.blockingAcs).toEqual(['AC-020', 'AC-021', 'AC-022']);
    });

    it('should require at least 1 AC (no empty user stories)', async () => {
      // Arrange: User story without ACs
      const userStoryPath = path.join(tempDir, 'us-001.md');
      await writeFile(
        userStoryPath,
        `---
id: US-001
feature: FS-001
title: Test User Story
status: complete
---

## User Story

As a user...
`
      );

      // Act
      const result = await calculator.calculateCompletion(userStoryPath);

      // Assert
      expect(result.overallComplete).toBe(false); // No ACs = not complete
      expect(result.acsTotal).toBe(0);
    });
  });

  describe('buildCompletionComment', () => {
    it('should build proper completion comment', () => {
      const completion = {
        acsTotal: 3,
        acsCompleted: 3,
        acsPercentage: 100,
        tasksTotal: 5,
        tasksCompleted: 5,
        tasksPercentage: 100,
        overallComplete: true,
        blockingAcs: [] as string[],
        blockingTasks: [] as string[],
      };

      const comment = calculator.buildCompletionComment(completion);

      expect(comment).toContain('✅ **User Story Verified Complete**');
      expect(comment).toContain('Acceptance Criteria: 3/3 (100%)');
      expect(comment).toContain('Implementation Tasks: 5/5 (100%)');
      expect(comment).toContain('Auto-verified by SpecWeave AC Completion Gate');
    });
  });

  describe('buildProgressComment', () => {
    it('should build proper progress comment with blocking items', () => {
      const completion = {
        acsTotal: 3,
        acsCompleted: 1,
        acsPercentage: 33.33,
        tasksTotal: 5,
        tasksCompleted: 2,
        tasksPercentage: 40,
        overallComplete: false,
        blockingAcs: ['AC-US1-02', 'AC-US1-03'],
        blockingTasks: ['T-003', 'T-004', 'T-005'],
      };

      const comment = calculator.buildProgressComment(completion);

      expect(comment).toContain('📊 **Progress Update**');
      // Use regex to account for emoji icons
      expect(comment).toMatch(/Acceptance Criteria.*1\/3.*33%/);
      expect(comment).toMatch(/Implementation Tasks.*2\/5.*40%/);
      expect(comment).toContain('**Incomplete ACs**:');
      expect(comment).toContain('- [ ] AC-US1-02');
      expect(comment).toContain('- [ ] AC-US1-03');
      expect(comment).toContain('**Incomplete Tasks**:');
      expect(comment).toContain('- [ ] T-003');
    });
  });

  describe('buildReopenComment', () => {
    it('should build proper reopen comment', () => {
      const completion = {
        acsTotal: 3,
        acsCompleted: 0,
        acsPercentage: 0,
        tasksTotal: 0,
        tasksCompleted: 0,
        tasksPercentage: 0,
        overallComplete: false,
        blockingAcs: ['AC-020', 'AC-021', 'AC-022'],
        blockingTasks: [] as string[],
      };

      const comment = calculator.buildReopenComment(
        completion,
        'Issue #574 closed prematurely'
      );

      expect(comment).toContain('🔄 **Reopening Issue - Issue #574 closed prematurely**');
      expect(comment).toContain('Acceptance Criteria: 0/3 (0%)');
      expect(comment).toContain('**Blocking Items** (3):');
      expect(comment).toContain('- [ ] AC-020');
      expect(comment).toContain(
        '⚠️ This issue cannot be closed until all ACs and tasks are verified complete.'
      );
      expect(comment).toContain('Auto-reopened by SpecWeave AC Completion Gate');
    });
  });
});
