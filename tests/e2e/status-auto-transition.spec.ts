/**
 * E2E Tests: Status Auto-Transition
 *
 * End-to-end tests for automatic status transitions in real workflow scenarios
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import { IncrementStatus, IncrementType } from '../../src/core/types/increment-metadata.js';
import { MetadataManager } from '../../src/core/increment/metadata-manager.js';
import { autoTransitionStatus, migrateLegacyStatuses } from '../../src/core/increment/status-auto-transition.js';

test.describe('Status Auto-Transition E2E', () => {
  const testRootPath = path.join(process.cwd(), '.specweave-test-e2e-transition');
  const testIncrementsPath = path.join(testRootPath, '.specweave', 'increments');

  let originalCwd: string;

  test.beforeEach(async () => {
    originalCwd = process.cwd();

    // Clean up test directory
    if (fs.existsSync(testRootPath)) {
      fs.removeSync(testRootPath);
    }

    // Create test structure
    fs.ensureDirSync(testIncrementsPath);

    // Change to test directory
    process.chdir(testRootPath);
  });

  test.afterEach(async () => {
    process.chdir(originalCwd);

    // Cleanup
    if (fs.existsSync(testRootPath)) {
      try {
        fs.rmSync(testRootPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error}`);
      }
    }
  });

  /**
   * Helper: Create increment folder structure
   */
  function createIncrementStructure(incrementId: string, initialStatus: IncrementStatus): void {
    const incrementPath = path.join(testIncrementsPath, incrementId);
    fs.ensureDirSync(incrementPath);

    const metadata = {
      id: incrementId,
      status: initialStatus,
      type: IncrementType.FEATURE,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      testMode: 'TDD',
      coverageTarget: 95
    };

    fs.writeJsonSync(path.join(incrementPath, 'metadata.json'), metadata, { spaces: 2 });
  }

  test('Real workflow: Planning → Spec created → Tasks created → Auto-transition to ACTIVE', async () => {
    const incrementId = '0001-user-authentication';

    // Step 1: Create increment (PLANNING)
    createIncrementStructure(incrementId, IncrementStatus.PLANNING);

    let metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // Step 2: Write spec.md (simulate /specweave:increment planning phase)
    const specPath = path.join(testIncrementsPath, incrementId, 'spec.md');
    const specContent = `---
increment: ${incrementId}
title: User Authentication
status: planning
---

# Feature: User Authentication

## User Stories

### US-001: JWT Authentication
...
`;
    fs.writeFileSync(specPath, specContent);

    // Auto-transition check (should still be PLANNING)
    autoTransitionStatus(incrementId);
    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // Step 3: Write plan.md (still PLANNING)
    const planPath = path.join(testIncrementsPath, incrementId, 'plan.md');
    const planContent = `# Implementation Plan

## Phase 1: JWT Setup
...
`;
    fs.writeFileSync(planPath, planContent);

    autoTransitionStatus(incrementId);
    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // Step 4: Write tasks.md (should auto-transition to ACTIVE)
    const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
    const tasksContent = `# Tasks

## Phase 1: JWT Setup

- [ ] **T-001**: Install jsonwebtoken package
- [ ] **T-002**: Create JWT utility functions
- [ ] **T-003**: Add authentication middleware
`;
    fs.writeFileSync(tasksPath, tasksContent);

    // Auto-transition should trigger PLANNING → ACTIVE
    const transitioned = autoTransitionStatus(incrementId);
    expect(transitioned).toBe(true);

    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);
  });

  test('Real workflow: Backlog → Resume planning → Complete planning → Start work', async () => {
    const incrementId = '0002-payment-integration';

    // Step 1: Create increment in BACKLOG (planned but not started)
    createIncrementStructure(incrementId, IncrementStatus.BACKLOG);

    let metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.BACKLOG);

    // Step 2: Resume planning - create spec.md
    const specPath = path.join(testIncrementsPath, incrementId, 'spec.md');
    fs.writeFileSync(specPath, '# Payment Integration Spec');

    // Should transition BACKLOG → PLANNING
    let transitioned = autoTransitionStatus(incrementId);
    expect(transitioned).toBe(true);

    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // Step 3: Complete planning - create tasks.md
    const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
    fs.writeFileSync(tasksPath, '- [ ] **T-001**: Integrate Stripe');

    // Should transition PLANNING → ACTIVE
    transitioned = autoTransitionStatus(incrementId);
    expect(transitioned).toBe(true);

    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);
  });

  test('Real workflow: Task marked in-progress → Force transition to ACTIVE', async () => {
    const incrementId = '0003-dashboard-widgets';

    // Create increment in PLANNING with tasks.md
    createIncrementStructure(incrementId, IncrementStatus.PLANNING);

    const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
    fs.writeFileSync(tasksPath, `# Tasks

- [ ] **T-001**: Design widget layout
- [ ] **T-002**: Implement widget components
`);

    let metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // User starts work - marks task as in-progress
    const updatedTasks = `# Tasks

- [⏳] **T-001**: Design widget layout (IN PROGRESS)
- [ ] **T-002**: Implement widget components
`;
    fs.writeFileSync(tasksPath, updatedTasks);

    // Auto-transition should detect in-progress task
    const transitioned = autoTransitionStatus(incrementId);
    expect(transitioned).toBe(true);

    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);
  });

  test('Migration: Legacy "planned" status → "planning"', async () => {
    // Simulate legacy increment with "planned" status
    const legacyIncrementId = '0004-legacy-increment';
    const incrementPath = path.join(testIncrementsPath, legacyIncrementId);
    fs.ensureDirSync(incrementPath);

    const legacyMetadata = {
      id: legacyIncrementId,
      status: 'planned', // ❌ Invalid (not in enum)
      type: 'feature',
      created: '2025-11-15T10:00:00Z',
      lastActivity: '2025-11-15T10:00:00Z'
    };

    fs.writeJsonSync(path.join(incrementPath, 'metadata.json'), legacyMetadata, { spaces: 2 });

    // Run migration
    const migratedCount = migrateLegacyStatuses();
    expect(migratedCount).toBe(1);

    // Verify migration
    const metadata = MetadataManager.read(legacyIncrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING); // ✅ Valid
  });

  test('WIP Limit: PLANNING increments do NOT count toward WIP limit', async () => {
    // Create 2 ACTIVE increments (should hit WIP limit)
    createIncrementStructure('0005-active-1', IncrementStatus.ACTIVE);
    createIncrementStructure('0006-active-2', IncrementStatus.ACTIVE);

    // Create 2 PLANNING increments (should NOT count toward WIP)
    createIncrementStructure('0007-planning-1', IncrementStatus.PLANNING);
    createIncrementStructure('0008-planning-2', IncrementStatus.PLANNING);

    // Query active increments (for WIP limit check)
    const activeIncrements = MetadataManager.getByStatus(IncrementStatus.ACTIVE);
    const planningIncrements = MetadataManager.getByStatus(IncrementStatus.PLANNING);

    expect(activeIncrements.length).toBe(2); // Only ACTIVE count
    expect(planningIncrements.length).toBe(2); // PLANNING are separate

    // WIP limit logic would check: activeIncrements.length <= 2
    // PLANNING increments are ignored for WIP calculations
  });

  test('Real-world scenario: Multiple increments with mixed statuses', async () => {
    // Simulate real project state
    createIncrementStructure('0009-completed-feature', IncrementStatus.COMPLETED);
    createIncrementStructure('0010-active-work', IncrementStatus.ACTIVE);
    createIncrementStructure('0011-planning-next', IncrementStatus.PLANNING);
    createIncrementStructure('0012-backlog-future', IncrementStatus.BACKLOG);
    createIncrementStructure('0013-paused-blocked', IncrementStatus.PAUSED);

    // Verify all statuses are valid
    const completed = MetadataManager.read('0009-completed-feature');
    expect(completed.status).toBe(IncrementStatus.COMPLETED);

    const active = MetadataManager.read('0010-active-work');
    expect(active.status).toBe(IncrementStatus.ACTIVE);

    const planning = MetadataManager.read('0011-planning-next');
    expect(planning.status).toBe(IncrementStatus.PLANNING);

    const backlog = MetadataManager.read('0012-backlog-future');
    expect(backlog.status).toBe(IncrementStatus.BACKLOG);

    const paused = MetadataManager.read('0013-paused-blocked');
    expect(paused.status).toBe(IncrementStatus.PAUSED);

    // Only ACTIVE should count toward WIP
    const wipIncrements = MetadataManager.getByStatus(IncrementStatus.ACTIVE);
    expect(wipIncrements.length).toBe(1);
  });

  test('Edge case: Multiple transitions in sequence', async () => {
    const incrementId = '0014-multi-transition';

    // Start in BACKLOG
    createIncrementStructure(incrementId, IncrementStatus.BACKLOG);

    // Create spec.md → BACKLOG → PLANNING
    const specPath = path.join(testIncrementsPath, incrementId, 'spec.md');
    fs.writeFileSync(specPath, '# Spec');
    autoTransitionStatus(incrementId);

    let metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.PLANNING);

    // Create tasks.md → PLANNING → ACTIVE
    const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
    fs.writeFileSync(tasksPath, '- [ ] **T-001**: Task');
    autoTransitionStatus(incrementId);

    metadata = MetadataManager.read(incrementId);
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);
  });
});
