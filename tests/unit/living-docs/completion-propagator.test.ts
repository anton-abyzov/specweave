/**
 * Unit tests for CompletionPropagator
 *
 * Tests bottom-up completion propagation:
 * - Tasks → ACs → User Stories → Increments
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompletionPropagator } from '../../../src/core/living-docs/CompletionPropagator.js';
import fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');

describe('CompletionPropagator', () => {
  let propagator: CompletionPropagator;

  beforeEach(() => {
    propagator = new CompletionPropagator();
    vi.clearAllMocks();
  });

  describe('propagateCompletion', () => {
    it('should mark AC complete when all tasks complete', async () => {
      const specContent = `
- [ ] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion
      `;

      const tasksContent = `
### T-001: Task One
**AC**: AC-US1-01
**Completed**: 2025-11-16

### T-002: Task Two
**AC**: AC-US1-01
**Completed**: 2025-11-16
      `;

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(specContent as any)  // spec.md
        .mockResolvedValueOnce(tasksContent as any); // tasks.md

      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);

      const result = await propagator.propagateCompletion('/path/to/increment');

      expect(result.acsCompleted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should not mark AC complete if some tasks incomplete', async () => {
      const specContent = `
- [ ] **AC-US1-01**: First criterion
      `;

      const tasksContent = `
### T-001: Task One
**AC**: AC-US1-01
**Completed**: 2025-11-16

### T-002: Task Two
**AC**: AC-US1-01
**Completed**: Not completed
      `;

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(specContent as any)
        .mockResolvedValueOnce(tasksContent as any);

      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);

      const result = await propagator.propagateCompletion('/path/to/increment');

      expect(result.acsCompleted).toBe(0);
    });

    it('should detect increment completion', async () => {
      const specContent = `
- [x] **AC-US1-01**: First
- [x] **AC-US1-02**: Second
      `;

      const tasksContent = `
### T-001: All tasks complete
**AC**: AC-US1-01
**Completed**: 2025-11-16
      `;

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(specContent as any)
        .mockResolvedValueOnce(tasksContent as any);

      const result = await propagator.propagateCompletion('/path/to/increment');

      expect(result.incrementCompleted).toBe(true);
    });
  });

  describe('getAcCompletionStats', () => {
    it('should calculate AC completion percentage', async () => {
      const tasksContent = `
### T-001: Complete
**AC**: AC-US1-01
**Completed**: 2025-11-16

### T-002: Complete
**AC**: AC-US1-01
**Completed**: 2025-11-16

### T-003: Incomplete
**AC**: AC-US1-01
**Completed**: Not completed
      `;

      vi.mocked(fs.readFile).mockResolvedValue(tasksContent as any);

      const stats = await propagator.getAcCompletionStats('AC-US1-01', '/path/to/increment');

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.percentage).toBe(67);
      expect(stats.isComplete).toBe(false);
    });

    it('should handle AC with no tasks', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('### T-001: Other task\n**AC**: AC-US2-01' as any);

      const stats = await propagator.getAcCompletionStats('AC-US1-01', '/path/to/increment');

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });

  describe('getUserStoryCompletionStats', () => {
    it('should calculate User Story completion percentage', async () => {
      const specContent = `
- [x] **AC-US1-01**: Complete
- [x] **AC-US1-02**: Complete
- [ ] **AC-US1-03**: Incomplete
      `;

      vi.mocked(fs.readFile).mockResolvedValue(specContent as any);

      const stats = await propagator.getUserStoryCompletionStats('US1', '/path/to/increment');

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.percentage).toBe(67);
    });
  });

  describe('getIncrementCompletionStats', () => {
    it('should calculate overall increment completion', async () => {
      const specContent = `
- [x] **AC-US1-01**: Complete
- [x] **AC-US1-02**: Complete
- [x] **AC-US2-01**: Complete
- [ ] **AC-US2-02**: Incomplete
      `;

      vi.mocked(fs.readFile).mockResolvedValue(specContent as any);

      const stats = await propagator.getIncrementCompletionStats('/path/to/increment');

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(3);
      expect(stats.percentage).toBe(75);
      expect(stats.isComplete).toBe(false);
    });

    it('should detect 100% completion', async () => {
      const specContent = `
- [x] **AC-US1-01**: Complete
- [x] **AC-US1-02**: Complete
      `;

      vi.mocked(fs.readFile).mockResolvedValue(specContent as any);

      const stats = await propagator.getIncrementCompletionStats('/path/to/increment');

      expect(stats.isComplete).toBe(true);
      expect(stats.percentage).toBe(100);
    });
  });
});
