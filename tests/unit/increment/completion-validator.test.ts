import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import { IncrementCompletionValidator, ValidationResult } from '../../../src/core/increment/completion-validator.js';

describe('IncrementCompletionValidator', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementPath: string;
  let testCounter = 0;

  beforeEach(async () => {
    // Create isolated test directory with counter to ensure uniqueness
    testCounter++;
    testRoot = path.join(os.tmpdir(), `completion-validator-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testRoot);

    incrementId = `000${testCounter}-test-increment`;
    incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    // Create config.json to disable grill validation for tests (v1.0.228+)
    // Tests focus on AC/task validation, not grill workflow
    const configDir = path.join(testRoot, '.specweave');
    await fs.ensureDir(configDir);
    await fs.writeFile(
      path.join(configDir, 'config.json'),
      JSON.stringify({ grill: { required: false } }, null, 2)
    );

    // Mock process.cwd() to return test root
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(testRoot);
  });

  describe('validateCompletion()', () => {
    it('should reject completion with open acceptance criteria', async () => {
      // Arrange: Create spec.md with 17 open ACs
      const specContent = `---
increment: ${incrementId}
status: active
---

# Test Increment

## User Stories

### US-001: Test Story

- [ ] **AC-US1-01**: First acceptance criterion
- [ ] **AC-US1-02**: Second acceptance criterion
- [x] **AC-US1-03**: Third acceptance criterion (completed)
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with all tasks completed
      const tasksContent = `---
increment: ${incrementId}
total_tasks: 3
completed_tasks: 3
---

# Implementation Tasks

### T-001: Test Task
**Status**: [x] completed
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('2 acceptance criteria still open');
    });

    it('should reject completion with pending tasks', async () => {
      // Arrange: Create spec.md with all ACs completed
      const specContent = `---
increment: ${incrementId}
status: active
---

# Test Increment

## User Stories

### US-001: Test Story

- [x] **AC-US1-01**: First acceptance criterion
- [x] **AC-US1-02**: Second acceptance criterion
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with 3 pending tasks
      const tasksContent = `---
increment: ${incrementId}
total_tasks: 5
completed_tasks: 2
---

# Implementation Tasks

### T-001: Test Task
**Status**: [x] completed

### T-002: Pending Task
**Status**: [ ] pending

### T-003: Another Pending Task
**Status**: [ ] pending

### T-004: Third Pending Task
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('3 tasks still pending');
    });

    it('should allow completion when all ACs and tasks are done', async () => {
      // Arrange: Create spec.md with all ACs completed
      const specContent = `---
increment: ${incrementId}
status: active
---

# Test Increment

## User Stories

### US-001: Test Story

- [x] **AC-US1-01**: First acceptance criterion
- [x] **AC-US1-02**: Second acceptance criterion
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with all tasks completed
      const tasksContent = `---
increment: ${incrementId}
total_tasks: 2
completed_tasks: 2
---

# Implementation Tasks

### T-001: Test Task
**Status**: [x] completed

### T-002: Another Task
**Status**: [x] completed
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject completion with both open ACs and pending tasks', async () => {
      // Arrange: Create spec.md with 2 open ACs
      const specContent = `---
increment: ${incrementId}
status: active
---

# Test Increment

## User Stories

### US-001: Test Story

- [ ] **AC-US1-01**: Open AC
- [x] **AC-US1-02**: Completed AC
- [ ] **AC-US1-03**: Another open AC
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with 1 pending task
      const tasksContent = `---
increment: ${incrementId}
total_tasks: 2
completed_tasks: 1
---

# Implementation Tasks

### T-001: Test Task
**Status**: [x] completed

### T-002: Pending Task
**Status**: [ ] pending
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('2 acceptance criteria still open');
      expect(result.errors).toContain('1 tasks still pending');
    });

    it('should handle missing spec.md gracefully', async () => {
      // Arrange: No spec.md created

      // Create tasks.md
      const tasksContent = `---
increment: ${incrementId}
---

# Implementation Tasks

### T-001: Test Task
**Status**: [x] completed
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('spec.md not found');
    });

    it('should handle missing tasks.md gracefully', async () => {
      // Arrange: Create spec.md but no tasks.md
      const specContent = `---
increment: ${incrementId}
status: active
---

# Test Increment

## User Stories

### US-001: Test Story

- [x] **AC-US1-01**: Completed AC
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // No tasks.md created

      // Act
      const result: ValidationResult = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tasks.md not found');
    });
  });

  describe('countOpenACs()', () => {
    it('should count open ACs correctly', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

- [ ] **AC-US1-01**: Open AC
- [x] **AC-US1-02**: Completed AC
- [ ] **AC-US1-03**: Another open AC
- [ ] **AC-US2-01**: Third open AC
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Act
      const count = await IncrementCompletionValidator.countOpenACs(incrementId);

      // Assert
      expect(count).toBe(3);
    });

    it('should return 0 when all ACs are completed', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

- [x] **AC-US1-01**: Completed AC
- [x] **AC-US1-02**: Another completed AC
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Act
      const count = await IncrementCompletionValidator.countOpenACs(incrementId);

      // Assert
      expect(count).toBe(0);
    });

    it('should return 0 when no ACs exist', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

No acceptance criteria in this spec.
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Act
      const count = await IncrementCompletionValidator.countOpenACs(incrementId);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('countPendingTasks()', () => {
    it('should count pending tasks correctly', async () => {
      // Arrange
      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task 1
**Status**: [x] completed

### T-002: Task 2
**Status**: [ ] pending

### T-003: Task 3
**Status**: [ ] pending

### T-004: Task 4
**Status**: [x] completed
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const count = await IncrementCompletionValidator.countPendingTasks(incrementId);

      // Assert
      expect(count).toBe(2);
    });

    it('should return 0 when all tasks are completed', async () => {
      // Arrange
      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task 1
**Status**: [x] completed

### T-002: Task 2
**Status**: [x] completed
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const count = await IncrementCompletionValidator.countPendingTasks(incrementId);

      // Assert
      expect(count).toBe(0);
    });

    it('should return 0 when no tasks exist', async () => {
      // Arrange
      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

No tasks in this increment.
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Act
      const count = await IncrementCompletionValidator.countPendingTasks(incrementId);

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('coverage validation (v1.0.105)', () => {
    it('should warn when coverage is below target', async () => {
      // Arrange: Create complete increment with coverage target
      const specContent = `---
increment: ${incrementId}
---

# Test

- [x] **AC-US1-01**: Test coverage
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task
**Status**: [x] completed
**Satisfies ACs**: AC-US1-01
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create metadata with coverage target
      const metadata = {
        id: incrementId,
        status: 'active',
        testMode: 'TDD',
        coverageTarget: 80,
      };
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Create coverage data below target
      const coverageDir = path.join(testRoot, 'coverage');
      await fs.ensureDir(coverageDir);
      const coverageSummary = {
        total: {
          lines: { pct: 50 },
          statements: { pct: 50 },
          functions: { pct: 40 },
          branches: { pct: 30 },
        },
      };
      await fs.writeFile(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify(coverageSummary, null, 2)
      );

      // Act
      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert: Should pass (coverage is warning-only) but have warning
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('coverage below target'))).toBe(true);
    });

    it('should not warn when coverage meets target', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

- [x] **AC-US1-01**: Test coverage
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task
**Status**: [x] completed
**Satisfies ACs**: AC-US1-01
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        testMode: 'TDD',
        coverageTarget: 80,
      };
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Create coverage data meeting target
      const coverageDir = path.join(testRoot, 'coverage');
      await fs.ensureDir(coverageDir);
      const coverageSummary = {
        total: {
          lines: { pct: 85 },
          statements: { pct: 85 },
          functions: { pct: 82 },
          branches: { pct: 78 },
        },
      };
      await fs.writeFile(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify(coverageSummary, null, 2)
      );

      // Act
      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert: Should pass without coverage warning
      expect(result.isValid).toBe(true);
      const hasCoverageWarning = result.warnings?.some(w => w.includes('coverage below target'));
      expect(hasCoverageWarning).toBeFalsy();
    });

    it('should skip coverage validation when coverageTarget is 0', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

- [x] **AC-US1-01**: Test
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task
**Status**: [x] completed
**Satisfies ACs**: AC-US1-01
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        testMode: 'TDD',
        coverageTarget: 0, // Disabled
      };
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Act
      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert: Should pass without coverage below target warning
      // Note: "coverage validation skipped" or "AC coverage" warnings are OK
      expect(result.isValid).toBe(true);
      const hasCoverageBelowTarget = result.warnings?.some(w => w.includes('coverage below target'));
      expect(hasCoverageBelowTarget).toBeFalsy();
    });

    it('should skip coverage validation when testMode is none', async () => {
      // Arrange
      const specContent = `---
increment: ${incrementId}
---

# Test

- [x] **AC-US1-01**: Test
`;
      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `---
increment: ${incrementId}
---

# Tasks

### T-001: Task
**Status**: [x] completed
**Satisfies ACs**: AC-US1-01
`;
      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        testMode: 'none',
        coverageTarget: 80,
      };
      await fs.writeFile(
        path.join(incrementPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Act
      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Assert: Should pass - testMode none skips coverage
      expect(result.isValid).toBe(true);
      const hasCoverageWarning = result.warnings?.some(w => w.includes('coverage below target'));
      expect(hasCoverageWarning).toBeFalsy();
    });
  });
});
