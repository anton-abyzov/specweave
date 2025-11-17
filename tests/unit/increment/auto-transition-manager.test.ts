/**
 * Unit tests for AutoTransitionManager - Phase Detection
 *
 * Tests artifact-based phase detection logic:
 * - tasks.md exists → ACTIVE
 * - spec.md/plan.md exists (no tasks) → PLANNING
 * - no artifacts → BACKLOG
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * NOTE: Full end-to-end transition behavior (including MetadataManager integration)
 * is tested in tests/integration/hooks/auto-transition-integration.test.ts
 */

import { AutoTransitionManager } from '../../../src/core/increment/auto-transition-manager';
import { IncrementStatus } from '../../../src/core/types/increment-metadata';
import * as fs from 'fs';

// Mock fs for file existence checks
jest.mock('fs');

describe('AutoTransitionManager - Phase Detection', () => {
  let manager: AutoTransitionManager;
  const projectRoot = process.cwd();  // Use actual project root for tests

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new AutoTransitionManager(projectRoot);
  });

  describe('detectPhase', () => {
    it('should detect ACTIVE when tasks.md exists', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('tasks.md');
      });

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.ACTIVE);
    });

    it('should detect PLANNING when spec.md exists but no tasks.md', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('spec.md') && !filePath.includes('tasks.md');
      });

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.PLANNING);
    });

    it('should detect PLANNING when plan.md exists but no tasks.md', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('plan.md') && !filePath.includes('tasks.md');
      });

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.PLANNING);
    });

    it('should detect BACKLOG when no artifacts exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.BACKLOG);
    });

    it('should prioritize tasks.md over spec.md', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);  // All files exist

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.ACTIVE);  // tasks.md takes precedence
    });

    it('should prioritize tasks.md over plan.md', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('tasks.md') || filePath.includes('plan.md');
      });

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.ACTIVE);
    });

    it('should detect PLANNING when both spec.md and plan.md exist (no tasks)', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return (filePath.includes('spec.md') || filePath.includes('plan.md')) &&
               !filePath.includes('tasks.md');
      });

      const phase = await manager.detectPhase('0001-test');
      expect(phase).toBe(IncrementStatus.PLANNING);
    });
  });

  describe('createTransitionEvent', () => {
    it('should create transition event with all fields', () => {
      const event = manager.createTransitionEvent(
        '0001-test',
        IncrementStatus.PLANNING,
        IncrementStatus.ACTIVE,
        'tasks-created'
      );

      expect(event.incrementId).toBe('0001-test');
      expect(event.from).toBe(IncrementStatus.PLANNING);
      expect(event.to).toBe(IncrementStatus.ACTIVE);
      expect(event.trigger).toBe('tasks-created');
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should create timestamp in ISO format', () => {
      const event = manager.createTransitionEvent(
        '0001-test',
        IncrementStatus.BACKLOG,
        IncrementStatus.PLANNING,
        'spec-created'
      );

      const date = new Date(event.timestamp);
      expect(date.toISOString()).toBe(event.timestamp);
    });

    it('should support all trigger types', () => {
      const triggers: Array<'spec-created' | 'tasks-created' | 'task-started' | 'auto-correct'> = [
        'spec-created',
        'tasks-created',
        'task-started',
        'auto-correct'
      ];

      triggers.forEach(trigger => {
        const event = manager.createTransitionEvent(
          '0001-test',
          IncrementStatus.BACKLOG,
          IncrementStatus.PLANNING,
          trigger
        );

        expect(event.trigger).toBe(trigger);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty increment ID gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const phase = await manager.detectPhase('');
      expect(phase).toBe(IncrementStatus.BACKLOG);
    });

    it('should handle very long increment ID', async () => {
      const longId = '9999-' + 'a'.repeat(100);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const phase = await manager.detectPhase(longId);
      expect(phase).toBe(IncrementStatus.BACKLOG);
    });

    it('should handle special characters in increment ID', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const phase = await manager.detectPhase('0001-test_feature-v2.1');
      expect(phase).toBe(IncrementStatus.BACKLOG);
    });
  });
});

/*
 * NOTE ON TEST COVERAGE:
 *
 * These unit tests focus on phase detection logic (artifact-based).
 *
 * The following scenarios are tested in integration tests
 * (tests/integration/hooks/auto-transition-integration.test.ts):
 *
 * - handleSpecCreated() - requires MetadataManager
 * - handleTasksCreated() - requires MetadataManager
 * - handleTaskStarted() - requires MetadataManager
 * - autoCorrect() - requires MetadataManager
 * - Full lifecycle transitions - requires file system + metadata
 *
 * This separation keeps unit tests fast and focused, while integration
 * tests provide comprehensive end-to-end coverage.
 */
