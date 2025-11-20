/**
 * Integration Tests: Progress Display Command
 *
 * Tests /specweave:progress command with User Story grouping.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

describe('/specweave:progress command', () => {
  let testDir: string;
  let incrementsDir: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `specweave-progress-test-${Date.now()}`);
    incrementsDir = path.join(testDir, '.specweave/increments');
    await fs.ensureDir(incrementsDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('TC-049: Display per-US progress', () => {
    it('should show progress for each User Story', async () => {
      // Create test increment with 3 User Stories
      const incrementPath = path.join(incrementsDir, '0047-test');
      await fs.ensureDir(incrementPath);

      // Create metadata.json
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        status: 'in-progress',
        title: 'Test Increment',
      });

      // Create tasks.md with US grouping
      const tasksContent = `---
total_tasks: 10
completed: 6
by_user_story:
  US-001: 4
  US-002: 3
  US-003: 3
---

## User Story: US-001 - First Story
### T-001: Task 1
**User Story**: US-001
**Status**: [x] completed

### T-002: Task 2
**User Story**: US-001
**Status**: [x] completed

### T-003: Task 3
**User Story**: US-001
**Status**: [x] completed

### T-004: Task 4
**User Story**: US-001
**Status**: [ ] pending

## User Story: US-002 - Second Story
### T-005: Task 5
**User Story**: US-002
**Status**: [x] completed

### T-006: Task 6
**User Story**: US-002
**Status**: [x] completed

### T-007: Task 7
**User Story**: US-002
**Status**: [x] completed

## User Story: US-003 - Third Story
### T-008: Task 8
**User Story**: US-003
**Status**: [ ] pending

### T-009: Task 9
**User Story**: US-003
**Status**: [ ] pending

### T-010: Task 10
**User Story**: US-003
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run progress command
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')} 0047-test`,
        { encoding: 'utf-8' }
      );

      // Verify output shows all 3 User Stories
      expect(output).toContain('US-001:');
      expect(output).toContain('US-002:');
      expect(output).toContain('US-003:');

      // Verify percentages
      expect(output).toMatch(/US-001:.*75%/); // 3/4 = 75%
      expect(output).toMatch(/US-002:.*100%/); // 3/3 = 100%
      expect(output).toMatch(/US-003:.*0%/); // 0/3 = 0%
    });
  });

  describe('TC-050: Show overall progress summary', () => {
    it('should display overall progress across all USs', async () => {
      // Create test increment
      const incrementPath = path.join(incrementsDir, '0047-test');
      await fs.ensureDir(incrementPath);

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        status: 'in-progress',
      });

      const tasksContent = `---
total_tasks: 18
completed: 13
---

## User Story: US-001
### T-001: Task 1
**User Story**: US-001
**Status**: [x] completed

### T-002: Task 2
**User Story**: US-001
**Status**: [x] completed

### T-003: Task 3
**User Story**: US-001
**Status**: [x] completed

### T-004: Task 4
**User Story**: US-001
**Status**: [x] completed

### T-005: Task 5
**User Story**: US-001
**Status**: [x] completed

### T-006: Task 6
**User Story**: US-001
**Status**: [x] completed

### T-007: Task 7
**User Story**: US-001
**Status**: [x] completed

### T-008: Task 8
**User Story**: US-001
**Status**: [x] completed

### T-009: Task 9
**User Story**: US-001
**Status**: [ ] pending

### T-010: Task 10
**User Story**: US-001
**Status**: [ ] pending

### T-011: Task 11
**User Story**: US-001
**Status**: [ ] pending

## User Story: US-002
### T-012: Task 12
**User Story**: US-002
**Status**: [x] completed

### T-013: Task 13
**User Story**: US-002
**Status**: [x] completed

### T-014: Task 14
**User Story**: US-002
**Status**: [x] completed

### T-015: Task 15
**User Story**: US-002
**Status**: [x] completed

### T-016: Task 16
**User Story**: US-002
**Status**: [x] completed

### T-017: Task 17
**User Story**: US-002
**Status**: [ ] pending

### T-018: Task 18
**User Story**: US-002
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run progress command
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')} 0047-test`,
        { encoding: 'utf-8' }
      );

      // Verify overall progress
      expect(output).toMatch(/72%.*\(13\/18 tasks\)/); // 13/18 ≈ 72%
    });
  });

  describe('TC-051: Color code progress bars', () => {
    it('should use appropriate colors based on completion percentage', async () => {
      // Create test increment with varying percentages
      const incrementPath = path.join(incrementsDir, '0047-test');
      await fs.ensureDir(incrementPath);

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        status: 'in-progress',
      });

      const tasksContent = `---
total_tasks: 13
completed: 11
---

## User Story: US-001 - 100% (Green)
### T-001: Task 1
**User Story**: US-001
**Status**: [x] completed

### T-002: Task 2
**User Story**: US-001
**Status**: [x] completed

### T-003: Task 3
**User Story**: US-001
**Status**: [x] completed

### T-004: Task 4
**User Story**: US-001
**Status**: [x] completed

## User Story: US-002 - 73% (Yellow)
### T-005: Task 5
**User Story**: US-002
**Status**: [x] completed

### T-006: Task 6
**User Story**: US-002
**Status**: [x] completed

### T-007: Task 7
**User Story**: US-002
**Status**: [x] completed

### T-008: Task 8
**User Story**: US-002
**Status**: [x] completed

### T-009: Task 9
**User Story**: US-002
**Status**: [x] completed

### T-010: Task 10
**User Story**: US-002
**Status**: [x] completed

### T-011: Task 11
**User Story**: US-002
**Status**: [x] completed

### T-012: Task 12
**User Story**: US-002
**Status**: [x] completed

### T-013: Task 13
**User Story**: US-002
**Status**: [ ] pending

### T-014: Task 14
**User Story**: US-002
**Status**: [ ] pending

### T-015: Task 15
**User Story**: US-002
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run progress command
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')} 0047-test`,
        { encoding: 'utf-8' }
      );

      // Note: Color codes are in the output but difficult to test directly
      // We verify the percentages are correct
      expect(output).toMatch(/US-001:.*100%/); // Should use green
      expect(output).toMatch(/US-002:.*73%/); // Should use yellow

      // Verify checkmark for 100% complete
      expect(output).toMatch(/✅.*US-001:/);

      // Verify tree indicator for incomplete
      expect(output).toMatch(/├─.*US-002:/);
    });
  });

  describe('Edge cases', () => {
    it('should handle increment with no User Story linkage', async () => {
      const incrementPath = path.join(incrementsDir, '0001-legacy');
      await fs.ensureDir(incrementPath);

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        status: 'in-progress',
      });

      const tasksContent = `---
total_tasks: 3
completed: 2
---

### T-001: Task 1
**Status**: [x] completed

### T-002: Task 2
**Status**: [x] completed

### T-003: Task 3
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run progress command
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')} 0001-legacy`,
        { encoding: 'utf-8' }
      );

      // Should show overall progress but no per-US breakdown
      expect(output).toMatch(/67%.*\(2\/3 tasks\)/);
      expect(output).not.toContain('Progress by User Story:');
    });

    it('should warn about orphan tasks', async () => {
      const incrementPath = path.join(incrementsDir, '0047-test');
      await fs.ensureDir(incrementPath);

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        status: 'in-progress',
      });

      const tasksContent = `---
total_tasks: 5
completed: 2
---

## User Story: US-001
### T-001: Task 1
**User Story**: US-001
**Status**: [x] completed

### T-002: Task 2
**User Story**: US-001
**Status**: [x] completed

## Orphan Tasks
### T-003: Orphan 1
**Status**: [ ] pending

### T-004: Orphan 2
**Status**: [ ] pending

### T-005: Orphan 3
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run progress command
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')} 0047-test`,
        { encoding: 'utf-8' }
      );

      // Should warn about orphan tasks
      expect(output).toMatch(/3 task\(s\) without User Story linkage/);
    });
  });

  describe('Multiple increments', () => {
    it('should show all non-completed increments', async () => {
      // Create multiple increments
      const increments = [
        { id: '0045-first', status: 'in-progress', completedTasks: 5, totalTasks: 10 },
        { id: '0046-second', status: 'paused', completedTasks: 3, totalTasks: 8 },
        { id: '0047-third', status: 'completed', completedTasks: 12, totalTasks: 12 },
      ];

      for (const inc of increments) {
        const incrementPath = path.join(incrementsDir, inc.id);
        await fs.ensureDir(incrementPath);

        await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
          status: inc.status,
        });

        // Create minimal tasks.md
        let tasksContent = `---
total_tasks: ${inc.totalTasks}
completed: ${inc.completedTasks}
---
`;

        for (let i = 1; i <= inc.totalTasks; i++) {
          const status = i <= inc.completedTasks ? '[x] completed' : '[ ] pending';
          tasksContent += `\n### T-${String(i).padStart(3, '0')}: Task ${i}\n**Status**: ${status}\n`;
        }

        await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);
      }

      // Run progress command (all increments)
      const output = execSync(
        `cd ${testDir} && npx tsx ${path.join(__dirname, '../../../scripts/show-progress.ts')}`,
        { encoding: 'utf-8' }
      );

      // Should show in-progress and paused, but not completed
      expect(output).toContain('0045-first');
      expect(output).toContain('0046-second');
      expect(output).not.toContain('0047-third');

      // Should show summary
      expect(output).toMatch(/Active increments: 1/);
      expect(output).toMatch(/Other non-completed: 1/);
    });
  });
});
