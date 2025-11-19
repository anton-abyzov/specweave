/**
 * Unit Tests: User Story Progress Tracking
 *
 * Tests per-US and aggregate progress calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateUSProgress,
  calculateAggregateProgress,
  formatUSProgress,
  formatAggregateProgress,
  getProgressBar,
  getProgressColor,
  sortUSByCompletion,
  sortUSByID,
  type USProgress,
  type AggregateProgress,
} from '../../../src/progress/us-progress-tracker.js';
import type { Task, TasksByUserStory } from '../../../src/generators/spec/task-parser.js';

describe('US Progress Tracker', () => {
  describe('calculateUSProgress', () => {
    it('should calculate US completion percentage', () => {
      const tasks: Task[] = [
        { id: 'T-001', title: 'Task 1', status: 'completed', userStory: 'US-001' },
        { id: 'T-002', title: 'Task 2', status: 'completed', userStory: 'US-001' },
        { id: 'T-003', title: 'Task 3', status: 'completed', userStory: 'US-001' },
        { id: 'T-004', title: 'Task 4', status: 'completed', userStory: 'US-001' },
        { id: 'T-005', title: 'Task 5', status: 'completed', userStory: 'US-001' },
        { id: 'T-006', title: 'Task 6', status: 'completed', userStory: 'US-001' },
        { id: 'T-007', title: 'Task 7', status: 'completed', userStory: 'US-001' },
        { id: 'T-008', title: 'Task 8', status: 'completed', userStory: 'US-001' },
        { id: 'T-009', title: 'Task 9', status: 'pending', userStory: 'US-001' },
        { id: 'T-010', title: 'Task 10', status: 'pending', userStory: 'US-001' },
        { id: 'T-011', title: 'Task 11', status: 'pending', userStory: 'US-001' },
      ];

      const progress = calculateUSProgress('US-001', tasks);

      expect(progress.usId).toBe('US-001');
      expect(progress.totalTasks).toBe(11);
      expect(progress.completedTasks).toBe(8);
      expect(progress.pendingTasks).toBe(3);
      expect(progress.percentage).toBe(73); // 8/11 ≈ 72.7% → rounds to 73%
    });

    it('should handle US with no tasks', () => {
      const tasks: Task[] = [];
      const progress = calculateUSProgress('US-003', tasks);

      expect(progress.usId).toBe('US-003');
      expect(progress.totalTasks).toBe(0);
      expect(progress.completedTasks).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should handle US with 100% completion', () => {
      const tasks: Task[] = [
        { id: 'T-001', title: 'Task 1', status: 'completed', userStory: 'US-002' },
        { id: 'T-002', title: 'Task 2', status: 'completed', userStory: 'US-002' },
        { id: 'T-003', title: 'Task 3', status: 'completed', userStory: 'US-002' },
      ];

      const progress = calculateUSProgress('US-002', tasks);

      expect(progress.percentage).toBe(100);
      expect(progress.completedTasks).toBe(3);
      expect(progress.totalTasks).toBe(3);
    });

    it('should count in_progress tasks separately', () => {
      const tasks: Task[] = [
        { id: 'T-001', title: 'Task 1', status: 'completed', userStory: 'US-001' },
        { id: 'T-002', title: 'Task 2', status: 'in_progress', userStory: 'US-001' },
        { id: 'T-003', title: 'Task 3', status: 'in_progress', userStory: 'US-001' },
        { id: 'T-004', title: 'Task 4', status: 'pending', userStory: 'US-001' },
      ];

      const progress = calculateUSProgress('US-001', tasks);

      expect(progress.completedTasks).toBe(1);
      expect(progress.inProgressTasks).toBe(2);
      expect(progress.pendingTasks).toBe(1);
      expect(progress.percentage).toBe(25); // Only completed count toward percentage
    });
  });

  describe('calculateAggregateProgress', () => {
    it('should aggregate progress from multiple USs', () => {
      const tasksByUS: TasksByUserStory = {
        'US-001': [
          { id: 'T-001', title: 'Task 1', status: 'completed', userStory: 'US-001' },
          { id: 'T-002', title: 'Task 2', status: 'completed', userStory: 'US-001' },
          { id: 'T-003', title: 'Task 3', status: 'pending', userStory: 'US-001' },
        ],
        'US-002': [
          { id: 'T-004', title: 'Task 4', status: 'completed', userStory: 'US-002' },
        ],
        'US-003': [
          { id: 'T-005', title: 'Task 5', status: 'pending', userStory: 'US-003' },
          { id: 'T-006', title: 'Task 6', status: 'pending', userStory: 'US-003' },
        ],
      };

      const aggregate = calculateAggregateProgress(tasksByUS);

      expect(aggregate.totalTasks).toBe(6);
      expect(aggregate.completedTasks).toBe(3);
      expect(aggregate.pendingTasks).toBe(3);
      expect(aggregate.percentage).toBe(50); // 3/6 = 50%
      expect(aggregate.byUserStory.size).toBe(3);
    });

    it('should handle orphan tasks without userStory', () => {
      const tasksByUS: TasksByUserStory = {
        'US-001': [
          { id: 'T-001', title: 'Task 1', status: 'completed', userStory: 'US-001' },
        ],
        'orphan': [
          { id: 'T-002', title: 'Orphan task 1', status: 'completed' },
          { id: 'T-003', title: 'Orphan task 2', status: 'pending' },
        ],
      };

      const aggregate = calculateAggregateProgress(tasksByUS);

      expect(aggregate.totalTasks).toBe(3); // 1 US task + 2 orphans
      expect(aggregate.completedTasks).toBe(2);
      expect(aggregate.orphanTasks.length).toBe(2);
    });

    it('should calculate correct overall percentage', () => {
      const tasksByUS: TasksByUserStory = {
        'US-001': Array.from({ length: 10 }, (_, i) => ({
          id: `T-${i + 1}`,
          title: `Task ${i + 1}`,
          status: i < 8 ? 'completed' : 'pending',
          userStory: 'US-001',
        })) as Task[],
        'US-002': Array.from({ length: 10 }, (_, i) => ({
          id: `T-${i + 11}`,
          title: `Task ${i + 11}`,
          status: i < 10 ? 'completed' : 'pending',
          userStory: 'US-002',
        })) as Task[],
        'US-003': Array.from({ length: 10 }, (_, i) => ({
          id: `T-${i + 21}`,
          title: `Task ${i + 21}`,
          status: i < 5 ? 'completed' : 'pending',
          userStory: 'US-003',
        })) as Task[],
      };

      const aggregate = calculateAggregateProgress(tasksByUS);

      // Total: 30 tasks, completed: 8 + 10 + 5 = 23
      expect(aggregate.totalTasks).toBe(30);
      expect(aggregate.completedTasks).toBe(23);
      expect(aggregate.percentage).toBe(77); // 23/30 ≈ 76.67% → rounds to 77%
    });
  });

  describe('formatUSProgress', () => {
    it('should format US progress with percentage', () => {
      const progress: USProgress = {
        usId: 'US-001',
        totalTasks: 11,
        completedTasks: 8,
        inProgressTasks: 1,
        pendingTasks: 2,
        percentage: 73,
        tasks: [],
      };

      const formatted = formatUSProgress(progress, true);

      expect(formatted).toBe('US-001: 8/11 tasks (73%)');
    });

    it('should format US progress without percentage', () => {
      const progress: USProgress = {
        usId: 'US-002',
        totalTasks: 3,
        completedTasks: 3,
        inProgressTasks: 0,
        pendingTasks: 0,
        percentage: 100,
        tasks: [],
      };

      const formatted = formatUSProgress(progress, false);

      expect(formatted).toBe('US-002: 3/3 tasks');
    });
  });

  describe('formatAggregateProgress', () => {
    it('should format aggregate progress', () => {
      const aggregate: AggregateProgress = {
        totalTasks: 18,
        completedTasks: 13,
        inProgressTasks: 2,
        pendingTasks: 3,
        percentage: 72,
        byUserStory: new Map(),
        orphanTasks: [],
      };

      const formatted = formatAggregateProgress(aggregate);

      expect(formatted).toBe('Overall: 13/18 tasks (72%)');
    });
  });

  describe('getProgressBar', () => {
    it('should generate progress bar for 73%', () => {
      const bar = getProgressBar(73, 20);

      expect(bar).toHaveLength(20);
      expect(bar).toMatch(/^█+░+$/); // Filled then empty
      expect(bar.match(/█/g)?.length).toBe(15); // 73% of 20 ≈ 14.6 → rounds to 15
    });

    it('should generate progress bar for 0%', () => {
      const bar = getProgressBar(0, 10);

      expect(bar).toBe('░░░░░░░░░░');
    });

    it('should generate progress bar for 100%', () => {
      const bar = getProgressBar(100, 10);

      expect(bar).toBe('██████████');
    });

    it('should respect custom width', () => {
      const bar = getProgressBar(50, 30);

      expect(bar).toHaveLength(30);
      expect(bar.match(/█/g)?.length).toBe(15); // 50% of 30
    });
  });

  describe('getProgressColor', () => {
    it('should return green for >= 80%', () => {
      expect(getProgressColor(80)).toBe('green');
      expect(getProgressColor(90)).toBe('green');
      expect(getProgressColor(100)).toBe('green');
    });

    it('should return yellow for 50-79%', () => {
      expect(getProgressColor(50)).toBe('yellow');
      expect(getProgressColor(65)).toBe('yellow');
      expect(getProgressColor(79)).toBe('yellow');
    });

    it('should return red for < 50%', () => {
      expect(getProgressColor(0)).toBe('red');
      expect(getProgressColor(25)).toBe('red');
      expect(getProgressColor(49)).toBe('red');
    });
  });

  describe('sortUSByCompletion', () => {
    it('should sort USs by completion percentage descending', () => {
      const progressMap = new Map<string, USProgress>([
        [
          'US-001',
          {
            usId: 'US-001',
            totalTasks: 10,
            completedTasks: 5,
            inProgressTasks: 0,
            pendingTasks: 5,
            percentage: 50,
            tasks: [],
          },
        ],
        [
          'US-002',
          {
            usId: 'US-002',
            totalTasks: 5,
            completedTasks: 5,
            inProgressTasks: 0,
            pendingTasks: 0,
            percentage: 100,
            tasks: [],
          },
        ],
        [
          'US-003',
          {
            usId: 'US-003',
            totalTasks: 10,
            completedTasks: 7,
            inProgressTasks: 0,
            pendingTasks: 3,
            percentage: 70,
            tasks: [],
          },
        ],
      ]);

      const sorted = sortUSByCompletion(progressMap);

      expect(sorted.map((p) => p.usId)).toEqual(['US-002', 'US-003', 'US-001']);
      expect(sorted.map((p) => p.percentage)).toEqual([100, 70, 50]);
    });
  });

  describe('sortUSByID', () => {
    it('should sort USs by ID ascending', () => {
      const progressMap = new Map<string, USProgress>([
        [
          'US-003',
          {
            usId: 'US-003',
            totalTasks: 10,
            completedTasks: 7,
            inProgressTasks: 0,
            pendingTasks: 3,
            percentage: 70,
            tasks: [],
          },
        ],
        [
          'US-001',
          {
            usId: 'US-001',
            totalTasks: 10,
            completedTasks: 5,
            inProgressTasks: 0,
            pendingTasks: 5,
            percentage: 50,
            tasks: [],
          },
        ],
        [
          'US-002',
          {
            usId: 'US-002',
            totalTasks: 5,
            completedTasks: 5,
            inProgressTasks: 0,
            pendingTasks: 0,
            percentage: 100,
            tasks: [],
          },
        ],
      ]);

      const sorted = sortUSByID(progressMap);

      expect(sorted.map((p) => p.usId)).toEqual(['US-001', 'US-002', 'US-003']);
    });
  });
});
