import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { IncrementCompletionValidator, ValidationResult } from '../../../src/core/increment/completion-validator.js';

describe('IncrementCompletionValidator', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `completion-validator-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    incrementId = '0001-test-increment';
    incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

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
});
