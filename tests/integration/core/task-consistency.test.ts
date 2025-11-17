/**
 * Task Consistency Integration Tests
 *
 * Tests the full automation flow:
 * - Hook detects inconsistencies
 * - Hook auto-fixes headers
 * - AC sync runs after fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task Consistency Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/test-increment-consistency');
  const incrementDir = path.join(testDir, '.specweave/increments/0001-test');
  const tasksPath = path.join(incrementDir, 'tasks.md');
  const specPath = path.join(incrementDir, 'spec.md');

  beforeEach(async () => {
    // Setup test increment
    await fs.ensureDir(incrementDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('Hook Auto-Fix Behavior', () => {
    it('removes ✅ COMPLETE marker when checkboxes incomplete', async () => {
      // Setup: Task header says COMPLETE but checkboxes unchecked
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task ✅ COMPLETE

**Implementation**:
- [ ] Step 1
- [ ] Step 2
      `.trim());

      // Execute: Run update-tasks-md hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      const result = execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: Marker removed
      const updated = await fs.readFile(tasksPath, 'utf-8');
      expect(updated).not.toContain('✅ COMPLETE');
      expect(result).toContain('Auto-fixed');
    });

    it('adds ✅ COMPLETE marker when all checkboxes checked', async () => {
      // Setup: All checkboxes checked but no header marker
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim());

      // Execute: Run update-tasks-md hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: Marker added
      const updated = await fs.readFile(tasksPath, 'utf-8');
      expect(updated).toContain('### T-001: Test task ✅ COMPLETE');
    });

    it('handles multiple tasks with mixed consistency', async () => {
      // Setup: Mix of consistent and inconsistent tasks
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Consistent complete ✅ COMPLETE
**Implementation**:
- [x] Step 1

---

### T-002: Inconsistent (says complete but not done) ✅ COMPLETE
**Implementation**:
- [ ] Step 1

---

### T-003: Inconsistent (done but not marked)
**Implementation**:
- [x] Step 1

---

### T-004: Consistent incomplete
**Implementation**:
- [ ] Step 1
      `.trim());

      // Execute: Run hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: All tasks now consistent
      const updated = await fs.readFile(tasksPath, 'utf-8');

      // T-001: Should keep marker (consistent)
      expect(updated).toContain('### T-001: Consistent complete ✅ COMPLETE');

      // T-002: Should remove marker (checkboxes incomplete)
      expect(updated).toContain('### T-002: Inconsistent (says complete but not done)');
      expect(updated).not.toContain('### T-002: Inconsistent (says complete but not done) ✅ COMPLETE');

      // T-003: Should add marker (checkboxes complete)
      expect(updated).toContain('### T-003: Inconsistent (done but not marked) ✅ COMPLETE');

      // T-004: Should keep no marker (consistent)
      expect(updated).toContain('### T-004: Consistent incomplete');
      expect(updated).not.toContain('### T-004: Consistent incomplete ✅ COMPLETE');
    });
  });

  describe('AC Sync After Auto-Fix', () => {
    it('syncs ACs after fixing task headers', async () => {
      // Setup: Task with AC mapping, checkboxes done but header not marked
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task
**AC**: AC-US1-01

**Implementation**:
- [x] Step 1
- [x] Step 2
      `.trim());

      await fs.writeFile(specPath, `
# Spec

## Acceptance Criteria

- [ ] **AC-US1-01**: Task must be complete
      `.trim());

      // Execute: Run update-tasks-md hook (which triggers AC sync)
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Then run AC sync hook
      const acHookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-ac-status.js');
      execSync(`node ${acHookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: Task header updated AND AC checked
      const updatedTasks = await fs.readFile(tasksPath, 'utf-8');
      expect(updatedTasks).toContain('✅ COMPLETE');

      const updatedSpec = await fs.readFile(specPath, 'utf-8');
      expect(updatedSpec).toContain('- [x] **AC-US1-01**');
    });

    it('unchecks ACs when task header auto-fixed to incomplete', async () => {
      // Setup: Task says complete but checkboxes not done, AC currently checked
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task ✅ COMPLETE
**AC**: AC-US1-01

**Implementation**:
- [ ] Step 1
- [ ] Step 2
      `.trim());

      await fs.writeFile(specPath, `
# Spec

## Acceptance Criteria

- [x] **AC-US1-01**: Task must be complete
      `.trim());

      // Execute: Run update-tasks-md hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Then run AC sync hook
      const acHookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-ac-status.js');
      execSync(`node ${acHookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: Task header fixed AND AC unchecked
      const updatedTasks = await fs.readFile(tasksPath, 'utf-8');
      expect(updatedTasks).not.toContain('✅ COMPLETE');

      const updatedSpec = await fs.readFile(specPath, 'utf-8');
      expect(updatedSpec).toContain('- [ ] **AC-US1-01**');
    });
  });

  describe('Progress Calculation', () => {
    it('calculates correct progress after auto-fix', async () => {
      // Setup: 2/3 tasks with inconsistencies
      await fs.writeFile(tasksPath, `
# Tasks

**Total Tasks**: 3
**Completed**: 0
**Progress**: 0%

---

### T-001: First task ✅ COMPLETE
**Implementation**:
- [x] Step 1

---

### T-002: Second task
**Implementation**:
- [x] Step 1

---

### T-003: Third task ✅ COMPLETE
**Implementation**:
- [ ] Step 1
      `.trim());

      // Execute: Run hook
      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      // Verify: Progress updated to 2/3 (67%)
      const updated = await fs.readFile(tasksPath, 'utf-8');
      expect(updated).toContain('**Completed**: 2');
      expect(updated).toContain('**Progress**: 67%');

      // Verify task states
      expect(updated).toContain('### T-001: First task ✅ COMPLETE'); // Kept
      expect(updated).toContain('### T-002: Second task ✅ COMPLETE'); // Added
      expect(updated).toContain('### T-003: Third task'); // Removed marker
      expect(updated).not.toContain('### T-003: Third task ✅ COMPLETE');
    });
  });

  describe('Idempotence', () => {
    it('running hook multiple times produces same result', async () => {
      // Setup: Task with inconsistency
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task ✅ COMPLETE

**Implementation**:
- [ ] Step 1
      `.trim());

      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');

      // Execute: Run hook 3 times
      execSync(`node ${hookPath} 0001-test`, { cwd: testDir });
      const firstRun = await fs.readFile(tasksPath, 'utf-8');

      execSync(`node ${hookPath} 0001-test`, { cwd: testDir });
      const secondRun = await fs.readFile(tasksPath, 'utf-8');

      execSync(`node ${hookPath} 0001-test`, { cwd: testDir });
      const thirdRun = await fs.readFile(tasksPath, 'utf-8');

      // Verify: All runs produce identical result
      expect(firstRun).toBe(secondRun);
      expect(secondRun).toBe(thirdRun);
      expect(firstRun).not.toContain('✅ COMPLETE');
    });
  });

  describe('Edge Cases', () => {
    it('handles task with no implementation section gracefully', async () => {
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Simple task ✅ COMPLETE

**Description**: No implementation checkboxes
      `.trim());

      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');

      // Should not crash
      expect(() => {
        execSync(`node ${hookPath} 0001-test`, { cwd: testDir });
      }).not.toThrow();

      // Marker should be removed (no checkboxes to verify)
      const updated = await fs.readFile(tasksPath, 'utf-8');
      expect(updated).not.toContain('✅ COMPLETE');
    });

    it('preserves task content while fixing header', async () => {
      await fs.writeFile(tasksPath, `
# Tasks

### T-001: Test task ✅ COMPLETE
**Effort**: 2h | **AC**: AC-US1-01

**Description**: Important task description

**Implementation**:
- [ ] Step 1

**Notes**: Keep these notes
      `.trim());

      const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-tasks-md.js');
      execSync(`node ${hookPath} 0001-test`, { cwd: testDir });

      const updated = await fs.readFile(tasksPath, 'utf-8');

      // Header fixed
      expect(updated).not.toContain('✅ COMPLETE');

      // Content preserved
      expect(updated).toContain('**Effort**: 2h | **AC**: AC-US1-01');
      expect(updated).toContain('**Description**: Important task description');
      expect(updated).toContain('**Notes**: Keep these notes');
      expect(updated).toContain('- [ ] Step 1');
    });
  });
});
