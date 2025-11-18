/**
 * AC Sync E2E Flow - End-to-End Integration Test
 *
 * Tests the complete AC synchronization flow:
 * 1. Task completed → TodoWrite hook fires
 * 2. update-ac-status.js syncs spec.md ACs
 * 3. sync-living-docs.js syncs to living docs
 * 4. User story files reflect AC completion
 *
 * This is the CRITICAL flow the user reported as broken.
 *
 * Bug Report:
 * - User completes tasks
 * - ACs not updating in living docs user stories
 * - Root cause: AC extraction regex didn't support bold formatting
 *
 * Test Coverage:
 * - Task completion triggers AC update
 * - Spec.md AC checkboxes updated based on task completion
 * - Living docs user stories get updated ACs
 * - AC completion status propagates correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ACStatusManager } from '../../../src/core/increment/ac-status-manager.js';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('AC Sync E2E Flow', () => {
  let testRoot: string;
  let acManager: ACStatusManager;
  let livingDocsSync: LivingDocsSync;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-ac-e2e-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Initialize managers
    acManager = new ACStatusManager(testRoot);
    livingDocsSync = new LivingDocsSync(testRoot);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  it('should sync completed tasks to spec.md ACs to living docs', async () => {
    // Step 1: Create increment with spec.md and tasks.md
    const incrementId = '0042-test-ac-sync';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    // spec.md with ACs (unchecked)
    const specContent = `---
increment: ${incrementId}
title: "Test AC Sync Flow"
status: active
---

# Test Feature

## User Stories

### US-001: Test User Story

**As a** developer
**I want** AC sync to work
**So that** living docs stay updated

**Acceptance Criteria**:

- [ ] **AC-US1-01**: First AC (should be checked when T-001 completes)
- [ ] **AC-US1-02**: Second AC (should be checked when T-002 completes)
- [ ] **AC-US1-03**: Third AC (should remain unchecked - no implementing tasks)
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // tasks.md with tasks mapped to ACs (using correct format for ACStatusManager)
    const tasksContent = `# Tasks

### T-001: Complete First Requirement

**User Story**: US-001
**AC**: AC-US1-01
**Priority**: P1
**Estimate**: 2 hours

**Test Plan**:

- [x] Unit test passes
- [x] Integration test passes

### T-002: Complete Second Requirement

**User Story**: US-001
**AC**: AC-US1-02
**Priority**: P1
**Estimate**: 2 hours

**Test Plan**:

- [x] Unit test passes
- [x] Integration test passes

### T-003: Complete Third Requirement

**User Story**: US-001
**AC**: AC-US1-03
**Priority**: P2
**Estimate**: 3 hours

**Test Plan**:

- [ ] Unit test passes
- [ ] Integration test passes
`;

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Step 2: Run AC status sync (simulates update-ac-status.js hook)
    const acSyncResult = await acManager.syncACStatus(incrementId);

    expect(acSyncResult.synced).toBe(true);
    expect(acSyncResult.updated).toContain('AC-US1-01');
    expect(acSyncResult.updated).toContain('AC-US1-02');
    expect(acSyncResult.updated).not.toContain('AC-US1-03'); // Not complete yet

    // Verify spec.md was updated
    const updatedSpec = await fs.readFile(path.join(incrementDir, 'spec.md'), 'utf-8');
    expect(updatedSpec).toContain('- [x] **AC-US1-01**'); // Now checked!
    expect(updatedSpec).toContain('- [x] **AC-US1-02**'); // Now checked!
    expect(updatedSpec).toContain('- [ ] **AC-US1-03**'); // Still unchecked

    // Step 3: Sync to living docs (simulates sync-living-docs.js hook)
    const livingDocsSyncResult = await livingDocsSync.syncIncrement(incrementId);

    expect(livingDocsSyncResult.success).toBe(true);
    expect(livingDocsSyncResult.filesCreated.length).toBeGreaterThan(0);

    // Step 4: Verify living docs user story file has updated ACs
    const userStoryFile = livingDocsSyncResult.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');

    // Should have checked ACs for completed tasks
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-02\*\*/);

    // Should have unchecked AC for incomplete task
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-03\*\*/);

    // Should contain AC descriptions
    expect(userStoryContent).toContain('First AC');
    expect(userStoryContent).toContain('Second AC');
    expect(userStoryContent).toContain('Third AC');
  });

  it('should handle partial task completion correctly', async () => {
    // Test scenario: AC has 2 tasks, only 1 completed
    const incrementId = '0043-test-partial-completion';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test Partial Completion"
status: active
---

# Test Feature

## User Stories

### US-001: Test Partial Completion

**Acceptance Criteria**:

- [ ] **AC-US1-01**: AC with 2 tasks (should stay unchecked until both complete)
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    const tasksContent = `# Tasks

### T-001: First Task for AC-US1-01

**User Story**: US-001
**AC**: AC-US1-01

**Test Plan**:

- [x] Task complete

### T-002: Second Task for AC-US1-01

**User Story**: US-001
**AC**: AC-US1-01

**Test Plan**:

- [ ] Task not started
`;

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Run AC sync
    const acSyncResult = await acManager.syncACStatus(incrementId);

    expect(acSyncResult.synced).toBe(false); // No updates (partial completion)
    expect(acSyncResult.updated.length).toBe(0);
    expect(acSyncResult.conflicts.length).toBe(0);

    // Verify spec.md unchanged (AC still unchecked)
    const updatedSpec = await fs.readFile(path.join(incrementDir, 'spec.md'), 'utf-8');
    expect(updatedSpec).toContain('- [ ] **AC-US1-01**'); // Still unchecked (50% complete)
  });

  it('should detect conflicts when AC is checked but tasks incomplete', async () => {
    // Test scenario: AC manually checked, but tasks not all complete
    const incrementId = '0044-test-conflicts';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test Conflicts"
status: active
---

# Test Feature

## User Stories

### US-001: Test Conflict Detection

**Acceptance Criteria**:

- [x] **AC-US1-01**: AC manually checked but task incomplete (CONFLICT!)
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    const tasksContent = `# Tasks

### T-001: Task for AC-US1-01

**User Story**: US-001
**AC**: AC-US1-01

**Test Plan**:

- [ ] Task not started
`;

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Run AC sync
    const acSyncResult = await acManager.syncACStatus(incrementId);

    expect(acSyncResult.synced).toBe(false);
    expect(acSyncResult.conflicts.length).toBeGreaterThan(0);
    expect(acSyncResult.conflicts[0]).toContain('AC-US1-01');
    expect(acSyncResult.conflicts[0]).toContain('[x]'); // Indicates conflict
  });

  it('should update living docs when tasks reopened (AC unchecked)', async () => {
    // Test scenario: Task was complete, then reopened
    const incrementId = '0045-test-task-reopened';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Step 1: Initial state - task complete, AC checked
    const specContent = `---
increment: ${incrementId}
title: "Test Task Reopened"
status: active
---

# Test Feature

## User Stories

### US-001: Test Reopened Task

**Acceptance Criteria**:

- [x] **AC-US1-01**: This AC will be unchecked when task reopens
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    const tasksContentReopened = `# Tasks

### T-001: Task for AC-US1-01 (REOPENED!)

**User Story**: US-001
**AC**: AC-US1-01

**Test Plan**:

- [ ] Unit test needs fixing (reopened)
`;

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContentReopened);

    // Step 2: Run AC sync (should detect task reopened)
    const acSyncResult = await acManager.syncACStatus(incrementId);

    // Should detect conflict: AC is [x] but task is incomplete
    expect(acSyncResult.conflicts.length).toBeGreaterThan(0);
    expect(acSyncResult.conflicts[0]).toContain('AC-US1-01');

    // Manual fix: update spec.md to uncheck AC
    let updatedSpec = await fs.readFile(path.join(incrementDir, 'spec.md'), 'utf-8');
    updatedSpec = updatedSpec.replace('- [x] **AC-US1-01**', '- [ ] **AC-US1-01**');
    await fs.writeFile(path.join(incrementDir, 'spec.md'), updatedSpec);

    // Step 3: Sync to living docs
    const livingDocsSyncResult = await livingDocsSync.syncIncrement(incrementId);

    expect(livingDocsSyncResult.success).toBe(true);

    // Verify living docs shows AC as unchecked
    const userStoryFile = livingDocsSyncResult.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-01\*\*/); // Now unchecked
  });
});
