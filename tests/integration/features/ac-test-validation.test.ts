/**
 * Integration tests for AC Test Validation workflow
 *
 * Tests the end-to-end workflow of:
 * 1. Task completion attempted via TodoWrite
 * 2. Pre-completion hook fires
 * 3. AC tests are validated
 * 4. Task completion blocked if tests fail
 * 5. Task completion allowed if tests pass
 * 6. ACs auto-checked in spec.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';

describe('AC Test Validation Workflow (Integration)', () => {
  let testDir: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create isolated test project
    testDir = path.join(os.tmpdir(), `ac-validation-integration-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize SpecWeave structure
    incrementPath = path.join(testDir, '.specweave/increments/0001-test-feature');
    await fs.ensureDir(incrementPath);

    // Create package.json with vitest
    await fs.writeJson(path.join(testDir, 'package.json'), {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'vitest run'
      },
      devDependencies: {
        vitest: '^1.0.0'
      }
    });
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Task completion with passing tests', () => {
    it('should allow task completion when AC tests pass', async () => {
      // Create spec.md with ACs
      const specContent = `---
increment: 0001-test-feature
title: "Test Feature"
type: feature
---

# Feature: Test Feature

## User Stories

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Feature works correctly
  - **Priority**: P0 (Critical)
  - **Testable**: Yes
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with task
      const tasksContent = `---
total_tasks: 1
completed: 0
test_mode: test-first
coverage_target: 90
---

# Tasks: Test Feature

## User Story: US-001 - Test User Story

### T-001: Implement feature

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Priority**: P0 (Critical)

**Description**: Implement the test feature

**Test Plan**:
- **File**: \`tests/unit/feature.test.ts\`
- **Tests**: TC-001

**Files Affected**:
- \`src/feature.ts\`
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create passing test file
      const testDir = path.join(testDir, 'tests/unit');
      await fs.ensureDir(testDir);
      const testContent = `
import { describe, it, expect } from 'vitest';

describe('AC-US1-01', () => {
  it('TC-001: Feature works correctly', () => {
    expect(true).toBe(true);
  });
});
`;
      await fs.writeFile(path.join(testDir, 'feature.test.ts'), testContent);

      // Simulate task completion validation
      const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
      const { parseTasksWithUSLinks, getAllTasks } = await import('../../../src/generators/spec/task-parser.js');

      const validator = await createACTestValidator(testDir);
      const tasksByUS = parseTasksWithUSLinks(path.join(incrementPath, 'tasks.md'));
      const tasks = getAllTasks(tasksByUS);
      const task = tasks[0];

      // Manually mark task as completed for validation
      task.status = 'completed';

      const result = await validator.validateTask(task, testDir);

      // Assertions
      expect(result.passed).toBe(true);
      expect(result.summary.totalACs).toBe(1);
      expect(result.summary.acsTested).toBe(1);
      expect(result.summary.testsFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Task completion with failing tests', () => {
    it('should block task completion when AC tests fail', async () => {
      // Create spec.md with ACs
      const specContent = `---
increment: 0001-test-feature
title: "Test Feature"
type: feature
---

# Feature: Test Feature

## User Stories

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Feature works correctly
  - **Priority**: P0 (Critical)
  - **Testable**: Yes
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with task
      const tasksContent = `---
total_tasks: 1
completed: 0
test_mode: test-first
coverage_target: 90
---

# Tasks: Test Feature

## User Story: US-001 - Test User Story

### T-001: Implement feature

**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending
**Priority**: P0 (Critical)

**Description**: Implement the test feature

**Test Plan**:
- **File**: \`tests/unit/feature.test.ts\`
- **Tests**: TC-001

**Files Affected**:
- \`src/feature.ts\`
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create FAILING test file
      const testDirPath = path.join(testDir, 'tests/unit');
      await fs.ensureDir(testDirPath);
      const testContent = `
import { describe, it, expect } from 'vitest';

describe('AC-US1-01', () => {
  it('TC-001: Feature works correctly', () => {
    expect(true).toBe(false); // FAILING TEST
  });
});
`;
      await fs.writeFile(path.join(testDirPath, 'feature.test.ts'), testContent);

      // Simulate task completion validation
      const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
      const { parseTasksWithUSLinks, getAllTasks } = await import('../../../src/generators/spec/task-parser.js');

      const validator = await createACTestValidator(testDir);
      const tasksByUS = parseTasksWithUSLinks(path.join(incrementPath, 'tasks.md'));
      const tasks = getAllTasks(tasksByUS);
      const task = tasks[0];

      // Manually mark task as completed for validation
      task.status = 'completed';

      const result = await validator.validateTask(task, testDir);

      // Assertions - validation should FAIL
      expect(result.passed).toBe(false);
      expect(result.summary.testsFailed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple ACs validation', () => {
    it('should validate all ACs linked to a task', async () => {
      // Create spec.md with multiple ACs
      const specContent = `---
increment: 0001-test-feature
title: "Test Feature"
type: feature
---

# Feature: Test Feature

## User Stories

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Feature works correctly
  - **Priority**: P0 (Critical)
  - **Testable**: Yes

- [ ] **AC-US1-02**: Feature handles edge cases
  - **Priority**: P0 (Critical)
  - **Testable**: Yes
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with task satisfying multiple ACs
      const tasksContent = `---
total_tasks: 1
completed: 0
test_mode: test-first
coverage_target: 90
---

# Tasks: Test Feature

## User Story: US-001 - Test User Story

### T-001: Implement feature

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
**Priority**: P0 (Critical)

**Description**: Implement the test feature with edge case handling

**Test Plan**:
- **File**: \`tests/unit/feature.test.ts\`
- **Tests**: TC-001, TC-002

**Files Affected**:
- \`src/feature.ts\`
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create test file with tests for both ACs
      const testDirPath = path.join(testDir, 'tests/unit');
      await fs.ensureDir(testDirPath);
      const testContent = `
import { describe, it, expect } from 'vitest';

describe('AC-US1-01', () => {
  it('TC-001: Feature works correctly', () => {
    expect(true).toBe(true);
  });
});

describe('AC-US1-02', () => {
  it('TC-002: Feature handles edge cases', () => {
    expect(true).toBe(true);
  });
});
`;
      await fs.writeFile(path.join(testDirPath, 'feature.test.ts'), testContent);

      // Simulate task completion validation
      const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
      const { parseTasksWithUSLinks, getAllTasks } = await import('../../../src/generators/spec/task-parser.js');

      const validator = await createACTestValidator(testDir);
      const tasksByUS = parseTasksWithUSLinks(path.join(incrementPath, 'tasks.md'));
      const tasks = getAllTasks(tasksByUS);
      const task = tasks[0];

      // Manually mark task as completed for validation
      task.status = 'completed';

      const result = await validator.validateTask(task, testDir);

      // Assertions - both ACs should be validated
      expect(result.summary.totalACs).toBe(2);
      expect(result.testResults.size).toBe(2);
      expect(result.testResults.has('AC-US1-01')).toBe(true);
      expect(result.testResults.has('AC-US1-02')).toBe(true);
    });

    it('should fail if any AC test fails (partial failure)', async () => {
      // Create spec.md with multiple ACs
      const specContent = `---
increment: 0001-test-feature
title: "Test Feature"
type: feature
---

# Feature: Test Feature

## User Stories

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Feature works correctly
  - **Priority**: P0 (Critical)
  - **Testable**: Yes

- [ ] **AC-US1-02**: Feature handles edge cases
  - **Priority**: P0 (Critical)
  - **Testable**: Yes
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md
      const tasksContent = `---
total_tasks: 1
completed: 0
test_mode: test-first
coverage_target: 90
---

# Tasks: Test Feature

## User Story: US-001 - Test User Story

### T-001: Implement feature

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
**Priority**: P0 (Critical)

**Description**: Implement the test feature

**Test Plan**:
- **File**: \`tests/unit/feature.test.ts\`
- **Tests**: TC-001, TC-002

**Files Affected**:
- \`src/feature.ts\`
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create test file with one passing, one failing
      const testDirPath = path.join(testDir, 'tests/unit');
      await fs.ensureDir(testDirPath);
      const testContent = `
import { describe, it, expect } from 'vitest';

describe('AC-US1-01', () => {
  it('TC-001: Feature works correctly', () => {
    expect(true).toBe(true); // PASSING
  });
});

describe('AC-US1-02', () => {
  it('TC-002: Feature handles edge cases', () => {
    expect(true).toBe(false); // FAILING
  });
});
`;
      await fs.writeFile(path.join(testDirPath, 'feature.test.ts'), testContent);

      // Simulate task completion validation
      const { createACTestValidator } = await import('../../../src/core/ac-test-validator.js');
      const { parseTasksWithUSLinks, getAllTasks } = await import('../../../src/generators/spec/task-parser.js');

      const validator = await createACTestValidator(testDir);
      const tasksByUS = parseTasksWithUSLinks(path.join(incrementPath, 'tasks.md'));
      const tasks = getAllTasks(tasksByUS);
      const task = tasks[0];

      // Manually mark task as completed for validation
      task.status = 'completed';

      const result = await validator.validateTask(task, testDir);

      // Assertions - overall validation should FAIL
      expect(result.passed).toBe(false);
      expect(result.summary.testsPassed).toBeGreaterThan(0);
      expect(result.summary.testsFailed).toBeGreaterThan(0);
    });
  });
});
