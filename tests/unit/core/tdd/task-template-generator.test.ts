/**
 * TDD Task Template Generator Tests
 *
 * Tests for TDD task template generation following RED-GREEN-REFACTOR pattern.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTDDTasks,
  generateTaskTriplet,
  formatTaskAsMarkdown,
  parsePhaseFromTask,
} from '../../../../src/core/tdd/task-template-generator.js';
import type {
  TestMode,
  TDDTask,
  TDDTaskTriplet,
  UserStoryContext,
  TDDTaskGenerationOptions,
} from '../../../../src/core/tdd/types.js';

describe('TDD Task Template Generator', () => {
  const sampleUserStory: UserStoryContext = {
    id: 'US-001',
    title: 'User Registration',
    acceptanceCriteria: [
      { id: 'AC-US1-01', description: 'User can register with email', priority: 'P0' },
      { id: 'AC-US1-02', description: 'Email validation works', priority: 'P1' },
    ],
  };

  const baseOptions: TDDTaskGenerationOptions = {
    testMode: 'TDD',
    featureDescription: 'User registration system',
    userStories: [sampleUserStory],
    startingTaskNumber: 1,
  };

  describe('generateTDDTasks', () => {
    describe('TDD Mode', () => {
      it('should generate tasks in RED-GREEN-REFACTOR triplets for TDD mode', () => {
        const result = generateTDDTasks(baseOptions);

        expect(result.testMode).toBe('TDD');
        expect(result.triplets.length).toBeGreaterThan(0);

        // Each triplet should have all three phases
        for (const triplet of result.triplets) {
          expect(triplet.redTask.phase).toBe('RED');
          expect(triplet.greenTask.phase).toBe('GREEN');
          expect(triplet.refactorTask.phase).toBe('REFACTOR');
        }
      });

      it('should generate RED tasks with "Write failing test FIRST" text', () => {
        const result = generateTDDTasks(baseOptions);

        const redTasks = result.tasks.filter(t => t.phase === 'RED');
        expect(redTasks.length).toBeGreaterThan(0);

        for (const task of redTasks) {
          expect(task.description.toLowerCase()).toContain('failing test');
          expect(task.title).toContain('[RED]');
        }
      });

      it('should generate GREEN tasks with dependency on corresponding RED task', () => {
        const result = generateTDDTasks(baseOptions);

        const greenTasks = result.tasks.filter(t => t.phase === 'GREEN');
        expect(greenTasks.length).toBeGreaterThan(0);

        for (const greenTask of greenTasks) {
          // GREEN task should depend on a RED task
          expect(greenTask.dependencies.length).toBeGreaterThan(0);

          const dependencyId = greenTask.dependencies[0];
          const redTask = result.tasks.find(t => t.id === dependencyId);

          expect(redTask).toBeDefined();
          expect(redTask!.phase).toBe('RED');
        }
      });

      it('should generate REFACTOR tasks with dependency on GREEN task', () => {
        const result = generateTDDTasks(baseOptions);

        const refactorTasks = result.tasks.filter(t => t.phase === 'REFACTOR');
        expect(refactorTasks.length).toBeGreaterThan(0);

        for (const refactorTask of refactorTasks) {
          expect(refactorTask.dependencies.length).toBeGreaterThan(0);

          const dependencyId = refactorTask.dependencies[0];
          const greenTask = result.tasks.find(t => t.id === dependencyId);

          expect(greenTask).toBeDefined();
          expect(greenTask!.phase).toBe('GREEN');
        }
      });

      it('should include phase markers [RED], [GREEN], [REFACTOR] in task titles', () => {
        const result = generateTDDTasks(baseOptions);

        const redTasks = result.tasks.filter(t => t.phase === 'RED');
        const greenTasks = result.tasks.filter(t => t.phase === 'GREEN');
        const refactorTasks = result.tasks.filter(t => t.phase === 'REFACTOR');

        for (const task of redTasks) {
          expect(task.title).toContain('[RED]');
        }
        for (const task of greenTasks) {
          expect(task.title).toContain('[GREEN]');
        }
        for (const task of refactorTasks) {
          expect(task.title).toContain('[REFACTOR]');
        }
      });

      it('should maintain task ordering: RED before GREEN before REFACTOR', () => {
        const result = generateTDDTasks(baseOptions);

        // For each triplet, verify order
        for (const triplet of result.triplets) {
          const redIndex = result.tasks.findIndex(t => t.id === triplet.redTask.id);
          const greenIndex = result.tasks.findIndex(t => t.id === triplet.greenTask.id);
          const refactorIndex = result.tasks.findIndex(t => t.id === triplet.refactorTask.id);

          expect(redIndex).toBeLessThan(greenIndex);
          expect(greenIndex).toBeLessThan(refactorIndex);
        }
      });
    });

    describe('Test-After Mode', () => {
      it('should generate standard tasks (implementation first) for test-after mode', () => {
        const options: TDDTaskGenerationOptions = {
          ...baseOptions,
          testMode: 'test-after',
        };

        const result = generateTDDTasks(options);

        expect(result.testMode).toBe('test-after');
        expect(result.triplets.length).toBe(0);

        // Should not have phase markers
        for (const task of result.tasks) {
          expect(task.phase).toBeUndefined;
          expect(task.title).not.toContain('[RED]');
          expect(task.title).not.toContain('[GREEN]');
          expect(task.title).not.toContain('[REFACTOR]');
        }
      });

      it('should generate implementation tasks before test tasks in test-after mode', () => {
        const options: TDDTaskGenerationOptions = {
          ...baseOptions,
          testMode: 'test-after',
        };

        const result = generateTDDTasks(options);

        // Find implementation and test tasks
        const implTasks = result.tasks.filter(t =>
          t.title.toLowerCase().includes('implement') ||
          t.description.toLowerCase().includes('implement')
        );
        const testTasks = result.tasks.filter(t =>
          t.title.toLowerCase().includes('test') ||
          t.title.toLowerCase().includes('write test')
        );

        if (implTasks.length > 0 && testTasks.length > 0) {
          const firstImplIndex = result.tasks.findIndex(t => t.id === implTasks[0].id);
          const firstTestIndex = result.tasks.findIndex(t => t.id === testTasks[0].id);

          expect(firstImplIndex).toBeLessThan(firstTestIndex);
        }
      });
    });

    describe('Manual and None Modes', () => {
      it('should generate minimal tasks for manual mode', () => {
        const options: TDDTaskGenerationOptions = {
          ...baseOptions,
          testMode: 'manual',
        };

        const result = generateTDDTasks(options);

        expect(result.testMode).toBe('manual');
        expect(result.triplets.length).toBe(0);
        // Manual mode should still generate tasks, just without strict structure
        expect(result.tasks.length).toBeGreaterThan(0);
      });

      it('should generate tasks without test requirements for none mode', () => {
        const options: TDDTaskGenerationOptions = {
          ...baseOptions,
          testMode: 'none',
        };

        const result = generateTDDTasks(options);

        expect(result.testMode).toBe('none');
        expect(result.triplets.length).toBe(0);

        // None mode tasks should not mention testing
        for (const task of result.tasks) {
          expect(task.title.toLowerCase()).not.toContain('write test');
          expect(task.title.toLowerCase()).not.toContain('[red]');
        }
      });
    });
  });

  describe('generateTaskTriplet', () => {
    it('should generate a complete RED-GREEN-REFACTOR triplet', () => {
      const triplet = generateTaskTriplet({
        featureName: 'user registration',
        userStory: sampleUserStory,
        acId: 'AC-US1-01',
        startingTaskNumber: 1,
      });

      expect(triplet.redTask.phase).toBe('RED');
      expect(triplet.greenTask.phase).toBe('GREEN');
      expect(triplet.refactorTask.phase).toBe('REFACTOR');

      expect(triplet.redTask.id).toBe('T-001');
      expect(triplet.greenTask.id).toBe('T-002');
      expect(triplet.refactorTask.id).toBe('T-003');
    });

    it('should set correct dependencies in triplet', () => {
      const triplet = generateTaskTriplet({
        featureName: 'user registration',
        userStory: sampleUserStory,
        acId: 'AC-US1-01',
        startingTaskNumber: 1,
      });

      expect(triplet.redTask.dependencies).toEqual([]);
      expect(triplet.greenTask.dependencies).toContain('T-001');
      expect(triplet.refactorTask.dependencies).toContain('T-002');
    });

    it('should include user story reference in all tasks', () => {
      const triplet = generateTaskTriplet({
        featureName: 'user registration',
        userStory: sampleUserStory,
        acId: 'AC-US1-01',
        startingTaskNumber: 1,
      });

      expect(triplet.redTask.userStory).toBe('US-001');
      expect(triplet.greenTask.userStory).toBe('US-001');
      expect(triplet.refactorTask.userStory).toBe('US-001');
    });

    it('should include AC references in tasks', () => {
      const triplet = generateTaskTriplet({
        featureName: 'user registration',
        userStory: sampleUserStory,
        acId: 'AC-US1-01',
        startingTaskNumber: 1,
      });

      expect(triplet.redTask.satisfiesACs).toContain('AC-US1-01');
      expect(triplet.greenTask.satisfiesACs).toContain('AC-US1-01');
      expect(triplet.refactorTask.satisfiesACs).toContain('AC-US1-01');
    });
  });

  describe('formatTaskAsMarkdown', () => {
    it('should format TDD task with phase marker in title', () => {
      const task: TDDTask = {
        id: 'T-001',
        title: '[RED] Write failing test for user registration',
        phase: 'RED',
        userStory: 'US-001',
        satisfiesACs: ['AC-US1-01'],
        description: 'Write a failing test that verifies user registration works.',
        testPlan: {
          given: 'Test file created',
          when: 'Run npm test',
          then: 'Test fails with assertion error',
        },
        dependencies: [],
        priority: 'P0',
        model: 'opus',
      };

      const markdown = formatTaskAsMarkdown(task);

      expect(markdown).toContain('### T-001: [RED] Write failing test');
      expect(markdown).toContain('**User Story**: US-001');
      expect(markdown).toContain('**Satisfies ACs**: AC-US1-01');
      expect(markdown).toContain('**Phase**: RED');
      expect(markdown).toContain('**Given**:');
      expect(markdown).toContain('**When**:');
      expect(markdown).toContain('**Then**:');
    });

    it('should include dependency information for GREEN tasks', () => {
      const task: TDDTask = {
        id: 'T-002',
        title: '[GREEN] Implement user registration',
        phase: 'GREEN',
        userStory: 'US-001',
        satisfiesACs: ['AC-US1-01'],
        description: 'Implement minimal code to make test pass.',
        testPlan: {
          given: 'T-001 test exists and fails',
          when: 'Implement code, run npm test',
          then: 'Test passes',
        },
        dependencies: ['T-001'],
        priority: 'P0',
        model: 'opus',
      };

      const markdown = formatTaskAsMarkdown(task);

      expect(markdown).toContain('**Dependency**: T-001 MUST be completed first');
      expect(markdown).toContain('**Phase**: GREEN');
    });
  });

  describe('parsePhaseFromTask', () => {
    it('should correctly identify RED phase from task title', () => {
      expect(parsePhaseFromTask('[RED] Write failing test')).toBe('RED');
    });

    it('should correctly identify GREEN phase from task title', () => {
      expect(parsePhaseFromTask('[GREEN] Implement feature')).toBe('GREEN');
    });

    it('should correctly identify REFACTOR phase from task title', () => {
      expect(parsePhaseFromTask('[REFACTOR] Improve code')).toBe('REFACTOR');
    });

    it('should return null for tasks without phase marker', () => {
      expect(parsePhaseFromTask('Implement user registration')).toBeNull();
    });
  });
});
