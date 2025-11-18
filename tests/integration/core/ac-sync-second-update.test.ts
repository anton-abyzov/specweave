/**
 * AC Sync Second Update Test - Critical Missing Test
 *
 * Tests the scenario that's NOT covered by ac-sync-e2e-flow.test.ts:
 * - First sync creates user story files with ACs
 * - User completes tasks → spec.md ACs updated to [x]
 * - Second sync should UPDATE existing user story files with checked ACs
 *
 * This is the critical scenario the user reported as broken:
 * "updating living docs has problems! ACs and tasks are not synchronized"
 *
 * Test Strategy:
 * 1. First sync - create user story files with unchecked ACs
 * 2. Simulate AC completion - manually update spec.md
 * 3. Second sync - should update existing files
 * 4. Verify - ACs are now checked in user story files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('AC Sync - Second Update (Critical Scenario)', () => {
  let testRoot: string;
  let livingDocsSync: LivingDocsSync;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-ac-second-sync-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Initialize living docs sync
    livingDocsSync = new LivingDocsSync(testRoot);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  it('should update existing user story ACs on second sync', async () => {
    // ================================================================
    // SETUP: Create increment structure
    // ================================================================
    const incrementId = '0099-ac-sync-second-update-test';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    // ================================================================
    // STEP 1: First Sync - Create user story files with UNCHECKED ACs
    // ================================================================
    const specContent1 = `---
increment: ${incrementId}
title: "AC Sync Second Update Test"
status: active
---

# AC Sync Test Feature

## User Stories

### US-001: Test User Story

**As a** developer
**I want** AC sync to work on second update
**So that** living docs stay synchronized

**Acceptance Criteria**:

- [ ] **AC-US1-01**: First AC (should be checked on second sync)
- [ ] **AC-US1-02**: Second AC (should be checked on second sync)
- [ ] **AC-US1-03**: Third AC (should remain unchecked - no completing task)
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent1, 'utf-8');

    // Run first sync
    const result1 = await livingDocsSync.syncIncrement(incrementId);

    expect(result1.success).toBe(true);
    expect(result1.filesCreated.length).toBeGreaterThan(0);

    // Find the user story file
    const userStoryFiles = result1.filesCreated.filter(f => f.includes('us-001'));
    expect(userStoryFiles.length).toBeGreaterThan(0);

    const userStoryFile = userStoryFiles[0];
    expect(await fs.pathExists(userStoryFile)).toBe(true);

    // Verify first sync created file with UNCHECKED ACs
    let userStoryContent = await fs.readFile(userStoryFile, 'utf-8');
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-03\*\*/);

    console.log('✅ First sync complete - ACs unchecked');

    // ================================================================
    // STEP 2: Simulate AC Completion - Update spec.md
    // ================================================================
    // Simulate ACStatusManager updating spec.md after task completion
    const specContent2 = specContent1
      .replace('- [ ] **AC-US1-01**', '- [x] **AC-US1-01**')
      .replace('- [ ] **AC-US1-02**', '- [x] **AC-US1-02**');
    // Note: AC-US1-03 remains unchecked (no implementing task completed)

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent2, 'utf-8');

    // Verify spec.md was updated
    const specVerify = await fs.readFile(path.join(incrementDir, 'spec.md'), 'utf-8');
    expect(specVerify).toContain('- [x] **AC-US1-01**');
    expect(specVerify).toContain('- [x] **AC-US1-02**');
    expect(specVerify).toContain('- [ ] **AC-US1-03**');

    console.log('✅ spec.md updated - AC-US1-01 and AC-US1-02 now checked');

    // ================================================================
    // STEP 3: Second Sync - Should UPDATE existing user story file
    // ================================================================
    const result2 = await livingDocsSync.syncIncrement(incrementId);

    expect(result2.success).toBe(true);

    console.log('✅ Second sync complete');

    // ================================================================
    // STEP 4: Verify ACs are now CHECKED in user story file
    // ================================================================
    // Re-read the user story file
    userStoryContent = await fs.readFile(userStoryFile, 'utf-8');

    // AC-US1-01 and AC-US1-02 should be CHECKED
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-02\*\*/);

    // AC-US1-03 should still be UNCHECKED
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-03\*\*/);

    // Should NOT have any unchecked AC-US1-01 or AC-US1-02
    expect(userStoryContent).not.toMatch(/- \[ \] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).not.toMatch(/- \[ \] \*\*AC-US1-02\*\*/);

    console.log('✅ Verification complete - ACs synchronized correctly!');
  });

  it('should handle third sync correctly (idempotency)', async () => {
    // ================================================================
    // Test idempotency - running sync multiple times should be safe
    // ================================================================
    const incrementId = '0100-idempotency-test';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Idempotency Test"
status: active
---

# Idempotency Test

## User Stories

### US-001: Test Idempotency

**Acceptance Criteria**:

- [x] **AC-US1-01**: Already checked
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');

    // First sync
    const result1 = await livingDocsSync.syncIncrement(incrementId);
    expect(result1.success).toBe(true);

    const userStoryFile = result1.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    // Second sync (no changes)
    const result2 = await livingDocsSync.syncIncrement(incrementId);
    expect(result2.success).toBe(true);

    // Third sync (still no changes)
    const result3 = await livingDocsSync.syncIncrement(incrementId);
    expect(result3.success).toBe(true);

    // Verify AC is still checked
    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
  });

  it('should handle AC status flip (checked → unchecked)', async () => {
    // ================================================================
    // Test scenario: AC was checked, then task reopened (unchecked)
    // ================================================================
    const incrementId = '0101-ac-flip-test';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    // First sync with checked AC
    const specContent1 = `---
increment: ${incrementId}
title: "AC Flip Test"
status: active
---

# AC Flip Test

## User Stories

### US-001: Test AC Flip

**Acceptance Criteria**:

- [x] **AC-US1-01**: Initially checked
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent1, 'utf-8');

    const result1 = await livingDocsSync.syncIncrement(incrementId);
    expect(result1.success).toBe(true);

    const userStoryFile = result1.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    // Verify AC is checked
    let userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);

    // Update spec.md - uncheck AC (task reopened)
    const specContent2 = specContent1.replace('- [x] **AC-US1-01**', '- [ ] **AC-US1-01**');
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent2, 'utf-8');

    // Second sync - should uncheck AC in user story
    const result2 = await livingDocsSync.syncIncrement(incrementId);
    expect(result2.success).toBe(true);

    // Verify AC is now unchecked
    userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).not.toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
  });

  it('should preserve tasks section while updating ACs', async () => {
    // ================================================================
    // Test that updating ACs doesn't break the tasks section
    // ================================================================
    const incrementId = '0102-preserve-tasks-test';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Preserve Tasks Test"
status: active
---

# Preserve Tasks Test

## User Stories

### US-001: Test Tasks Preservation

**As a** developer
**I want** AC updates to not break tasks
**So that** everything stays synchronized

**Acceptance Criteria**:

- [ ] **AC-US1-01**: Test AC
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');

    // Create tasks.md
    const tasksContent = `# Tasks

### T-001: Test Task

**User Story**: US-001
**AC**: AC-US1-01
**Priority**: P1

**Test Plan**:

- [x] Test passes
`;

    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent, 'utf-8');

    // First sync
    const result1 = await livingDocsSync.syncIncrement(incrementId);
    expect(result1.success).toBe(true);

    const userStoryFile = result1.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    // Verify tasks section exists
    let userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/## Tasks/);
    expect(userStoryContent).toMatch(/T-001/);

    // Update spec.md - check AC
    const specContent2 = specContent.replace('- [ ] **AC-US1-01**', '- [x] **AC-US1-01**');
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent2, 'utf-8');

    // Second sync
    const result2 = await livingDocsSync.syncIncrement(incrementId);
    expect(result2.success).toBe(true);

    // Verify AC is checked AND tasks section is preserved
    userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).toMatch(/## Tasks/);
    expect(userStoryContent).toMatch(/T-001/);
  });
});
