import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for IssueStateManager
 *
 * Tests GitHub issue state management:
 * - State determination based on progress
 * - Progress calculation
 * - Label management
 */

import { IssueStateManager } from '../../../plugins/specweave-github/lib/IssueStateManager.js';

describe('IssueStateManager', () => {
  describe('determineState', () => {
    it('should close issue when 100% complete', () => {
      const progress = {
        totalAcs: 3,
        completedAcs: 3,
        acPercentage: 100,
        totalTasks: 5,
        completedTasks: 5,
        taskPercentage: 100,
        overallPercentage: 100,
        isComplete: true
      };

      const result = IssueStateManager.determineState(progress, 'open');

      expect(result.newState).toBe('closed');
      expect(result.changed).toBe(true);
      expect(result.labelsRemoved).toContain('in-progress');
    });

    it('should keep open with in-progress label when partial complete', () => {
      const progress = {
        totalAcs: 3,
        completedAcs: 1,
        acPercentage: 33,
        totalTasks: 5,
        completedTasks: 2,
        taskPercentage: 40,
        overallPercentage: 37,
        isComplete: false
      };

      const result = IssueStateManager.determineState(progress, 'open');

      expect(result.newState).toBe('open');
      expect(result.labelsAdded).toContain('in-progress');
    });

    it('should keep open without in-progress when 0% complete', () => {
      const progress = {
        totalAcs: 3,
        completedAcs: 0,
        acPercentage: 0,
        totalTasks: 5,
        completedTasks: 0,
        taskPercentage: 0,
        overallPercentage: 0,
        isComplete: false
      };

      const result = IssueStateManager.determineState(progress, 'open');

      expect(result.newState).toBe('open');
      expect(result.labelsRemoved).toContain('in-progress');
    });

    it('should reopen closed issue if incomplete', () => {
      const progress = {
        totalAcs: 3,
        completedAcs: 2,
        acPercentage: 67,
        totalTasks: 5,
        completedTasks: 3,
        taskPercentage: 60,
        overallPercentage: 64,
        isComplete: false
      };

      const result = IssueStateManager.determineState(progress, 'closed');

      expect(result.newState).toBe('open');
      expect(result.changed).toBe(true);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress correctly', () => {
      const acs = [
        { completed: true },
        { completed: true },
        { completed: false }
      ];

      const tasks = [
        { completed: true },
        { completed: true },
        { completed: true },
        { completed: false },
        { completed: false }
      ];

      const progress = IssueStateManager.calculateProgress(acs, tasks);

      expect(progress.totalAcs).toBe(3);
      expect(progress.completedAcs).toBe(2);
      expect(progress.acPercentage).toBe(67);
      expect(progress.totalTasks).toBe(5);
      expect(progress.completedTasks).toBe(3);
      expect(progress.taskPercentage).toBe(60);
      expect(progress.overallPercentage).toBe(64); // (67 + 60) / 2
      expect(progress.isComplete).toBe(false);
    });

    it('should handle no tasks scenario', () => {
      const acs = [
        { completed: true },
        { completed: true }
      ];

      const tasks: any[] = [];

      const progress = IssueStateManager.calculateProgress(acs, tasks);

      expect(progress.totalTasks).toBe(0);
      expect(progress.taskPercentage).toBe(0);
      expect(progress.overallPercentage).toBe(100); // Only AC percentage
      expect(progress.isComplete).toBe(true);
    });

    it('should detect completion correctly', () => {
      const acs = [
        { completed: true },
        { completed: true }
      ];

      const tasks = [
        { completed: true },
        { completed: true }
      ];

      const progress = IssueStateManager.calculateProgress(acs, tasks);

      expect(progress.isComplete).toBe(true);
    });
  });

  describe('formatProgressMarkdown', () => {
    it('should format progress as markdown', () => {
      const progress = {
        totalAcs: 3,
        completedAcs: 2,
        acPercentage: 67,
        totalTasks: 5,
        completedTasks: 3,
        taskPercentage: 60,
        overallPercentage: 64,
        isComplete: false
      };

      const markdown = IssueStateManager.formatProgressMarkdown(progress);

      expect(markdown).toContain('## Progress');
      expect(markdown).toContain('2/3 (67%)');
      expect(markdown).toContain('3/5 (60%)');
      expect(markdown).toContain('64%');
    });

    it('should include progress bar', () => {
      const progress = {
        totalAcs: 1,
        completedAcs: 1,
        acPercentage: 100,
        totalTasks: 0,
        completedTasks: 0,
        taskPercentage: 0,
        overallPercentage: 100,
        isComplete: true
      };

      const markdown = IssueStateManager.formatProgressMarkdown(progress);

      expect(markdown).toContain('100%');
      expect(markdown).toMatch(/[█░]/); // Contains progress bar characters
    });
  });

  describe('buildGitHubCommand', () => {
    it('should build close command', () => {
      const command = IssueStateManager.buildGitHubCommand(123, 'closed', [], ['in-progress']);

      expect(command).toContain('gh issue close 123');
      expect(command).toContain('--remove-label "in-progress"');
    });

    it('should build reopen command with labels', () => {
      const command = IssueStateManager.buildGitHubCommand(456, 'open', ['in-progress'], []);

      expect(command).toContain('gh issue reopen 456');
      expect(command).toContain('--add-label "in-progress"');
    });

    it('should handle multiple labels', () => {
      const command = IssueStateManager.buildGitHubCommand(
        789,
        'open',
        ['in-progress', 'blocked'],
        ['completed']
      );

      expect(command).toContain('--add-label "in-progress,blocked"');
      expect(command).toContain('--remove-label "completed"');
    });
  });
});
