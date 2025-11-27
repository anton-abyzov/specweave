import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpecSyncManager } from '../../../src/core/increment/spec-sync-manager.js';
import { silentLogger } from '../../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Task completion status preservation tests (T-070)
 */
describe('SpecSyncManager - Status Preservation', () => {
  let testDir: string;
  let manager: SpecSyncManager;
  let incrementsDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    manager = new SpecSyncManager(testDir, { logger: silentLogger });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('preserving completed tasks by ID', () => {
    it('should preserve completed tasks when IDs match', () => {
      const oldTasks = `# Tasks
## T-001: First task
- [x] Step A completed
- [ ] Step B pending`;

      const newTasks = `# Tasks
## T-001: First task (updated)
- [ ] Step A completed
- [ ] Step B pending
- [ ] Step D added`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] Step A completed');
      expect(result).toContain('- [ ] Step D added');
    });

    it('should handle new tasks added', () => {
      const oldTasks = `# Tasks
## T-001: Existing task
- [x] Completed step`;

      const newTasks = `# Tasks
## T-001: Existing task
- [ ] Completed step
## T-003: New task
- [ ] New step`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] Completed step');
      expect(result).toContain('- [ ] New step');
    });

    it('should handle task reordering', () => {
      const oldTasks = `# Tasks
## T-001: First
- [x] First completed
## T-002: Second
- [ ] Second pending`;

      const newTasks = `# Tasks
## T-002: Second (now first)
- [ ] Second pending
## T-001: First (now second)
- [ ] First completed`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] First completed');
      expect(result).toContain('- [ ] Second pending');
    });
  });

  describe('complex status preservation scenarios', () => {
    it('should preserve partially completed tasks', () => {
      const oldTasks = `# Tasks
## T-001: Multi-step task
- [x] Step 1 done
- [x] Step 2 done
- [ ] Step 3 pending`;

      const newTasks = `# Tasks
## T-001: Multi-step task (updated)
- [ ] Step 1 done
- [ ] Step 2 done
- [ ] Step 3 pending
- [ ] Step 5 added`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] Step 1 done');
      expect(result).toContain('- [x] Step 2 done');
      expect(result).toContain('- [ ] Step 5 added');
    });

    it('should handle text similarity matching', () => {
      const oldTasks = `# Tasks
## T-001: Task
- [x] Setup database connection
- [x] Create user table`;

      const newTasks = `# Tasks
## T-001: Task
- [ ] Setup database connection (improved)
- [ ] Create user table
- [ ] Add migration scripts`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] Setup database connection (improved)');
      expect(result).toContain('- [x] Create user table');
      expect(result).toContain('- [ ] Add migration scripts');
    });

    it('should preserve status across task description changes', () => {
      const oldTasks = `# Tasks
## T-001: Implement auth
- [x] Add login endpoint
- [ ] Add password reset`;

      const newTasks = `# Tasks
## T-001: User authentication system
- [ ] Add login endpoint
- [ ] Add password reset
- [ ] Add 2FA support`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] Add login endpoint');
      expect(result).toContain('- [ ] Add 2FA support');
    });
  });

  describe('edge cases', () => {
    it('should handle empty old tasks', () => {
      const oldTasks = '# Tasks\n\n(No tasks yet)';
      const newTasks = `# Tasks
## T-001: New task
- [ ] Step 1`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [ ] Step 1');
    });

    it('should handle all tasks completed', () => {
      const oldTasks = `# Tasks
## T-001: Task
- [x] All steps
- [x] Are done`;

      const newTasks = `# Tasks
## T-001: Task (regenerated)
- [ ] All steps
- [ ] Are done
- [ ] Plus new step`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [x] All steps');
      expect(result).toContain('- [x] Are done');
      expect(result).toContain('- [ ] Plus new step');
    });

    it('should handle tasks with no subtasks', () => {
      const oldTasks = `# Tasks
## T-001: Simple task
Just a description.`;

      const newTasks = `# Tasks
## T-001: Simple task now has subtasks
- [ ] Step A
- [ ] Step B`;

      const oldCompletions = manager.parseTaskCompletion(oldTasks);
      const result = manager.applyTaskCompletion(newTasks, oldCompletions);

      expect(result).toContain('- [ ] Step A');
      expect(result).toContain('- [ ] Step B');
    });
  });
});
