/**
 * Unit tests for CompletionPropagator
 *
 * Tests bottom-up completion propagation:
 * - Tasks → ACs → User Stories → Increments
 */

import { CompletionPropagator } from '../../../src/core/living-docs/CompletionPropagator';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');

describe('CompletionPropagator', () => {
  let propagator: CompletionPropagator;

  beforeEach(() => {
    propagator = new CompletionPropagator();
    jest.clearAllMocks();
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

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(specContent)  // spec.md
        .mockResolvedValueOnce(tasksContent); // tasks.md

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

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

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(specContent)
        .mockResolvedValueOnce(tasksContent);

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

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

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(specContent)
        .mockResolvedValueOnce(tasksContent);

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

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);

      const stats = await propagator.getAcCompletionStats('AC-US1-01', '/path/to/increment');

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.percentage).toBe(67);
      expect(stats.isComplete).toBe(false);
    });

    it('should handle AC with no tasks', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('### T-001: Other task\n**AC**: AC-US2-01');

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

      (fs.readFile as jest.Mock).mockResolvedValue(specContent);

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

      (fs.readFile as jest.Mock).mockResolvedValue(specContent);

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

      (fs.readFile as jest.Mock).mockResolvedValue(specContent);

      const stats = await propagator.getIncrementCompletionStats('/path/to/increment');

      expect(stats.isComplete).toBe(true);
      expect(stats.percentage).toBe(100);
    });
  });
});
