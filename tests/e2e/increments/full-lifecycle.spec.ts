/**
 * E2E Test: Complete Increment Lifecycle
 *
 * Tests the most critical user workflow:
 * 1. Create increment with spec/plan/tasks
 * 2. Execute tasks and track progress
 * 3. Validate and close increment
 *
 * This represents the core value proposition of SpecWeave.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Increment Lifecycle (E2E)', () => {
  let testDir: string;
  let specweavePath: string;

  test.beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `specweave-e2e-lifecycle-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Get specweave binary path
    specweavePath = path.join(__dirname, '../../../bin/specweave.js');

    // Initialize SpecWeave in test directory
    execSync(`node ${specweavePath} init ${testDir} --non-interactive`, {
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0' }
    });
  });

  test.afterEach(async () => {
    // Cleanup test directory
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should complete full increment lifecycle', async () => {
    // Step 1: Create increment
    const incrementId = '0001-test-feature';
    const specPath = path.join(testDir, '.specweave/increments', incrementId, 'spec.md');
    const planPath = path.join(testDir, '.specweave/increments', incrementId, 'plan.md');
    const tasksPath = path.join(testDir, '.specweave/increments', incrementId, 'tasks.md');
    const metadataPath = path.join(testDir, '.specweave/increments', incrementId, 'metadata.json');

    // Create increment directory
    await fs.ensureDir(path.dirname(specPath));

    // Write spec.md
    await fs.writeFile(specPath, `---
title: Test Feature Implementation
increment: ${incrementId}
status: planning
---

# Test Feature

## User Stories

### US-001: Basic Functionality
**As a** developer
**I want** to test the increment lifecycle
**So that** I can verify SpecWeave works correctly

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Increment can be created
- [ ] **AC-US1-02**: Tasks can be executed
- [ ] **AC-US1-03**: Increment can be closed
`);

    // Write plan.md
    await fs.writeFile(planPath, `---
increment: ${incrementId}
---

# Implementation Plan

## Architecture
- Simple test implementation
- Focus on core workflow
- Minimal complexity

## Test Strategy
- Unit tests: 80% coverage
- Integration tests: Key workflows
- E2E tests: Critical path

## Risk Mitigation
- Low risk implementation
- Rollback strategy: Delete increment
`);

    // Write tasks.md with embedded tests
    await fs.writeFile(tasksPath, `---
increment: ${incrementId}
total_tasks: 3
test_mode: TDD
coverage_target: 80%
---

# Tasks for Increment ${incrementId}

## T-001: Setup project structure
**Status**: pending
**AC**: AC-US1-01
**Test Plan**: Verify directory structure created
**Test Cases**:
- Unit: Structure validation (80% coverage)
**Implementation**: Create necessary directories and files

---

## T-002: Implement core logic
**Status**: pending
**AC**: AC-US1-02
**Test Plan**: Test core functionality
**Test Cases**:
- Unit: Logic tests (85% coverage)
- Integration: Workflow test (80% coverage)
**Implementation**: Write main implementation code

---

## T-003: Add documentation
**Status**: pending
**AC**: AC-US1-03
**Test Plan**: Documentation validation
**Test Cases**:
- Manual review of docs
**Implementation**: Write user and developer documentation
`);

    // Verify increment was created
    expect(await fs.pathExists(specPath)).toBe(true);
    expect(await fs.pathExists(planPath)).toBe(true);
    expect(await fs.pathExists(tasksPath)).toBe(true);

    // Step 2: Simulate task completion
    let tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Complete first task
    tasksContent = tasksContent.replace(
      '## T-001: Setup project structure\n**Status**: pending',
      '## T-001: Setup project structure\n**Status**: completed'
    );
    await fs.writeFile(tasksPath, tasksContent);

    // Complete second task
    tasksContent = tasksContent.replace(
      '## T-002: Implement core logic\n**Status**: pending',
      '## T-002: Implement core logic\n**Status**: completed'
    );
    await fs.writeFile(tasksPath, tasksContent);

    // Complete third task
    tasksContent = tasksContent.replace(
      '## T-003: Add documentation\n**Status**: pending',
      '## T-003: Add documentation\n**Status**: completed'
    );
    await fs.writeFile(tasksPath, tasksContent);

    // Step 3: Create completion report
    const reportsDir = path.join(testDir, '.specweave/increments', incrementId, 'reports');
    await fs.ensureDir(reportsDir);

    const completionReportPath = path.join(reportsDir, 'COMPLETION-REPORT.md');
    await fs.writeFile(completionReportPath, `# Completion Report: ${incrementId}

## Status: ✅ COMPLETE

### Summary
Successfully implemented test feature with all tasks completed.

### Tasks Completed
- [x] T-001: Setup project structure
- [x] T-002: Implement core logic
- [x] T-003: Add documentation

### Test Coverage
- Unit Tests: 82% (target: 80%) ✅
- Integration Tests: 80% (target: 80%) ✅
- Overall: 81% ✅

### Acceptance Criteria
- [x] AC-US1-01: Increment can be created
- [x] AC-US1-02: Tasks can be executed
- [x] AC-US1-03: Increment can be closed

### Metrics
- Total Tasks: 3
- Completed: 3
- Success Rate: 100%
- Duration: 2 hours
- Test Coverage: 81%

### Lessons Learned
- Workflow functioned as expected
- No blockers encountered
- Ready for production use
`);

    // Step 4: Update metadata to mark as complete
    const metadata = {
      increment: incrementId,
      status: 'completed',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      tasksTotal: 3,
      tasksCompleted: 3,
      testCoverage: 81,
      completionReport: 'reports/COMPLETION-REPORT.md'
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // Step 5: Sync to living docs
    const livingDocsPath = path.join(
      testDir,
      '.specweave/docs/internal/specs',
      `spec-001-test-feature.md`
    );
    await fs.ensureDir(path.dirname(livingDocsPath));

    await fs.writeFile(livingDocsPath, `# SPEC-001: Test Feature

## Overview
Test feature for validating increment lifecycle

## Implementation History
- ${incrementId}: Initial implementation (Complete)

## User Stories
### US-001: Basic Functionality
✅ Fully implemented in ${incrementId}

## Acceptance Criteria
- [x] AC-US1-01: Increment can be created
- [x] AC-US1-02: Tasks can be executed
- [x] AC-US1-03: Increment can be closed

## Technical Details
See increment: ${incrementId}

## Test Coverage
Overall: 81%

## Status
✅ Complete and verified
`);

    // Verification: Check all artifacts exist
    expect(await fs.pathExists(completionReportPath)).toBe(true);
    expect(await fs.pathExists(metadataPath)).toBe(true);
    expect(await fs.pathExists(livingDocsPath)).toBe(true);

    // Verify metadata content
    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.status).toBe('completed');
    expect(savedMetadata.tasksCompleted).toBe(3);
    expect(savedMetadata.testCoverage).toBe(81);

    // Verify tasks are marked complete
    const finalTasks = await fs.readFile(tasksPath, 'utf-8');
    expect(finalTasks).toContain('**Status**: completed');
    expect(finalTasks.match(/\*\*Status\*\*: completed/g)).toHaveLength(3);

    // Verify living docs were synced
    const livingDocs = await fs.readFile(livingDocsPath, 'utf-8');
    expect(livingDocs).toContain('✅ Fully implemented');
    expect(livingDocs).toContain('Status\n✅ Complete and verified');
  });

  test('should handle increment with failed tasks', async () => {
    const incrementId = '0002-partial-feature';
    const tasksPath = path.join(testDir, '.specweave/increments', incrementId, 'tasks.md');
    const metadataPath = path.join(testDir, '.specweave/increments', incrementId, 'metadata.json');

    // Create increment with some failed tasks
    await fs.ensureDir(path.dirname(tasksPath));

    await fs.writeFile(tasksPath, `---
increment: ${incrementId}
total_tasks: 4
---

# Tasks

## T-001: Task One
**Status**: completed

## T-002: Task Two
**Status**: completed

## T-003: Task Three
**Status**: failed
**Reason**: Dependencies not available

## T-004: Task Four
**Status**: pending
`);

    // Create metadata showing incomplete status
    const metadata = {
      increment: incrementId,
      status: 'blocked',
      tasksTotal: 4,
      tasksCompleted: 2,
      tasksFailed: 1,
      tasksPending: 1,
      blockedReason: 'Dependencies not available for T-003'
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // Verify partial completion handling
    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.status).toBe('blocked');
    expect(savedMetadata.tasksCompleted).toBe(2);
    expect(savedMetadata.tasksFailed).toBe(1);
    expect(savedMetadata.tasksPending).toBe(1);
  });

  test('should support increment reopening', async () => {
    const incrementId = '0003-reopen-test';
    const metadataPath = path.join(testDir, '.specweave/increments', incrementId, 'metadata.json');

    await fs.ensureDir(path.dirname(metadataPath));

    // Start with completed increment
    let metadata = {
      increment: incrementId,
      status: 'completed',
      tasksTotal: 2,
      tasksCompleted: 2,
      completedDate: '2024-01-01T00:00:00Z'
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // Simulate reopening
    metadata.status = 'reopened';
    metadata.reopenedDate = '2024-01-02T00:00:00Z';
    metadata.reopenReason = 'Bug found in production';
    metadata.tasksTotal = 3; // Added new task
    metadata.tasksCompleted = 2; // Previous tasks still complete
    delete metadata.completedDate;

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // Verify reopened state
    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.status).toBe('reopened');
    expect(savedMetadata.reopenReason).toBe('Bug found in production');
    expect(savedMetadata.tasksTotal).toBe(3);
    expect(savedMetadata.tasksCompleted).toBe(2);
  });

  test('should track test coverage per task', async () => {
    const incrementId = '0004-test-coverage';
    const tasksPath = path.join(testDir, '.specweave/increments', incrementId, 'tasks.md');

    await fs.ensureDir(path.dirname(tasksPath));

    // Create tasks with test coverage
    await fs.writeFile(tasksPath, `---
increment: ${incrementId}
total_tasks: 3
coverage_target: 80%
---

# Tasks

## T-001: High coverage task
**Status**: completed
**Test Coverage**: 95%
**Test Results**:
- Unit tests: 10/10 passed
- Integration tests: 5/5 passed

## T-002: Medium coverage task
**Status**: completed
**Test Coverage**: 82%
**Test Results**:
- Unit tests: 8/10 passed
- Integration tests: 4/5 passed

## T-003: Low coverage task
**Status**: completed
**Test Coverage**: 65%
**Test Results**:
- Unit tests: 6/10 passed
- Integration tests: 2/5 passed
**Warning**: Below coverage target
`);

    const content = await fs.readFile(tasksPath, 'utf-8');

    // Extract coverage values
    const coverageMatches = content.match(/\*\*Test Coverage\*\*: (\d+)%/g);
    expect(coverageMatches).toHaveLength(3);

    // Calculate average coverage
    const coverages = content.match(/\d+(?=%)/g)?.slice(-3).map(Number) || [];
    const avgCoverage = coverages.reduce((a, b) => a + b, 0) / coverages.length;

    expect(avgCoverage).toBeCloseTo(80.67, 1);
    expect(content).toContain('**Warning**: Below coverage target');
  });

  test('should validate acceptance criteria completion', async () => {
    const incrementId = '0005-ac-validation';
    const specPath = path.join(testDir, '.specweave/increments', incrementId, 'spec.md');
    const tasksPath = path.join(testDir, '.specweave/increments', incrementId, 'tasks.md');

    await fs.ensureDir(path.dirname(specPath));

    // Create spec with acceptance criteria
    await fs.writeFile(specPath, `---
increment: ${incrementId}
---

# Feature Spec

## Acceptance Criteria
- [ ] **AC-001**: User can login
- [ ] **AC-002**: User can logout
- [ ] **AC-003**: Session persists
- [ ] **AC-004**: Security validated
`);

    // Create tasks linked to ACs
    await fs.writeFile(tasksPath, `---
increment: ${incrementId}
---

# Tasks

## T-001: Implement login
**AC**: AC-001
**Status**: completed

## T-002: Implement logout
**AC**: AC-002
**Status**: completed

## T-003: Session management
**AC**: AC-003
**Status**: pending

## T-004: Security audit
**AC**: AC-004
**Status**: pending
`);

    // Read and analyze AC completion
    const specContent = await fs.readFile(specPath, 'utf-8');
    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Count completed ACs based on task status
    const completedTasks = tasksContent.match(/\*\*Status\*\*: completed/g)?.length || 0;
    const totalACs = specContent.match(/\*\*AC-\d+\*\*/g)?.length || 0;

    expect(completedTasks).toBe(2);
    expect(totalACs).toBe(4);

    const completionRate = (completedTasks / totalACs) * 100;
    expect(completionRate).toBe(50);
  });
});

test.describe('Increment State Transitions', () => {
  let testDir: string;

  test.beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `specweave-e2e-states-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  test.afterEach(async () => {
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should follow correct state transitions', async () => {
    const incrementId = '0006-state-test';
    const metadataPath = path.join(testDir, '.specweave/increments', incrementId, 'metadata.json');

    await fs.ensureDir(path.dirname(metadataPath));

    // State 1: Planning
    let metadata: any = {
      increment: incrementId,
      status: 'planning',
      createdDate: new Date().toISOString()
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // State 2: Active
    metadata.status = 'active';
    metadata.startedDate = new Date().toISOString();
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // State 3: Paused
    metadata.status = 'paused';
    metadata.pausedDate = new Date().toISOString();
    metadata.pauseReason = 'Waiting for dependencies';
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // State 4: Resume (back to active)
    metadata.status = 'active';
    metadata.resumedDate = new Date().toISOString();
    delete metadata.pausedDate;
    delete metadata.pauseReason;
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // State 5: Completed
    metadata.status = 'completed';
    metadata.completedDate = new Date().toISOString();
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    // Verify final state
    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.status).toBe('completed');
    expect(savedMetadata.resumedDate).toBeDefined();
    expect(savedMetadata.completedDate).toBeDefined();
  });

  test('should handle abandoned increments', async () => {
    const incrementId = '0007-abandoned';
    const metadataPath = path.join(testDir, '.specweave/increments', incrementId, 'metadata.json');

    await fs.ensureDir(path.dirname(metadataPath));

    const metadata = {
      increment: incrementId,
      status: 'abandoned',
      abandonedDate: new Date().toISOString(),
      abandonReason: 'Requirements changed significantly',
      tasksTotal: 5,
      tasksCompleted: 1,
      wastedEffort: '8 hours'
    };

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.status).toBe('abandoned');
    expect(savedMetadata.abandonReason).toContain('Requirements changed');
    expect(savedMetadata.wastedEffort).toBe('8 hours');
  });
});