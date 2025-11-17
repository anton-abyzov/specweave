import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import * as os from 'os';

import { ACStatusManager } from '../../src/core/increment/ac-status-manager.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ACStatusManager.parseTasksForACStatus', () => {
  let manager: ACStatusManager;
  // ✅ SAFE: Isolated test directory (prevents .specweave deletion)
  const testRoot = path.join(os.tmpdir(), 'specweave-test-ac-status-manager-' + Date.now());

  beforeEach(() => {
    manager = new ACStatusManager(testRoot);

    // Clean up test directory
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('Basic AC extraction', () => {
    it('should extract AC tags from completed tasks', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.has('AC-US11-01')).toBe(true);
      expect(result.get('AC-US11-01')?.totalTasks).toBe(1);
      expect(result.get('AC-US11-01')?.completedTasks).toBe(1);
      expect(result.get('AC-US11-01')?.percentage).toBe(100);
      expect(result.get('AC-US11-01')?.isComplete).toBe(true);
      expect(result.get('AC-US11-01')?.tasks).toEqual(['T-001']);
    });

    it('should extract AC tags from incomplete tasks', () => {
      const tasksContent = `
#### T-002: Task 2
**AC**: AC-US11-02
- [ ] Not completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.has('AC-US11-02')).toBe(true);
      expect(result.get('AC-US11-02')?.totalTasks).toBe(1);
      expect(result.get('AC-US11-02')?.completedTasks).toBe(0);
      expect(result.get('AC-US11-02')?.percentage).toBe(0);
      expect(result.get('AC-US11-02')?.isComplete).toBe(false);
      expect(result.get('AC-US11-02')?.tasks).toEqual(['T-002']);
    });
  });

  describe('Multiple tasks for same AC', () => {
    it('should handle multiple tasks for same AC', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-01
- [ ] Not completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.get('AC-US11-01')?.totalTasks).toBe(2);
      expect(result.get('AC-US11-01')?.completedTasks).toBe(1);
      expect(result.get('AC-US11-01')?.percentage).toBe(50);
      expect(result.get('AC-US11-01')?.isComplete).toBe(false);
      expect(result.get('AC-US11-01')?.tasks).toEqual(['T-001', 'T-002']);
    });

    it('should calculate percentage correctly for 3 tasks', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-01
- [x] Completed

#### T-003: Task 3
**AC**: AC-US11-01
- [ ] Not completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.get('AC-US11-01')?.totalTasks).toBe(3);
      expect(result.get('AC-US11-01')?.completedTasks).toBe(2);
      expect(result.get('AC-US11-01')?.percentage).toBeCloseTo(66.67, 2);
      expect(result.get('AC-US11-01')?.isComplete).toBe(false);
    });
  });

  describe('Task with multiple ACs', () => {
    it('should handle task with multiple ACs (comma-separated)', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01, AC-US11-02
- [x] Completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.get('AC-US11-01')?.completedTasks).toBe(1);
      expect(result.get('AC-US11-01')?.totalTasks).toBe(1);
      expect(result.get('AC-US11-01')?.isComplete).toBe(true);

      expect(result.get('AC-US11-02')?.completedTasks).toBe(1);
      expect(result.get('AC-US11-02')?.totalTasks).toBe(1);
      expect(result.get('AC-US11-02')?.isComplete).toBe(true);
    });

    it('should handle task with multiple ACs (space-separated)', () => {
      const tasksContent = `
#### T-100: Complex task
**AC**: AC-US11-05 AC-US11-06 AC-US11-07
- [x] Completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.get('AC-US11-05')?.isComplete).toBe(true);
      expect(result.get('AC-US11-06')?.isComplete).toBe(true);
      expect(result.get('AC-US11-07')?.isComplete).toBe(true);
    });
  });

  describe('Edge cases and complex scenarios', () => {
    it('should handle tasks without AC tags', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task without AC
- [x] Completed

#### T-003: Task 3
**AC**: AC-US11-02
- [ ] Not completed
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.size).toBe(2);
      expect(result.has('AC-US11-01')).toBe(true);
      expect(result.has('AC-US11-02')).toBe(true);
    });

    it('should handle mixed completion statuses', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed
- [x] Another step

#### T-002: Task 2
**AC**: AC-US11-01
- [ ] Not completed
- [x] Partial
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      // Both tasks reference AC-US11-01
      // T-001 is complete (all checkboxes [x])
      // T-002 is incomplete (has [ ])
      expect(result.get('AC-US11-01')?.totalTasks).toBe(2);
      expect(result.get('AC-US11-01')?.completedTasks).toBe(1);
    });

    it('should handle tasks with no checkboxes', () => {
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
No checkboxes here
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      // Task with no checkboxes is considered incomplete
      expect(result.get('AC-US11-01')?.completedTasks).toBe(0);
      expect(result.get('AC-US11-01')?.isComplete).toBe(false);
    });

    it('should extract task IDs correctly', () => {
      const tasksContent = `
#### T-001: First task
**AC**: AC-US11-01
- [x] Done

#### T-042: Middle task
**AC**: AC-US11-01
- [x] Done

#### T-100: Last task
**AC**: AC-US11-01
- [ ] Not done
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.get('AC-US11-01')?.tasks).toEqual(['T-001', 'T-042', 'T-100']);
    });

    it('should handle empty tasks.md content', () => {
      const tasksContent = '';

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.size).toBe(0);
    });

    it('should handle tasks.md with only headings', () => {
      const tasksContent = `
# Tasks

## Phase 1

### US-001: Some user story
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.size).toBe(0);
    });
  });

  describe('Real-world task format', () => {
    it('should parse realistic task format from increment 0039', () => {
      const tasksContent = `
## Phase 6: Spec Synchronization

### US-011: Auto-Sync Plan and Tasks on Spec Changes (P1)

#### T-062: Write tests for detectSpecChange()
**AC**: AC-US11-01
**File**: \`tests/unit/spec-sync-manager.test.ts\`
**Test Plan**:
- **Given**: Increment with spec.md and plan.md
- **When**: detectSpecChange() is called
- **Then**: Returns spec change detection result

**Test Cases**:
\`\`\`typescript
describe('SpecSyncManager.detectSpecChange', () => {
  it('should detect when spec.md is newer than plan.md', () => {
    // Test implementation
  });
});
\`\`\`

**Dependencies**: None
**Estimated**: 3 hours
- [x] Test written
- [x] Test passing

---

#### T-063: Implement detectSpecChange()
**AC**: AC-US11-01
**File**: \`src/core/increment/spec-sync-manager.ts\`
**Implementation**:
1. Check if spec.md exists
2. Check if plan.md exists
3. Compare modification times
4. Return detection result

**Dependencies**: T-062
**Estimated**: 4 hours
- [x] Implemented
- [x] Tests passing
      `;

      const result = manager.parseTasksForACStatus(tasksContent);

      expect(result.has('AC-US11-01')).toBe(true);
      expect(result.get('AC-US11-01')?.totalTasks).toBe(2);
      expect(result.get('AC-US11-01')?.completedTasks).toBe(2);
      expect(result.get('AC-US11-01')?.percentage).toBe(100);
      expect(result.get('AC-US11-01')?.isComplete).toBe(true);
      expect(result.get('AC-US11-01')?.tasks).toEqual(['T-062', 'T-063']);
    });
  });
});

describe('ACStatusManager.parseSpecForACs', () => {
  let manager: ACStatusManager;
  const testRoot = path.join(__dirname, '../fixtures/ac-status-test');

  beforeEach(() => {
    manager = new ACStatusManager(testRoot);

    // Clean up test directory
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('Basic AC parsing', () => {
    it('should extract unchecked AC checkboxes from spec.md', () => {
      const specContent = `
- [ ] AC-US11-01: Detect spec changes
- [ ] AC-US11-02: Regenerate plan.md
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(2);
      expect(result.get('AC-US11-01')?.checked).toBe(false);
      expect(result.get('AC-US11-01')?.description).toBe('Detect spec changes');
      expect(result.get('AC-US11-02')?.checked).toBe(false);
      expect(result.get('AC-US11-02')?.description).toBe('Regenerate plan.md');
    });

    it('should extract checked AC checkboxes from spec.md', () => {
      const specContent = `
- [x] AC-US11-01: Detect spec changes
- [x] AC-US11-02: Regenerate plan.md
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.checked).toBe(true);
      expect(result.get('AC-US11-02')?.checked).toBe(true);
    });

    it('should extract mixed checked and unchecked ACs', () => {
      const specContent = `
- [x] AC-US11-01: Detect spec changes
- [ ] AC-US11-02: Regenerate plan.md
- [x] AC-US11-03: Preserve status
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(3);
      expect(result.get('AC-US11-01')?.checked).toBe(true);
      expect(result.get('AC-US11-02')?.checked).toBe(false);
      expect(result.get('AC-US11-03')?.checked).toBe(true);
    });
  });

  describe('Line number tracking', () => {
    it('should extract correct line numbers for ACs', () => {
      const specContent = `Line 1
Line 2
- [ ] AC-US11-01: Detect spec changes
Line 4
- [x] AC-US11-02: Regenerate plan.md
Line 6`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.lineNumber).toBe(3);
      expect(result.get('AC-US11-02')?.lineNumber).toBe(5);
    });

    it('should store full line content', () => {
      const specContent = `- [ ] AC-US11-01: Detect spec changes`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.fullLine).toBe('- [ ] AC-US11-01: Detect spec changes');
    });
  });

  describe('AC ID formats', () => {
    it('should handle AC-US format', () => {
      const specContent = `- [ ] AC-US11-01: User story AC`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.has('AC-US11-01')).toBe(true);
    });

    it('should handle AC-FR format', () => {
      const specContent = `- [ ] AC-FR-001: Functional requirement AC`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.has('AC-FR-001')).toBe(true);
    });

    it('should handle multi-digit numbers', () => {
      const specContent = `
- [ ] AC-US123-456: Large numbers
- [ ] AC-US1-1: Small numbers
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.has('AC-US123-456')).toBe(true);
      expect(result.has('AC-US1-1')).toBe(true);
    });
  });

  describe('Description extraction', () => {
    it('should extract simple descriptions', () => {
      const specContent = `- [ ] AC-US11-01: Simple description`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.description).toBe('Simple description');
    });

    it('should extract descriptions with punctuation', () => {
      const specContent = `- [ ] AC-US11-01: Complex description with punctuation, numbers (123), and symbols!`;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.description).toBe('Complex description with punctuation, numbers (123), and symbols!');
    });

    it('should trim whitespace from descriptions', () => {
      const specContent = `- [ ] AC-US11-01:    Description with extra spaces   `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.get('AC-US11-01')?.description).toBe('Description with extra spaces');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty spec.md content', () => {
      const specContent = '';

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(0);
    });

    it('should handle spec.md with no ACs', () => {
      const specContent = `
# Specification

This is a spec without ACs.

## Requirements

Some requirements here.
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(0);
    });

    it('should ignore lines that do not match AC pattern', () => {
      const specContent = `
- [ ] AC-US11-01: Valid AC
- This is not an AC
- [ ] Not an AC either
AC-US11-02: Missing checkbox
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(1);
      expect(result.has('AC-US11-01')).toBe(true);
    });

    it('should handle ACs in nested lists (indented)', () => {
      const specContent = `
- [ ] AC-US11-01: Top level AC
  - [ ] AC-US11-02: Nested AC (should not match)
      `;

      const result = manager.parseSpecForACs(specContent);

      // Our regex starts with ^- so only top-level ACs match
      expect(result.size).toBe(1);
      expect(result.has('AC-US11-01')).toBe(true);
      expect(result.has('AC-US11-02')).toBe(false);
    });
  });

  describe('Real-world spec.md format', () => {
    it('should parse realistic spec.md content from increment 0039', () => {
      const specContent = `
### US-011: Auto-Sync Plan and Tasks on Spec Changes (Priority: P1)

**As a** developer who needs to update spec.md after planning
**I want** plan.md and tasks.md to automatically regenerate when spec.md changes
**So that** my implementation artifacts stay synchronized with the specification

**Acceptance Criteria**:
- [x] AC-US11-01: Detect when spec.md is modified after plan.md exists
  - ✅ Implemented in \`SpecSyncManager.detectSpecChange()\`
  - ✅ Compares file modification timestamps (spec.md mtime > plan.md mtime)
- [ ] AC-US11-02: Automatically regenerate plan.md using Architect Agent
  - ❌ TODO: Architect Agent invocation not implemented
- [ ] AC-US11-03: Automatically regenerate tasks.md based on updated plan.md
  - ❌ TODO: test-aware-planner invocation not implemented
- [x] AC-US11-06: User can skip auto-sync with --skip-sync flag
  - ✅ Implemented in \`syncIncrement(incrementId, skipSync)\` parameter
      `;

      const result = manager.parseSpecForACs(specContent);

      expect(result.size).toBe(4);
      expect(result.get('AC-US11-01')?.checked).toBe(true);
      expect(result.get('AC-US11-02')?.checked).toBe(false);
      expect(result.get('AC-US11-03')?.checked).toBe(false);
      expect(result.get('AC-US11-06')?.checked).toBe(true);

      // Check descriptions are correctly extracted
      expect(result.get('AC-US11-01')?.description).toBe('Detect when spec.md is modified after plan.md exists');
      expect(result.get('AC-US11-02')?.description).toBe('Automatically regenerate plan.md using Architect Agent');
    });
  });
});

describe('ACStatusManager.syncACStatus', () => {
  let manager: ACStatusManager;
  const testRoot = path.join(__dirname, '../fixtures/ac-status-test');

  beforeEach(() => {
    manager = new ACStatusManager(testRoot);

    // Clean up test directory
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('Update AC from [ ] to [x]', () => {
    it('should update AC from [ ] to [x] when all tasks complete', async () => {
      // Create test increment
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      // Create spec.md with unchecked AC
      const specContent = `
# Spec

**Acceptance Criteria**:
- [ ] AC-US11-01: Detect spec changes
- [ ] AC-US11-02: Regenerate plan.md
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with ALL tasks for AC-US11-01 complete
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-01
- [x] Also completed

#### T-003: Task 3
**AC**: AC-US11-02
- [ ] Not completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Run sync
      const result = await manager.syncACStatus('0039');

      // Verify result
      expect(result.synced).toBe(true);
      expect(result.updated).toContain('AC-US11-01');
      expect(result.updated).not.toContain('AC-US11-02');
      expect(result.changes).toEqual([
        'AC-US11-01: [ ] → [x] (2/2 tasks complete)'
      ]);

      // Verify spec.md file was updated
      const updatedSpec = fs.readFileSync(path.join(incrementPath, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('- [x] AC-US11-01: Detect spec changes');
      expect(updatedSpec).toContain('- [ ] AC-US11-02: Regenerate plan.md');
    });
  });

  describe('Keep AC as [ ] when tasks incomplete', () => {
    it('should keep AC as [ ] when tasks incomplete', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      const specContent = `
- [ ] AC-US11-02: Regenerate plan.md
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      // Only 1 of 3 tasks complete for AC-US11-02
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-02
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-02
- [ ] Not completed

#### T-003: Task 3
**AC**: AC-US11-02
- [ ] Not completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      // Verify NO updates
      expect(result.synced).toBe(false);
      expect(result.updated).toHaveLength(0);

      // Verify spec.md unchanged
      const updatedSpec = fs.readFileSync(path.join(incrementPath, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('- [ ] AC-US11-02: Regenerate plan.md');
    });
  });

  describe('Handle AC with no tasks', () => {
    it('should warn when AC has no tasks (manual verification)', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      const specContent = `
- [ ] AC-US11-99: No tasks for this AC
- [ ] AC-US11-01: Has tasks
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      // Should warn about AC-US11-99
      expect(result.warnings).toContain('AC-US11-99: has no tasks mapped');

      // Should update AC-US11-01
      expect(result.updated).toContain('AC-US11-01');
    });
  });

  describe('Detect conflicts', () => {
    it('should detect conflict when AC [x] but tasks incomplete', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      // AC is manually checked
      const specContent = `
- [x] AC-US11-03: Manually checked but incomplete
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      // Tasks are only 50% complete
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-03
- [x] Completed

#### T-002: Task 2
**AC**: AC-US11-03
- [ ] Not completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      // Should detect conflict
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('AC-US11-03: [x] but only 1/2 tasks complete (50%)');
    });
  });

  describe('Handle task with multiple ACs', () => {
    it('should update all ACs when task with multiple ACs completes', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      const specContent = `
- [ ] AC-US11-01: First AC
- [ ] AC-US11-02: Second AC
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      // Task references both ACs
      const tasksContent = `
#### T-100: Task that completes both ACs
**AC**: AC-US11-01, AC-US11-02
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      // Both ACs should be updated
      expect(result.updated).toContain('AC-US11-01');
      expect(result.updated).toContain('AC-US11-02');

      const updatedSpec = fs.readFileSync(path.join(incrementPath, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('- [x] AC-US11-01: First AC');
      expect(updatedSpec).toContain('- [x] AC-US11-02: Second AC');
    });
  });

  describe('Handle missing files', () => {
    it('should warn when spec.md does not exist', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      // Only create tasks.md, no spec.md
      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('spec.md does not exist');
    });

    it('should warn when tasks.md does not exist', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      // Only create spec.md, no tasks.md
      const specContent = `
- [ ] AC-US11-01: Some AC
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const result = await manager.syncACStatus('0039');

      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('tasks.md does not exist');
    });
  });

  describe('Handle AC referenced in tasks but not in spec', () => {
    it('should warn when AC in tasks.md but not found in spec.md', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      const specContent = `
- [ ] AC-US11-01: Valid AC
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Completed

#### T-002: Task with invalid AC
**AC**: AC-INVALID-99
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      expect(result.warnings).toContain('AC-INVALID-99 referenced in tasks.md but not found in spec.md');
    });
  });

  describe('Real-world sync scenario', () => {
    it('should handle complex increment with multiple ACs and tasks', async () => {
      const incrementPath = path.join(testRoot, '.specweave', 'increments', '0039');
      fs.mkdirSync(incrementPath, { recursive: true });

      const specContent = `
**Acceptance Criteria**:
- [x] AC-US11-01: Already complete
- [ ] AC-US11-02: Will be completed
- [ ] AC-US11-03: Partially complete
- [ ] AC-US11-04: No tasks
`;
      fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
#### T-001: Task 1
**AC**: AC-US11-01
- [x] Done

#### T-002: Task 2
**AC**: AC-US11-02
- [x] Done

#### T-003: Task 3
**AC**: AC-US11-02
- [x] Done

#### T-004: Task 4
**AC**: AC-US11-03
- [x] Done

#### T-005: Task 5
**AC**: AC-US11-03
- [ ] Not done
`;
      fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus('0039');

      // AC-US11-02 should be updated (all tasks complete)
      expect(result.updated).toContain('AC-US11-02');

      // AC-US11-03 should NOT be updated (partial completion)
      expect(result.updated).not.toContain('AC-US11-03');

      // AC-US11-04 should warn (no tasks)
      expect(result.warnings).toContain('AC-US11-04: has no tasks mapped');

      const updatedSpec = fs.readFileSync(path.join(incrementPath, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('- [x] AC-US11-02: Will be completed');
      expect(updatedSpec).toContain('- [ ] AC-US11-03: Partially complete');
    });
  });
});
