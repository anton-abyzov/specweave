/**
 * Task State Manager Unit Tests
 *
 * Tests the core logic for enforcing task completion consistency.
 * Ensures implementation checkboxes are the single source of truth.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStateManager } from '../../src/core/increment/task-state-manager.js';

describe('TaskStateManager', () => {
  let manager: TaskStateManager;

  beforeEach(() => {
    manager = new TaskStateManager();
  });

  describe('computeTaskState', () => {
    it('marks task complete when all checkboxes checked', () => {
      const taskContent = `
### T-001: Implement feature (P1)

**Implementation**:
- [x] Step 1
- [x] Step 2
- [x] Step 3
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(true);
      expect(state.headerMarker).toBe('✅ COMPLETE');
      expect(state.implementationCheckboxes.total).toBe(3);
      expect(state.implementationCheckboxes.checked).toBe(3);
      expect(state.isConsistent).toBe(true);
    });

    it('marks task incomplete when some checkboxes unchecked', () => {
      const taskContent = `
### T-002: Implement feature (P1)

**Implementation**:
- [x] Step 1
- [ ] Step 2
- [x] Step 3
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(false);
      expect(state.headerMarker).toBe(null);
      expect(state.implementationCheckboxes.total).toBe(3);
      expect(state.implementationCheckboxes.checked).toBe(2);
    });

    it('marks task incomplete when all checkboxes unchecked', () => {
      const taskContent = `
### T-003: Implement feature (P1)

**Implementation**:
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(false);
      expect(state.headerMarker).toBe(null);
      expect(state.implementationCheckboxes.total).toBe(3);
      expect(state.implementationCheckboxes.checked).toBe(0);
    });

    it('handles task with no implementation section', () => {
      const taskContent = `
### T-004: Simple task (P1)

**Description**: This task has no checkboxes
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(false);
      expect(state.headerMarker).toBe(null);
      expect(state.implementationCheckboxes.total).toBe(0);
      expect(state.implementationCheckboxes.checked).toBe(0);
    });

    it('handles task with single checkbox', () => {
      const taskContent = `
### T-005: Simple task (P1)

**Implementation**:
- [x] Single step
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(true);
      expect(state.headerMarker).toBe('✅ COMPLETE');
      expect(state.implementationCheckboxes.total).toBe(1);
      expect(state.implementationCheckboxes.checked).toBe(1);
    });

    it('extracts correct task ID', () => {
      const taskContent = `
### T-123: Complex task ID (P1)

**Implementation**:
- [x] Step 1
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.taskId).toBe('T-123');
    });

    it('handles task ID with suffix', () => {
      const taskContent = `
### T-123-DISCIPLINE: Complex task ID (P1)

**Implementation**:
- [x] Step 1
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.taskId).toBe('T-123-DISCIPLINE');
    });
  });

  describe('validate', () => {
    it('passes validation when header and checkboxes match (complete)', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('passes validation when header and checkboxes match (incomplete)', () => {
      const taskContent = `
### T-001: Task name

**Implementation**:
- [ ] Step 1
- [ ] Step 2
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('fails validation when header has marker but checkboxes incomplete', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Implementation**:
- [ ] Step 1
- [ ] Step 2
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Header marker mismatch');
      expect(result.error).toContain('expected "null"');
      expect(result.error).toContain('got "✅ COMPLETE"');
    });

    it('fails validation when checkboxes complete but header missing marker', () => {
      const taskContent = `
### T-001: Task name

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Header marker mismatch');
      expect(result.error).toContain('expected "✅ COMPLETE"');
      expect(result.error).toContain('got "null"');
    });

    it('provides auto-fix suggestion in validation result', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Implementation**:
- [ ] Step 1
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(false);
      expect(result.fix).toBeDefined();
      expect(result.fix).not.toContain('✅ COMPLETE');
    });

    it('handles partial checkbox completion', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Implementation**:
- [x] Step 1
- [ ] Step 2
- [x] Step 3
      `.trim();

      const result = manager.validate(taskContent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Header marker mismatch');
    });
  });

  describe('autoFixHeader', () => {
    it('adds ✅ COMPLETE marker when all checkboxes checked', () => {
      const taskContent = `
### T-001: Task name

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim();

      const fixed = manager.autoFixHeader(taskContent);

      expect(fixed).toContain('### T-001: Task name ✅ COMPLETE');
      expect(fixed).toContain('- [x] Step 1');
      expect(fixed).toContain('- [x] Step 2');
    });

    it('removes ✅ COMPLETE marker when checkboxes incomplete', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Implementation**:
- [x] Step 1
- [ ] Step 2
      `.trim();

      const fixed = manager.autoFixHeader(taskContent);

      expect(fixed).not.toContain('✅ COMPLETE');
      expect(fixed).toContain('### T-001: Task name');
      expect(fixed).toContain('- [x] Step 1');
      expect(fixed).toContain('- [ ] Step 2');
    });

    it('preserves task content when fixing header', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Description**: Important task description

**Implementation**:
- [ ] Step 1

**Notes**: Some notes
      `.trim();

      const fixed = manager.autoFixHeader(taskContent);

      expect(fixed).toContain('**Description**: Important task description');
      expect(fixed).toContain('**Notes**: Some notes');
    });

    it('handles task with no implementation section (no change)', () => {
      const taskContent = `
### T-001: Task name ✅ COMPLETE

**Description**: No implementation section
      `.trim();

      const fixed = manager.autoFixHeader(taskContent);

      // Should remove marker since no checkboxes to verify
      expect(fixed).not.toContain('✅ COMPLETE');
    });

    it('is idempotent (applying twice produces same result)', () => {
      const taskContent = `
### T-001: Task name

**Implementation**:
- [x] Step 1
      `.trim();

      const fixed1 = manager.autoFixHeader(taskContent);
      const fixed2 = manager.autoFixHeader(fixed1);

      expect(fixed1).toBe(fixed2);
    });

    it('handles multiple tasks in same content', () => {
      const content = `
### T-001: First task ✅ COMPLETE

**Implementation**:
- [ ] Step 1

---

### T-002: Second task

**Implementation**:
- [x] Step 1
      `.trim();

      // Fix should only affect the specific task passed
      const task1Content = content.split('---')[0].trim();
      const fixed = manager.autoFixHeader(task1Content);

      expect(fixed).not.toContain('✅ COMPLETE');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty task content', () => {
      const taskContent = '';

      expect(() => manager.computeTaskState(taskContent)).not.toThrow();

      const state = manager.computeTaskState(taskContent);
      expect(state.taskId).toBe('');
      expect(state.isComplete).toBe(false);
    });

    it('handles malformed task header', () => {
      const taskContent = `
## Wrong header level

**Implementation**:
- [x] Step 1
      `.trim();

      expect(() => manager.computeTaskState(taskContent)).not.toThrow();
    });

    it('handles checkboxes with extra whitespace', () => {
      const taskContent = `
### T-001: Task name

**Implementation**:
-  [x]  Step 1
-   [ ]   Step 2
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.implementationCheckboxes.total).toBe(2);
      expect(state.implementationCheckboxes.checked).toBe(1);
    });

    it('ignores checkboxes outside Implementation section', () => {
      const taskContent = `
### T-001: Task name

**Prerequisites**:
- [x] Not part of implementation

**Implementation**:
- [x] Step 1

**Notes**:
- [ ] Also not part of implementation
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.implementationCheckboxes.total).toBe(1);
      expect(state.implementationCheckboxes.checked).toBe(1);
    });

    it('handles Unicode characters in task names', () => {
      const taskContent = `
### T-001: 🚀 Implement feature (P1) ✅ COMPLETE

**Implementation**:
- [x] Step 1 ⚡
- [x] Step 2 🔧
      `.trim();

      const state = manager.computeTaskState(taskContent);

      expect(state.isComplete).toBe(true);
      expect(state.taskId).toBe('T-001');
    });

    it('handles very long task descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      const taskContent = `
### T-001: ${longDescription}

**Implementation**:
- [x] Step 1
      `.trim();

      expect(() => manager.computeTaskState(taskContent)).not.toThrow();

      const state = manager.computeTaskState(taskContent);
      expect(state.isComplete).toBe(true);
    });
  });

  describe('Performance', () => {
    it('handles task with many checkboxes efficiently', () => {
      const checkboxes = Array.from({ length: 100 }, (_, i) => `- [x] Step ${i + 1}`).join('\n');
      const taskContent = `
### T-001: Big task

**Implementation**:
${checkboxes}
      `.trim();

      const start = Date.now();
      const state = manager.computeTaskState(taskContent);
      const duration = Date.now() - start;

      expect(state.implementationCheckboxes.total).toBe(100);
      expect(state.implementationCheckboxes.checked).toBe(100);
      expect(duration).toBeLessThan(100); // Should be fast (<100ms)
    });

    it('validates many tasks efficiently', () => {
      const tasks = Array.from({ length: 50 }, (_, i) => `
### T-${String(i + 1).padStart(3, '0')}: Task ${i + 1} ✅ COMPLETE

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim()).join('\n\n---\n\n');

      const start = Date.now();

      // Validate each task
      const taskBlocks = tasks.split('---');
      taskBlocks.forEach(taskContent => {
        manager.validate(taskContent.trim());
      });

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // Should handle 50 tasks quickly
    });
  });
});
