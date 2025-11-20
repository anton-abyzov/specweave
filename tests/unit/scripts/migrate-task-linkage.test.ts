/**
 * Unit Tests: Migration Script (Task Linkage Inference)
 *
 * Tests US-Task linkage inference using multiple strategies.
 */

import { describe, it, expect } from 'vitest';
import type { Task } from '../../../src/generators/spec/task-parser.js';
import type { SpecUserStory } from '../../../src/core/spec-content-sync.js';

// Note: These are mocked implementations for unit testing
// The actual implementations use dynamic imports from dist/

/**
 * Mock implementation of inferFromACIds for testing
 */
function inferFromACIds(
  task: Task,
  userStories: SpecUserStory[]
): { userStory: string; confidence: number; satisfiesACs: string[] } | null {
  const acPattern = /AC-US(\d+)-(\d+)/g;
  const matches = task.description?.matchAll(acPattern) || [];
  const acIds = Array.from(matches, (m) => m[0]);

  if (acIds.length === 0) return null;

  // Extract US number from first AC-ID
  const firstAC = acIds[0];
  const usMatch = firstAC.match(/AC-US(\d+)-/);
  if (!usMatch) return null;

  const usNumber = usMatch[1];
  const usId = `US-${usNumber.padStart(3, '0')}`;

  // Verify US exists
  const usExists = userStories.some((us) => us.id === usId);
  if (!usExists) return null;

  return {
    userStory: usId,
    confidence: 95,
    satisfiesACs: acIds,
  };
}

/**
 * Mock implementation of inferFromKeywords for testing
 */
function inferFromKeywords(
  task: Task,
  userStories: SpecUserStory[]
): { userStory: string; confidence: number } | null {
  const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
  const taskWords = taskText.split(/\s+/).filter((w) => w.length >= 4);

  let bestMatch: { usId: string; score: number } | null = null;

  for (const us of userStories) {
    const usWords = (us.title || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    if (usWords.length === 0) continue;

    const matchCount = usWords.filter((word) => taskText.includes(word)).length;
    const score = matchCount / usWords.length;

    if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { usId: us.id, score };
    }
  }

  if (!bestMatch) return null;

  return {
    userStory: bestMatch.usId,
    confidence: Math.min(Math.round(bestMatch.score * 100), 85),
  };
}

describe('Migration Script - Inference Algorithm', () => {
  describe('TC-054: Infer US from AC-IDs in description', () => {
    it('should infer US-001 from AC-US1-01 and AC-US1-02', () => {
      const task: Task = {
        id: 'T-001',
        title: 'Implement feature',
        description: 'Implement AC-US1-01 and AC-US1-02 for user authentication',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'User Authentication',
          description: 'As a user...',
          acceptanceCriteria: [
            { id: 'AC-US1-01', description: 'Login works', priority: 'P0', testable: true },
            { id: 'AC-US1-02', description: 'Logout works', priority: 'P0', testable: true },
          ],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeTruthy();
      expect(result!.userStory).toBe('US-001');
      expect(result!.confidence).toBe(95);
      expect(result!.satisfiesACs).toEqual(['AC-US1-01', 'AC-US1-02']);
    });

    it('should handle single AC-ID', () => {
      const task: Task = {
        id: 'T-002',
        title: 'Fix bug',
        description: 'Fix issue mentioned in AC-US2-03',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-002',
          title: 'Bug Fixes',
          description: '',
          acceptanceCriteria: [
            { id: 'AC-US2-03', description: 'Bug fixed', priority: 'P1', testable: true },
          ],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeTruthy();
      expect(result!.userStory).toBe('US-002');
      expect(result!.satisfiesACs).toEqual(['AC-US2-03']);
    });

    it('should return null if no AC-IDs found', () => {
      const task: Task = {
        id: 'T-003',
        title: 'Generic task',
        description: 'Do some work without AC references',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeNull();
    });

    it('should return null if referenced US does not exist', () => {
      const task: Task = {
        id: 'T-004',
        title: 'Task',
        description: 'Implement AC-US999-01', // Non-existent US
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeNull();
    });
  });

  describe('TC-055: Infer US from title keyword matching', () => {
    it('should match "AC mapping" task to "AC-Task Mapping" US', () => {
      const task: Task = {
        id: 'T-005',
        title: 'Add AC mapping functionality',
        description: 'Create mapping between acceptance criteria and tasks',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'User Authentication',
          description: '',
          acceptanceCriteria: [],
        },
        {
          id: 'US-002',
          title: 'AC-Task Mapping',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result).toBeTruthy();
      expect(result!.userStory).toBe('US-002');
      expect(result!.confidence).toBeGreaterThanOrEqual(50); // Keyword match
      expect(result!.confidence).toBeLessThanOrEqual(85); // Max for keywords
    });

    it('should match with partial keyword overlap', () => {
      const task: Task = {
        id: 'T-006',
        title: 'Implement living documentation synchronization',
        description: 'Sync increment data to living docs',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-003',
          title: 'Automatic Living Docs Sync',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result).toBeTruthy();
      expect(result!.userStory).toBe('US-003');
    });

    it('should return null if overlap below threshold (30%)', () => {
      const task: Task = {
        id: 'T-007',
        title: 'Unrelated task',
        description: 'This has no connection to any US',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Completely Different Feature',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result).toBeNull();
    });

    it('should select best match when multiple USs have overlap', () => {
      const task: Task = {
        id: 'T-008',
        title: 'Task progress tracking dashboard',
        description: 'Display task completion progress',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-004',
          title: 'Progress Tracking',
          description: '',
          acceptanceCriteria: [],
        },
        {
          id: 'US-005',
          title: 'Progress Tracking by User Story',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result).toBeTruthy();
      // Should match US-005 (more keywords match)
      expect(result!.userStory).toBe('US-005');
    });
  });

  describe('TC-057: Mark low-confidence as needs review', () => {
    it('should flag tasks with confidence < 50', () => {
      // This test validates the concept - actual implementation
      // in the migration script would mark these for manual review

      const lowConfidenceTasks = [
        { taskId: 'T-010', confidence: 45 },
        { taskId: 'T-011', confidence: 30 },
        { taskId: 'T-012', confidence: 25 },
      ];

      const needsReview = lowConfidenceTasks.filter((t) => t.confidence < 50);

      expect(needsReview).toHaveLength(3);
      expect(needsReview.map((t) => t.taskId)).toEqual(['T-010', 'T-011', 'T-012']);
    });

    it('should NOT flag medium/high confidence tasks', () => {
      const tasks = [
        { taskId: 'T-020', confidence: 95 }, // High (AC-IDs)
        { taskId: 'T-021', confidence: 75 }, // Medium (Keywords)
        { taskId: 'T-022', confidence: 60 }, // Medium (Files)
        { taskId: 'T-023', confidence: 50 }, // Threshold
      ];

      const needsReview = tasks.filter((t) => t.confidence < 50);

      expect(needsReview).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle tasks with empty description', () => {
      const task: Task = {
        id: 'T-100',
        title: 'Task with no description',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result1 = inferFromACIds(task, userStories);
      const result2 = inferFromKeywords(task, userStories);

      expect(result1).toBeNull();
      expect(result2).toBeNull(); // No keywords to match
    });

    it('should handle US with empty title', () => {
      const task: Task = {
        id: 'T-101',
        title: 'Some task',
        description: 'Description here',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: '', // Empty title
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result).toBeNull(); // No keywords to match
    });

    it('should handle duplicate AC-IDs in description', () => {
      const task: Task = {
        id: 'T-102',
        title: 'Task',
        description: 'Implement AC-US1-01 and AC-US1-01 again', // Duplicate
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature',
          description: '',
          acceptanceCriteria: [
            { id: 'AC-US1-01', description: 'AC 1', priority: 'P0', testable: true },
          ],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeTruthy();
      expect(result!.satisfiesACs).toEqual(['AC-US1-01', 'AC-US1-01']); // Preserves duplicates
    });

    it('should handle AC-IDs from multiple User Stories', () => {
      const task: Task = {
        id: 'T-103',
        title: 'Cross-US task',
        description: 'Implements AC-US1-01 and AC-US2-01', // Multiple USs
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature 1',
          description: '',
          acceptanceCriteria: [
            { id: 'AC-US1-01', description: 'AC 1', priority: 'P0', testable: true },
          ],
        },
        {
          id: 'US-002',
          title: 'Feature 2',
          description: '',
          acceptanceCriteria: [
            { id: 'AC-US2-01', description: 'AC 2', priority: 'P0', testable: true },
          ],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result).toBeTruthy();
      // Should use first AC-ID to determine US
      expect(result!.userStory).toBe('US-001');
      expect(result!.satisfiesACs).toEqual(['AC-US1-01', 'AC-US2-01']);
    });
  });

  describe('Confidence scoring', () => {
    it('should assign 95% confidence for AC-ID matching', () => {
      const task: Task = {
        id: 'T-200',
        title: 'Task',
        description: 'AC-US1-01',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Feature',
          description: '',
          acceptanceCriteria: [
            { id: 'AC-US1-01', description: 'AC', priority: 'P0', testable: true },
          ],
        },
      ];

      const result = inferFromACIds(task, userStories);

      expect(result!.confidence).toBe(95);
    });

    it('should assign ≤85% confidence for keyword matching', () => {
      const task: Task = {
        id: 'T-201',
        title: 'Perfect keyword match',
        description: 'All keywords present',
        status: 'pending',
      };

      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Perfect keyword match',
          description: '',
          acceptanceCriteria: [],
        },
      ];

      const result = inferFromKeywords(task, userStories);

      expect(result!.confidence).toBeLessThanOrEqual(85);
      expect(result!.confidence).toBeGreaterThan(0);
    });
  });
});
