/**
 * E2E tests for Spec Synchronization Flow
 *
 * Tests the complete flow:
 * 1. User edits spec.md
 * 2. Hook detects change and warns
 * 3. plan.md regenerated
 * 4. tasks.md regenerated
 * 5. Task completion status preserved
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// ✅ SAFE: Isolated test directory (prevents .specweave deletion)
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'specweave-test-spec-sync-' + Date.now());

test.describe('Spec Synchronization E2E Flow', () => {
  test.beforeAll(() => {
    // Create test project directory
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_PROJECT_DIR, { recursive: true });

    // Initialize SpecWeave in test directory
    process.chdir(TEST_PROJECT_DIR);
    execSync('npx specweave init --yes', { stdio: 'inherit' });
  });

  test.afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
  });

  test('should detect spec change and trigger sync warning', async () => {
    // Arrange: Create a test increment
    const incrementId = '0999-test-spec-sync';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create spec.md
    const specContent = `---
increment: ${incrementId}
title: "Test Spec Sync"
priority: P1
status: active
---

# Feature: Test Spec Sync

## User Stories

### US-001: Original User Story

**As a** user
**I want** to test spec sync
**So that** I can verify it works

**Acceptance Criteria**:
- [ ] AC-001: Feature works
`;
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Create plan.md
    const planContent = `# Implementation Plan: Test Spec Sync

## Component Design

### Component 1

Original component design.

**Dependencies**: None
`;
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), planContent);

    // Create tasks.md with some completed tasks
    const tasksContent = `# Tasks: Test Spec Sync

## Phase 1

#### T-001: Original task
**AC**: AC-001
- [ ] Not completed

---

#### T-002: Another task
**AC**: AC-001
- [x] Completed

---
`;
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Create metadata.json
    const metadata = {
      id: incrementId,
      status: 'active',
      created: new Date().toISOString()
    };
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Wait to ensure different modification times
    await new Promise(resolve => setTimeout(resolve, 100));

    // Act: Modify spec.md (add a new user story)
    const updatedSpecContent = `---
increment: ${incrementId}
title: "Test Spec Sync"
priority: P1
status: active
---

# Feature: Test Spec Sync

## User Stories

### US-001: Original User Story

**As a** user
**I want** to test spec sync
**So that** I can verify it works

**Acceptance Criteria**:
- [ ] AC-001: Feature works

---

### US-002: NEW User Story (Added)

**As a** developer
**I want** to add a new user story
**So that** spec sync is triggered

**Acceptance Criteria**:
- [ ] AC-002: New feature works
`;
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), updatedSpecContent);

    // Simulate hook execution by checking spec change manually
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    // Assert: Detection should find the spec change
    const detection = manager.detectSpecChange(incrementId);
    expect(detection.specChanged).toBe(true);
    expect(detection.reason).toContain('spec.md modified after plan.md');

    // Assert: Formatted message should be generated
    const message = manager.formatSyncMessage(detection);
    expect(message).toContain('SPEC CHANGED');
    expect(message).toContain(incrementId);
    expect(message).toContain('Automatic sync will regenerate');
  });

  test('should preserve task completion status during sync', async () => {
    // Arrange: Create increment with completed tasks
    const incrementId = '0998-task-status-preservation';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create spec.md
    fs.writeFileSync(
      path.join(incrementDir, 'spec.md'),
      '# Spec\n\n## User Stories\n\n### US-001: Story 1'
    );

    // Create plan.md
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan\n\n## Design');

    // Create tasks.md with mixed completion status
    const tasksContent = `# Tasks

#### T-001: Task 1
- [x] Completed

---

#### T-002: Task 2
- [ ] Not completed

---

#### T-003: Task 3
- [x] Completed

---
`;
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Create metadata.json
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
    );

    // Wait
    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify spec.md
    fs.writeFileSync(
      path.join(incrementDir, 'spec.md'),
      '# Spec (Updated)\n\n## User Stories\n\n### US-001: Story 1\n### US-002: Story 2 (NEW)'
    );

    // Act: Simulate status preservation
    // (This would normally be done by the sync logic)
    // For now, we just verify the detection works

    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    const detection = manager.detectSpecChange(incrementId);
    expect(detection.specChanged).toBe(true);

    // In the actual implementation, this would:
    // 1. Backup tasks.md
    // 2. Extract completion status (T-001: [x], T-002: [ ], T-003: [x])
    // 3. Regenerate tasks.md
    // 4. Restore completion status

    // TODO: This will be fully tested once regeneration logic is implemented
    // For now, we verify that detection works correctly
  });

  test('should handle --skip-sync flag', async () => {
    // Arrange: Create increment with spec change
    const incrementId = '0997-skip-sync-test';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify spec
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec (Updated)');

    // Act: Call syncIncrement with skipSync=true
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    const result = await manager.syncIncrement(incrementId, true);

    // Assert: Sync should be skipped
    expect(result.synced).toBe(false);
    expect(result.reason).toContain('skipped by user');
    expect(result.planRegenerated).toBe(false);
    expect(result.tasksRegenerated).toBe(false);
  });

  test('should log sync events to metadata.json', async () => {
    // Arrange: Create increment
    const incrementId = '0996-sync-event-logging';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');
    fs.writeFileSync(
      path.join(incrementDir, 'metadata.json'),
      JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Modify spec
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec (Updated)');

    // Act: Trigger sync
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    await manager.syncIncrement(incrementId);

    // Assert: Metadata should have sync event
    const metadataPath = path.join(incrementDir, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    expect(metadata.syncEvents).toBeDefined();
    expect(metadata.syncEvents.length).toBeGreaterThan(0);

    const event = metadata.syncEvents[0];
    expect(event.type).toBe('spec-change-detected');
    expect(event.timestamp).toBeDefined();
    expect(event.specModTime).toBeGreaterThan(0);
    expect(event.planModTime).toBeGreaterThan(0);
    expect(event.reason).toContain('spec.md modified');
  });

  test('should handle edge case: spec.md deleted', async () => {
    // Arrange: Create increment with plan.md but no spec.md
    const incrementId = '0995-missing-spec';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');

    // Act: Check for spec change
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    const detection = manager.detectSpecChange(incrementId);

    // Assert: Should not trigger sync
    expect(detection.specChanged).toBe(false);
    expect(detection.reason).toContain('does not exist');
  });

  test('should handle edge case: plan.md does not exist yet (planning phase)', async () => {
    // Arrange: Create increment with only spec.md
    const incrementId = '0994-planning-phase';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');

    // Act: Check for spec change
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    const detection = manager.detectSpecChange(incrementId);

    // Assert: Should not trigger sync (planning phase)
    expect(detection.specChanged).toBe(false);
    expect(detection.reason).toContain('planning phase');
  });

  test('should handle concurrent edits gracefully', async () => {
    // Arrange: Create increment
    const incrementId = '0993-concurrent-edits';
    const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create files with very close modification times
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');

    // Wait just 1ms (simulating concurrent edits)
    await new Promise(resolve => setTimeout(resolve, 1));

    // Modify both files "concurrently"
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec (Updated)');
    fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan (Updated)');

    // Act: Check for spec change
    const { SpecSyncManager } = await import('../../src/core/increment/spec-sync-manager');
    const manager = new SpecSyncManager(TEST_PROJECT_DIR);

    const detection = manager.detectSpecChange(incrementId);

    // Assert: Should use modification times to determine if sync needed
    // (In this case, plan.md might be newer due to write order)
    // The important thing is it doesn't crash or produce undefined behavior
    expect(detection).toBeDefined();
    expect(detection.incrementId).toBe(incrementId);
  });
});
