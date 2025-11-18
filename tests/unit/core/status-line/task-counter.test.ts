/**
 * TaskCounter Unit Tests
 *
 * Tests for the task counting utility that fixes the overcounting bug.
 *
 * Critical test cases:
 * 1. Tasks with single completion marker - count once
 * 2. Tasks with multiple completion markers - count once (NOT multiple times)
 * 3. Tasks with no completion marker - count as incomplete
 * 4. Mixed task formats - handle all correctly
 * 5. Edge cases - empty file, no tasks, all completed
 */

import { describe, it, expect } from 'vitest';
import { TaskCounter } from '../../../../src/core/status-line/task-counter.js';

describe('TaskCounter', () => {
  describe('countTasks', () => {
    it('counts tasks with single completion marker correctly', () => {
      const content = `
## T-001: Task One
**Completed**: 2025-11-17

## T-002: Task Two
Still working on this
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('does NOT overcount tasks with multiple completion markers (BUG FIX)', () => {
      const content = `
## T-001: Task with multiple markers
[x] Checkbox marker
**Status**: [x]
**Completed**: 2025-11-17

This task has 3 different completion markers but should be counted ONCE.
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(1);
      expect(result.completed).toBe(1); // NOT 3!
      expect(result.percentage).toBe(100);
    });

    it('handles legacy checkbox format ([x] at line start)', () => {
      const content = `
## T-001: Legacy checkbox task
[x] This is completed

## T-002: Not completed
[ ] This is not completed
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles legacy inline status format (**Status**: [x])', () => {
      const content = `
## T-001: Legacy inline task
**Status**: [x]

## T-002: Not completed
**Status**: [ ]
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles current date format (**Completed**: <date>)', () => {
      const content = `
## T-001: Current format task
**Completed**: 2025-11-17

## T-002: Not completed
**Status**: pending
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles mixed completion marker formats', () => {
      const content = `
## T-001: Checkbox format
[x] Done

## T-002: Inline format
**Status**: [x]

## T-003: Date format
**Completed**: 2025-11-17

## T-004: Not completed
Working on it
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(4);
      expect(result.completed).toBe(3);
      expect(result.percentage).toBe(75);
    });

    it('handles empty file', () => {
      const content = '';

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('handles file with no tasks', () => {
      const content = `
# Some Title

This is a document with no tasks.

## Regular heading (not a task)
Just some content
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('handles all tasks completed', () => {
      const content = `
## T-001: Task One
**Completed**: 2025-11-17

## T-002: Task Two
**Completed**: 2025-11-17
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.percentage).toBe(100);
    });

    it('handles no tasks completed', () => {
      const content = `
## T-001: Task One
Working on it

## T-002: Task Two
Not started
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('handles tasks with triple-hash headings (### T-)', () => {
      const content = `
### T-001: Task with triple hash
**Completed**: 2025-11-17

### T-002: Another task
Still working
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles tasks with mixed heading levels', () => {
      const content = `
## T-001: Double hash task
**Completed**: 2025-11-17

### T-002: Triple hash task
**Completed**: 2025-11-17

## T-003: Not completed
Working
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(3);
      expect(result.completed).toBe(2);
      expect(result.percentage).toBe(66);
    });

    it('handles task IDs with additional text (T-001-something)', () => {
      const content = `
## T-001-setup: Setup task
**Completed**: 2025-11-17

## T-002-implement: Implementation task
Working on it
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles tasks without colons after ID', () => {
      const content = `
## T-001 Task without colon
**Completed**: 2025-11-17

## T-002: Task with colon
Working on it
`;

      const result = TaskCounter.countTasks(content);

      expect(result.total).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('handles real-world increment 0033 scenario (30/23 bug)', () => {
      // This is the actual scenario that caused the 30/23 bug
      // Task has multiple completion markers but should be counted once
      const content = `
## T-001: Task with checkbox
[x] Some checkbox
**Completed**: 2025-11-14

## T-002: Task with status
**Status**: [x]
**Completed**: 2025-11-14

## T-003: Task with all three markers
[x] Checkbox
**Status**: [x]
**Completed**: 2025-11-14

## T-004: Incomplete task
Working on it
`;

      const result = TaskCounter.countTasks(content);

      // Should count 4 tasks total, 3 completed
      // NOT 9 completed (3 tasks × 3 markers each)
      expect(result.total).toBe(4);
      expect(result.completed).toBe(3);
      expect(result.percentage).toBe(75);
    });
  });

  describe('parseTasks', () => {
    it('returns detailed task information', () => {
      const content = `
## T-001: First task
**Completed**: 2025-11-17

## T-002: Second task
Working on it
`;

      const tasks = TaskCounter.parseTasks(content);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('T-001');
      expect(tasks[0].title).toBe('First task');
      expect(tasks[0].completed).toBe(true);
      expect(tasks[1].id).toBe('T-002');
      expect(tasks[1].title).toBe('Second task');
      expect(tasks[1].completed).toBe(false);
    });

    it('extracts task sections correctly', () => {
      const content = `
## T-001: Task One
Content for task one

## T-002: Task Two
Content for task two
`;

      const tasks = TaskCounter.parseTasks(content);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].section).toContain('Task One');
      expect(tasks[0].section).toContain('Content for task one');
      expect(tasks[1].section).toContain('Task Two');
      expect(tasks[1].section).toContain('Content for task two');
    });
  });

  describe('isTaskCompleted', () => {
    it('detects [x] checkbox marker', () => {
      const section = '[x] Task completed';
      expect(TaskCounter.isTaskCompleted(section)).toBe(true);
    });

    it('detects **Status**: [x] marker', () => {
      const section = '**Status**: [x]';
      expect(TaskCounter.isTaskCompleted(section)).toBe(true);
    });

    it('detects **Completed**: <date> marker', () => {
      const section = '**Completed**: 2025-11-17';
      expect(TaskCounter.isTaskCompleted(section)).toBe(true);
    });

    it('returns false for incomplete task', () => {
      const section = '[ ] Task not completed';
      expect(TaskCounter.isTaskCompleted(section)).toBe(false);
    });

    it('returns false for empty section', () => {
      const section = '';
      expect(TaskCounter.isTaskCompleted(section)).toBe(false);
    });

    it('is case-insensitive for Status marker', () => {
      const section1 = '**status**: [x]';
      const section2 = '**STATUS**: [x]';
      expect(TaskCounter.isTaskCompleted(section1)).toBe(true);
      expect(TaskCounter.isTaskCompleted(section2)).toBe(true);
    });

    it('is case-insensitive for Completed marker', () => {
      const section1 = '**completed**: 2025-11-17';
      const section2 = '**COMPLETED**: 2025-11-17';
      expect(TaskCounter.isTaskCompleted(section1)).toBe(true);
      expect(TaskCounter.isTaskCompleted(section2)).toBe(true);
    });
  });
});
