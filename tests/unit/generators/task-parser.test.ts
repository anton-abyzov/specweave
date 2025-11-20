/**
 * Unit tests for Task Parser with E Suffix Support (T-029)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseTasksWithUSLinks } from '../../../src/generators/spec/task-parser.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Task Parser - E Suffix Support (T-029)', () => {
  let testDir: string;
  let tasksPath: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `task-parser-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    tasksPath = path.join(testDir, 'tasks.md');
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.removeSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('TC-082: Parse task ID with E suffix', () => {
    it('should parse external task with E suffix', () => {
      const tasksContent = `
# Tasks

## User Story: US-001E - External Feature

### T-001E: External task implementation

**User Story**: US-001E
**Satisfies ACs**: AC-US1E-01, AC-US1E-02
**Status**: [ ] pending
**Priority**: P0 (Critical)
**Estimated Effort**: 4 hours

**Description**: Implementation of external task.
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks['US-001E']).toBeDefined();
      expect(tasks['US-001E']).toHaveLength(1);

      const task = tasks['US-001E'][0];
      expect(task.id).toBe('T-001E');
      expect(task.title).toBe('External task implementation');
      expect(task.userStory).toBe('US-001E');
      expect(task.satisfiesACs).toEqual(['AC-US1E-01', 'AC-US1E-02']);
      expect(task.status).toBe('pending');
    });

    it('should parse completed external task', () => {
      const tasksContent = `
### T-005E: Completed external task

**User Story**: US-002E
**Satisfies ACs**: AC-US2E-01
**Status**: [x] completed
**Priority**: P1 (Important)
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      const task = tasks['US-002E'][0];
      expect(task.id).toBe('T-005E');
      expect(task.status).toBe('completed');
      expect(task.userStory).toBe('US-002E');
      expect(task.satisfiesACs).toEqual(['AC-US2E-01']);
    });

    it('should parse external task with multiple ACs', () => {
      const tasksContent = `
### T-010E: Multi-AC external task

**User Story**: US-003E
**Satisfies ACs**: AC-US3E-01, AC-US3E-02, AC-US3E-03, AC-US3E-04
**Status**: [ ] pending
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      const task = tasks['US-003E'][0];
      expect(task.satisfiesACs).toHaveLength(4);
      expect(task.satisfiesACs).toEqual([
        'AC-US3E-01',
        'AC-US3E-02',
        'AC-US3E-03',
        'AC-US3E-04'
      ]);
    });
  });

  describe('TC-083: Parse mixed internal/external tasks', () => {
    it('should parse both internal and external tasks in same file', () => {
      const tasksContent = `
# Tasks

## User Story: US-001 - Internal Feature

### T-001: Internal task

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P0 (Critical)

### T-002E: External task for internal US

**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [ ] pending
**Priority**: P1 (Important)

## User Story: US-002E - External Feature

### T-003: Internal task for external US

**User Story**: US-002E
**Satisfies ACs**: AC-US2E-01
**Status**: [ ] pending
**Priority**: P1 (Important)

### T-004E: External task for external US

**User Story**: US-002E
**Satisfies ACs**: AC-US2E-02, AC-US2E-03
**Status**: [x] completed
**Priority**: P0 (Critical)
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      // US-001 (internal) has 2 tasks: T-001 (internal), T-002E (external)
      expect(tasks['US-001']).toHaveLength(2);
      expect(tasks['US-001'][0].id).toBe('T-001');
      expect(tasks['US-001'][0].status).toBe('completed');
      expect(tasks['US-001'][1].id).toBe('T-002E');
      expect(tasks['US-001'][1].status).toBe('pending');

      // US-002E (external) has 2 tasks: T-003 (internal), T-004E (external)
      expect(tasks['US-002E']).toHaveLength(2);
      expect(tasks['US-002E'][0].id).toBe('T-003');
      expect(tasks['US-002E'][0].status).toBe('pending');
      expect(tasks['US-002E'][1].id).toBe('T-004E');
      expect(tasks['US-002E'][1].status).toBe('completed');
    });

    it('should correctly map ACs with E suffix to tasks', () => {
      const tasksContent = `
### T-001: Internal task

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed

### T-002E: External task

**User Story**: US-001E
**Satisfies ACs**: AC-US1E-01, AC-US1E-02
**Status**: [ ] pending

### T-003: Another internal task

**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [ ] pending

### T-004E: Another external task

**User Story**: US-002E
**Satisfies ACs**: AC-US2E-01
**Status**: [x] completed
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks['US-001'][0].satisfiesACs).toEqual(['AC-US1-01']);
      expect(tasks['US-001E'][0].satisfiesACs).toEqual(['AC-US1E-01', 'AC-US1E-02']);
      expect(tasks['US-002'][0].satisfiesACs).toEqual(['AC-US2-01', 'AC-US2-02']);
      expect(tasks['US-002E'][0].satisfiesACs).toEqual(['AC-US2E-01']);
    });

    it('should handle unordered task IDs', () => {
      const tasksContent = `
### T-005: Task 5

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002E: Task 2E

**User Story**: US-001E
**Satisfies ACs**: AC-US1E-01
**Status**: [ ] pending

### T-010: Task 10

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

### T-003E: Task 3E

**User Story**: US-001E
**Satisfies ACs**: AC-US1E-02
**Status**: [x] completed
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks['US-001'][0].id).toBe('T-005');
      expect(tasks['US-001E']).toHaveLength(2);
      expect(tasks['US-001E'][0].id).toBe('T-002E');
      expect(tasks['US-001E'][1].id).toBe('T-003E');
      expect(tasks['US-002'][0].id).toBe('T-010');
    });
  });

  describe('Backward Compatibility', () => {
    it('should still parse tasks without E suffix (internal only)', () => {
      const tasksContent = `
### T-001: Internal task 1

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

### T-002: Internal task 2

**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [ ] pending

### T-003: Internal task 3

**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [ ] pending
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks['US-001']).toHaveLength(2);
      expect(tasks['US-001'][0].id).toBe('T-001');
      expect(tasks['US-001'][1].id).toBe('T-002');
      expect(tasks['US-002']).toHaveLength(1);
      expect(tasks['US-002'][0].id).toBe('T-003');
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with no US linkage (backward compat)', () => {
      const tasksContent = `
### T-001: Old format task

**Status**: [ ] pending
**Priority**: P0

**Description**: Task without US linkage.
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      // Task without userStory gets grouped under 'unassigned'
      expect(tasks['unassigned']).toBeDefined();
      expect(tasks['unassigned'][0].id).toBe('T-001');
      expect(tasks['unassigned'][0].userStory).toBeUndefined();
    });

    it('should handle empty tasks file', () => {
      fs.writeFileSync(tasksPath, '', 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks).toEqual({});
    });

    it('should handle mixed three-digit numbers', () => {
      const tasksContent = `
### T-010: Task 10

**User Story**: US-010
**Satisfies ACs**: AC-US10-01
**Status**: [ ] pending

### T-010E: Task 10E

**User Story**: US-010E
**Satisfies ACs**: AC-US10E-01
**Status**: [ ] pending

### T-123: Task 123

**User Story**: US-123
**Satisfies ACs**: AC-US123-01
**Status**: [x] completed

### T-456E: Task 456E

**User Story**: US-456E
**Satisfies ACs**: AC-US456E-01
**Status**: [x] completed
`;

      fs.writeFileSync(tasksPath, tasksContent, 'utf-8');
      const tasks = parseTasksWithUSLinks(tasksPath);

      expect(tasks['US-010'][0].id).toBe('T-010');
      expect(tasks['US-010E'][0].id).toBe('T-010E');
      expect(tasks['US-123'][0].id).toBe('T-123');
      expect(tasks['US-456E'][0].id).toBe('T-456E');
    });
  });
});
