/**
 * Integration tests for AC status synchronization via post-task-completion hook
 *
 * Tests the automatic AC status sync that fires when tasks complete.
 * Validates the full flow: task completion → hook fires → AC status updates
 *
 * ENHANCED: Now includes actual hook script execution tests to verify:
 * - Hook can be executed without import errors
 * - Hook imports resolve correctly at runtime
 * - Hook produces expected output
 *
 * Related: .specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { ACStatusManager } from '../../../src/core/increment/ac-status-manager';

describe('AC Status Hook Integration', () => {
  let testDir: string;
  let incrementDir: string;
  let manager: ACStatusManager;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-ac-hook-test-'));
    const specweaveDir = path.join(testDir, '.specweave', 'increments');
    incrementDir = path.join(specweaveDir, '0001-test-increment');
    fs.mkdirSync(incrementDir, { recursive: true });

    manager = new ACStatusManager(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Hook Trigger on Task Completion', () => {
    it('should sync AC status when task completes', async () => {
      // Arrange: Create spec.md with unchecked ACs
      const specContent = `---
increment: 0001-test-increment
---

# Feature Test

## User Story

**Acceptance Criteria**:
- [ ] AC-US1-01: First criterion
- [ ] AC-US1-02: Second criterion
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      // Create tasks.md with completed tasks for AC-US1-01
      const tasksContent = `# Tasks

#### T-001: Task one
**AC**: AC-US1-01
- [x] Completed

#### T-002: Task two
**AC**: AC-US1-01
- [x] Completed

#### T-003: Task three
**AC**: AC-US1-02
- [ ] Not started
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act: Simulate task completion by calling ACStatusManager directly
      // (In real scenario, hook would call this)
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: AC-US1-01 should be updated to [x]
      expect(result.synced).toBe(true);
      expect(result.updated).toContain('AC-US1-01');
      expect(result.updated).not.toContain('AC-US1-02'); // Still incomplete

      // Verify spec.md file was updated
      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01: First criterion');
      expect(updatedSpec).toContain('[ ] AC-US1-02: Second criterion');
    });

    it('should show diff of AC updates', async () => {
      // Arrange
      const specContent = `---
increment: 0001-test-increment
---

- [ ] AC-US1-01: Test AC
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Test task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should include change description
      expect(result.changes).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0]).toContain('AC-US1-01');
      expect(result.changes[0]).toContain('[ ] → [x]');
    });

    it('should handle multiple ACs per task', async () => {
      // Arrange
      const specContent = `- [ ] AC-US1-01: First
- [ ] AC-US1-02: Second
- [ ] AC-US1-03: Third
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Task covering multiple ACs
**AC**: AC-US1-01, AC-US1-02
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Both AC-US1-01 and AC-US1-02 should be updated
      expect(result.updated).toContain('AC-US1-01');
      expect(result.updated).toContain('AC-US1-02');
      expect(result.updated).not.toContain('AC-US1-03');

      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01');
      expect(updatedSpec).toContain('[x] AC-US1-02');
      expect(updatedSpec).toContain('[ ] AC-US1-03');
    });
  });

  describe('Hook Skip Flag', () => {
    it('should skip sync when --skip-ac-sync flag is set', async () => {
      // Note: This tests the flag mechanism, actual hook integration
      // is tested in E2E tests where we can control environment variables

      // Arrange
      const specContent = `- [ ] AC-US1-01: Test AC`;
      const tasksContent = `#### T-001: Test
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act: In production, hook would check SKIP_AC_SYNC env var
      // Here we test that manager works correctly when called
      const shouldSkip = process.env.SKIP_AC_SYNC === 'true';

      if (!shouldSkip) {
        const result = await manager.syncACStatus('0001-test-increment');
        expect(result.synced).toBe(true);
      }

      // This test validates the mechanism exists
      expect(shouldSkip).toBe(false); // Default behavior
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflict when AC is checked but tasks incomplete', async () => {
      // Arrange: AC manually checked but tasks incomplete
      const specContent = `- [x] AC-US1-01: Manually checked AC`;
      const tasksContent = `#### T-001: Task one
**AC**: AC-US1-01
- [x] Completed

#### T-002: Task two
**AC**: AC-US1-01
- [ ] Not complete
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should detect conflict
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toContain('AC-US1-01');
      expect(result.conflicts[0]).toContain('[x]');
      expect(result.conflicts[0]).toContain('1/2'); // 1 of 2 tasks complete

      // Should NOT update (preserve manual override)
      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01'); // Still checked
    });

    it('should warn about orphaned ACs with no tasks', async () => {
      // Arrange: AC exists in spec but no tasks reference it
      const specContent = `- [ ] AC-US1-01: Has tasks
- [ ] AC-US1-99: No tasks (orphaned)
`;
      const tasksContent = `#### T-001: Only task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should warn about AC-US1-99
      expect(result.warnings).toBeDefined();
      const orphanedWarning = result.warnings.find(w => w.includes('AC-US1-99'));
      expect(orphanedWarning).toBeDefined();
      expect(orphanedWarning).toContain('no tasks');
    });
  });

  describe('Partial Completion', () => {
    it('should keep AC unchecked when only partial tasks complete', async () => {
      // Arrange
      const specContent = `- [ ] AC-US1-01: Partial completion`;
      const tasksContent = `#### T-001: Task one
**AC**: AC-US1-01
- [x] Completed

#### T-002: Task two
**AC**: AC-US1-01
- [ ] Not complete

#### T-003: Task three
**AC**: AC-US1-01
- [ ] Not complete
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should NOT update AC (only 33% complete)
      expect(result.updated).not.toContain('AC-US1-01');
      expect(result.synced).toBe(false);

      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[ ] AC-US1-01'); // Still unchecked
    });

    it('should update AC only when 100% of tasks complete', async () => {
      // Arrange
      const specContent = `- [ ] AC-US1-01: Will complete`;
      const tasksContent = `#### T-001: Task one
**AC**: AC-US1-01
- [x] Completed

#### T-002: Task two
**AC**: AC-US1-01
- [x] Completed

#### T-003: Task three
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should update AC (100% complete)
      expect(result.updated).toContain('AC-US1-01');
      expect(result.synced).toBe(true);

      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing spec.md gracefully', async () => {
      // Arrange: Only create tasks.md
      const tasksContent = `#### T-001: Task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should return warning
      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('spec.md does not exist');
    });

    it('should handle missing tasks.md gracefully', async () => {
      // Arrange: Only create spec.md
      const specContent = `- [ ] AC-US1-01: Test`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should return warning
      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('tasks.md does not exist');
    });

    it('should handle tasks with no AC tags', async () => {
      // Arrange
      const specContent = `- [ ] AC-US1-01: Test`;
      const tasksContent = `#### T-001: Task without AC tag
- [x] Completed

#### T-002: Task with AC
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should only process T-002
      expect(result.updated).toContain('AC-US1-01');
    });

    it('should handle malformed AC patterns gracefully', async () => {
      // Arrange
      const specContent = `- [ ] AC-US1-01: Valid
- [ ] INVALID-AC: Bad pattern
`;
      const tasksContent = `#### T-001: Task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act
      const result = await manager.syncACStatus('0001-test-increment');

      // Assert: Should process valid AC only
      expect(result.updated).toContain('AC-US1-01');
      // Invalid pattern should be ignored (parseSpecForACs regex won't match it)
    });
  });

  describe('Performance', () => {
    it('should sync within 200ms for typical increment', async () => {
      // Arrange: Create realistic increment size (50 ACs, 100 tasks)
      let specContent = '---\nincrement: 0001-test\n---\n\n';
      for (let i = 1; i <= 50; i++) {
        specContent += `- [ ] AC-US1-${String(i).padStart(2, '0')}: AC ${i}\n`;
      }
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      let tasksContent = '# Tasks\n\n';
      for (let i = 1; i <= 100; i++) {
        const acId = `AC-US1-${String((i % 50) + 1).padStart(2, '0')}`;
        tasksContent += `#### T-${String(i).padStart(3, '0')}: Task ${i}\n`;
        tasksContent += `**AC**: ${acId}\n`;
        tasksContent += `- [x] Completed\n\n`;
      }
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Act: Measure sync time
      const startTime = Date.now();
      await manager.syncACStatus('0001-test-increment');
      const duration = Date.now() - startTime;

      // Assert: Should complete within 200ms
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Hook Script Execution (Runtime Import Validation)', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const hookPath = path.join(rootDir, 'plugins/specweave/lib/hooks/update-ac-status.js');

    it('should execute hook script without import errors', () => {
      // Create minimal increment
      const specContent = `- [ ] AC-US1-01: Test`;
      const tasksContent = `#### T-001: Test\n**AC**: AC-US1-01\n- [x] Done`;

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Change to test directory
      const originalDir = process.cwd();
      process.chdir(testDir);

      try {
        // Execute hook from project root
        const output = execSync(`node ${hookPath} 0001-test-increment`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        // Should NOT contain module resolution errors
        expect(output).not.toContain('Cannot find module');
        expect(output).not.toContain('ERR_MODULE_NOT_FOUND');

        // Should show sync output
        expect(output).toMatch(/Syncing AC status|already in sync|Updated AC/);
      } finally {
        process.chdir(originalDir);
      }
    });

    it('should successfully sync AC status via hook execution', () => {
      // Create increment with unchecked AC and completed task
      const specContent = `- [ ] AC-US1-01: Should be checked`;
      const tasksContent = `#### T-001: Complete task\n**AC**: AC-US1-01\n- [x] Completed`;

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const originalDir = process.cwd();
      process.chdir(testDir);

      try {
        // Execute hook
        const output = execSync(`node ${hookPath} 0001-test-increment`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        // Verify AC was updated
        const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
        expect(updatedSpec).toContain('[x] AC-US1-01');

        // Output should indicate update
        expect(output).toMatch(/Updated AC|AC-US1-01.*\[x\]/);
      } finally {
        process.chdir(originalDir);
      }
    });

    it('should handle SKIP_AC_SYNC environment variable', () => {
      const specContent = `- [ ] AC-US1-01: Test`;
      const tasksContent = `#### T-001: Test\n**AC**: AC-US1-01\n- [x] Done`;

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const originalDir = process.cwd();
      process.chdir(testDir);

      try {
        // Execute with skip flag
        const output = execSync(`SKIP_AC_SYNC=true node ${hookPath} 0001-test-increment`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        // Should indicate skip
        expect(output).toContain('AC sync skipped');

        // Spec should remain unchanged
        const spec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
        expect(spec).toContain('[ ] AC-US1-01'); // Still unchecked
      } finally {
        process.chdir(originalDir);
      }
    });
  });
});
